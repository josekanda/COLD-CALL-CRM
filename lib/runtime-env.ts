// Détecte si on tourne en local (poste de l'élève) ou sur Vercel.
//
// Le build de site spawn un vrai process `claude` headless : ça n'a de sens
// QUE sur la machine de l'élève (auth claude + vercel locales). Sur Vercel,
// on garde le fallback "copier la commande". Ces helpers tranchent local/distant
// côté serveur (process.env) ET côté client (hostname).

// --- Côté serveur (Route Handler) ------------------------------------------

// Vercel injecte VERCEL=1 dans toutes ses exécutions (build + runtime).
export function isServerLocal(env: NodeJS.ProcessEnv = process.env): boolean {
  return !env.VERCEL;
}

// Un Host d'origine locale : localhost, 127.0.0.1, [::1], éventuellement avec port.
export function isLocalHostHeader(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.trim().toLowerCase();
  const name = h.replace(/:\d+$/, ""); // retire le port
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name === "[::1]" ||
    name === "::1"
  );
}

// Origin / Referer de confiance : doit être http(s) sur un host local.
export function isLocalOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return isLocalHostHeader(u.host);
  } catch {
    return false;
  }
}

// --- Côté client (navigateur) ----------------------------------------------

// Le bouton "Lancer le build" ne s'affiche que si la page est servie en local.
export function isBrowserLocal(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}
