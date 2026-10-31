const {onCall,onRequest,HttpsError}=require('firebase-functions/v2/https');
const {onDocumentUpdated}=require('firebase-functions/v2/firestore');
const admin=require('firebase-admin'),crypto=require('crypto');
admin.initializeApp();const db=admin.firestore(),FV=admin.firestore.FieldValue,MAX=200000,MINW=1000,MAXW=1000000;
const no=(c,m)=>new HttpsError(c,m);
// wraps every callable: known errors pass through, unexpected ones are logged with a stack and returned as a readable message
const call=fn=>onCall(async r=>{try{return await fn(r)}catch(e){if(e instanceof HttpsError)throw e;console.error('callable failed',e&&e.stack||e);throw no('internal','Something went wrong on our side. Please try again in a moment.')}});
const need=r=>{if(!r.auth)throw no('unauthenticated','Sign in first.');return r.auth.uid};
const usr=async u=>(await db.doc('users/'+u).get()).data()||{};
const isAdmin=m=>m.role==='admin'&&!m.disabled;
const can=(m,p)=>!m.disabled&&(m.role==='admin'||m.perms?.full===true||m.perms?.[p]===true);
const hash=(p,s)=>crypto.scryptSync(String(p),s,32).toString('hex');
const bal=u=>db.doc('balances/'+u),led=u=>db.collection('wallet/'+u+'/ledger').doc(),tx=()=>db.collection('transactions').doc();
// one place that moves money: balance + customer ledger + global transaction log
const post=(t,u,snap,amt,reason,x={})=>{const cur=snap.exists?(snap.data().amount||0):0;if(cur+amt<0)throw no('failed-precondition','Insufficient balance.');
 t.set(bal(u),{amount:cur+amt},{merge:true});
 t.set(led(u),{amount:amt,reason,by:x.by||'system',ref:x.ref||'',at:FV.serverTimestamp()});
 t.set(tx(),{type:x.type||'OTHER',uid:u,ruthId:x.ruthId||'',name:x.name||'',amount:amt,reason,by:x.by||'system',byName:x.byName||'System',ref:x.ref||'',at:FV.serverTimestamp()});return cur+amt};
async function check(ref,s,pin){const d=s.data();if((d.lockUntil||0)>Date.now())throw no('resource-exhausted','Too many wrong PINs. Try again in 15 minutes.');
 const ok=crypto.timingSafeEqual(Buffer.from(hash(pin||'',d.salt),'hex'),Buffer.from(d.hash,'hex'));
 if(!ok){const t=(d.tries||0)+1;await ref.update({tries:t>=5?0:t,lockUntil:t>=5?Date.now()+15*6e4:0});throw no('permission-denied','Wrong PIN.')}
 await ref.update({tries:0})}
const pinOk=async(u,pin)=>{const pr=db.doc('secrets/'+u),ps=await pr.get();if(!ps.exists)throw no('failed-precondition','Set your PIN first.');await check(pr,ps,pin)};
exports.setPin=call(async r=>{const u=need(r),{pin,oldPin}=r.data||{};if(!/^\d{4}$/.test(String(pin)))throw no('invalid-argument','PIN must be 4 digits.');
 const ref=db.doc('secrets/'+u),s=await ref.get();if(s.exists)await check(ref,s,oldPin);
 const salt=crypto.randomBytes(16).toString('hex');await ref.set({salt,hash:hash(pin,salt),tries:0,lockUntil:0});await bal(u).set({hasPin:true},{merge:true});return{ok:true}});
exports.transfer=call(async r=>{const u=need(r),{toRuthId,amount,pin,note}=r.data||{},a=Math.round(+amount),me=await usr(u);
 if(!(a>0&&a<=MAX))throw no('invalid-argument','Amount must be between 1 and '+MAX+'.');if(me.disabled)throw no('permission-denied','Account suspended.');
 await pinOk(u,pin);const rin=String(toRuthId||'').trim();if(!/^\d{10}$/.test(rin))throw no('invalid-argument','Enter the 10-digit Ruth ID.');const rid=await db.doc('ruthIds/'+rin).get();if(!rid.exists)throw no('not-found','No account with that Ruth ID.');
 const to=rid.data().uid;if(to===u)throw no('invalid-argument','You cannot send money to yourself.');const tu=await usr(to);if(tu.disabled)throw no('failed-precondition','That account cannot receive money.');
 const n=note?': '+String(note).slice(0,80):'',ref=db.collection('transfers').doc();
 await db.runTransaction(async t=>{const[s1,s2]=await Promise.all([t.get(bal(u)),t.get(bal(to))]);
  post(t,u,s1,-a,'Sent to '+tu.name+n,{type:'TRANSFER',by:u,byName:me.name,name:me.name,ruthId:me.ruthId,ref:ref.id});
  post(t,to,s2,a,'Received from '+me.name+n,{type:'TRANSFER',by:u,byName:me.name,name:tu.name,ruthId:tu.ruthId,ref:ref.id});t.set(ref,{from:u,to,amount:a,at:FV.serverTimestamp()})});
 return{name:tu.name}});
// instant top-up by admin or a trusted cashier within their allocation
exports.credit=call(async r=>{const u=need(r),{ruthId,amount,depositId}=r.data||{},a=Math.round(+amount),m=await usr(u);
 if(!can(m,'wallet.credit'))throw no('permission-denied','Not allowed.');if(!(a>=1&&a<=1e6))throw no('invalid-argument','Enter a valid amount.');
 const rin=String(ruthId||'').trim();if(!/^\d{10}$/.test(rin))throw no('invalid-argument','Enter the 10-digit Ruth ID.');if(depositId&&!/^[A-Za-z0-9]{1,40}$/.test(String(depositId)))throw no('invalid-argument','Invalid deposit request.');
 const rid=await db.doc('ruthIds/'+rin).get();if(!rid.exists)throw no('not-found','No account with that Ruth ID.');
 const to=rid.data().uid,tu=await usr(to),unl=m.role==='admin'||m.perms?.full===true;
 if(tu.disabled)throw no('failed-precondition','That account is suspended.');if(!unl&&to===u)throw no('permission-denied','You cannot credit your own account.');
 const aref=db.doc('allocations/'+u),dref=depositId?db.doc('deposits/'+depositId):null;let after=0;
 await db.runTransaction(async t=>{const[bs,as,ds]=await Promise.all([t.get(bal(to)),unl?null:t.get(aref),dref?t.get(dref):null]);
  if(!unl){const rem=as.exists?(as.data().remaining||0):0;if(a>rem)throw no('failed-precondition','Above your remaining allocation of N'+rem+'.');t.set(aref,{remaining:rem-a},{merge:true})}
  if(ds){if(!ds.exists||ds.data().uid!==to||ds.data().status!=='PENDING')throw no('failed-precondition','That deposit request is not pending.');t.update(dref,{status:'CREDITED',credited:a,by:u,creditedAt:FV.serverTimestamp()})}
  after=post(t,to,bs,a,'Deposit',{type:'CREDIT',by:u,byName:m.name,name:tu.name,ruthId:tu.ruthId,ref:depositId||''})});
 return{name:tu.name,phone:tu.phone||'',balance:after}});
exports.setAllocation=call(async r=>{const u=need(r),{uid,amount}=r.data||{},a=Math.round(+amount),m=await usr(u);
 if(!isAdmin(m))throw no('permission-denied','Only the admin can set allocations.');if(!uid||!a||Math.abs(a)>1e7)throw no('invalid-argument','Enter a valid amount.');
 const tu=await usr(uid),ref=db.doc('allocations/'+uid);
 await db.runTransaction(async t=>{const s=await t.get(ref);t.set(ref,{remaining:Math.max(0,(s.exists?s.data().remaining||0:0)+a)},{merge:true});
  t.set(tx(),{type:'ALLOCATION',uid,ruthId:tu.ruthId||'',name:tu.name||'',amount:a,reason:'Credit allocation',by:u,byName:m.name,ref:'',at:FV.serverTimestamp()})});return{ok:true}});
exports.adjust=call(async r=>{const u=need(r),{uid,amount,reason}=r.data||{},a=Math.round(+amount),m=await usr(u);
 if(!can(m,'customers.wallet'))throw no('permission-denied','Not allowed.');if(!a||Math.abs(a)>1e6||!reason||!uid)throw no('invalid-argument','Amount and reason are required.');
 const tu=await usr(uid);await db.runTransaction(async t=>{post(t,uid,await t.get(bal(uid)),a,String(reason).slice(0,200),{type:'ADJUSTMENT',by:u,byName:m.name,name:tu.name,ruthId:tu.ruthId})});return{ok:true}});
// withdrawals: funds are held at request time; only the admin can move the status
exports.withdraw=call(async r=>{const u=need(r),{amount,pin,bank,acct,acctName}=r.data||{},a=Math.round(+amount),m=await usr(u);
 if(m.disabled)throw no('permission-denied','Account suspended.');if(!(a>=MINW&&a<=MAXW))throw no('invalid-argument','Withdrawals are from N'+MINW+' to N'+MAXW+'.');
 if(!bank||!/^\d{10}$/.test(String(acct))||!acctName)throw no('invalid-argument','Enter the bank, a 10-digit account number and the account name.');
 await pinOk(u,pin);const w=db.collection('withdrawals').doc();
 await db.runTransaction(async t=>{const s=await t.get(bal(u));post(t,u,s,-a,'Withdrawal request',{type:'WITHDRAWAL',by:u,byName:m.name,name:m.name,ruthId:m.ruthId,ref:w.id});
  t.set(w,{uid:u,name:m.name||'',ruthId:m.ruthId||'',phone:m.phone||'',amount:a,bank:String(bank).slice(0,60),acct:String(acct),acctName:String(acctName).slice(0,80),status:'PENDING',at:FV.serverTimestamp()})});return{id:w.id}});
const NEXT={PENDING:['PROCESSING','PAID','REJECTED'],PROCESSING:['PAID','REJECTED']};
exports.setWithdrawal=call(async r=>{const u=need(r),{id,status,note}=r.data||{},m=await usr(u);if(!isAdmin(m))throw no('permission-denied','Only the admin can update withdrawals.');
 const ref=db.doc('withdrawals/'+String(id));
 await db.runTransaction(async t=>{const w=await t.get(ref);if(!w.exists)throw no('not-found','No such withdrawal.');const d=w.data();if(!(NEXT[d.status]||[]).includes(status))throw no('failed-precondition','That status change is not allowed.');
  const n=String(note||'').slice(0,200),x={by:u,byName:m.name,name:d.name,ruthId:d.ruthId,ref:ref.id};
  if(status==='REJECTED')post(t,d.uid,await t.get(bal(d.uid)),d.amount,'Withdrawal refunded'+(n?': '+n:''),{...x,type:'REFUND'});
  else t.set(tx(),{type:'WITHDRAWAL_'+status,uid:d.uid,ruthId:d.ruthId,name:d.name,amount:d.amount,reason:'Withdrawal '+status.toLowerCase(),by:u,byName:m.name,ref:ref.id,at:FV.serverTimestamp()});
  t.update(ref,{status,note:n,by:u,updatedAt:FV.serverTimestamp()})});return{ok:true}});
exports.paystack=onRequest({secrets:['PAYSTACK_SECRET']},async(q,s)=>{const sig=q.get('x-paystack-signature')||'',h=crypto.createHmac('sha512',process.env.PAYSTACK_SECRET).update(q.rawBody).digest('hex');
 if(sig.length!==h.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(h)))return s.status(401).end();
 const e=q.body;if(e.event==='charge.success'&&e.data?.status==='success'&&e.data.currency==='NGN'){const uid=e.data.metadata?.uid,a=Math.round(e.data.amount/100),ref=db.doc('topups/'+e.data.reference);
  if(uid&&a>0){const tu=await usr(uid);await db.runTransaction(async t=>{const[done,sn]=await Promise.all([t.get(ref),t.get(bal(uid))]);if(done.exists)return;t.set(ref,{uid,a,at:FV.serverTimestamp()});
   post(t,uid,sn,a,'Top up via Paystack',{type:'CREDIT',by:'paystack',byName:'Paystack',name:tu.name,ruthId:tu.ruthId,ref:e.data.reference})})}}
 s.status(200).end()});
exports.referral=onDocumentUpdated('orders/{id}',async ev=>{const b=ev.data.before.data(),a=ev.data.after.data();if(b.status===a.status||a.status!=='DELIVERED'||!a.uid)return;
 const uref=db.doc('users/'+a.uid),u=(await uref.get()).data()||{};if(!u.ref||u.refPaid)return;const rid=await db.doc('ruthIds/'+u.ref).get();if(!rid.exists||rid.data().uid===a.uid)return;
 const bonus=Math.round(((await db.doc('settings/public').get()).data()||{}).refBonus||0);if(bonus<=0)return;const ru=rid.data().uid,ruu=await usr(ru);
 await db.runTransaction(async t=>{const[s1,s2,us]=await Promise.all([t.get(bal(a.uid)),t.get(bal(ru)),t.get(uref)]);if(us.data().refPaid)return;
  post(t,a.uid,s1,bonus,'Referral welcome bonus',{type:'BONUS',name:u.name,ruthId:u.ruthId});post(t,ru,s2,bonus,'Referral bonus: '+(u.name||'a friend')+' received a first delivery',{type:'BONUS',name:ruu.name,ruthId:ruu.ruthId});t.update(uref,{refPaid:true})})});

// ---- v2: server-priced orders, wallet checkout, pay-for-someone, guest tracking
const newCode=()=>crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
const contactOf=c=>{c=c||{};const name=String(c.name||'').trim().slice(0,100),phone=String(c.phone||'').replace(/[^\d+]/g,'').slice(0,20),addr=String(c.addr||'').trim().slice(0,300),email=String(c.email||'').trim().slice(0,120);
 if(!name||phone.replace(/\D/g,'').length<10||!addr)throw no('invalid-argument','Enter your name, phone number and delivery address.');return{name,phone,addr,email,geo:Array.isArray(c.geo)&&c.geo.length===2&&c.geo.every(x=>typeof x==='number'&&isFinite(x))?c.geo.slice(0,2):null}};
async function quote(d){const items=Array.isArray(d.items)?d.items:[];if(!items.length||items.length>50)throw no('invalid-argument','Your cart is empty.');
 const merged={};for(const x of items){const q=Math.round(+x.qty),id=String(x.id||'');if(!id||id.includes('/')||!(q>=1&&q<=99))throw no('invalid-argument','Invalid item in your cart.');merged[id]=Math.min(99,(merged[id]||0)+q)}
 const ids=Object.keys(merged),snaps=await db.getAll(...ids.map(i=>db.doc('products/'+i)));
 const lines=snaps.map(s=>{if(!s.exists)throw no('failed-precondition','An item is no longer available. Please refresh the page.');const p=s.data();if(p.active!==true||p.stock===false||typeof p.price!=='number'||(typeof p.qty==='number'&&p.qty<=0))throw no('failed-precondition',(p.name||'An item')+' is not available right now.');return{id:s.id,name:p.name,price:p.price,qty:merged[s.id]}});
 const sub=lines.reduce((a,l)=>a+l.price*l.qty,0),zs=await db.collection('zones').where('active','==',true).get();let fee=0,zoneName='';
 if(!zs.empty){const z=zs.docs.find(x=>x.id===d.zone);if(!z)throw no('invalid-argument','Choose a delivery zone.');fee=z.data().free?0:Math.round(z.data().price||0);zoneName=z.data().name||''}
 let discount=0,promo='';if(d.promo){const c=String(d.promo).trim().toUpperCase().replace(/\//g,''),ps=c?await db.doc('promos/'+c).get():null,p=ps?.data();
  if(ps?.exists&&p.active&&(!p.expires||p.expires>Date.now())&&sub>=(p.min||0)){discount=Math.min(sub,p.type==='PERCENT'?Math.round(sub*p.value/100):Math.round(p.value));promo=c}}
 return{lines,sub,fee,discount,promo,zoneName,total:sub-discount+fee}}
exports.placeOrder=call(async r=>{const d=r.data||{},uid=r.auth?.uid||null,method=d.method==='WALLET'?'WALLET':'PAY_ON_DELIVERY',c=contactOf(d.contact),q=await quote(d),code=newCode(),oref=db.collection('orders').doc();
 const base={uid,items:q.lines,total:q.total,fee:q.fee,discount:q.discount,promo:q.promo,zone:q.zoneName,contact:c,method,status:'PLACED',code,createdAt:FV.serverTimestamp()},ev=()=>oref.collection('events').doc();
 if(method==='WALLET'){if(!uid)throw no('unauthenticated','Sign in to pay with your wallet.');const m=await usr(uid);if(m.disabled)throw no('permission-denied','Account suspended.');await pinOk(uid,d.pin);
  await db.runTransaction(async t=>{post(t,uid,await t.get(bal(uid)),-q.total,'Order #'+code,{type:'PURCHASE',by:uid,byName:m.name,name:m.name,ruthId:m.ruthId,ref:oref.id});t.set(oref,{...base,pay:'CONFIRMED',paidByUid:uid});t.set(ev(),{from:'',to:'PLACED',by:uid,at:FV.serverTimestamp()})})}
 else{await oref.set({...base,pay:'PENDING'});await ev().set({from:'',to:'PLACED',by:uid||'guest',at:FV.serverTimestamp()})}
 return{id:oref.id,code,total:q.total}});
exports.createPayRequest=call(async r=>{const u=need(r),d=r.data||{},m=await usr(u);if(m.disabled)throw no('permission-denied','Account suspended.');const c=contactOf(d.contact),q=await quote(d),code='RT-'+crypto.randomBytes(5).toString('hex').slice(0,6).toUpperCase();
 await db.doc('payRequests/'+code).set({requesterUid:u,requesterName:m.name||'',items:q.lines,sub:q.sub,fee:q.fee,discount:q.discount,promo:q.promo,zone:q.zoneName,total:q.total,contact:c,status:'OPEN',expiresAt:Date.now()+48*36e5,createdAt:FV.serverTimestamp()});return{code,total:q.total}});
exports.lookupPayRequest=call(async r=>{need(r);const code=String(r.data?.code||'').trim().toUpperCase().replace(/\//g,''),s=code?await db.doc('payRequests/'+code).get():null;if(!s?.exists)throw no('not-found','No request with that code.');const x=s.data();
 return{name:x.requesterName,items:x.items.map(i=>({name:i.name,qty:i.qty,price:i.price})),fee:x.fee,discount:x.discount,total:x.total,status:x.status==='OPEN'&&x.expiresAt<Date.now()?'EXPIRED':x.status}});
exports.payRequest=call(async r=>{const u=need(r),code=String(r.data?.code||'').trim().toUpperCase().replace(/\//g,''),m=await usr(u);if(m.disabled)throw no('permission-denied','Account suspended.');await pinOk(u,r.data?.pin);
 const ref=db.doc('payRequests/'+code),oref=db.collection('orders').doc(),oc=newCode();let nm='';
 await db.runTransaction(async t=>{const s=await t.get(ref);if(!s.exists)throw no('not-found','No request with that code.');const x=s.data();
  if(x.status!=='OPEN'||x.expiresAt<Date.now())throw no('failed-precondition','This request is no longer open.');if(x.requesterUid===u)throw no('invalid-argument','Use Pay with wallet for your own order.');
  const b=await t.get(bal(u));nm=x.requesterName;post(t,u,b,-x.total,'Paid for '+x.requesterName+' (request '+code+')',{type:'PURCHASE',by:u,byName:m.name,name:m.name,ruthId:m.ruthId,ref:oref.id});
  t.set(oref,{uid:x.requesterUid,items:x.items,total:x.total,fee:x.fee,discount:x.discount,promo:x.promo,zone:x.zone,contact:x.contact,method:'PAID_BY_OTHER',status:'PLACED',pay:'CONFIRMED',paidByUid:u,paidByName:m.name||'',code:oc,createdAt:FV.serverTimestamp()});
  t.set(oref.collection('events').doc(),{from:'',to:'PLACED',by:u,at:FV.serverTimestamp()});t.update(ref,{status:'PAID',orderId:oref.id,paidBy:u,paidAt:FV.serverTimestamp()})});return{name:nm}});
exports.refund=onDocumentUpdated('orders/{id}',async ev=>{const b=ev.data.before.data(),a=ev.data.after.data();if(b.status===a.status||!['CANCELLED','REJECTED'].includes(a.status)||a.pay!=='CONFIRMED'||!a.paidByUid||a.refunded)return;
 const to=a.paidByUid,u=await usr(to),ref=ev.data.after.ref;await db.runTransaction(async t=>{const[os,bs]=await Promise.all([t.get(ref),t.get(bal(to))]);if(os.data().refunded)return;post(t,to,bs,a.total,'Refund for order #'+a.code,{type:'REFUND',name:u.name,ruthId:u.ruthId,ref:ev.params.id});t.update(ref,{refunded:true})})});
exports.trackOrder=call(async r=>{const code=String(r.data?.code||'').trim().toUpperCase(),ph=String(r.data?.phone||'').replace(/\D/g,'').slice(-10);if(code.length!==6||ph.length<10)throw no('invalid-argument','Enter your 6-character reference and the phone number used on the order.');
 const ip=crypto.createHash('sha256').update(String(r.rawRequest?.ip||'x')).digest('hex').slice(0,24),th=db.doc('throttle/'+ip),now=Date.now();
 const ok=await db.runTransaction(async t=>{const s=await t.get(th),x=s.exists&&now-s.data().w<36e5?s.data():{w:now,n:0};if(x.n>=20)return false;t.set(th,{w:x.w,n:x.n+1});return true});if(!ok)throw no('resource-exhausted','Too many tries. Please try again in an hour.');
 const qs=await db.collection('orders').where('code','==',code).limit(5).get(),o=qs.docs.find(d=>String(d.data().contact?.phone||'').replace(/\D/g,'').slice(-10)===ph);if(!o)throw no('not-found','We could not find an order with those details.');
 const x=o.data(),ev=await o.ref.collection('events').orderBy('at','asc').get();
 return{code,status:x.status,pay:x.pay,total:x.total,fee:x.fee,zone:x.zone||'',items:(x.items||[]).map(i=>({name:i.name,qty:i.qty})),events:ev.docs.map(e=>({to:e.data().to,at:e.data().at?.toMillis?.()||0}))}});
