# FLA Desktop

App de escritorio para gestión de servicios técnicos (clientes, trabajos, presupuestos, facturación).

## Stack técnico
- Electron 29 (shell nativo)
- React 18 + Vite 5 (frontend)
- Express 4 (backend embebido)
- SQLite via better-sqlite3 (persistencia)
- Gmail API OAuth2 (envío de correos)

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
# Windows
npm run build:win

# Mac
npm run build:mac
```

El instalador queda en `dist-installer/`.
