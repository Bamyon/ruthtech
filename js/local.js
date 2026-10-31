// Runs the wallet and order logic in the browser (no Cloud Functions). Same names and results as functions/index.js.
// Switch to the real functions at go-live: set useFunctions:true in js/config.js.
export function makeLocal(fb){
const D=p=>fb.doc(fb.db,...p.split('/')),C=p=>fb.collection(fb.db,...p.split('/')),ts=()=>fb.serverTimestamp();
const err=(m,c='failed-precondition')=>Object.assign(new Error(m),{code:'functions/'+c});
const uid=()=>{const u=fb.auth.currentUser;if(!u)throw err('Sign in first.','unauthenticated');return u.uid};
const usr=async u=>(await fb.getDoc(D('users/'+u))).data()||{};
const can=(m,p)=>!m.disabled&&(m.role==='admin'||m.perms?.full===true||m.perms?.[p]===true);
const hex=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
const hash=async(p,s)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(p)),'PBKDF2',false,['deriveBits']);return[...new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(s),iterations:100000,hash:'SHA-256'},k,256))].map(b=>b.toString(16).padStart(2,'0')).join('')};
const pinOk=async(u,pin)=>{const r=D('secrets/'+u),s=await fb.getDoc(r);if(!s.exists())throw err('Set your PIN first in Settings.');const d=s.data();if((d.lockUntil||0)>Date.now())throw err('Too many wrong PINs. Try again in 15 minutes.','resource-exhausted');
 if(await hash(pin||'',d.salt)!==d.hash){const t=(d.tries||0)+1;await fb.updateDoc(r,{tries:t>=5?0:t,lockUntil:t>=5?Date.now()+9e5:0});throw err('Wrong PIN.','permission-denied')}if(d.tries)await fb.updateDoc(r,{tries:0})};
const rid10=v=>{v=String(v||'').trim();if(!/^\d{10}$/.test(v))throw err('Enter the 10-digit Ruth ID.','invalid-argument');return v};
// one transaction that moves money: balances + customer ledger + global log. pre() may read, post() may write.
async function move(list,o={}){const u=uid(),self=await usr(u);return fb.runTransaction(fb.db,async t=>{
 const sn=await Promise.all(list.map(x=>t.get(D('balances/'+x.u)))),ctx=o.pre?await o.pre(t):null;
 const out=list.map((x,i)=>{const cur=sn[i].exists()?(sn[i].data().amount||0):0;if(cur+x.amt<0)throw err('Insufficient balance.');return cur+x.amt});
 list.forEach((x,i)=>{t.set(D('balances/'+x.u),{amount:out[i]},{merge:true});
  t.set(fb.doc(C('wallet/'+x.u+'/ledger')),{amount:x.amt,reason:x.reason,by:u,ref:x.ref||'',at:ts()});
  t.set(fb.doc(C('transactions')),{type:x.type,uid:x.u,ruthId:x.ruthId||'',name:x.name||'',amount:x.amt,reason:x.reason,by:u,byName:self.name||'',ref:x.ref||'',at:ts()})});
 if(o.post)o.post(t,ctx);return out})}
const contactOf=c=>{c=c||{};const name=String(c.name||'').trim().slice(0,100),phone=String(c.phone||'').replace(/[^\d+]/g,'').slice(0,20),addr=String(c.addr||'').trim().slice(0,300),email=String(c.email||'').trim().slice(0,120);
 if(!name||phone.replace(/\D/g,'').length<10||!addr)throw err('Enter your name, phone number and delivery address.','invalid-argument');return{name,phone,addr,email,geo:Array.isArray(c.geo)&&c.geo.length===2&&c.geo.every(x=>typeof x==='number'&&isFinite(x))?c.geo.slice(0,2):null}};
async function quote(d){const items=Array.isArray(d.items)?d.items:[];if(!items.length||items.length>50)throw err('Your cart is empty.','invalid-argument');const m={};
 for(const x of items){const q=Math.round(+x.qty),id=String(x.id||'');if(!id||id.includes('/')||!(q>=1&&q<=99))throw err('Invalid item in your cart.','invalid-argument');m[id]=Math.min(99,(m[id]||0)+q)}
 const lines=await Promise.all(Object.entries(m).map(async([id,q])=>{const s=await fb.getDoc(D('products/'+id));if(!s.exists())throw err('An item is no longer available. Please refresh the page.');const p=s.data();
  if(p.active!==true||p.stock===false||typeof p.price!=='number'||(typeof p.qty==='number'&&p.qty<=0))throw err((p.name||'An item')+' is not available right now.');if(typeof p.qty==='number'&&q>p.qty)throw err('Only '+p.qty+' left of '+p.name+'.');return{id,name:p.name,price:p.price,qty:q}}));
 const sub=lines.reduce((a,l)=>a+l.price*l.qty,0);let fee=0,zone='',zid=String(d.zone||'').replaceAll('/','');
 if(zid){const z=await fb.getDoc(D('zones/'+zid));if(z.exists()&&z.data().active){fee=z.data().free?0:Math.round(z.data().price||0);zone=z.data().name||''}}
 else if(!(await fb.getDocs(fb.query(C('zones'),fb.where('active','==',true),fb.limit(1)))).empty)throw err('Choose a delivery zone.','invalid-argument');
 let discount=0,promo='';const pc=String(d.promo||'').trim().toUpperCase().replaceAll('/','');
 if(pc){const ps=await fb.getDoc(D('promos/'+pc)),p=ps.data();if(ps.exists()&&p.active&&(!p.expires||p.expires>Date.now())&&sub>=(p.min||0)){discount=Math.min(sub,p.type==='PERCENT'?Math.round(sub*p.value/100):Math.round(p.value));promo=pc}}
 return{lines,sub,fee,discount,promo,zone,total:sub-discount+fee}}
const oid=(code,c)=>code+String(c.phone).replace(/\D/g,'').slice(-10);
return{
async setPin({pin,oldPin}){const u=uid();if(!/^\d{4}$/.test(String(pin)))throw err('PIN must be 4 digits.','invalid-argument');const r=D('secrets/'+u),s=await fb.getDoc(r);if(s.exists())await pinOk(u,oldPin);
 const salt=hex(16);await fb.setDoc(r,{salt,hash:await hash(pin,salt),tries:0,lockUntil:0});await fb.setDoc(D('balances/'+u),{hasPin:true},{merge:true});return{ok:true}},
async transfer(d){const u=uid(),a=Math.round(+d.amount),me=await usr(u);if(!(a>0&&a<=200000))throw err('Amount must be between 1 and 200000.','invalid-argument');if(me.disabled)throw err('Account suspended.','permission-denied');
 const rin=rid10(d.toRuthId);await pinOk(u,d.pin);const rid=await fb.getDoc(D('ruthIds/'+rin));if(!rid.exists())throw err('No account with that Ruth ID.','not-found');const to=rid.data().uid;if(to===u)throw err('You cannot send money to yourself.','invalid-argument');
 const tu=await usr(to);if(tu.disabled)throw err('That account cannot receive money.');const n=d.note?': '+String(d.note).slice(0,80):'';
 await move([{u,amt:-a,reason:'Sent to '+tu.name+n,type:'TRANSFER',name:me.name,ruthId:me.ruthId},{u:to,amt:a,reason:'Received from '+me.name+n,type:'TRANSFER',name:tu.name,ruthId:tu.ruthId}]);return{name:tu.name}},
async credit(d){const u=uid(),m=await usr(u),a=Math.round(+d.amount);if(!can(m,'wallet.credit'))throw err('Not allowed.','permission-denied');if(!(a>=1&&a<=1e6))throw err('Enter a valid amount.','invalid-argument');
 const rin=rid10(d.ruthId),dep=d.depositId&&/^[A-Za-z0-9]{1,40}$/.test(String(d.depositId))?String(d.depositId):'',rid=await fb.getDoc(D('ruthIds/'+rin));if(!rid.exists())throw err('No account with that Ruth ID.','not-found');
 const to=rid.data().uid,tu=await usr(to),unl=m.role==='admin'||m.perms?.full===true;if(tu.disabled)throw err('That account is suspended.');if(!unl&&to===u)throw err('You cannot credit your own account.','permission-denied');
 const aref=D('allocations/'+u),dref=dep?D('deposits/'+dep):null;
 const r=await move([{u:to,amt:a,reason:'Deposit',type:'CREDIT',ref:dep,name:tu.name,ruthId:tu.ruthId}],{
  pre:async t=>{const[as,ds]=await Promise.all([unl?null:t.get(aref),dref?t.get(dref):null]);if(!unl){const rem=as.exists()?(as.data().remaining||0):0;if(a>rem)throw err('Above your remaining allocation of N'+rem+'.')}
   if(ds&&(!ds.exists()||ds.data().uid!==to||ds.data().status!=='PENDING'))throw err('That deposit request is not pending.');return{as,ds}},
  post:(t,c)=>{if(!unl)t.set(aref,{remaining:(c.as.data()?.remaining||0)-a},{merge:true});if(c.ds)t.update(dref,{status:'CREDITED',credited:a,by:u,creditedAt:ts()})}});
 return{name:tu.name,phone:tu.phone||'',balance:r[0]}},
async setAllocation({uid:to,amount}){const u=uid(),m=await usr(u),a=Math.round(+amount);if(m.role!=='admin'||m.disabled)throw err('Only the admin can set allocations.','permission-denied');if(!to||!a||Math.abs(a)>1e7)throw err('Enter a valid amount.','invalid-argument');
 const tu=await usr(to),ref=D('allocations/'+to),s=await fb.getDoc(ref);await fb.setDoc(ref,{remaining:Math.max(0,(s.exists()?s.data().remaining||0:0)+a)},{merge:true});
 await fb.addDoc(C('transactions'),{type:'ALLOCATION',uid:to,ruthId:tu.ruthId||'',name:tu.name||'',amount:a,reason:'Credit allocation',by:u,byName:m.name||'',ref:'',at:ts()});return{ok:true}},
async adjust({uid:to,amount,reason}){const u=uid(),m=await usr(u),a=Math.round(+amount);if(!can(m,'customers.wallet'))throw err('Not allowed.','permission-denied');if(!a||Math.abs(a)>1e6||!reason||!to)throw err('Amount and reason are required.','invalid-argument');
 const tu=await usr(to);await move([{u:to,amt:a,reason:String(reason).slice(0,200),type:'ADJUSTMENT',name:tu.name,ruthId:tu.ruthId}]);return{ok:true}},
async withdraw(d){const u=uid(),a=Math.round(+d.amount),m=await usr(u);if(m.disabled)throw err('Account suspended.','permission-denied');if(!(a>=1000&&a<=1e6))throw err('Withdrawals are from N1000 to N1000000.','invalid-argument');
 if(!d.bank||!/^\d{10}$/.test(String(d.acct))||!d.acctName)throw err('Enter the bank, a 10-digit account number and the account name.','invalid-argument');await pinOk(u,d.pin);const w=fb.doc(C('withdrawals'));
 await move([{u,amt:-a,reason:'Withdrawal request',type:'WITHDRAWAL',ref:w.id,name:m.name,ruthId:m.ruthId}],{post:t=>t.set(w,{uid:u,name:m.name||'',ruthId:m.ruthId||'',phone:m.phone||'',amount:a,bank:String(d.bank).slice(0,60),acct:String(d.acct),acctName:String(d.acctName).slice(0,80),status:'PENDING',at:ts()})});return{id:w.id}},
async setWithdrawal({id,status,note}){const u=uid(),m=await usr(u);if(m.role!=='admin'||m.disabled)throw err('Only the admin can update withdrawals.','permission-denied');
 const NEXT={PENDING:['PROCESSING','PAID','REJECTED'],PROCESSING:['PAID','REJECTED']},ref=D('withdrawals/'+String(id).replaceAll('/','')),s=await fb.getDoc(ref);if(!s.exists())throw err('No such withdrawal.','not-found');const w=s.data();
 if(!(NEXT[w.status]||[]).includes(status))throw err('That status change is not allowed.');const n=String(note||'').slice(0,200),upd={status,note:n,by:u,updatedAt:ts()};
 if(status==='REJECTED')await move([{u:w.uid,amt:w.amount,reason:'Withdrawal refunded'+(n?': '+n:''),type:'REFUND',ref:ref.id,name:w.name,ruthId:w.ruthId}],{post:t=>t.update(ref,upd)});
 else{await fb.updateDoc(ref,upd);await fb.addDoc(C('transactions'),{type:'WITHDRAWAL_'+status,uid:w.uid,ruthId:w.ruthId,name:w.name,amount:w.amount,reason:'Withdrawal '+status.toLowerCase(),by:u,byName:m.name||'',ref:ref.id,at:ts()})}return{ok:true}},
async refundOrder({id}){const u=uid(),m=await usr(u);if(!can(m,'customers.wallet'))throw err('Ask the admin to refund this order.','permission-denied');const ref=D('orders/'+String(id).replaceAll('/','')),s=await fb.getDoc(ref),o=s.data();
 if(!o||o.pay!=='CONFIRMED'||!o.paidByUid||o.refunded)return{ok:true};const tu=await usr(o.paidByUid);await move([{u:o.paidByUid,amt:o.total,reason:'Refund for order #'+o.code,type:'REFUND',ref:ref.id,name:tu.name,ruthId:tu.ruthId}],{post:t=>t.update(ref,{refunded:true})});return{ok:true}},
async referral({id}){const u=uid(),m=await usr(u);if(!(m.role==='admin'||m.perms?.full===true||m.perms?.['customers.wallet']===true))return{ok:false};
 const a=(await fb.getDoc(D('orders/'+String(id).replaceAll('/','')))).data();if(!a?.uid||a.status!=='DELIVERED')return{ok:false};
 const uref=D('users/'+a.uid),x=(await fb.getDoc(uref)).data()||{};if(!x.ref||x.refPaid)return{ok:false};const rid=await fb.getDoc(D('ruthIds/'+x.ref));if(!rid.exists()||rid.data().uid===a.uid)return{ok:false};
 const bonus=Math.round(((await fb.getDoc(D('settings/public'))).data()||{}).refBonus||0);if(bonus<=0)return{ok:false};const ru=rid.data().uid,ruu=await usr(ru);
 await move([{u:a.uid,amt:bonus,reason:'Referral welcome bonus',type:'BONUS',name:x.name,ruthId:x.ruthId},{u:ru,amt:bonus,reason:'Referral bonus: '+(x.name||'a friend')+' received a first delivery',type:'BONUS',name:ruu.name,ruthId:ruu.ruthId}],{post:t=>t.update(uref,{refPaid:true})});return{ok:true}},
async placeOrder(d){const u=fb.auth.currentUser?.uid||null,method=d.method==='WALLET'?'WALLET':'PAY_ON_DELIVERY',c=contactOf(d.contact),q=await quote(d),code=hex(3),id=oid(code,c),oref=D('orders/'+id);
 const base={uid:u,items:q.lines,total:q.total,fee:q.fee,discount:q.discount,promo:q.promo,zone:q.zone,contact:c,method,status:'PLACED',code,createdAt:ts()},ev=()=>fb.doc(C('orders/'+id+'/events'));
 if(method==='WALLET'){if(!u)throw err('Sign in to pay with your wallet.','unauthenticated');const m=await usr(u);if(m.disabled)throw err('Account suspended.','permission-denied');await pinOk(u,d.pin);
  await move([{u,amt:-q.total,reason:'Order #'+code,type:'PURCHASE',ref:id,name:m.name,ruthId:m.ruthId}],{post:t=>{t.set(oref,{...base,pay:'CONFIRMED',paidByUid:u});t.set(ev(),{from:'',to:'PLACED',by:u,at:ts()})}})}
 else{await fb.setDoc(oref,{...base,pay:'PENDING'});await fb.addDoc(C('orders/'+id+'/events'),{from:'',to:'PLACED',by:u||'guest',at:ts()})}return{id,code,total:q.total}},
async createPayRequest(d){const u=uid(),m=await usr(u);if(m.disabled)throw err('Account suspended.','permission-denied');const c=contactOf(d.contact),q=await quote(d),code='RT-'+hex(3);
 await fb.setDoc(D('payRequests/'+code),{requesterUid:u,requesterName:m.name||'',items:q.lines,sub:q.sub,fee:q.fee,discount:q.discount,promo:q.promo,zone:q.zone,total:q.total,contact:c,status:'OPEN',expiresAt:Date.now()+48*36e5,createdAt:ts()});return{code,total:q.total}},
async lookupPayRequest({code}){uid();const c=String(code||'').trim().toUpperCase().replaceAll('/',''),s=c?await fb.getDoc(D('payRequests/'+c)):null;if(!s?.exists())throw err('No request with that code.','not-found');const x=s.data();
 return{name:x.requesterName,items:x.items.map(i=>({name:i.name,qty:i.qty,price:i.price})),fee:x.fee,discount:x.discount,total:x.total,status:x.status==='OPEN'&&x.expiresAt<Date.now()?'EXPIRED':x.status}},
async payRequest({code,pin}){const u=uid(),c=String(code||'').trim().toUpperCase().replaceAll('/',''),me=await usr(u);if(me.disabled)throw err('Account suspended.','permission-denied');await pinOk(u,pin);
 const ref=D('payRequests/'+c),s=await fb.getDoc(ref);if(!s.exists())throw err('No request with that code.','not-found');const x=s.data();if(x.status!=='OPEN'||x.expiresAt<Date.now())throw err('This request is no longer open.');if(x.requesterUid===u)throw err('Use Pay with wallet for your own order.','invalid-argument');
 const oc=hex(3),id=oid(oc,x.contact);await move([{u,amt:-x.total,reason:'Paid for '+x.requesterName+' (request '+c+')',type:'PURCHASE',ref:id,name:me.name,ruthId:me.ruthId}],{post:t=>{
  t.set(D('orders/'+id),{uid:x.requesterUid,items:x.items,total:x.total,fee:x.fee,discount:x.discount,promo:x.promo,zone:x.zone,contact:x.contact,method:'PAID_BY_OTHER',status:'PLACED',pay:'CONFIRMED',paidByUid:u,paidByName:me.name||'',code:oc,createdAt:ts()});
  t.set(fb.doc(C('orders/'+id+'/events')),{from:'',to:'PLACED',by:u,at:ts()});t.update(ref,{status:'PAID',orderId:id,paidBy:u,paidAt:ts()})}});return{name:x.requesterName}},
async trackOrder({code,phone}){const c=String(code||'').trim().toUpperCase(),ph=String(phone||'').replace(/\D/g,'').slice(-10);if(c.length!==6||ph.length<10)throw err('Enter your 6-character reference and the phone number used on the order.','invalid-argument');
 const s=await fb.getDoc(D('orders/'+c+ph)).catch(()=>null);if(!s?.exists())throw err('We could not find an order with those details.','not-found');const x=s.data(),ev=await fb.getDocs(fb.query(C('orders/'+s.id+'/events'),fb.orderBy('at','asc')));
 return{code:c,status:x.status,pay:x.pay,total:x.total,fee:x.fee,zone:x.zone||'',items:(x.items||[]).map(i=>({name:i.name,qty:i.qty})),events:ev.docs.map(e=>({to:e.data().to,at:e.data().at?.toMillis?.()||0}))}}
}}
