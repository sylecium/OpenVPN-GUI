import * as backend from "../api/backend";
import { extractRemoteEndpointFromOvpnLogLine } from "../lib/ovpn-remote-parse";
import { byId } from "../lib/dom";
import { session } from "../state/session";
import { setFeedback } from "../ui/feedback";
import { refreshStatRemoteDisplay } from "../ui/server-meta-view";

/** Nombre max de lignes conservées dans le panneau (évite un DOM trop lourd). */
const MAX_LOG_LINES_IN_VIEW = 2500;

function mergeAndCapLogText(existing: string, block: string): string {
  const combined = existing ? `${existing}\n${block}` : block;
  const lines = combined.split("\n");
  if (lines.length <= MAX_LOG_LINES_IN_VIEW) {
    return combined;
  }
  return lines.slice(-MAX_LOG_LINES_IN_VIEW).join("\n");
}

export async function refreshLogs(): Promise<void> {
  try {
    const logs = await backend.apiVpnLogs(session.logsCursor, 80);
    session.logsCursor = logs.nextCursor;
    if (logs.entries.length === 0) {
      return;
    }

    const panel = byId<HTMLElement>("logs");
    const scrollParent = panel.closest(".terminal-body");
    const wasPinnedToBottom =
      scrollParent instanceof HTMLElement
        ? scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 48
        : true;

    for (const entry of logs.entries) {
      const extracted = extractRemoteEndpointFromOvpnLogLine(entry.message);
      if (extracted && session.lastActiveProfile != null) {
        session.lastRemoteFromLogs = {
          path: session.lastActiveProfile,
          endpoint: extracted,
        };
      }
    }

    const lines = logs.entries.map((entry) => {
      const ts = new Date(entry.ts_unix_ms).toLocaleTimeString("fr-FR");
      return `[${ts}] ${entry.level.toUpperCase()} ${entry.message}`;
    });
    const existing = panel.textContent ?? "";
    panel.textContent = mergeAndCapLogText(existing, lines.join("\n"));

    if (scrollParent instanceof HTMLElement) {
      if (wasPinnedToBottom) {
        scrollParent.scrollTop = scrollParent.scrollHeight;
      }
    }

    refreshStatRemoteDisplay();
  } catch (error) {
    setFeedback(String(error), true);
  }
}

export function clearLogsView(): void {
  const panel = byId<HTMLElement>("logs");
  panel.textContent = "";
  session.logsCursor = 0;
  const scrollParent = panel.closest(".terminal-body");
  if (scrollParent instanceof HTMLElement) {
    scrollParent.scrollTop = 0;
  }
  setFeedback("Affichage des journaux effacé");
}

export async function copyLogsToClipboard(): Promise<void> {
  const panel = byId<HTMLElement>("logs");
  const text = panel.textContent ?? "";
  if (!text.trim()) {
    setFeedback("Aucun journal à copier", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setFeedback("Journaux copiés dans le presse-papiers");
  } catch {
    setFeedback("Copie impossible (permissions)", true);
  }
}
