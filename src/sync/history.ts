import * as backend from "../api/backend";
import { formatHistoryEvent } from "../lib/format";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";

export async function refreshHistory(): Promise<void> {
  try {
    const history = await backend.apiHistoryEntries();
    const list = byId<HTMLUListElement>("history-list");
    list.replaceChildren();

    if (history.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "Aucun événement enregistré";
      list.append(li);
      return;
    }

    const preview = history.slice(0, 14);
    for (const item of preview) {
      const li = document.createElement("li");
      li.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "history-meta";

      const time = document.createElement("time");
      time.className = "history-time";
      time.dateTime = new Date(item.tsUnixMs).toISOString();
      time.textContent = new Date(item.tsUnixMs).toLocaleString("fr-FR");

      const eventLabel = document.createElement("span");
      eventLabel.className = "history-event";
      eventLabel.textContent = formatHistoryEvent(item.event);

      meta.append(time, eventLabel);

      const body = document.createElement("p");
      body.className = "history-body";
      const parts: string[] = [];
      if (item.profilePath) {
        parts.push(item.profilePath);
      }
      if (item.details) {
        parts.push(item.details);
      }
      body.textContent = parts.length > 0 ? parts.join(" · ") : "Aucun détail";

      li.append(meta, body);
      list.append(li);
    }
  } catch (error) {
    setFeedback(String(error), true);
  }
}

export async function clearHistoryStorage(): Promise<void> {
  try {
    await backend.apiHistoryClear();
    setFeedback("Historique effacé");
    await refreshHistory();
  } catch (error) {
    setFeedback(String(error), true);
  }
}
