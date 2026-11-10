// Native-only behaviour for the Beacon store app. Every call is skipped in a
// normal browser, so the website is unaffected.
import { Capacitor } from "@capacitor/core";

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function initNativeShell() {
  if (!isNativeApp()) return () => {};
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);
  const syncBar = () => {
    const dark = document.documentElement.classList.contains("dark");
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  };
  syncBar();
  const observer = new MutationObserver(syncBar);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  // Android back: close an open sheet first, then go back, then leave the app.
  const back = await App.addListener("backButton", ({ canGoBack }) => {
    const sheet = document.querySelector('[role="dialog"]');
    if (sheet) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); return; }
    if (canGoBack) window.history.back(); else App.exitApp();
  });
  // Invite and offer links opened from email land inside the app.
  const link = await App.addListener("appUrlOpen", ({ url }) => {
    try { const u = new URL(url); window.location.assign(u.pathname + u.search); } catch { /* ignore */ }
  });
  SplashScreen.hide().catch(() => {});
  const stopPush = await initPush().catch(() => () => {});
  return () => { observer.disconnect(); back.remove(); link.remove(); stopPush(); };
}

// Asks for notification permission and hands the phone's token to the server.
async function initPush() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const { registerPushToken } = await import("@/lib/pushTokens.functions");
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return () => {};
  const reg = await PushNotifications.addListener("registration", ({ value }) => {
    try { localStorage.setItem("beacon_push_token", value); } catch { /* ignore */ }
    registerPushToken({ data: { token: value, platform: Capacitor.getPlatform() } }).catch(() => {});
  });
  // Tapping a notification opens the screen it points to.
  const tap = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const path = notification?.data?.path;
    if (typeof path === "string" && path.startsWith("/")) window.location.assign(path);
  });
  await PushNotifications.register();
  return () => { reg.remove(); tap.remove(); };
}
