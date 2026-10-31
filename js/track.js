import {live,fb} from './fb.js';
let v='anon';try{v=localStorage.vid||(localStorage.vid=crypto.randomUUID())}catch{}
export const track=(t,ref='')=>{if(!live)return;fb.addDoc(fb.collection(fb.db,'events'),{t,ref:String(ref).slice(0,100),vid:v,at:fb.serverTimestamp()}).catch(()=>{})};
if(!/\/(rte|ste|dashboard)\.html/.test(location.pathname))track('page',location.pathname.split('/').pop()||'home');
