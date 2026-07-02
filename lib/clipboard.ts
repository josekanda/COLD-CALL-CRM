// Copie presse-papier avec repli (contexte non sécurisé / permission refusée).
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* repli ci-dessous */
  }
  window.prompt("Copie ceci (Cmd/Ctrl+C puis Entrée) :", text);
  return false;
}
