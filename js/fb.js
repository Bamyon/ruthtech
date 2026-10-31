let C=null;try{C=(await import('./config.js')).CONFIG}catch{}
export const CFG=C;
export const live=!!(C&&C.firebase?.apiKey);
export let fb={};
if(live){const B='https://www.gstatic.com/firebasejs/10.12.2/';
const[a,f,u,fn]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-firestore.js'),import(B+'firebase-auth.js'),C.useFunctions?import(B+'firebase-functions.js'):null]);
const app=a.initializeApp(C.firebase);fb={initApp:a.initializeApp,db:f.getFirestore(app),auth:u.getAuth(app),...f,...u,call:(n,d)=>fn.httpsCallable(fn.getFunctions(app),n)(d).then(r=>r.data).catch(e=>{const down=e.code==='functions/internal'&&/^internal$/i.test(e.message||'');throw Object.assign(new Error(down?'The wallet service did not respond. Check your connection and try again. If it keeps happening, the Cloud Functions need redeploying.':(e.message||'Something went wrong.')),{code:e.code})})}}
if(live&&!C.useFunctions){const{makeLocal}=await import('./local.js'),L=makeLocal(fb);fb.local=true;
 fb.call=(n,d)=>(L[n]?L[n](d):Promise.reject(new Error('Not available.'))).catch(e=>{throw e.code==='permission-denied'?Object.assign(new Error('Not allowed. Publish the latest Firestore rules in the Firebase console.'),{code:e.code}):e})}
export const PUB=(()=>{try{return JSON.parse(localStorage.pub||'{}')}catch{return{}}})();
const wa=()=>String(PUB.whatsapp||C?.whatsapp||'').replace(/\D/g,'');export let WA=wa();
if(live)fb.getDoc(fb.doc(fb.db,'settings','public')).then(d=>{const v=d.data()||{};for(const k of Object.keys(PUB))delete PUB[k];Object.assign(PUB,v);WA=wa();try{localStorage.pub=JSON.stringify(v)}catch{}}).catch(()=>{});
