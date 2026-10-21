// Relais lecture seule : lit la base SIRIUS côté serveur et ne renvoie que les sillons.
// Les comptes et les hashes de mots de passe ne sortent jamais d'ici.
const SIRIUS_URL = process.env.SIRIUS_URL || "https://snck-sirius-app.netlify.app";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Méthode non autorisée." }, 405);

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[\w-]{8,64}$/.test(id)) return json({ error: "Code d'espace invalide." }, 400);

  let res;
  try {
    res = await fetch(`${SIRIUS_URL}/api/db?id=${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return json({ error: "SIRIUS injoignable." }, 502);
  }
  if (res.status === 404) return json({ error: "Espace introuvable." }, 404);
  if (!res.ok) return json({ error: "Erreur SIRIUS (" + res.status + ")." }, 502);

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") return json({ error: "Réponse SIRIUS invalide." }, 502);

  let state = data.state || {};
  if (typeof state.json === "string") {
    try { state = JSON.parse(state.json); } catch { state = {}; }
  }
  // On garantit la présence de "ligne" et "voies" (voie choisie par gare) pour chaque sillon.
  const sillons = (Array.isArray(state.sillons) ? state.sillons : []).map((s) => ({
    ...s,
    ligne: s && s.ligne ? s.ligne : "fontaine",
    voies: s && s.voies && typeof s.voies === "object" ? s.voies : {},
  }));
  return json({
    sillons,
    perturbations: Array.isArray(state.perturbations) ? state.perturbations : [],
  });
};

export const config = { path: "/api/sillons" };
