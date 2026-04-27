import { byId } from "../lib/dom";
import { t } from "../i18n";
import { setFeedback } from "./feedback";
import * as backend from "../api/backend";
import { applyPickedProfile } from "../commands/profiles";

export function bindImportUrlModal(): void {
  const modal = byId<HTMLElement>("import-url-modal");
  const form = byId<HTMLFormElement>("import-url-form");
  const cancelBtn = byId<HTMLButtonElement>("import-url-cancel");
  const backdrop = byId<HTMLElement>("import-url-modal-backdrop");
  const input = byId<HTMLInputElement>("import-url-input");

  const close = (): void => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    form.reset();
  };

  cancelBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;

    close();
    setFeedback(t("feedback.downloading"));

    backend
      .apiDownloadProfile(url)
      .then((path) => {
        return applyPickedProfile(path);
      })
      .catch((err) => {
        setFeedback(t("feedback.downloadFailed") + String(err), true);
      });
  });
}

export function openImportUrlModal(): void {
  const modal = byId<HTMLElement>("import-url-modal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  byId<HTMLInputElement>("import-url-input").focus();
}
