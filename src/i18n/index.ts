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

export function t(key: string): string {
  return translations[currentLang][key] || key;
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
