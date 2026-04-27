import { session } from "../state/session";
import { setFeedback, setBusyState } from "../ui/feedback";
import * as backend from "../api/backend";
import { refreshRecentProfiles } from "../sync/profiles";
import { refreshHistory } from "../sync/history";
import { refreshStatus } from "../sync/status";
import { byId } from "../lib/dom";
import { t } from "../i18n";

export async function connect(): Promise<void> {
  if (session.isBusy) {
    return;
  }
  const profilePath = byId<HTMLInputElement>("profile-path").value.trim();
  if (!profilePath) {
    setFeedback(t("feedback.selectProfile"), true);
    return;
  }

  try {
    setBusyState(true);
    const message = await backend.apiVpnConnect(profilePath);
    setFeedback(message);
    session.lastTrafficSample = null;
    await refreshRecentProfiles();
    await refreshHistory();
    await refreshStatus();
  } catch (error) {
    setFeedback(String(error), true);
    await refreshStatus();
  } finally {
    setBusyState(false);
  }
}

export async function disconnect(): Promise<void> {
  if (session.isBusy) {
    console.info("[openvpn-gui][disconnect] abandon: session deja occupee");
    return;
  }
  try {
    setBusyState(true);
    console.info("[openvpn-gui][disconnect] invoke vpn_disconnect...");
    const message = await backend.apiVpnDisconnect();
    console.info("[openvpn-gui][disconnect] invoke OK:", message);
    setFeedback(message);
    session.lastTrafficSample = null;
    console.info("[openvpn-gui][disconnect] refreshHistory...");
    await refreshHistory();
    console.info("[openvpn-gui][disconnect] refreshStatus...");
    await refreshStatus();
    console.info("[openvpn-gui][disconnect] termine");
  } catch (error) {
    console.error("[openvpn-gui][disconnect] erreur:", error);
    setFeedback(String(error), true);
  } finally {
    setBusyState(false);
  }
}

export async function onPowerClick(): Promise<void> {
  if (session.lastKnownStatus === "connected") {
    await disconnect();
  } else {
    await connect();
  }
}
