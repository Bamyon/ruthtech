const V='rt-v6',S=['./','index.html','shop.html','blog.html','css/app.css','js/ui.js','js/fb.js','js/cards.js','js/blog.js','js/store.js','js/home.js','manifest.webmanifest'],
X=/gstatic\.com\/firebasejs|fonts\.(googleapis|gstatic)\.com|res\.cloudinary\.com/;
addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(S)).then(()=>skipWaiting()))});
addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
 if(u.origin!==location.origin){if(!X.test(u.href))return;
  e.respondWith(caches.open(V).then(c=>c.match(r).then(m=>{const n=fetch(r).then(x=>{if(x.ok||x.type==='opaque')c.put(r,x.clone());return x}).catch(()=>m);return m||n})));return}
 if(/rte|ste\.html|setup|dashboard|config|login/.test(u.pathname))return;
 e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(k=>k.put(r,c));return x}).catch(()=>caches.match(r)))});
