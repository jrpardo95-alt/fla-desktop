/**
 * FLA Desktop — electron/preload.js
 * Bridge seguro entre renderer (React) y main process.
 * El renderer NO tiene acceso directo a Node.js — todo pasa por aquí.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Guardar PDF con diálogo nativo del OS
  savePDF: (buffer, filename) => ipcRenderer.invoke("save-pdf", { buffer, filename }),
  // Abrir URL en navegador externo (para Gmail OAuth)
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  // Obtener paths del sistema
  getPaths: () => ipcRenderer.invoke("get-paths"),
  // Puerto del backend Express
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),
  // Exportar DB como JSON
  exportDB: () => ipcRenderer.invoke("export-db-json"),
  // Escuchar evento "abrir panel de ayuda" enviado desde el menú
  onOpenHelpPanel: (callback) => {
    const sub = () => callback();
    ipcRenderer.on("open-help-panel", sub);
    return () => ipcRenderer.removeListener("open-help-panel", sub);
  },
  // Info del entorno
  platform: process.platform,
  isElectron: true,
});
