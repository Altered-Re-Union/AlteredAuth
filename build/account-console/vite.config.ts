import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { checker } from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), checker({ typescript: true })],
  server: {
    origin: "http://localhost:5173",
    port: 5173,
  },
  base: "",
  build: {
    // Keycloak's account-ui main.tsx uses top-level `await i18n.init()`,
    // so the build target must support top-level await (matches upstream).
    target: "esnext",
    modulePreload: false,
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: "src/main.tsx",
      external: ["react", "react/jsx-runtime", "react-dom"],
    },
  },
});
