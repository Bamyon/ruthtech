import {fb} from './fb.js';
export async function makeProfile(uid,name,phone,ref,role){for(let i=0;i<5;i++){const id=String(1e9+(crypto.getRandomValues(new Uint32Array(1))[0]%9e9)),b=fb.writeBatch(fb.db);
 b.set(fb.doc(fb.db,'users',uid),{name,phone,role,ruthId:id,...(ref?{ref:ref.slice(0,12)}:{}),createdAt:fb.serverTimestamp()});b.set(fb.doc(fb.db,'ruthIds',id),{uid,name});
 try{await b.commit();return id}catch(e){if(i===4)throw e}}}
