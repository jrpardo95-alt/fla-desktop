import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // En build de producción, los assets van a la carpeta dist/
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
  // html2pdf.js necesita esta config para funcionar correctamente
  optimizeDeps: {
    include: ["html2pdf.js"],
  },
  // En dev, el renderer se conecta al puerto Express que Electron le pasa
  server: {
    port: 5173,
  },
});
