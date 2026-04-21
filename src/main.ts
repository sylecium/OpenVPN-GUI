import "./styles/main.css";
import { bootstrapApp, runInitialSync, startIntervals } from "./app/startup";
import { initI18n, toggleLanguage } from "./i18n";

window.addEventListener("DOMContentLoaded", async () => {
  initI18n();

  const langToggle = document.getElementById("lang-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", toggleLanguage);
  }

  bootstrapApp();
  await runInitialSync();
  startIntervals();
});
