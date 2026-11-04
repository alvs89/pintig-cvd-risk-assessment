import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/research-cig-27": {
        target: "http://127.0.0.1:8767",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", request => request.setHeader("Origin", "http://127.0.0.1:5173"));
        },
      },
      "/experimental-proxy-risk": {
        target: "http://127.0.0.1:8766",
        changeOrigin: true,
        configure(proxy) {
          // The model bridge remains loopback-only. Vite is the only route used
          // by a forwarded development address, so the browser never needs to
          // contact the bridge directly.
          proxy.on("proxyReq", (request) => {
            request.setHeader("Origin", "http://127.0.0.1:5173");
          });
        },
      },
    },
  },
});
