/**
 * Couche d'abstraction sur localStorage pour la persistance de l'état UI.
 * Centralise les clés de stockage et la sérialisation/désérialisation.
 */

const PREFIX = "openvpn-gui:";

// ─── Groupes de profils : état replié/déplié ─────────────────────────────────

/** Clé de stockage pour l'état replié d'un groupe. */
function groupKey(groupName: string): string {
  return `${PREFIX}group:collapsed:${groupName}`;
}

/**
 * Retourne `true` si le groupe est mémorisé comme replié.
 * Par défaut (première utilisation) les groupes sont ouverts.
 */
export function getGroupCollapsed(groupName: string): boolean {
  return localStorage.getItem(groupKey(groupName)) === "1";
}

/** Persiste l'état replié/déplié d'un groupe. */
export function setGroupCollapsed(groupName: string, collapsed: boolean): void {
  if (collapsed) {
    localStorage.setItem(groupKey(groupName), "1");
  } else {
    localStorage.removeItem(groupKey(groupName));
  }
}

// ─── Base de trafic de session VPN ───────────────────────────────────────────

const SESSION_TRAFFIC_KEY = `${PREFIX}session-traffic-base`;

interface PersistedTrafficBase {
  /** Chemin du profil actif au moment de l'enregistrement. */
  profilePath: string;
  /** Octets RX lus sur /proc/net/dev au début de la session. */
  rx: number;
  /** Octets TX lus sur /proc/net/dev au début de la session. */
  tx: number;
}

/**
 * Retourne la base RX/TX persistée pour la session VPN en cours,
 * ou `null` si aucune n'est enregistrée.
 */
export function getSessionTrafficBase(): PersistedTrafficBase | null {
  const raw = localStorage.getItem(SESSION_TRAFFIC_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "profilePath" in parsed &&
      "rx" in parsed &&
      "tx" in parsed &&
      typeof (parsed as PersistedTrafficBase).profilePath === "string" &&
      typeof (parsed as PersistedTrafficBase).rx === "number" &&
      typeof (parsed as PersistedTrafficBase).tx === "number"
    ) {
      return parsed as PersistedTrafficBase;
    }
  } catch {
    // JSON corrompu → on ignore
  }
  return null;
}

/** Persiste la base RX/TX pour la session VPN en cours. */
export function setSessionTrafficBase(base: PersistedTrafficBase): void {
  localStorage.setItem(SESSION_TRAFFIC_KEY, JSON.stringify(base));
}

/** Efface la base persistée (déconnexion, changement de profil). */
export function clearSessionTrafficBase(): void {
  localStorage.removeItem(SESSION_TRAFFIC_KEY);
}
