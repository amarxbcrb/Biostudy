/* =========================================================================
   MIDDLEWARE DU SITE (Cloudflare Pages Functions) — s'exécute avant chaque page
   Réglages choisis dans le studio (/studio/, onglet « Site »), stockés dans KV VITRINE (clé « site ») :
   - logo et favicon remplacés : les adresses habituelles des icônes renvoient le fichier envoyé ;
   - outil « en maintenance » : sa page affiche un message au lieu de l'outil, pour tout le monde.
     L'administrateur connecté au studio (cookie bs_adm) voit en plus un bouton « Ouvrir l'outil » qui
     ajoute ?apercu=1 et pose le cookie de session bs_apercu (aperçu admin jusqu'à « Quitter l'aperçu »).
   - site entier en maintenance (site.global) : accueil et tous les outils, même principe.
   Toutes les autres requêtes passent directement. _routes.json (racine) limite les pages qui passent par
   ce middleware (quota gratuit des fonctions Cloudflare) : y ajouter chaque nouvel outil.
   ========================================================================= */

const FAVICON = ['/favicon.png', '/favicon.ico', '/Pictures/favicon.png'];
const LOGO = ['/Pictures/logo-mark.png', '/Pictures/apple-touch-icon.png', '/Pictures/icon-192.png', '/Pictures/icon-512.png', '/Pictures/maskable-512.png'];
/* ajouter ici (et dans _routes.json, menu-flottant.js, studio) chaque nouvel outil */
const OUTILS = new Set(['biocampus', 'biopcr', 'biodilu', 'bioband', 'bioprep', 'bioconvert', 'biochem', 'biomicro', 'biostat', 'biogene']);

async function sha256(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function retourTxt(r) {
  if (!r || isNaN(Date.parse(r))) return '';
  if (Date.parse(r) <= Date.now()) return 'Retour imminent.';
  return 'Retour prévu le ' + new Date(r).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.';
}
function pageMaintenance(nom, message, admin, retour, global) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(nom)} | En maintenance</title><meta name="robots" content="noindex"><link rel="icon" type="image/png" href="/Pictures/favicon.png">
<style>
:root{--bg:#f2f2f7;--grp:#fff;--tx:#1d1d1f;--tx2:#6e6e73;--acc:#007aff;--fill:rgba(120,120,128,.16)}
@media(prefers-color-scheme:dark){:root{--bg:#000;--grp:#1c1c1e;--tx:#f5f5f7;--tx2:#98989d;--acc:#0a84ff}}
*{box-sizing:border-box;margin:0}
body{min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.c{width:min(440px,100%);padding:32px 26px;border-radius:28px;background:var(--grp);text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.08)}
.i{width:64px;height:64px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,#ff9500 16%,transparent);color:#ff9500}
h1{font-size:24px;font-weight:800;letter-spacing:-.4px}p{margin-top:10px;font-size:15.5px;line-height:1.5;color:var(--tx2)}

.b{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:22px}
a{display:inline-flex;height:48px;padding:0 24px;align-items:center;justify-content:center;min-width:220px;border-radius:999px;background:var(--acc);color:#fff;font-weight:700;text-decoration:none}
a.s{background:var(--fill);color:var(--acc)}
p.r{display:inline-block;margin-top:14px;padding:6px 14px;border-radius:999px;background:color-mix(in srgb,#ff9500 14%,transparent);color:#c76a00;font-size:14px;font-weight:700}
</style></head><body><div class="c"><div class="i"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
<h1>${esc(nom)} est en maintenance</h1><p>${esc(message || (global ? 'Le site' : "L'outil") + " est en cours d'amélioration. Il revient très vite, merci de votre patience !")}</p>${retourTxt(retour) ? `<p class="r">${esc(retourTxt(retour))}</p>` : ''}<div class="b">${global ? '' : `<a href="/">Retour à l'accueil</a>`}${admin ? `<a class="${global ? '' : 's'}" href="?apercu=1">${global ? 'Ouvrir le site' : "Ouvrir l'outil"} (admin)</a>` : ''}</div></div></body></html>`;
}

export async function onRequest({ request, env, next }) {
  if (request.method !== 'GET' || !env.VITRINE) return next();
  const url = new URL(request.url);
  let path; try { path = decodeURIComponent(url.pathname); } catch (e) { return next(); }
  const parts = path.split('/').filter(Boolean), seg = (parts[0] || '').toLowerCase();
  const icone = FAVICON.includes(path) ? 'favicon' : LOGO.includes(path) ? 'logo' : '';
  const accueil = !parts.length || (parts.length === 1 && /^index\.html?$/i.test(parts[0]));
  const page = accueil || (OUTILS.has(seg) && (parts.length === 1 || (parts.length === 2 && /^index\.html?$/i.test(parts[1]))));
  if (!icone && !page) return next();

  let site = null;
  try { site = await env.VITRINE.get('site', { type: 'json', cacheTtl: 30 }); } catch (e) {}
  if (!site) return next();

  if (icone) {
    const id = icone === 'favicon' ? (site.favicon || site.logo) : site.logo;
    if (!id) return next();
    const { value, metadata } = await env.VITRINE.getWithMetadata('m:' + id, { type: 'arrayBuffer', cacheTtl: 300 });
    if (!value) return next();
    return new Response(value, { headers: { 'Content-Type': (metadata && metadata.type) || 'image/png', 'Cache-Control': 'public, max-age=300' } });
  }

  const reg = !accueil && site.outils && site.outils[seg];
  /* à l'heure de retour prévue, toute maintenance (site entier et outils) s'arrête toute seule */
  const fini = site.retour && Date.parse(site.retour) <= Date.now();
  if (!fini && (site.global || (reg && reg.etat === 'maintenance'))) {
    const cookie = request.headers.get('Cookie') || '', m = cookie.match(/(?:^|;\s*)bs_adm=([a-f0-9]{64})/);
    const admin = !!(m && env.VITRINE_CLE && m[1] === await sha256(env.VITRINE_CLE));
    /* aperçu admin : le bouton ajoute ?apercu=1 et pose un cookie de session pour naviguer librement
       (un bandeau « Aperçu admin » de menu-flottant.js le rappelle et permet d'en sortir) */
    if (admin && url.searchParams.has('apercu')) {
      const res = await next(), h = new Headers(res.headers);
      h.append('Set-Cookie', 'bs_apercu=1; Path=/; SameSite=Lax; Secure');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }
    if (admin && /(?:^|;\s*)bs_apercu=1/.test(cookie)) return next();
    return new Response(pageMaintenance(site.global ? 'BioStudy' : parts[0], site.message, admin, site.retour, site.global), { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '3600', 'Cache-Control': 'no-store' } });
  }
  return next();
}
