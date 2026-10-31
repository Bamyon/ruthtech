import {PUB,live,fb} from './fb.js';import {h,naira,cl,ic} from './ui.js';
export const jget=k=>{try{return JSON.parse(localStorage[k]||'[]')}catch{return[]}},jset=(k,v)=>{try{localStorage[k]=JSON.stringify(v)}catch{}};
export const K=n=>n>=1000?(n/1000).toFixed(n>=10000?0:1).replace('.0','')+'k':String(Math.round(n)),
 off=p=>p.was>p.price?Math.round((1-p.price/p.was)*100):0,left=p=>typeof p.qty==='number'?p.qty:Infinity,
 soldOut=p=>p.stock===false||left(p)<=0,low=p=>typeof p.qty==='number'&&p.qty>0&&p.qty<=(p.lowAt??5);
export const cached=()=>jget('cat');
export async function fresh(){const s=await fb.getDocs(fb.query(fb.collection(fb.db,'products'),fb.where('active','==',true),fb.limit(300))),L=s.docs.map(d=>({id:d.id,...d.data()}));jset('cat',L);return L}
export const meta=p=>{const r=PUB.showRating!==false&&p.rating>0,s=PUB.showSold!==false&&p.sold>0;
 const t=typeof p.qty==='number'&&p.qty>0;return r||s||t?h('div',{class:'meta'},r?h('span',{class:'rt'},ic('star'),(+p.rating).toFixed(1),p.reviewsN?h('em',{},'('+K(p.reviewsN)+')'):''):'',s?h('span',{},K(p.sold)+(p.sold>=1000?'+':'')+' sold'):'',t?h('span',{class:low(p)?'lowtxt':'stk'},low(p)?'Only '+p.qty+' left':p.qty+' in stock'):''):''};
export function productCard(p,{add,base=''}={}){const im=cl(p.img,480),o=off(p),out=soldOut(p),href=base+'#/p/'+p.id;
 return h('article',{class:'pc'},h('a',{class:'pimg',href,'aria-label':'View '+p.name},im?h('img',{src:im,alt:p.name,loading:'lazy',decoding:'async',width:'480',height:'480'}):h('div',{class:'ph'},ic('bag')),o&&!out?h('span',{class:'tag'},'-'+o+'%'):'',out?h('span',{class:'tag out'},'Sold out'):''),
  h('div',{class:'pb'},h('a',{href,class:'ptitle'},h('h3',{class:'clamp'},p.name)),meta(p),h('div',{class:'pf'},h('div',{class:'pr'},h('b',{},naira(p.price)),o?h('s',{},naira(p.was)):''),add&&!out?h('button',{class:'plus','aria-label':'Add '+p.name+' to cart',onclick:()=>add(p.id)},ic('plus')):'')))}
