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
  const badge = byId<HTMLElement>("update-badge");
  if (badge) {
    badge.classList.remove("hidden");
    badge.title = `Version ${version} available`;
    badge.onclick = () => {
      void startUpdateFlow();
    };
  }
}

async function startUpdateFlow(): Promise<void> {
  const update = await check();
  if (!update) return;

  try {
    setFeedback("Downloading update...", false);
    
    let downloaded = 0;
    let contentLength: number | undefined = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength;
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          if (contentLength) {
             const percent = Math.round((downloaded / contentLength) * 100);
             setFeedback(`Downloading update: ${percent}%`, false);
          }
          break;
        case "Finished":
          setFeedback("Update installed. Restarting...", false);
          break;
      }
    });

    await relaunch();
  } catch (error) {
    console.error("Update installation failed:", error);
    setFeedback("Update failed. Please try again later.", true);
  }
}
