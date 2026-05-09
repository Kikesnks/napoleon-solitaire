import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.solitario.napoleon",
  appName: "Solitario Napoleón",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: "always"
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
