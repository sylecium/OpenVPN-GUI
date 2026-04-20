export function guessProto(name: string): string {
  return name.toLowerCase().includes("tcp") ? "TCP" : "UDP";
}
