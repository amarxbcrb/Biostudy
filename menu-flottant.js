/* =========================================================================
   MENU GLOBAL BIOSTUDY — Liquid Glass iOS 27 (même verre que la barre de navigation)
   Mobile  : bottom sheet flottante (glisser la poignée vers le bas pour fermer)
   Tablette / PC : carte centrée qui "pop" depuis le bouton menu
   Sélecteur vertical : on fait défiler la liste, la lentille de verre suit
   l'outil centré, le bouton "Ouvrir …" en bas ouvre la page choisie.
   Ouverture : window.openCapsuleMenu()  |  Fermeture : window.closeCapsuleMenu()
   ========================================================================= */
(function () {
  if (window.__mfLoaded) return;
  window.__mfLoaded = true;

  /* ---------- 0. RÉGLAGES DU SITE ---------- */
  /* Réglages du site (studio, onglet « Site ») : outils masqués ou en maintenance.
     Partagés avec l'accueil via window.bsSite (promesse, mémorisée 1 minute dans la session). */
  window.bsSite = window.bsSite || (async () => {
    try { const c = JSON.parse(sessionStorage.getItem('bs_site') || 'null'); if (c && Date.now() - c.t < 60000) return c.site; } catch (e) {}
    try { const r = await fetch('/api/vitrine/site'); if (!r.ok) return null; const d = await r.json();
      try { sessionStorage.setItem('bs_site', JSON.stringify({ t: Date.now(), site: d.site })); } catch (e) {} return d.site; } catch (e) { return null; }
  })();

  /* ---------- 1. OUTILS ----------
     Optionnel par outil : icon:"lucide:dna" (force une icône Iconify) et color:"#0A84FF" */
  const mf_toolsData = [
    { name: "BioCampus",  desc: "Cours, TD, TP et examens",       url: "/BioCampus" },
    { name: "BioPCR",     desc: "Mélange réactionnel, master mix",url: "/BioPCR" },
    { name: "BioDilu",    desc: "C₁V₁, dilution 1/n, série, gamme, quantité à prélever",     url: "/BioDilu" },
    { name: "BioBand",    desc: "Gel d'agarose, taille des bandes",  url: "/BioBand" },
    { name: "BioPrep",    desc: "Solutions, milieux, check-list", url: "/BioPrep", icon: "lucide:beaker", color: "#FF375F" },
    { name: "BioConvert", desc: "Conversions d'unités",         url: "/BioConvert" },
    { name: "BioChem",    desc: "Molarité, molalité et solutions", url: "/BioChem", icon: "lucide:atom", color: "#5E5CE6" },
    { name: "BioMicro",   desc: "UFC/mL, DO, temps de génération",url: "/BioMicro", icon: "lucide:microscope", color: "#30D158" },
    { name: "BioStat",    desc: "Biostatistique avec R, pas à pas", url: "/BioStat", icon: "lucide:chart-column", color: "#FF453A" },
    { name: "BioGene",    desc: "Séquences, codons, CRISPR, plasmides, clonage", url: "/BioGene", icon: "lucide:dna", color: "#30D5C8" }
  ];

  /* icône + couleur d'identité par outil */
  const ICONS = {
    pcr:    ['#0A84FF', '<path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/>'],
    dilu:   ['#BF5AF2', '<path d="M10 2v7.31"/><path d="M14 2v7.31"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/>'],
    gel:    ['#FF9F0A', '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h3v2H7z"/><path d="M14 7h3v2h-3z"/><path d="M7 13h3v2H7z"/><path d="M14 16h3v2h-3z"/>'],
    cfu:    ['#32D74B', '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><circle cx="17" cy="8" r="1.5"/><circle cx="7" cy="16" r="1.5"/>'],
    conv:   ['#5AC8FA', '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'],
    lab:    ['#30D5C8', '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>'],
    portal: ['#FF375F', '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'],
    prep:   ['#FF375F', '<path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>'],
    def:    ['#8E8E93', '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>']
  };
  function mf_getIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('pcr')) return ICONS.pcr;
    if (n.includes('dilu')) return ICONS.dilu;
    if (n.includes('gel')) return ICONS.gel;
    if (n.includes('cfu')) return ICONS.cfu;
    if (n.includes('prep')) return ICONS.prep;
    if (n.includes('conv')) return ICONS.conv;
    if (n.includes('lab')) return ICONS.lab;
    if (n.includes('lyon') || n.includes('portail')) return ICONS.portal;
    return ICONS.def;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


  /* ---------- ICÔNES WEB (Iconify) ----------
     Ordre : 1) icon: forcée  2) mots-clés FR/EN  3) recherche Iconify sur le nom
             4) mots-clés / recherche sur la description  5) icône locale de secours
     Résultat mis en cache (localStorage) → une seule requête réseau par outil. */
  const IC_API = 'https://api.iconify.design';
  const IC_KEY = 'mf_icons_v3';
  const DEFAULT_DESC = 'Outil & Calculateur';
  const RULES = [
    [/pcr|adn|dna|g[eé]n[eo]m|s[eé]quen/,          'lucide:dna',            '#0A84FF'],
    [/dilu|molar|solution|concentr/,               'lucide:flask-conical',  '#BF5AF2'],
    [/gel|[eé]lectro|agaros|blot/,                 'lucide:sliders-vertical','#FF9F0A'],
    [/cfu|colon|petri|bact|microb|culture/,        'lucide:microscope',     '#32D74B'],
    [/conv|unit[eé]s?\b/,                          'lucide:arrow-left-right','#5AC8FA'],
    [/lab|flow|protoc|workflow/,                   'lucide:clipboard-check','#30D5C8'],
    [/campus|lyon|portail|portal|univ|cours|[eé]tud|study|[eé]cole/, 'lucide:graduation-cap','#FF375F'],
    [/stat|graph|chart|donn[eé]e|data/,            'lucide:activity',       '#FF6482'],
    [/temp|therm|incub/,                           'lucide:thermometer',    '#FF9F0A'],
    [/timer|chrono|minut|minuteur/,                'lucide:timer',          '#5AC8FA'],
    [/note|cahier|m[eé]mo|doc/,                    'lucide:file-text',      '#8E8E93'],
    [/prep|pr[eé]para|assistant/,                  'lucide:beaker',      '#FF375F'],
    [/calcul|calc\b/,                              'lucide:calculator',     '#0A84FF']
  ];
  const PALETTE = ['#0A84FF', '#BF5AF2', '#FF9F0A', '#32D74B', '#5AC8FA', '#30D5C8', '#FF375F', '#FF6482'];
  let iconStore = {};
  try { iconStore = JSON.parse(localStorage.getItem(IC_KEY) || '{}'); } catch (e) {}
  const saveIcons = () => { try { localStorage.setItem(IC_KEY, JSON.stringify(iconStore)); } catch (e) {} };
  const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const ruleFor = txt => RULES.find(r => r[0].test(String(txt).toLowerCase()));
  const colorFor = t => t.color || (ruleFor(t.name) || [])[2] || PALETTE[hash(t.name) % PALETTE.length];

  function iconSvg(t) {
    const s = iconStore[t.name];
    if (s && s.body) return `<svg viewBox="0 0 ${s.w} ${s.h}" fill="currentColor" aria-hidden="true">${s.body}</svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${mf_getIcon(t.name)[1]}</svg>`;
  }
  async function jget(url, ms = 4500) {
    const c = new AbortController(), timer = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal }); return r.ok ? await r.json() : null; }
    catch (e) { return null; } finally { clearTimeout(timer); }
  }
  const cleanWords = s => String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-zA-ZÀ-ÿ ]+/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !/^(bio|calc|master|tool|tools|outil|outils|the|des|les|pour|and)$/i.test(w));
  async function searchIcon(words) {
    for (const w of words.slice(0, 3)) {
      const d = await jget(`${IC_API}/search?query=${encodeURIComponent(w)}&limit=1&prefix=lucide`);
      if (d && d.icons && d.icons[0]) return d.icons[0];
    }
    return null;
  }
  async function resolveIcons(list) {
    const want = {}, todo = [];
    list.forEach(t => {
      const id = t.icon || (ruleFor(t.name) || [])[1];
      const cached = iconStore[t.name];
      if (cached && cached.body && (!id || cached.id === id)) return;
      if (id) want[t.name] = id; else todo.push(t);
    });
    await Promise.all(todo.map(async t => {
      const hasDesc = t.desc && t.desc !== DEFAULT_DESC;
      let id = (hasDesc && ruleFor(t.desc) || [])[1] || await searchIcon(cleanWords(t.name));
      if (!id && hasDesc) id = await searchIcon(cleanWords(t.desc));
      if (id) want[t.name] = id;
    }));
    const sets = {};
    Object.values(want).forEach(id => { const [p, i] = id.split(':'); (sets[p] = sets[p] || new Set()).add(i); });
    await Promise.all(Object.entries(sets).map(async ([p, names]) => {
      const d = await jget(`${IC_API}/${p}.json?icons=${[...names].join(',')}`);
      if (!d || !d.icons) return;
      Object.entries(want).forEach(([n, id]) => {
        const [pp, i] = id.split(':'); if (pp !== p) return;
        const ic = d.icons[i] || (d.aliases && d.aliases[i] && d.icons[d.aliases[i].parent]);
        if (ic && ic.body) iconStore[n] = { id, body: ic.body, w: ic.width || d.width || 24, h: ic.height || d.height || 24 };
      });
    }));
    saveIcons();
  }
  async function mf_upgradeIcons(list) {
    if (list._ic) return; list._ic = true;
    await resolveIcons(list);
    if (currentTools !== list) return;                      // liste remplacée entre-temps
    document.querySelectorAll('#mfMenuOverlay [data-t]').forEach(el => {
      const tool = list[+el.dataset.t], ico = el.querySelector('.mf-ico'); if (ico && tool) ico.innerHTML = iconSvg(tool);
    });
  }

  /* ---------- 2. TEXTES FR / EN (suit <html lang>) ---------- */
  const T = {
    fr: { title: 'Menu', sub: 'Outils BioStudy', home: "Retour à l'accueil", homeShort: 'Accueil', tools: 'Outils', close: 'Fermer', here: 'Ici', open: 'Ouvrir', youHere: 'Vous êtes ici', nouveau: 'Nouveau', push: 'Recevoir les notifications', pushOn: 'Activées : vous serez prévenu des nouveautés', pushOff: 'Nouveaux outils, mises à jour, annonces', pushIos: "Sur iPhone : ajoutez d'abord BioStudy à l'écran d'accueil (Partager → Sur l'écran d'accueil)", pushDenied: 'Bloquées : autorisez-les dans les réglages du navigateur', pushErr: "Activation impossible, réessayez plus tard", fb: 'Une idée, un problème ?', fbPh: 'Décrivez votre idée ou le problème rencontré (outil, page, appareil)…', fbContact: 'Adresse e-mail (facultatif, pour recevoir une réponse)', fbSend: 'Envoyer', fbOk: 'Merci, votre message a bien été envoyé.', fbErr: "Envoi impossible, réessayez plus tard." },
    en: { title: 'Menu', sub: 'BioStudy tools',  home: 'Back to home', homeShort: 'Home', tools: 'Tools', close: 'Close',  here: 'Here', open: 'Open',   youHere: 'You are here', nouveau: 'New', push: 'Get notifications', pushOn: 'On: you will hear about new features', pushOff: 'New tools, updates, announcements', pushIos: 'On iPhone: first add BioStudy to your Home Screen (Share → Add to Home Screen)', pushDenied: 'Blocked: allow them in your browser settings', pushErr: 'Could not turn on, please try again later', fb: 'An idea, a problem?', fbPh: 'Describe your idea or the problem…', fbContact: 'Email (optional, if you want a reply)', fbSend: 'Send', fbOk: 'Thanks! Message received.', fbErr: 'Could not send, please try again later.' }
  };
  const lang = () => ((document.documentElement.lang || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');

  /* ---------- 3. CSS + HTML ---------- */
  const CSS = `
.mf-overlay{
  --mf-spring:cubic-bezier(.34,1.45,.64,1);
  --mf-pop:cubic-bezier(.3,1.25,.5,1);
  --mf-row:68px;
  --mf-text:#fff;--mf-text2:rgba(235,235,245,.68);
  --mf-lg:28,28,30;--mf-lg-a:.8;--mf-hair:rgba(255,255,255,.08);--mf-lensn:rgba(255,255,255,.17);--mf-lens-line:rgba(255,255,255,.26);
  --mf-tint:rgba(22,22,26,.34);--mf-hover:rgba(255,255,255,.08);--mf-focus:rgba(10,132,255,.8);--mf-tint-lg:rgba(24,24,28,.84);--mf-hi:rgba(255,255,255,.45);--mf-shadow:rgba(0,0,0,.4);--mf-bright:.9;
  --mf-rim1:rgba(255,255,255,.62);--mf-rim2:rgba(255,255,255,.07);
  --mf-lens-bg:rgba(255,255,255,.14);--mf-lens-hi:rgba(255,255,255,.55);
  --mf-txtshadow:0 1px 3px rgba(0,0,0,.35);
  --mf-font:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",sans-serif;
  position:fixed;inset:0;height:100vh;height:100dvh;z-index:99999;display:flex;align-items:flex-end;justify-content:center;
  background:rgba(0,0,0,.4);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
  opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,visibility 0s .35s;
  font-family:var(--mf-font);color:var(--mf-text);text-align:left;-webkit-font-smoothing:antialiased}
body.theme-light .mf-overlay{
  --mf-text:#1d1d1f;--mf-text2:rgba(60,60,67,.68);
  --mf-lg:255,255,255;--mf-lg-a:.8;--mf-hair:rgba(0,0,0,.09);--mf-lensn:rgba(120,120,128,.16);--mf-lens-line:rgba(255,255,255,.9);
  --mf-tint:rgba(255,255,255,.52);--mf-hover:rgba(0,0,0,.05);--mf-focus:rgba(0,122,255,.7);--mf-tint-lg:rgba(242,243,248,.86);--mf-hi:#fff;--mf-shadow:rgba(0,0,0,.1);--mf-bright:1.1;
  --mf-rim1:rgba(255,255,255,1);--mf-rim2:rgba(255,255,255,.35);
  --mf-lens-bg:rgba(255,255,255,.38);--mf-lens-hi:#fff;
  --mf-txtshadow:0 1px 0 rgba(255,255,255,.6);
  background:rgba(120,120,128,.2)}
.mf-overlay.active{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .4s ease,visibility 0s}
.mf-overlay *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}

/* ---- VERRE LIQUIDE : fond clair + reflet spéculaire sur le bord (la réfraction est ajoutée en JS sur Chrome) ---- */
.mf-card,.mf-close{
  position:relative;border:none;
  background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,0) 45%),var(--mf-tint);
  -webkit-backdrop-filter:blur(14px) saturate(180%) brightness(var(--mf-bright));
  backdrop-filter:blur(14px) saturate(180%) brightness(var(--mf-bright));
  box-shadow:inset 0 1px 1px var(--mf-hi),inset 0 -1px 1px rgba(255,255,255,.1),0 14px 34px var(--mf-shadow),0 2px 6px rgba(0,0,0,.14)}
.mf-card::before,.mf-close::before{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:1.2px;pointer-events:none;
  background:linear-gradient(140deg,var(--mf-rim1) 0%,var(--mf-rim2) 30%,var(--mf-rim2) 70%,var(--mf-rim1) 100%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}

.mf-card{
  width:calc(100% - 16px);margin:0 8px calc(8px + env(safe-area-inset-bottom));
  max-height:min(88vh,720px);max-height:min(88dvh,720px);min-height:0;overflow:hidden;display:flex;flex-direction:column;
  padding:10px 14px 14px;border-radius:40px;isolation:isolate;
  box-shadow:inset 0 1px 1px var(--mf-hi),inset 0 -1px 1px rgba(255,255,255,.1),0 30px 70px -12px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.14);
  transform-origin:50% 100%;transform:translateY(108%) scale(.97);opacity:0;
  transition:transform .34s cubic-bezier(.5,0,.75,0),opacity .26s ease;will-change:transform,opacity}
.mf-overlay.active .mf-card{transform:none;opacity:1;transition:transform .85s var(--mf-pop),opacity .3s ease}

.mf-grab{touch-action:none;cursor:grab;flex-shrink:0}
.mf-pill{width:44px;height:5px;border-radius:5px;background:rgba(235,235,245,.5);margin:2px auto 12px}
body.theme-light .mf-pill{background:rgba(60,60,67,.3)}
/* titre aligné sur les icônes, croix alignée sur le bord droit de la lentille */
.mf-header{display:flex;align-items:center;gap:12px;padding:0 0 10px 20px}
.mf-badge{display:none}
.mf-titles{display:flex;flex-direction:column;flex:1;min-width:0}
.mf-title{font-size:25px;font-weight:700;letter-spacing:-.4px;line-height:1.1;text-shadow:var(--mf-txtshadow)}
.mf-sub{font-size:13px;font-weight:500;color:var(--mf-text2);line-height:1.2;margin-top:3px}
.mf-close{width:40px;height:40px;flex-shrink:0;border-radius:50%;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;
  transition:transform .45s var(--mf-spring)}
.mf-close:active{transform:scale(.88)}
@media(hover:hover){.mf-close:hover{transform:scale(1.08)}}

/* ---- LISTE : un toucher = on y va ; défilement normal (molette, doigt, clavier) ---- */
.mf-scroll{position:relative;z-index:1;min-height:0;max-height:min(62vh,540px);max-height:min(62dvh,540px);overflow-y:auto;overscroll-behavior:contain;
  scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.35) transparent;margin:0 -6px;padding:2px 6px 6px}
.mf-list{display:flex;flex-direction:column;gap:4px}
.mf-item{position:relative;display:flex;align-items:center;min-height:var(--mf-row);padding:8px 14px;border-radius:22px;min-width:0;
  color:inherit;text-decoration:none;outline:none;transition:background .2s,transform .35s var(--mf-spring)}
.mf-overlay.active .mf-item{animation:mfIn .6s var(--mf-pop) backwards;animation-delay:calc(min(var(--i),8) * 30ms + 100ms)}
@keyframes mfIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@media(hover:hover){.mf-item:not(.current):hover .mf-name{color:var(--c)}}
.mf-item:focus-visible{background:var(--mf-hover);box-shadow:inset 0 0 0 2px var(--mf-focus)}
.mf-item:active{transform:scale(.97)}
.mf-item.current{background:linear-gradient(180deg,var(--mf-lens-bg),rgba(255,255,255,.02));box-shadow:inset 0 1px 1px var(--mf-lens-hi),inset 0 -1px 4px rgba(255,255,255,.08)}
.mf-in{display:flex;align-items:center;gap:14px;width:100%;min-width:0}
.mf-ico{width:40px;height:40px;flex-shrink:0;display:grid;place-items:center;color:var(--c)}
.mf-ico svg{width:26px;height:26px;display:block}
.mf-info{display:flex;flex-direction:column;min-width:0;flex:1}
.mf-name{font-size:16.5px;font-weight:600;letter-spacing:-.2px;line-height:1.2;overflow-wrap:anywhere;text-shadow:var(--mf-txtshadow)}
.mf-desc{font-size:13px;font-weight:500;color:var(--mf-text2);margin-top:2px;line-height:1.25;
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;line-clamp:1;overflow:hidden;overflow-wrap:anywhere}
.mf-tag{font-size:11px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;flex-shrink:0;color:var(--mf-text);
  padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28)}
body.theme-light .mf-tag{background:rgba(255,255,255,.7);border-color:rgba(0,0,0,.08)}
.mf-chev{flex-shrink:0;opacity:.35}
.mf-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px;flex-shrink:0}
.mf-qb{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 14px;border-radius:999px;color:inherit;text-decoration:none;
  font-size:15px;font-weight:700;background:var(--mf-hover);box-shadow:inset 0 1px 1px var(--mf-lens-hi);outline:none;transition:transform .35s var(--mf-spring),background .2s}
.mf-qb:active{transform:scale(.96)}
@media(hover:hover){.mf-qb:hover{background:var(--mf-lens-bg)}}
.mf-qb:focus-visible{box-shadow:inset 0 0 0 2px var(--mf-focus)}
.mf-qb.current{background:linear-gradient(180deg,var(--mf-lens-bg),rgba(255,255,255,.02))}
.mf-qb .mf-ico{width:22px;height:22px;color:var(--c)}.mf-qb .mf-ico svg{width:22px;height:22px}
.mf-sec{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--mf-text2);margin:0 8px 6px;flex-shrink:0}
.mf-item.current .mf-chev{display:none}

/* ---- TABLETTE + PC : popup depuis le bouton menu ---- */
@media(min-width:768px){
  .mf-overlay{align-items:center;padding:24px}
  .mf-card{max-width:480px;margin:0;padding:22px 20px 18px;
    transform-origin:var(--mf-ox,50%) var(--mf-oy,50%);transform:scale(.5);opacity:0;
    transition:transform .3s cubic-bezier(.5,0,.75,0),opacity .22s ease}
  .mf-overlay.active .mf-card{transform:none;opacity:1;transition:transform .8s var(--mf-pop),opacity .3s ease}
  .mf-pill{display:none}.mf-grab{cursor:default}}
@media(max-width:380px){
  .mf-overlay{--mf-row:62px}
  .mf-name{font-size:16px}.mf-desc{font-size:12.5px}.mf-title{font-size:22px}}
@media(max-height:520px) and (orientation:landscape){.mf-card{max-height:96vh;max-height:96dvh}}
@media(prefers-reduced-motion:reduce){.mf-overlay,.mf-overlay *{animation:none!important;transition-duration:.01s!important}.mf-scroll{scroll-behavior:auto}}
/* ---- verre façon barre de navigation : flou 36px, reflet en haut, lentille neutre ---- */
.mf-overlay{-webkit-backdrop-filter:none;backdrop-filter:none}
.mf-card{will-change:auto}
.mf-card,.mf-close{background:rgba(var(--mf-lg),var(--mf-lg-a));-webkit-backdrop-filter:blur(42px) saturate(190%);backdrop-filter:blur(42px) saturate(190%);
  box-shadow:inset 0 1px 0 var(--mf-hi),0 0 0 .5px var(--mf-hair),0 24px 60px var(--mf-shadow)}
.mf-close{box-shadow:inset 0 1px 0 var(--mf-hi),0 0 0 .5px var(--mf-hair),0 4px 12px rgba(0,0,0,.12)}
.mf-card::before,.mf-close::before{display:none}
.mf-item.current,.mf-qb.current{background:var(--mf-lensn);box-shadow:inset 0 0 0 1px var(--mf-lens-line),inset 0 1px 1px rgba(255,255,255,.5),0 4px 14px rgba(0,0,0,.14)}
.mf-qb{background:var(--mf-hover);box-shadow:inset 0 1px 0 var(--mf-hi)}
.mf-ico svg,.mf-qb .mf-ico svg{stroke-width:2}
/* ---- design BioStudy (comme BioChem) : feuille en verre, groupes façon Réglages, pastilles rondes colorées ---- */
.mf-overlay{--mf-grp:rgba(255,255,255,.07);--mf-sep:rgba(84,84,88,.6);--mf-cur:rgba(255,255,255,.1);opacity:1;background:transparent!important;transition:background .35s,visibility 0s .45s}
body.theme-light .mf-overlay{--mf-grp:rgba(255,255,255,.72);--mf-sep:rgba(60,60,67,.18);--mf-cur:rgba(0,122,255,.09)}
.mf-overlay.active{background:rgba(0,0,0,.45)!important;transition:background .35s}
body.theme-light .mf-overlay.active{background:rgba(0,0,0,.2)!important}
.mf-card{background:rgba(var(--mf-lg),.72);-webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%);border-radius:36px;padding:10px 14px 16px}
.mf-header{padding:0 0 14px 6px}
.mf-title{font-size:28px;font-weight:800;letter-spacing:-.6px;text-shadow:none}
.mf-sub{font-size:13.5px}
.mf-close{background:var(--mf-grp);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}
.mf-quick{gap:10px;margin-bottom:18px}
.mf-qb{justify-content:flex-start;gap:10px;min-height:56px;padding:0 16px 0 10px;border-radius:999px;background:var(--mf-grp);box-shadow:none;font-size:15.5px;font-weight:600}
.mf-qb.current{background:var(--mf-cur);box-shadow:none}
.mf-qb .mf-ico{width:36px;height:36px;border-radius:50%;background:var(--c);color:#fff}
.mf-qb .mf-ico svg{width:19px;height:19px}
.mf-sec{margin:0 16px 7px;font-size:13px;font-weight:600;letter-spacing:.4px}
/* ---- recherche d'outils ---- */
.mf-find{display:flex;align-items:center;gap:9px;height:46px;padding:0 14px;margin:0 0 14px;border-radius:999px;background:var(--mf-grp);flex-shrink:0;color:var(--mf-text2)}
.mf-find svg{width:19px;height:19px;flex-shrink:0}
.mf-find input{flex:1;min-width:0;border:0;background:transparent;outline:none;font-size:16px;font-weight:500;color:var(--mf-text);-webkit-appearance:none}
.mf-find input::placeholder{color:var(--mf-text2)}
.mf-find input::-webkit-search-cancel-button{display:none}
.mf-find #mfSearchX{width:30px;height:30px;flex-shrink:0;border:0;background:transparent;color:var(--mf-text2);display:grid;place-items:center;cursor:pointer;border-radius:50%}
.mf-find #mfSearchX svg{width:15px;height:15px}
.mf-find #mfSearchX:active{transform:scale(.88)}
.mf-none{padding:26px 16px;text-align:center;color:var(--mf-text2);font-size:14.5px;font-weight:500}
.mf-list{gap:0;background:var(--mf-grp);border-radius:24px;overflow:hidden}
.mf-item{border-radius:0;min-height:62px;padding:9px 14px 9px 12px}
.mf-item+.mf-item::before{content:"";position:absolute;top:0;left:62px;right:0;height:.5px;background:var(--mf-sep)}
.mf-in{gap:14px}
.mf-ico{width:36px;height:36px;border-radius:50%;background:var(--c);color:#fff}
.mf-ico svg{width:20px;height:20px}
.mf-name{font-size:16px;text-shadow:none}
.mf-item.current{background:var(--mf-cur)!important;box-shadow:none!important}
.mf-tag{border:0;background:var(--c);color:#fff}
body.theme-light .mf-tag{background:var(--c);color:#fff}
.mf-item:active{transform:none;background:var(--mf-cur)}
.mf-new{font-size:10.5px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;flex-shrink:0;padding:3px 9px;border-radius:999px;background:#ff9f0a;color:#fff}
.mf-fb{margin-top:14px}
.mf-ck{display:block;margin:14px auto 0;padding:6px 14px;border:0;border-radius:999px;background:none;color:var(--mf-text2);font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.bs-ck{position:fixed;z-index:2147483000;left:0;right:0;margin:0 auto;width:min(360px,calc(100vw - 24px));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 76px);padding:8px 10px 10px 16px;border-radius:26px;color:#fff;box-sizing:border-box;
background:rgba(28,28,30,.7);-webkit-backdrop-filter:blur(22px) saturate(190%);backdrop-filter:blur(22px) saturate(190%);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 0 0 .5px rgba(255,255,255,.1),0 14px 36px rgba(0,0,0,.45);
font:500 13.5px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;transform:translateY(24px) scale(.95);opacity:0;transition:transform .5s cubic-bezier(.34,1.45,.64,1),opacity .3s}
.bs-ck.on{transform:none;opacity:1}
.bs-ck.light{color:#000;background:rgba(255,255,255,.76);box-shadow:inset 0 1px 0 #fff,0 0 0 .5px rgba(0,0,0,.08),0 14px 36px rgba(0,0,0,.16)}
.bs-ck button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
.bs-ckx{display:block;margin:0 2px 2px auto;font-size:11px!important;color:#8e8e93!important;text-decoration:underline;text-underline-offset:2px}
.bs-ckl{margin:0 4px 0 0;font-size:13px;line-height:1.45;color:inherit}
.bs-ckl b{display:block;margin-bottom:4px;font-size:16px;font-weight:700}
.bs-cka{display:block;width:100%;height:48px;margin-top:12px;border-radius:999px;background:#0a84ff!important;color:#fff!important;font-size:16.5px!important;font-weight:700!important;box-shadow:0 8px 22px rgba(10,132,255,.45);transition:transform .3s cubic-bezier(.34,1.45,.64,1)}
.bs-cka:active{transform:scale(.96)}
@media(min-width:1024px){.bs-ck{top:50%;bottom:auto;width:420px;padding:14px 16px 16px 22px;border-radius:30px;transform:translateY(-46%) scale(.95)}.bs-ck.on{transform:translateY(-50%)}
.bs-ckl{font-size:14px}.bs-ckl b{font-size:18px}.bs-cka{height:50px}}
.mf-bell{margin-left:auto;position:relative}.mf-bell svg{width:19px;height:19px}.mf-bell+.mf-close{margin-left:8px}
.mf-bell i{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff3b30;color:#fff;font:700 11px/18px -apple-system,BlinkMacSystemFont,sans-serif;font-style:normal;text-align:center;box-sizing:border-box;transform:scale(0);transition:transform .3s cubic-bezier(.34,1.45,.64,1)}.mf-bell.has i{transform:none}
.mf-pt{flex:1;display:flex;flex-direction:column;min-width:0}.mf-pt small{font-size:12.5px;font-weight:500;color:var(--mf-text2);line-height:1.3}
.mf-sw{flex-shrink:0;width:46px;height:28px;border-radius:999px;background:rgba(120,120,128,.32);position:relative;transition:background .25s}
.mf-sw::after{content:"";position:absolute;top:2px;left:2px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .3s cubic-bezier(.34,1.45,.64,1)}
#mfPush[aria-pressed=true] .mf-sw{background:#0a84ff}#mfPush[aria-pressed=true] .mf-sw::after{transform:translateX(18px)}
#mfPush.na .mf-sw{display:none}
.mf-fbb{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:0 16px 0 10px;border:0;border-radius:999px;background:var(--mf-grp);color:inherit;font:inherit;font-size:15.5px;font-weight:600;cursor:pointer;text-align:left}
.mf-fbb .mf-ico{width:36px;height:36px;border-radius:50%;background:var(--c);color:#fff}.mf-fbb .mf-ico svg{width:19px;height:19px}
#mfFbF{display:flex;flex-direction:column;gap:10px;margin-top:10px}
#mfFbF textarea,#mfFbF input:not(#mfFbH){width:100%;box-sizing:border-box;border:1.5px solid var(--mf-sep);background:transparent;color:inherit;font:inherit;font-size:16px;padding:12px 16px;border-radius:22px;outline:none}
#mfFbF input:not(#mfFbH){border-radius:999px}
#mfFbF textarea:focus,#mfFbF input:focus{border-color:#0a84ff}
#mfFbS{min-height:48px;border:0;border-radius:999px;background:#0a84ff;color:#fff;font:inherit;font-weight:700;font-size:15.5px;cursor:pointer}
#mfFbS:disabled{opacity:.5}
.mf-fbm{font-size:13.5px;color:var(--mf-text2);text-align:center;min-height:1em}
#mfAdm{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 8px);transform:translateX(-50%);z-index:2147483646;display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;border-radius:999px;background:#ff9500;color:#fff;font:600 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);white-space:nowrap}
@media(min-width:1024px){#mfAdm{top:auto;bottom:16px;left:16px;transform:none}}
#mfAdm button{border:0;border-radius:999px;background:rgba(255,255,255,.25);color:#fff;font:inherit;font-weight:700;padding:6px 12px;cursor:pointer}
@media(prefers-reduced-transparency:reduce){.mf-card{background:#1c1c1e;backdrop-filter:none;-webkit-backdrop-filter:none}body.theme-light .mf-card{background:#f2f2f7}}
`;

  const HTML = `
<div id="mfMenuOverlay" class="mf-overlay" role="dialog" aria-modal="true" aria-labelledby="mfTitle">
  <div id="mfCard" class="mf-card">
    <div class="mf-grab" id="mfGrab">
      <div class="mf-pill"></div>
      <div class="mf-header">
        <div class="mf-badge"></div>
        <div class="mf-titles"><span class="mf-title" id="mfTitle"></span><span class="mf-sub" id="mfSub"></span></div>
        <button class="mf-close mf-bell" id="mfBell" type="button" hidden aria-label="Notifications" title="Notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg><i></i></button>
        <button class="mf-close" id="mfClose" type="button"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div class="mf-quick" id="mfQuick"></div>
    <div class="mf-find" id="mfFind"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input id="mfSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Rechercher un outil"><button type="button" id="mfSearchX" aria-label="Effacer" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
    <div class="mf-sec" id="mfSec"></div>
    <div class="mf-scroll" id="mfScroll"><nav id="mfToolsContainer" class="mf-list"></nav><div class="mf-none" id="mfNone" hidden>Aucun outil pour cette recherche.</div>
      <button type="button" class="mf-ck" id="mfCk" hidden>Cookies et mesure d'audience</button>
      <div class="mf-fb" id="mfFb" hidden><button type="button" class="mf-fbb" id="mfFbBtn"><span class="mf-ico" style="--c:#FF9F0A"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></span><span id="mfFbT"></span></button>
        <form id="mfFbF" hidden><textarea id="mfFbX" maxlength="1500" rows="4" required></textarea><input id="mfFbC" type="email" maxlength="120" autocomplete="email"><input id="mfFbH" name="site" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px"><button type="submit" id="mfFbS"></button><div class="mf-fbm" id="mfFbM" role="status"></div></form></div></div>
  </div>
</div>`;

  /* ---------- 4. RENDU ---------- */
  let currentTools = mf_toolsData;
  let curIdx = -1;
  const firstSeg = p => decodeURIComponent(p).split('/').filter(Boolean)[0]?.replace(/\.html$/i, '').toLowerCase() || '';
  const isHome = () => firstSeg(location.pathname) === '' || firstSeg(location.pathname) === 'index';
  const $id = id => document.getElementById(id);

  function mf_renderTools(list) {
    currentTools = list;
    const box = $id('mfToolsContainer');
    if (!box) return;
    const here = firstSeg(location.pathname);
    curIdx = here ? list.findIndex(t => firstSeg(t.url) === here) : -1;
    const t = T[lang()];
    const chev = '<svg class="mf-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
    /* Accueil et BioCampus ne sont pas des outils : deux boutons au-dessus de la liste */
    const qb = (href, ico, name, cur, c, ti) => `<a href="${esc(href)}" class="mf-qb${cur ? ' current' : ''}"${ti != null ? ` data-t="${ti}"` : ''} style="--c:${c}"${cur ? ' aria-current="page"' : ''}><span class="mf-ico">${ico}</span>${esc(name)}</a>`;
    const side = list.map((tool, i) => [tool, i]).filter(([tool]) => NON_TOOLS.includes(firstSeg(tool.url)));
    $id('mfQuick').innerHTML = qb('/', HOME_SVG, t.homeShort, isHome(), '#8E8E93') +
      side.map(([tool, i]) => qb(encodeURI(tool.url), iconSvg(tool), tool.name, i === curIdx, colorFor(tool), i)).join('');
    $id('mfSec').textContent = t.tools;
    box.innerHTML = list.map((tool, i) => {
      if (NON_TOOLS.includes(firstSeg(tool.url))) return '';
      const isCur = i === curIdx;
      return `<a href="${esc(encodeURI(tool.url))}" class="mf-item${isCur ? ' current' : ''}" data-t="${i}" style="--i:${i + 1};--c:${colorFor(tool)}"${isCur ? ' aria-current="page"' : ''}>
        <span class="mf-in">
          <span class="mf-ico">${iconSvg(tool)}</span>
          <span class="mf-info"><span class="mf-name">${esc(tool.name)}</span><span class="mf-desc">${esc(tool.desc)}</span></span>
          ${tool.nouveau && !isCur ? `<span class="mf-new">${t.nouveau}</span>` : ''}${isCur ? `<span class="mf-tag">${t.here}</span>` : chev}
        </span>
      </a>`;
    }).join('');
    mf_upgradeIcons(list);
  }

  function mf_applyTexts() {
    const t = T[lang()];
    $id('mfTitle').textContent = t.title;
    $id('mfSub').textContent = t.sub;
    $id('mfClose').setAttribute('aria-label', t.close);
  }

  let list;
  const items = () => [...document.querySelectorAll('#mfMenuOverlay .mf-qb, #mfMenuOverlay .mf-item')];
  const NON_TOOLS = ['biocampus'];
  const HOME_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

  /* ---------- 4c. LIQUID GLASS (moteur partagé /liquid-glass.js) ----------
     Carte, boutons et lentille reçoivent la vraie réfraction (Chromium).
     Safari / Firefox : le CSS garde le verre flou classique. */
  function mf_loadEngine(cb) {
    if (window.LiquidGlass) return cb && cb();
    if (document.getElementById('lgEngine')) return;
    const sc = document.createElement('script'); sc.id = 'lgEngine'; sc.src = '/liquid-glass.js';
    sc.onload = () => cb && cb();
    sc.onerror = () => { sc.remove(); const s2 = document.createElement('script'); s2.src = '../liquid-glass.js'; s2.onload = () => cb && cb(); document.head.appendChild(s2); };
    document.head.appendChild(sc);
  }
  /* verre CSS identique à la barre de navigation (plus de réfraction) */
  function mf_applyGlass() {}


  /* ---------- 5. OUVERTURE / FERMETURE ---------- */
  let overlay, card, lastFocus = null;

  window.openCapsuleMenu = function () {
    if (!overlay) return;
    mf_applyTexts();
    mf_renderTools(currentTools);            // relance l'animation d'entrée + textes à jour
    const sIn = $id('mfSearch'); if (sIn) { sIn.value = ''; window.mf_applyFilter && window.mf_applyFilter(''); }
    lastFocus = document.activeElement;

    /* le popup (tablette/PC) part du bouton menu */
    const btn = document.querySelector('[data-menu]') || lastFocus;
    if (btn && btn.getBoundingClientRect) {
      const r = btn.getBoundingClientRect();
      card.style.setProperty('--mf-ox', (r.left + r.width / 2 - card.offsetLeft) + 'px');
      card.style.setProperty('--mf-oy', (r.top + r.height / 2 - card.offsetTop) + 'px');
    }

    document.documentElement.style.overflow = 'hidden';
    overlay.classList.add('active');
    mf_applyGlass();
    /* l'outil courant reste visible ; le focus clavier part de la première ligne */
    const cur = list.querySelector('.mf-item.current');  /* (Accueil/BioCampus courants : rien à faire défiler) */
    if (cur) cur.scrollIntoView({ block: 'nearest' });
    setTimeout(() => { const f = items()[0]; if (f) f.focus({ preventScroll: true }); }, 80);
  };

  window.closeCapsuleMenu = function (e) {
    if (e && e.target && e.target !== overlay && !e.target.closest('#mfClose')) return;
    if (!overlay || !overlay.classList.contains('active')) return;
    overlay.classList.remove('active');
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  window.checkMenuContrast = function () {};   // compat : le thème est géré par body.theme-light

  /* ---------- 6. INTERACTIONS ---------- */
  /* ---- recherche d'outils : filtre la liste (nom + description), accents ignorés ---- */
  const mf_norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  window.mf_applyFilter = function (q) {
    const box = $id('mfToolsContainer'); if (!box) return;
    const n = mf_norm(q).trim(), x = $id('mfSearchX'), sec = $id('mfSec'), none = $id('mfNone'), quick = $id('mfQuick');
    if (x) x.hidden = !n;
    let shown = 0;
    const score = el => {
      let txt = '';
      if (el.dataset.t != null && currentTools[+el.dataset.t]) { const tl = currentTools[+el.dataset.t]; txt = tl.name + ' ' + (tl.desc || ''); }
      else txt = (el.textContent || '') + ' accueil home';
      const show = !n || mf_norm(txt).includes(n);
      el.style.display = show ? '' : 'none';
      if (show && el.classList.contains('mf-item')) shown++;
      return show;
    };
    box.querySelectorAll('.mf-item').forEach(score);
    if (quick) { let qv = 0; quick.querySelectorAll('.mf-qb').forEach(el => { if (score(el)) qv++; }); quick.style.display = (n && !qv) ? 'none' : ''; }
    if (sec) sec.style.display = n ? 'none' : '';
    if (none) none.hidden = !(n && shown === 0);
  };

  function mf_bind() {
    overlay = $id('mfMenuOverlay');
    card = $id('mfCard');
    list = $id('mfToolsContainer');
    const grab = $id('mfGrab');
    const sIn = $id('mfSearch'), sX = $id('mfSearchX');
    if (sIn) sIn.addEventListener('input', () => window.mf_applyFilter(sIn.value));
    if (sX) sX.addEventListener('click', () => { sIn.value = ''; window.mf_applyFilter(''); sIn.focus(); });

    overlay.addEventListener('click', e => { if (e.target === overlay) window.closeCapsuleMenu(); });
    $id('mfClose').addEventListener('click', () => window.closeCapsuleMenu({ target: $id('mfClose'), currentTarget: null }));
    /* outil courant : on ferme simplement le menu */
    card.addEventListener('click', e => { const a = e.target.closest('.mf-item.current, .mf-qb.current'); if (a) { e.preventDefault(); window.closeCapsuleMenu(); } });
    addEventListener('resize', () => { if (overlay.classList.contains('active')) mf_applyGlass(); });

    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') window.closeCapsuleMenu();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const els = items(), i = els.indexOf(document.activeElement);
        const n = Math.max(0, Math.min(els.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
        if (els[n]) { e.preventDefault(); els[n].focus(); }
      }
      if (e.key === 'Tab') {                                   // focus piégé dans le menu
        const f = [...overlay.querySelectorAll('a[href],button')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    /* glisser vers le bas (bottom sheet mobile uniquement) */
    let dragging = false, startY = 0, dy = 0, t0 = 0;
    const isSheet = () => window.matchMedia('(max-width:767px)').matches;
    grab.addEventListener('pointerdown', e => {
      if (!isSheet() || e.target.closest('#mfClose, #mfBell')) return;
      dragging = true; startY = e.clientY; t0 = performance.now(); dy = 0;
      card.style.transition = 'none'; grab.setPointerCapture(e.pointerId);
    });
    grab.addEventListener('pointermove', e => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      card.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      const fast = dy / Math.max(1, performance.now() - t0) > .6;
      card.style.transition = ''; void card.offsetWidth; card.style.transform = '';
      if (dy > 110 || fast) window.closeCapsuleMenu();
      dy = 0;
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
  }

  /* ---------- 7. RÉGLAGES DU SITE : outils masqués ou en maintenance ---------- */
  async function mf_syncSite() {
    mf_renderTools(mf_toolsData);
    const site = await window.bsSite;
    if (!site) return;
    const o = site.outils || {};
    mf_guard(site);
    mf_feedback(site.avis !== false);
    mf_consent(site.gaOn !== false ? site.ga || '' : '');
    if (!Object.keys(o).length) return;
    mf_renderTools(mf_toolsData.filter(t => (o[firstSeg(t.url)] || {}).etat !== 'cache').map(t => {
      const r = o[firstSeg(t.url)] || {};
      return { ...t, desc: r.etat === 'maintenance' ? (lang() === 'en' ? 'Under maintenance' : 'En maintenance') : (r.desc || t.desc), nouveau: !!r.nouveau && r.etat !== 'maintenance' };
    }));
  }

  /* outil en maintenance : bloque la page (filet de sécurité si une copie en cache a échappé au serveur).
     Seule l'adresse ?apercu=1 (bouton réservé à l'administrateur sur la page de maintenance) laisse passer. */
  function mf_guard(site) {
    const o = site.outils || {}, msg = site.message, seg = isHome() ? '' : firstSeg(location.pathname);
    const fini = site.retour && Date.parse(site.retour) <= Date.now();   // heure de retour passée : plus de maintenance
    const bloque = !fini && (site.global || (seg && (o[seg] || {}).etat === 'maintenance'));
    if (!bloque || document.getElementById('mfMaint')) return;
    const ck = n => new RegExp('(?:^|;\\s*)' + n + '=').test(document.cookie);
    if (ck('bs_adm') && (ck('bs_apercu') || /[?&]apercu/.test(location.search))) {     // aperçu admin
      if (document.getElementById('mfAdm')) return;
      const b = document.createElement('div'); b.id = 'mfAdm';
      b.innerHTML = `<span>Aperçu admin · ${site.global ? 'site' : 'outil'} en maintenance</span><button type="button">Quitter</button>`;
      b.querySelector('button').onclick = () => { document.cookie = 'bs_apercu=; path=/; max-age=0; samesite=lax; secure'; location.href = location.pathname; };
      document.body.appendChild(b); return;
    }
    const nom = site.global ? 'BioStudy' : (mf_toolsData.find(t => firstSeg(t.url) === seg) || {}).name || seg;
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const light = document.body.classList.contains('theme-light') || document.documentElement.dataset.theme === 'light';
    const [bg, g, tx, tx2, acc] = light ? ['#f2f2f7', '#fff', '#1d1d1f', '#6e6e73', '#007aff'] : ['#000', '#1c1c1e', '#f5f5f7', '#98989d', '#0a84ff'];
    const d = document.createElement('div'); d.id = 'mfMaint';
    d.style.cssText = `position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:${bg};font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",Roboto,sans-serif`;
    d.innerHTML = `<div style="width:min(440px,100%);padding:32px 26px;border-radius:28px;background:${g};text-align:center;color:${tx}"><div style="width:64px;height:64px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:rgba(255,149,0,.16);color:#ff9500"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div><h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-.4px">${esc(nom)} est en maintenance</h1><p style="margin:10px 0 0;font-size:15.5px;line-height:1.5;color:${tx2}">${esc(msg || (site.global ? 'Le site' : "L'outil") + " est en cours de mise à jour. Merci de votre patience.")}</p>${site.global ? '' : `<a href="/" style="display:inline-flex;margin-top:22px;height:48px;padding:0 24px;align-items:center;border-radius:999px;background:${acc};color:#fff;font-weight:700;text-decoration:none">Retour à l'accueil</a>`}</div>`;
    document.body.appendChild(d); document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
  }

  /* nom de l'outil en haut (logo texte) : disparaît quand on fait défiler, revient en haut de page */
  function mf_logoScroll() {
    const L = document.querySelectorAll('.logo-c, .logo-container, header .brand');
    if (!L.length) return;
    const st = document.createElement('style');
    st.textContent = '.mf-lg{transition:opacity .3s ease,transform .4s cubic-bezier(.2,.8,.2,1)}.mf-lg.mf-off{opacity:0;transform:translateY(-12px) scale(.96);pointer-events:none}';
    document.head.appendChild(st);
    L.forEach(e => e.classList.add('mf-lg'));
    let off = false, raf = 0;
    const upd = t => { raf = 0; const y = Math.max(window.scrollY || 0, t && t.nodeType === 1 && t.clientHeight > innerHeight / 2 && t.scrollTop || 0);
      const o = y > 24; if (o !== off) { off = o; L.forEach(e => e.classList.toggle('mf-off', o)); } };
    document.addEventListener('scroll', e => { if (!raf) raf = requestAnimationFrame(() => upd(e.target)); }, { capture: true, passive: true });
    upd();
  }

  /* ---------- MESURE D'AUDIENCE (Google Analytics) : uniquement après consentement ----------
     Identifiant réglé dans le studio (onglet Site, champ « Google Analytics »). Choix mémorisé 6 mois (bs_consent),
     valable pour tout le site ; « Cookies et mesure d'audience » en bas du menu permet de changer d'avis. */
  const CK_KEY = 'bs_consent', CK_AGE = 182 * 864e5;
  const ckGet = () => { try { const c = JSON.parse(localStorage.getItem(CK_KEY) || 'null'); return c && Date.now() - c.t < CK_AGE ? c.v : ''; } catch (e) { return ''; } };
  const ckSet = v => { try { localStorage.setItem(CK_KEY, JSON.stringify({ v, t: Date.now() })); } catch (e) {} };
  function gaLoad(id) {
    if (window.__bsGa) return; window.__bsGa = 1;
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', id);
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(s);
  }
  function gaErase() {   // retire les cookies _ga si l'on retire son accord
    const host = location.hostname.split('.'), doms = ['', location.hostname, '.' + host.slice(-2).join('.')];
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => /^_ga/.test(n))
      .forEach(n => doms.forEach(d => { document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); }));
  }
  function ckBanner(id, again) {
    const old = $id('bsCk'); if (old) old.remove();
    const light = document.body.classList.contains('theme-light') || document.documentElement.dataset.theme === 'light';
    const b = document.createElement('div'); b.id = 'bsCk'; b.className = 'bs-ck' + (light ? ' light' : ''); b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Mesure d\'audience');
    b.innerHTML = `<button type="button" class="bs-ckx" data-ck="non">Continuer sans accepter</button>
<p class="bs-ckl"><b>Votre visite compte</b>Avec votre accord, BioStudy et Google Analytics utilisent des cookies (_ga, 13 mois au plus) pour mesurer l'audience : pages consultées, pays, type d'appareil. Ces chiffres servent uniquement à améliorer le site. Votre choix s'applique pendant 6 mois et peut être modifié à tout moment via « Cookies et mesure d'audience » en bas du menu des outils.</p>
<button type="button" class="bs-cka" data-ck="oui">Accepter</button>`;
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add('on'));
    b.addEventListener('click', e => { const k = e.target.closest('[data-ck]'); if (!k) return;
      const v = k.dataset.ck, prev = ckGet(); ckSet(v); if (window.bsBuzz) window.bsBuzz(10);
      b.classList.remove('on'); setTimeout(() => b.remove(), 400);
      if (v === 'oui') gaLoad(id); else if (prev === 'oui' || window.__bsGa) { gaErase(); if (again) location.reload(); } });
  }
  function mf_consent(id) {
    const btn = $id('mfCk'); if (btn) btn.hidden = !id;
    if (!id) return;
    if (btn && !btn.dataset.ok) { btn.dataset.ok = 1; btn.addEventListener('click', () => { try { window.closeCapsuleMenu({ target: $id('mfClose'), currentTarget: null }); } catch (e) {} setTimeout(() => ckBanner(id, true), 350); }); }
    const v = ckGet(); if (v === 'oui') gaLoad(id); else if (!v) setTimeout(() => ckBanner(id), 1200);
  }

  /* messages des visiteurs : « Une idée, un problème ? » en bas du menu (lus dans le studio, onglet Messages) */
  function mf_feedback(on) {
    const box = $id('mfFb'); if (!box) return;
    box.hidden = !on; if (!on || box.dataset.ok) return; box.dataset.ok = 1;
    const t = T[lang()], f = $id('mfFbF'), m = $id('mfFbM');
    $id('mfFbT').textContent = t.fb; $id('mfFbX').placeholder = t.fbPh; $id('mfFbC').placeholder = t.fbContact; $id('mfFbS').textContent = t.fbSend;
    $id('mfFbBtn').addEventListener('click', () => { f.hidden = !f.hidden; if (!f.hidden) { $id('mfFbX').focus(); setTimeout(() => f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50); } });
    f.addEventListener('submit', async e => {
      e.preventDefault(); const s = $id('mfFbS'); s.disabled = true; m.textContent = '';
      try {
        const r = await fetch('/api/vitrine/avis', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texte: $id('mfFbX').value, contact: $id('mfFbC').value, site: $id('mfFbH').value, page: firstSeg(location.pathname) || 'accueil' }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d.ok === false) throw new Error(d.erreur || t.fbErr);
        m.textContent = t.fbOk; $id('mfFbX').value = ''; if (window.bsBuzz) window.bsBuzz([12, 60, 18]);
        setTimeout(() => { f.hidden = true; m.textContent = ''; }, 2500);
      } catch (err) { m.textContent = err.message || t.fbErr; }
      s.disabled = false;
    });
  }

  /* ---------- NOTIFICATIONS PUSH ----------
     Abonnement : nom et fonction obligatoires, puis autorisation du navigateur.
     window.bsPush.open() ouvre la fenêtre (cloche du menu, cloche de l'accueil) ; bsPush.on(cb) suit l'état. */
  /* boîte de notifications (comme un réseau social) : la cloche affiche les notifications envoyées depuis le studio,
     avec une pastille rouge du nombre de nouvelles ; on s'abonne depuis cette même fenêtre */
  const PUSH = { key: '', reg: null, sub: null, ok: false, cbs: [], feed: [], unread: 0 };
  const seenKey = 'bs_notif_seen', getSeen = () => { try { return localStorage.getItem(seenKey) || ''; } catch (e) { return ''; } };
  const pushState = () => ({ visible: PUSH.ok || PUSH.feed.length > 0, available: PUSH.ok, on: !!PUSH.sub, unread: PUSH.unread });
  const pushEmit = () => { const b = $id('mfBell');
    if (b) { b.hidden = !pushState().visible; b.classList.toggle('on', !!PUSH.sub); const c = b.querySelector('i'); c.textContent = PUSH.unread > 9 ? '9+' : PUSH.unread || ''; b.classList.toggle('has', PUSH.unread > 0); }
    PUSH.cbs.forEach(f => f(pushState())); };
  window.bsPush = { open: () => notifPanel(), subscribe: () => pushSheet(), on: f => { PUSH.cbs.push(f); f(pushState()); } };
  async function feedLoad() {
    try { PUSH.feed = (await (await fetch('/api/vitrine/push-feed')).json()).feed || []; } catch (e) { PUSH.feed = []; }
    const seen = getSeen(); PUSH.unread = PUSH.feed.filter(n => n.date > seen).length; pushEmit();
  }
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  function device() {
    const u = navigator.userAgent, os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : 'Autre';
    const br = /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Edg\//.test(u) ? 'Edge' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /OPR\//.test(u) ? 'Opera' : /Chrome|CriOS/.test(u) ? 'Chrome' : /Safari/.test(u) ? 'Safari' : '';
    return os + (br ? ' · ' + br : '') + (standalone() ? ' · application' : '');
  }
  async function pushInit() {
    feedLoad();
    try { PUSH.key = (await (await fetch('/api/vitrine/push-key')).json()).key || ''; } catch (e) {}
    if (!PUSH.key) return;                                  // pas encore activé dans le studio
    if (!pushSupported()) { PUSH.ok = isIOS && !standalone(); pushEmit(); return; }   // iPhone dans Safari : on explique l'installation
    PUSH.reg = await navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).catch(() => null);
    if (!PUSH.reg) return;
    PUSH.sub = await PUSH.reg.pushManager.getSubscription(); PUSH.ok = true; pushEmit();
  }
  const BELL_I = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>';
  const BTN_IC = {
    fleche: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', lien: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    lecture: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>', telecharger: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    livre: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    etoile: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    labo: '<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/>',
    calendrier: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    cadeau: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>' };
  const btnIc = k => BTN_IC[k] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BTN_IC[k]}</svg>` : '';
  const PCSS = `
.bsp{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:rgba(0,0,0,0);visibility:hidden;transition:background .35s,visibility 0s .4s;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;
 --bg:rgba(28,28,30,.86);--tx:#fff;--tx2:rgba(235,235,245,.65);--fb:rgba(235,235,245,.26);--fill:rgba(118,118,128,.28);--acc:#0a84ff}
body.theme-light .bsp,html[data-theme=light] .bsp{--bg:rgba(255,255,255,.88);--tx:#000;--tx2:#6c6c70;--fb:rgba(60,60,67,.3);--fill:rgba(118,118,128,.12);--acc:#007aff}
.bsp.on{background:rgba(0,0,0,.4);visibility:visible;transition:background .35s}
.bsp-c{width:min(440px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:22px 20px 18px;border-radius:32px;background:var(--bg);color:var(--tx);-webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%);
 box-shadow:0 20px 60px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.2);transform:translateY(110%);transition:transform .55s cubic-bezier(.22,1,.36,1)}
.bsp.on .bsp-c{transform:none}
@media(min-width:700px){.bsp{align-items:center}.bsp-c{transform:scale(.92);opacity:0;transition:transform .45s cubic-bezier(.34,1.45,.64,1),opacity .25s}.bsp.on .bsp-c{transform:none;opacity:1}}
.bsp-h{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.bsp-i{width:44px;height:44px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:#ff3b30;color:#fff}.bsp-i svg{width:24px;height:24px}
.bsp-h b{flex:1;font-size:20px;font-weight:800;letter-spacing:-.3px}
.bsp-x{width:36px;height:36px;border:0;border-radius:50%;background:var(--fill);color:var(--tx);font-size:18px;cursor:pointer}
.bsp p{margin:6px 0 0;font-size:14.5px;line-height:1.45;color:var(--tx2)}
.bsp label,.bsp .lb{display:block;margin:16px 0 8px;font-size:12.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--tx2)}
.bsp input{width:100%;box-sizing:border-box;height:48px;padding:0 18px;border:1.5px solid var(--fb);border-radius:999px;background:transparent;color:var(--tx);font:inherit;font-size:16px;outline:none}
.bsp input:focus{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 22%,transparent)}
.bsp-ch{display:flex;flex-wrap:wrap;gap:7px}.bsp-ch+.bsp-ch,.bsp-ch+input{margin-top:10px}
.bsp-ch button{min-height:38px;padding:0 15px;border:0;border-radius:999px;background:var(--fill);color:var(--tx);font:inherit;font-size:14.5px;font-weight:600;cursor:pointer}
.bsp-ch button.on{background:var(--acc);color:#fff}
.bsp-go{width:100%;height:52px;margin-top:20px;border:0;border-radius:999px;background:var(--acc);color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer}
.bsp-go.sec{background:var(--fill);color:#ff453a}
.bsp-go:disabled{opacity:.5}
.bsp-m{min-height:1em;margin-top:10px;font-size:13.5px;text-align:center;color:var(--tx2)}.bsp-m.err{color:#ff453a}
.bsp small{display:block;margin-top:12px;font-size:12px;line-height:1.4;color:var(--tx2)}
.bsp-inbox{display:flex;flex-direction:column;max-height:min(80dvh,680px);padding-bottom:12px}
.bsp-sub{display:flex;align-items:center;gap:10px;width:100%;margin:12px 0 4px;padding:12px 12px 12px 16px;border:0;border-radius:22px;background:color-mix(in srgb,var(--acc) 14%,transparent);color:var(--tx);font:inherit;font-size:14px;text-align:left;cursor:pointer}
.bsp-sub span{flex:1}.bsp-sub b{flex-shrink:0;padding:7px 14px;border-radius:999px;background:var(--acc);color:#fff;font-size:13.5px}
.bsp-sub.on{background:var(--fill)}.bsp-sub.on b{background:transparent;color:var(--acc)}
.bsp-list{flex:1;min-height:0;overflow-y:auto;margin:6px -8px 0;padding:0 8px;overscroll-behavior:contain}
.bsp-n{position:relative;display:flex;gap:12px;padding:12px 8px;border-radius:18px;color:inherit;text-decoration:none;transition:background .2s}
.bsp-n+.bsp-n::before{content:"";position:absolute;top:0;left:60px;right:8px;height:.5px;background:var(--fb)}
.bsp-n:active{background:var(--fill)}
.bsp-nl img{width:40px;height:40px;border-radius:10px;flex-shrink:0}
.bsp-nb{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.bsp-nb b{font-size:15px;line-height:1.3}.bsp-nb>span{font-size:14px;line-height:1.4;color:var(--tx2);overflow-wrap:anywhere}
.bsp-nb small{margin-top:2px;font-size:12px;color:var(--tx2)}
.bsp-n.new .bsp-nb b::after{content:"";display:inline-block;width:8px;height:8px;margin-left:8px;border-radius:50%;background:var(--acc);vertical-align:middle}
.bsp-ni{width:100%;max-height:200px;margin-top:6px;border-radius:14px;object-fit:cover}
.bsp-bts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.bsp-nb em{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 16px;border-radius:999px;font-style:normal;font-size:14px;font-weight:700;color:var(--acc);overflow:hidden;cursor:pointer;
 background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.08)) ,color-mix(in srgb,var(--acc) 12%,transparent);-webkit-backdrop-filter:blur(16px) saturate(180%);backdrop-filter:blur(16px) saturate(180%);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -1px 1px rgba(255,255,255,.18),0 0 0 .5px color-mix(in srgb,var(--acc) 35%,transparent),0 6px 16px rgba(0,0,0,.12);transition:transform .35s cubic-bezier(.34,1.45,.64,1)}
.bsp-nb em::before{content:"";position:absolute;inset:0 0 50% 0;border-radius:999px 999px 40% 40%;background:linear-gradient(180deg,rgba(255,255,255,.35),transparent);pointer-events:none}
.bsp-nb em:active{transform:scale(.94)}
.bsp-nb em svg{width:16px;height:16px;flex-shrink:0}
.bsp-nb em:first-child{color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0)),var(--acc)}
.bsp-empty{padding:28px 0;text-align:center}`;
  const FCT = ['Étudiant(e)', 'Enseignant(e)', 'Chercheur(se)', 'Technicien(ne)', 'Autre'], NIV = ['Lycée', 'BTS / BUT', 'L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];
  /* aide selon le navigateur quand les notifications sont bloquées */
  function blockedHelp() {
    const u = navigator.userAgent, android = /Android/.test(u);
    if (navigator.brave) return android
      ? "Brave : touchez l'icône à gauche de l'adresse → <b>Paramètres du site</b> → <b>Notifications</b> → <b>Autoriser</b>. Vérifiez aussi Brave → Paramètres → <b>Paramètres des sites</b> → <b>Notifications</b> (« Demander d'abord »)."
      : "Brave : cliquez sur l'icône à gauche de l'adresse → <b>Notifications</b> → <b>Autoriser</b>. Activez aussi <b>Utiliser les services Google pour les messages push</b> dans brave://settings/privacy.";
    if (/SamsungBrowser/.test(u)) return "Samsung Internet : menu ☰ → <b>Paramètres</b> → <b>Sites et téléchargements</b> → <b>Notifications</b>, puis autorisez biostudy.xyz.";
    if (/Firefox/.test(u)) return "Firefox : touchez le cadenas à côté de l'adresse → <b>Notifications</b> → <b>Autoriser</b>.";
    if (android) return "Chrome : touchez l'icône à gauche de l'adresse → <b>Autorisations</b> → <b>Notifications</b> → <b>Autoriser</b>. Vérifiez aussi que les notifications de Chrome sont activées dans les réglages d'Android.";
    return "Cliquez sur le cadenas ou l'icône à gauche de l'adresse → <b>Notifications</b> → <b>Autoriser</b>.";
  }
  const ago = d => { const m = Math.round((Date.now() - Date.parse(d)) / 60000);
    return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : m < 10080 ? `il y a ${Math.round(m / 1440)} j` : new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); };
  const escH = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function bspOverlay() {
    if (!$id('bspCss')) { const st = document.createElement('style'); st.id = 'bspCss'; st.textContent = PCSS; document.head.appendChild(st); }
    let ov = $id('bsp'); if (!ov) { ov = document.createElement('div'); ov.id = 'bsp'; ov.className = 'bsp'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('on'); }); }
    return ov;
  }
  function notifPanel() {
    const ov = bspOverlay(), close = () => ov.classList.remove('on'), seen = getSeen();
    const sub = !PUSH.ok ? '' : PUSH.sub
      ? `<button class="bsp-sub on" type="button" data-sub><span>✓ Notifications activées sur cet appareil</span><b>Gérer</b></button>`
      : `<button class="bsp-sub" type="button" data-sub><span>Recevoir les nouveautés sur cet appareil, même site fermé</span><b>Activer</b></button>`;
    const list = PUSH.feed.length ? PUSH.feed.map(n => `<a class="bsp-n${n.date > seen ? ' new' : ''}" href="${escH(n.lien || '/')}">
        <span class="bsp-nl"><img src="/Pictures/icon-192.png" alt=""></span><span class="bsp-nb"><b>${escH(n.titre)}</b>${n.texte ? `<span>${escH(n.texte)}</span>` : ''}
        ${n.image ? `<img class="bsp-ni" src="${escH(n.image)}" alt="" onerror="this.remove()">` : ''}${(n.boutons || (n.bouton ? [n.bouton] : [])).length ? `<span class="bsp-bts">${(n.boutons || [n.bouton]).map(x => `<em data-href="${escH(x.lien || n.lien || '/')}">${btnIc(x.icone)}${escH(x.texte)}</em>`).join('')}</span>` : ''}
        <small>${ago(n.date)}</small></span></a>`).join('')
      : `<p class="bsp-empty">Aucune notification pour le moment.</p>`;
    ov.innerHTML = `<div class="bsp-c bsp-inbox"><div class="bsp-h"><span class="bsp-i">${BELL_I}</span><b>Notifications</b><button class="bsp-x" type="button" aria-label="Fermer">×</button></div>${sub}<div class="bsp-list">${list}</div></div>`;
    ov.querySelector('.bsp-x').onclick = close;
    const sb = ov.querySelector('[data-sub]'); if (sb) sb.onclick = () => pushSheet();
    ov.querySelectorAll('.bsp-n em[data-href]').forEach(e => e.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); location.href = e.dataset.href; }));
    if (PUSH.feed.length) { try { localStorage.setItem(seenKey, PUSH.feed[0].date); } catch (e) {} PUSH.unread = 0; pushEmit(); }
    requestAnimationFrame(() => ov.classList.add('on'));
  }
  function pushSheet() {
    if (!PUSH.ok) return;
    if (!$id('bspCss')) { const st = document.createElement('style'); st.id = 'bspCss'; st.textContent = PCSS; document.head.appendChild(st); }
    let ov = $id('bsp'); if (!ov) { ov = document.createElement('div'); ov.id = 'bsp'; ov.className = 'bsp'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov) close(); }); }
    const close = () => ov.classList.remove('on');
    const head = (t) => `<div class="bsp-h"><span class="bsp-i">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>'}</span><b>${t}</b><button class="bsp-x" type="button" aria-label="Fermer">×</button></div>`;
    const F = { fonction: '', niveau: '' };
    if (!pushSupported()) {                                 // iPhone / iPad dans Safari
      ov.innerHTML = `<div class="bsp-c">${head('Notifications')}<p>Sur iPhone et iPad, les notifications ne marchent que dans l'application BioStudy :</p><p>1. Touchez <b>Partager</b> en bas de Safari.<br>2. Choisissez <b>Sur l'écran d'accueil</b>.<br>3. Ouvrez BioStudy depuis la nouvelle icône, puis touchez la cloche.</p><button class="bsp-go" type="button" data-x>J'ai compris</button></div>`;
    } else if (PUSH.sub) {
      ov.innerHTML = `<div class="bsp-c">${head('Notifications activées')}<p>Vous recevez les nouveautés de BioStudy sur cet appareil.</p><button class="bsp-go sec" type="button" id="bspOff">Me désabonner</button><div class="bsp-m" id="bspM"></div></div>`;
    } else if (Notification.permission === 'denied') {
      ov.innerHTML = `<div class="bsp-c">${head('Notifications bloquées')}<p>Le navigateur bloque les notifications de BioStudy. Pour les autoriser :</p><p>${blockedHelp()}</p><p>Puis rechargez la page et touchez à nouveau la cloche.</p><button class="bsp-go" type="button" data-x>Fermer</button></div>`;
    } else {
      ov.innerHTML = `<div class="bsp-c">${head('Recevoir les notifications')}<p>Nouveaux outils, mises à jour et annonces, directement sur cet appareil.</p>
        <label for="bspNom">Nom et prénom</label><input id="bspNom" maxlength="60" autocomplete="name" placeholder="Nom et prénom">
        <span class="lb">Fonction</span><div class="bsp-ch" id="bspF">${FCT.map(v => `<button type="button" data-v="${v}">${v}</button>`).join('')}</div>
        <div class="bsp-ch" id="bspN" hidden>${NIV.map(v => `<button type="button" data-v="${v}">${v}</button>`).join('')}</div>
        <input id="bspA" maxlength="40" placeholder="Précisez votre fonction" hidden>
        <button class="bsp-go" type="button" id="bspOn">Activer les notifications</button><div class="bsp-m" id="bspM"></div>
        <small>Votre nom et votre fonction servent uniquement à BioStudy : ils ne sont ni affichés ni partagés. Vous pouvez vous désabonner à tout moment avec la cloche.</small></div>`;
      const pick = (box, key, after) => $id(box).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; if (window.bsBuzz) window.bsBuzz(10);
        $id(box).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); F[key] = b.dataset.v; after && after(); });
      pick('bspF', 'fonction', () => { $id('bspN').hidden = F.fonction !== 'Étudiant(e)'; $id('bspA').hidden = F.fonction !== 'Autre'; if ($id('bspN').hidden) F.niveau = ''; });
      pick('bspN', 'niveau');
    }
    const m = (t, err) => { const e = $id('bspM'); if (e) { e.textContent = t; e.classList.toggle('err', !!err); } };
    ov.querySelector('.bsp-x').onclick = close; ov.querySelectorAll('[data-x]').forEach(b => b.onclick = close);
    const on = $id('bspOn'); if (on) on.onclick = async () => {
      const nom = $id('bspNom').value.trim(), fonction = F.fonction === 'Autre' ? ($id('bspA').value.trim() || '') : F.fonction;
      if (nom.length < 2) return m('Indiquez votre nom et prénom.', 1);
      if (!fonction) return m(F.fonction === 'Autre' ? 'Précisez votre fonction.' : 'Choisissez votre fonction.', 1);
      if (F.fonction === 'Étudiant(e)' && !F.niveau) return m('Choisissez votre niveau.', 1);
      on.disabled = true; m('Autorisez les notifications dans la fenêtre du navigateur…');
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'denied') { on.disabled = false; ov.querySelector('.bsp-c').innerHTML = `${head('Notifications bloquées')}<p>${blockedHelp()}</p><p>Puis rechargez la page et touchez à nouveau la cloche.</p><button class="bsp-go" type="button" data-x>Fermer</button>`; ov.querySelector('.bsp-x').onclick = close; ov.querySelector('[data-x]').onclick = close; return; }
        if (perm !== 'granted') { on.disabled = false; return m("La demande d'autorisation n'a pas pu s'afficher. Sur Android, fermez les applications qui s'affichent par-dessus l'écran (enregistreur d'écran, bulles de discussion, filtre de lumière bleue…), puis réessayez.", 1); }
        const u8 = s => { const q = (s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(q), c => c.charCodeAt(0)); };
        PUSH.sub = await PUSH.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(PUSH.key) });
        const r = await fetch('/api/vitrine/push-sub', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sub: PUSH.sub.toJSON(), nom, fonction, niveau: F.niveau, appareil: device(), page: firstSeg(location.pathname) || 'accueil' }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur || '');
        if (window.bsBuzz) window.bsBuzz([12, 60, 18]); pushEmit();
        ov.querySelector('.bsp-c').innerHTML = `${head('C\'est activé')}<p>Merci ${nom.split(' ')[0].replace(/[<>&"]/g, '')} ! Vous recevrez les nouveautés de BioStudy sur cet appareil.</p><button class="bsp-go" type="button" data-x>Fermer</button>`;
        ov.querySelector('.bsp-x').onclick = close; ov.querySelector('[data-x]').onclick = () => notifPanel();
      } catch (e) { on.disabled = false; m(e.message || 'Activation impossible, réessayez plus tard.', 1); }
    };
    const off = $id('bspOff'); if (off) off.onclick = async () => {
      off.disabled = true;
      try { const ep = PUSH.sub.endpoint; await PUSH.sub.unsubscribe(); PUSH.sub = null; pushEmit();
        fetch('/api/vitrine/push-unsub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: ep }) }).catch(() => {});
        if (window.bsBuzz) window.bsBuzz(12); close(); } catch (e) { off.disabled = false; m('Désabonnement impossible, réessayez.', 1); }
    };
    requestAnimationFrame(() => ov.classList.add('on'));
  }

  /* ---------- 8. INIT ---------- */
  function init() {
    if (document.getElementById('mfMenuOverlay')) return;
    const st = document.createElement('style'); st.id = 'mfStyles'; st.textContent = CSS;
    document.head.appendChild(st);
    document.body.insertAdjacentHTML('beforeend', HTML);
    mf_bind(); mf_applyTexts(); mf_syncSite();
    pushInit();
    $id('mfBell').addEventListener('click', () => { if (window.bsBuzz) window.bsBuzz(10); window.closeCapsuleMenu && window.closeCapsuleMenu(); setTimeout(notifPanel, 250); }); mf_logoScroll();
    /* contenus mis en avant (gérés dans /studio/) */
    if (!window.Vitrine && !document.getElementById('vtJs')) { const v = document.createElement('script'); v.id = 'vtJs'; v.src = '/vitrine.js'; v.defer = true; document.head.appendChild(v); }
    /* retour haptique commun (inactif sur les pages qui ont le leur : data-haptic="own") */
    if (!window.bsBuzz && !document.getElementById('hapJs')) { const h = document.createElement('script'); h.id = 'hapJs'; h.src = '/haptique.js'; h.defer = true; document.head.appendChild(h); }
    if (!document.getElementById('verreJs') && document.documentElement.dataset.verre) { const v = document.createElement('script'); v.id = 'verreJs'; v.src = '/verre.js'; v.defer = true; document.head.appendChild(v); }
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
