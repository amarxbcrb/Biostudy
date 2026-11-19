/* BioCampus — application (v13)
   Principe : « Bonjour » puis « Créer mon espace » (nom, profil, université ou école) ; on arrive ensuite directement
   dans SON université ; « Mon espace » réunit profil, épinglés, récents, partages et déconnexion ;
   « J'ajoute un cours » guide pas à pas (où le ranger, fichier ou lien) ; la barre latérale (PC) garde le contexte.
   API Google Apps Script inchangée : dossiers (?folderId), recherche (action=search), mot de passe (action=verify),
   dépôt (POST), administration (POST action=admin). */
(()=>{'use strict';
const API='https://script.google.com/macros/s/AKfycbx1if1327Xceih5Yr5n67gAGwKuEHygXhlcSHmpRao_cUB0vDrI8Mkuj-IVkTriy6J48w/exec';
const RELAY='/api/campus';   // relais Cloudflare avec cache (functions/api/campus.js) ; Google en secours
const MAX_MB=35,TTL=60000,LS_AGE=6048e5;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const sess={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(e){}}};
const json=(s,d)=>{try{const v=JSON.parse(s);return v==null?d:v}catch(e){return d}};
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
function buzz(p=12){try{if(navigator.vibrate){navigator.vibrate(p);return}if(!IOS)return;
  const l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.setAttribute('switch','');
  l.dataset.hap='';l.style.display='none';l.appendChild(i);document.head.appendChild(l);l.click();l.remove()}catch(e){}}

/* ---------- Icônes (Lucide) ; les clés « préréglages » restent compatibles avec les icônes déjà choisies par l'admin ---------- */
const IC={
 back:'<path d="m15 18-6-6 6-6"/>',chev:'<path d="m9 18 6-6-6-6"/>',up:'<path d="m18 15-6-6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',upload:'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
 folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
 file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
 book:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
 pen:'<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>',
 flask:'<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
 award:'<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
 note:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
 layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
 cap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
 leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
 heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
 zap:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
 activity:'<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
 star:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
 pin:'<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
 lock:'<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
 shieldok:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
 moon:'<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
 menu:'<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>',
 ext:'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
 more:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
 trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
 copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
 user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
 image:'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
 swap:'<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',wifi:'<path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><path d="m2 2 20 20"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',flag:'<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',chart:'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',landmark:'<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',list:'<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',send:'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
 home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
 mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
 video:'<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
 megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
 folderplus:'<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
 fileup:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="m15 15-3-3-3 3"/>',
 grid:'<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
 checkc:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
 move:'<path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"/><path d="M2 13h10"/><path d="m9 16 3-3-3-3"/>',
 sort:'<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>',
 camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',play:'<path d="M6 4.5v15l13-7.5z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 eye:'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>'};
const ic=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]||IC.folder}</svg>`;
const PRESETS=['cap','book','flask','leaf','heart','globe','award','zap','activity','folder','star','shield','mail','calendar','link','video','user','megaphone'];
/* couverture animée choisie par l'admin (image, GIF, vidéo .mp4/.webm, YouTube, Google Drive) :
   segment « m:<lien encodé> » placé à la fin du champ icône (« ic:book;c:blue;m:https%3A… », « drv:…;m:… ») */
const mParse=v=>{const m=String(v||'').match(/(?:^|;)m:([^;]*)$/);if(!m)return'';try{return decodeURIComponent(m[1])}catch(e){return''}};
const mStrip=v=>String(v||'').replace(/(?:^|;)m:[^;]*$/,'');
const ytId=u=>{let x;try{x=new URL(u)}catch(e){return''}const h=x.hostname.replace(/^(www|m)\./,'');
  const id=h==='youtu.be'?x.pathname.slice(1).split('/')[0]:h==='youtube.com'?(x.searchParams.get('v')||(x.pathname.match(/^\/(shorts|embed)\/([\w-]+)/)||[])[2]):'';return /^[\w-]{6,20}$/.test(id||'')?id:''};
const drvId=u=>(String(u).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/)||[])[1]||'';
function mediaOf(u){if(!/^https:\/\/[^\s"'<>]+$/i.test(u||''))return null;const y=ytId(u);if(y)return{t:'img',src:`https://i.ytimg.com/vi/${y}/hqdefault.jpg`};
  const d=drvId(u);if(d)return{t:'img',src:`https://lh3.googleusercontent.com/d/${d}=w1000`};
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)?{t:'vid',src:u}:{t:'img',src:u}}
const mediaHTML=(u,cls='cov',auto=false)=>{const m=mediaOf(u);if(!m)return'';return m.t==='vid'?`<video class="${cls}" src="${esc(m.src)}" muted loop playsinline disablepictureinpicture disableremoteplayback preload="${auto||!STILL?'metadata':'none'}" aria-hidden="true"></video>`
  :`<img class="${cls}" src="${esc(m.src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`};
/* couverture animée rangée dans Google Drive : dossier spécial « MEDIA:<idDossier>#<lien> » placé dans le dossier parent
   (même principe que les accès rapides « BTN: ») ; le script Google refuse tout ajout dans le champ icône */
const isMed=n=>/^MEDIA:/.test(n||'');
const medParse=n=>{const v=String(n).slice(6),k=v.indexOf('#');return k>0?{id:v.slice(0,k),url:v.slice(k+1)}:null};
const medOf=(id,icon)=>(S.dm[id]&&S.dm[id].url)||mParse(icon);
/* fond choisi par l'admin : « verre » = fond coloré en verre (dégradé de la couleur du dossier), sinon lien d'image ou de vidéo */
const isGv=(id,icon)=>medOf(id,icon)==='verre';
const realMed=(id,icon)=>{const u=medOf(id,icon);return u&&u!=='verre'?u:''};
const gvHTML='<span class="cov gen" aria-hidden="true"></span><span class="shade"></span>';
async function saveMedia(id,parent,url){const e=S.dm[id];
  if(e&&e.eid){if(url)await adm('update',{id:e.eid,name:'MEDIA:'+id+'#'+url});else await adm('delete',{id:e.eid})}
  else if(url)await adm('create',{parent,name:'MEDIA:'+id+'#'+url});
  if(url)S.dm[id]={url,eid:e&&e.eid};else delete S.dm[id]}
/* fond plein cadre d'une carte : couverture animée, sinon image choisie comme icône (grande taille) ; rien = icône + couleur */
function coverSrc(id,icon){const mu=medOf(id,icon);if(mu){const m=mediaOf(mu);return m?{u:mu,src:m.src,vid:m.t==='vid'}:null}
  const v=mStrip(icon);if(!isImg(v))return null;return{src:isDrv(v)?`https://lh3.googleusercontent.com/d/${v.slice(4)}=w900`:v,drv:isDrv(v)?v.slice(4):''}}
function coverHTML(id,icon){const c=coverSrc(id,icon);if(!c)return'';
  const sh=`<span class="shade"></span>`;if(c.u)return mediaHTML(c.u,'cov').replace('class="cov"',`class="cov" data-s="${esc(c.src)}"`)+sh;
  return`<img class="cov" data-s="${esc(c.src)}" src="${esc(c.src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"${c.drv?` onerror="this.onerror=null;this.src='https://drive.google.com/thumbnail?id=${esc(c.drv)}&amp;sz=w900'"`:''}>`+sh}
/* sans image : fond coloré doux généré (couleur du dossier) + son icône, sous le même verre que les images */
const genHTML=(icon,ki)=>`<span class="cov gen" aria-hidden="true">${ic(icParse(icon).ic||ki)}</span><span class="shade"></span>`;
/* clarté du bas de l'image : verre clair + texte noir sur une image claire, verre sombre + texte blanc sur une image sombre
   (mémorisée par lien dans bc_lum ; si l'image ne se laisse pas lire, on garde le thème) */
const LUM=json(store.get('bc_lum'),{});
const lumCls=(id,icon)=>{const c=coverSrc(id,icon),v=c&&LUM[c.src];return v==='lt'?' glt':v==='dk'?' gdk':''};
function lumOf(src,vid){return new Promise(ok=>{const done=el=>{try{const cv=document.createElement('canvas');cv.width=cv.height=24;const x=cv.getContext('2d');x.drawImage(el,0,0,24,24);
    const d=x.getImageData(0,10,24,14).data;let t=0;for(let i=0;i<d.length;i+=4)t+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];ok(t/(d.length/4)/255>.58?'lt':'dk')}catch(e){ok('x')}};
  if(vid){const v=document.createElement('video');v.crossOrigin='anonymous';v.muted=true;v.preload='auto';v.onloadeddata=()=>{v.currentTime=Math.min(1,(v.duration||2)/2)};v.onseeked=()=>done(v);v.onerror=()=>ok('x');v.src=src;setTimeout(()=>ok('x'),15000)}
  else{const i=new Image();i.crossOrigin='anonymous';i.referrerPolicy='no-referrer';i.onload=()=>done(i);i.onerror=()=>ok('x');i.src=src}})}
function lumScan(root=document){$$('.hasm .cov[data-s]',root).forEach(c=>{const s=c.dataset.s,host=c.closest('.hasm');if(!host)return;
  const put=v=>{$$('.hasm .cov[data-s]').forEach(e=>{if(e.dataset.s===s){const h=e.closest('.hasm');h.classList.toggle('glt',v==='lt');h.classList.toggle('gdk',v==='dk')}})};
  if(s in LUM){put(LUM[s]);return}if(lumScan.p[s]||c.tagName==='VIDEO'&&(STILL||!c.dataset.p))return;   // vidéo : mesurée une fois vue, jamais en économie de données
  lumScan.p[s]=1;
  lumOf(s,c.tagName==='VIDEO').then(v=>{LUM[s]=v;const k=Object.keys(LUM);if(k.length>200)delete LUM[k[0]];store.set('bc_lum',JSON.stringify(LUM));put(v)})})}
lumScan.p={};
/* vidéos de couverture : toutes lues en même temps (demande de l'utilisateur) ; image fixe (pas de lecture)
   seulement si le téléphone est en économie de données ou en « réduire les animations » */
const STILL=!!(navigator.connection&&navigator.connection.saveData)||matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(prefers-reduced-data: reduce)').matches;
const stillFrame=v=>{v.preload='metadata';const u=v.getAttribute('src')||'';if(!/#t=/.test(u))v.src=u+'#t=0.5'};
const VIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){stillFrame(e.target);VIO.unobserve(e.target)}}),{threshold:.15}):null;
/* vidéos : en pause dès qu'on quitte l'application, l'onglet ou l'écran ; reprise au retour */
function vidAll(play){$$('video.cov').forEach(v=>{if(play&&!STILL&&v.isConnected&&!v.dataset.still){v.muted=true;const p=v.play();p&&p.catch(()=>{})}else if(ANDR&&v.dataset.p&&!v.dataset.still){vDone(v);vidFreeze(v)}else v.pause()})}
document.addEventListener('visibilitychange',()=>vidAll(document.visibilityState==='visible'));
addEventListener('pagehide',()=>vidAll(false));
/* une vidéo qui contient une piste son (même coupée) est affichée par Android comme un lecteur audio (notification,
   panneau « Ce téléphone ») : sur Android elle reste en image fixe ; mémorisé par lien (bc_vaud) pour ne plus la lancer */
const ANDR=/Android/i.test(navigator.userAgent);
const vKey=v=>(v.getAttribute('src')||'').split('#')[0];
/* Android : une vidéo qui tourne en boucle apparaît comme un lecteur multimédia (notifications) tant qu'elle existe.
   Elle est donc lue UNE SEULE FOIS (sans boucle), puis figée sur sa dernière image et le lecteur est fermé :
   la notification disparaît. Déjà lue pendant la visite (VONCE) : image fixe tout de suite. */
const VONCE=new Set(json(sess.get('bc_vonce'),[]));
const vDone=v=>{VONCE.add(vKey(v));sess.set('bc_vonce',JSON.stringify([...VONCE].slice(-100)))};
function vidFreeze(v){try{const c=document.createElement('canvas');c.className=v.className;c.width=v.videoWidth||320;c.height=v.videoHeight||180;c.getContext('2d').drawImage(v,0,0,c.width,c.height);c.setAttribute('aria-hidden','true');v.replaceWith(c)}catch(e){}
  v.pause();v.removeAttribute('src');try{v.load()}catch(e){}}
if('MutationObserver' in window)new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&(n.matches('video.cov')||n.querySelector('video.cov'))){clearTimeout(vidWatch.t);vidWatch.t=setTimeout(()=>vidWatch(),30);return}}).observe(document.documentElement,{childList:true,subtree:true});
function vidWatch(root=document){$$('video.cov',root).forEach(v=>{if(v.dataset.w)return;v.dataset.w='1';
  if(STILL||ANDR&&VONCE.has(vKey(v))){v.dataset.still='1';v.pause();VIO?VIO.observe(v):stillFrame(v);return}
  if(ANDR){v.loop=false;v.removeAttribute('loop');v.addEventListener('ended',()=>{vDone(v);vidFreeze(v)},{once:true})}
  v.muted=true;v.volume=0;const p=v.play();p&&p.catch(()=>{});v.dataset.p='1';lumScan(v.parentElement)})}
const isDrv=v=>/^drv:[\w-]{10,100}$/.test(v||'');   // image rangée dans le dossier Drive (« _icone.png »)
const isImg=v=>{v=mStrip(v);return /^data:image\//.test(v)||isDrv(v)};
const ICON_FILE=/^_ic[oô]ne\.(png|jpe?g|webp)$/i;
/* icône choisie par l'admin : image (data:) ou « ic:nom », avec couleur facultative « ;c:orange » (ou « c:orange » seule) */
const COLS=['blue','cyan','teal','indigo','purple','pink','red','orange','yellow','brown','gray'];
const icParse=v=>{v=mStrip(v);const o={img:'',ic:'',c:''};if(isImg(v)){o.img=v;return o}
  v.split(';').forEach(p=>{if(p.startsWith('ic:')&&IC[p.slice(3)])o.ic=p.slice(3);else if(p.startsWith('c:')&&COLS.includes(p.slice(2)))o.c=p.slice(2)});return o};
const icJoin=(icon,c)=>isImg(icon)?icon:[icon||'',c?'c:'+c:''].filter(Boolean).join(';');
const colOf=(v,d)=>icParse(v).c||d;
const imgSrc=v=>(v=mStrip(v),isDrv(v)?`https://lh3.googleusercontent.com/d/${v.slice(4)}=w240`:v);
const iconHTML=(v,fb)=>(v=mStrip(v),isImg(v))?`<img src="${esc(imgSrc(v))}" alt="" decoding="async" referrerpolicy="no-referrer"${isDrv(v)?` onerror="this.onerror=null;this.src='https://drive.google.com/thumbnail?id=${esc(v.slice(4))}&amp;sz=w240'"`:''}>`:ic(icParse(v).ic||fb);

/* ---------- Couleur et icône d'un dossier selon son nom (cours bleu, TD orange, TP vert, examens rouge…) ---------- */
const KIND=[[/\bcours\b|\bcm\b|amphi/i,'blue','book','Cours'],[/\btds?\b|exercice/i,'orange','pen','TD'],[/\btps?\b|pratique|labo/i,'teal','flask','TP'],
 [/exam|annale|partiel|sujet|contr[oô]le/i,'red','award','Examens'],[/r[ée]sum|fiche|synth[eè]se/i,'purple','note','Résumés'],
 [/^\s*(l|m)\s?\d\b|licence|master|semestre|\bs\d\b|ann[ée]e/i,'indigo','cap','Niveau']];
const kindOf=n=>{for(const[r,c,i,l]of KIND)if(r.test(n))return{c,i,l};return{c:'cyan',i:'folder',l:'Dossier'}};
const UNIC=['blue','orange','pink','purple','indigo','teal','red','brown'];
const uniColor=id=>{let h=0;for(const ch of String(id||''))h=ch.charCodeAt(0)+((h<<5)-h);return UNIC[Math.abs(h)%UNIC.length]};
/* type de fichier */
const FT={pdf:['PDF','red'],word:['DOC','blue'],ppt:['PPT','orange'],xls:['XLS','teal'],img:['IMG','indigo'],zip:['ZIP','yellow'],vid:['VID','pink'],aud:['MP3','purple'],txt:['TXT','gray'],link:['LIEN','indigo'],file:['FICH','gray']};
const EXT={pdf:'pdf',doc:'word',docx:'word',odt:'word',rtf:'word',ppt:'ppt',pptx:'ppt',odp:'ppt',xls:'xls',xlsx:'xls',csv:'xls',ods:'xls',png:'img',jpg:'img',jpeg:'img',gif:'img',webp:'img',heic:'img',svg:'img',zip:'zip',rar:'zip','7z':'zip',mp4:'vid',mov:'vid',mkv:'vid',mp3:'aud',wav:'aud',m4a:'aud',txt:'txt',md:'txt'};
function ftype(f){const ex=s=>{const m=String(s||'').split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i);return m?m[1].toLowerCase():''};
  const e=ex(f.nom)||ex(f.url);if(EXT[e])return FT[EXT[e]];
  if(/docs\.google\.com\/document/.test(f.url))return FT.word;if(/presentation/.test(f.url))return FT.ppt;if(/spreadsheets/.test(f.url))return FT.xls;
  if(/drive\.google\.com|^https?:/.test(f.url||'')&&!e)return /drive\.google/.test(f.url)?FT.file:FT.link;return FT.file}

/* ---------- Logos d'universités : fichiers locaux (UCBL.png…) trouvés par sigle ---------- */
const ALIAS={UCBL:['claude bernard'],UMMTO:['mouloud'],UCA:['clermont auvergne']};
const STOPW=new Set(['de','du','des','la','le','les','d','l','et','of','the','à','au','aux']);
let LOGOS=json(store.get('bc_logos2'),{});const LOGO_URL={},LOGO_P={};
function abbrs(nom){const out=[],add=a=>{a=String(a).toUpperCase().replace(/[^A-Z0-9]/g,'');if(a.length>=2&&a.length<=10&&!out.includes(a))out.push(a)},low=String(nom).toLowerCase();
  (String(nom).match(/\(([A-Za-z0-9\-]{2,10})\)/g)||[]).forEach(m=>add(m.slice(1,-1)));
  for(const k in ALIAS)if(ALIAS[k].some(w=>low.includes(w)))add(k);
  (String(nom).match(/\b[A-Z]{2,8}\b/g)||[]).forEach(add);
  add(String(nom).replace(/[’'()]/g,' ').split(/[\s\-–,\/]+/).filter(x=>x&&!/^\d+$/.test(x)&&!STOPW.has(x.toLowerCase())).map(x=>x[0]).join(''));
  return out.slice(0,4)}
function logoOf(nom){if(nom in LOGO_URL)return Promise.resolve(LOGO_URL[nom]);if(LOGO_P[nom])return LOGO_P[nom];
  const ab=abbrs(nom),key=ab.join('|'),c=LOGOS[key];
  if(c&&(c.u||Date.now()-c.t<864e5))return Promise.resolve(LOGO_URL[nom]=c.u);
  const urls=[];ab.forEach(a=>['png','jpg','webp','svg'].forEach(e=>urls.push(a+'.'+e)));
  return LOGO_P[nom]=Promise.all(urls.map(u=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(u);i.onerror=()=>ok('');i.src=u}))).then(r=>{
    const u=r.find(Boolean)||'';LOGO_URL[nom]=u;LOGOS[key]={u,t:Date.now()};store.set('bc_logos2',JSON.stringify(LOGOS));return u})}
/* pastille d'université : icône choisie par l'admin > logo local > chapeau */
const badge=(f,cls='bd')=>{const m=S.meta[f.id]||{},icon=f.icon||m.icon;
  if(icon&&(isImg(icon)||icParse(icon).ic))return`<span class="${cls}${isImg(icon)?' logo':''}" style="--c:var(--c-${colOf(icon,uniColor(f.id))})">${iconHTML(icon,'landmark')}</span>`;
  const u=LOGO_URL[f.nom];if(u)return`<span class="${cls} logo"><img src="${esc(u)}" alt=""></span>`;
  return`<span class="${cls}" style="--c:var(--c-${uniColor(f.id)})" data-logo="${esc(f.nom)}">${ic('landmark')}</span>`};
function hydrateLogos(root=document){$$('[data-logo]',root).forEach(el=>{const n=el.dataset.logo;el.removeAttribute('data-logo');
  logoOf(n).then(u=>{if(u&&el.isConnected){el.classList.add('logo');el.innerHTML=`<img src="${esc(u)}" alt="">`}})})}

/* ---------- État ---------- */
const S={hist:[],items:[],cache:{},ct:{},pend:{},sc:{},meta:{},tk:Object.assign({},store.get('bc_me')?json(store.get('bc_tkp'),{}):{},json(sess.get('bc_tk'),{})),adm:sess.get('bc_adm')||'',
  favs:json(store.get('bc_favs'),[]),uni:json(store.get('bc_uni'),null),q:'',kind:'all',scope:'uni',searching:false,tok:0,sk:0,lock:null,m:null,mode:'link',quick:false,
  view:'pick',unis:[],rootLinks:[],notice:null,notices:{},nc:0,ord:null,
  me:json(store.get('bc_me'),null),dm:{},onb:0,draft:null,edit:false,uf:''};
if(!Array.isArray(S.favs))S.favs=[];
/* mon espace (sur cet appareil, sans compte) : {name, role, level} ; reprend l'ancien nom seul (bc_name) */
if(!S.me&&store.get('bc_name'))S.me={name:store.get('bc_name').trim(),role:'',level:''};
const saveMe=m=>{S.me=m;store.set('bc_me',JSON.stringify(m));store.set('bc_name',m.name)};
/* envoi du compte (nom, e-mail, profil, niveau, université) après la création ou une modification de l'espace */
/* compte (Code.gs v3.8) : prénom et nom, e-mail facultatif, profil, niveau et université, rangés dans une feuille Google Sheets
   que seul l'admin voit (pas la photo). Envoyé à la création et à chaque changement ; vérifié une fois par jour :
   compte supprimé par l'admin → l'espace est effacé de l'appareil. */
const accId=()=>{let k=store.get('bc_acc');if(!/^[a-z0-9]{12,40}$/i.test(k||'')){k=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(36).padStart(2,'0')).join('').slice(0,20);store.set('bc_acc',k)}return k};
const accFavs=()=>S.favs.slice(0,60).map(f=>({...f,icon:/^data:/.test(f.icon||'')?'':f.icon}));
const accTk=()=>Object.fromEntries(Object.entries(S.tk).slice(-80));
const accPrefs=()=>({tk:accTk(),favs:accFavs(),levelId:(S.me&&S.me.levelId)||'',uniId:S.uni?S.uni.id:'',uniNom:S.uni?S.uni.nom:''});
const accSig=()=>{const m=S.me||{},u=S.uni,ph=m.photo||'';return JSON.stringify([m.name,m.email||'',m.role||'',m.level||'',m.levelId||'',u?u.id:'',ph.length,ph.slice(-24),JSON.stringify(accFavs()),JSON.stringify(accTk())])};
/* photo du compte : réduite à 160 px (≈ 5 à 15 Ko) pour tenir dans la feuille Google */
function tinyPhoto(src){return new Promise(ok=>{if(!/^data:image\//.test(src||''))return ok('');if(src.length<=40000&&/^data:image\/(webp|jpeg|png);/.test(src))return ok(src);
  const i=new Image();i.onload=()=>{const c=document.createElement('canvas'),n=160,m=Math.min(i.width,i.height);c.width=c.height=n;c.getContext('2d').drawImage(i,(i.width-m)/2,(i.height-m)/2,m,m,0,0,n,n);
    for(const q of[.72,.5,.35])for(const t of['image/webp','image/jpeg']){const u=c.toDataURL(t,q);if(u.indexOf('data:'+t)===0&&u.length<=40000)return ok(u)}ok('')};i.onerror=()=>ok('');i.src=src})}
let accBusy=0;
async function syncAcc(){if(!S.me||!S.me.name||accBusy)return;const sig=accSig(),u=S.uni;if(store.get('bc_acc_s')===sig&&!S.newPw)return pingAcc();
  accBusy=1;try{const q={action:'compte',id:accId(),name:S.me.name,email:S.me.email||'',role:S.me.role||'',level:S.me.role==='etu'?S.me.level||'':'',uni:u?u.nom:'',uniId:u?u.id:'',photo:await tinyPhoto(S.me.photo),prefs:accPrefs()};
    if(S.newPw)q.pass=S.newPw;const r=await post(q);
    if(r&&r.success&&r.exists){S.newPw='';store.set('bc_acc_s',sig);store.set('bc_acc_t',String(Date.now()));store.set('bc_acc_m',String(r.maj||Date.now()));if(r.hasPass)store.set('bc_acc_p','1');S.pulled=1;if(r.pwMissing)setTimeout(pwConfirm,1200)}
    else if(r&&r.code==='exists'){S.newPw='';toast(r.error,6000)}}catch(e){}finally{accBusy=0}}
const syncSoon=()=>{clearTimeout(syncSoon.t);syncSoon.t=setTimeout(syncAcc,1500)};
/* profil venu de Google (connexion ou autre appareil) : nom, e-mail, photo, profil, niveau, université, épinglés */
function applyProfile(p){const pr=p.prefs||{};
  S.me={name:p.name,email:p.email||'',role:p.role||'',level:p.level||'',levelId:pr.levelId||'',uniId:pr.uniId||p.uniId||''};if(p.photo)S.me.photo=p.photo;
  store.set('bc_me',JSON.stringify(S.me));store.set('bc_name',p.name);
  const uid=pr.uniId||p.uniId,un=pr.uniNom||p.uni;if(uid&&un){S.uni={id:uid,nom:un,locked:false};store.set('bc_uni',JSON.stringify(S.uni))}
  if(Array.isArray(pr.favs)){S.favs=pr.favs;store.set('bc_favs',JSON.stringify(S.favs))}
  if(pr.tk&&typeof pr.tk==='object'){Object.assign(S.tk,pr.tk);saveTk(false)}
  store.set('bc_acc',p.id);store.set('bc_acc_m',String(p.maj||Date.now()));if(p.hasPass)store.set('bc_acc_p','1');store.set('bc_acc_s',accSig());store.set('bc_acc_t',String(Date.now()));store.set('bc_counted','1')}
/* compte créé avant que l'admin puisse voir les mots de passe : on demande une fois de le confirmer (vérifié par Google) */
async function pwConfirm(){if(!S.me||!S.me.email||sess.get('bc_pwask')||$('#ov').classList.contains('on'))return;sess.set('bc_pwask','1');
  const i=$('#prIn');for(let k=0;k<3;k++){i.type='password';i.autocomplete='current-password';
    const r=await promptDlg('Confirmez votre mot de passe',`Pour garder votre compte (${S.me.email}) sur tous vos appareils, saisissez une fois votre mot de passe BioCampus.`,'','Confirmer','lock');
    i.type='text';i.autocomplete='off';if(!r||!r.v)return;
    try{const x=await post({action:'compte',op:'login',email:S.me.email,pass:r.v});if(x&&x.success){buzz([12,60,18]);return toast('Merci, c\'est enregistré ✓')}
      toast(x&&x.error?x.error:'Mot de passe incorrect',3500)}catch(e){return toast(NET)}}
  toast('Mot de passe oublié ? Demandez-en un nouveau à l\'administrateur',5000)}
/* au démarrage : compte avec mot de passe → on récupère les changements faits sur un autre appareil ; sinon vérification une fois par jour */
function pingAcc(){if(!S.me||!store.get('bc_acc_s')||S.pulled)return;const full=!!store.get('bc_acc_p');if(!full&&Date.now()-(+store.get('bc_acc_t')||0)<864e5)return;S.pulled=1;
  post({action:'compte',op:'ping',id:accId(),full:full?1:0}).then(r=>{if(!r||!r.success)return;store.set('bc_acc_t',String(Date.now()));
    if(r.exists===false){wipe();go('welcome');setTimeout(()=>toast('Votre compte a été supprimé : créez un nouvel espace pour continuer.',4500),300);return}
    const p=r.profile;if(p&&p.pwMissing)setTimeout(pwConfirm,1200);
    if(p&&p.maj>(+store.get('bc_acc_m')||0)&&store.get('bc_acc_s')===accSig()){applyProfile(p);if(S.view==='me')renderMe();else if(S.view==='folder'&&S.hist.length<=2)goHome()}}).catch(()=>{})}
function countSpace(){syncAcc()}
const first=()=>S.me&&S.me.name?S.me.name.trim().split(/\s+/)[0]:'';
const initials=n=>String(n||'').trim().split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
const ROLES=[['etu','Étudiant ou étudiante','cap','blue'],['ens','Enseignant ou enseignante','book','orange'],['tech','Technicien ou technicienne de laboratoire','flask','teal'],['rech','Chercheur ou chercheuse','activity','purple'],['autre','Autre','user','gray']];
const LEVELS=['L1','L2','L3','M1','M2','Doctorat','BTS / BUT','Autre'];
const avHTML=m=>m&&/^data:image\//.test(m.photo||'')?`<img src="${esc(m.photo)}" alt="">`:(m&&initials(m.name)?esc(initials(m.name)):ic('user'));
const roleTxt=m=>{if(!m)return'';const r=ROLES.find(x=>x[0]===m.role);return[r?r[1].split(' ou ')[0]:'',m.role==='etu'&&m.level?m.level:''].filter(Boolean).join(' · ')};
const saveTk=(sync=true)=>{sess.set('bc_tk',JSON.stringify(S.tk));if(S.me){store.set('bc_tkp',JSON.stringify(S.tk));if(sync&&typeof syncSoon==='function')syncSoon()}};
const saveFavs=()=>{store.set('bc_favs',JSON.stringify(S.favs));if(typeof syncSoon==='function'&&S.me)syncSoon()};
const cur=()=>S.hist[S.hist.length-1]||null;
/* université où l'on se trouve (sinon celle choisie) : sert à limiter la recherche */
const here=()=>S.view==='folder'&&S.hist[0]?S.hist[0]:S.uni;
const tiny=n=>{const m=String(n||'').match(/\(([^)]{2,10})\)\s*$/);return m?m[1].trim():short(n)};   // sigle (UCBL) pour les chemins
const short=n=>String(n||'').replace(/\s*\(([^)]*)\)\s*$/,(m,a)=>a.length<=10?'':m).trim()||n;
const isUni=i=>i.type==='folder'&&!/^(NOTE|MSG|BTN|MEDIA):/.test(i.nom);
const lockedFor=f=>!!f.locked&&!S.tk[f.id]&&!S.adm;
const isNet=e=>e&&(e.message==='http'||e.name==='TypeError');
const NET='Connexion impossible. Vérifiez votre réseau.';

/* ---------- API ---------- */
async function api(p){const q=new URLSearchParams(p),tk=Object.values(S.tk).join(',');if(tk)q.set('tk',tk);if(S.adm)q.set('adm',S.adm);
  if(Date.now()<S.nc)q.set('nc','1');   // juste après une modification : relire Google, pas le cache
  try{const r=await fetch(RELAY+'?'+q);if(r.ok&&/json/.test(r.headers.get('content-type')||''))return await r.json()}catch(e){}
  q.delete('nc');const r=await fetch(API+'?'+q);if(!r.ok)throw new Error('http');return r.json()}
async function post(o){const r=await fetch(API,{method:'POST',body:JSON.stringify(o)});if(!r.ok)throw new Error('http');return r.json()}
async function adm(op,p={}){const r=await post({action:'admin',op,token:S.adm,...p});
  if(r&&r.code==='auth'){setAdmin('');throw new Error('Session expirée. Reconnectez-vous.')}
  if(!r||!r.success)throw new Error((r&&r.error)||'Action impossible');return r}
/* image d'icône d'un dossier : rangée dans le dossier Drive (« _icone.* », Code.gs v3.1) */
async function iconUp(id,data){try{return await adm('iconup',{id,data})}
  catch(e){throw /inconnue/i.test(e.message)?new Error('Mettez à jour le script Google (Code.gs v3.1) pour envoyer des images'):e}}
const remember=items=>(items||[]).forEach(i=>{if(!i||!i.id)return;if(i.members)S.mbs.add(i.id);S.meta[i.id]={icon:i.icon||'',desc:i.desc||''};
  if(i.type==='folder'&&isMed(i.nom)){const m=medParse(i.nom);if(m)S.dm[m.id]={url:m.url,eid:i.id}}});
const sig=r=>JSON.stringify([(r&&r.data||[]).map(i=>[i.id,i.nom,i.url||'',i.locked?1:0,i.icon||'',i.desc||'',i.featured?1:0,i.hidden?1:0,i.order||0]),r&&(r.notices||r.notice)]);
function readLS(key){if(S.adm)return null;const o=json(store.get('bc_c_'+key),null);if(o&&o.r&&Date.now()-o.t<LS_AGE){S.ct[key]=o.t;remember(o.r.data);return o.r}return null}
function persist(key,r){if(!Object.keys(S.tk).length&&!S.adm)store.set('bc_c_'+key,JSON.stringify({t:Date.now(),r}))}
const fresh=k=>!!S.cache[k]&&Date.now()-(S.ct[k]||0)<TTL;
function fetchFolder(id){const key=id||'root';if(S.pend[key])return S.pend[key];
  return S.pend[key]=api(id?{folderId:id}:{}).then(r=>{if(!r.success)throw new Error(r.error||'Erreur de chargement');
    S.cache[key]=r;S.ct[key]=Date.now();remember(r.data);persist(key,r);setNotices(r);return r}).finally(()=>{delete S.pend[key]})}
function invalidate(){S.nc=Date.now()+120000;S.cache={};S.dm={};S.ct={};S.sc={};for(const k in TREE)delete TREE[k];try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&(k.indexOf('bc_c_')===0||k.indexOf('bc_t_')===0))localStorage.removeItem(k)}}catch(e){}}
/* arbre complet d'une université (action=tree, Code.gs v3) : tous ses dossiers d'un coup → navigation instantanée */
const TREE={};
function useTree(r,t){if(!r||!r.success||!r.folders)return false;
  for(const id in r.folders){if(S.ct[id]>t&&S.cache[id])continue;S.cache[id]={success:true,data:r.folders[id],notices:r.notices,notice:r.notice};S.ct[id]=t;remember(r.folders[id])}
  setNotices(r);return true}
function loadTree(uni){if(!uni||S.pend['tr'+uni]||TREE[uni]&&Date.now()-TREE[uni]<TTL)return;
  const priv=S.adm||Object.keys(S.tk).length;
  if(!TREE[uni]&&!priv){const o=json(store.get('bc_t_'+uni),null);if(o&&o.r&&Date.now()-o.t<LS_AGE&&useTree(o.r,o.t))TREE[uni]=1}   // copie locale : affichage immédiat, vérifiée ensuite
  S.pend['tr'+uni]=api({action:'tree',root:uni}).then(r=>{const t=Date.now();if(!useTree(r,t))return;TREE[uni]=t;
    if(!priv)try{const s=JSON.stringify({t,r});if(s.length<15e5)store.set('bc_t_'+uni,s)}catch(e){}
    const c=cur();if(S.view==='folder'&&c&&S.hist[0]&&S.hist[0].id===uni&&!S.searching&&r.folders[c.id]&&sig({data:r.folders[c.id]})!==sig({data:S.items})){S.items=r.folders[c.id];render()}})
   .catch(()=>{}).finally(()=>{delete S.pend['tr'+uni]})}
/* copie locale immédiate, puis mise à jour silencieuse */
async function getFolder(id,onUpdate){const key=id||'root',hit=S.cache[key]||readLS(key);
  if(hit){S.cache[key]=hit;setNotices(hit);if(!fresh(key))fetchFolder(id).then(r=>{if(sig(r)!==sig(hit))onUpdate&&onUpdate(r)}).catch(()=>{});return hit}
  return fetchFolder(id)}
/* racine : universités, accès rapides communs, annonce générale */
function useRoot(r){const d=r.data||[];S.unis=d.filter(isUni).sort(byName);S.rootLinks=d.filter(i=>i.nom.startsWith('BTN:'))}

/* ---------- Navigation : 3 onglets (Accueil, Mon espace, Infos) + Admin, dossiers, avec l'historique du navigateur ---------- */
const TABV={folder:0,pick:0,welcome:0,me:1,pins:1,info:2,admin:3};
const DESK=matchMedia('(min-width:1024px)');
function go(view,hist=[],push=true){selEnd();if(view!=='welcome')S.lastOnb=null;if(view==='pins')view='me';if(view==='pick'){view='welcome';S.onb=3}S.view=view;S.hist=hist;S.sOpen=false;ctxClose();
  if(push)history.pushState({v:view,h:hist,o:S.onb},'');clearSearch(true);load()}
const navTo=hist=>go('folder',hist);
function goHome(){if(!S.uni||lockedFor(S.uni)){S.onb=S.me?3:0;go('welcome');return}const u={id:S.uni.id,nom:S.uni.nom},m=S.me;
  navTo(m&&m.levelId&&m.uniId===u.id?[u,{id:m.levelId,nom:m.level}]:[u])}
function openUni(u){if(lockedFor(u)){askPass(u,()=>openUni(u));return}
  S.uni={id:u.id,nom:u.nom,locked:!!u.locked};store.set('bc_uni',JSON.stringify(S.uni));
  const made=S.draft&&S.draft.name;if(made){const d=S.draft;saveMe({name:d.name,email:d.email||'',photo:d.photo,role:d.role||'',level:d.level||'',levelId:'',uniId:u.id});S.draft=null;countSpace()}   // fin de « Créer mon espace »
  closeSheet();buzz(made?[12,60,18]:12);navTo([{id:u.id,nom:u.nom}]);if(made)setTimeout(()=>toast('Votre espace est prêt'),300)}
/* « Créer mon espace » (et « Modifier ») : une question à la fois dans la vue d'accueil */
function startOnb(step=1,edit=false){S.edit=edit;S.draft=edit||!S.me?{...(S.me||{name:'',role:'',level:''})}:null;S.onb=step;buzz();go('welcome')}
function openFolder(f){if(lockedFor(f)){askPass(f,()=>openFolder(f));return}buzz(8);navTo([...S.hist,{id:f.id,nom:f.nom}])}
function jump(i){i<0?(S.onb=3,go('welcome')):navTo(S.hist.slice(0,i+1))}
function goBack(){if(S.searching||S.q||S.sOpen){closeSearch();return}if(history.state&&history.state.v)history.back();else jump(S.hist.length-2)}
addEventListener('popstate',e=>{const st=e.state||{};S.view=st.v||'folder';S.hist=st.h||[];S.sOpen=false;ctxClose();
  if(S.view==='pins')S.view='me';if(S.view==='pick'||S.view==='folder'&&!S.hist.length){S.view='welcome';S.onb=st.o!=null?st.o:3}else if(S.view==='welcome')S.onb=st.o||0;clearSearch(true);load()});
async function load(){const t=++S.tok,v=S.view;
  if(v==='folder'&&S.hist.length>1){store.set('bc_last',JSON.stringify(S.hist));   // capsule « Reprendre » + récents (Mon espace)
    const id=S.hist[S.hist.length-1].id,rec=json(store.get('bc_recent'),[]).filter(r=>Array.isArray(r)&&r.length&&r[r.length-1].id!==id);
    rec.unshift(S.hist);store.set('bc_recent',JSON.stringify(rec.slice(0,8)))}
  syncChrome();
  if(v==='folder'&&S.hist[0])loadTree(S.hist[0].id);
  if(v==='info'||v==='me'||v==='admin'||v==='welcome'&&(S.onb<3||S.onb===5)){render();if(v==='admin')fillAdmin();scrollTo({top:0});getFolder(null).then(useRoot).catch(()=>{});return}
  const c=v==='folder'?cur():null;$('#phead').innerHTML='';$('#view').innerHTML=loadHTML(c?`Ouverture de ${c.nom}`:'Chargement');
  try{const r=await getFolder(c&&c.id,nr=>{if(t===S.tok&&!S.searching){S.items=nr.data||[];if(!c)useRoot(nr);render()}});if(t!==S.tok)return;
    S.items=r.data||[];if(!c)useRoot(r);render();scrollTo({top:0})}
  catch(e){if(t!==S.tok)return;
    if(!isNet(e)&&/protégé/i.test(e.message||'')){const lk=[...S.hist].reverse().find(h=>S.tk[h.id]);if(lk){delete S.tk[lk.id];saveTk();toast('Le mot de passe de ce dossier a changé',3500);askPass(lk,load);return}}
    if(!isNet(e)&&S.me&&S.me.levelId&&S.hist.length===2&&S.hist[1].id===S.me.levelId){saveMe({...S.me,levelId:''});navTo([S.hist[0]]);return}   // niveau supprimé
    fail(isNet(e)?NET:e.message,load)}
  if(c)getFolder(null).then(r=>{useRoot(r);if(t===S.tok&&S.hist.length<=2&&!S.searching)renderFolder();renderSide()}).catch(()=>{})}

/* ---------- Rendu : grands titres, cartes en dégradé, tuiles carrées, listes à filets fins (façon iOS) ---------- */
const empty=(t,s='',k='folder',x='')=>`<div class="empty">${ic(k)}<p>${t}</p>${s?`<small>${s}</small>`:''}${x}</div>`;
function fail(m,retry){S.retry=retry;$('#view').innerHTML=empty(esc(m),'','wifi','<button class="btn pri" data-a="retry">Réessayer</button>')}
const vmBtn=()=>`<button class="ghb vmb" type="button" data-a="vm" aria-label="${S.vm==='grid'?'Afficher en liste':'Afficher en icônes'}">${ic(S.vm==='grid'?'list':'grid')}${S.vm==='grid'?'Liste':'Icônes'}</button>`;
const sec=(t,n,x='')=>`<h2 class="sec">${t}${n!=null?`<em>${n}</em>`:''}${x}</h2>`;
const gh=(t,n)=>sec(t,n);
const gear=f=>S.adm&&f.id?`<button class="more" type="button" data-a="manage" data-id="${esc(f.id)}" data-nom="${esc(f.nom)}" data-t="${f.type||'folder'}" aria-label="Gérer">${ic('more')}</button>`:'';
const flags=f=>(f.featured?`<span class="star" title="Mis en avant">${ic('star')}</span>`:'')+(f.hidden?'<span class="hid">Masqué</span>':'')+(f.members&&S.adm?'<span class="hid mbr">Membres</span>':'');
const dataF=f=>`data-id="${esc(f.id)}" data-nom="${esc(f.nom)}" data-lk="${f.locked?1:''}"`;
const lockIc=f=>f.locked&&!S.tk[f.id];
function fmtDate(d){if(!d)return'';const s=String(d);if(/^\d{4}-\d{2}-\d{2}/.test(s)){const x=new Date(s);if(!isNaN(x))return x.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}return s}
/* pochette d'un dossier : couleur et icône selon son nom, ou icône / image choisie par l'admin */
function artHTML(f,cls){const k=kindOf(f.nom),icon=f.icon||(S.meta[f.id]||{}).icon,mu=cls!=='art'&&realMed(f.id,icon);
  return`<span class="${cls}${isImg(icon)?' img':''}${mu?' med':''}" style="--c:var(--c-${colOf(icon,k.c)})">${icon?iconHTML(icon,k.i):ic(k.i)}${mu?mediaHTML(mu,'cov'):''}</span>`}
function folderRow(f,n,showUni){const k=kindOf(f.nom),desc=f.desc||(S.meta[f.id]||{}).desc;
  return`<div class="row st${f.hidden?' dim':''}" data-sid="${esc(f.id)}" data-drop="${esc(f.id)}" data-dn="${esc(f.nom)}" style="--i:${Math.min(n,12)}"><span class="sck">${ic('check')}</span><button class="rb" type="button" data-a="folder" ${dataF(f)}>${artHTML(f,'art')}
<span class="rt"><b>${esc(f.nom)}${flags(f)}</b><small>${esc(showUni&&f.uni||desc||k.l)}</small></span>${lockIc(f)?`<span class="lk">${ic('lock')}</span>`:''}<span class="cv">${ic('chev')}</span></button>${gear(f)}</div>`}
/* documents : pochette du type de fichier, « … » ouvre le menu (ouvrir, copier, envoyer, gérer) */
const FILES={};
function fileRow(f,n,showUni){const[t,c]=ftype(f),key=String(f.id||f.url||f.nom),meta=[];FILES[key]=f;
  if(showUni&&f.uni)meta.push(esc(f.uni));if(f.by)meta.push(esc(f.by));const d=fmtDate(f.date);if(d)meta.push(esc(d));if(f.size)meta.push(esc(f.size));
  return`<div class="row st${f.hidden?' dim':''}"${f.id?` data-sid="${esc(f.id)}"`:''} style="--i:${Math.min(n,12)}"><span class="sck">${ic('check')}</span><button class="rb" type="button" data-a="file" data-url="${esc(f.url||'')}">
<span class="fart" style="--c:var(--c-${c})">${t}</span><span class="rt"><b>${esc(f.nom)}${flags(f)}</b>${f.desc?`<small>${esc(f.desc)}</small>`:''}${meta.length?`<small class="mt">${meta.join(' · ')}</small>`:''}</span></button><button class="more" type="button" data-a="fctx" data-k="${esc(key)}" aria-label="Options du document">${ic('more')}</button></div>`}
function docTile(f,n){const[t,c]=ftype(f),key=String(f.id||f.url||f.nom);FILES[key]=f;const d=fmtDate(f.date);
  return`<div class="dt st${f.hidden?' dim':''}"${f.id?` data-sid="${esc(f.id)}"`:''} style="--i:${Math.min(n,12)};--c:var(--c-${c})"><span class="sck">${ic('check')}</span><button class="dtb" type="button" data-a="file" data-url="${esc(f.url||'')}"><span class="dtp">${t}</span><b>${esc(f.nom)}</b><small>${esc([d,f.size].filter(Boolean).join(' · '))}</small></button><button class="more" type="button" data-a="fctx" data-k="${esc(key)}" aria-label="Options du document">${ic('more')}</button></div>`}
const noteHTML=f=>{const p=f.nom.slice(f.nom.indexOf(':')+1).split('#');return`<div class="alert st${f.hidden?' dim':''}"><b>${esc(p[0])}</b><span>${esc(p[1]||'')}</span>${gear(f)}</div>`};
/* carte en dégradé (niveaux d'une université) */
function cardHTML(f,n){const k=kindOf(f.nom),m=S.meta[f.id]||{},desc=f.desc||m.desc,icon=f.icon||m.icon,real=coverHTML(f.id,icon),gv=!real&&isGv(f.id,icon),cov=real||(gv?gvHTML:'')+`<span class="cico${isImg(icon)?' img':''}">${icon?iconHTML(icon,k.i):ic(k.i)}</span>`;
  return`<div class="card st${f.hidden?' dim':''} hasm${real?lumCls(f.id,icon):gv?' gv':' gn'}" style="--i:${n};--c:var(--c-${colOf(icon,k.c)})"><button class="cbtn" type="button" data-a="folder" ${dataF(f)}>${cov}
<small>${lockIc(f)?ic('lock'):''}${k.l}</small><b>${esc(f.nom)}${flags(f)}</b><span class="cd">${esc(desc||(k.l==='Niveau'?'Cours, TD, TP et examens':''))}</span><span class="cgo">${ic('chev')}</span></button>${gear(f)}</div>`}
/* carte de sous-dossier : teinte de sa couleur, pastille, nom, contenu (connu grâce à l'arbre chargé) */
function fcardHTML(f,n){const k=kindOf(f.nom),m=S.meta[f.id]||{},icon=f.icon||m.icon,real=coverHTML(f.id,icon),gv=!real&&isGv(f.id,icon),cov=real||genHTML(icon,k.i),r=S.cache[f.id];
  let sub=f.desc||m.desc||'';if(!sub&&r){const o=split(r.data||[]),a=o.folders.length,b=o.files.length;sub=[a?`${a} dossier${a>1?'s':''}`:'',b?`${b} document${b>1?'s':''}`:''].filter(Boolean).join(' · ')||'Vide pour l\'instant'}
  if(!sub&&k.l!=='Dossier')sub=k.l;
  return`<div class="fc st${f.hidden?' dim':''} hasm${real?lumCls(f.id,icon):gv?' gv':' gn'}" data-sid="${esc(f.id)}" data-drop="${esc(f.id)}" data-dn="${esc(f.nom)}" style="--i:${Math.min(n,12)};--c:var(--c-${colOf(icon,k.c)})"><span class="sck">${ic('check')}</span><button class="fcb" type="button" data-a="folder" ${dataF(f)}>${cov||
`<span class="fci">${icon?iconHTML(icon,k.i):ic(k.i)}</span>`}<b>${esc(f.nom)}${flags(f)}</b>${sub?`<small>${esc(sub)}</small>`:''}${lockIc(f)?`<span class="tlk">${ic('lock')}</span>`:''}</button>${gear(f)}</div>`}
/* carte d'un dossier épinglé (Mon espace, accueil) : même style que les sous-dossiers, chemin en sous-titre */
function pinCardHTML(f,n,rm){const k=kindOf(f.nom),icon=f.icon||(S.meta[f.id]||{}).icon,real=coverHTML(f.id,icon),gv=!real&&isGv(f.id,icon),cov=real||genHTML(icon,k.i),path=(f.path||[]).map((h,i)=>i?h.nom:tiny(h.nom)).join(' › ');
  return`<div class="fc pc st hasm${real?lumCls(f.id,icon):gv?' gv':' gn'}" style="--i:${Math.min(n,12)};--c:var(--c-${colOf(icon,k.c)})"><button class="fcb" type="button" data-a="pinopen" data-id="${esc(f.id)}">${cov||`<span class="fci">${icon?iconHTML(icon,k.i):ic(k.i)}</span>`}
<span class="pcp">${ic('pin')}</span><b>${esc(f.nom)}</b>${path?`<small>${esc(path)}</small>`:''}</button>${rm?`<button class="more" type="button" data-a="unpin" data-id="${esc(f.id)}" aria-label="Retirer des épinglés">${ic('x')}</button>`:''}</div>`}
/* accès rapides (boutons « BTN:texte#lien ») : lignes façon Réglages, épingle, ordre choisi par l'admin */
const QAC=['blue','indigo','orange','pink','teal','purple','red','brown'];
/* own = accès rapides de ce dossier que l'admin peut réordonner ; title = en-tête de la section */
function qaHTML(list,own,title='Accès rapides'){if(!list.length)return'';
  S.ord=own&&S.adm&&own.items.length>1?own:null;
  return sec(title,null,S.ord?`<button class="ghb" type="button" data-a="order">${ic('layers')}Organiser</button>`:'')+`<div class="list q">${list.map((f,i)=>{const p=f.nom.slice(4).split('#'),icon=f.icon||(S.meta[f.id]||{}).icon,on=S.favs.some(x=>x.id===f.id);
    return`<div class="row st${f.hidden?' dim':''}" style="--i:${i};--c:var(--c-${colOf(icon,QAC[i%QAC.length])})"><a class="rb" href="${esc(p[1]||'#')}" target="_blank" rel="noopener"><span class="gly">${icon?iconHTML(icon,'link'):ic(/mail|messag/i.test(p[0])?'mail':'link')}</span><span class="rt"><b>${esc(p[0])}</b></span><span class="cv">${ic('ext')}</span></a>
<button class="qp${on?' on':''}" type="button" data-a="pinbtn" data-id="${esc(f.id)}" aria-pressed="${on}" aria-label="${on?'Retirer des épinglés':'Épingler ce bouton'}">${ic('pin')}</button>${gear(f)}</div>`}).join('')}</div>`}
/* ordre choisi par l'admin (order), sinon alphabétique */
const byOrder=l=>[...l].sort((a,b)=>(a.order||1e4)-(b.order||1e4)||byName(a,b));
/* dossiers réservés aux membres : cachés aux visiteurs (pas d'espace créé) ; l'admin les voit avec une pastille */
const VISITOR=()=>!S.me&&!S.adm;
S.mbs=new Set();
function split(items){const o={notes:[],links:[],folders:[],files:[]};
  items.forEach(i=>{if(i.members&&VISITOR())return;if(i.type==='file'){if(!ICON_FILE.test(i.nom||''))o.files.push(i)}else if(/^(NOTE|MSG):/.test(i.nom))o.notes.push(i);else if(isMed(i.nom))return;else if(i.nom.startsWith('BTN:'))o.links.push(i);else o.folders.push(i)});return o}
const byName=(a,b)=>(b.featured?1:0)-(a.featured?1:0)||String(a.nom).localeCompare(String(b.nom),'fr',{numeric:true,sensitivity:'base'});
function render(){if(S.searching)return;
  $('#view').hidden=S.view==='info'||S.view==='admin';$('#infoView').hidden=S.view!=='info';$('#admView').hidden=S.view!=='admin';
  ({pick:renderWelcome,welcome:renderWelcome,folder:renderFolder,pins:renderMe,me:renderMe,info:renderInfo,admin:()=>head('Admin','Statistiques, signalements, dépôts, annonces et accès rapides.')})[S.view]();renderSide();hydrateLogos();lumScan();vidWatch()}
function head(t,p,x=''){$('#phead').innerHTML=`<div class="lt"><div class="ltt"><h1>${t}</h1></div>${x}</div>${p?`<p class="lsub">${p}</p>`:''}`}
const moreBtn=(sm='')=>`<button class="rbtn${sm}" type="button" data-a="ctx" aria-label="Plus d'options">${ic('more')}</button>`;
/* ---------- Accueil sans université : « Bonjour », Créer mon espace (nom, profil), puis université ou école ---------- */
const helloHTML=()=>`<div class="hello"><div class="hl"><small>${esc(today())}</small><h1>${hello()}${first()?' '+esc(first()):''}</h1></div><button class="avb" type="button" data-a="me" aria-label="Mon espace">${avHTML(S.me)}</button></div>`;
const today=()=>{const t=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});return t.charAt(0).toUpperCase()+t.slice(1)};
const hello=()=>{const h=new Date().getHours();return h>=18||h<5?'Bonsoir':'Bonjour'};
const TYC={Cours:'blue',TD:'orange',TP:'teal',Examen:'red','Résumé':'purple'};
const recents=()=>json(store.get('bc_recent'),[]).filter(r=>Array.isArray(r)&&r.length);
const feat=(c,i,t,s)=>`<div class="row"><span class="bd" style="--c:var(--c-${c})">${ic(i)}</span><span class="rb" style="pointer-events:none"><span class="rt"><b>${t}</b><small>${s}</small></span></span></div>`;
const ONUM={1:1,3:2,2:3};
const onbPos=st=>S.edit?(st===1?1:2):ONUM[st]||1;
function onbHead(st){const n=S.edit?2:3,pos=onbPos(st);
  return`<div class="onh"><button class="rbtn sm" type="button" data-a="onbback" aria-label="Retour">${ic('back')}</button><div class="dots" aria-hidden="true">${Array.from({length:n},(_,k)=>`<i${k<pos?' class="on"':''}></i>`).join('')}</div><span></span></div>`}
/* niveaux proposés = dossiers de l'université choisie (sinon liste usuelle) */
function onbLevels(){const u=(S.draft&&S.draft.uni)||S.uni;if(!u)return LEVELS.slice(0,-1).map(l=>({nom:l}));const r=S.cache[u.id];
  if(!r&&!(S.lvx||{})[u.id]){if(!S.lvw){S.lvw=1;const done=()=>{S.lvw=0;if(S.view==='welcome'&&S.onb===2)renderWelcome()};
      Promise.race([Promise.resolve(S.pend[u.id]||getFolder(u.id)),new Promise((_,ko)=>setTimeout(ko,8000))]).then(done,()=>{(S.lvx=S.lvx||{})[u.id]=1;done()})}return null}
  if(!r)return LEVELS.slice(0,-1).map(x=>({nom:x}));
  const l=(r.data||[]).filter(i=>isUni(i)&&!i.hidden).sort(byName).map(f=>({id:f.id,nom:f.nom}));return l.length?l:LEVELS.slice(0,-1).map(x=>({nom:x}))}
/* chargement : petite roue façon iOS + texte, puis la forme de la page (bandeau, dossiers, documents) qui scintille */
function loadHTML(t,search){const sp=`<span class="spin" aria-hidden="true">${'<i></i>'.repeat(8)}</span>`;
  return`<div class="ld" role="status" aria-live="polite"><div class="ldh">${sp}<span>${esc(t)}…</span></div>${search?'':'<div class="sk skh"></div>'}
<div class="skg">${'<div class="sk skc"></div>'.repeat(search?0:4)}</div><div class="skl">${'<div class="sk skr"><i></i><b></b></div>'.repeat(search?5:3)}</div></div>`}
const rfield=(id,i,type,ph,val,ac,eye)=>`<label class="rf"><span class="rfi">${ic(i)}</span><input id="${id}" type="${type}" placeholder="${ph}" value="${esc(val||'')}" autocomplete="${ac}"${type==='email'?' inputmode="email" autocapitalize="off" spellcheck="false"':''} maxlength="${type==='password'?80:type==='email'?120:60}">${eye?`<button type="button" class="rfe" data-a="pweye" data-for="${id}" aria-label="Afficher le mot de passe">${ic('eye')}</button>`:''}</label>`;
/* créer mon espace depuis l'accueil : nom, e-mail, mot de passe, règles acceptées, puis université et niveau */
function regNext(){const n=$('#rgName'),m=$('#rgMail'),w=$('#rgPw'),ok=$('#rgOk'),bad=(el,t)=>{el.closest('.rf').classList.add('bad');el.focus();toast(t)};
  $$('#view .rf.bad').forEach(x=>x.classList.remove('bad'));
  const name=n.value.replace(/\s+/g,' ').trim(),em=m.value.trim(),pw=w.value;
  if(name.length<2)return bad(n,'Indiquez votre prénom et nom');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return bad(m,em?'E-mail invalide':'Indiquez votre e-mail');
  if(pw.length<6)return bad(w,'Mot de passe : 6 caractères minimum');
  if(!ok.checked){buzz([30,40,30]);return toast('Acceptez les règles de BioCampus pour continuer')}
  S.draft={...(S.draft||{}),name:name.slice(0,60),email:em.slice(0,120),ok:1,role:(S.draft||{}).role||'',level:(S.draft||{}).level||''};S.newPw=pw;S.edit=false;S.onbDir=1;buzz(8);
  if(S.uni){S.draft.uni={id:S.uni.id,nom:S.uni.nom,locked:!!S.uni.locked};S.onb=2}else S.onb=3;go('welcome')}
function renderWelcome(){const ae=document.activeElement;
  if(S.view==='welcome'&&S.lastOnb===S.onb&&!S.onbDir&&ae&&ae.matches&&ae.matches('#view input')&&$('#view').contains(ae))return;   // clavier ouvert : on ne redessine pas (il se fermait)
  if((S.onb===1||S.onb===2)&&!S.draft)S.draft={...(S.me||{name:'',role:'',level:''})};   // retour arrière du navigateur
  const st=S.onb,dr=S.draft;$('#phead').innerHTML='';const v=$('#view'),dir=!S.onbDir&&S.lastOnb===st?' still':S.onbDir<0?' bw':' fw';S.onbDir=0;S.lastOnb=st;
  if(st===0){const d=dr||{};v.innerHTML=`<section class="reg${dir}">
<div class="rhero"><small class="wk">${esc(today())}</small><h1 class="wh">${hello()}</h1>
<p class="wp">Créez votre espace : les cours, TD, TP et annales de votre promo, partagés par les étudiants et rangés par université, niveau et module.</p>
<div class="grp rfeat">${feat('blue','cap','Votre niveau en un geste','BioCampus s\'ouvre directement sur les cours de votre niveau.')}${feat('orange','pin','Tout au même endroit','Épinglés, récents et vos partages dans Mon espace.')}${feat('purple','layers','Sur tous vos appareils','Votre e-mail et votre mot de passe : le même espace sur téléphone et ordinateur.')}</div></div>
<div class="rcard"><span class="lab">Prénom et nom</span>${rfield('rgName','user','text','Prénom et nom',d.name,'name')}
<span class="lab">E-mail</span>${rfield('rgMail','mail','email','Adresse e-mail',d.email,'email')}
<span class="lab">Mot de passe</span>${rfield('rgPw','lock','password','6 caractères minimum',S.newPw||'','new-password',1)}
<label class="rchk"><input type="checkbox" id="rgOk"${d.ok?' checked':''}><span class="rbox">${ic('check')}</span><span>J'accepte les <button type="button" class="rlink" data-a="info">règles de BioCampus</button></span></label>
<button class="btn pri big wide" type="button" data-a="reg">Créer mon espace</button>
<div class="ror"><span>OU</span></div>
<button class="btn big wide rlog" type="button" data-a="login">${ic('user')}J'ai déjà un compte</button>
<p class="rfoot"><button type="button" class="rlink" data-a="look">Continuer en tant que visiteur</button></p></div></section>`;return}
  if(st===1||st===2){const d=dr||{name:'',role:'',level:''},pos=onbPos(st),tot=S.edit?2:3,uni=d.uni||S.uni;
    let body;
    if(st===1)body=`<h1 class="oh">Qui êtes-vous ?</h1><p class="wp">Votre photo et votre prénom s'affichent sur l'accueil et signent ce que vous partagez.</p>
<div class="phw ctr"><button class="php" type="button" data-a="photo" data-for="draft" aria-label="Choisir une photo de profil"><span class="av big">${avHTML(d)}</span><span class="phb">${ic('camera')}</span></button>
<span class="pht">${d.photo?'<button class="ghb" type="button" data-a="photox">Retirer la photo</button>':'<small>Ajouter une photo (facultatif)</small>'}</span></div>
<div class="cb"><label class="lab" for="onName">Prénom et nom</label><input class="fld big" id="onName" maxlength="60" placeholder="Ex. : Amar Bouchareb" autocomplete="name" enterkeyhint="next" value="${esc(d.name)}"></div>
<div class="cb"><label class="lab" for="onMail">E-mail</label><input class="fld big" id="onMail" type="email" inputmode="email" maxlength="120" placeholder="vous@exemple.fr" autocomplete="email" enterkeyhint="next" value="${esc(d.email||'')}"></div>
<div class="cb"><label class="lab" for="onPw">Mot de passe${S.edit&&store.get('bc_acc_p')?' (vide = inchangé)':''}</label><input class="fld big" id="onPw" type="password" maxlength="80" placeholder="6 caractères minimum" autocomplete="new-password"></div>
<p class="hint onbh">Avec votre e-mail et votre mot de passe, vous retrouvez votre espace (photo, université, niveau, épinglés) sur tous vos appareils. <b>L'administrateur peut voir ce mot de passe pour vous le redonner si vous l'oubliez : n'utilisez pas celui de vos autres comptes.</b> Votre nom et votre e-mail sont transmis à l'administrateur de BioCampus pour vous tenir au courant (nouveautés, cours à partager) ; ils ne sont jamais affichés sur le site.</p>
<button class="btn pri big wide" type="button" data-a="onbnext">Continuer</button>`;
    else{const lv=d.role==='etu'?onbLevels():[];
      body=`<h1 class="oh">Vous êtes…</h1><p class="wp">${uni?`À ${esc(short(uni.nom))}. `:''}${d.role==='etu'?'Choisissez votre niveau : BioCampus ouvrira directement son dossier.':'Pour vous proposer les bons documents.'}</p>
<div class="grp opts">${ROLES.map((r,k)=>`<button class="row opt${d.role===r[0]?' on':''}" style="--i:${k}" type="button" data-a="role" data-v="${r[0]}"><span class="bd" style="--c:var(--c-${r[3]})">${ic(r[2])}</span><span class="rt"><b>${r[1]}</b></span><span class="ck">${ic('check')}</span></button>`).join('')}</div>
${d.role==='etu'?`<div class="cb lvw"><span class="lab">Votre niveau</span>${lv===null?'<div class="sk" style="height:50px;margin:0;border-radius:999px"></div>':`<button class="dd${d.level?' on':''}" type="button" data-a="lvdd"><span>${esc(d.level||'Choisir votre niveau')}</span>${ic('down')}</button>`}</div>`:''}
<button class="btn pri big wide" type="button" data-a="onbnext"${d.role?'':' disabled'}>${S.edit?'Enregistrer':'C\'est parti'}</button>`}
    v.innerHTML=`<section class="onb${dir}">${onbHead(st)}<small class="wk">Étape ${pos} sur ${tot}</small>${body}</section>`;
    if(st===1)setTimeout(()=>{const i=$('#onName');if(i&&DESK.matches)i.focus()},300);return}
  if(st===5){const L=S.lg||(S.lg={m:'in',email:''}),em=esc(L.email);
    const body=L.m==='in'?`<h1 class="oh">Bon retour</h1><p class="wp">Connectez-vous avec l'e-mail et le mot de passe de votre espace : vous retrouvez votre photo, votre université, votre niveau et vos épinglés.</p>
<span class="lab">E-mail</span>${rfield('lgMail','mail','email','Adresse e-mail',L.email,'email')}
<span class="lab">Mot de passe</span>${rfield('lgPw','lock','password','Votre mot de passe','','current-password',1)}
<button class="btn pri big wide" type="button" data-a="lgo">Se connecter</button><button class="wvis" type="button" data-a="lgforgot">Mot de passe oublié ?</button>`
    :L.m==='f1'?`<h1 class="oh">Mot de passe oublié</h1><p class="wp">Indiquez l'e-mail de votre espace : vous recevez un code à 6 chiffres pour choisir un nouveau mot de passe. Pas reçu ? Demandez un nouveau mot de passe à l'administrateur de BioCampus.</p>
<span class="lab">E-mail</span>${rfield('lgMail','mail','email','Adresse e-mail',L.email,'email')}
<button class="btn pri big wide" type="button" data-a="lgsend">Recevoir le code</button>`
    :`<h1 class="oh">Nouveau mot de passe</h1><p class="wp">Si un espace existe avec ${em}, un code vient d'y être envoyé (pensez aux courriers indésirables).</p>
<div class="cb"><label class="lab" for="lgCode">Code reçu</label><input class="fld big" id="lgCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456"></div>
<span class="lab">Nouveau mot de passe</span>${rfield('lgPw','lock','password','6 caractères minimum','','new-password',1)}
<button class="btn pri big wide" type="button" data-a="lgreset">Valider</button>`;
    v.innerHTML=`<section class="onb lgv${dir}"><div class="onh"><button class="rbtn sm" type="button" data-a="lgback" aria-label="Retour">${ic('back')}</button><span></span></div>${body.replace('<span class="lab">','<div class="rcard"><span class="lab">')}</div></section>`;
    setTimeout(()=>{const i=$(L.m==='f2'?'#lgCode':L.email&&L.m==='in'?'#lgPw':'#lgMail');if(i&&DESK.matches)i.focus()},300);return}
  /* étape 3 : liste des universités et écoles, filtre, « Ajouter mon établissement » */
  const o=split(S.items);
  v.innerHTML=`<section class="onb${dir}">${dr||S.uni?onbHead(dr?3:0):''}<small class="wk">${dr?'Étape 2 sur 3':first()?esc(hello()+' '+first()):'BioCampus'}</small>
<h1 class="oh">${S.uni&&!dr?'Changer d\'établissement':'Votre université ou école'}</h1><p class="wp">${dr?'Touchez la vôtre. Elle n\'y est pas ? Ajoutez-la en quelques secondes.':'BioCampus s\'ouvrira directement dessus. Vous pourrez en changer à tout moment.'}</p>
${o.notes.length?`<div class="stack">${o.notes.map(noteHTML).join('')}</div>`:''}
<label class="search uf">${ic('search')}<input id="uf" type="search" autocomplete="off" placeholder="Rechercher un établissement" aria-label="Rechercher un établissement" value="${esc(S.uf)}"></label>
${schoolRow()}<div id="ulist"></div>
${S.adm?`<div class="acts"><button class="act" type="button" data-a="create">${ic('plus')}Ajouter ici</button></div>`:''}</section>`;
  drawUnis()}
function drawUnis(){const box=$('#ulist');if(!box)return;const all=S.items.filter(isUni).sort(byName),q=fold(S.uf),l=q?all.filter(u=>fold(u.nom).includes(q)||score(q,u.nom)>.7):all;
  box.innerHTML=l.length?sec(q?'Résultats':'Universités et écoles',l.length)+`<div class="list u">${l.map((u,n)=>uniRow(u,n)).join('')}</div>`:empty(all.length?`Aucun établissement pour « ${esc(S.uf)} ».`:'Aucun établissement pour le moment.',all.length?'Ajoutez-le ci-dessous en quelques secondes.':'','landmark');hydrateLogos(box)}
const schoolRow=()=>`<button class="addu" type="button" data-a="school"><span class="bd" style="--c:var(--c-blue)">${ic('plus')}</span><span class="rt"><b>Ajouter mon établissement</b><small>Votre université ou école n'apparaît pas ? Créez-la en quelques secondes.</small></span><span class="cv">${ic('chev')}</span></button>`;
function uniRow(u,n){const here=S.uni&&S.uni.id===u.id;
  return`<div class="row st${u.hidden?' dim':''}" style="--i:${Math.min(n,12)}"><button class="rb" type="button" data-a="uni" ${dataF(u)}>${badge(u)}
<span class="rt"><b>${esc(u.nom)}${flags(u)}</b><small>${lockIc(u)?'Accès protégé':esc(u.desc||(S.meta[u.id]||{}).desc||'Cours, TD, TP et examens')}</small></span>${here?'<span class="here">Actuelle</span>':`<span class="cv">${ic('chev')}</span>`}</button>${gear(u)}</div>`}
/* contenu d'un dossier : université (grand titre + cartes) ou sous-dossier (pochette, titre centré, actions) */
function renderFolder(){const c=cur();if(!c)return renderWelcome();
  if(VISITOR()&&S.hist.some(h=>S.mbs.has(h.id))){$('#phead').innerHTML='';$('#view').innerHTML=`<section class="mbgate st"><span class="mbi">${ic('users')}</span><h1 class="oh">Réservé aux membres</h1>
<p class="wp">« ${esc(c.nom)} » est visible seulement par les étudiants qui ont créé leur espace BioCampus. C'est gratuit et rapide.</p>
<button class="btn pri big wide" type="button" data-a="start">${ic('user')}Créer mon espace</button><button class="btn big wide rlog" type="button" data-a="login">J'ai déjà un compte</button></section>`;return}const o=split(S.items.filter(i=>S.kind==='all'||i.type===S.kind));sortL(o.folders,true);sortL(o.files,false);
  const d=S.hist.length,pinned=S.favs.some(f=>f.id===c.id),meta=S.meta[c.id]||{},nF=o.folders.length,nD=o.files.length;
  /* dans un niveau : ses accès rapides, puis ceux de l'université et de la racine (et les annonces de l'université) */
  const ur=d===2&&S.hist[0]?S.cache[S.hist[0].id]:null,uo=ur?split(ur.data||[]):null;
  if(d===2&&!ur&&S.hist[0]&&!S.pend['u2'+S.hist[0].id]){const uid=S.hist[0].id;S.pend['u2'+uid]=getFolder(uid).then(()=>{if(S.view==='folder'&&S.hist.length===2&&S.hist[0].id===uid&&!S.searching)renderFolder()}).catch(()=>{}).finally(()=>{delete S.pend['u2'+uid]})}
  const mine=byOrder(o.links),seen=new Set(),uniq=l=>l.filter(x=>!seen.has(x.id)&&seen.add(x.id));
  const links=d===1?[...byOrder(S.rootLinks),...mine]:d===2?uniq([...mine,...(uo?byOrder(uo.links):[]),...byOrder(S.rootLinks)]):mine,parts=[];
  if(uo&&uo.notes.length)o.notes=[...uo.notes,...o.notes];
  const qa=qaHTML(links,{parent:c.id,items:mine});
  if(o.notes.length)parts.push(`<div class="stack">${o.notes.map(noteHTML).join('')}</div>`);
  if(d===1){
    /* accueil de l'université : « Bonjour Prénom », bannière (couverture animée de l'admin), J'ajoute un cours, reprendre, niveaux */
    const mine=S.uni&&S.uni.id===c.id,mu=realMed(c.id,meta.icon),ugv=!mu&&isGv(c.id,meta.icon);
    $('#phead').innerHTML=(mine&&!(S.me&&S.me.levelId)?helloHTML():'')+
     `<div class="ubn st hasm${mu?lumCls(c.id,'m:'+encodeURIComponent(mu)):ugv?' gv':' gn'}" style="--c:var(--c-${uniColor(c.id)})">${mu?coverHTML(c.id,'m:'+encodeURIComponent(mu)):ugv?gvHTML:''}<div class="ubt">${badge({id:c.id,nom:c.nom},'bd ub')}<span class="ubx"><small>${mine?'Mon université':'Université'}</small><b>${esc(c.nom)}</b></span></div>${meta.desc?`<p class="ubd">${esc(meta.desc)}</p>`:''}
<div class="uba">${mine?`<button class="ubb" type="button" data-a="unipick">${ic('swap')}Changer</button>`:`<button class="ubb" type="button" data-a="setuni" ${dataF(c)}>${ic('check')}En faire mon université</button>`}<button class="ubb r" type="button" data-a="ctx" aria-label="Plus d'options">${ic('more')}</button></div></div>`;
    if(mine&&!S.me)parts.push(`<button class="invite st" type="button" data-a="start"><span class="av sm">${ic('user')}</span><span class="rt"><b>Créez votre espace</b><small>Votre prénom, vos épinglés, vos récents et vos partages au même endroit.</small></span><span class="cv">${ic('chev')}</span></button>`);
    if(S.kind==='all')parts.push(`<div class="hq st"><button class="hqa pri" type="button" data-a="share"><span class="hqi">${ic('fileup')}</span><span class="hqt"><b>J'ajoute un cours</b><small>Un fichier ou un lien, en quelques secondes</small></span><span class="cv">${ic('chev')}</span></button></div>`);
    const lv=o.folders.length&&o.folders.every(f=>kindOf(f.nom).l==='Niveau');
    if(nF)parts.push(sec(lv?'Niveaux':'Dossiers',nF)+`<div class="car">${o.folders.map(cardHTML).join('')}</div>`);
    const rec=S.kind==='all'?recents().map((r,i)=>(r.ri=i,r)).filter(r=>r[0].id===c.id&&r.length>1).slice(0,8):[];
    if(rec.length)parts.push(sec('Reprendre')+`<div class="recs">${rec.map((r,k)=>{const l=r[r.length-1];return`<button class="rc st" style="--i:${k}" type="button" data-a="recent" data-k="${r.ri}">${artHTML(l,'art')}<span class="rt"><b>${esc(l.nom)}</b><small>${esc(r.slice(1,-1).map(h=>h.nom).join(' › ')||tiny(r[0].nom))}</small></span></button>`}).join('')}</div>`);
    parts.push(qa);
    const pins=S.favs.filter(f=>!f.url&&f.uni===c.id&&f.id!==c.id);
    if(pins.length&&S.kind==='all')parts.push(sec('Épinglés',pins.length)+`<div class="fgrid">${pins.map((f,n)=>pinCardHTML(f,n,false)).join('')}</div>`);
  }else{
    /* dossier ou sous-dossier : bandeau coloré (couverture animée de l'admin en fond), fil d'Ariane, actions */
    const cnt=[nF?`${nF} dossier${nF>1?'s':''}`:'',nD?`${nD} document${nD>1?'s':''}`:''].filter(Boolean).join(' · ');
    const k=kindOf(c.nom),icon=meta.icon,real=coverHTML(c.id,icon),gv=!real&&isGv(c.id,icon),cov=real||(gv?gvHTML:''),myLv=d===2&&S.me&&S.me.levelId===c.id;
    $('#phead').innerHTML=(myLv?helloHTML():'')+`<div class="fhd st hasm${real?lumCls(c.id,icon):gv?' gv':' gn'}" style="--c:var(--c-${colOf(icon,k.c)})">${cov}
<nav class="crumbs" aria-label="Emplacement">${S.hist.slice(0,-1).map((h,j)=>`<button type="button" data-j="${j}">${esc(j?h.nom:tiny(h.nom))}</button>`).join(ic('chev'))}</nav>
<div class="fht">${real?'':`<span class="fico${isImg(icon)?' img':''}">${icon?iconHTML(icon,k.i):ic(k.i)}</span>`}<div class="fhx"><small>${esc(k.l)}</small><h1>${esc(c.nom)}</h1>${cnt?`<p>${cnt}</p>`:''}</div></div>
${meta.desc?`<p class="fdesc">${esc(meta.desc)}</p>`:''}
<div class="fact"><button class="rbtn${pinned?' on':''}" type="button" data-a="pin" aria-pressed="${pinned}" aria-label="${pinned?'Retirer des épinglés':'Épingler'}">${ic('pin')}</button><button class="wcap" type="button" data-a="share">${ic('fileup')}J'ajoute un cours</button>${moreBtn()}</div></div>`;
    parts.push(qa);
    if(nF)parts.push(sec('Dossiers',nF,vmBtn())+(S.vm==='list'?`<div class="grp docs">${o.folders.map((f,n)=>folderRow(f,n)).join('')}</div>`:`<div class="fgrid">${o.folders.map(fcardHTML).join('')}</div>`));
  }
  if(nD)parts.push(sec('Documents',nD,d>1&&!nF?vmBtn():'')+(S.vm==='grid'&&d>1?`<div class="dgrid">${o.files.map((f,n)=>docTile(f,n+nF)).join('')}</div>`:`<div class="grp docs">${o.files.map((f,n)=>fileRow(f,n+nF)).join('')}</div>`));
  setTimeout(()=>{lumScan();vidWatch();dragPrep()},0);
  $('#view').innerHTML=(nF||nD)?parts.join(''):parts.join('')+(S.items.length&&S.kind!=='all'?empty('Rien pour ce filtre.','Touchez « … » puis « Tout afficher ».'):
    empty('Ce dossier est encore vide.',d>1?'Soyez le premier à y ajouter un cours.':'Les niveaux apparaîtront ici. Ajoutez le premier cours : les dossiers se créent tout seuls.','folder','<button class="btn pri" data-a="share">J\'ajoute un cours</button>'));hydrateLogos($('#phead'))}
/* Mon espace : profil, mon université, épinglés (dossiers et boutons), récents, mes partages, réglages, déconnexion.
   Tout reste sur l'appareil (pas de compte) ; « Se déconnecter » efface cet espace. */
function renderMe(){const m=S.me,u=S.uni,rec=recents(),dark=document.documentElement.dataset.theme!=='light',mine=json(store.get('bc_mine'),[]).filter(x=>x&&x.t);
  const dirs=S.favs.filter(f=>!f.url),btns=S.favs.filter(f=>f.url),parts=[];
  $('#phead').innerHTML=m?`<div class="meh"><button class="php" type="button" data-a="photo" data-for="me" aria-label="Changer la photo de profil"><span class="av">${avHTML(m)}</span><span class="phb">${ic('camera')}</span></button><div class="ltt"><small>Mon espace</small><h1>${esc(m.name)}</h1><p>${esc([roleTxt(m),u&&tiny(u.nom)].filter(Boolean).join(' · ')||'Profil')}</p></div><button class="ghb" type="button" data-a="editme">${ic('pen')}Modifier</button></div>`
    :`<div class="lt"><div class="ltt"><small>BioCampus</small><h1>Mon espace</h1></div></div><p class="lsub">Vos épinglés, vos récents et vos partages, sur cet appareil.</p>`;
  if(!m)parts.push(`<button class="invite st" type="button" data-a="start"><span class="av sm">${ic('user')}</span><span class="rt"><b>Créez votre espace</b><small>Prénom, profil et université : 3 questions, sans mot de passe.</small></span><span class="cv">${ic('chev')}</span></button>`);
  parts.push(sec('Mon université')+`<div class="list"><div class="row"><button class="rb" type="button" data-a="unipick">${u?badge(u):`<span class="bd" style="--c:var(--c-blue)">${ic('landmark')}</span>`}<span class="rt"><b>${u?esc(u.nom):'Choisir mon université ou mon école'}</b><small>${u?'Toucher pour changer':'BioCampus s\'ouvrira directement dessus'}</small></span><span class="cv">${ic(u?'swap':'chev')}</span></button></div></div>`);
  parts.push(sec('Épinglés',dirs.length||null)+(dirs.length?`<div class="fgrid">${dirs.map((f,n)=>pinCardHTML(f,n,true)).join('')}</div>`:`<div class="tipc">${ic('pin')}<span>Touchez l'épingle d'un dossier pour le retrouver ici en un geste.</span></div>`));
  if(btns.length)parts.push(qaHTML(btns.map(f=>({id:f.id,nom:'BTN:'+f.nom+'#'+f.url,icon:f.icon})),null,'Boutons épinglés'));
  if(rec.length)parts.push(sec('Récents',null,`<button class="ghb" type="button" data-a="recclear">${ic('trash')}Effacer</button>`)+`<div class="list">${rec.map((r,k)=>{const l=r[r.length-1];return`<div class="row st" style="--i:${k}"><button class="rb" type="button" data-a="recent" data-k="${k}">${artHTML(l,'art')}<span class="rt"><b>${esc(l.nom)}</b><small>${esc(r.slice(0,-1).map(h=>tiny(h.nom)).join(' › '))}</small></span><span class="cv">${ic('chev')}</span></button></div>`}).join('')}</div>`);
  parts.push(sec('Mes partages',mine.length||null)+(mine.length?`<div class="list">${mine.map((x,k)=>`<div class="row st" style="--i:${k}"><button class="rb" type="button" data-a="mine" data-k="${k}"><span class="fart" style="--c:var(--c-${TYC[x.ty]||'gray'})">${esc((x.ty||'DOC').slice(0,4).toUpperCase())}</span><span class="rt"><b>${esc(x.t)}${x.p?'<span class="hid">En attente</span>':''}</b><small class="mt">${esc([x.w,x.d&&new Date(x.d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})].filter(Boolean).join(' · '))}</small></span>${Array.isArray(x.h)&&x.h.length?`<span class="cv">${ic('chev')}</span>`:''}</button></div>`).join('')}</div>`
    :`<div class="tipc">${ic('fileup')}<span>Les cours que vous ajoutez depuis cet appareil s'affichent ici.</span></div>`));
  parts.push(sec('Réglages')+`<div class="list q"><div class="row" style="--c:var(--c-purple)"><button class="rb" type="button" data-a="share"><span class="gly">${ic('fileup')}</span><span class="rt"><b>J'ajoute un cours</b></span><span class="cv">${ic('chev')}</span></button></div>
<div class="row" style="--c:var(--c-indigo)"><label class="rb swr"><span class="gly">${ic('moon')}</span><span class="rt"><b>Mode sombre</b></span><input type="checkbox" id="meDark"${dark?' checked':''}><span class="knob"></span></label></div>
<div class="row" style="--c:var(--c-blue)"><button class="rb" type="button" data-a="info"><span class="gly">${ic('info')}</span><span class="rt"><b>À propos et règles</b></span><span class="cv">${ic('chev')}</span></button></div></div>`);
  if(m&&!store.get('bc_acc_p'))parts.splice(1,0,`<button class="invite st" type="button" data-a="editme"><span class="av sm">${ic('lock')}</span><span class="rt"><b>Retrouver mon espace sur tous mes appareils</b><small>Ajoutez votre e-mail et un mot de passe : photo, université et épinglés vous suivent.</small></span><span class="cv">${ic('chev')}</span></button>`);
  if(m||u||S.favs.length||rec.length)parts.push(`<button class="logout" type="button" data-a="logout">${ic('logout')}Se déconnecter</button><p class="hint ctr">${store.get('bc_acc_p')&&m&&m.email?`Connecté avec ${esc(m.email)} : le même espace sur tous vos appareils.`:'Efface votre espace de cet appareil. Vos documents partagés restent en ligne.'}</p>${m&&store.get('bc_acc_s')?'<button class="wvis" type="button" data-a="delacc">Supprimer mon compte</button>':''}`);
  $('#view').innerHTML=parts.join('')}
function openUniSheet(){buzz();const draw=()=>{$('#uniList').innerHTML=schoolRow()+(S.unis.length?`<div class="list">${S.unis.map((x,k)=>uniRow(x,k)).join('')}</div>`:'<div class="sk"></div>'.repeat(3));hydrateLogos($('#uniList'))};
  draw();openSheet('p-uni');if(!S.unis.length)getFolder(null).then(r=>{useRoot(r);draw()}).catch(()=>{$('#uniList').innerHTML=empty(NET,'','wifi')})}
/* ---------- Ajouter mon établissement (visiteurs) : nom + image ; visible tout de suite, ou après validation si « Valider chaque dépôt » ---------- */
const SCH={img:'',form:null};
function schPrev(){$('#sc-prev').innerHTML=SCH.img?`<img src="${esc(SCH.img)}" alt="">`:ic('landmark');$('#sc-imgx').hidden=!SCH.img}
function openSchool(){const b=$('#schBody');SCH.form=SCH.form||$('#schForm');if(!b.contains(SCH.form)){b.innerHTML='';b.appendChild(SCH.form)}
  SCH.img='';$('#sc-nom').value='';$('#sc-nom').classList.remove('bad');const n=store.get('bc_name');$('#sc-by').value=n||'';schPrev();openSheet('p-school');setTimeout(()=>$('#sc-nom').focus(),350)}
$('#sc-img').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{SCH.img=await shrink(f,true);schPrev();buzz(8)}catch(err){toast(err.message)}};
$('#sc-imgx').onclick=()=>{SCH.img='';schPrev()};
$('#schForm').addEventListener('submit',async e=>{e.preventDefault();
  const nom=$('#sc-nom').value.replace(/[\/\\#]/g,' ').replace(/\s+/g,' ').trim(),by=$('#sc-by').value.trim(),go_=$('#sc-go');
  if(nom.length<3){$('#sc-nom').classList.add('bad');$('#sc-nom').focus();return toast('Indiquez le nom de l\'établissement (3 caractères minimum).')}
  if(by.length<2){$('#sc-by').focus();return toast('Indiquez votre nom et prénom.')}
  const dup=S.unis.find(u=>fold(u.nom)===fold(nom));if(dup){toast('Cet établissement est déjà dans la liste');return openUni(dup)}
  store.set('bc_name',by);go_.disabled=true;go_.textContent=SCH.img?'Envoi de l\'image…':'Ajout…';
  try{const r=await post({action:'addschool',nom,by,img:SCH.img,site:$('#sc-hp').value});
    if(r&&r.exists&&r.id){toast('Cet établissement existe déjà');invalidate();return openUni({id:r.id,nom:r.nom||nom})}
    if(!r||!r.success)throw new Error(r&&r.error&&!/Nom et titre/.test(r.error)?r.error:'Ajout impossible pour le moment. Réessayez plus tard.');
    buzz([12,60,18]);invalidate();S.unis=[];getFolder(null).then(useRoot).catch(()=>{});
    const u={id:r.id,nom:r.nom||nom},pic=SCH.img?`<span class="ip on"><img src="${esc(SCH.img)}" alt=""></span>`:`<span class="ip on">${ic('landmark')}</span>`;
    $('#schBody').innerHTML=`<div class="schok">${pic}<h3>${r.pending?'Merci, c\'est envoyé !':'Votre établissement est ajouté !'}</h3>
<p>${r.pending?`« ${esc(u.nom)} » apparaîtra dans la liste dès qu'il aura été vérifié.`:`« ${esc(u.nom)} » est maintenant disponible sur BioCampus.`}</p>
<p><b>À vous de le faire vivre :</b> BioCampus est alimenté par ses utilisateurs. C'est à vous, à vos camarades et à vos enseignants de partager les ressources que vous souhaitez.</p>
<ol><li>Touchez <b>J'ajoute un cours</b>.</li><li>Choisissez le niveau, la spécialité et le module, ou touchez <b>Nouveau dossier</b> : les dossiers se créent tout seuls.</li><li>Importez un fichier ou collez un lien (cours, TD, TP, annales, fiches…).</li></ol>
<div class="btns">${r.pending?'<button class="btn pri" type="button" data-close>Compris</button>':`<button class="btn" type="button" id="sc-open">Ouvrir</button><button class="btn pri" type="button" id="sc-share">J'ajoute un cours</button>`}</div></div>`;
    if(!r.pending){$('#sc-open').onclick=()=>openUni(u);
      $('#sc-share').onclick=()=>{S.uni={id:u.id,nom:u.nom,locked:false};store.set('bc_uni',JSON.stringify(S.uni));if(S.draft&&S.draft.name){saveMe(S.draft);S.draft=null;countSpace()}closeSheet();navTo([{id:u.id,nom:u.nom}]);setTimeout(openShare,380)}}}
  catch(err){toast(isNet(err)?NET:err.message)}finally{go_.disabled=false;go_.textContent='Ajouter'}});
function renderInfo(){head('À propos','La bibliothèque collaborative des étudiants en biologie.')}
/* barre latérale (PC) : université, épinglés, emplacement */
function renderSide(){const u=S.uni;
  $('#uniBtn').innerHTML=u?`${badge({id:u.id,nom:u.nom})}<span class="ut"><small>Mon université</small><b>${esc(u.nom)}</b></span>${ic('swap')}`:`<span class="bd" style="--c:var(--c-blue)">${ic('cap')}</span><span class="ut"><small>Bienvenue</small><b>Choisir mon université</b></span>${ic('chev')}`;
  $('#pins').innerHTML=S.favs.map(f=>`<button class="pin" type="button" data-a="pinopen" data-id="${esc(f.id)}">${ic(f.url?'link':'pin')}<span>${esc(f.nom)}</span></button>`).join('');
  $('#pinsBox').hidden=!S.favs.length;
  const tree=S.view==='folder'?S.hist.map((h,i)=>`<button class="tr${i===S.hist.length-1?' on':''}" type="button" data-j="${i}" style="--d:${i}">${ic(i?kindOf(h.nom).i:'cap')}<span>${esc(h.nom)}</span></button>`).join(''):'';
  $('#tree').innerHTML=tree;$('#treeBox').hidden=!tree;hydrateLogos($('#side'))}
/* en-tête, retour, onglets, recherche, capsule « Reprendre » */
function syncChrome(){const f=S.view==='folder',d=S.hist.length,i=TABV[S.view],b=document.body;
  b.dataset.view=S.searching?'search':S.view;b.classList.toggle('deep',f&&d>1&&!S.searching&&!S.sOpen);
  $('#back').hidden=!(f&&d>1)&&!S.searching&&!S.sOpen;
  $$('.nb').forEach((x,k)=>{x.classList.toggle('on',k===i);x.toggleAttribute('aria-current',k===i)});if(navCtl&&i!=null)navCtl.select(i);
  $('#sbar').hidden=!(S.sOpen||S.searching||DESK.matches&&(f||S.view==='pick'));$('#sBtn').classList.toggle('on',!!(S.sOpen||S.searching));
  const u=here();$('#filters').hidden=!S.searching;$('#scope').hidden=!S.searching||!u;
  if(u)$('#scope [data-s=uni]').textContent=tiny(u.nom);
  showNotice();syncResume();
  $('#q').placeholder=u&&S.scope==='uni'?`Rechercher dans ${short(u.nom)}…`:'Rechercher un cours, un module, un examen…'}
function openSearch(){S.sOpen=true;syncChrome();$('#q').focus()}
function closeSearch(){S.sOpen=false;$('#q').blur();clearSearch();render()}
/* dernier dossier ouvert : capsule au-dessus de la barre (mobile), comme un mini-lecteur */
let resK='';
function syncResume(){const L=json(store.get('bc_last'),null),r=$('#resume');
  const ok=Array.isArray(L)&&L.length>1&&!S.searching&&!S.sOpen&&!(S.view==='folder'&&S.hist.length>1);
  r.hidden=!ok;document.body.classList.toggle('hasres',ok);if(!ok)return;
  const l=L[L.length-1],k=JSON.stringify(L);if(k===resK)return;resK=k;
  r.innerHTML=`<button class="rsb" type="button" data-a="resume">${artHTML({id:l.id,nom:l.nom},'art')}<span class="rst"><small>Reprendre · ${esc(L.slice(0,-1).map(h=>tiny(h.nom)).join(' › '))}</small><b>${esc(l.nom)}</b></span></button><button class="x" type="button" data-a="rclose" aria-label="Masquer">${ic('x')}</button>`}
/* ---------- Menu « … » : 3 actions en haut, puis une liste (façon iOS) ---------- */
let CTX=null,navCtl=null,CTXB=null;
function ctxOpen(btn,top,list,cap=''){const el=$('#ctx');CTXB=btn;const items=[...top.map(x=>({...x,grp:x.grp??0})),...list.map(x=>({...x,grp:x.grp??1}))];CTX={items};el.classList.remove('on');
  let h='',g=null;items.forEach((x,k)=>{if(g!==null&&x.grp!==g)h+='<i class="msep"></i>';g=x.grp;
    h+=`<button type="button" role="menuitem" class="mi${x.chk?' chk':''}${x.danger?' dng':''}" data-k="${k}"${x.off?' disabled':''}><span class="mck">${x.chk?ic('check'):''}</span>${x.i&&x.i!=='check'?ic(x.i):'<span class="mi0"></span>'}<span class="mlb">${x.l}${x.sub?`<small>${x.sub}</small>`:''}</span></button>`});
  el.innerHTML=h+(cap?`<p class="cap">${cap}</p>`:'');
  const r=btn.getBoundingClientRect(),W=innerWidth,H=window.visualViewport?visualViewport.height:innerHeight,w=el.offsetWidth,hh=el.offsetHeight;
  const x=Math.min(Math.max(12,r.right-w),W-w-12);let y=r.bottom+8;if(y+hh>H-12)y=r.top-hh-8;y=Math.max(12,Math.min(y,H-hh-12));
  el.style.left=x+'px';el.style.top=y+'px';el.style.setProperty('--ox',(r.left+r.width/2-x)+'px');el.style.setProperty('--oy',(y>=r.bottom?0:hh)+'px');
  buzz(8);$('#ctxv').classList.add('on');requestAnimationFrame(()=>el.classList.add('on'))}
function ctxClose(){if(!CTX)return;CTX=null;$('#ctx').classList.remove('on');$('#ctxv').classList.remove('on')}
S.vm=store.get('bc_vm')==='list'?'list':'grid';S.sort=json(store.get('bc_sort'),{k:'name',d:1});
function setVm(v){S.vm=v;store.set('bc_vm',v);buzz(8);renderFolder()}
function setSort(k){S.sort=S.sort.k===k?{k,d:-S.sort.d}:{k,d:1};store.set('bc_sort',JSON.stringify(S.sort));buzz(8);renderFolder()}
const SORTS=[['name','Nom','Croissant','Décroissant'],['kind','Type','Croissant','Décroissant'],['date','Date','Plus récents d\'abord','Plus anciens d\'abord']];
function folderCtx(btn){const c=cur();if(!c)return;const pinned=S.favs.some(f=>f.id===c.id),deep=S.hist.length>1,it=[];
  if(S.adm&&deep)it.push({i:'checkc',l:'Sélectionner',grp:0,f:selStart});
  if(deep)it.push({i:'folderplus',l:'Nouveau dossier',grp:0,f:openMk});
  it.push({i:'fileup',l:'J\'ajoute un cours',grp:0,f:openShare},{i:'pin',l:pinned?'Retirer des épinglés':'Épingler',grp:0,f:togglePin},{i:'search',l:'Rechercher',grp:0,f:openSearch});
  if(deep)it.push({i:'grid',l:'Icônes',chk:S.vm==='grid',grp:1,f:()=>setVm('grid')},{i:'list',l:'Liste',chk:S.vm==='list',grp:1,f:()=>setVm('list')});
  if(deep)SORTS.forEach(([k,l,a,b])=>it.push({l,chk:S.sort.k===k,sub:S.sort.k===k?(S.sort.d>0?a:b):'',grp:2,f:()=>setSort(k)}));
  it.push({i:'refresh',l:'Actualiser',grp:3,f:()=>{invalidate();load();toast('Actualisé ✓')}});
  if(!deep)it.push({i:'swap',l:'Changer d\'université',grp:3,f:openUniSheet});
  if(S.adm){it.push({i:'plus',l:'Ajouter ici (admin)',grp:4,f:()=>openCreate()},{i:'pen',l:deep?'Gérer ce dossier':'Gérer l\'université',grp:4,f:()=>openManage(c.id,c.nom,'folder',deep?S.hist[S.hist.length-2].id:'')});if(S.hist.length>2)it.push({i:'move',l:'Déplacer ce dossier',grp:4,f:()=>openMove([c.id],S.hist.slice(0,-1))});if(S.ord)it.push({i:'layers',l:'Organiser les accès rapides',grp:4,f:openOrder})}
  ctxOpen(btn,[],it)}
/* tri des dossiers et des documents (Nom, Type, Date), les éléments mis en avant restent en tête */
const dnum=d=>{const m=String(d||'').match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(m)return +new Date(+m[3],+m[2]-1,+m[1]);const t=Date.parse(d);return isNaN(t)?0:t};
function sortL(l,isF){const k=S.sort.k,d=S.sort.d,nm=(a,b)=>String(a.nom).localeCompare(String(b.nom),'fr',{numeric:true,sensitivity:'base'});
  return l.sort((a,b)=>{const ft=(b.featured?1:0)-(a.featured?1:0);if(ft)return ft;
    if(k==='date'&&!isF){const r=(dnum(b.date)-dnum(a.date))*d;if(r)return r}
    if(k==='kind'){const r=String(isF?kindOf(a.nom).l:ftype(a)[0]).localeCompare(String(isF?kindOf(b.nom).l:ftype(b)[0]))*d;if(r)return r}
    return nm(a,b)*(k==='name'?d:1)})}
/* ---------- Sélection (admin) : Déplacer, Renommer, Supprimer ---------- */
S.sel=null;
const prefetch=e=>{const b=e.target.closest&&e.target.closest('[data-a="folder"][data-id],[data-a="pinopen"][data-id]');if(!b)return;const id=b.dataset.id;
  if(id&&!S.cache[id]&&!S.pend[id]&&!b.dataset.lk)getFolder(id).catch(()=>{})};
document.addEventListener('pointerover',e=>{if(e.pointerType==='mouse')prefetch(e)},{passive:true});document.addEventListener('touchstart',prefetch,{passive:true});
/* glisser-déposer (PC, admin) : un document ou un dossier sur une carte de dossier, une ligne de dossier, le fil d'Ariane ou l'arborescence */
let DRAG=null;
const dropOf=el=>{const t=el&&el.closest&&el.closest('[data-drop],.crumbs [data-j],.tr[data-j]');if(!t)return null;
  if(t.dataset.drop)return{el:t,id:t.dataset.drop,nom:t.dataset.dn||''};if(t.dataset.j!=null){const h=S.hist[+t.dataset.j];return h?{el:t,id:h.id,nom:h.nom}:null}return null};
function dragPrep(){const on=!!S.adm&&DESK.matches&&!S.sel;$$('#view [data-sid]').forEach(x=>{x.draggable=on})}
document.addEventListener('dragstart',e=>{const el=e.target.closest&&e.target.closest('[data-sid]');if(!el||!S.adm)return;const b=el.querySelector('[data-nom]'),tb=el.querySelector('.rt b,b');
  DRAG={id:el.dataset.sid,nom:b?b.dataset.nom:tb?tb.textContent.trim():''};try{e.dataTransfer.setData('text/plain',DRAG.id);e.dataTransfer.effectAllowed='move'}catch(x){}el.classList.add('drg')});
document.addEventListener('dragend',()=>{DRAG=null;$$('.drg,.dropon').forEach(x=>x.classList.remove('drg','dropon'))});
document.addEventListener('dragover',e=>{if(!DRAG)return;const d=dropOf(e.target);$$('.dropon').forEach(x=>{if(!d||x!==d.el)x.classList.remove('dropon')});
  if(!d||d.id===DRAG.id||cur()&&d.id===cur().id)return;e.preventDefault();e.dataTransfer.dropEffect='move';d.el.classList.add('dropon')});
document.addEventListener('drop',async e=>{if(!DRAG)return;const d=dropOf(e.target),g=DRAG;DRAG=null;$$('.drg,.dropon').forEach(x=>x.classList.remove('drg','dropon'));
  if(!d||d.id===g.id||cur()&&d.id===cur().id)return;e.preventDefault();buzz(8);toast(`Déplacement de « ${g.nom||'l\'élément'} »…`,8000);
  try{await adm('move',{ids:[g.id],to:d.id});buzz([12,60,18]);toast(`« ${g.nom||'Élément'} » déplacé dans « ${d.nom||'ce dossier'} » ✓`,3200);invalidate();load()}
  catch(err){toast(/inconnue/i.test(err.message)?'Mettez à jour le script Google (Code.gs v3.6) pour déplacer':isNet(err)?NET:err.message,4500)}});
/* appui long sur un document ou un dossier (téléphone, admin) : sélection, puis Déplacer */
let LP=null;
document.addEventListener('touchstart',e=>{if(!S.adm||S.sel||S.view!=='folder')return;const el=e.target.closest('[data-sid]');if(!el||!$('#view').contains(el)||e.target.closest('.more'))return;
  const t0=e.touches[0];LP={x:t0.clientX,y:t0.clientY,t:setTimeout(()=>{LP=null;selStart();const x=$(`#view [data-sid="${CSS.escape(el.dataset.sid)}"]`);if(x){S.sel.add(el.dataset.sid);x.classList.add('picked');selSync()};buzz([10,40,10])},520)}},{passive:true});
document.addEventListener('touchmove',e=>{if(!LP)return;const t=e.touches[0];if(Math.abs(t.clientX-LP.x)>10||Math.abs(t.clientY-LP.y)>10){clearTimeout(LP.t);LP=null}},{passive:true});
document.addEventListener('touchend',()=>{if(LP){clearTimeout(LP.t);LP=null}},{passive:true});
document.addEventListener('contextmenu',e=>{if(S.adm&&!DESK.matches&&e.target.closest('#view [data-sid]'))e.preventDefault()});
function selStart(){S.sel=new Set();document.body.classList.add('sel');buzz();renderFolder();selSync()}
function selEnd(){if(!S.sel)return;S.sel=null;document.body.classList.remove('sel');$('#selBar').hidden=true;$$('.picked').forEach(e=>e.classList.remove('picked'))}
function selSync(){if(!S.sel)return;const n=S.sel.size;$('#selBar').hidden=false;$('#selN').textContent=n?`${n} sélectionné${n>1?'s':''}`:'Touchez pour sélectionner';
  $$('#selBar [data-sa=move],#selBar [data-sa=del]').forEach(b=>b.disabled=!n);$('#selBar [data-sa=ren]').disabled=n!==1}
document.addEventListener('click',e=>{if(!S.sel)return;const t=e.target.closest('[data-sid]');if(!t||!$('#view').contains(t)||e.target.closest('.more'))return;
  e.preventDefault();e.stopPropagation();const id=t.dataset.sid;S.sel.has(id)?S.sel.delete(id):S.sel.add(id);t.classList.toggle('picked',S.sel.has(id));buzz(8);selSync()},true);
$('#selBar').addEventListener('click',async e=>{const b=e.target.closest('[data-sa]');if(!b||b.disabled)return;const a=b.dataset.sa,ids=[...(S.sel||[])];buzz(8);
  if(a==='done')return selEnd();
  if(a==='all'){$$('#view [data-sid]').forEach(x=>{S.sel.add(x.dataset.sid);x.classList.add('picked')});return selSync()}
  if(a==='move')return openMove(ids);
  if(a==='ren'){const id=ids[0],it=S.items.find(x=>x.id===id);if(!it)return;const r=await promptDlg('Renommer','',it.nom,'Renommer','pen');if(!r||!r.v||r.v===it.nom)return;
    try{await adm('update',{id,name:r.v.replace(/[\/\\]/g,'-')});toast('Renommé ✓');selEnd();invalidate();load()}catch(err){toast(isNet(err)?NET:err.message)}return}
  if(a==='del'){const ok=await confirmDlg(`Supprimer ${ids.length} élément${ids.length>1?'s':''} ?`,'Ils sont placés dans la corbeille Google Drive.','Supprimer');closeSheet();if(!ok)return;
    let n=0;for(const id of ids){try{await adm('delete',{id});n++}catch(err){}}toast(`${n} supprimé${n>1?'s':''} ✓`);selEnd();invalidate();load()}});
/* déplacer : on choisit le dossier de destination en naviguant dans l'arbre */
const MV={ids:[],path:[]};
function openMove(ids,from){MV.ids=ids;MV.path=(from||S.hist).map(h=>({id:h.id,nom:h.nom}));$('#mvSub').textContent=`${ids.length} élément${ids.length>1?'s':''}`;drawMove();openSheet('p-move')}
function drawMove(){const P=MV.path,last=P[P.length-1],kids=subs(last.id);if(kids===null)getFolder(last.id).then(drawMove).catch(()=>{});
  $('#mvPath').innerHTML=P.map((h,k)=>`<button type="button" data-mvj="${k}">${esc(k?h.nom:tiny(h.nom))}</button>`).join(ic('chev'));
  const l=(kids||[]).filter(f=>!MV.ids.includes(f.id));
  $('#mvList').innerHTML=kids===null?'<div class="sk"></div>':l.length?l.map(f=>`<div class="row"><button class="rb" type="button" data-mvf="${esc(f.id)}" data-nom="${esc(f.nom)}">${artHTML(f,'art')}<span class="rt"><b>${esc(f.nom)}</b></span><span class="cv">${ic('chev')}</span></button></div>`).join(''):'<p class="hint ctr">Aucun sous-dossier ici.</p>';
  $('#mvGo').textContent='Déplacer ici';$('#mvGo').disabled=P.length<2}
$('#p-move').addEventListener('click',e=>{const b=e.target.closest('[data-mvj],[data-mvf]');if(!b)return;buzz(8);
  if(b.dataset.mvj!=null)MV.path=MV.path.slice(0,+b.dataset.mvj+1);else MV.path.push({id:b.dataset.mvf,nom:b.dataset.nom});drawMove()});
$('#mvGo').onclick=async()=>{const to=MV.path[MV.path.length-1].id,b=$('#mvGo');if(to===cur().id)return toast('Les éléments sont déjà dans ce dossier');b.disabled=true;
  try{const c=cur(),self=c&&MV.ids.includes(c.id),r=await adm('move',{ids:MV.ids,to});closeSheet();buzz([12,60,18]);toast(`${r.moved||MV.ids.length} élément${(r.moved||2)>1?'s':''} déplacé${(r.moved||2)>1?'s':''} ✓`);selEnd();invalidate();
    if(self)navTo([...MV.path.map(h=>({id:h.id,nom:h.nom})),{id:c.id,nom:c.nom}]);else load()}
  catch(err){toast(/inconnue/i.test(err.message)?'Mettez à jour le script Google (Code.gs v3.6) pour déplacer':isNet(err)?NET:err.message,4500)}finally{b.disabled=false}};
/* petite fenêtre de saisie (nouveau dossier, renommer) ; by = demander aussi le nom de la personne */
let prRes=null,prBack='';
function promptDlg(t,p,val,ok,i='folderplus',by=false,back=''){return new Promise(res=>{prBack=back;$('#prT').textContent=t;$('#prP').textContent=p;$('#prP').hidden=!p;$('#prIn').value=val||'';$('#prOk').textContent=ok;$('#prIc').innerHTML=ic(i);
  $('#prBy').hidden=!by;$('#prBy').value='';prRes=res;openSheet('p-prompt');setTimeout(()=>{$('#prIn').focus();$('#prIn').select()},350)})}
function prDone(v){const r=prRes;prRes=null;if(prBack){openSheet(prBack);prBack=''}else closeSheet();r&&r(v?{v:$('#prIn').value.replace(/\s+/g,' ').trim(),by:$('#prBy').value.trim()}:null)}
$('#p-prompt').addEventListener('click',e=>{const b=e.target.closest('[data-pr]');if(b)prDone(b.dataset.pr==='1')});
$('#prIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();prDone(true)}});
/* nouveau dossier vide, ici (tout le monde ; l'admin directement, les visiteurs par le script, action mkdir) */
async function openMk(){const c=cur();if(!c)return;const myName=(S.me&&S.me.name)||store.get('bc_name')||'';
  const r=await promptDlg('Nouveau dossier',`Dans « ${c.nom} »`,'','Créer','folderplus',!S.adm&&!myName);if(!r)return;
  const nom=r.v.replace(/[\/\\#]/g,' ').trim();if(nom.length<2)return toast('Indiquez le nom du dossier (2 caractères minimum)');
  try{if(S.adm)await adm('create',{parent:c.id,name:nom});
    else{const by=r.by||myName;if(by.length<2)return toast('Indiquez votre nom et prénom');if(r.by)store.set('bc_name',by);
      const x=await post({action:'mkdir',folderId:c.id,nom,by,tk:Object.values(S.tk).join(',')});
      if(!x||!x.success)throw new Error(/Nom et titre/.test(x&&x.error||'')?'Mettez à jour le script Google (Code.gs v3.6) pour créer des dossiers':(x&&x.error)||'Création impossible');
      if(x.pending)toast('Dossier créé : visible après validation');if(x.exists)toast('Ce dossier existe déjà')}
    buzz([12,60,18]);toast('Dossier créé ✓');invalidate();load()}catch(e){toast(isNet(e)?NET:e.message,4500)}}
/* signaler un document (lien cassé, mauvais dossier, droits d'auteur…) */
let REP=null;
function openReport(f){REP={f,why:''};$('#repFor').textContent=f.nom;$('#repTxt').value='';$$('#repWhy button').forEach(b=>b.classList.remove('on'));openSheet('p-report')}
$('#repWhy').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!REP)return;buzz(8);REP.why=b.textContent;$$('#repWhy button').forEach(x=>x.classList.toggle('on',x===b))});
$('#repGo').onclick=async()=>{if(!REP)return;const t=$('#repTxt').value.trim(),reason=[REP.why,t].filter(Boolean).join(' : ');if(!reason)return toast('Choisissez un motif');
  const b=$('#repGo');b.disabled=true;
  try{const r=await post({action:'report',id:REP.f.id,name:REP.f.nom,reason:reason.slice(0,150),by:store.get('bc_name')||''});if(!r.success)throw new Error(r.error||'Envoi impossible');
    closeSheet();buzz([12,60,18]);toast('Merci, l\'administrateur va vérifier')}catch(e){toast(isNet(e)?NET:e.message)}finally{b.disabled=false}};
/* Envoyer : feuille de partage du téléphone (WhatsApp, Messenger…) ; si le navigateur ne la propose pas (Firefox…), menu d'applications */
async function sendUrl(f){const t=f.nom+' : '+f.url;
  if(navigator.share){try{await navigator.share({title:f.nom,text:f.nom,url:f.url});return}catch(e){if(e&&e.name==='AbortError')return}}
  const u=encodeURIComponent(f.url),tx=encodeURIComponent(t),go_=h=>{location.href=h};
  ctxOpen(CTXB||$('#phead'),[],[{i:'msg',l:'WhatsApp',f:()=>window.open('https://wa.me/?text='+tx,'_blank','noopener')},
    {i:'send',l:'Telegram',f:()=>window.open('https://t.me/share/url?url='+u+'&text='+encodeURIComponent(f.nom),'_blank','noopener')},
    {i:'msg',l:'Messenger',f:()=>go_('fb-messenger://share/?link='+u)},
    {i:'msg',l:'SMS',f:()=>go_('sms:?body='+tx)},
    {i:'mail',l:'E-mail',f:()=>go_('mailto:?subject='+encodeURIComponent(f.nom)+'&body='+tx)},
    {i:'copy',l:'Copier le lien',grp:2,f:()=>copyTxt(f.url)}],'Envoyer « '+esc(f.nom)+' »')}
function fileCtx(btn,key){const f=FILES[key];if(!f)return;const ok=/^https?:\/\//i.test(f.url||''),d=fmtDate(f.date);
  const top=[{i:'ext',l:'Ouvrir',off:!ok,f:()=>window.open(f.url,'_blank','noopener')},{i:'copy',l:'Copier le lien',off:!ok,f:()=>copyTxt(f.url)},{i:'send',l:'Envoyer',off:!ok,f:()=>sendUrl(f)}];
  const list=[];if(f.id)list.push({l:'Signaler un problème',i:'flag',f:()=>openReport(f)});if(S.adm&&f.id)list.push({l:'Déplacer',i:'move',f:()=>openMove([f.id])},{l:'Gérer le document',i:'pen',f:()=>openManage(f.id,f.nom,'file')});
  ctxOpen(btn,top,list,[f.by&&`Partagé par ${esc(f.by)}`,d&&esc(d),f.size&&esc(f.size)].filter(Boolean).join(' · '))}
/* annonce générale (définie par l'administrateur) */
/* annonces : générale (clé '') ou propre à une université ; celle de l'université où l'on est passe en premier */
function setNotices(r){if(!r||!('notices' in r||'notice' in r))return;S.notices=r.notices||(r.notice?{'':r.notice}:{});showNotice()}
function showNotice(){const u=here();setNotice(u&&S.notices[u.id]||S.notices['']||null)}
function setNotice(n){S.notice=n||null;const b=$('#notice');
  if(!n||!n.text||store.get('bc_notice')===n.id){b.hidden=true;return}
  b.hidden=false;b.innerHTML=`<span class="bd" style="--c:var(--c-orange)">${ic('megaphone')}</span><span class="nt">${esc(n.text)}${n.url?` <a href="${esc(n.url)}" target="_blank" rel="noopener">En savoir plus</a>`:''}</span><button class="x" type="button" data-a="nclose" aria-label="Masquer">${ic('x')}</button>`}

/* ---------- Recherche tolérante aux fautes (accents, fautes de frappe, mots coupés) ---------- */
const fold=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
function lev(a,b){const m=a.length,n=b.length;if(!m||!n)return Math.max(m,n);let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const sim=(a,b)=>{const L=Math.max(a.length,b.length);return L?1-lev(a,b)/L:0};
function score(q,name){const n=fold(name);if(!n)return 0;if(n.includes(q))return 1+q.length/n.length;
  const qt=q.split(' ').filter(Boolean),nt=n.split(' ');if(!qt.length)return 0;let tot=0;
  qt.forEach(t=>{let best=0;nt.forEach(w=>{let s=sim(t,w);if(t.length>=3&&(w.startsWith(t)||(w.length>2&&t.startsWith(w))))s=Math.max(s,.85);best=Math.max(best,s)});
    if(t.length>=4)best=Math.max(best,sim(t,n.slice(0,t.length+1))*.9);tot+=best});return tot/qt.length}
function variants(q){const f=fold(q),set=new Set([q.trim()]);if(f)set.add(f);
  f.split(' ').filter(t=>t.length>=3).forEach(t=>{set.add(t.slice(0,3));if(t.length>4)set.add(t.slice(0,4));if(t.length>5)set.add(t.slice(-3))});return[...set].slice(0,6)}
let sT;
function clearSearch(silent){S.searching=false;S.q='';S.sk++;clearTimeout(sT);$('#q').value='';$('#clearQ').hidden=true;if(!silent)syncChrome()}
function onQuery(){const v=$('#q').value.trim();$('#clearQ').hidden=!v;clearTimeout(sT);S.q=v;
  if(v.length<2){if(S.searching){S.searching=false;S.sk++;syncChrome();render()}return}
  sT=setTimeout(()=>runSearch(v),260)}
async function runSearch(q){const k=++S.sk;S.searching=true;syncChrome();
  const u=S.scope==='uni'?here():null,root=u&&u.id,hid=(here()||{}).id;
  head('Recherche',u?`« ${esc(q)} » dans ${esc(tiny(u.nom))}`:`« ${esc(q)} » dans toutes les universités`);
  $('#view').innerHTML=loadHTML(`Recherche de « ${q} »`,true);
  try{const ck=fold(q),sk=ck+'|'+(root||'');let all=S.sc[sk];
    if(!all){const rs=await Promise.all(variants(q).map(v=>api(root?{action:'search',q:v,root}:{action:'search',q:v}).catch(()=>null)));if(k!==S.sk)return;
      if(!rs.some(r=>r&&r.success))throw new Error('Recherche indisponible pour le moment.');
      const seen=new Map();rs.forEach(r=>{if(r&&r.success)(r.data||[]).forEach(i=>{const key=i.id||i.url||i.nom;if(!seen.has(key))seen.set(key,i)})});
      const min=ck.length<4?.9:.62;all=[...seen.values()].map(i=>({i,s:Math.max(score(ck,i.nom),score(ck,i.desc||'')*.9)})).filter(x=>x.s>=min).sort((a,b)=>b.s-a.s).map(x=>x.i);
      remember(all);S.sc[sk]=all}
    if(k!==S.sk)return;
    let res=all;
    /* le serveur filtre déjà par université (root) ; sécurité côté site si une réponse plus ancienne n'indique pas uniId */
    if(root)res=res.filter(i=>'uniId' in i?i.uniId===root:!i.uni||fold(i.uni).includes(fold(short(u.nom)))||fold(u.nom).includes(fold(i.uni)));
    else if(hid)res=[...res.filter(i=>i.uniId===hid),...res.filter(i=>i.uniId!==hid)];   // mon université d'abord
    res=res.filter(i=>(S.kind==='all'||i.type===S.kind)&&i.id!==root&&!(VISITOR()&&(i.members||i.mbIn))).map(i=>({...i,uni:[root?'':short(i.uni||''),i.where||''].filter(Boolean).join(' › ')}));
    const fo=res.filter(i=>i.type!=='file'&&isUni(i)),fi=res.filter(i=>i.type==='file');
    $('#view').innerHTML=res.length?(fo.length?gh('Dossiers',fo.length)+`<div class="list">${fo.map((f,n)=>folderRow(f,n,true)).join('')}</div>`:'')+
      (fi.length?gh('Documents',fi.length)+`<div class="list">${fi.map((f,n)=>fileRow(f,n,true)).join('')}</div>`:''):
      empty(`Aucun résultat pour « ${esc(q)} ».`,root?'Essayez « Toutes les universités » ou un mot plus court.':'Vérifiez l\'orthographe ou essayez un mot plus court.','search')}
  catch(e){if(k===S.sk)fail(isNet(e)?NET:e.message,()=>runSearch(q))}}

/* ---------- Épingler ---------- */
function togglePin(){const c=cur();if(!c)return;const i=S.favs.findIndex(f=>f.id===c.id);
  if(i>=0){S.favs.splice(i,1);toast('Retiré des épinglés')}else{S.favs.unshift({id:c.id,nom:c.nom,icon:(S.meta[c.id]||{}).icon||'',uni:S.uni&&S.uni.id,path:S.hist.slice(0,-1)});toast('Épinglé ✓')}
  saveFavs();buzz();renderFolder();renderSide()}
function openPin(id){const f=S.favs.find(x=>x.id===id);if(!f)return;buzz();if(f.url){window.open(f.url,'_blank','noopener');return}navTo(Array.isArray(f.path)?[...f.path,{id:f.id,nom:f.nom}]:[{id:f.id,nom:f.nom}])}

/* épingler un bouton d'accès rapide */
function togglePinBtn(id){const i=S.favs.findIndex(f=>f.id===id);
  if(i>=0){S.favs.splice(i,1);toast('Retiré des épinglés')}
  else{const it=[...S.items,...S.rootLinks,...((S.hist[0]&&S.cache[S.hist[0].id]||{}).data||[])].find(x=>x.id===id);if(!it)return;const p=it.nom.slice(4).split('#'),m=S.meta[id]||{};
    S.favs.unshift({id,nom:p[0],url:p[1]||'',icon:it.icon||m.icon||''});toast('Bouton épinglé ✓')}
  saveFavs();buzz();render()}

/* ---------- Feuilles et dialogues ---------- */
let cfRes=null;
function openSheet(id){$$('.panel').forEach(p=>p.classList.toggle('on',p.id===id));document.body.classList.add('lock');requestAnimationFrame(()=>$('#ov').classList.add('on'))}
function closeSheet(){if(cfRes){const r=cfRes;cfRes=null;r(false)}if(typeof prRes!=='undefined'&&prRes){const r=prRes;prRes=null;r(null)}$('#ov').classList.remove('on');document.body.classList.remove('lock');
  setTimeout(()=>{if(!$('#ov').classList.contains('on'))$$('.panel').forEach(p=>p.classList.remove('on'))},450)}
$('#ov').addEventListener('click',e=>{const c=e.target.closest('[data-cf]');if(c){const r=cfRes;cfRes=null;r&&r(c.dataset.cf==='1');return}
  if(e.target===$('#ov')||e.target.closest('[data-close]'))closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){ctxClose();closeSheet()}});
let tT;function toast(m,ms=2600){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),ms)}
const shake=el=>{el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')};
function askPass(f,then){S.lock={f,then};$('#passFor').textContent=f.nom;$('#pass').value='';openSheet('p-lock');setTimeout(()=>$('#pass').focus(),400)}
async function checkPass(){const L=S.lock,pw=$('#pass').value,b=$('#open');if(!L)return;if(!pw)return toast('Saisissez le mot de passe');
  b.disabled=true;b.textContent='Vérification…';
  try{const r=await api({action:'verify',id:L.f.id,pass:pw});
    if(r.valid){S.tk[L.f.id]=r.token;saveTk();delete S.cache[L.f.id];closeSheet();buzz([12,60,18]);setTimeout(L.then,60)}
    else{shake($('#p-lock'));$('#pass').select();buzz([30,40,30]);toast(r.error||'Mot de passe incorrect')}}
  catch(e){toast(NET)}finally{b.disabled=false;b.textContent='Ouvrir'}}

/* ---------- Ajouter (refonte de novembre 2026) : là où l'on est (détecté), puis Fichiers / Dossier / Lien / Nouveau dossier,
   un seul bouton d'envoi, progression avec temps restant. Un fichier par envoi (le script reçoit un fichier à la fois). ---------- */
const TYPES=['Cours','TD','TP','Examen','Résumé'];
const TYPEOF={Cours:'Cours',TD:'TD',TP:'TP',Examens:'Examen','Résumés':'Résumé'};
const A={path:[],typ:'',kind:'',files:[],dir:null,uniAll:false};
const subs=id=>{const r=id&&S.cache[id];return r?(r.data||[]).filter(i=>isUni(i)&&(!i.locked||S.tk[i.id]||S.adm)).sort(byName):null};
function need(f){if(f&&f.id&&!S.cache[f.id]&&!S.pend[f.id])getFolder(f.id).then(()=>drawAdd()).catch(()=>{})}
const chip=(cls,attrs,txt,i='')=>`<button type="button" class="chip${cls}" ${attrs}>${i?ic(i):''}${esc(txt)}</button>`;
const hasNew=()=>A.path.some(x=>!x.id);
const typDed=()=>{for(let i=A.path.length-1;i>0;i--){const t=TYPEOF[kindOf(A.path[i].nom).l];if(t)return t}return''};
const locOk=()=>hasNew()?A.path.length===4:A.path.length>=2;
const needType=()=>A.kind&&A.kind!=='mk'&&!typDed();
/* type choisi (Cours, TD…) : le document va dans le sous-dossier de ce type, créé s'il n'existe pas */
const TFN={Cours:'Cours',TD:'TD',TP:'TP',Examen:'Examens','Résumé':'Résumés'};
const typeKid=(id,typ)=>(subs(id)||[]).find(f=>TYPEOF[kindOf(f.nom).l]===typ);
const typeDest=()=>A.typ&&needType()&&!hasNew()&&A.path.length>=2?A.path[A.path.length-1]:null;
async function typeFolder(par,typ){if(!S.cache[par.id])try{await getFolder(par.id)}catch(e){}
  const f=typeKid(par.id,typ);if(f)return{id:f.id,nom:f.nom};
  const id=await mkFolder(par.id,TFN[typ]);return id?{id,nom:TFN[typ]}:null}
function segSet(seg,i){seg.style.setProperty('--i',i);$$('button',seg).forEach((b,k)=>b.classList.toggle('on',k===i))}
const OKX=/\.(pdf|docx?|odt|pptx?|odp|xlsx?|png|jpe?g|zip)$/i;
const DIRS='webkitdirectory' in document.createElement('input')&&!IOS;
const stem=n=>String(n).replace(/\.[a-z0-9]{2,5}$/i,'').replace(/_+/g,' ').trim().slice(0,80);
const fmtMo=n=>n<1048576?Math.max(1,Math.round(n/1024))+' Ko':(n/1048576).toFixed(1).replace('.',',')+' Mo';
/* 1. Où : chemin détecté (fil d'Ariane) + sous-dossiers en une ligne qui défile + « Nouveau » */
function drawAdd(){const w=$('#addWhere');if(!w)return;const P=A.path,n=P.length,last=P[n-1];let h='';
  if(!last||A.uniAll)h=`<p class="alab">Université ou école</p><div class="chips">${S.unis.length?S.unis.map(u=>chip(last&&P[0].id===u.id?' on':'',`data-pku="${esc(u.id)}" data-nom="${esc(u.nom)}"`,short(u.nom))).join(''):'<span class="chip ld">Chargement…</span>'}</div>`;
  else{const kids=last.id?subs(last.id):[];need(last);
    h=`<div class="loc2">${n===1?badge({id:last.id,nom:last.nom}):artHTML(last,'art')}<div class="lcr"><small>Ranger dans</small><b>${esc(last.nom)}${last.id?'':' <span class="hid">Nouveau</span>'}</b>
<nav class="crumbs sm">${P.slice(0,-1).map((x,k)=>`<button type="button" data-aj="${k}">${esc(k?x.nom:tiny(x.nom))}</button>`).join(ic('chev'))}${n===1?`<button type="button" data-pkuall>${ic('swap')}Changer</button>`:''}</nav></div></div>
<div class="kidrow">${kids===null?'<span class="chip ld">Recherche des sous-dossiers…</span>':kids.map(f=>chip('',`data-pk="${esc(f.id)}" data-nom="${esc(f.nom)}"`,f.nom,kindOf(f.nom).i)).join('')}${last.id||n<4?chip(' add','data-pkadd','Nouveau','plus'):''}</div>
${!locOk()?`<p class="hint inl">${ic('info')}<span>${hasNew()?'Continuez jusqu\'au module.':'Choisissez au moins le niveau.'}</span></p>`:''}`}
  w.innerHTML=h;hydrateLogos(w);syncAdd()}
/* tout ce qui dépend du choix : tuile active, panneau, titre, type, bouton */
function syncAdd(){const k=A.kind,many=k==='file'&&A.files.length>1,lock=$('#lockChk').checked,grp=many&&$('#grpChk').checked;
  $$('#kinds .kd').forEach(x=>x.classList.toggle('on',x.dataset.kd===k));$('#pane').hidden=!k;
  $('#pFiles').hidden=k!=='file';$('#pDir').hidden=k!=='dir';$('#pLink').hidden=k!=='link';
  const folderName=k==='dir'||k==='mk'||many&&(lock||grp);$('#g-tit').hidden=many&&!lock&&!grp;$('#g-grp').hidden=!many;$('#l-tit').textContent=folderName?'Nom du dossier':'Titre';
  $('#f-tit').placeholder=folderName?'Ex. : TD de génétique 2026':'Ex. : Chapitre 3, la réplication de l\'ADN';
  $('#typeRow').innerHTML=needType()&&locOk()?`<div class="cb"><span class="lab">Type de document</span><button class="dd${A.typ?' on':''}" type="button" data-typdd><span>${esc(A.typ||'Choisir le type')}</span>${ic('down')}</button>${(()=>{const t=typeDest();if(!t)return'';const f=typeKid(t.id,A.typ);
    return`<p class="hint" style="margin:6px 14px 0">${f?`Rangé dans le dossier « ${esc(f.nom)} » de ${esc(t.nom)}.`:`Un dossier « ${esc(TFN[A.typ])} » sera créé dans ${esc(t.nom)} pour le ranger.`}</p>`})()}</div>`:'';
  $('#optBox').hidden=k==='mk';$('#g-pwopt').hidden=k==='mk';
  const n=A.files.length,lab=k==='file'?(n>1?`Envoyer ${n} fichiers`:'Envoyer le fichier'):k==='dir'?(A.zip?'Importer le dossier':A.dir?`Envoyer le dossier (${A.dir.files.length} fichier${A.dir.files.length>1?'s':''})`:'Envoyer le dossier'):k==='link'?'Partager le lien':'Créer le dossier';
  if(!$('#send').disabled)$('#send').textContent=lab;
  if(k==='file')$('#pFiles').innerHTML=A.files.map((f,i)=>{const[t,c]=ftype({nom:f.name});return`<div class="row"><span class="fart sm" style="--c:var(--c-${c})">${t}</span><span class="rt"><b>${esc(f.name)}</b><small class="mt">${fmtMo(f.size)}</small></span><button class="more" type="button" data-rmf="${i}" aria-label="Retirer">${ic('x')}</button></div>`}).join('')+
    `<div class="row"><label class="rb addmore" for="f-file">${ic('plus')}<span class="rt"><b>${n?'Ajouter d\'autres fichiers':'Choisir des fichiers'}</b><small>PDF, Word, PowerPoint, Excel, image ou ZIP · ${MAX_MB} Mo maximum chacun</small></span></label></div>`;
  const zipHelp=`<p class="hint zh">${IOS?'Sur iPhone : app Fichiers, appui long sur le dossier, puis « Compresser ». Choisissez ensuite le .zip ici.':ANDR?'Sur Android : dans Fichiers ou Mes fichiers, sélectionnez le dossier, puis « Compresser ». Choisissez ensuite le .zip ici.':'Compressez le dossier en .zip, puis choisissez-le ici.'} Google le décompresse et recrée ses sous-dossiers (200 fichiers, ${MAX_MB} Mo au plus).</p>`;
  if(k==='dir'&&(A.zip||MOB||!DIRS)){$('#pDir').innerHTML=A.zip?`<div class="row"><span class="fart sm" style="--c:var(--c-orange)">ZIP</span><span class="rt"><b>${esc(A.zip.name)}</b><small class="mt">${fmtMo(A.zip.size)} · décompressé par Google, sous-dossiers recréés</small></span><label class="more" for="f-zip" aria-label="Changer de fichier">${ic('swap')}</label></div>`:`<div class="row"><label class="rb addmore" for="f-zip">${ic('folder')}<span class="rt"><b>Choisir le dossier compressé (.zip)</b><small>Ses sous-dossiers sont recréés tels quels</small></span></label></div>`;
    $('#zipHelp').innerHTML=A.zip?'':zipHelp}
  else if(k==='dir')$('#pDir').innerHTML=A.dir?`<div class="row"><span class="fart sm" style="--c:var(--c-orange)">${ic('folder')}</span><span class="rt"><b>${esc(A.dir.name)}</b><small class="mt">${A.dir.files.length} fichier${A.dir.files.length>1?'s':''}${A.dir.subs?` · ${A.dir.subs} sous-dossier${A.dir.subs>1?'s':''}`:''} · ${fmtMo(A.dir.size)}${A.dir.skip?` · ${A.dir.skip} ignoré${A.dir.skip>1?'s':''}`:''}</small></span><label class="more" for="f-dir" aria-label="Changer de dossier">${ic('swap')}</label></div>`:`<div class="row"><label class="rb addmore" for="f-dir">${ic('folder')}<span class="rt"><b>Choisir un dossier</b><small>Les sous-dossiers sont recréés tels quels</small></span></label></div><div class="row"><label class="rb addmore" for="f-zip">${ic('layers')}<span class="rt"><b>Ou importer un dossier compressé (.zip)</b><small>Google le décompresse</small></span></label></div>`;
  if(!(k==='dir'&&(A.zip||MOB||!DIRS)))$('#zipHelp').innerHTML=''}
function openShare(){const inF=S.view==='folder'&&S.hist.length;
  A.path=inF?S.hist.map(h=>({id:h.id,nom:h.nom})):S.uni?[{id:S.uni.id,nom:S.uni.nom}]:[];A.typ='';A.uniAll=!A.path.length;A.kind='';A.files=[];A.dir=null;A.zip=null;$('#grpChk').checked=false;
  $('#form').hidden=false;$('#addOk').hidden=true;$('#prog').hidden=true;$$('.bad',$('#form')).forEach(i=>i.classList.remove('bad'));
  ['f-tit','f-dsc','f-lien','f-pw'].forEach(i=>$('#'+i).value='');$('#lockChk').checked=false;$('#g-pw').hidden=true;$('#optBox').open=false;
  const n=(S.me&&S.me.name)||store.get('bc_name')||'';$('#f-nom').value=n;$('#g-nom').hidden=!!n;
  $('#shareSub').textContent=inF&&S.hist.length>1?'Rangé ici, ou dans un sous-dossier ci-dessous.':'Choisissez où le ranger.';
  if(!S.unis.length)getFolder(null).then(r=>{useRoot(r);drawAdd()}).catch(()=>{});
  openSheet('p-share');drawAdd();$('#p-share .sc').scrollTop=0}
$('#addWhere').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;buzz(8);
  if(d.aj!=null){A.path=A.path.slice(0,+d.aj+1);drawAdd();return}
  if('pkuall' in d){A.uniAll=true;drawAdd();return}
  if(d.pku){if(!A.path[0]||A.path[0].id!==d.pku)A.path=[{id:d.pku,nom:d.nom}];A.uniAll=false;drawAdd();return}
  if(d.pk){A.path.push({id:d.pk,nom:d.nom});drawAdd();return}
  if('pkadd' in d){const last=A.path[A.path.length-1];const r=await promptDlg('Nouveau dossier',`Dans « ${last.nom} »`,'','Créer','folderplus',false,'p-share');if(!r)return;
    const v=r.v.replace(/[\/\\#]/g,' ').trim();if(v.length<2)return toast('Indiquez le nom du dossier (2 caractères minimum)');
    const ex=(subs(last.id)||[]).find(f=>fold(f.nom)===fold(v));if(ex){A.path.push({id:ex.id,nom:ex.nom});drawAdd();return}
    if(last.id){const id=await mkFolder(last.id,v).catch(err=>{toast(isNet(err)?NET:err.message,4500);return null});if(id===null)return;
      if(id){delete S.cache[last.id];A.path.push({id,nom:v});drawAdd();toast('Dossier créé ✓');return}}
    A.path.push({nom:v});drawAdd()}});   // ancien script : créé à l'envoi (chemin complet)
/* crée un dossier vide (admin directement, visiteurs par le script) ; renvoie son id, '' si le script est trop ancien */
async function mkFolder(parent,nom){if(S.adm){const r=await adm('create',{parent,name:nom});return r.id||''}
  const by=(S.me&&S.me.name)||store.get('bc_name')||$('#f-nom').value.trim();if(by.length<2)throw new Error('Indiquez votre nom et prénom');
  const x=await post({action:'mkdir',folderId:parent,nom,by,tk:Object.values(S.tk).join(',')});
  if(x&&x.success)return x.id||'';if(/Nom et titre/.test(x&&x.error||''))return '';throw new Error((x&&x.error)||'Création impossible')}
$('#typeRow').addEventListener('click',e=>{const b=e.target.closest('[data-typdd]');if(!b)return;
  ctxOpen(b,[],TYPES.map(t=>({l:t,chk:A.typ===t,i:({Cours:'book',TD:'pen',TP:'flask',Examen:'award','Résumé':'note'})[t],f:()=>{A.typ=t;buzz(8);syncAdd()}})))});
/* 2. Quoi : tuiles ; Fichiers et Dossier ouvrent directement le sélecteur */
/* téléphone : pas de choix de dossier (Android, iPhone) → on importe le dossier compressé en .zip, Google le décompresse */
const MOB=IOS||ANDR;
if(MOB||!DIRS){const t=$('#kdDir');t.setAttribute('for','f-zip');t.querySelector('b').textContent='Dossier';t.querySelector('small').textContent='Compressé en .zip'}
$('#f-zip').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  if(!/\.zip$/i.test(f.name))return toast('Choisissez un fichier .zip');if(f.size>MAX_MB*1048576)return toast(`Ce .zip dépasse ${MAX_MB} Mo : partagez plutôt un lien Drive`,4000);
  A.zip=f;A.dir=null;A.kind='dir';$('#f-tit').value=stem(f.name).slice(0,80);buzz(8);syncAdd()};
$('#grpChk').onchange=()=>{buzz(8);syncAdd();if($('#grpChk').checked)setTimeout(()=>$('#f-tit').focus(),60)};
$('#kinds').addEventListener('click',e=>{const t=e.target.closest('.kd');if(!t)return;buzz(8);const k=t.dataset.kd;
  if(k==='link'||k==='mk'){A.kind=k;syncAdd();setTimeout(()=>(k==='link'?$('#f-lien'):$('#f-tit')).focus(),60)}});
function keep(list){const all=[...list].filter(f=>!(f.webkitRelativePath||f.name).split('/').some(x=>x.startsWith('.')));
  const ok=all.filter(f=>OKX.test(f.name)&&f.size<=MAX_MB*1048576);return{ok,skip:all.length-ok.length}}
$('#f-file').onchange=e=>{const{ok,skip}=keep(e.target.files);e.target.value='';if(!ok.length&&!skip)return;
  const seen=new Set(A.files.map(f=>f.name+f.size));A.files=[...A.files,...ok.filter(f=>!seen.has(f.name+f.size))];A.kind='file';
  if(skip)toast(`${skip} fichier${skip>1?'s':''} ignoré${skip>1?'s':''} : type non accepté ou plus de ${MAX_MB} Mo`,4000);
  if(A.files.length===1&&!$('#f-tit').value.trim())$('#f-tit').value=stem(A.files[0].name);buzz(8);syncAdd()};
$('#pFiles').addEventListener('click',e=>{const b=e.target.closest('[data-rmf]');if(!b)return;buzz(8);A.files.splice(+b.dataset.rmf,1);if(!A.files.length)A.kind='';syncAdd()});
$('#f-dir').onchange=e=>{const list=[...e.target.files],{ok,skip}=keep(list);e.target.value='';if(!list.length)return;const first=(list[0].webkitRelativePath||'').split('/')[0];
  if(!ok.length)return toast('Aucun fichier accepté dans ce dossier');
  A.dir={name:first,files:ok,skip,size:ok.reduce((t,f)=>t+f.size,0),subs:new Set(ok.map(f=>f.webkitRelativePath.split('/').slice(1,-1).join('/')).filter(Boolean)).size};
  A.kind='dir';$('#f-tit').value=first.slice(0,80);buzz(8);syncAdd()};
/* lien : fichier ou dossier (Drive, OneDrive, Moodle…) */
$('#pasteBtn').hidden=!(navigator.clipboard&&navigator.clipboard.readText);
$('#pasteBtn').onclick=async()=>{try{const t=(await navigator.clipboard.readText()).trim();if(t){$('#f-lien').value=t;linkKind();buzz(8)}}catch(e){toast('Collez le lien directement dans le champ')}};
function linkKind(){const u=$('#f-lien').value.trim(),dir=/\/folders\/|\/drive\/folders|sharepoint\.com\/.*\/Forms\/|\/s\/[^/]+\/folder/i.test(u);
  $('#linkKind').textContent=!u?'Lien Drive, OneDrive, Moodle… vérifiez qu\'il est ouvert à tous ceux qui ont le lien.':!/^https?:\/\//i.test(u)?'Le lien doit commencer par https://':dir?'Lien vers un dossier : il s\'ouvrira tel quel, avec tout son contenu.':'Lien vers un fichier ou une page.'}
$('#f-lien').addEventListener('input',linkKind);
$('#form').addEventListener('input',e=>e.target.classList.remove('bad'));
$('#lockChk').onchange=e=>{buzz(8);$('#g-pw').hidden=!e.target.checked;syncAdd();if(e.target.checked)$('#f-pw').focus()};
const b64=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(',')[1]);r.onerror=ko;r.readAsDataURL(f)});
/* progression : estimée (le navigateur ne donne pas l'avancement d'un envoi vers Google) ; affichée rapide au début, plus lente à la fin */
const PG={};let PGT=null;
const leftTxt=s=>s<6?'quelques secondes':s<60?`environ ${Math.ceil(s/5)*5} s`:`environ ${Math.floor(s/60)} min${s%60>=15?' '+String(Math.round(s%60/15)*15).padStart(2,'0')+' s':''}`;
function pgStart(jobs){Object.assign(PG,{sizes:jobs.map(j=>j.file?j.file.size:3e3),doneW:0,n:jobs.length,i:0,t:Date.now(),size:0,rate:300,ovh:2500,shown:0});   // rate en octets/ms
  $('#prog').hidden=false;pgTick();clearInterval(PGT);PGT=setInterval(pgTick,150)}
function pgFile(i,size){PG.i=i;PG.size=size;PG.t=Date.now()}
const pgEst=sz=>sz*1.37/PG.rate+PG.ovh;   // base64 : +37 %
function pgDone(){const dt=Date.now()-PG.t,est=pgEst(PG.size);PG.doneW+=est;
  if(PG.size>200e3)PG.rate=PG.rate*.4+PG.size*1.37/Math.max(300,dt-PG.ovh)*.6;else PG.ovh=PG.ovh*.5+dt*.5}
function pgTick(){const exp=pgEst(PG.size),el=Date.now()-PG.t,inF=Math.min(.92,el/exp),rem=PG.sizes.slice(PG.i+1).reduce((t,sz)=>t+pgEst(sz),0);
  const real=Math.min(1,(PG.doneW+exp*inF)/Math.max(1,PG.doneW+exp+rem));
  PG.shown=Math.max(PG.shown,1-Math.pow(1-real,2.2));   // astuce : avance vite au début, ralentit à la fin
  $('#prog .pbar span').style.width=(PG.shown*100).toFixed(1)+'%';
  $('#progTx').textContent=`${PG.n>1?`Envoi ${Math.min(PG.i+1,PG.n)} sur ${PG.n} · `:'Envoi en cours · '}${leftTxt((Math.max(0,exp-el)+rem)/1000)} restantes`.replace('quelques secondes restantes','encore quelques secondes')}
function pgEnd(){clearInterval(PGT);$('#prog .pbar span').style.width='100%';$('#progTx').textContent='Terminé'}
function validate(f){let first=null;
  $$('[required]',f).forEach(el=>{if(el.disabled||el.closest('[hidden]'))return;const bad=!el.value.trim();el.classList.toggle('bad',bad);if(bad&&!first)first=el});
  if(first){first.focus();toast('Merci de remplir les champs obligatoires');return false}
  const em=$('#f-email').value.trim();if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){$('#f-email').classList.add('bad');toast('Adresse e-mail invalide : corrigez-la ou laissez le champ vide');return false}return true}
function addOk(title,text,fails,h,pending){
  $('#addOk').innerHTML=`<div class="schok"><span class="okc">${ic('check')}</span><h3>${title}</h3><p>${text}</p>
${fails.length?`<p class="hint">${fails.length} non envoyé${fails.length>1?'s':''} : ${esc(fails.slice(0,4).join(' ; '))}${fails.length>4?'…':''}</p>`:''}
<div class="btns"><button class="btn" type="button" id="okAgain">Ajouter autre chose</button>${h.length&&!pending?'<button class="btn pri" type="button" id="okSee">Voir le dossier</button>':'<button class="btn pri" type="button" data-close>Fermer</button>'}</div></div>`;
  $('#form').hidden=true;$('#addOk').hidden=false;$('#p-share .sc').scrollTop=0;
  $('#okAgain').onclick=()=>{buzz(8);openShare()};
  const see=$('#okSee');if(see)see.onclick=()=>{closeSheet();navTo(h.map(x=>({id:x.id,nom:x.nom})))}}
$('#form').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=$('#send'),k=A.kind;
  if(!k)return toast('Choisissez quoi ajouter : fichiers, dossier, lien ou nouveau dossier');
  if(!locOk())return toast(hasNew()?'Continuez jusqu\'au module : niveau, spécialité puis module':'Choisissez au moins le niveau');
  if(needType()&&!A.typ)return toast('Choisissez le type de document');
  if(!validate(f))return;
  const nom=$('#f-nom').value.trim(),em=$('#f-email').value.trim(),lien=$('#f-lien').value.trim(),name=$('#f-tit').value.replace(/[\/\\#]/g,' ').trim(),lock=$('#lockChk').checked,pw=$('#f-pw').value.trim();
  if(nom.length<2){$('#g-nom').hidden=false;$('#f-nom').classList.add('bad');$('#f-nom').focus();return toast('Indiquez votre nom et prénom')}
  const P=A.path,full=P.slice();let h=full.slice();const kx=h.findIndex(x=>!x.id);if(kx>=0)h=h.slice(0,kx);
  const where=full.map((x,i)=>i?x.nom:tiny(x.nom)).join(' › ');
  /* nouveau dossier vide */
  if(k==='mk'){if(name.length<2){$('#f-tit').classList.add('bad');$('#f-tit').focus();return toast('Indiquez le nom du dossier')}if(hasNew())return toast('Choisissez un dossier existant pour y créer le nouveau');
    store.set('bc_name',nom);b.disabled=true;b.textContent='Création…';
    try{const id=await mkFolder(P[P.length-1].id,name);if(id==='')throw new Error('Mettez à jour le script Google (Code.gs v3.6) pour créer des dossiers vides');
      buzz([12,60,18]);invalidate();load();addOk('Dossier créé !',`« ${esc(name)} » est dans ${esc(where)}. Vous pouvez y ajouter des cours.`,[],[...h,{id,nom:name}],false)}
    catch(err){toast(isNet(err)?NET:err.message,4500)}finally{b.disabled=false;syncAdd()}return}
  const o={site:f.elements.site.value,nom,mode:em?'email':'anon',description:$('#f-dsc').value.trim(),type:typDed()||A.typ};
  if(em)o.email=em;
  if(!hasNew())o.folderId=P[P.length-1].id;else Object.assign(o,{universite:P[0].nom,niveau:P[1].nom,specialite:P[2].nom,module:P[3].nom});
  const tdst=typeDest();let where2=where;
  if(lock&&pw.length<4){$('#f-pw').classList.add('bad');$('#f-pw').focus();return toast('Mot de passe : 4 caractères minimum')}
  let jobs=[],label=name;
  if(k==='link'){if(!/^https?:\/\//i.test(lien)){$('#f-lien').classList.add('bad');$('#f-lien').focus();return toast('Collez un lien valide qui commence par https://')}if(!name){$('#f-tit').classList.add('bad');$('#f-tit').focus();return toast('Donnez un titre au lien')}jobs=[{titre:name,lien}]}
  else if(k==='dir'&&A.zip){if(!name)return toast('Indiquez le nom du dossier');jobs=[{file:A.zip,titre:name,unzip:1}]}
  else if(k==='dir'){if(!A.dir)return toast(MOB||!DIRS?'Choisissez le dossier compressé (.zip)':'Choisissez un dossier');if(!name)return toast('Indiquez le nom du dossier');
    jobs=A.dir.files.map(x=>({file:x,titre:stem(x.name),chemin:[name,...x.webkitRelativePath.split('/').slice(1,-1).map(s=>s.replace(/[\/\\#]/g,' ').trim()).filter(Boolean)]}))}
  else{if(!A.files.length)return toast('Choisissez un ou plusieurs fichiers');
    if(A.files.length===1)jobs=[{file:A.files[0],titre:name||stem(A.files[0].name)}];
    else{const grp=$('#grpChk').checked;if((lock||grp)&&!name){$('#f-tit').classList.add('bad');$('#f-tit').focus();return toast(lock?'Indiquez le nom du dossier protégé':'Indiquez le nom du nouveau dossier')}
      jobs=A.files.map(x=>({file:x,titre:stem(x.name),chemin:lock||grp?[name]:null}));if(!lock&&!grp)label=`${jobs.length} fichiers`}}
  store.set('bc_name',nom);const n=jobs.length;let done=0,pending=false;const fails=[];
  /* dossier du type (TD, TP…) : trouvé ou créé avant l'envoi */
  if(tdst){b.disabled=true;b.textContent=`Dossier « ${TFN[A.typ]} »…`;
    try{const tf=await typeFolder(tdst,A.typ);if(tf){o.folderId=tf.id;h=[...h,tf];where2=where+' › '+tf.nom}}
    catch(err){b.disabled=false;syncAdd();return toast(isNet(err)?NET:err.message,4500)}}
  b.disabled=true;b.textContent=n>1?`Envoi de ${n} éléments…`:'Envoi…';pgStart(jobs);$('#prog').scrollIntoView({behavior:'smooth',block:'nearest'});
  try{for(let i=0;i<n;i++){const j=jobs[i],q={...o,titre:j.titre};pgFile(i,j.file?j.file.size:3e3);
      if(j.chemin)q.chemin=j.chemin;if(j.unzip)q.unzip=1;if(lock&&(!j.chemin||i===0))q.mdp=pw;
      q.tk=Object.values(S.tk).join(',');
      if(j.lien)q.lien=j.lien;else{try{q.fileB64=await b64(j.file)}catch(err){fails.push(`${j.titre} : fichier illisible`);pgDone();continue}q.fileName=j.file.name;q.mime=j.file.type}
      let r;try{r=await post(q)}catch(err){if(isNet(err)&&!done)throw err;r={success:false,error:isNet(err)?'connexion perdue':err.message}}
      pgDone();
      if(j.unzip&&r.success&&!r.count)r={success:false,error:'Mettez à jour le script Google (Code.gs v4.5) pour importer un .zip'};
      if(r.success){done+=j.unzip?r.count:1;if(j.unzip&&r.skipped)fails.push(`${r.skipped} fichier${r.skipped>1?'s':''} du .zip ignoré${r.skipped>1?'s':''} (type non accepté ou caché)`);pending=pending||!!r.pending;if(r.tk&&r.dossier){S.tk[r.dossier]=r.tk;saveTk()}
        if(i===0&&j.chemin&&!('dossier' in r)&&n>1)throw new Error('Pour importer un dossier, mettez à jour le script Google (Code.gs v3.6). Le premier fichier a été envoyé.')}
      else{fails.push(`${j.titre} : ${r.error||'refusé'}`);if(!done&&fails.length>=3)throw new Error(r.error||'L\'envoi a échoué, réessayez dans un instant')}}
    if(!done)throw new Error(fails[0]||'L\'envoi a échoué, réessayez dans un instant');
    pgEnd();buzz([12,60,18]);
    const mine=json(store.get('bc_mine'),[]);mine.unshift({t:label,ty:o.type,w:where2,h:h.map(x=>({id:x.id,nom:x.nom})),p:pending,u:k==='link'?1:0,d:Date.now()});store.set('bc_mine',JSON.stringify(mine.slice(0,30)));
    const asDir=k==='dir'||n>1&&(lock||$('#grpChk').checked);
    addOk(pending?'Merci, c\'est envoyé !':done>1?`Merci, ${done} fichiers en ligne !`:'Merci, c\'est en ligne !',
      `${asDir?`Le dossier « ${esc(label)} » (${done} fichier${done>1?'s':''})`:n>1?`${done} fichiers`:`« ${esc(label)} »`}${pending?' sera visible dès qu\'il aura été vérifié.':' '+(n>1&&!asDir?'sont rangés':'est rangé')+' dans '+esc(where2)+'.'}`,fails,h,pending);
    invalidate();load()}
  catch(err){clearInterval(PGT);$('#prog').hidden=true;toast(isNet(err)?NET:err.message,4500);if(done){invalidate();load()}}finally{b.disabled=false;syncAdd()}});

/* ---------- Administration ---------- */
function setAdmin(tok){S.adm=tok||'';sess.set('bc_adm',tok||null);syncAdm();invalidate();if(!S.adm&&S.view==='admin')goHome();else load()}
function syncAdm(){buildNav();const b=$('#admBtn');b.innerHTML=ic(S.adm?'shieldok':'shield');b.classList.toggle('on',!!S.adm);
  b.setAttribute('aria-label',S.adm?'Espace administrateur (connecté)':'Connexion administrateur');document.body.classList.toggle('is-adm',!!S.adm)}
async function doLogin(){const u=$('#a-user').value.trim(),p=$('#a-pass').value,b=$('#a-go');if(!u||!p)return toast('Identifiant et mot de passe requis');
  b.disabled=true;b.textContent='Connexion…';
  try{const r=await post({action:'admin',op:'login',user:u,pass:p});if(!r.success||!r.token)throw new Error(r.error||'Identifiants incorrects');
    closeSheet();setAdmin(r.token);go('admin');toast('Connecté en administrateur')}
  catch(e){shake($('#p-login'));toast(isNet(e)?NET:e.message)}finally{b.disabled=false;b.textContent='Connexion'}}
/* espace admin : annonce générale, derniers dépôts, éléments protégés */
function fillNotice(){const n=S.notices[$('#a-nuni').value]||{};$('#a-ntext').value=n.text||'';$('#a-nurl').value=n.url||''}
/* connexion à un compte existant (e-mail + mot de passe), code de réinitialisation */
async function accLogin(a,b){const L=S.lg,mi=$('#lgMail'),em=(mi?mi.value:L.email).trim().toLowerCase();
  if(mi&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){mi.classList.add('bad');mi.focus();return toast('E-mail invalide')}L.email=em;
  const q={action:'compte',email:em};
  if(a==='lgo'){const p=$('#lgPw').value;if(!p){$('#lgPw').focus();return toast('Indiquez votre mot de passe')}Object.assign(q,{op:'login',pass:p})}
  else if(a==='lgsend')q.op='forgot';
  else{const c=$('#lgCode').value.trim(),p=$('#lgPw').value;if(!/^\d{6}$/.test(c)){$('#lgCode').focus();return toast('Le code a 6 chiffres')}if(p.length<6){$('#lgPw').focus();return toast('Mot de passe : 6 caractères minimum')}Object.assign(q,{op:'reset',code:c,pass:p})}
  const t0=b.innerHTML;b.disabled=true;b.innerHTML=`<span class="spin sm" aria-hidden="true">${'<i></i>'.repeat(8)}</span>Un instant…`;
  try{const r=await post(q);if(!r||!r.success)throw new Error(r&&r.error?(/inconnue|Nom et titre|Identifiant invalide/i.test(r.error)?'Mettez à jour le script Google (Code.gs v4.1)':r.error):'Connexion impossible');
    if(a==='lgsend'){L.m='f2';S.onbDir=1;renderWelcome();return}
    applyProfile(r.profile);S.lg=null;S.onb=0;buzz([12,60,18]);goHome();setTimeout(()=>toast(`Bon retour, ${first()} !`),300)}
  catch(err){toast(isNet(err)?NET:err.message,4500)}finally{if(b.isConnected){b.disabled=false;b.innerHTML=t0}}}
/* ---------- Admin : comptes (Code.gs v3.8), derniers dépôts et éléments protégés : 6 derniers, puis « Tout voir et exporter » ---------- */
const ACC={l:[],sheet:''};
const roleL=k=>{const r=ROLES.find(x=>x[0]===k);return r?r[1].split(' ou ')[0]:''};
const dtL=v=>{if(/^\d{2}\/\d{2}\/\d{4}/.test(v||''))return v;const x=new Date(v);return isNaN(x)?String(v||''):x.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})};
const accRow=a=>`<div class="row"><span class="av sm">${esc(initials(a.name))||ic('user')}</span><span class="rt"><b>${esc(a.name)}${a.pass?'<span class="hid">Synchronisé</span>':''}</b>${a.email?`<a class="accm" href="mailto:${esc(a.email)}">${esc(a.email)}</a>`:''}<small>${esc([roleL(a.role),a.level,a.uni&&tiny(a.uni),dtL(a.date)].filter(Boolean).join(' · '))}</small>${a.pw?`<button class="accpw" type="button" data-a="copy" data-v="${esc(a.pw)}" aria-label="Copier le mot de passe">${ic('lock')}<span class="mono">${esc(a.pw)}</span>${ic('copy')}</button>`:a.pass?'<small class="accpw0">Mot de passe : visible à sa prochaine connexion</small>':''}</span><button class="more" type="button" data-acc="pw" data-id="${esc(a.id)}" aria-label="Nouveau mot de passe pour ${esc(a.name)}">${ic('lock')}</button><button class="more" type="button" data-acc="del" data-id="${esc(a.id)}" aria-label="Supprimer le compte de ${esc(a.name)}">${ic('trash')}</button></div>`;
const depRow=x=>`<div class="row"><span class="bd" style="--c:var(--c-${x.pending?'orange':'blue'})">${ic('file')}</span><span class="rt"><b>${esc(x.name)}${x.pending?'<span class="hid">En attente</span>':''}</b><small>${esc([x.by,x.uni&&tiny(x.uni),x.level,x.date].filter(Boolean).join(' · '))}</small></span>${x.pending?`<button class="more pub" type="button" data-a="publish" data-id="${esc(x.id)}" aria-label="Publier">${ic('check')}</button>`:''}<button class="more" type="button" data-a="manage" data-id="${esc(x.id)}" data-nom="${esc(x.name)}" data-t="file" aria-label="Gérer">${ic('more')}</button></div>`;
const pwRow=x=>`<div class="row"><span class="bd" style="--c:var(--c-orange)">${ic(x.type==='folder'||x.type==='Dossier'?'folder':'file')}</span><span class="rt" style="padding:10px 0"><b>${esc(x.name)}</b><small class="mono">${esc(x.pw)}</small>${x.path?`<small>${esc(x.path)}</small>`:''}</span><button class="more" type="button" data-a="copy" data-v="${esc(x.pw)}" aria-label="Copier">${ic('copy')}</button><button class="more" type="button" data-a="manage" data-id="${esc(x.id)}" data-nom="${esc(x.name)}" data-t="${x.type==='Dossier'||x.type==='folder'?'folder':'file'}" aria-label="Gérer">${ic('more')}</button></div>`;
const allBtn=(k,n)=>`<button class="btn wide exo" type="button" data-exo="${k}">${ic('layers')}Tout voir et exporter${n?` (${n})`:''}</button>`;
function drawAcc(){const l=[...ACC.l].sort((a,b)=>String(b.date).localeCompare(String(a.date))),mails=[...new Set(l.map(a=>a.email).filter(Boolean))];
  $('#accCount').textContent=l.length||'';
  $('#accList').innerHTML=l.length?`<div class="grp acc">${l.slice(0,6).map(accRow).join('')}</div>`:`<p class="hint">Aucun compte pour l'instant : chaque personne qui crée son espace apparaît ici.</p>`;
  $('#accActs').innerHTML=(l.length?allBtn('acc',l.length):'')+(mails.length?`<button class="btn" type="button" data-acc="mails">${ic('copy')}Copier les e-mails (${mails.length})</button>`:'')+(ACC.sheet?`<a class="btn" href="${esc(ACC.sheet)}" target="_blank" rel="noopener">${ic('ext')}Ouvrir dans Google Sheets</a>`:'')}
function loadAcc(){$('#accList').innerHTML='<div class="sk"></div>';$('#accActs').innerHTML='';
  adm('comptes').then(r=>{ACC.l=r.comptes||[];ACC.sheet=r.sheet||'';drawAcc()})
   .catch(e=>{$('#accList').innerHTML=`<p class="hint">${/inconnue/i.test(e.message)?'Pour la liste des comptes, collez Code.gs v3.9 dans Google Apps Script, déployez une nouvelle version, puis exécutez une fois « installerComptes ».':esc(e.message)+' : dans Google Apps Script, exécutez une fois « installerComptes » et autorisez Google Sheets.'}</p>`})}
async function accClick(e){const b=e.target.closest('[data-acc]');if(!b)return;const k=b.dataset.acc,inExp=!!b.closest('#p-exp');
  if(k==='mails'){const src=inExp?expRows():ACC.l;copyTxt([...new Set(src.map(a=>a.email).filter(Boolean))].join(', '));return}
  if(k==='pw'){const a=ACC.l.find(x=>x.id===b.dataset.id);if(!a)return;
    const ok=await confirmDlg('Nouveau mot de passe ?',`Un nouveau mot de passe est créé pour ${a.name} : l'ancien ne marchera plus. Vous le verrez une seule fois pour le lui donner.`,'Créer','lock');closeSheet();
    if(ok)try{const r=await adm('comptepass',{id:a.id});ACC.l.forEach(x=>{if(x.id===a.id){x.pass=true;x.pw=r.pass}});EXP.rows.forEach(x=>{if(x.id===a.id){x.pass=true;x.pw=r.pass}});drawAcc();buzz([12,60,18]);
      const v=await promptDlg('Nouveau mot de passe',`Donnez-le à ${a.name}${a.email?' ('+a.email+')':''}. Il pourra le changer dans Mon espace › Modifier.`,r.pass,'Copier','lock');if(v)copyTxt(r.pass)}
      catch(err){toast(/inconnue/i.test(err.message)?'Mettez à jour le script Google (Code.gs v4.3)':isNet(err)?NET:err.message,4000)}
    if(inExp){openSheet('p-exp');drawExp()}return}
  if(k==='del'){const a=ACC.l.find(x=>x.id===b.dataset.id);if(!a)return;
    const ok=await confirmDlg('Supprimer ce compte ?',`${a.name} disparaît de la liste. Sur son appareil, son espace sera effacé à sa prochaine visite.`,'Supprimer');closeSheet();
    if(ok)try{await adm('comptedel',{ids:[a.id]});ACC.l=ACC.l.filter(x=>x.id!==a.id);EXP.rows=EXP.rows.filter(x=>x.id!==a.id);drawAcc();buzz([12,60,18]);toast('Compte supprimé')}catch(err){toast(isNet(err)?NET:err.message)}
    if(inExp){openSheet('p-exp');drawExp()}}}
$('#admView').addEventListener('click',accClick);$('#p-exp').addEventListener('click',accClick);

/* « Tout voir et exporter » : filtres université, niveau, nombre ; export PDF ou Excel (fabriqués sur l'appareil, sans bibliothèque) */
const EXK={
  dep:{t:'Dépôts des étudiants',f:'depots',row:depRow,cols:[['date','Date',10],['name','Document',32],['by','Par',14],['uni','Université',14],['level','Niveau',9],['path','Emplacement',30],['st','État',9]],
    load:()=>adm('recent',{n:5000}).then(r=>(r.data||[]).map(x=>({...x,st:x.pending?'En attente':'En ligne'})))},
  acc:{t:'Comptes',f:'comptes',row:accRow,cols:[['date','Inscrit le',10],['name','Prénom et nom',22],['email','E-mail',26],['role','Profil',12],['level','Niveau',10],['uni','Université',22],['pass','Mot de passe',11]],
    load:()=>adm('comptes').then(r=>{ACC.l=r.comptes||[];ACC.sheet=r.sheet||'';drawAcc();return[...ACC.l].sort((a,b)=>String(b.date).localeCompare(String(a.date)))})},
  pw:{t:'Éléments protégés',f:'mots-de-passe',row:pwRow,cols:[['name','Nom',24],['type','Type',9],['pw','Mot de passe',14],['uni','Université',16],['level','Niveau',10],['path','Emplacement',32]],
    load:()=>adm('passwords').then(r=>(r.data||[]).map(x=>({...x,type:x.type==='folder'?'Dossier':'Document'})))}};
const EXN=[[0,'Tout'],[6,'6 derniers'],[10,'10 derniers'],[25,'25 derniers'],[50,'50 derniers'],[100,'100 derniers'],[250,'250 derniers']];
const EXP={k:'',rows:[],uni:'',lv:'',n:0};
const expCell=(r,k)=>k==='pass'?(r.pw||(r.pass?'(à sa prochaine connexion)':'Aucun')):k==='date'?dtL(r.date):k==='role'?(roleL(r.role)||r.role||''):String(r[k]==null?'':r[k]);
function expRows(){const l=EXP.rows.filter(r=>(!EXP.uni||r.uni===EXP.uni)&&(!EXP.lv||r.level===EXP.lv));return EXP.n?l.slice(0,EXP.n):l}
function drawExp(){const K=EXK[EXP.k];if(!K)return;const u=[...new Set(EXP.rows.map(r=>r.uni).filter(Boolean))],l=expRows();
  const lv=[...new Set(EXP.rows.filter(r=>!EXP.uni||r.uni===EXP.uni).map(r=>r.level).filter(Boolean))];
  $('#exUni').textContent=EXP.uni?tiny(EXP.uni):'Toutes';$('#exLv').textContent=EXP.lv||'Tous';$('#exNb').textContent=(EXN.find(x=>x[0]===EXP.n)||EXN[0])[1];
  $('[data-ex="uni"]').disabled=!u.length;$('[data-ex="lv"]').disabled=!lv.length;
  $('#exN').textContent=l.length?`${l.length} ligne${l.length>1?'s':''} à exporter`:'Aucune ligne avec ces filtres';
  $$('#p-exp [data-ex="pdf"],#p-exp [data-ex="xlsx"]').forEach(b=>b.disabled=!l.length);
  const mails=EXP.k==='acc'?[...new Set(l.map(a=>a.email).filter(Boolean))]:[];
  $('#exMail').innerHTML=mails.length?`<button class="btn wide" type="button" data-acc="mails">${ic('copy')}Copier les e-mails (${mails.length})</button>`:'';
  $('#exList').innerHTML=l.length?`<div class="grp${EXP.k==='acc'?' acc':''}">${l.slice(0,200).map(K.row).join('')}</div>${l.length>200?`<p class="hint ctr">… et ${l.length-200} autres, toutes dans l'export.</p>`:''}`:''}
async function openExp(k){const K=EXK[k];if(!K)return;Object.assign(EXP,{k,rows:[],uni:'',lv:'',n:0});$('#exT').textContent=K.t;$('#exSub').textContent='Filtrer, puis exporter en PDF ou Excel';
  $('#exList').innerHTML='<div class="sk"></div><div class="sk"></div>';$('#exN').textContent='Chargement…';$('#exMail').innerHTML='';openSheet('p-exp');
  try{EXP.rows=await K.load();if(EXP.k===k)drawExp()}catch(e){$('#exList').innerHTML=empty(esc(isNet(e)?NET:e.message),'Mettez à jour le script Google (Code.gs v3.9).','wifi');$('#exN').textContent=''}}
$('#admView').addEventListener('click',e=>{const b=e.target.closest('[data-exo]');if(b){buzz(8);openExp(b.dataset.exo)}});
$('#p-exp').addEventListener('click',e=>{const b=e.target.closest('[data-ex]');if(!b||b.disabled)return;const k=b.dataset.ex;
  if(k==='uni'){const u=[...new Set(EXP.rows.map(r=>r.uni).filter(Boolean))].sort((a,c)=>a.localeCompare(c));
    ctxOpen(b,[],[{l:'Toutes les universités',chk:!EXP.uni,f:()=>{EXP.uni='';EXP.lv='';drawExp()}},...u.map(x=>({l:esc(x),chk:EXP.uni===x,grp:2,f:()=>{EXP.uni=x;EXP.lv='';drawExp()}}))])}
  else if(k==='lv'){const lv=[...new Set(EXP.rows.filter(r=>!EXP.uni||r.uni===EXP.uni).map(r=>r.level).filter(Boolean))].sort((a,c)=>a.localeCompare(c,'fr',{numeric:true}));
    ctxOpen(b,[],[{l:'Tous les niveaux',chk:!EXP.lv,f:()=>{EXP.lv='';drawExp()}},...lv.map(x=>({l:esc(x),chk:EXP.lv===x,grp:2,f:()=>{EXP.lv=x;drawExp()}}))])}
  else if(k==='n')ctxOpen(b,[],EXN.map(([v,l])=>({l,chk:EXP.n===v,f:()=>{EXP.n=v;drawExp()}})))
  else if(k==='pdf'||k==='xlsx'){buzz(8);try{expFile(k)}catch(err){toast('Export impossible : '+err.message)}}});
function expFile(fmt){const K=EXK[EXP.k],l=expRows(),cols=K.cols,head=cols.map(c=>c[1]),body=l.map(r=>cols.map(c=>expCell(r,c[0])));
  const d=new Date(),day=d.toLocaleDateString('sv-SE'),name=`biocampus-${K.f}-${day}.${fmt}`;
  const filt=[EXP.uni&&'Université : '+EXP.uni,EXP.lv&&'Niveau : '+EXP.lv,EXP.n&&(EXN.find(x=>x[0]===EXP.n)||[])[1]].filter(Boolean).join(' · ');
  const blob=fmt==='xlsx'?xlsxBlob(K.t,head,body,cols.map(c=>c[2])):pdfBlob(`BioCampus · ${K.t}`,`${filt?filt+' · ':''}${body.length} ligne${body.length>1?'s':''} · exporté le ${d.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}`,head,body,cols.map(c=>c[2]));
  const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);toast(`${fmt==='pdf'?'PDF':'Fichier Excel'} enregistré ✓`)}
/* Excel (.xlsx) : quelques fichiers XML rangés dans une archive ZIP sans compression */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=~0;for(let i=0;i<b.length;i++)c=CRCT[(c^b[i])&255]^(c>>>8);return(~c)>>>0};
function zipBlob(files,type){const en=new TextEncoder(),parts=[],cd=[];let off=0;
  for(const f of files){const nm=en.encode(f.n),dd=typeof f.d==='string'?en.encode(f.d):f.d,c=crc32(dd);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,c,true);h.setUint32(18,dd.length,true);h.setUint32(22,dd.length,true);h.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(h.buffer),nm,dd);
    const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(14,0x21,true);e.setUint32(16,c,true);e.setUint32(20,dd.length,true);e.setUint32(24,dd.length,true);e.setUint16(28,nm.length,true);e.setUint32(42,off,true);
    cd.push(new Uint8Array(e.buffer),nm);off+=30+nm.length+dd.length}
  const cl=cd.reduce((a,b)=>a+b.length,0),z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,files.length,true);z.setUint16(10,files.length,true);z.setUint32(12,cl,true);z.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(z.buffer)],{type})}
const xesc=v=>String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function xlsxBlob(title,head,body,w){const X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',NS='http://schemas.openxmlformats.org',col=i=>String.fromCharCode(65+i);
  const cell=(v,r,i,s)=>`<c r="${col(i)}${r}" t="inlineStr"${s?' s="1"':''}><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
  const rows=[head,...body].map((row,k)=>`<row r="${k+1}">${row.map((v,i)=>cell(v,k+1,i,!k)).join('')}</row>`).join('');
  const sheet=`${X}<worksheet xmlns="${NS}/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${w.map((x,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.round(x*1.15)}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${col(head.length-1)}${body.length+1}"/></worksheet>`;
  const sn=xesc(title.replace(/[\[\]:*?\/\\]/g,' ').slice(0,31));
  return zipBlob([
    {n:'[Content_Types].xml',d:`${X}<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {n:'_rels/.rels',d:`${X}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {n:'xl/workbook.xml',d:`${X}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="${sn}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sn.replace(/'/g,"''")}'!$A$1:$${col(head.length-1)}$${body.length+1}</definedName></definedNames></workbook>`},
    {n:'xl/_rels/workbook.xml.rels',d:`${X}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {n:'xl/styles.xml',d:`${X}<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
    {n:'xl/worksheets/sheet1.xml',d:sheet}],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
/* PDF : tableau en Helvetica (accents français en WinAnsi), A4 paysage, plusieurs pages, numéros de page */
const HW=' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
  HWV=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const W1252={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,710:136,8240:137,352:138,8249:139,338:140,381:142,8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,353:154,8250:155,339:156,382:158,376:159};
const pdfCh=c=>{const n=c.codePointAt(0);if(n<128||n>=160&&n<256)return String.fromCharCode(n);if(W1252[n])return String.fromCharCode(W1252[n]);
  if(n===8239||n===8201)return' ';const b=c.normalize('NFD')[0];return b&&b.charCodeAt(0)<128?b:'?'};
const pdfTx=s=>Array.from(String(s).replace(/[\r\n\t]+/g,' '),pdfCh).join('');
const chW=(c,sz,bold)=>{const i=HW.indexOf(c);let w=i>=0?HWV[i]:(()=>{const b=c.normalize('NFD')[0],j=HW.indexOf(b);return j>=0?HWV[j]:556})();return w*sz/1000*(bold?1.06:1)};
const txW=(s,sz,b)=>{let w=0;for(const c of s)w+=chW(c,sz,b);return w};
const fit=(s,max,sz,b)=>{s=String(s);if(txW(s,sz,b)<=max)return s;while(s&&txW(s+'…',sz,b)>max)s=s.slice(0,-1);return s+'…'};
const pesc=s=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
function pdfBlob(title,sub,head,body,w){const PW=842,PH=595,M=36,TW=PW-2*M,tot=w.reduce((a,b)=>a+b,0),cw=w.map(x=>x/tot*TW),FS=8.5,RH=17;
  const txt=(x,y,s,sz,b,g=0)=>`BT /${b?'F2':'F1'} ${sz} Tf ${g} g ${x.toFixed(2)} ${y.toFixed(2)} Td (${pesc(pdfTx(s))}) Tj ET\n`;
  const pages=[];let y=0,cs='';
  const header=()=>{let s=`0.93 g ${M} ${(y-RH+4).toFixed(2)} ${TW} ${RH} re f\n`;let x=M;head.forEach((h,i)=>{s+=txt(x+4,y-8,fit(h,cw[i]-8,FS,1),FS,1);x+=cw[i]});y-=RH;return s};
  const newPage=first=>{if(cs)pages.push(cs);y=PH-M;cs='';if(first){cs+=txt(M,y-14,title,16,1);cs+=txt(M,y-30,sub,9,0,.42);y-=46}cs+=header()};
  newPage(true);
  body.forEach((row,k)=>{if(y-RH<M+18)newPage(false);let x=M;if(k%2)cs+=`0.975 g ${M} ${(y-RH+4).toFixed(2)} ${TW} ${RH} re f\n`;
    row.forEach((v,i)=>{cs+=txt(x+4,y-8,fit(v,cw[i]-8,FS,0),FS,0);x+=cw[i]});y-=RH;cs+=`0.85 G 0.4 w ${M} ${(y+4).toFixed(2)} m ${M+TW} ${(y+4).toFixed(2)} l S\n`});
  pages.push(cs);
  const n=pages.length,objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  const kids=[];pages.forEach((c,i)=>{const po=5+i*2,co=po+1;kids.push(`${po} 0 R`);c+=txt(PW-M-60,M-14,`Page ${i+1} / ${n}`,8,0,.5);
    objs[po]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${co} 0 R >>`;objs[co]=`<< /Length ${c.length} >>\nstream\n${c}endstream`});
  objs[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`;
  let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const xr=[];for(let i=1;i<objs.length;i++){xr[i]=out.length;out+=`${i} 0 obj\n${objs[i]}\nendobj\n`}
  const xo=out.length;out+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`+xr.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF`;
  const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return new Blob([u],{type:'application/pdf'})}
/* ---------- Administrateurs (Code.gs v4.0) : le principal + jusqu'à 3 autres ---------- */
const ADM={l:[],me:'',main:false,max:3,mode:''};
function drawAdms(){const extra=ADM.l.filter(a=>!a.principal).length;
  $('#admList').innerHTML=`<div class="grp acc">${ADM.l.map(a=>`<div class="row"><span class="av sm"${a.principal?' style="background:var(--danger)"':''}>${esc(initials(a.nom))||ic('shield')}</span><span class="rt"><b>${esc(a.nom)}${a.principal?'<span class="hid">Principal</span>':''}${a.u===ADM.me?'<span class="hid">Vous</span>':''}</b><small>${esc(['Identifiant : '+a.u,a.date&&'ajouté le '+a.date].filter(Boolean).join(' · '))}</small></span>${ADM.main&&!a.principal?`<button class="more" type="button" data-adm="del" data-u="${esc(a.u)}" aria-label="Retirer ${esc(a.nom)}">${ic('trash')}</button>`:''}</div>`).join('')}</div>`;
  $('#admActs').innerHTML=(ADM.main&&extra<ADM.max?`<button class="btn wide" type="button" data-adm="add">${ic('plus')}Ajouter un administrateur (${extra}/${ADM.max})</button>`:'')+(!ADM.main&&ADM.me?`<button class="btn wide" type="button" data-adm="pass">${ic('lock')}Changer mon mot de passe</button>`:'')}
function loadAdms(){$('#admList').innerHTML='<div class="sk"></div>';$('#admActs').innerHTML='';
  adm('admins').then(r=>{Object.assign(ADM,{l:r.data||[],me:r.me||'',main:!!r.main,max:r.max||3});drawAdms()})
   .catch(e=>{$('#admList').innerHTML=`<p class="hint">${/inconnue/i.test(e.message)?'Pour avoir plusieurs administrateurs, collez Code.gs v4.0 dans Google Apps Script et déployez une nouvelle version.':esc(e.message)}</p>`})}
function openAdmForm(mode){ADM.mode=mode;const add=mode==='add';$('#aaT').textContent=add?'Ajouter un administrateur':'Changer mon mot de passe';
  $('#aaP').textContent=add?'Il pourra tout gérer sur BioCampus, sauf ajouter ou retirer des administrateurs.':'8 caractères minimum.';
  $('#aaUb').hidden=$('#aaNb').hidden=!add;['aa-u','aa-n','aa-p'].forEach(i=>{$('#'+i).value='';$('#'+i).classList.remove('bad')});$('#aaGo').textContent=add?'Ajouter':'Enregistrer';
  openSheet('p-admadd');setTimeout(()=>$(add?'#aa-u':'#aa-p').focus(),300)}
$('#aaForm').addEventListener('submit',async e=>{e.preventDefault();const add=ADM.mode==='add',u=$('#aa-u').value.trim().toLowerCase(),n=$('#aa-n').value.trim(),pw=$('#aa-p').value,b=$('#aaGo');
  if(add&&!/^[a-z0-9._-]{3,30}$/.test(u)){$('#aa-u').classList.add('bad');$('#aa-u').focus();return toast('Identifiant : 3 à 30 lettres ou chiffres, sans espace')}
  if(pw.length<8){$('#aa-p').classList.add('bad');$('#aa-p').focus();return toast('Mot de passe : 8 caractères minimum')}
  b.disabled=true;try{if(add){await adm('adminadd',{u,nom:n||u,pass:pw});toast(`${n||u} est administrateur ✓`,3200)}else{await adm('adminpass',{pass:pw});toast('Mot de passe changé ✓')}
    buzz([12,60,18]);closeSheet();loadAdms()}catch(err){toast(isNet(err)?NET:err.message,4000)}finally{b.disabled=false}});
$('#admView').addEventListener('click',async e=>{const b=e.target.closest('[data-adm]');if(!b)return;const k=b.dataset.adm;buzz(8);
  if(k==='add'||k==='pass')return openAdmForm(k);
  if(k==='del'){const a=ADM.l.find(x=>x.u===b.dataset.u);if(!a)return;const ok=await confirmDlg('Retirer cet administrateur ?',`${a.nom} (${a.u}) ne pourra plus se connecter ; ses sessions ouvertes sont coupées tout de suite.`,'Retirer');closeSheet();if(!ok)return;
    try{await adm('admindel',{u:a.u});toast('Administrateur retiré');loadAdms()}catch(err){toast(isNet(err)?NET:err.message)}}});
async function fillAdmin(){const u=here();loadAcc();loadAdms();
  $('#a-nuni').innerHTML='<option value="">Toutes les universités</option>'+S.unis.map(x=>`<option value="${esc(x.id)}">${esc(short(x.nom))}${S.notices[x.id]?' •':''}</option>`).join('');
  $('#a-nuni').value=u&&S.notices[u.id]?u.id:'';fillNotice();
  $('#recList').innerHTML=$('#pwList').innerHTML='<div class="sk"></div>';
  $('#statBox').innerHTML='<div class="sk"></div>';$('#repList').innerHTML='';
  adm('stats').then(r=>{$('#statBox').innerHTML=`<div class="stats"><span><b>${r.docs}</b>documents</span><span><b>${r.dossiers}</b>dossiers</span><span><b>${r.attente||0}</b>en attente</span><span><b>${r.signalements||0}</b>signalements</span></div>`+
    (r.unis&&r.unis.length?`<div class="grp">${r.unis.map(u=>`<div class="row">${badge({id:u.id,nom:u.nom})}<span class="rt"><b>${esc(tiny(u.nom))}</b><small>${u.docs} documents · ${u.dossiers} dossiers</small></span></div>`).join('')}</div>`:'');hydrateLogos($('#statBox'))})
   .catch(()=>{$('#statBox').innerHTML='<p class="hint">Statistiques, signalements et validation : collez la version 3 de Code.gs.</p>'});
  adm('settings').then(r=>{$('#a-mod').checked=!!r.moderation;$('#a-pre').hidden=!!r.prechauffage}).catch(()=>{$('#a-pre').hidden=false});
  adm('reports').then(r=>{const l=r.data||[];$('#repCount').textContent=l.length||'';$('#repList').innerHTML=l.length?`<div class="grp">${l.map(x=>`<div class="row"><span class="bd" style="--c:var(--c-red)">${ic('flag')}</span><span class="rt"><b>${esc(x.name||'Document')}</b><small>${esc(x.reason)}${x.by?' · '+esc(x.by):''} · ${esc(x.date||'')}</small></span><button class="more" type="button" data-a="ropen" data-id="${esc(x.id)}" aria-label="Ouvrir">${ic('ext')}</button><button class="more" type="button" data-a="manage" data-id="${esc(x.id)}" data-nom="${esc(x.name||'')}" data-t="file" aria-label="Gérer">${ic('more')}</button><button class="more" type="button" data-a="rdel" data-rid="${esc(x.rid)}" aria-label="Ignorer">${ic('check')}</button></div>`).join('')}</div>`:empty('Aucun signalement','','flag')}).catch(()=>{$('#repList').innerHTML=''});
  adm('recent').then(r=>{const l=r.data||[];$('#recList').innerHTML=l.length?`<div class="grp">${l.slice(0,6).map(depRow).join('')}</div>`+allBtn('dep'):empty('Aucun dépôt récent','','file')})
    .catch(e=>{$('#recList').innerHTML=empty(esc(e.message),'Mettez à jour le script Google (Code.gs) pour cette option.','wifi')});
  adm('passwords').then(r=>{const l=r.data||[];$('#pwCount').textContent=l.length;
    $('#pwList').innerHTML=l.length?`<div class="grp">${l.slice(0,6).map(pwRow).join('')}</div>`+allBtn('pw',l.length):empty('Aucun élément protégé','','lock')})
    .catch(e=>{$('#pwList').innerHTML=empty(esc(e.message),'','wifi')})}
async function saveNotice(clear){const text=clear?'':$('#a-ntext').value.trim(),url=clear?'':$('#a-nurl').value.trim(),uni=$('#a-nuni').value;
  if(url&&!/^https?:\/\//i.test(url))return toast('Lien invalide (https://…)');
  try{await adm('notice',{text,url,uni});toast(text?'Annonce publiée ✓':'Annonce retirée');store.set('bc_notice','');invalidate();closeSheet();load()}catch(e){toast(isNet(e)?NET:e.message)}}
/* organiser les accès rapides : flèches haut / bas, puis enregistrer */
function openOrder(){const o=S.ord;if(!o)return;S.oi=o.items.slice();drawOrder();openSheet('p-order')}
function drawOrder(){$('#ordList').innerHTML=`<div class="grp">${S.oi.map((f,i)=>`<div class="row"><span class="bd" style="--c:var(--c-${QAC[i%QAC.length]});font-weight:700">${i+1}</span><span class="rt" style="padding:12px 8px 12px 13px"><b>${esc(f.nom.slice(4).split('#')[0])}</b></span>
<button class="more" type="button" data-mv="-1" data-k="${i}" aria-label="Monter"${i?'':' disabled'}>${ic('up')}</button><button class="more" type="button" data-mv="1" data-k="${i}" aria-label="Descendre"${i<S.oi.length-1?'':' disabled'}>${ic('down')}</button></div>`).join('')}</div>`}
$('#ordList').addEventListener('click',e=>{const b=e.target.closest('[data-mv]');if(!b)return;const i=+b.dataset.k,j=i+ +b.dataset.mv;if(j<0||j>=S.oi.length)return;
  [S.oi[i],S.oi[j]]=[S.oi[j],S.oi[i]];buzz(8);drawOrder()});
$('#o-save').onclick=async()=>{const o=S.ord,b=$('#o-save');if(!o)return;b.disabled=true;
  try{await adm('order',{parent:o.parent,ids:S.oi.map(f=>f.id)});closeSheet();toast('Ordre enregistré ✓');invalidate();load()}
  catch(e){toast(isNet(e)?NET:e.message)}finally{b.disabled=false}};
async function copyTxt(v){try{await navigator.clipboard.writeText(v);toast('Copié ✓')}catch(e){toast('Copie impossible')}}
function shrink(file,big){return new Promise((ok,ko)=>{const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{URL.revokeObjectURL(url);for(const size of big?[256,192]:[112,96,80,64,48]){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
    const s=Math.min(img.width,img.height);x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,size,size);
    for(const q of[.85,.7,.5])for(const type of['image/webp','image/jpeg']){const u=c.toDataURL(type,q);if(u.indexOf('data:'+type)===0&&u.length<=(big?2e6:8800))return ok(u)}}
    ko(new Error('Image trop complexe, essayez-en une plus simple'))};img.onerror=()=>{URL.revokeObjectURL(url);ko(new Error('Image illisible'))};img.src=url})}
function cpick(box,sel,img){box.parentElement.hidden=!!img;box.innerHTML=`<button type="button" class="cp auto${sel?'':' on'}" data-c="" aria-label="Automatique">Auto</button>`+COLS.map(c=>`<button type="button" class="cp${sel===c?' on':''}" data-c="${c}" style="--c:var(--c-${c})" aria-label="${c}"></button>`).join('')}
function ipick(box,sel){sel=isImg(sel)?sel:(icParse(sel).ic?'ic:'+icParse(sel).ic:'');box.innerHTML=(isImg(sel)?`<button type="button" class="ip on" data-v="${esc(sel)}">${iconHTML(sel)}</button>`:'')+
  PRESETS.map(k=>`<button type="button" class="ip${sel==='ic:'+k?' on':''}" data-v="ic:${k}" aria-label="${k}">${ic(k)}</button>`).join('')}
/* gérer un élément : nom, description, icône, mot de passe, mise en avant, masquage, suppression */
/* aperçu de la couverture animée (image, GIF, vidéo, YouTube, Drive) */
const BGS=[{v:'',l:'Sobre',sub:'Icône et couleur du dossier',i:'folder'},{v:'verre',l:'Verre coloré',sub:'Fond en dégradé de la couleur',i:'layers'},{v:'media',l:'Image ou vidéo',sub:'Lien d\'une image, d\'un GIF, d\'une vidéo',i:'image'}];
const BG={m:'',n:''};
function bgSet(p,v){BG[p]=v;const o=BGS.find(x=>x.v===v)||BGS[0];const b=$('#'+p+'-bg');b.classList.add('on');b.innerHTML=`<span>${o.l}</span>${ic('down')}`;$('#'+p+'-mbox').hidden=v!=='media'}
['m','n'].forEach(p=>$('#'+p+'-bg').addEventListener('click',e=>ctxOpen(e.currentTarget,[],BGS.map(o=>({l:o.l,sub:o.sub,i:o.i,chk:BG[p]===o.v,f:()=>{buzz(8);bgSet(p,o.v);if(o.v==='media')$('#'+p+'-media').focus()}})))));
const bgVal=p=>BG[p]==='verre'?'verre':BG[p]==='media'?$('#'+p+'-media').value.trim():'';
function mPrev(box,url){const m=mediaOf(url);box.hidden=!m;box.innerHTML=m?mediaHTML(url,'cov',true):''}
$('#m-media').addEventListener('input',e=>mPrev($('#m-mprev'),e.target.value.trim()));
$('#n-media').addEventListener('input',e=>mPrev($('#n-mprev'),e.target.value.trim()));
async function openManage(id,nom,type,parent=null){type=type==='file'?'file':'folder';S.m={id,nom,type,parent,desc0:'',pw0:'',cur:'',icon:'',col:'',media0:'',ok:false,ft0:false,hd0:false};
  $('#m-nom').value=nom;$('#m-desc').value='';$('#m-pw').value='';$('#m-ft').checked=$('#m-hd').checked=$('#m-mb').checked=false;$('#m-mbblk').hidden=type!=='folder'||/^(BTN|NOTE|MSG|MEDIA):/.test(nom);$('#m-media').value='';mPrev($('#m-mprev'),'');bgSet('m','');
  $('#m-mblk').hidden=type!=='folder'||parent==null||/^(BTN|NOTE|MSG|MEDIA):/.test(nom);
  $('#mTitle').textContent=type==='folder'?(/^BTN:/.test(nom)?'Gérer l\'accès rapide':/^(NOTE|MSG):/.test(nom)?'Gérer l\'annonce':'Gérer le dossier'):'Gérer le document';
  $('#m-hint').hidden=!/^BTN:/.test(nom);$('#m-icblk').hidden=type!=='folder';$('#m-pwblk').hidden=type!=='folder'||/^(BTN|NOTE|MSG):/.test(nom);
  ipick($('#ipick'),'');cpick($('#cpick'),'');$('#mSub').textContent='Chargement…';$('#m-move').hidden=S.view!=='folder'||S.hist.length<2||/^(BTN|NOTE|MSG|MEDIA):/.test(nom)||cur()&&cur().id===id&&S.hist.length<3;openSheet('p-adm');
  try{const r=await adm('info',{id});if(!S.m||S.m.id!==id)return;Object.assign(S.m,{nom:r.name||nom,desc0:r.desc||'',pw0:r.pw||'',cur:r.icon||'',ft0:!!r.featured,hd0:!!r.hidden,mb0:!!r.members});
    $('#m-nom').value=S.m.nom;$('#m-desc').value=S.m.desc0;$('#m-pw').value=S.m.pw0;$('#m-ft').checked=S.m.ft0;$('#m-hd').checked=S.m.hd0;$('#m-mb').checked=S.m.mb0;const P=icParse(S.m.cur);S.m.icon=P.img||(P.ic?'ic:'+P.ic:'');S.m.col=P.c;S.m.media0=medOf(id,S.m.cur)||'';const gv0=S.m.media0==='verre';$('#m-media').value=gv0?'':S.m.media0;mPrev($('#m-mprev'),gv0?'':S.m.media0);bgSet('m',gv0?'verre':S.m.media0?'media':'');S.m.ok=true;ipick($('#ipick'),S.m.icon);cpick($('#cpick'),S.m.col,P.img);$('#mSub').textContent=S.m.nom}
  catch(e){toast(e.message);$('#mSub').textContent=nom}}
$('#ipick').addEventListener('click',e=>{const b=e.target.closest('.ip');if(b&&S.m){S.m.icon=b.dataset.v;ipick($('#ipick'),S.m.icon);cpick($('#cpick'),S.m.col,isImg(S.m.icon))}});
$('#cpick').addEventListener('click',e=>{const b=e.target.closest('.cp');if(b&&S.m){buzz(8);S.m.col=b.dataset.c;cpick($('#cpick'),S.m.col)}});
$('#m-icreset').onclick=()=>{if(S.m){S.m.icon='';ipick($('#ipick'),'');cpick($('#cpick'),S.m.col)}};
$('#m-img').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!S.m)return;try{S.m.icon=await shrink(f,S.m.type==='folder');ipick($('#ipick'),S.m.icon);cpick($('#cpick'),S.m.col,true);toast('Image prête, pensez à enregistrer')}catch(err){toast(err.message)}};
$('#mForm').addEventListener('submit',async e=>{e.preventDefault();const m=S.m;if(!m)return;
  const nom=$('#m-nom').value.trim(),desc=$('#m-desc').value.trim(),pw=$('#m-pw').value.trim(),ft=$('#m-ft').checked,hd=$('#m-hd').checked,mb=$('#m-mb').checked,body={id:m.id};
  if(!nom)return toast('Le nom ne peut pas être vide');
  if(nom!==m.nom)body.name=nom;if(desc!==m.desc0)body.desc=desc;
  if(pw!==m.pw0){if(pw&&pw.length<4)return toast('Mot de passe : 4 caractères minimum');body.pw=pw}
  const media=$('#m-mblk').hidden?m.media0:bgVal('m');
  if(BG.m==='media'&&!$('#m-mblk').hidden&&!mediaOf(media))return toast('Lien de couverture invalide : il doit commencer par https://');
  const mchg=m.ok&&media!==m.media0;
  const up=m.ok&&m.type==='folder'&&/^data:image\//.test(m.icon)?m.icon:'';   // image d'un dossier : rangée dans Drive
  if(m.ok&&!up){const nv=icJoin(m.icon,m.col);if(nv!==mStrip(m.cur))body.icon=nv}
  if(ft!==m.ft0)body.featured=ft;if(hd!==m.hd0)body.hidden=hd;if(mb!==!!m.mb0)body.members=mb;
  if(Object.keys(body).length===1&&!up&&!mchg){closeSheet();return toast('Aucune modification')}
  const b=$('#m-save');b.disabled=true;b.textContent='Enregistrement…';
  try{if(up){b.textContent='Envoi de l\'image…';await iconUp(m.id,up)}
    if(Object.keys(body).length>1)await adm('update',body);
    if(mchg){b.textContent='Couverture…';await saveMedia(m.id,m.parent,media)}
    if(body.name){S.hist.forEach(h=>{if(h.id===m.id)h.nom=body.name});S.favs.forEach(f=>{if(f.id===m.id)f.nom=body.name});saveFavs();
      if(S.uni&&S.uni.id===m.id){S.uni.nom=body.name;store.set('bc_uni',JSON.stringify(S.uni))}}
    toast('Modifications enregistrées ✓');closeSheet();invalidate();load()}
  catch(err){toast(isNet(err)?NET:err.message)}finally{b.disabled=false;b.textContent='Enregistrer'}});
const confirmDlg=(t,p,ok,i='trash')=>new Promise(res=>{$('#cfT').textContent=t;$('#cfP').textContent=p;$('#cfOk').textContent=ok;$('#cfIc').innerHTML=ic(i);cfRes=res;openSheet('p-confirm')});
/* se déconnecter : efface mon espace de cet appareil et revient à « Bonjour » */
function logout(){confirmDlg('Se déconnecter ?',store.get('bc_acc_p')?'Votre espace est effacé de cet appareil seulement : reconnectez-vous avec votre e-mail et votre mot de passe pour le retrouver.':'Votre espace (nom, e-mail, université, épinglés, récents et partages) sera effacé de cet appareil et de la liste des comptes. Ajoutez un e-mail et un mot de passe (Modifier) pour pouvoir le retrouver. Les documents que vous avez partagés restent en ligne.','Se déconnecter','logout').then(ok=>{closeSheet();if(!ok)return;
  const keep=!!store.get('bc_acc_p');if(store.get('bc_acc_s')&&!keep)post({action:'compte',op:'del',id:accId()}).catch(()=>{});
  wipe();buzz([12,60,18]);go('welcome');setTimeout(()=>toast(keep?'Déconnecté : reconnectez-vous avec votre e-mail sur n\'importe quel appareil':'Vous êtes déconnecté',3500),250)})}
function delAccount(){confirmDlg('Supprimer mon compte ?','Votre espace (nom, e-mail, photo, épinglés) est effacé de BioCampus et de tous vos appareils. Les documents que vous avez partagés restent en ligne.','Supprimer').then(ok=>{closeSheet();if(!ok)return;
  post({action:'compte',op:'del',id:accId()}).catch(()=>{});wipe();buzz([12,60,18]);go('welcome');setTimeout(()=>toast('Compte supprimé'),250)})}
function wipe(){S.pulled=0;S.newPw='';S.tk={};sess.set('bc_tk',null);['bc_tkp','bc_me','bc_name','bc_uni','bc_favs','bc_recent','bc_last','bc_mine','bc_notice','bc_acc','bc_acc_s','bc_acc_t','bc_acc_m','bc_acc_p'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
  S.me=null;S.uni=null;S.favs=[];S.draft=null;S.edit=false;resK='';S.onb=0;$('#f-nom').value=''}
const keepName=()=>{const i=$('#onName'),j=$('#onMail');if(i&&S.draft)S.draft.name=i.value;if(j&&S.draft)S.draft.email=j.value.trim()};   // garde le nom tapé avant de redessiner
/* photo de profil : carrée, réduite à 256 px, gardée sur l'appareil (bc_me.photo) */
$('#photoIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const u=await shrink(f,true);if((S.photoFor==='draft'||S.view==='welcome')&&S.draft){keepName();S.draft.photo=u;renderWelcome()}else if(S.me){saveMe({...S.me,photo:u});renderMe();toast('Photo enregistrée');syncSoon()}buzz([12,60,18])}catch(err){toast(err.message)}};
/* étapes de « Créer mon espace » */
function onbNext(){const d=S.draft;if(!d)return;S.onbDir=1;
  if(S.onb===1){const i=$('#onName'),v=(i?i.value:'').replace(/\s+/g,' ').trim();if(v.length<2){i&&(i.classList.add('bad'),i.focus());return toast('Indiquez votre prénom (2 caractères minimum)')}
    const j=$('#onMail'),em=(j?j.value:'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){j.classList.add('bad');j.focus();return toast(em?'E-mail invalide':'Indiquez votre e-mail')}
    const pq=$('#onPw'),pw=pq?pq.value:'';if(!pw&&!(S.edit&&store.get('bc_acc_p'))){pq.classList.add('bad');pq.focus();return toast('Choisissez un mot de passe (6 caractères minimum)')}
    if(pw&&pw.length<6){pq.classList.add('bad');pq.focus();return toast('Mot de passe : 6 caractères minimum')}if(pw)S.newPw=pw;
    d.name=v.slice(0,60);d.email=em.slice(0,120);buzz(8);if(S.edit||S.uni){if(!S.edit)d.uni={id:S.uni.id,nom:S.uni.nom,locked:!!S.uni.locked};S.onb=2}else S.onb=3;go('welcome');return}
  if(S.onb===2){if(!d.role)return toast('Choisissez ce qui vous décrit le mieux');if(d.role!=='etu'){d.level='';d.levelId=''}
    const u=d.uni||S.uni,e=S.edit;S.draft=null;S.edit=false;
    if(u){S.uni={id:u.id,nom:u.nom,locked:!!u.locked};store.set('bc_uni',JSON.stringify(S.uni))}
    const m={name:d.name,email:d.email||'',photo:d.photo,role:d.role,level:d.level||'',levelId:d.levelId||'',uniId:u?u.id:''};if(!m.photo)delete m.photo;
    saveMe(m);countSpace();buzz([12,60,18]);
    if(e){syncAcc();go('me');toast('Profil enregistré');return}
    goHome();setTimeout(()=>toast(m.levelId?`Bienvenue en ${m.level}\u00a0!`:'Votre espace est prêt'),300)}}
/* choisir son établissement pendant la création de l'espace : on le garde, puis on demande le profil et le niveau */
function onbUni(u){const d=S.draft;if(lockedFor(u)){askPass(u,()=>onbUni(u));return}
  d.uni={id:u.id,nom:u.nom,locked:!!u.locked};d.viaList=1;if(d.levelId&&d.uniId!==u.id){d.level='';d.levelId=''}d.uniId=u.id;
  getFolder(u.id).catch(()=>{});S.onbDir=1;S.onb=2;buzz();go('welcome')}
function onbBack(){buzz(8);S.onbDir=-1;if(S.edit&&S.onb===1){S.edit=false;S.draft=null;go('me');return}
  const d=S.draft;S.onb=S.onb===2?(S.edit?1:d&&d.viaList?3:0):0;
  go('welcome',[],false);history.replaceState({v:'welcome',h:[],o:S.onb},'')}
$('#m-move').onclick=()=>{const m=S.m,c=cur();if(!m)return;closeSheet();setTimeout(()=>openMove([m.id],c&&c.id===m.id?S.hist.slice(0,-1):null),60)};
$('#m-del').onclick=async()=>{const m=S.m;if(!m)return;
  const ok=await confirmDlg(m.type==='folder'?'Supprimer ce dossier ?':'Supprimer ce document ?',`« ${m.nom} »${m.type==='folder'?' et tout son contenu seront retirés.':' sera retiré.'} L'élément est placé dans la corbeille Google Drive.`,'Supprimer');
  if(!ok){openSheet('p-adm');return}
  try{await adm('delete',{id:m.id});const i=S.hist.findIndex(h=>h.id===m.id);if(i>=0)S.hist=S.hist.slice(0,i);
    S.favs=S.favs.filter(f=>f.id!==m.id);saveFavs();if(S.uni&&S.uni.id===m.id){S.uni=null;store.set('bc_uni','null')}
    closeSheet();toast('Supprimé ✓');invalidate();if(!S.hist.length&&S.view==='folder'){S.view='welcome';S.onb=S.me?3:0}load()}
  catch(err){openSheet('p-adm');toast(isNet(err)?NET:err.message)}};
/* ajouter : dossier, plusieurs dossiers, annonce, accès rapide */
const N={icon:'',col:''};
function setKind(){const k=$('#n-kind').value,sh=(id,on)=>$('#'+id).hidden=!on;
  sh('nb-name',k!=='batch');sh('nb-lines',k==='batch');sh('nb-text',k==='note'||k==='link');sh('nb-desc',k==='folder');sh('nb-icon',k==='folder'||k==='link');sh('nb-col',(k==='folder'||k==='link')&&!isImg(N.icon));sh('nb-pw',k==='folder'||k==='batch');sh('nb-ex',k==='link');sh('nb-media',k==='folder');
  $('#nl-name').textContent=k==='note'?'Titre de l\'annonce':k==='link'?'Texte du bouton':'Nom du dossier';$('#nl-text').textContent=k==='link'?'Adresse du lien (https://…)':'Message'}
$('#n-kind').onchange=setKind;
$('#nipick').addEventListener('click',e=>{const b=e.target.closest('.ip');if(b){N.icon=b.dataset.v;ipick($('#nipick'),N.icon);cpick($('#ncpick'),N.col,isImg(N.icon))}});
$('#ncpick').addEventListener('click',e=>{const b=e.target.closest('.cp');if(b){buzz(8);N.col=b.dataset.c;cpick($('#ncpick'),N.col)}});
$('#n-icreset').onclick=()=>{N.icon='';ipick($('#nipick'),'');cpick($('#ncpick'),N.col)};
$('#n-img').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{N.icon=await shrink(f,true);ipick($('#nipick'),N.icon);cpick($('#ncpick'),N.col,true);toast('Image prête')}catch(err){toast(err.message)}};
$$('#nb-lines .nchips button').forEach(b=>b.onclick=()=>{$('#n-lines').value=b.dataset.f.split('|').join('\n')});
/* modèles d'accès rapides */
$$('#nb-ex button').forEach(b=>b.onclick=()=>{const[n,u,i]=b.dataset.ex.split('|');$('#n-name').value=n;$('#n-text').value=u;N.icon='ic:'+i;ipick($('#nipick'),N.icon);$('#n-text').focus()});
function openCreate(kind){['n-name','n-lines','n-text','n-desc','n-pw','n-media'].forEach(i=>$('#'+i).value='');mPrev($('#n-mprev'),'');bgSet('n','');$('#n-kind').value=kind||'folder';N.icon='';N.col='';ipick($('#nipick'),'');cpick($('#ncpick'),'');setKind();
  const c=S.view==='folder'?cur():null;$('#nSub').textContent=c?`Dans « ${c.nom} »`:'À la racine (visible par toutes les universités)';openSheet('p-new')}
$('#nForm').addEventListener('submit',async e=>{e.preventDefault();
  const k=$('#n-kind').value,clean=s=>s.replace(/[\/\\]/g,'-').replace(/#/g,' ').trim(),pw=$('#n-pw').value.trim(),go_=$('#n-go');let jobs=[];
  if(k==='batch')jobs=$('#n-lines').value.split('\n').map(clean).filter(Boolean).map(n=>({n}));
  else{const n=clean($('#n-name').value),t=$('#n-text').value.trim();
    if(k==='folder'&&n)jobs=[{n,d:$('#n-desc').value.trim()}];
    if(k==='note'&&n&&t)jobs=[{n:'NOTE:'+n+'#'+t.replace(/[\/\\#]/g,' ')}];
    if(k==='link'&&n){if(!/^(https?:\/\/|mailto:)/i.test(t))return toast('Ajoutez un lien valide (https://… ou mailto:…)');jobs=[{n:'BTN:'+n+'#'+t.split('#')[0].replace(/\\/g,'')}]}}
  if(!jobs.length)return toast('Merci de remplir les champs');
  const usePw=pw&&(k==='folder'||k==='batch');if(usePw&&pw.length<4)return toast('Mot de passe : 4 caractères minimum');
  const media=k==='folder'?bgVal('n'):'';if(BG.n==='media'&&k==='folder'&&!mediaOf(media))return toast('Lien de couverture invalide : il doit commencer par https://');
  go_.disabled=true;go_.textContent='Création…';let ok=0;const parent=S.view==='folder'&&cur()?cur().id:'';
  try{for(const j of jobs){const r=await adm('create',{parent,name:j.n});ok++;let icn=(k==='folder'||k==='link')?icJoin(N.icon,N.col):'';
      if(r.id&&/^data:image\//.test(icn)){await iconUp(r.id,icn);icn=''}
      if(r.id&&media)await saveMedia(r.id,parent,media);
      if(r.id&&(j.d||usePw||icn)){const u={id:r.id};if(icn)u.icon=icn;if(j.d)u.desc=j.d;if(usePw)u.pw=pw;await adm('update',u)}}
    closeSheet();toast(ok>1?`${ok} éléments créés ✓`:'Créé ✓');invalidate();load()}
  catch(err){toast(isNet(err)?NET:err.message);if(ok){invalidate();load()}}finally{go_.disabled=false;go_.textContent='Créer'}});

/* ---------- Thème ---------- */
function applyTheme(t){document.documentElement.dataset.theme=t;document.body.classList.toggle('theme-light',t==='light');document.body.classList.toggle('theme-dark',t!=='light');
  $('#themeBtn').innerHTML=ic(t==='light'?'moon':'sun');const m=$('meta[name=theme-color]');if(m)m.content=t==='light'?'#f2f2f7':'#000000'}

/* ---------- Événements ---------- */
document.addEventListener('click',e=>{if(e.target.closest('[data-hap]'))return;const t=e.target.closest('[data-a],[data-j],[data-v]');if(!t)return;const d=t.dataset;
  if(t.classList.contains('nb'))return;   // barre d'onglets : liquid-glass.js (navSel)
  if(d.j!=null&&!d.a){buzz(8);jump(+d.j);return}
  switch(d.a){
   case'uni':if(S.view==='welcome'&&S.draft&&!S.edit)onbUni({id:d.id,nom:d.nom,locked:!!d.lk});else openUni({id:d.id,nom:d.nom,locked:!!d.lk});break;
   case'folder':openFolder({id:d.id,nom:d.nom,locked:!!d.lk});break;
   case'file':/^https?:\/\//i.test(d.url)?window.open(d.url,'_blank','noopener'):toast('Ce lien n\'est pas disponible');break;
   case'pin':togglePin();break;case'pinbtn':togglePinBtn(d.id);break;case'order':buzz();openOrder();break;case'pinopen':openPin(d.id);break;
   case'unpin':S.favs=S.favs.filter(f=>f.id!==d.id);saveFavs();buzz();render();break;
   case'start':S.uf='';S.edit=false;S.onb=0;S.onbDir=1;buzz();go('welcome');break;case'reg':regNext();break;
   case'pweye':{const i=$('#'+d.for);if(i){const sh=i.type==='password';i.type=sh?'text':'password';t.innerHTML=ic(sh?'eyeoff':'eye');t.setAttribute('aria-label',sh?'Masquer le mot de passe':'Afficher le mot de passe');buzz(8)}}break;case'login':S.lg={m:'in',email:''};S.onb=5;S.onbDir=1;buzz(8);go('welcome');break;
   case'lgback':S.onbDir=-1;buzz(8);if(S.lg&&S.lg.m!=='in'){S.lg.m='in';renderWelcome()}else{S.onb=0;go('welcome')}break;
   case'lgforgot':S.lg.email=($('#lgMail')||{}).value||S.lg.email;S.lg.m='f1';S.onbDir=1;buzz(8);renderWelcome();break;
   case'lgo':case'lgsend':case'lgreset':accLogin(d.a,t);break;case'delacc':delAccount();break;case'look':S.draft=null;S.onb=3;buzz(8);go('welcome');break;case'editme':startOnb(1,true);break;
   case'onbnext':onbNext();break;case'onbback':onbBack();break;
   case'photo':S.photoFor=d.for;$('#photoIn').click();break;
   case'photox':if(S.draft){keepName();delete S.draft.photo;buzz(8);renderWelcome()}break;
   case'lvdd':if(S.draft){const lv=onbLevels()||[];ctxOpen(t,[],[...lv.map(x=>({l:esc(x.nom),chk:S.draft.level===x.nom,f:()=>{S.draft.level=x.nom;S.draft.levelId=x.id||'';buzz(8);renderWelcome()}})),{l:'Autre / pas dans la liste',chk:S.draft.level&&!S.draft.levelId&&!lv.some(x=>x.nom===S.draft.level),grp:2,f:()=>{S.draft.level='Autre';S.draft.levelId='';buzz(8);renderWelcome()}}])}break;
   case'role':if(S.draft){buzz(8);S.draft.role=d.v;renderWelcome()}break;case'level':if(S.draft){buzz(8);S.draft.level=d.v;renderWelcome()}break;
   case'me':buzz();go('me');break;case'info':buzz();go('info');break;case'logout':logout();break;
   case'setuni':openUni({id:d.id,nom:d.nom,locked:!!d.lk});break;
   case'vm':setVm(S.vm==='grid'?'list':'grid');break;
   case'search':buzz();if(DESK.matches){$('#q').focus()}else openSearch();break;
   case'mine':{const x=json(store.get('bc_mine'),[])[+d.k];if(x&&Array.isArray(x.h)&&x.h.length){buzz();navTo(x.h)}break}
   case'home':goHome();break;case'nclose':if(S.notice)store.set('bc_notice',S.notice.id);$('#notice').hidden=true;break;
   case'manage':openManage(d.id,d.nom,d.t,S.searching?null:S.view==='folder'&&cur()?cur().id:S.view==='welcome'?'':null);break;case'copy':copyTxt(d.v);break;case'create':buzz();openCreate();break;
   case'share':buzz();openShare();break;case'retry':S.retry&&S.retry();break;
   case'ctx':folderCtx(t);break;case'fctx':fileCtx(t,d.k);break;
   case'resume':{const L=json(store.get('bc_last'),null);if(Array.isArray(L)&&L.length){buzz();navTo(L)}break}
   case'unipick':openUniSheet();break;case'school':buzz();openSchool();break;
   case'ropen':window.open('https://drive.google.com/open?id='+encodeURIComponent(d.id),'_blank','noopener');break;
   case'rdel':t.disabled=true;adm('reportdel',{rid:d.rid}).then(()=>{buzz(8);toast('Signalement retiré');fillAdmin()}).catch(e=>{t.disabled=false;toast(isNet(e)?NET:e.message)});break;
   case'publish':adm('update',{id:d.id,hidden:false}).then(()=>{buzz([12,60,18]);toast('Publié ✓');invalidate();fillAdmin()}).catch(e=>toast(isNet(e)?NET:e.message));break;
   case'recent':{const r=json(store.get('bc_recent'),[])[+d.k];if(Array.isArray(r)&&r.length){buzz();navTo(r)}break}
   case'recclear':store.set('bc_recent','[]');buzz(8);renderMe();break;
   case'rclose':store.set('bc_last','');resK='';buzz(8);syncResume();break}});
/* menu « … » */
$('#ctx').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b||!CTX||b.disabled)return;const it=CTX.items[+b.dataset.k];ctxClose();it&&it.f&&it.f()});
$('#ctxv').addEventListener('click',ctxClose);
addEventListener('scroll',ctxClose,{passive:true});addEventListener('resize',ctxClose);
/* barre d'onglets : même moteur et même comportement que BioChem (lentille qu'on fait glisser, haptique) */
function navSel(i){buzz();[goHome,()=>go('me'),()=>go('info'),()=>go('admin')][i]()}
/* onglets (+ « Admin » une fois connecté) : la barre est reconstruite quand l'état admin change */
const NAVT=[['folder','home','Accueil'],['me','user','Mon espace'],['info','info','Infos'],['admin','shield','Admin']];
let navAdm=null;
function buildNav(){const a=!!S.adm;if(a===navAdm)return;navAdm=a;
  $('#nav').innerHTML='<span class="sl" id="sl"></span>'+NAVT.slice(0,a?4:3).map(([v,i,l])=>`<button class="nb" type="button" data-v="${v}">${ic(i)}${l}</button>`).join('');
  $('#nav').classList.toggle('n4',a);
  const nbs=$$('.nb'),sl=$('#sl');
  navCtl=window.LiquidGlass?LiquidGlass.tabs({wrap:$('#navWrap'),inner:$('#nav'),indicator:sl,items:nbs,active:Math.min(TABV[S.view]||0,nbs.length-1),onSelect:navSel,glass:false})
   :{select(i){const b=nbs[i];if(b){sl.style.translate=b.offsetLeft+'px 0';sl.style.width=b.offsetWidth+'px'}}};
  if(!window.LiquidGlass)nbs.forEach((b,i)=>b.addEventListener('click',()=>navSel(i)))}
if(!window.LiquidGlass)addEventListener('resize',()=>navCtl&&navCtl.select(TABV[S.view]));
/* recherche : bouton rond (mobile), « Annuler » */
$('#sBtn').onclick=()=>{buzz();S.sOpen||S.searching?closeSearch():openSearch()};
$('#qCancel').onclick=()=>{buzz(8);closeSearch()};
DESK.addEventListener&&DESK.addEventListener('change',syncChrome);
/* clavier ouvert (mobile) : la barre se masque, comme dans BioChem */
if(window.visualViewport){const vv=visualViewport,kb=()=>{const a=document.activeElement,open=innerHeight-vv.height>120&&!!a&&a.matches('input,textarea');document.body.classList.toggle('kb',open)};
  vv.addEventListener('resize',kb);addEventListener('focusin',()=>setTimeout(kb,350));addEventListener('focusout',()=>setTimeout(kb,120))}
$('#uniBtn').onclick=openUniSheet;
$('#back').onclick=()=>{buzz(8);goBack()};
$('#help').onclick=()=>{buzz();go('info')};
$('#q').addEventListener('input',onQuery);
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(sT);const v=e.target.value.trim();if(v.length>=2)runSearch(v);e.target.blur()}});
$('#clearQ').onclick=()=>{clearSearch();render();$('#q').focus()};
$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;buzz(8);S.kind=b.dataset.k;
  segSet($('#filters'),['all','folder','file'].indexOf(S.kind));S.searching?runSearch(S.q):S.view==='folder'&&renderFolder()});
$('#scope').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;buzz(8);S.scope=b.dataset.s;
  $$('#scope button').forEach(x=>x.classList.toggle('on',x===b));syncChrome();if(S.q.length>=2)runSearch(S.q)});
$('#open').onclick=checkPass;$('#pass').addEventListener('keydown',e=>{if(e.key==='Enter')checkPass()});
$('#admBtn').onclick=()=>{buzz();if(S.adm)go('admin');else{$('#a-pass').value='';openSheet('p-login');setTimeout(()=>$('#a-user').focus(),400)}};
$('#a-go').onclick=doLogin;$('#a-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
$('#a-user').addEventListener('keydown',e=>{if(e.key==='Enter')$('#a-pass').focus()});
$('#a-rescan').onclick=async e=>{const b=e.currentTarget,t=b.innerHTML;b.disabled=true;b.innerHTML=`${ic('refresh')}Lecture de Google Drive…`;
  try{const u=here(),r=await adm('rescan',{root:u?u.id:''});invalidate();toast('Google Drive relu ✓'+(r.dossiers?` · ${r.dossiers} dossiers`:''),3200);if(S.view!=='admin')load()}
  catch(err){toast(/inconnue/i.test(err.message)?'Mettez à jour le script Google (Code.gs v3.7)':isNet(err)?NET:err.message,4000)}
  finally{b.disabled=false;b.innerHTML=t}};
$('#a-out').onclick=async()=>{try{await adm('logout')}catch(e){}setAdmin('');toast('Déconnecté')};
$('#a-nuni').onchange=fillNotice;
$('#a-mod').onchange=e=>{const on=e.target.checked;adm('settings',{moderation:on}).then(()=>{buzz();toast(on?'Les dépôts attendront votre validation':'Les dépôts sont publiés directement')}).catch(err=>{e.target.checked=!on;toast(err.message)})};
/* Créer mon espace : Entrée = continuer ; liste des établissements filtrée en direct */
document.addEventListener('keydown',e=>{if(e.target.id==='onName'&&e.key==='Enter'){e.preventDefault();onbNext()}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='uf'){S.uf=t.value;drawUnis()}if(t.id==='onName')t.classList.remove('bad')});
/* Mon espace : thème */
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='meDark'){buzz();const th=t.checked?'dark':'light';store.set('bc_theme',th);applyTheme(th)}});$('#a-nsave').onclick=()=>saveNotice(false);$('#a-nclear').onclick=()=>saveNotice(true);
$('#a-addlink').onclick=()=>openCreate('link');
$('#themeBtn').onclick=()=>{buzz();const t=document.documentElement.dataset.theme==='light'?'dark':'light';store.set('bc_theme',t);applyTheme(t)};
$('#mb').onclick=()=>{buzz();let n=0;const g=()=>typeof window.openCapsuleMenu==='function'?window.openCapsuleMenu():++n<40&&setTimeout(g,100);g()};
$$('.glass,.nav-in').forEach(b=>{const aim=e=>{const r=b.getBoundingClientRect();b.style.setProperty('--mx',e.clientX-r.left+'px');b.style.setProperty('--my',e.clientY-r.top+'px')};
  b.addEventListener('pointerenter',e=>{aim(e);b.classList.add('lit')});b.addEventListener('pointermove',aim);b.addEventListener('pointerleave',()=>b.classList.remove('lit'))});

/* ---------- Démarrage : directement dans mon université ---------- */
applyTheme(document.documentElement.dataset.theme);syncAdm();setTimeout(countSpace,4000);
setTimeout(()=>{if(S.me&&!store.get('bc_acc_p')&&!sess.get('bc_secask')&&S.view!=='welcome'&&!S.adm){sess.set('bc_secask','1');startOnb(1,true);setTimeout(()=>toast('Ajoutez votre e-mail et un mot de passe pour garder votre espace sur tous vos appareils',5000),400)}},2500);
$('#back').innerHTML=ic('back');$('#sBtn').innerHTML=ic('search');$('#clearQ').innerHTML=ic('x');$('#mb').innerHTML=ic('menu');$('#help').insertAdjacentHTML('afterbegin',ic('info'));
$$('[data-i]').forEach(el=>{el.insertAdjacentHTML('afterbegin',ic(el.dataset.i));el.removeAttribute('data-i')});
{S.onb=S.me?3:0;const u0=S.uni&&{id:S.uni.id,nom:S.uni.nom},lv=S.me&&S.me.levelId&&u0&&S.me.uniId===u0.id?[{id:S.me.levelId,nom:S.me.level}]:[];
 const start=S.uni&&!lockedFor(S.uni)?{v:'folder',h:[u0,...lv]}:{v:'welcome',h:[],o:S.onb};
 history.replaceState(start,'');S.view=start.v;S.hist=start.h;load()}
document.addEventListener('DOMContentLoaded',()=>{const f=document.querySelector('.modern-transparent-footer');if(f)$('#main').appendChild(f)});
})();
