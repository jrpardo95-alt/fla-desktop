/**
 * FLA Desktop — electron/main.js
 * Responsabilidades:
 *  1. Crear la ventana principal de la app
 *  2. Levantar el servidor Express embebido en background
 *  3. Gestionar ciclo de vida (cierre limpio)
 *  4. IPC handlers: guardar PDF, abrir URLs, exportar DB
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const log = require("electron-log");

log.transports.file.level = "info";
log.transports.console.level = "debug";
log.info("FLA Desktop iniciando...");

const IS_DEV = process.env.NODE_ENV === "development";
const VITE_DEV_URL = "http://localhost:5173";

let mainWindow = null;
let expressServer = null;
let expressPort = null;

// ── Encontrar puerto libre ─────────────────────────────────────────────────────
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

// ── Levantar Express embebido ─────────────────────────────────────────────────
async function startExpressServer() {
  const { createServer } = require("../server/index.js");
  expressPort = await findFreePort();
  expressServer = createServer(expressPort);
  log.info(`Express embebido corriendo en puerto ${expressPort}`);
  return expressPort;
}

// ── Crear ventana principal ───────────────────────────────────────────────────
function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "FLA Desktop",
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  // Inyectar puerto antes de que React lo necesite
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(`window.__BACKEND_PORT__ = ${port};`);
  });

  if (IS_DEV) {
    mainWindow.loadURL(VITE_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
    // En producción mostrar splash screen breve
    if (!IS_DEV) {
      mainWindow.setTitle(`FLA Desktop — Listo (puerto ${port})`);
      setTimeout(() => mainWindow?.setTitle("FLA Desktop"), 3000);
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });

  // Links externos → navegador del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Bloquear navegación fuera de la app
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = IS_DEV ? VITE_DEV_URL : "file://";
    if (!url.startsWith(allowed) && !url.startsWith("http://127.0.0.1")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  buildMenu(port);
}

// ── Menú de la app ─────────────────────────────────────────────────────────────
function buildMenu(port) {
  const template = [
    {
      label: "Archivo",
      submenu: [
        {
          label: "Exportar datos...",
          accelerator: "CmdOrCtrl+E",
          click: () => mainWindow?.webContents.send("trigger-export"),
        },
        { type: "separator" },
        { label: "Salir", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "Editar",
      submenu: [
        { role: "undo", label: "Deshacer" },
        { role: "redo", label: "Rehacer" },
        { type: "separator" },
        { role: "cut", label: "Cortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Pegar" },
        { role: "selectAll", label: "Seleccionar todo" },
      ],
    },
    {
      label: "Vista",
      submenu: [
        { role: "reload", label: "Recargar" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom normal" },
        { role: "zoomIn", label: "Aumentar zoom" },
        { role: "zoomOut", label: "Reducir zoom" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Pantalla completa" },
        ...(IS_DEV ? [{ type: "separator" }, { role: "toggleDevTools", label: "DevTools" }] : []),
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Estado de la app",
          click: () => mainWindow?.webContents.send("open-help-panel"),
        },
        {
          label: "Abrir carpeta de PDFs",
          click: () => {
            const dir = path.join(app.getPath("documents"), "FLA_PDFs");
            fs.mkdirSync(dir, { recursive: true });
            shell.openPath(dir);
          },
        },
        {
          label: "Abrir carpeta de datos",
          click: () => shell.openPath(app.getPath("userData")),
        },
        {
          label: "Ver logs",
          click: () => shell.openPath(log.transports.file.getFile().path),
        },
        { type: "separator" },
        {
          label: "Cómo configurar Gmail",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Configurar Gmail",
              message: "Para conectar Gmail:",
              detail:
                "1. Ve a console.cloud.google.com\n" +
                "2. Crea un proyecto nuevo\n" +
                "3. Activa la API de Gmail\n" +
                "4. Crea credenciales OAuth2 (Aplicación de escritorio)\n" +
                "5. Copia el Client ID y Client Secret\n" +
                "6. En FLA: Configuración → Gmail → Ingresar credenciales\n" +
                "7. Haz clic en 'Conectar Gmail'\n" +
                "8. Autoriza en el navegador\n\n" +
                `Callback URL a usar:\nhttp://127.0.0.1:${port}/auth/google/callback`,
              buttons: ["Abrir Google Cloud Console", "OK"],
            }).then(({ response }) => {
              if (response === 0) shell.openExternal("https://console.cloud.google.com");
            });
          },
        },
        { type: "separator" },
        {
          label: "Información del servidor",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Info técnica",
              message: "FLA Desktop — info técnica",
              detail:
                `Puerto servidor: ${port}\n` +
                `Base de datos: ${path.join(app.getPath("userData"), "fla.db")}\n` +
                `PDFs: ${path.join(app.getPath("documents"), "FLA_PDFs")}\n` +
                `Logs: ${log.transports.file.getFile().path}\n` +
                `Versión Electron: ${process.versions.electron}\n` +
                `Versión Node: ${process.versions.node}`,
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC Handlers ───────────────────────────────────────────────────────────────

// Guardar PDF con diálogo nativo
ipcMain.handle("save-pdf", async (event, { buffer, filename }) => {
  try {
    // Auto-guardar en documentos/FLA_PDFs
    const pdfDir = path.join(app.getPath("documents"), "FLA_PDFs");
    fs.mkdirSync(pdfDir, { recursive: true });
    const autoPath = path.join(pdfDir, filename);
    fs.writeFileSync(autoPath, Buffer.from(buffer));

    // Mostrar diálogo para guardar en otra ubicación también
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Guardar presupuesto",
      defaultPath: path.join(app.getPath("documents"), filename),
      filters: [{ name: "Documentos PDF", extensions: ["pdf"] }],
      buttonLabel: "Guardar PDF",
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, Buffer.from(buffer));
      log.info(`PDF guardado en: ${filePath}`);
      return { success: true, path: filePath, autoPath };
    }

    log.info(`PDF guardado automáticamente en: ${autoPath}`);
    return { success: true, path: autoPath, autoPath, canceled: true };
  } catch (err) {
    log.error("Error guardando PDF:", err);
    return { success: false, error: err.message };
  }
});

// Abrir URL en navegador externo
ipcMain.handle("open-external", async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Paths del sistema
ipcMain.handle("get-paths", () => ({
  userData: app.getPath("userData"),
  documents: app.getPath("documents"),
  pdfDir: path.join(app.getPath("documents"), "FLA_PDFs"),
  dbPath: path.join(app.getPath("userData"), "fla.db"),
  logsPath: log.transports.file.getFile().path,
}));

// Exportar DB
ipcMain.handle("export-db-json", async () => {
  try {
    const { exportAll } = require("../server/db.js");
    const data = exportAll();
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar datos FLA",
      defaultPath: path.join(
        app.getPath("documents"),
        `FLA_backup_${new Date().toISOString().slice(0, 10)}.json`
      ),
      filters: [{ name: "JSON", extensions: ["json"] }],
      buttonLabel: "Exportar",
    });
    if (!canceled && filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { success: true, path: filePath };
    }
    return { success: false, canceled: true };
  } catch (err) {
    log.error("Error exportando:", err);
    return { success: false, error: err.message };
  }
});

// Puerto del backend
ipcMain.handle("get-backend-port", () => expressPort);

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    const port = await startExpressServer();
    createMainWindow(port);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow(port);
    });
  } catch (err) {
    log.error("Error fatal:", err);
    dialog.showErrorBox(
      "Error al iniciar FLA Desktop",
      `No se pudo iniciar:\n${err.message}\n\nCierra la app y vuelve a abrirla.`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (expressServer) expressServer.close(() => log.info("Express cerrado"));
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => log.info("FLA Desktop cerrando..."));
