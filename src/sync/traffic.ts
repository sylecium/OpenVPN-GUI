import * as backend from "../api/backend";
import { formatBitrate, formatBytes } from "../lib/format";
import { byId } from "../lib/dom";
import { session } from "../state/session";

export async function refreshTrafficStats(): Promise<void> {
  const downEl = byId<HTMLElement>("stat-down");
  const upEl = byId<HTMLElement>("stat-up");
  const ifaceEl = byId<HTMLElement>("stat-iface");
  const totalDownEl = byId<HTMLElement>("stat-total-down");
  const totalUpEl = byId<HTMLElement>("stat-total-up");

  const clearUI = () => {
    downEl.textContent = "—";
    upEl.textContent = "—";
    ifaceEl.textContent = "Interface : —";
    totalDownEl.textContent = "—";
    totalUpEl.textContent = "—";
  };

  if (session.lastKnownStatus !== "connected") {
    session.lastTrafficSample = null;
    session.sessionTrafficBase = null;
    clearUI();
    return;
  }

  try {
    const sample = await backend.apiVpnIfaceTraffic();

    // Capture des valeurs initiales au premier échantillon de la session
    if (!session.sessionTrafficBase) {
      session.sessionTrafficBase = { rx: sample.rxBytes, tx: sample.txBytes };
    }

    const now = Date.now() / 1000;

    let currentDrx = 0;
    let currentDtx = 0;
    let validRate = false;

    // Calcul du débit instantané
    if (session.lastTrafficSample) {
      const dt = now - session.lastTrafficSample.t;
      if (dt > 0.05) {
        const drx = sample.rxBytes - session.lastTrafficSample.rx;
        const dtx = sample.txBytes - session.lastTrafficSample.tx;
        currentDrx = (drx < 0 ? 0 : drx) / dt;
        currentDtx = (dtx < 0 ? 0 : dtx) / dt;
        validRate = true;
      }
    }

    session.lastTrafficSample = { t: now, rx: sample.rxBytes, tx: sample.txBytes };

    const selected = byId<HTMLInputElement>("profile-path").value.trim();
    const active = session.lastActiveProfile;
    const activeMatch = active != null && selected.length > 0 && selected === active.trim();

    if (!activeMatch) {
      clearUI();
      return;
    }

    ifaceEl.textContent =
      sample.iface === "—" ? "Interface : aucune (tun/tap)" : `Interface : ${sample.iface}`;

    if (validRate) {
      downEl.textContent = formatBitrate(currentDrx);
      upEl.textContent = formatBitrate(currentDtx);
    } else {
      downEl.textContent = "—";
      upEl.textContent = "—";
    }

    // Calcul et affichage du total de session
    const sessionRx = sample.rxBytes - session.sessionTrafficBase.rx;
    const sessionTx = sample.txBytes - session.sessionTrafficBase.tx;
    totalDownEl.textContent = formatBytes(sessionRx < 0 ? 0 : sessionRx);
    totalUpEl.textContent = formatBytes(sessionTx < 0 ? 0 : sessionTx);

  } catch {
    clearUI();
  }
}
