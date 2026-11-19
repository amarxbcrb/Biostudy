/* =========================================================================
   VITRINE — contenus mis en avant sur le site (API Cloudflare Pages Functions)
   Stockage : espace KV lié sous le nom VITRINE ; mot de passe : variable VITRINE_CLE.

   Public
     GET  /api/vitrine/live?p=<page>   contenus actifs pour une page
     GET  /api/vitrine/m/<id>          fichier (image / vidéo)
   Studio (en-tête X-Cle = VITRINE_CLE)
     GET  /api/vitrine/check           vérifie le mot de passe
     GET  /api/vitrine/all             tous les contenus
     POST /api/vitrine/save            crée / modifie un contenu (JSON)
     POST /api/vitrine/del             supprime un contenu {id}
     POST /api/vitrine/up              envoie un fichier (corps brut) → {id}
   Réglages du site (logo, favicon, outils masqués / en maintenance / « Nouveau », site entier en maintenance)
     GET  /api/vitrine/site            réglages publics (cache d'une minute)
     POST /api/vitrine/site            enregistre les réglages (studio)
   Messages des visiteurs (bouton « Une idée, un problème ? » du menu)
     POST /api/vitrine/avis            public : {texte, page, contact} (limité à 1 message / 30 s par adresse)
     GET  /api/vitrine/avis            studio : liste
     POST /api/vitrine/avis-maj        studio : {ids, lu} ou {ids, suppr} ou {tout:'suppr'}
   Avis notés de l'accueil (nom, fonction, niveau, note 1–5, commentaire) — publiés après validation dans le studio
     GET  /api/vitrine/notes           public : avis validés + moyenne (cache d'une minute)
     POST /api/vitrine/notes           public : nouvel avis (en attente)
     GET  /api/vitrine/notes-all       studio : tous les avis
     POST /api/vitrine/notes-maj       studio : {ids, ok} (publier / retirer) ou {ids, suppr}
   Notifications push (Web Push, clés VAPID créées une fois depuis le studio et gardées dans KV)
     GET  /api/vitrine/push-key        public : clé publique VAPID ('' si non configuré)
     POST /api/vitrine/push-sub        public : enregistre un abonnement {sub}
     POST /api/vitrine/push-unsub      public : supprime un abonnement {endpoint}
     GET  /api/vitrine/push-last       public : dernière notification (lue par /sw.js à la réception)
     GET  /api/vitrine/push-feed       public : notifications envoyées (boîte de la cloche, cache d'une minute)
     POST /api/vitrine/push-setup      studio : {pub, jwk} clés VAPID générées dans le navigateur
     GET  /api/vitrine/push-stat       studio : configuré ?, nombre d'abonnés, historique
     POST /api/vitrine/push-send       studio : {titre, texte, lien, image? (id envoyé) | imageUrl? (https), boutons? [{texte, lien, icone}] (2 max), cursor?} envoi par lots de 40 (limite gratuite Cloudflare)
     GET  /api/vitrine/push-subs       studio : liste des abonnés (nom, fonction, appareil, date)
     POST /api/vitrine/push-subdel     studio : supprime un abonné {id}
     POST /api/vitrine/push-histdel    studio : retire une notification de l'historique {id}
   Les messages push n'ont pas de contenu chiffré : le service worker va chercher le texte sur push-last.
   ========================================================================= */

const MAX_FILE = 24 * 1024 * 1024;           // limite d'une valeur KV : 25 Mo
const TYPES = /^(image\/(png|jpe?g|webp|gif|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/;
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* réglages du site : logo, favicon, état de chaque outil (visible, cache, maintenance) */
const ETATS = ['visible', 'cache', 'maintenance'];
function cleanSite(o) {
  o = o && typeof o === 'object' ? o : {};
  const id = v => str(v, 40).replace(/[^a-z0-9]/gi, '');
  const outils = {};
  Object.entries(o.outils && typeof o.outils === 'object' ? o.outils : {}).slice(0, 40).forEach(([k, v]) => {
    const key = str(k, 40).toLowerCase(); const etat = v && ETATS.includes(v.etat) ? v.etat : 'visible';
    const r = {}; if (etat !== 'visible') r.etat = etat; if (v && v.nouveau) r.nouveau = true;
    const desc = v && str(v.desc, 80).trim(); if (desc) r.desc = desc;
    if (key && Object.keys(r).length) outils[key] = r;
  });
  const taille = Math.round(Math.min(160, Math.max(60, +o.logoTaille || 100)));
  const retour = o.retour && !isNaN(Date.parse(o.retour)) ? new Date(o.retour).toISOString() : '';
  const ga = /^G-[A-Z0-9]{4,20}$/.test(str(o.ga, 30).trim().toUpperCase()) ? str(o.ga, 30).trim().toUpperCase() : '';   // Google Analytics (après consentement)
  return { logo: id(o.logo), favicon: id(o.favicon), logoTaille: taille, outils, global: !!o.global, retour, avis: o.avis !== false, ga, gaOn: o.gaOn !== false,
    message: str(o.message, 400), modifie: new Date().toISOString() };
}
async function getSite(env) { return (await env.VITRINE.get('site', 'json')) || { logo: '', favicon: '', outils: {}, message: '' }; }

/* ---- notifications push ---- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function subId(endpoint) { return b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))).slice(0, 32); }
/* jeton VAPID (JWT ES256) : prouve au service de push que l'envoi vient de BioStudy */
async function vapidAuth(endpoint, v) {
  const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://www.biostudy.xyz/' });
  const key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head));
  return `vapid t=${head}.${b64u(sig)}, k=${v.pub}`;
}

async function list(env) { return (await env.VITRINE.get('items', 'json')) || []; }
async function store(env, items) { await env.VITRINE.put('items', JSON.stringify(items)); }

/* comparaison à temps constant du mot de passe */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const isAdmin = (req, env) => !!env.VITRINE_CLE && same(req.headers.get('X-Cle') || '', env.VITRINE_CLE);

/* un contenu est visible s'il est actif, dans sa période, et prévu pour cette page */
function visible(it, page, now) {
  if (it.statut !== 'actif') return false;
  if (it.debut && Date.parse(it.debut) > now) return false;
  if (it.fin && Date.parse(it.fin) <= now) return false;
  const pages = Array.isArray(it.pages) ? it.pages : [];
  const mode = it.pagesMode || (pages.includes('*') || !pages.length ? 'tout' : 'seulement');
  if (mode === 'tout') return true;
  return mode === 'sauf' ? !pages.includes(page) : pages.includes(page);
}

/* nettoyage de ce qui arrive du studio : seuls les champs connus sont gardés */
const str = (v, n = 2000) => (typeof v === 'string' ? v.slice(0, n) : '');
const url = v => { const s = str(v, 2000).trim(); return /^(https?:\/\/|\/)/i.test(s) ? s : ''; };
const int = (v, a, b, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
/* ancienne « fréquence » → nombre d'affichages + période */
const OLD = { jour: [1, 'jour'], session: [1, 'visite'], unefois: [1, 'total'], toujours: [0, 'visite'] };
function clean(it) {
  const c = it && typeof it.contenu === 'object' ? it.contenu : {};
  const old = OLD[it.frequence] || [1, 'jour'];
  const media = m => (m && typeof m === 'object' ? { id: str(m.id, 40).replace(/[^a-z0-9]/gi, ''), url: url(m.url), type: str(m.type, 40) } : null);
  return {
    id: str(it.id, 40).replace(/[^a-z0-9]/gi, '') || uid(),
    nom: str(it.nom, 120),
    statut: it.statut === 'pause' ? 'pause' : 'actif',
    format: ['fenetre', 'carte', 'bande'].includes(it.format) ? it.format : 'carte',
    rev: int(it.rev, 0, 1e6, 0),
    maxVues: int(it.maxVues, 0, 99, old[0]),
    par: ['jour', 'visite', 'total'].includes(it.par) ? it.par : old[1],
    delai: int(it.delai, 0, 120, 0),
    apresPages: int(it.apresPages, 1, 20, 1),
    appareils: ['tous', 'mobile', 'ordi'].includes(it.appareils) ? it.appareils : 'tous',
    pagesMode: ['tout', 'seulement', 'sauf'].includes(it.pagesMode) ? it.pagesMode : (Array.isArray(it.pages) && it.pages.length && !it.pages.includes('*') ? 'seulement' : 'tout'),
    debut: it.debut && !isNaN(Date.parse(it.debut)) ? new Date(it.debut).toISOString() : null,
    fin: it.fin && !isNaN(Date.parse(it.fin)) ? new Date(it.fin).toISOString() : null,
    pages: Array.isArray(it.pages) ? it.pages.map(p => str(p, 60).toLowerCase()).filter(Boolean).slice(0, 40) : ['*'],
    contenu: {
      titre: str(c.titre, 160), texte: str(c.texte, 1500),
      image: media(c.image), video: media(c.video),
      bouton: { texte: str(c.bouton && c.bouton.texte, 60), lien: url(c.bouton && c.bouton.lien) },
      couleur: /^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : '#0a84ff'
    },
    cree: it.cree || new Date().toISOString(),
    modifie: new Date().toISOString()
  };
}

export async function onRequest({ request, env, params }) {
  if (!env.VITRINE) return json({ ok: false, erreur: "Espace de stockage VITRINE non relié (voir Paramètres > Fonctions dans Cloudflare Pages)." }, 503);
  const route = (params.route || []).join('/');
  const method = request.method;

  try {
    /* ---- public ---- */
    if (method === 'GET' && route === 'live') {
      /* cache Cloudflare d'une minute : une lecture du stockage par page et par minute, pas par visite */
      const edge = typeof caches !== 'undefined' && caches.default, ck = new Request(request.url, { method: 'GET' });
      if (edge) { const hit = await edge.match(ck); if (hit) return hit; }
      const page = (new URL(request.url).searchParams.get('p') || 'accueil').toLowerCase().slice(0, 60);
      const now = Date.now();
      const items = (await list(env)).filter(it => visible(it, page, now))
        .map(({ id, format, contenu, rev, maxVues, par, delai, apresPages, appareils }) => ({ id, format, contenu, rev, maxVues, par, delai, apresPages, appareils }));
      const res = json({ ok: true, items }, 200, { 'Cache-Control': 'public, max-age=60' });
      if (edge) await edge.put(ck, res.clone());
      return res;
    }
    if (method === 'GET' && route === 'site') {
      const edge = typeof caches !== 'undefined' && caches.default, ck = new Request(new URL('/api/vitrine/site', request.url).href, { method: 'GET' });
      if (edge) { const hit = await edge.match(ck); if (hit) return hit; }
      const res = json({ ok: true, site: await getSite(env) }, 200, { 'Cache-Control': 'public, max-age=60' });
      if (edge) await edge.put(ck, res.clone());
      return res;
    }
    if (method === 'GET' && route === 'push-key') {
      const v = await env.VITRINE.get('push_vapid', { type: 'json', cacheTtl: 60 });
      return json({ ok: true, key: v ? v.pub : '' }, 200, { 'Cache-Control': 'public, max-age=60' });
    }
    if (method === 'GET' && route === 'push-feed') {
      const edge = typeof caches !== 'undefined' && caches.default, ck = new Request(new URL('/api/vitrine/push-feed', request.url).href, { method: 'GET' });
      if (edge) { const hit = await edge.match(ck); if (hit) return hit; }
      const feed = ((await env.VITRINE.get('push_hist', 'json')) || []).slice(0, 30).map(h => ({ id: h.id, titre: h.titre, texte: h.texte, lien: h.lien || '/',
        image: h.image ? '/api/vitrine/m/' + h.image : (h.imageUrl || ''), boutons: h.boutons || (h.bouton ? [h.bouton] : []), date: h.date }));
      const res = json({ ok: true, feed }, 200, { 'Cache-Control': 'public, max-age=60' });
      if (edge) await edge.put(ck, res.clone());
      return res;
    }
    if (method === 'GET' && route === 'push-last') {
      return json({ ok: true, notif: (await env.VITRINE.get('push_last', 'json')) || null }, 200, { 'Cache-Control': 'no-store' });
    }
    if (method === 'POST' && route === 'push-sub') {
      const b = await request.json().catch(() => ({})), s = b.sub || {};
      const ep = str(s.endpoint, 1000), keys = s.keys || {}, nom = str(b.nom, 60).trim(), fonction = str(b.fonction, 40).trim();
      if (!/^https:\/\//.test(ep)) return json({ ok: false, erreur: 'Abonnement non valide.' }, 400);
      if (nom.length < 2 || !fonction) return json({ ok: false, erreur: 'Indiquez votre nom et votre fonction.' }, 400);
      await env.VITRINE.put('ps:' + await subId(ep), JSON.stringify({ endpoint: ep, keys: { p256dh: str(keys.p256dh, 200), auth: str(keys.auth, 100) }, t: Date.now(),
        nom, fonction, niveau: str(b.niveau, 40).trim(), appareil: str(b.appareil, 60).trim(), page: str(b.page, 60) }));
      return json({ ok: true });
    }
    if (method === 'POST' && route === 'push-unsub') {
      const b = await request.json().catch(() => ({})), ep = str(b.endpoint, 1000);
      if (ep) await env.VITRINE.delete('ps:' + await subId(ep));
      return json({ ok: true });
    }
    if (method === 'POST' && route === 'avis') {
      const b = await request.json().catch(() => ({}));
      if (b.site) return json({ ok: true });                       // champ piège : robots
      const texte = str(b.texte, 1500).trim();
      if (texte.length < 3) return json({ ok: false, erreur: 'Message trop court.' }, 400);
      const site = await getSite(env);
      if (site.avis === false) return json({ ok: false, erreur: 'Les messages sont fermés pour le moment.' }, 403);
      const ip = request.headers.get('CF-Connecting-IP') || '?';
      if (await env.VITRINE.get('rl:' + ip)) return json({ ok: false, erreur: 'Patientez quelques secondes avant de renvoyer un message.' }, 429);
      await env.VITRINE.put('rl:' + ip, '1', { expirationTtl: 60 });
      const avis = (await env.VITRINE.get('avis', 'json')) || [];
      avis.unshift({ id: uid(), texte, page: str(b.page, 60), contact: str(b.contact, 120).trim(), appareil: /Mobi/i.test(request.headers.get('User-Agent') || '') ? 'mobile' : 'ordinateur', date: new Date().toISOString(), lu: false });
      await env.VITRINE.put('avis', JSON.stringify(avis.slice(0, 300)));
      return json({ ok: true });
    }
    if (method === 'GET' && route === 'notes') {
      const edge = typeof caches !== 'undefined' && caches.default, ck = new Request(new URL('/api/vitrine/notes', request.url).href, { method: 'GET' });
      if (edge) { const hit = await edge.match(ck); if (hit) return hit; }
      const pub = ((await env.VITRINE.get('notes', 'json')) || []).filter(n => n.ok);
      const moy = pub.length ? Math.round(pub.reduce((s, n) => s + n.note, 0) / pub.length * 10) / 10 : 0;
      const res = json({ ok: true, moyenne: moy, total: pub.length, notes: pub.slice(0, 60).map(({ id, nom, fonction, niveau, note, texte, date }) => ({ id, nom, fonction, niveau, note, texte, date })) }, 200, { 'Cache-Control': 'public, max-age=60' });
      if (edge) await edge.put(ck, res.clone());
      return res;
    }
    if (method === 'POST' && route === 'notes') {
      const b = await request.json().catch(() => ({}));
      if (b.site) return json({ ok: true });                       // champ piège : robots
      const nom = str(b.nom, 60).trim(), texte = str(b.texte, 800).trim(), note = Math.round(+b.note);
      if (nom.length < 2) return json({ ok: false, erreur: 'Indiquez votre nom et prénom.' }, 400);
      if (!(note >= 1 && note <= 5)) return json({ ok: false, erreur: 'Choisissez une note de 1 à 5 étoiles.' }, 400);
      if (texte.length < 5) return json({ ok: false, erreur: 'Votre commentaire est trop court.' }, 400);
      const ip = request.headers.get('CF-Connecting-IP') || '?';
      if (await env.VITRINE.get('rn:' + ip)) return json({ ok: false, erreur: 'Patientez une minute avant de renvoyer un avis.' }, 429);
      await env.VITRINE.put('rn:' + ip, '1', { expirationTtl: 60 });
      const notes = (await env.VITRINE.get('notes', 'json')) || [];
      notes.unshift({ id: uid(), nom, fonction: str(b.fonction, 40).trim(), niveau: str(b.niveau, 40).trim(), note, texte, date: new Date().toISOString(), ok: false });
      await env.VITRINE.put('notes', JSON.stringify(notes.slice(0, 500)));
      return json({ ok: true });
    }
    if (method === 'GET' && route.startsWith('m/')) {
      const id = route.slice(2).replace(/[^a-z0-9]/gi, '');
      const { value, metadata } = await env.VITRINE.getWithMetadata('m:' + id, 'arrayBuffer');
      if (!value) return new Response('Introuvable', { status: 404 });
      return new Response(value, { headers: { 'Content-Type': (metadata && metadata.type) || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }

    /* ---- studio ---- */
    if (!isAdmin(request, env)) return json({ ok: false, erreur: 'Mot de passe incorrect.' }, 401);

    if (method === 'GET' && route === 'check') return json({ ok: true });
    if (method === 'GET' && route === 'all') return json({ ok: true, items: await list(env) });

    if (method === 'POST' && route === 'save') {
      const it = clean(await request.json());
      const items = await list(env), i = items.findIndex(x => x.id === it.id);
      if (i >= 0) { it.cree = items[i].cree; items[i] = it; } else items.unshift(it);
      await store(env, items);
      return json({ ok: true, item: it });
    }
    if (method === 'POST' && route === 'site') {
      const site = cleanSite(await request.json());
      await env.VITRINE.put('site', JSON.stringify(site));
      const edge = typeof caches !== 'undefined' && caches.default;
      if (edge) await edge.delete(new Request(new URL('/api/vitrine/site', request.url).href, { method: 'GET' }));
      return json({ ok: true, site });
    }
    if (method === 'POST' && route === 'push-setup') {
      const b = await request.json(), pub = str(b.pub, 200), jwk = b.jwk;
      if (!/^[A-Za-z0-9_-]{80,100}$/.test(pub) || !jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) return json({ ok: false, erreur: 'Clés non valides.' }, 400);
      if (await env.VITRINE.get('push_vapid') && !b.remplacer) return json({ ok: false, erreur: 'Les notifications sont déjà configurées.' }, 409);
      await env.VITRINE.put('push_vapid', JSON.stringify({ pub, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d } }));
      return json({ ok: true });
    }
    if (method === 'GET' && route === 'push-stat') {
      let n = 0, cursor;
      do { const r = await env.VITRINE.list({ prefix: 'ps:', cursor }); n += r.keys.length; cursor = r.list_complete ? null : r.cursor; } while (cursor);
      return json({ ok: true, configure: !!(await env.VITRINE.get('push_vapid')), abonnes: n, hist: (await env.VITRINE.get('push_hist', 'json')) || [] });
    }
    if (method === 'POST' && route === 'push-send') {
      const b = await request.json(), v = await env.VITRINE.get('push_vapid', 'json');
      if (!v) return json({ ok: false, erreur: "Activez d'abord les notifications." }, 400);
      let id = str(b.id, 40);
      if (!b.cursor) {                                 // premier lot : enregistre la notification
        const okUrl = u => /^(\/(?!\/)|https:\/\/)/.test(u);
        const titre = str(b.titre, 80).trim(), texte = str(b.texte, 240).trim(), lien0 = str(b.lien, 300).trim(), lien = okUrl(lien0) ? lien0 : '/';
        const image = str(b.image, 40).replace(/[^a-z0-9]/gi, ''), imageUrl = str(b.imageUrl, 500).trim();
        if (!titre) return json({ ok: false, erreur: 'Écrivez un titre.' }, 400);
        if (imageUrl && !/^https:\/\//.test(imageUrl)) return json({ ok: false, erreur: "Le lien de l'image doit commencer par https://" }, 400);
        /* jusqu'à 2 boutons (texte, lien, icône) ; un lien vide renvoie à la page principale */
        const boutons = (Array.isArray(b.boutons) ? b.boutons : b.bouton ? [b.bouton] : []).slice(0, 2).map(x => {
          const t = str(x && x.texte, 30).trim(), l = str(x && x.lien, 300).trim();
          return t ? { texte: t, lien: okUrl(l) ? l : lien, icone: str(x.icone, 20).replace(/[^a-z]/g, '') } : null; }).filter(Boolean);
        id = uid();
        await env.VITRINE.put('push_last', JSON.stringify({ id, title: titre, body: texte, url: lien, image: image ? '/api/vitrine/m/' + image : imageUrl,
          actions: boutons.map((x, i) => ({ action: 'b' + i, title: x.texte, url: x.lien })), date: new Date().toISOString() }));
        const hist = (await env.VITRINE.get('push_hist', 'json')) || [];
        hist.unshift({ id, titre, texte, lien, image, imageUrl, boutons, date: new Date().toISOString(), envoyes: 0, echecs: 0 });
        await env.VITRINE.put('push_hist', JSON.stringify(hist.slice(0, 30)));
        { const edge = typeof caches !== 'undefined' && caches.default; if (edge) await edge.delete(new Request(new URL('/api/vitrine/push-feed', request.url).href, { method: 'GET' })); }
      }
      const r = await env.VITRINE.list({ prefix: 'ps:', cursor: b.cursor || undefined, limit: 40 });
      let envoyes = 0, echecs = 0, retires = 0;
      await Promise.all(r.keys.map(async k => {
        try {
          const s = await env.VITRINE.get(k.name, 'json'); if (!s) return;
          const res = await fetch(s.endpoint, { method: 'POST', headers: { Authorization: await vapidAuth(s.endpoint, v), TTL: '86400', Urgency: 'normal' }, body: new Uint8Array(0) });
          if (res.status === 404 || res.status === 410) { await env.VITRINE.delete(k.name); retires++; }
          else if (res.ok) envoyes++; else echecs++;
        } catch (e) { echecs++; }
      }));
      const hist = (await env.VITRINE.get('push_hist', 'json')) || [], h = hist.find(x => x.id === id);
      if (h) { h.envoyes += envoyes; h.echecs += echecs + retires; await env.VITRINE.put('push_hist', JSON.stringify(hist)); }
      return json({ ok: true, id, envoyes, echecs, retires, cursor: r.list_complete ? null : r.cursor });
    }
    if (method === 'GET' && route === 'push-subs') {
      const out = []; let cursor;
      do { const r = await env.VITRINE.list({ prefix: 'ps:', cursor });
        for (const k of r.keys) { const s = await env.VITRINE.get(k.name, 'json'); if (s) out.push({ id: k.name.slice(3), nom: s.nom || '', fonction: s.fonction || '', niveau: s.niveau || '', appareil: s.appareil || '', page: s.page || '', date: s.t ? new Date(s.t).toISOString() : '' }); }
        cursor = r.list_complete ? null : r.cursor; } while (cursor);
      out.sort((a, c) => (c.date > a.date ? 1 : -1));
      return json({ ok: true, abonnes: out });
    }
    if (method === 'POST' && route === 'push-subdel') {
      const b = await request.json(), id = str(b.id, 40).replace(/[^A-Za-z0-9_-]/g, '');
      if (id) await env.VITRINE.delete('ps:' + id);
      return json({ ok: true });
    }
    if (method === 'POST' && route === 'push-histdel') {
      const b = await request.json(), id = str(b.id, 40);
      const all = (await env.VITRINE.get('push_hist', 'json')) || [], gone = all.find(h => h.id === id), hist = all.filter(h => h.id !== id);
      await env.VITRINE.put('push_hist', JSON.stringify(hist));
      { const edge = typeof caches !== 'undefined' && caches.default; if (edge) await edge.delete(new Request(new URL('/api/vitrine/push-feed', request.url).href, { method: 'GET' })); }
      /* l'image envoyée depuis le studio est supprimée aussi, si aucune autre notification ni aucun contenu ne l'utilise */
      if (gone && gone.image && !hist.some(h => h.image === gone.image)) {
        const items = await list(env), used = items.some(x => ['image', 'video'].some(k => x.contenu && x.contenu[k] && x.contenu[k].id === gone.image));
        const site = await getSite(env);
        if (!used && site.logo !== gone.image && site.favicon !== gone.image) await env.VITRINE.delete('m:' + gone.image);
      }
      const last = await env.VITRINE.get('push_last', 'json');
      if (last && last.id === id) await env.VITRINE.delete('push_last');   // un appareil qui la recevrait en retard n'affiche plus ce texte
      return json({ ok: true, hist });
    }
    if (method === 'GET' && route === 'notes-all') return json({ ok: true, notes: (await env.VITRINE.get('notes', 'json')) || [] });
    if (method === 'POST' && route === 'notes-maj') {
      const b = await request.json(), ids = new Set(Array.isArray(b.ids) ? b.ids : []);
      let notes = (await env.VITRINE.get('notes', 'json')) || [];
      if (b.suppr) notes = notes.filter(n => !ids.has(n.id)); else notes.forEach(n => { if (ids.has(n.id)) n.ok = !!b.ok; });
      await env.VITRINE.put('notes', JSON.stringify(notes));
      const edge = typeof caches !== 'undefined' && caches.default;
      if (edge) await edge.delete(new Request(new URL('/api/vitrine/notes', request.url).href, { method: 'GET' }));
      return json({ ok: true, notes });
    }
    if (method === 'GET' && route === 'avis') return json({ ok: true, avis: (await env.VITRINE.get('avis', 'json')) || [] });
    if (method === 'POST' && route === 'avis-maj') {
      const b = await request.json(), ids = new Set(Array.isArray(b.ids) ? b.ids : []);
      let avis = (await env.VITRINE.get('avis', 'json')) || [];
      if (b.tout === 'suppr') avis = [];
      else if (b.suppr) avis = avis.filter(a => !ids.has(a.id));
      else avis.forEach(a => { if (ids.has(a.id)) a.lu = !!b.lu; });
      await env.VITRINE.put('avis', JSON.stringify(avis));
      return json({ ok: true, avis });
    }
    if (method === 'POST' && route === 'del') {
      const { id } = await request.json();
      const items = await list(env), it = items.find(x => x.id === id);
      if (!it) return json({ ok: false, erreur: 'Contenu introuvable.' }, 404);
      /* supprime aussi ses fichiers s'ils ne servent nulle part ailleurs */
      const rest = items.filter(x => x.id !== id), used = new Set();
      rest.forEach(x => ['image', 'video'].forEach(k => x.contenu[k] && x.contenu[k].id && used.add(x.contenu[k].id)));
      await Promise.all(['image', 'video'].map(k => it.contenu[k] && it.contenu[k].id && !used.has(it.contenu[k].id) ? env.VITRINE.delete('m:' + it.contenu[k].id) : null));
      await store(env, rest);
      return json({ ok: true });
    }
    if (method === 'POST' && route === 'up') {
      const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (!TYPES.test(type)) return json({ ok: false, erreur: 'Format non pris en charge (images : PNG, JPG, WebP, GIF, AVIF, SVG ; vidéos : MP4, WebM, MOV).' }, 415);
      const body = await request.arrayBuffer();
      if (body.byteLength > MAX_FILE) return json({ ok: false, erreur: 'Fichier trop lourd (24 Mo maximum). Pour une vidéo plus longue, mettez-la sur YouTube et collez le lien.' }, 413);
      const id = uid();
      await env.VITRINE.put('m:' + id, body, { metadata: { type, taille: body.byteLength } });
      return json({ ok: true, id, type });
    }
    return json({ ok: false, erreur: 'Action inconnue.' }, 404);
  } catch (e) {
    return json({ ok: false, erreur: 'Erreur serveur : ' + (e && e.message || e) }, 500);
  }
}
