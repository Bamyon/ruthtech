import {makeProfile} from './profile.js';import {fb,live} from './fb.js';import {$} from './ui.js';
const admin=document.body.dataset.mode==='admin',f=$('#f'),say=t=>$('#msg').textContent=t;let reg=false;
if(!live)say('Backend not connected yet. Add js/config.js.');
$('#sw')?.addEventListener('click',()=>{reg=!reg;$('#nm').hidden=!reg;$('#nm').required=reg;for(const k of['ph','rf'])$('#'+k).hidden=!reg;$('#ph').required=reg;$('#go').textContent=reg?'Create account':'Sign in'});
$('#rs').addEventListener('click',async()=>{try{await fb.sendPasswordResetEmail(fb.auth,f.email.value);say('If that account exists, a reset link is on its way.')}catch{say('Enter your email first.')}});
f.addEventListener('submit',async e=>{e.preventDefault();if(!live)return;
 try{let c;
  if(reg&&!admin){c=await fb.createUserWithEmailAndPassword(fb.auth,f.email.value,f.password.value);await makeProfile(c.user.uid,f.nm.value.trim(),f.ph.value.trim(),f.rf.value.trim(),'customer')}
  else c=await fb.signInWithEmailAndPassword(fb.auth,f.email.value,f.password.value);
  const me=(await fb.getDoc(fb.doc(fb.db,'users',c.user.uid))).data();
  if(!me||me.disabled||(admin&&!['admin','manager','staff'].includes(me.role))){await fb.signOut(fb.auth);return say('Access denied.')}
  location.replace('dashboard.html')
 }catch{say('Could not sign in. Check your details and try again.')}});
