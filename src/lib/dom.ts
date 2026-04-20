export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element manquant: #${id}`);
  }
  return element as T;
}
