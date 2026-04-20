import "./styles/main.css";
import { bootstrapApp, runInitialSync, startIntervals } from "./app/startup";

window.addEventListener("DOMContentLoaded", async () => {
  bootstrapApp();
  await runInitialSync();
  startIntervals();
});
