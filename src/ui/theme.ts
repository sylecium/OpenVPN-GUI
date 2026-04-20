import { byId } from "../lib/dom";

const STORAGE_KEY = "openvpn-gui-theme";

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function setThemeIcons(theme: "dark" | "light"): void {
  const sun = document.getElementById("theme-icon-sun");
  const moon = document.getElementById("theme-icon-moon");
  if (!(sun instanceof SVGElement) || !(moon instanceof SVGElement)) {
    throw new Error("Icônes de thème introuvables");
  }
  const dark = theme === "dark";
  sun.classList.toggle("hidden", !dark);
  moon.classList.toggle("hidden", dark);
}

export function initThemeToggle(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: "dark" | "light" =
    saved === "light" || saved === "dark" ? saved : prefersDark ? "dark" : "light";
  applyTheme(theme);
  setThemeIcons(theme);

  byId<HTMLButtonElement>("theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next: "dark" | "light" = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setThemeIcons(next);
  });
}
