/* Relais BioCampus : le site lit les dossiers et la recherche ici plutôt que chez Google Apps Script.
   Réponses publiques (sans mot de passe ni session admin) gardées en mémoire dans le cache Cloudflare :
   - moins de FRAIS : servies telles quelles, sans réveiller Google ;
   - plus vieilles : servies quand même tout de suite, et rafraîchies en arrière-plan (stale-while-revalidate) ;
   - `nc=1` (envoyé juste après un dépôt ou une modification) : relit Google et met le cache à jour.
   Les requêtes avec mot de passe (`tk`), admin (`adm`) ou `action=verify` passent directement, sans cache.
   Les envois (POST : dépôts, administration) restent directs du navigateur vers Google. */
const API = "https://script.google.com/macros/s/AKfycbx1if1327Xceih5Yr5n67gAGwKuEHygXhlcSHmpRao_cUB0vDrI8Mkuj-IVkTriy6J48w/exec";
const FRAIS = 60;              // secondes : réponse servie sans contacter Google
const GARDE = 7 * 86400;       // secondes : durée maximale de conservation d'une copie
const PARAMS = ["action", "folderId", "q", "root", "id", "pass"];

const json = (body, status, extra) => new Response(body, {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", ...extra }
});

async function google(params) {
  const r = await fetch(API + "?" + params, { redirect: "follow", headers: { Accept: "application/json" } });
  const txt = await r.text();
  if (!r.ok) throw new Error("HTTP " + r.status);
  const o = JSON.parse(txt);   // lève une erreur si Google renvoie une page HTML
  return { txt, ok: o && o.success !== false };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url), sp = url.searchParams;
  const tk = sp.get("tk") || "", adm = sp.get("adm") || "", action = sp.get("action") || "";
  const up = new URLSearchParams();
  PARAMS.forEach(k => { const v = sp.get(k); if (v) up.set(k, v); });
  if (tk) up.set("tk", tk);
  if (adm) up.set("adm", adm);
  up.sort();

  const privee = !!tk || !!adm || action === "verify";
  const edge = !privee && typeof caches !== "undefined" ? caches.default : null;
  const cle = new Request(url.origin + "/api/campus/__cache?" + up.toString());   // même domaine : obligatoire pour le cache Cloudflare

  const remplir = async () => {
    const g = await google(up.toString());
    if (edge && g.ok) {
      await edge.put(cle, new Response(g.txt, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=" + GARDE, "X-Lu": String(Date.now()) } }));
    }
    return g.txt;
  };

  try {
    if (edge && sp.get("nc") !== "1") {
      const hit = await edge.match(cle);
      if (hit) {
        const age = (Date.now() - Number(hit.headers.get("X-Lu") || 0)) / 1000;
        if (age > FRAIS) context.waitUntil(remplir().catch(() => {}));
        return json(await hit.text(), 200, { "X-Campus": age > FRAIS ? "stale" : "hit" });
      }
    }
    return json(await remplir(), 200, { "X-Campus": privee ? "direct" : "miss" });
  } catch (e) {
    return json(JSON.stringify({ success: false, error: "Serveur des documents injoignable, réessayez.", relais: String(e && e.message || e) }), 502);
  }
}
