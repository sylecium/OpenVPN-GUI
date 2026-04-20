import { byId } from "../lib/dom";
import { session } from "../state/session";

export function setFeedback(message: string, isError = false): void {
  const feedback = byId<HTMLElement>("feedback");
  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

export function setWorkspaceBusy(next: boolean): void {
  const panel = byId<HTMLElement>("main-workspace");
  panel.setAttribute("aria-busy", next ? "true" : "false");
}

export function setBusyState(next: boolean): void {
  session.isBusy = next;
  setWorkspaceBusy(next);
  byId<HTMLButtonElement>("connect-btn").disabled = next;
  byId<HTMLButtonElement>("add-ovpn-btn").disabled = next;
  byId<HTMLSelectElement>("server-select").disabled = next;
  for (const button of document.querySelectorAll<HTMLButtonElement>("#vpn-list .row-action")) {
    const row = button.closest("li");
    const isDemo = row?.classList.contains("vpn-item--demo");
    button.disabled = next || !!isDemo;
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(".btn-terminal")) {
    button.disabled = next;
  }
  const clearHistory = document.getElementById("clear-history-btn");
  if (clearHistory instanceof HTMLButtonElement) {
    clearHistory.disabled = next;
  }
}
