import {live,fb} from './fb.js';import {$} from './ui.js';
const f=$('#f'),say=t=>$('#msg').textContent=t;
if(!live)say('Add js/config.js first.');
else{const s=await fb.getDoc(fb.doc(fb.db,'settings','setup')).catch(()=>null);if(s?.exists()){$('#go').hidden=true;[...f.querySelectorAll('input')].forEach(i=>i.hidden=true);$('#done').hidden=false;say('Setup is complete. Sign in through the back office.')}}
f.addEventListener('submit',async e=>{e.preventDefault();if(!live)return;let c;
 try{try{c=await fb.createUserWithEmailAndPassword(fb.auth,f.email.value,f.password.value)}catch{c=await fb.signInWithEmailAndPassword(fb.auth,f.email.value,f.password.value)}
  const id=String(1e9+(crypto.getRandomValues(new Uint32Array(1))[0]%9e9)),b=fb.writeBatch(fb.db);b.set(fb.doc(fb.db,'users',c.user.uid),{name:f.nm.value.trim(),phone:f.ph.value.trim(),role:'admin',ruthId:id,createdAt:fb.serverTimestamp()});b.set(fb.doc(fb.db,'ruthIds',id),{uid:c.user.uid,name:f.nm.value.trim()});b.set(fb.doc(fb.db,'settings','setup'),{adminUid:c.user.uid,at:fb.serverTimestamp()});await b.commit();location.replace('dashboard.html')
 }catch{say('Setup is not available. An owner may already exist.')}});
