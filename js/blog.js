import {track} from './track.js';import {live,fb} from './fb.js';import {$,h,toast,safeImg,ic,uploadImg,markSeen} from './ui.js';
markSeen('blog');
const root=$('#list'),one=new URLSearchParams(location.search).get('p');let me=null,mine={name:'Customer',photo:'',role:''};
const ready=live?new Promise(r=>{const un=fb.onAuthStateChanged(fb.auth,async u=>{un();me=u;if(u)try{mine={...mine,...(await fb.getDoc(fb.doc(fb.db,'users',u.uid))).data()}}catch{}r()})}):Promise.resolve();
const ago=t=>{const s=Math.max(0,(Date.now()-(t?.toMillis?.()||Date.now()))/1e3);return s<60?'Just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':new Date(Date.now()-s*1e3).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})};
const OK=new Set(['B','STRONG','I','EM','U','P','BR','UL','OL','LI','H2','H3','A','IMG','DIV','SPAN','BLOCKQUOTE']);
const san=(src,dst)=>{for(const c of src.childNodes){if(c.nodeType===3){dst.append(c.textContent);continue}if(c.nodeType!==1)continue;const t=c.tagName;if(t==='SCRIPT'||t==='STYLE')continue;if(!OK.has(t)){san(c,dst);continue}
 if(t==='IMG'){const s=safeImg(c.getAttribute('src'));if(s){const i=document.createElement('img');i.src=s;i.alt='';i.loading='lazy';dst.append(i)}continue}
 const e=document.createElement(t.toLowerCase());if(t==='A'){const u=c.getAttribute('href')||'';if(/^https?:\/\//.test(u)){e.href=u;e.target='_blank';e.rel='noopener noreferrer'}}san(c,e);dst.append(e)}};
const rich=html=>{const d=h('div',{class:'rich'});san(new DOMParser().parseFromString(html,'text/html').body,d);return d},
 plain=t=>{const d=h('div',{class:'rich'});for(const x of String(t||'').split(/\n\s*\n/))d.append(h('p',{},x));return d},
 av=u=>safeImg(u.photo)?h('img',{class:'av',src:safeImg(u.photo),alt:''}):h('i',{class:'av'},(u.name||'?')[0].toUpperCase());
const K=n=>n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':String(n),
 short=t=>{const s=Math.max(0,(Date.now()-(t?.toMillis?.()||Date.now()))/1e3);return s<60?'now':s<3600?Math.floor(s/60)+'m':s<86400?Math.floor(s/3600)+'h':s<604800?Math.floor(s/86400)+'d':Math.floor(s/604800)+'w'};
function card(p,full){const ref=fb.doc(fb.db,'posts',p.id);let nl=0,nc=0,ns=0,liked=false,loaded=false;
 const sl=h('span'),sr=h('button',{class:'lnk',onclick:()=>openCm()}),cm=h('div',{class:'cmbox',hidden:''}),body=p.html?rich(p.html):plain(p.body),long=(p.html||p.body||'').length>420,
  lkN=h('span'),ccN=h('span'),shN=h('span'),
  lk=h('button',{class:'pill-b','aria-label':'Like',onclick:toggle},h('span',{class:'em'},'👍'),lkN),
  cc=h('button',{class:'pill-b','aria-label':'Comment',onclick:()=>cm.hidden?openCm():cm.hidden=true},ic('chat'),ccN),
  sh=h('button',{class:'pill-b','aria-label':'Share',onclick:share},ic('share'),shN);
 const paint=()=>{sl.textContent=nl?'👍 '+(liked?(nl===1?'You':`You and ${K(nl-1)} other${nl-1>1?'s':''}`):K(nl)):'';sr.textContent=nc?`${K(nc)} comment${nc>1?'s':''}`:'';lkN.textContent=nl?K(nl):'';ccN.textContent=nc?K(nc):'';shN.textContent=ns?K(ns):'';lk.classList.toggle('on',liked)};
 async function toggle(){await ready;if(!me)return toast('Sign in to like.');const r=fb.doc(ref,'likes',me.uid);try{if(liked){await fb.deleteDoc(r);nl--;liked=false}else{await fb.setDoc(r,{at:fb.serverTimestamp()});nl++;liked=true;track('like',p.title)}paint()}catch{toast('Try again.')}}
 async function share(){const url=location.origin+location.pathname+'?p='+p.id;track('share',p.title);try{if(navigator.share)await navigator.share({title:p.title,url});else{await navigator.clipboard.writeText(url);toast('Link copied.')}await ready;if(me){await fb.setDoc(fb.doc(ref,'shares',me.uid),{at:fb.serverTimestamp()});ns++;paint()}}catch{}}
 function openCm(){cm.hidden=false;if(loaded)return;loaded=true;comments(ref,cm,p,n=>{nc=n;paint()})}
 const cnt=c=>fb.getCountFromServer(fb.collection(ref,c)).then(s=>s.data().count).catch(()=>0);
 Promise.all([cnt('likes'),cnt('comments'),cnt('shares'),ready.then(()=>me?fb.getDoc(fb.doc(ref,'likes',me.uid)).then(d=>d.exists()).catch(()=>false):false)]).then(([a,b,c,l])=>{nl=a;nc=b;ns=c;liked=l;paint()});
 if(!full&&long)body.classList.add('clip');
 const el=h('article',{class:'post'},h('div',{class:'ph-head'},h('img',{src:'assets/logo-foods.jpg',alt:''}),h('div',{},h('b',{},'Ruthtech Foods'),h('div',{class:'mut'},ago(p.at)+' · Public'))),h('h2',{},h('a',{href:'blog.html?p='+p.id},p.title)),body,
  !full&&long?h('button',{class:'lnk more',onclick:e=>{body.classList.remove('clip');e.target.remove()}},'See more'):'',
  safeImg(p.cover)?h('img',{class:'pcover',src:safeImg(p.cover),alt:'',loading:'lazy'}):'',h('div',{class:'pstats'},sl,sr),h('div',{class:'pacts'},lk,cc,sh),cm);
 if(full){track('post_view',p.title);document.title=p.title+' | Ruthtech';openCm()}return el}
function comments(ref,box,p,setN){const list=h('div'),rbox={},CL=new Map();let A=[],q=0;
 const sched=()=>{cancelAnimationFrame(q);q=requestAnimationFrame(render)},
  watch=c=>{if(CL.has(c.id))return;CL.set(c.id,{n:0,me:false});fb.onSnapshot(fb.collection(c.ref,'likes'),s=>{CL.set(c.id,{n:s.size,me:!!me&&s.docs.some(x=>x.id===me.uid)});sched()},()=>{})};
 function composer(parent,ph='Write a comment...'){const inp=h('input',{placeholder:ph,maxlength:'500','aria-label':'Comment'}),fl=h('input',{type:'file',accept:'image/*',hidden:''}),pv=h('div',{class:'cprev'});let photo='';
  const sd=h('button',{type:'button','aria-label':'Send',class:'sendb',hidden:'',onclick:send},ic('send')),show=()=>{sd.hidden=!(inp.value.trim()||photo)};
  fl.onchange=async()=>{if(!fl.files[0])return;try{photo=await uploadImg(fl.files[0],'comments');pv.replaceChildren(h('img',{src:photo,alt:''}));show()}catch(x){toast(x.message||'Upload failed.')}fl.value=''};
  async function send(){await ready;if(!me)return toast('Sign in to comment.');const t=inp.value.trim();if(!t&&!photo)return;sd.disabled=true;try{await fb.addDoc(fb.collection(ref,'comments'),{uid:me.uid,name:mine.name||'Customer',text:t,photo,at:fb.serverTimestamp(),...(parent?{parent}:{})});inp.value='';photo='';pv.replaceChildren();show();track('comment',p.title)}catch{toast('Could not post.')}sd.disabled=false}
  inp.oninput=show;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};
  return h('div',{},h('div',{class:'cm1'},av(mine),h('div',{class:'cbox'},inp,sd,h('button',{type:'button','aria-label':'Add a photo',onclick:()=>fl.click()},ic('photo')))),pv,fl)}
 const main=composer(null);box.replaceChildren(list,main);
 const node=(c,top)=>{const st=CL.get(c.id)||{n:0,me:false},tx=h('div',{class:'ctext',onclick:e=>e.currentTarget.classList.add('open')},c.text);
  return h('div',{class:'cm1'},av(c),h('div',{style:'flex:1;min-width:0'},h('div',{class:'cbub'},h('b',{},c.name||'Customer'),c.text?tx:''),safeImg(c.photo)?h('img',{class:'cimg',src:safeImg(c.photo),alt:'',loading:'lazy'}):'',
   h('div',{class:'cmeta'},h('span',{},short(c.at)),h('button',{class:st.me?'on':'',onclick:async()=>{if(!me)return toast('Sign in to like.');const r=fb.doc(c.ref,'likes',me.uid);try{st.me?await fb.deleteDoc(r):await fb.setDoc(r,{at:fb.serverTimestamp()})}catch{toast('Try again.')}}},'Like'),
    h('button',{onclick:()=>{const k=top.id;if(rbox[k]){rbox[k].remove();delete rbox[k]}else rbox[k]=composer(top.id,'Reply to '+(c.name||'comment')+'...');sched()}},'Reply'),
    me&&(c.uid===me.uid||mine.role==='admin')?h('button',{onclick:()=>fb.deleteDoc(c.ref).catch(()=>toast('Not allowed.'))},'Delete'):'',st.n?h('span',{class:'clk'},K(st.n),' 👍'):''),
   c===top&&rbox[top.id]?h('div',{class:'rbx'},rbox[top.id]):''))};
 function render(){setN(A.length);const T=A.filter(c=>!c.parent);list.replaceChildren(...T.map(c=>h('div',{},node(c,c),h('div',{class:'replies'},...A.filter(r=>r.parent===c.id).map(r=>node(r,c))))))}
 ready.then(()=>fb.onSnapshot(fb.query(fb.collection(ref,'comments'),fb.orderBy('at','asc'),fb.limit(300)),s=>{A=s.docs.map(d=>({id:d.id,ref:d.ref,...d.data()}));A.forEach(watch);render()},()=>list.replaceChildren(h('p',{class:'mut'},'Comments could not be loaded.'))))}
if(!live)root.textContent='The blog opens once the store is connected.';
else if(one)fb.getDoc(fb.doc(fb.db,'posts',one)).then(d=>{if(!d.exists())return root.textContent='This post is not available.';root.replaceChildren(h('a',{class:'back',href:'blog.html'},ic('back'),'All posts'),card({id:d.id,...d.data()},true))}).catch(()=>root.textContent='This post is not available.');
else fb.getDocs(fb.query(fb.collection(fb.db,'posts'),fb.where('published','==',true),fb.limit(20))).then(s=>{const L=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at?.seconds||0)-(a.at?.seconds||0));root.replaceChildren(...(L.length?L.map(p=>card(p,false)):[h('p',{class:'mut'},'The first story is coming soon.')]))}).catch(()=>root.textContent='Could not load the blog.');
