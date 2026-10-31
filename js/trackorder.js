import {live,fb} from './fb.js';import {$,h} from './ui.js';
const f=$('#tf'),out=$('#out'),ST=['PLACED','APPROVED','PACKING','READY','OUT_FOR_DELIVERY','DELIVERED'],nice=s=>String(s).replaceAll('_',' ').toLowerCase();let timer;
try{const s=JSON.parse(localStorage.lastOrder||'{}');if(s.code){f.cd.value=s.code;f.ph.value=s.phone||''}}catch{}
async function go(){clearTimeout(timer);if(!live)return out.textContent='Tracking opens once the store is connected.';
 try{const x=await fb.call('trackOrder',{code:f.cd.value,phone:f.ph.value}),i=ST.indexOf(x.status);
  out.replaceChildren(h('div',{class:'ord'},h('div',{class:'row'},h('h2',{},'#'+x.code),h('span',{class:'pill'},nice(x.status))),
   i<0?h('p',{class:'mut'},'This order is '+nice(x.status)+'. Contact us if you need help.'):h('div',{class:'steps'},...ST.map((s,k)=>h('div',{class:'step'+(k<=i?' on':'')},h('i'),h('span',{},nice(s))))),
   h('p',{class:'mut'},x.status==='OUT_FOR_DELIVERY'?'Your order is on its way.':x.status==='DELIVERED'?'Delivered. Thank you for shopping with Ruthtech.':'This page updates by itself as your order moves.'),
   ...x.items.map(it=>h('div',{class:'line'},h('span',{},`${it.qty} x ${it.name}`),h('span'))),h('div',{class:'line'},h('span',{},'Total'+(x.zone?' (delivery: '+x.zone+')':'')),h('b',{},'\u20a6'+Number(x.total).toLocaleString('en-NG'))),
   ...x.events.map(e=>h('div',{class:'line'},h('span',{},nice(e.to)),h('span',{class:'mut'},new Date(e.at).toLocaleString('en-NG'))))));
  timer=setTimeout(go,20000)}catch(e){out.replaceChildren(h('p',{class:'mut'},e.message||'Not found.'))}}
f.onsubmit=e=>{e.preventDefault();go()};if(f.cd.value&&f.ph.value)go();
