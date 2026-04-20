export function assertNever(value: never): never {
  throw new Error(`Valeur inattendue: ${String(value)}`);
}
