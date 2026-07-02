// N'autorise que les URLs http(s). Bloque javascript:, data:, etc. (anti-XSS).
export function safeHttpUrl(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
