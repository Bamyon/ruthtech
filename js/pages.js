import {live,fb} from './fb.js';import {$,h,toast} from './ui.js';
const page=document.body.dataset.page,list=$('#list'),f=$('#pf');let me=null;
const q=(c,...w)=>fb.query(fb.collection(fb.db,c),...w,fb.limit(60));
if(!live){list.textContent='Not connected yet. Add js/config.js.';f.hidden=true}
else if(page==='reviews'){
 const s=await fb.getDocs(q('reviews',fb.where('status','==','PUBLISHED')));
 list.replaceChildren(...(s.empty?[h('p',{class:'mut'},'No reviews yet.')]:s.docs.map(d=>{const r=d.data();return h('div',{class:'card'},h('b',{},r.pname),h('div',{class:'stars'},'★'.repeat(r.rating)+'☆'.repeat(5-r.rating)),h('p',{},r.text),h('p',{class:'mut'},r.name+' | Verified buyer'))})));
 f.replaceChildren(h('p',{class:'mut'},'Reviews come from customers who received their order. Open any product in the shop to read more or leave yours once it is delivered.'),h('a',{class:'btn go',href:'shop.html'},'Go to the shop'))}
else{
 const s=await fb.getDocs(q('jobs',fb.where('active','==',true)));
 f.jb.append(...s.docs.map(d=>h('option',{value:d.id},d.data().title)));
 list.replaceChildren(...(s.empty?[h('p',{class:'mut'},'No vacancies open right now. Check back soon.')]:s.docs.map(d=>{const j=d.data();return h('div',{class:'card'},h('h3',{},j.title),h('p',{class:'mut'},[j.dept,j.type,j.location].filter(Boolean).join(', ')),h('p',{},j.about))})));
 f.onsubmit=async e=>{e.preventDefault();const o=f.jb.selectedOptions[0];
  try{await fb.addDoc(fb.collection(fb.db,'applications'),{jobId:f.jb.value,jobTitle:o.textContent,name:f.nm.value.trim(),email:f.em.value.trim(),phone:f.ph.value.trim(),cv:f.cv.value.trim(),note:f.nt.value.trim(),status:'SUBMITTED',createdAt:fb.serverTimestamp()});f.reset();toast('Application sent. Thank you.')}catch{toast('Check your details. The CV link must start with https://')}}}
