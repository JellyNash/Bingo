import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const shouldProxyApi = !env.VITE_API_URL;
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3000";

  const proxy = shouldProxyApi
    ? {
        "/gamemaster": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/games": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      }
    : undefined;

  return {
    plugins: [react()],
    server: {
      port: 5174,
      host: "0.0.0.0",
      proxy,
    },
  };
});
