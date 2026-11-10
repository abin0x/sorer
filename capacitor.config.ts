import type { CapacitorConfig } from "@capacitor/cli";

// Beacon ships as a remote shell: the store app opens the live Beacon screen,
// so web updates reach phones without a new store release.
const config: CapacitorConfig = {
  appId: "com.clubrudder.beacon",
  appName: "Beacon",
  webDir: "native-shell",
  server: {
    url: "https://clubrudder.com/beacon",
    allowNavigation: ["clubrudder.com", "www.clubrudder.com", "*.supabase.co"],
  },
  ios: { contentInset: "never", scheme: "Beacon" },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#0f172a", showSpinner: false },
    Keyboard: { resize: "native", resizeOnFullScreen: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
