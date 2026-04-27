export type Language = "en" | "fr";

type Dictionary = Record<string, string>;

const translations: Record<Language, Dictionary> = {
  en: {
    "app.title": "OpenVPN-GUI",
    "nav.skip": "Skip to main content",
    "sidebar.aria": "OpenVPN Profiles",
    "theme.toggle.aria": "Toggle light or dark theme",
    "theme.toggle.title": "Theme",
    "btn.import": "Import .ovpn file",
    "empty.title": "No profile selected",
    "empty.desc": "Choose a profile from the left list or import an .ovpn file.",
    "btn.connect": "Connect",
    "btn.disconnect": "Disconnect",
    "btn.cancel": "Cancel",
    "status.idle": "Disconnected",
    "status.connecting": "Connecting...",
    "status.connected": "Connected",
    "status.error": "Error",
    "status.checkLogs": "Check logs",
    "stats.interface": "Interface",
    "stats.interface.none": "none (tun/tap)",
    "terminal.title": "openvpn-gui-daemon · logs",
    "terminal.actions.aria": "Log actions",
    "btn.copy": "Copy",
    "btn.clearView": "Clear view",
    "btn.refresh": "Refresh",
    "history.title": "History",
    "btn.clearHistory": "Clear history",
    "select.profile.aria": "Profile (internal sync)",
    "select.profile.placeholder": "Select an .ovpn profile",
    "modal.edit.title": "Edit profile",
    "modal.edit.hint1": "The display name is local to this application. The path modifies the file on disk (rename or move on the same volume).",
    "modal.edit.displayName": "Display name",
    "modal.edit.displayNamePlaceholder": "Leave empty to use filename",
    "modal.edit.group": "Folder / Group",
    "modal.edit.groupPlaceholder": "Folder name (leave empty for root)",
    "modal.edit.filePath": "File path",
    "modal.btn.cancel": "Cancel",
    "modal.btn.editor": "Open in editor",
    "modal.btn.save": "Save",
    "feedback.pathExists": "This path already exists: ",
    "feedback.openFailed": "Failed to open file: ",
    "feedback.renamed": "Renamed to ",
    "feedback.saved": "Changes saved.",
    "vpn.unknown": "unknown",
    "update.available": "Update available",
    "btn.later": "Later",
    "btn.updateNow": "Update now",
    "update.upToDate": "App is up to date.",
    "update.checkFailed": "Update check failed.",
    "update.downloading": "Downloading update...",
    "update.downloadingPerc": "Downloading update: {perc}%",
    "update.installed": "Update installed. Restarting...",
    "update.failed": "Update failed. Please try again later.",
    "feedback.demoHint": "Visual example only: import a real .ovpn file.",
    "status.sub.idle": "Ready to establish a session.",
    "status.sub.connecting": "Negotiating with the server...",
    "status.sub.connected": "Active VPN session.",
    "status.sub.error": "Check profile or logs.",
    "stats.protocol": "Protocol",
    "stats.cipher": "Cipher",
    "stats.remote": "Remote",
    "stats.down": "Down",
    "stats.up": "Up",
    "stats.totalDown": "Total Down",
    "stats.totalUp": "Total Up",
    "feedback.selectProfile": "Please select or import an .ovpn profile",
    "feedback.profileSaved": "Profile saved to list",
    "feedback.profileSelected": "Profile selected",
    "dialog.browseTitle": "Choose an OpenVPN file",
    "feedback.profileRemoved": "Profile removed from list",
    "modal.edit.filenamePrefix": "File name: ",
    "feedback.emptyPath": "File path cannot be empty.",
    "feedback.noPathToOpen": "No path to open.",
    "history.empty": "No recorded events",
    "history.noDetails": "No details",
    "feedback.historyCleared": "History cleared",
    "feedback.logsCleared": "Logs view cleared",
    "feedback.noLogsToCopy": "No logs to copy",
    "feedback.logsCopied": "Logs copied to clipboard",
    "feedback.copyFailed": "Failed to copy (permissions)",
    "event.connectRequested": "Connection requested",
    "event.connectFailed": "Connection failed",
    "event.disconnectRequested": "Disconnection requested",
    "sidebar.dragHint": "Drag and drop to reorder profiles",
    "status.demo": "Example",
    "btn.edit.aria": "Edit profile (display name, path)",
    "btn.remove.aria": "Remove from list",
    "status.demoTitle": "Unsaved example",
  },
  fr: {
    "app.title": "OpenVPN-GUI",
    "nav.skip": "Aller au contenu",
    "sidebar.aria": "Profils OpenVPN",
    "theme.toggle.aria": "Basculer le thème clair ou sombre",
    "theme.toggle.title": "Thème",
    "btn.import": "Importer un fichier .ovpn",
    "empty.title": "Aucun profil sélectionné",
    "empty.desc": "Choisissez un profil dans la liste à gauche ou importez un fichier .ovpn.",
    "btn.connect": "Connecter",
    "btn.disconnect": "Déconnecter",
    "btn.cancel": "Abandonner",
    "status.idle": "Déconnecté",
    "status.connecting": "Connexion en cours...",
    "status.connected": "Connecté",
    "status.error": "Erreur",
    "status.checkLogs": "Vérifiez les journaux",
    "stats.interface": "Interface",
    "stats.interface.none": "aucune (tun/tap)",
    "terminal.title": "openvpn-gui-daemon · journaux",
    "terminal.actions.aria": "Actions sur les journaux",
    "btn.copy": "Copier",
    "btn.clearView": "Vider l'affichage",
    "btn.refresh": "Rafraîchir",
    "history.title": "Historique",
    "btn.clearHistory": "Effacer l'historique",
    "select.profile.aria": "Profil (synchronisation interne)",
    "select.profile.placeholder": "Choisir un profil .ovpn",
    "modal.edit.title": "Modifier le profil",
    "modal.edit.hint1": "Le nom affiché est propre à cette application. Le chemin modifie le fichier sur le disque (renommage ou déplacement sur le même volume).",
    "modal.edit.displayName": "Nom affiché",
    "modal.edit.displayNamePlaceholder": "Laisser vide pour utiliser le nom du fichier",
    "modal.edit.group": "Dossier / Groupe",
    "modal.edit.groupPlaceholder": "Nom du dossier (laisser vide pour la racine)",
    "modal.edit.filePath": "Chemin du fichier",
    "modal.btn.cancel": "Annuler",
    "modal.btn.editor": "Ouvrir dans l'éditeur",
    "modal.btn.save": "Enregistrer",
    "feedback.pathExists": "Ce chemin existe déjà : ",
    "feedback.openFailed": "Impossible d'ouvrir le fichier : ",
    "feedback.renamed": "Renommé en ",
    "feedback.saved": "Modifications enregistrées.",
    "vpn.unknown": "inconnu",
    "update.available": "Mise à jour disponible",
    "btn.later": "Plus tard",
    "btn.updateNow": "Mettre à jour",
    "update.upToDate": "L'application est à jour.",
    "update.checkFailed": "Échec de la vérification de mise à jour.",
    "update.downloading": "Téléchargement de la mise à jour...",
    "update.downloadingPerc": "Téléchargement : {perc}%",
    "update.installed": "Mise à jour installée. Redémarrage...",
    "update.failed": "Échec de la mise à jour. Veuillez réessayer plus tard.",
    "feedback.demoHint": "Exemple visuel uniquement : importez un fichier .ovpn réel.",
    "status.sub.idle": "Prêt à établir une session.",
    "status.sub.connecting": "Négociation avec le serveur...",
    "status.sub.connected": "Session VPN active.",
    "status.sub.error": "Vérifiez le profil ou les journaux.",
    "stats.protocol": "Protocole",
    "stats.cipher": "Chiffrement",
    "stats.remote": "Distant",
    "stats.down": "Descendant",
    "stats.up": "Ascendant",
    "stats.totalDown": "Total Reçu",
    "stats.totalUp": "Total Envoyé",
    "feedback.selectProfile": "Choisissez ou importez un profil .ovpn",
    "feedback.profileSaved": "Profil enregistré dans la liste",
    "feedback.profileSelected": "Profil sélectionné",
    "dialog.browseTitle": "Choisir un fichier OpenVPN",
    "feedback.profileRemoved": "Profil retiré de la liste",
    "modal.edit.filenamePrefix": "Nom du fichier : ",
    "feedback.emptyPath": "Le chemin du fichier ne peut pas être vide.",
    "feedback.noPathToOpen": "Aucun chemin à ouvrir.",
    "history.empty": "Aucun événement enregistré",
    "history.noDetails": "Aucun détail",
    "feedback.historyCleared": "Historique effacé",
    "feedback.logsCleared": "Affichage des journaux effacé",
    "feedback.noLogsToCopy": "Aucun journal à copier",
    "feedback.logsCopied": "Journaux copiés dans le presse-papiers",
    "feedback.copyFailed": "Copie impossible (permissions)",
    "event.connectRequested": "Connexion demandée",
    "event.connectFailed": "Échec de connexion",
    "event.disconnectRequested": "Déconnexion demandée",
    "sidebar.dragHint": "Glisser-déposer pour réorganiser les profils",
    "status.demo": "Exemple",
    "btn.edit.aria": "Modifier le profil (nom affiché, chemin)",
    "btn.remove.aria": "Retirer de la liste",
    "status.demoTitle": "Exemple non sauvegardé",
  },
};

let currentLang: Language = "en";

export function initI18n(): void {
  const saved = localStorage.getItem("app-lang");
  if (saved === "fr" || saved === "en") {
    currentLang = saved;
  } else {
    // Detect browser language
    if (navigator.language.startsWith("fr")) {
      currentLang = "fr";
    } else {
      currentLang = "en";
    }
  }
  applyTranslations();
  updateLangButton();
}

export function toggleLanguage(): void {
  currentLang = currentLang === "en" ? "fr" : "en";
  localStorage.setItem("app-lang", currentLang);
  applyTranslations();
  updateLangButton();
}

export function getLocale(): string {
  return currentLang === "fr" ? "fr-FR" : "en-US";
}

export function t(key: string, params?: Record<string, string>): string {
  let text = translations[currentLang][key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export function applyTranslations(): void {
  document.documentElement.lang = currentLang;

  const elements = document.querySelectorAll<HTMLElement>("[data-i18n]");
  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;

    const text = t(key);
    
    if (el.tagName === "INPUT" && el.hasAttribute("placeholder")) {
      (el as HTMLInputElement).placeholder = text;
    } else if (el.hasAttribute("aria-label")) {
      el.setAttribute("aria-label", text);
    } else if (el.hasAttribute("title")) {
      el.setAttribute("title", text);
    } else {
      // Preserve child elements like SVGs if we are applying to a button with text and icon
      // but simple string replacement is safer for generic elements
      // If the element has a specific span for text, it's better to target the span
      el.textContent = text;
    }
  });

  // Re-dispatch a custom event so other components can re-render if needed
  window.dispatchEvent(new CustomEvent("i18n-changed"));
}

function updateLangButton(): void {
  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.textContent = currentLang.toUpperCase();
  }
}
