import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { byId } from "../lib/dom";
import { setFeedback } from "../ui/feedback";

export async function checkForAppUpdate(silent = true): Promise<void> {
  try {
    const update = await check();
    if (update) {
      console.log(`Update found: ${update.version}`);
      showUpdateUI(update.version);
    } else if (!silent) {
      setFeedback("App is up to date.", false);
    }
  } catch (error) {
    console.error("Failed to check for updates:", error);
    if (!silent) {
      setFeedback("Update check failed.", true);
    }
  }
}

function showUpdateUI(version: string): void {
  const banner = byId<HTMLElement>("update-banner");
  const versionSpan = byId<HTMLElement>("update-version");
  const btnNow = byId<HTMLButtonElement>("update-btn-now");
  const btnLater = byId<HTMLButtonElement>("update-btn-later");

  if (!banner || !versionSpan || !btnNow || !btnLater) return;

  versionSpan.textContent = `v${version}`;
  banner.classList.remove("hidden");

  btnNow.onclick = () => {
    void startUpdateFlow();
  };

  btnLater.onclick = () => {
    banner.classList.add("hidden");
  };
}

async function startUpdateFlow(): Promise<void> {
  const update = await check();
  if (!update) return;

  const btnNow = byId<HTMLButtonElement>("update-btn-now");
  const btnLater = byId<HTMLButtonElement>("update-btn-later");
  const progressContainer = byId<HTMLElement>("update-progress-container");
  const progressBar = byId<HTMLElement>("update-progress-bar");

  if (btnNow) btnNow.disabled = true;
  if (btnLater) btnLater.classList.add("hidden");
  if (progressContainer) progressContainer.classList.remove("hidden");

  try {
    setFeedback("Downloading update...", false);
    
    let downloaded = 0;
    let contentLength: number | undefined = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength;
          if (progressBar) progressBar.style.width = "0%";
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          if (contentLength && progressBar) {
             const percent = Math.round((downloaded / contentLength) * 100);
             progressBar.style.width = `${percent}%`;
             setFeedback(`Downloading update: ${percent}%`, false);
          }
          break;
        case "Finished":
          if (progressBar) progressBar.style.width = "100%";
          setFeedback("Update installed. Restarting...", false);
          break;
      }
    });

    await relaunch();
  } catch (error) {
    console.error("Update installation failed:", error);
    setFeedback("Update failed. Please try again later.", true);
    
    // Reset UI on failure
    if (btnNow) btnNow.disabled = false;
    if (btnLater) btnLater.classList.remove("hidden");
    if (progressContainer) progressContainer.classList.add("hidden");
  }
}
