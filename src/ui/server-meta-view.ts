import { byId } from "../lib/dom";
import { guessProto } from "../lib/server-meta-logic";

export function updateServerMetaForFilename(filename: string): void {
  byId<HTMLElement>("stat-protocol").textContent = guessProto(filename);
  byId<HTMLElement>("stat-cipher").textContent = "AES-256-GCM"; // Default mock
  byId<HTMLElement>("stat-remote").textContent = "auto"; // Default mock
}

export function resetServerMetaEmpty(): void {
  byId<HTMLElement>("stat-protocol").textContent = "—";
  byId<HTMLElement>("stat-cipher").textContent = "—";
  byId<HTMLElement>("stat-remote").textContent = "—";
}
