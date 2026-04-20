/**
 * Extrait host:port depuis une ligne de journal OpenVPN (adresse résolue).
 * Exemples : « Preserving recently used remote address: [AF_INET]31.39.28.59:1194 »
 */
export function extractRemoteEndpointFromOvpnLogLine(message: string): string | null {
  const m = message.match(/\[AF_INET6?\]([^\s\],]+)/);
  if (m?.[1]) {
    return m[1];
  }
  return null;
}
