import {CFG,WA,PUB,live,fb} from './fb.js';import {track} from './track.js';import {$,h,naira,toast,safeImg,cl,askPin,ic,markSeen} from './ui.js';
import {productCard,cached,fresh,soldOut,left,low,off,meta,jget,jset} from './cards.js';
let geo=null,P=cached(),S=jget('secs'),Z=jget('zns'),loaded=false;
let cart={},cat='all';try{cart=JSON.parse(localStorage.getItem('cart')||'{}')}catch{}
const save=()=>{try{localStorage.setItem('cart',JSON.stringify(cart))}catch{}draw()};
const lines=()=>Object.entries(cart).map(([id,q])=>({p:P.find(x=>x.id===id),q})).filter(l=>l.p);
let promo=null;const sub=()=>lines().reduce((s,l)=>s+l.p.price*l.q,0),zone=()=>Z.find(z=>z.id===$('#co').zn.value),fee=()=>{const z=zone();return z&&!z.free?z.price:0},disc=()=>{if(!promo||sub()<(promo.min||0))return 0;return Math.min(sub(),promo.type==='PERCENT'?Math.round(sub()*promo.value/100):promo.value)},total=()=>sub()-disc()+fee();
const add=(id,d=1)=>{const p=P.find(x=>x.id===id);if(!p||soldOut(p))return toast('Sorry, that item is sold out.');if(d>0)track('add_to_cart',p.name);cart[id]=Math.min(99,left(p),(cart[id]||0)+d);if(cart[id]<=0)delete cart[id];save();if(d>0)toast('Added to cart')};
const card=p=>productCard(p,{add:id=>add(id)});
function pdp(p){const v=$('#pdp');
 if(!p){v.dataset.id='';v.replaceChildren(h('a',{class:'back',href:'#/'},ic('back'),'Back to shop'),h('p',{class:'mut empty'},loaded?'This product is no longer available.':'Loading...'));return}
 if(v.dataset.id===p.id)return;v.dataset.id=p.id;document.title=p.name+' | Ruthtech';let q=1;
 const n=h('b',{},'1'),im=cl(p.img,900),o=off(p),out=soldOut(p),l=left(p),rv=h('div'),fm=h('div'),sel=P.filter(x=>x.id!==p.id&&x.section===p.section&&!soldOut(x)).slice(0,8);
 v.replaceChildren(h('a',{class:'back',href:'#/'},ic('back'),'Back to shop'),
  h('div',{class:'pdp'},h('div',{class:'pdp-img'},im?h('img',{src:im,alt:p.name,decoding:'async',fetchpriority:'high'}):h('div',{class:'ph big'},ic('bag')),o&&!out?h('span',{class:'tag'},'-'+o+'%'):''),
   h('div',{class:'pdp-info'},h('h1',{},p.name),meta(p),h('div',{class:'pr big'},h('b',{},naira(p.price)),o?h('s',{},naira(p.was)):'',o?h('span',{class:'tag inl'},'Save '+o+'%'):''),
    h('p',{class:'stockl '+(out?'out':low(p)?'low':'ok')},out?'Sold out':low(p)?'Only '+l+' left, order soon':typeof p.qty==='number'?p.qty+' in stock':'In stock'),p.unit?h('p',{class:'mut'},p.unit):'',p.partnerName?h('p',{class:'mut'},'Sold by '+p.partnerName):'',
    out?'':h('div',{class:'row'},h('span',{class:'q'},h('button',{class:'alt','aria-label':'One less',onclick:()=>{q=Math.max(1,q-1);n.textContent=q}},'-'),' ',n,' ',h('button',{class:'alt','aria-label':'One more',onclick:()=>{q=Math.min(99,l,q+1);n.textContent=q}},'+')),h('button',{class:'go',style:'flex:1',onclick:()=>add(p.id,q)},'Add to cart')),
    h('h4',{style:'margin:.8rem 0 0'},'About this product'),h('p',{class:'desc'},p.desc||'A quality product from Ruthtech, carefully sourced.'))),
  h('h3',{style:'margin:2rem 0 .5rem'},'Customer reviews'),fm,rv,...(sel.length?[h('h3',{style:'margin:2rem 0 .5rem'},'More like this'),h('div',{class:'rail'},...sel.map(card))]:[]));
 scrollTo(0,0);reviews(p,rv,fm)}
async function reviews(p,rv,fm){if(!live)return;
 try{const s=await fb.getDocs(fb.query(fb.collection(fb.db,'reviews'),fb.where('pid','==',p.id),fb.where('status','==','PUBLISHED'),fb.limit(30))),L=s.docs.map(d=>d.data()).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  rv.replaceChildren(...(L.length?L.map(r=>h('div',{class:'rv'},h('div',{},h('span',{class:'stars'},'★'.repeat(r.rating)+'☆'.repeat(5-r.rating)),' ',h('b',{},r.name||'Customer'),' ',h('span',{class:'pill'},'Verified buyer')),h('p',{},r.text))):[h('p',{class:'mut'},'No reviews yet.')]))}catch{rv.replaceChildren(h('p',{class:'mut'},'Reviews could not be loaded.'))}
 const un=fb.onAuthStateChanged(fb.auth,async u=>{un();
  if(!u)return fm.replaceChildren(h('p',{class:'mut'},'Sign in to review products you have received. '),h('a',{class:'btn alt',href:'login.html'},'Sign in'));
  try{const[os,ex]=await Promise.all([fb.getDocs(fb.query(fb.collection(fb.db,'orders'),fb.where('uid','==',u.uid),fb.where('status','==','DELIVERED'))),fb.getDoc(fb.doc(fb.db,'reviews',u.uid+'_'+p.id))]),o=os.docs.find(d=>(d.data().items||[]).some(i=>i.id===p.id));
   if(ex.exists())return fm.replaceChildren(h('p',{class:'mut'},ex.data().status==='PUBLISHED'?'Thanks, your review is live.':'Thanks, your review is awaiting approval.'));
   if(!o)return fm.replaceChildren(h('p',{class:'mut'},'Only customers who received this product can review it.'));
   let rt=5;const tx=h('textarea',{rows:'3',maxlength:'1000',placeholder:'How was it? Quality, freshness, delivery...'}),st=h('div',{class:'starpick'}),paint=()=>st.replaceChildren(...[1,2,3,4,5].map(i=>h('button',{type:'button',class:i<=rt?'on':'','aria-label':i+' stars',onclick:()=>{rt=i;paint()}},'★')));paint();
   fm.replaceChildren(h('div',{class:'ord'},h('b',{},'Rate this product'),st,tx,h('button',{class:'go',onclick:async()=>{if(!tx.value.trim())return toast('Write a few words first.');
    try{const m=(await fb.getDoc(fb.doc(fb.db,'users',u.uid))).data()||{};await fb.setDoc(fb.doc(fb.db,'reviews',u.uid+'_'+p.id),{pid:p.id,pname:p.name,oid:o.id,uid:u.uid,name:m.name||'Customer',rating:rt,text:tx.value.trim(),status:'PENDING',createdAt:fb.serverTimestamp()});fm.replaceChildren(h('p',{class:'mut'},'Thanks! Your review will appear once approved.'))}catch{toast('Could not send your review.')}}},'Submit review')))}catch{}})}
function grid(){const q=$('#q').value.trim().toLowerCase(),so=$('#so').value,L=[...S].sort((a,b)=>(a.order||0)-(b.order||0)),ord=(a,b)=>(a.order||0)-(b.order||0);
 $('#chips').replaceChildren(...[['all','All'],...L.map(s=>[s.id,s.title])].map(([id,t])=>h('button',{class:id===cat?'on':'',onclick:()=>{cat=id;grid()}},t)));
 const vis=P.filter(p=>(cat==='all'||p.section===cat)&&(!q||(p.name+' '+(p.desc||'')+' '+(p.unit||'')+' '+(p.partnerName||'')).toLowerCase().includes(q))),root=$('#rows');
 if(q||so!=='default'||cat!=='all'){const A=[...vis];if(so==='low')A.sort((a,b)=>a.price-b.price);else if(so==='high')A.sort((a,b)=>b.price-a.price);else if(so==='new')A.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));else A.sort(ord);
  root.replaceChildren(A.length?h('div',{class:'pgrid'},...A.map(card)):h('p',{class:'mut empty'},'No products match. Try another word or clear the filters.'));return}
 const rows=[...L.map(s=>[s,vis.filter(p=>p.section===s.id).sort(ord)]),[{title:'More from Ruthtech',sub:''},vis.filter(p=>!L.some(s=>s.id===p.section)).sort(ord)]].filter(r=>r[1].length);
 if(!rows.length){root.replaceChildren(h('p',{class:'mut empty'},'Our shelves are being stocked. Please check back shortly.'));return}
 root.replaceChildren(...rows.map(([s,A])=>h('section',{class:'rowx'},h('div',{class:'rowh'},h('h3',{},s.title),h('p',{class:'mut'},s.sub||'')),h('div',{class:'rail'},...A.map(card)))))}
function draw(){const L=lines();$('#count').textContent=L.reduce((s,l)=>s+l.q,0);
 $('#lines').replaceChildren(...(L.length?L.map(l=>h('div',{class:'line'},h('span',{},l.p.name),h('span',{class:'q'},h('button',{class:'alt','aria-label':'Remove one',onclick:()=>add(l.p.id,-1)},'-'),` ${l.q} `,h('button',{class:'alt','aria-label':'Add one',onclick:()=>add(l.p.id)},'+')),h('b',{},naira(l.p.price*l.q)))):[h('p',{class:'mut'},'Your cart is empty. Add something from the shop.')]));
 $('#sub').textContent=naira(sub());$('#dc').textContent=disc()?'-'+naira(disc()):'None';$('#fee').textContent=zone()?(fee()?naira(fee()):'Free'):'Pick a zone';$('#total').textContent=naira(total())}
const info=()=>{const f=$('#co');if(!lines().length){toast('Add items to your cart first.');return}if(!f.reportValidity())return;return{geo,name:f.nm.value.trim(),phone:f.ph.value.trim(),addr:f.ad.value.trim(),email:f.em.value.trim()}};
const items=()=>lines().map(l=>({id:l.p.id,qty:l.q})),payload=i=>({items:items(),zone:$('#co').zn.value,promo:promo?.code||'',contact:i});
const remember=i=>{try{localStorage.saved=JSON.stringify({nm:i.name,ph:i.phone,ad:i.addr,em:i.email,zn:$('#co').zn.value})}catch{}};
const box=(...k)=>{const b=h('div',{class:'sheet'});b.append(h('div',{class:'glass sheetbox'},...k,h('button',{class:'alt',onclick:()=>b.remove()},'Close')));document.body.append(b)};
async function place(method){const i=info();if(!i)return;if(!live)return toast('Online ordering starts once the backend is connected.');
 try{let pin;if(method==='WALLET'){if(!fb.auth.currentUser)return toast('Sign in to pay with your wallet.');if(wbal<total())return toast('Your wallet balance is too low. Add money from your account first.');pin=await askPin('Confirm payment of '+naira(total()));if(!pin)return}
  const r=await fb.call('placeOrder',{...payload(i),method,pin});remember(i);try{localStorage.lastOrder=JSON.stringify({code:r.code,phone:i.phone})}catch{}track('order',r.code);cart={};save();$('#drawer').classList.remove('open');
  box(h('h2',{},'Order placed'),h('p',{},'Your reference'),h('b',{style:'font-size:34px;letter-spacing:.12em'},r.code),h('p',{class:'mut'},'Keep it to track your order. We will confirm it shortly.'),h('a',{class:'btn go',href:'track.html'},'Track my order'))}
 catch(x){toast(x.message||'Could not place the order. Try again.')}}
$('#place').onclick=()=>place('PAY_ON_DELIVERY');$('#wallet-btn').onclick=()=>place('WALLET');
$('#req-btn').onclick=async()=>{const i=info();if(!i)return;if(!fb.auth?.currentUser)return toast('Sign in to ask someone to pay for you.');
 try{const r=await fb.call('createPayRequest',payload(i)),link=location.origin+location.pathname.replace(/[^/]*$/,'')+'dashboard.html?pay='+r.code,msg=`Hi! Please pay for my Ruthtech order (${naira(r.total)}). Request code: ${r.code}. Open ${link} or enter the code under Wallet, Pay for someone.`;
  remember(i);cart={};save();$('#drawer').classList.remove('open');
  box(h('h2',{},'Request created'),h('b',{style:'font-size:32px;letter-spacing:.1em'},r.code),h('p',{class:'mut'},'Share this code. When they pay from their wallet, your order is placed automatically. It stays open for 48 hours.'),h('div',{class:'row'},h('a',{class:'btn go',href:'https://wa.me/?text='+encodeURIComponent(msg),target:'_blank',rel:'noopener'},'Send on WhatsApp'),h('button',{class:'alt',onclick:()=>navigator.clipboard?.writeText(msg).then(()=>toast('Copied.'))},'Copy')))}catch(x){toast(x.message||'Could not create the request.')}};
$('#cart').onclick=()=>{track('open_cart');$('#drawer').classList.add('open')};$('#close').onclick=()=>$('#drawer').classList.remove('open');
const zs=$('#zn'),fillZones=()=>{const v=zs.value;zs.replaceChildren(h('option',{value:''},'Delivery zone'),...Z.map(z=>h('option',{value:z.id},`${z.name} (${z.free?'free':naira(z.price)})`)));zs.value=v;zs.required=Z.length>0};zs.onchange=draw;fillZones();
$('#sh').onclick=async()=>{if(!lines().length)return toast('Your cart is empty.');const u=location.origin+location.pathname+'?cart='+lines().map(l=>l.p.id+':'+l.q).join(',');try{if(navigator.share)await navigator.share({title:'My Ruthtech cart',url:u});else{await navigator.clipboard.writeText(u);toast('Cart link copied.')}}catch{}};
const sc=new URLSearchParams(location.search).get('cart');if(sc){cart={};for(const x of sc.split(',')){const[i,q]=x.split(':');if(P.some(p=>p.id===i)&&+q>0)cart[i]=Math.min(99,+q)}save();$('#drawer').classList.add('open')}
if(PUB.announceOn&&PUB.announce)document.body.prepend(h('div',{class:'ann'},PUB.announce));
$('#q').oninput=grid;$('#so').onchange=grid;if(WA.length>=10)$('#fwa').href='https://wa.me/'+WA;
let wbal=0;const f0=$('#co');try{const v=JSON.parse(localStorage.saved||'{}');f0.nm.value=v.nm||'';f0.ph.value=v.ph||'';f0.ad.value=v.ad||'';f0.em.value=v.em||'';if(v.zn)f0.zn.value=v.zn}catch{}
if(live)fb.onAuthStateChanged(fb.auth,async u=>{$('#wallet-btn').hidden=!u;$('#req-btn').hidden=!u;if(!u){$('#wbal').textContent='Sign in to pay from your wallet or ask someone to pay for you.';return}
 try{const m=(await fb.getDoc(fb.doc(fb.db,'users',u.uid))).data()||{};if(!f0.nm.value)f0.nm.value=m.name||'';if(!f0.ph.value)f0.ph.value=m.phone||'';if(!f0.em.value)f0.em.value=u.email||''}catch{}
 fb.onSnapshot(fb.doc(fb.db,'balances',u.uid),d=>{wbal=d.data()?.amount||0;$('#wbal').textContent='Wallet balance: '+naira(wbal)},()=>{})});
grid();draw();
const route=()=>{const m=location.hash.match(/^#\/p\/([\w-]+)/);$('#list').hidden=!!m;$('#pdp').hidden=!m;if(m)pdp(P.find(x=>x.id===m[1]));else{$('#pdp').dataset.id='';document.title='Shop | Ruthtech Foods'}};
addEventListener('hashchange',()=>{route();if(!location.hash.startsWith('#/p/'))scrollTo(0,0)});route();
(async()=>{if(!live)return;try{const q=(c)=>fb.getDocs(fb.query(fb.collection(fb.db,c),fb.where('active','==',true))),[p,s,z]=await Promise.all([fresh(),q('sections'),q('zones')]);P=p;S=s.docs.map(d=>({id:d.id,...d.data()}));Z=z.docs.map(d=>({id:d.id,...d.data()}));jset('secs',S);jset('zns',Z);loaded=true;fillZones();grid();draw();route()}catch(e){console.warn(e);loaded=true;route()}})();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
let ev;addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;if(!matchMedia('(display-mode:standalone)').matches)$('#install').hidden=false});
$('#inst').onclick=async()=>{$('#install').hidden=true;ev?.prompt()};$('#later').onclick=()=>$('#install').hidden=true;

markSeen('shop');$('#loc').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>{geo=[+p.coords.latitude.toFixed(5),+p.coords.longitude.toFixed(5)];$('#loc').textContent='Location added';toast('Your location will go with the order.')},()=>toast('Location permission denied.'));
