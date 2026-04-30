import * as backend from "../api/backend";
import { extractRemoteEndpointFromOvpnLogLine } from "../lib/ovpn-remote-parse";
import { byId } from "../lib/dom";
import { session } from "../state/session";
import { setFeedback } from "../ui/feedback";
import { refreshStatRemoteDisplay } from "../ui/server-meta-view";
import { t, getLocale } from "../i18n";

/** Nombre max de lignes conservées dans le panneau (évite un DOM trop lourd). */
const MAX_LOG_LINES_IN_VIEW = 500;



export async function refreshLogs(): Promise<void> {
  try {
    const logs = await backend.apiVpnLogs(session.logsCursor, 80);
    session.logsCursor = logs.nextCursor;
    if (logs.entries.length === 0) {
      return;
    }

    const panel = byId<HTMLElement>("logs");
    if (!panel) return;

    const scrollParent = panel.closest(".terminal-body");
    const wasPinnedToBottom =
      scrollParent instanceof HTMLElement
        ? scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 48
        : true;

    // Build log lines fragments
    const fragment = document.createDocumentFragment();
    for (const entry of logs.entries) {
      // 1. Extract remote metadata if present
      const extracted = extractRemoteEndpointFromOvpnLogLine(entry.message);
      if (extracted && session.lastActiveProfile != null) {
        session.lastRemoteFromLogs = {
          path: session.lastActiveProfile,
          endpoint: extracted,
        };
      }

      // 2. Format line
      const ts = new Date(entry.ts_unix_ms).toLocaleTimeString(getLocale());
      const lineText = `[${ts}] ${entry.level.toUpperCase()} ${entry.message}\n`;
      fragment.appendChild(document.createTextNode(lineText));
    }

    // 3. Append to DOM
    panel.appendChild(fragment);

    // 4. Cap the log buffer (remove oldest TextNodes if too many lines)
    // textNodes are siblings in the <pre> block
    while (panel.childNodes.length > MAX_LOG_LINES_IN_VIEW) {
      panel.removeChild(panel.firstChild!);
    }

    // 5. Autoscroll
    if (scrollParent instanceof HTMLElement && wasPinnedToBottom) {
      scrollParent.scrollTop = scrollParent.scrollHeight;
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
  setFeedback(t("feedback.logsCleared"));
}

export async function copyLogsToClipboard(): Promise<void> {
  const panel = byId<HTMLElement>("logs");
  const text = panel.textContent ?? "";
  if (!text.trim()) {
    setFeedback(t("feedback.noLogsToCopy"), true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setFeedback(t("feedback.logsCopied"));
  } catch {
    setFeedback(t("feedback.copyFailed"), true);
  }
}
