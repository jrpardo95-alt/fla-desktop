import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import html2pdf from "html2pdf.js";

// ─────────────────────────────────────────────
// ELECTRON API LAYER
// Detecta si corre en Electron o en browser, y expone una API uniforme.
// ─────────────────────────────────────────────
const IS_ELECTRON = typeof window !== "undefined" && !!window.electronAPI;

// Obtener el puerto del backend (dinámico en Electron, fijo en dev)
function getBackendBase() {
  if (IS_ELECTRON) {
    const port = window.__BACKEND_PORT__ || 3001;
    return `http://127.0.0.1:${port}`;
  }
  return "http://localhost:3001";
}

// API REST — todos los módulos del frontend la usan
const api = {
  get: async (path) => {
    const r = await fetch(getBackendBase() + path);
    if (!r.ok) throw new Error((await r.json())?.error || r.statusText);
    return r.json();
  },
  post: async (path, body) => {
    const r = await fetch(getBackendBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error((await r.json())?.error || r.statusText);
    return r.json();
  },
  put: async (path, body) => {
    const r = await fetch(getBackendBase() + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error((await r.json())?.error || r.statusText);
    return r.json();
  },
  delete: async (path) => {
    const r = await fetch(getBackendBase() + path, { method: "DELETE" });
    if (!r.ok) throw new Error((await r.json())?.error || r.statusText);
    return r.json();
  },
};

// ─────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────
// SEED DATA — solo como fallback visual inicial, la app carga datos reales desde SQLite
const SEED_CLIENTES = [
  { id: 1, nombre: "María González", rut: "12.345.678-9", email: "maria@gmail.com", telefono: "+56 9 8765 4321", direccion: "Los Aromos 234", comuna: "Providencia", notas: "Departamento piso 5" },
  { id: 2, nombre: "Carlos Pérez", rut: "9.876.543-2", email: "cperez@gmail.com", telefono: "+56 9 7654 3210", direccion: "Av. Italia 1010", comuna: "Ñuñoa", notas: "" },
  { id: 3, nombre: "Ana Torres", rut: "15.432.100-K", email: "ana.torres@hotmail.com", telefono: "+56 9 6543 2109", direccion: "Santa Elena 567", comuna: "San Miguel", notas: "Llamar antes de ir" },
];

const SEED_MAESTROS = [
  { id: 1, nombre: "José Muñoz", especialidad: "Gasfitería", telefono: "+56 9 5432 1098", modalidad: "Por trabajo", notas: "Excelente" },
  { id: 2, nombre: "Pedro Soto", especialidad: "Electricidad", telefono: "+56 9 4321 0987", modalidad: "Fijo", notas: "" },
  { id: 3, nombre: "Luis Campos", especialidad: "Techos", telefono: "+56 9 3210 9876", modalidad: "Por trabajo", notas: "Disponible fines de semana" },
];

const SEED_TRABAJOS = [
  {
    id: 1, clienteId: 1, maestroId: 1, fechaCreacion: "2025-01-10", fechaEjecucionInicio: "2025-01-15", fechaEjecucionFin: "2025-01-15",
    tipoServicio: "Gasfitería", descripcion: "Reparación de cañería bajo lavaplatos", statusTrabajo: "COMPLETADO",
    statusPagoCliente: "PAGADO", statusPagoMaestro: "PAGADO", costeMaestroNeto: 35000, observaciones: "", etiquetas: ["urgente"],
    presupuesto: {
      numero: "PRE-001", fecha: "2025-01-10", condiciones: "Pago al contado. Garantía 30 días.", validez: "15 días",
      items: [
        { id: 1, tipo: "servicio", descripcion: "Diagnóstico y reparación cañería", cantidad: 1, precioUnitarioNeto: 55000 },
        { id: 2, tipo: "material", descripcion: "Cañería PVC 50mm (1m)", cantidad: 2, costoCompraUnitarioNeto: 3500, precioVentaUnitarioNeto: 5500 },
        { id: 3, tipo: "adicional", descripcion: "Traslado", subTipo: "transporte", costoNeto: 3000, precioVentaNeto: 5000 },
      ]
    },
    pagosCliente: [{ id: 1, monto: 71500, fecha: "2025-01-15", metodo: "Transferencia", referencia: "TRF001" }],
    pagosPerito: [{ id: 1, monto: 35000, fecha: "2025-01-16", metodo: "Transferencia", referencia: "TRF002" }],
    fechaVencimiento: "2025-01-22",
  },
  {
    id: 2, clienteId: 2, maestroId: 2, fechaCreacion: "2025-01-20", fechaEjecucionInicio: "2025-01-25", fechaEjecucionFin: "2025-01-26",
    tipoServicio: "Electricidad", descripcion: "Instalación de puntos de luz y tomacorrientes", statusTrabajo: "COMPLETADO",
    statusPagoCliente: "ABONADO", statusPagoMaestro: "PENDIENTE", costeMaestroNeto: 80000, observaciones: "Cliente pidió factura", etiquetas: [],
    presupuesto: {
      numero: "PRE-002", fecha: "2025-01-20", condiciones: "50% al inicio, 50% al término.", validez: "10 días",
      items: [
        { id: 1, tipo: "servicio", descripcion: "Instalación 3 puntos de luz", cantidad: 3, precioUnitarioNeto: 30000 },
        { id: 2, tipo: "servicio", descripcion: "Instalación tomacorrientes", cantidad: 5, precioUnitarioNeto: 18000 },
        { id: 3, tipo: "material", descripcion: "Cable eléctrico 2.5mm (rollo 10m)", cantidad: 2, costoCompraUnitarioNeto: 22000, precioVentaUnitarioNeto: 32000 },
        { id: 4, tipo: "material", descripcion: "Enchufes y tomacorrientes", cantidad: 8, costoCompraUnitarioNeto: 4500, precioVentaUnitarioNeto: 7000 },
      ]
    },
    pagosCliente: [{ id: 1, monto: 120000, fecha: "2025-01-25", metodo: "Efectivo", referencia: "" }],
    pagosPerito: [],
    fechaVencimiento: "2025-02-01",
  },
  {
    id: 3, clienteId: 3, maestroId: 3, fechaCreacion: "2025-02-03", fechaEjecucionInicio: "2025-02-10", fechaEjecucionFin: "2025-02-11",
    tipoServicio: "Techos", descripcion: "Impermeabilización techo plano 40m2", statusTrabajo: "EN_PROCESO",
    statusPagoCliente: "PENDIENTE", statusPagoMaestro: "PENDIENTE", costeMaestroNeto: 120000, observaciones: "", etiquetas: ["seguro"],
    presupuesto: {
      numero: "PRE-003", fecha: "2025-02-03", condiciones: "30% anticipo, 70% al término.", validez: "7 días",
      items: [
        { id: 1, tipo: "servicio", descripcion: "Impermeabilización con membrana asfáltica 40m2", cantidad: 40, precioUnitarioNeto: 8500 },
        { id: 2, tipo: "material", descripcion: "Membrana asfáltica (m2)", cantidad: 40, costoCompraUnitarioNeto: 3800, precioVentaUnitarioNeto: 5500 },
        { id: 3, tipo: "adicional", descripcion: "Retiro escombros", subTipo: "retiro_escombros", costoNeto: 25000, precioVentaNeto: 35000 },
      ]
    },
    pagosCliente: [],
    pagosPerito: [],
    fechaVencimiento: "2025-02-17",
  },
  {
    id: 4, clienteId: 1, maestroId: 1, fechaCreacion: "2025-02-15", fechaEjecucionInicio: "2025-02-20", fechaEjecucionFin: "2025-02-20",
    tipoServicio: "Gasfitería", descripcion: "Cambio de llave de paso y revisión general", statusTrabajo: "COMPLETADO",
    statusPagoCliente: "PAGADO", statusPagoMaestro: "PAGADO", costeMaestroNeto: 25000, observaciones: "", etiquetas: [],
    presupuesto: {
      numero: "PRE-004", fecha: "2025-02-15", condiciones: "Pago al contado.", validez: "10 días",
      items: [
        { id: 1, tipo: "servicio", descripcion: "Reemplazo llave de paso", cantidad: 1, precioUnitarioNeto: 40000 },
        { id: 2, tipo: "material", descripcion: "Llave de paso 1/2\"", cantidad: 1, costoCompraUnitarioNeto: 8000, precioVentaUnitarioNeto: 14000 },
      ]
    },
    pagosCliente: [{ id: 1, monto: 64260, fecha: "2025-02-20", metodo: "Transferencia", referencia: "TRF005" }],
    pagosPerito: [{ id: 1, monto: 25000, fecha: "2025-02-21", metodo: "Transferencia", referencia: "TRF006" }],
    fechaVencimiento: "2025-02-27",
  },
];

const SEED_GASTOS_FIJOS = [
  { id: 1, nombre: "Sueldo administración", monto: 400000 },
  { id: 2, nombre: "Herramientas y equipos", monto: 50000 },
  { id: 3, nombre: "Marketing y publicidad", monto: 30000 },
  { id: 4, nombre: "Arriendo bodega", monto: 80000 },
];

const SEED_CONFIG = {
  empresa: { nombre: "Felipe Lo Arregla", rut: "76.543.210-K", telefono: "+56 9 1234 5678", email: "contacto@felipeloarregla.cl", direccion: "Av. Providencia 1234, Of. 501, Santiago" },
  objetivoVentasNeto: 1500000,
  margenBrutoConfig: 0.45,
  moneda: "CLP",
  ivaRate: 0.19,
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;
const today = () => new Date().toISOString().split("T")[0];

function calcPresupuesto(p) {
  if (!p) return { subtotalNeto: 0, iva: 0, total: 0, costoMaterialesNeto: 0, costoAdicionalesNeto: 0 };
  let serviciosNeto = 0, materialesVentaNeto = 0, adicionalesVentaNeto = 0, costoMaterialesNeto = 0, costoAdicionalesNeto = 0;
  for (const item of p.items || []) {
    if (item.tipo === "servicio") serviciosNeto += (item.cantidad || 0) * (item.precioUnitarioNeto || 0);
    if (item.tipo === "material") {
      materialesVentaNeto += (item.cantidad || 0) * (item.precioVentaUnitarioNeto || 0);
      costoMaterialesNeto += (item.cantidad || 0) * (item.costoCompraUnitarioNeto || 0);
    }
    if (item.tipo === "adicional") {
      adicionalesVentaNeto += item.precioVentaNeto || 0;
      costoAdicionalesNeto += item.costoNeto || 0;
    }
  }
  const subtotalNeto = serviciosNeto + materialesVentaNeto + adicionalesVentaNeto;
  const iva = subtotalNeto * 0.19;
  const total = subtotalNeto + iva;
  return { subtotalNeto, iva, total, costoMaterialesNeto, costoAdicionalesNeto, serviciosNeto, materialesVentaNeto, adicionalesVentaNeto };
}

function calcTrabajo(t) {
  const p = calcPresupuesto(t.presupuesto);
  const costoTotal = (t.costeMaestroNeto || 0) + p.costoMaterialesNeto + p.costoAdicionalesNeto;
  const utilidadNeta = p.subtotalNeto - costoTotal;
  const margen = p.subtotalNeto > 0 ? utilidadNeta / p.subtotalNeto : 0;
  const totalAbonado = (t.pagosCliente || []).reduce((s, x) => s + x.monto, 0);
  const saldoPorCobrar = p.total - totalAbonado;
  const totalPagadoMaestro = (t.pagosPerito || []).reduce((s, x) => s + x.monto, 0);
  const saldoPorPagarMaestro = (t.costeMaestroNeto || 0) - totalPagadoMaestro;
  return { ...p, costoTotal, utilidadNeta, margen, totalAbonado, saldoPorCobrar, totalPagadoMaestro, saldoPorPagarMaestro };
}

function getMonthKey(d) {
  const dd = d ? new Date(d + "T12:00:00") : new Date();
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
}

function calcDashboard(trabajos, gastosFijos, mesKey) {
  const completados = trabajos.filter(t => t.statusTrabajo === "COMPLETADO" && getMonthKey(t.fechaEjecucionFin) === mesKey);
  let ventasNetas = 0, ivaDébito = 0, costosMaestros = 0, costosMateriales = 0, costosAdicionales = 0;
  for (const t of completados) {
    const c = calcTrabajo(t);
    ventasNetas += c.subtotalNeto;
    ivaDébito += c.iva;
    costosMaestros += t.costeMaestroNeto || 0;
    costosMateriales += c.costoMaterialesNeto;
    costosAdicionales += c.costoAdicionalesNeto;
  }
  const costosDirectos = costosMaestros + costosMateriales + costosAdicionales;
  const margenBruto = ventasNetas - costosDirectos;
  const gastosFijosTotal = gastosFijos.reduce((s, g) => s + g.monto, 0);
  const ebitda = margenBruto - gastosFijosTotal;
  const margenPct = ventasNetas > 0 ? margenBruto / ventasNetas : 0;
  const ivaCredito = costosMateriales * 0.19;
  const ivaPorPagar = ivaDébito - ivaCredito;
  const cxc = trabajos.filter(t => t.statusPagoCliente !== "PAGADO").reduce((s, t) => s + calcTrabajo(t).saldoPorCobrar, 0);
  const cxp = trabajos.filter(t => t.statusPagoMaestro !== "PAGADO").reduce((s, t) => s + calcTrabajo(t).saldoPorPagarMaestro, 0);
  return { completados: completados.length, ventasNetas, ivaDébito, ventasConIva: ventasNetas + ivaDébito, costosMaestros, costosMateriales, costosAdicionales, costosDirectos, margenBruto, margenPct, gastosFijosTotal, ebitda, ivaCredito, ivaPorPagar, cxc, cxp };
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f4f6fb; --surface: #ffffff; --surface2: #f0f3fa; --surface3: #e8ecf5;
    --border: #e2e7f0; --border2: #ccd3e5;
    --accent: #2563eb; --accent2: #059669; --accent3: #ea580c; --danger: #dc2626; --warn: #d97706;
    --text: #111827; --text2: #4b5563; --text3: #9ca3af;
    --font: 'DM Sans', sans-serif; --font-display: 'Syne', sans-serif;
    --r: 12px; --r-sm: 8px; --r-lg: 16px;
    --shadow: 0 4px 24px rgba(0,0,0,.08);
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.5; }
  #root { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; min-height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 0; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; box-shadow: 2px 0 8px rgba(0,0,0,.04); }
  .sidebar-logo { padding: 24px 20px 16px; border-bottom: 1px solid var(--border); }
  .sidebar-logo h1 { font-family: var(--font-display); font-size: 17px; font-weight: 800; color: var(--accent); line-height: 1.2; }
  .sidebar-logo span { font-size: 11px; color: var(--text3); font-weight: 400; }
  .sidebar-nav { padding: 12px 0; flex: 1; }
  .nav-section { padding: 8px 20px 4px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--text3); }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 20px; cursor: pointer; color: var(--text2); font-size: 13.5px; transition: all .15s; border-left: 3px solid transparent; }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active { color: var(--accent); background: #eff6ff; border-left-color: var(--accent); font-weight: 500; }
  .nav-icon { font-size: 16px; width: 20px; text-align: center; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 28px; gap: 16px; justify-content: space-between; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  .topbar-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-accent { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-orange { background: #fed7aa; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: var(--surface3); color: var(--text2); }
  .content { flex: 1; padding: 28px; overflow-y: auto; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
  .card-sm { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
  .card-title { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }
  .kpi-value { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--text); line-height: 1; }
  .kpi-sub { font-size: 12px; color: var(--text3); margin-top: 4px; }
  .kpi-trend { font-size: 12px; font-weight: 600; margin-top: 6px; }
  .kpi-up { color: var(--accent2); } .kpi-down { color: var(--danger); }
  table { width: 100%; border-collapse: collapse; }
  thead tr { border-bottom: 1px solid var(--border2); }
  th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--text3); }
  td { padding: 11px 12px; font-size: 13px; border-bottom: 1px solid var(--border); color: var(--text); }
  tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: #f0f6ff; cursor: pointer; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; font-family: var(--font); }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border2); }
  .btn-secondary:hover { background: var(--surface2); }
  .btn-danger { background: #fee2e2; color: var(--danger); border: 1px solid #fca5a5; }
  .btn-green { background: #d1fae5; color: var(--accent2); border: 1px solid #6ee7b7; }
  .btn-sm { padding: 5px 12px; font-size: 12px; }
  input, select, textarea { background: #f8faff; border: 1px solid var(--border2); border-radius: var(--r-sm); padding: 8px 12px; color: var(--text); font-size: 13px; font-family: var(--font); width: 100%; outline: none; transition: border .15s; }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); background: #fff; }
  select option { background: #fff; color: var(--text); }
  label { font-size: 12px; font-weight: 600; color: var(--text2); display: block; margin-bottom: 4px; }
  .form-group { margin-bottom: 14px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
  .modal { background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-lg); padding: 28px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow); }
  .modal-title { font-family: var(--font-display); font-size: 18px; font-weight: 800; margin-bottom: 20px; }
  .divider { height: 1px; background: var(--border); margin: 16px 0; }
  .semaforo { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .sem-green { background: #059669; box-shadow: 0 0 6px #059669; }
  .sem-yellow { background: #d97706; box-shadow: 0 0 6px #d97706; }
  .sem-red { background: #dc2626; box-shadow: 0 0 6px #dc2626; }
  .progress-bar { height: 6px; background: var(--surface3); border-radius: 10px; overflow: hidden; margin-top: 8px; }
  .progress-fill { height: 100%; border-radius: 10px; transition: width .5s; }
  .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab { padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text3); border-bottom: 2px solid transparent; transition: all .15s; }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab:hover { color: var(--text); }
  .insight-card { background: #f0f7ff; border: 1px solid #bdd7ff; border-left: 4px solid var(--accent); border-radius: var(--r-sm); padding: 12px 16px; margin-bottom: 10px; font-size: 13px; }
  .insight-card.warn { background: #fffbeb; border-color: #fde68a; border-left-color: var(--warn); }
  .insight-card.danger { background: #fff1f2; border-color: #fecaca; border-left-color: var(--danger); }
  .insight-card.success { background: #ecfdf5; border-color: #a7f3d0; border-left-color: var(--accent2); }
  .text-muted { color: var(--text3); }
  .text-sm { font-size: 12px; }
  .text-right { text-align: right; }
  .flex { display: flex; } .flex-col { flex-direction: column; }
  .items-center { align-items: center; } .justify-between { justify-content: space-between; }
  .gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .gap-4 { gap: 16px; }
  .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; } .mb-6 { margin-bottom: 24px; }
  .mt-2 { margin-top: 8px; } .mt-4 { margin-top: 16px; }
  .w-full { width: 100%; }
  .font-bold { font-weight: 700; }
  .font-display { font-family: var(--font-display); }
  select option { background: var(--surface2); }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: var(--bg); } ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
  .chart-bar { display: flex; align-items: flex-end; gap: 6px; height: 80px; }
  .bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 2px; transition: height .4s; }
  .bar-label { font-size: 10px; color: var(--text3); }
  .empty { text-align: center; padding: 40px; color: var(--text3); font-size: 14px; }
  .tag { display: inline-flex; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; background: var(--surface3); color: var(--text2); margin-right: 4px; }
  @media (max-width: 1100px) { .grid-4 { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 768px) { .sidebar { width: 60px; } .sidebar-logo h1 { display: none; } .nav-item span { display: none; } .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }
`;

// ─────────────────────────────────────────────
// ICONS (emoji-based, lightweight)
// ─────────────────────────────────────────────
const Icons = {
  dashboard: "📊", clientes: "👤", maestros: "🔧", trabajos: "📋", presupuestos: "📄",
  finanzas: "💰", config: "⚙️", plus: "＋", pdf: "🗒️", eye: "👁️", trash: "🗑️",
  edit: "✏️", check: "✓", arrow: "→", alert: "⚠️", insight: "💡", target: "🎯",
  cash: "💵", chart: "📈", people: "👥", tools: "🛠️", calendar: "📅",
};

// ─────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────
const STATUS_TRABAJO = { PENDIENTE_ACEPTACION: "Pendiente", EN_PROCESO: "En proceso", COMPLETADO: "Completado", CANCELADO: "Cancelado" };
const STATUS_PAGO = { PENDIENTE: "Pendiente", ABONADO: "Abonado", PAGADO: "Pagado", VENCIDO: "Vencido" };
const STATUS_MAESTRO = { PENDIENTE: "Pendiente", PAGADO: "Pagado" };
const TIPOS_SERVICIO = ["Gasfitería", "Electricidad", "Techos", "Albañilería", "Pintura", "Carpintería", "Fumigación", "Otros"];
const METODOS_PAGO = ["Transferencia", "Efectivo", "Cheque", "Tarjeta débito", "Tarjeta crédito"];

function statusBadge(s, map = STATUS_TRABAJO) {
  const label = map[s] || s;
  const cls = {
    COMPLETADO: "badge-green", PAGADO: "badge-green", EN_PROCESO: "badge-accent",
    PENDIENTE_ACEPTACION: "badge-gray", PENDIENTE: "badge-orange", ABONADO: "badge-orange",
    VENCIDO: "badge-red", CANCELADO: "badge-red",
  }[s] || "badge-gray";
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─────────────────────────────────────────────
// MINI BAR CHART
// ─────────────────────────────────────────────
function BarChart({ data, color = "#4f8ef7" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-bar">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar" style={{ height: `${(d.value / max) * 70}px`, background: color, opacity: 0.8 + i * 0.02 }} title={fmt(d.value)} />
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 900 } : {}}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORM COMPONENTS
// ─────────────────────────────────────────────
function Field({ label, children }) {
  return <div className="form-group"><label>{label}</label>{children}</div>;
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ trabajos, gastosFijos, config }) {
  const currentMonth = getMonthKey();
  const [mes, setMes] = useState(currentMonth);
  const dash = useMemo(() => calcDashboard(trabajos, gastosFijos, mes), [trabajos, gastosFijos, mes]);
  const obj = config.objetivoVentasNeto;
  const be = gastosFijos.reduce((s, g) => s + g.monto, 0) / (config.margenBrutoConfig || 0.45);
  const pctObj = Math.min(dash.ventasNetas / obj, 1);
  const pctBe = Math.min(dash.ventasNetas / be, 1);
  const semObj = pctObj >= 0.9 ? "green" : pctObj >= 0.6 ? "yellow" : "red";
  const semBe = pctBe >= 1 ? "green" : pctBe >= 0.7 ? "yellow" : "red";

  // Last 6 months data
  const months6 = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = getMonthKey(d.toISOString().split("T")[0]);
    const dd = calcDashboard(trabajos, gastosFijos, k);
    months6.push({ label: d.toLocaleString("es-CL", { month: "short" }), value: dd.ventasNetas });
  }

  // Insights
  const insights = [];
  if (dash.cxc > dash.cxp * 2) insights.push({ type: "success", msg: `✅ Flujo positivo: cuentas por cobrar (${fmt(dash.cxc)}) superan las por pagar (${fmt(dash.cxp)}).` });
  if (dash.cxc < dash.cxp) insights.push({ type: "danger", msg: `🚨 Riesgo de caja: debes ${fmt(dash.cxp)} y tienes ${fmt(dash.cxc)} por cobrar.` });
  if (dash.margenPct < 0.3) insights.push({ type: "warn", msg: `⚠️ Margen bruto bajo (${fmtPct(dash.margenPct)}). Revisa precios o reducir costos de materiales.` });
  if (dash.margenPct >= 0.45) insights.push({ type: "success", msg: `💪 Excelente margen bruto (${fmtPct(dash.margenPct)}) este mes.` });
  if (dash.ebitda < 0) insights.push({ type: "danger", msg: `⛔ EBITDA negativo (${fmt(dash.ebitda)}). Los gastos fijos superan el margen bruto.` });
  if (dash.ventasNetas < be) insights.push({ type: "warn", msg: `📉 Faltan ${fmt(be - dash.ventasNetas)} en ventas netas para cubrir punto de equilibrio.` });
  if (dash.completados === 0) insights.push({ type: "warn", msg: "📋 Sin trabajos completados este mes. Revisa el pipeline." });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex items-center gap-3">
          <label style={{ color: "var(--text2)", fontSize: 13 }}>Período:</label>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid-4 mb-4">
        <div className="card-sm">
          <div className="card-title">Ventas Netas</div>
          <div className="kpi-value">{fmt(dash.ventasNetas)}</div>
          <div className="kpi-sub">+ IVA: {fmt(dash.ventasConIva)}</div>
        </div>
        <div className="card-sm">
          <div className="card-title">Utilidad Neta</div>
          <div className="kpi-value" style={{ color: dash.ebitda >= 0 ? "var(--accent2)" : "var(--danger)" }}>{fmt(dash.ebitda)}</div>
          <div className="kpi-sub">Margen bruto: {fmtPct(dash.margenPct)}</div>
        </div>
        <div className="card-sm">
          <div className="card-title">IVA por Pagar</div>
          <div className="kpi-value" style={{ color: "var(--warn)" }}>{fmt(dash.ivaPorPagar)}</div>
          <div className="kpi-sub">Débito: {fmt(dash.ivaDébito)} / Crédito: {fmt(dash.ivaCredito)}</div>
        </div>
        <div className="card-sm">
          <div className="card-title">Trabajos</div>
          <div className="kpi-value">{dash.completados}</div>
          <div className="kpi-sub">completados este mes</div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        {/* Metas */}
        <div className="card">
          <div className="card-title">{Icons.target} Metas del Mes</div>
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-sm"><span className={`semaforo sem-${semObj}`} />Objetivo de venta: {fmt(obj)}</span>
              <span className="text-sm text-muted">{fmtPct(pctObj)}</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pctObj * 100}%`, background: semObj === "green" ? "#22d3a4" : semObj === "yellow" ? "#f7c94f" : "#f75f5f" }} /></div>
            <div className="text-sm text-muted mt-2">Te falta vender: <strong style={{ color: "var(--text)" }}>{fmt(Math.max(0, obj - dash.ventasNetas))}</strong></div>
          </div>
          <div className="divider" />
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm"><span className={`semaforo sem-${semBe}`} />Punto de equilibrio: {fmt(be)}</span>
              <span className="text-sm text-muted">{fmtPct(pctBe)}</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pctBe * 100}%`, background: semBe === "green" ? "#22d3a4" : semBe === "yellow" ? "#f7c94f" : "#f75f5f" }} /></div>
            <div className="text-sm text-muted mt-2">Te falta para breakeven: <strong style={{ color: "var(--text)" }}>{fmt(Math.max(0, be - dash.ventasNetas))}</strong></div>
          </div>
        </div>

        {/* P&L */}
        <div className="card">
          <div className="card-title">{Icons.chart} Estado de Resultado</div>
          {[
            ["Ingresos netos", dash.ventasNetas, "var(--text)"],
            ["(-) Costos maestros", -dash.costosMaestros, "var(--danger)"],
            ["(-) Costos materiales", -dash.costosMateriales, "var(--danger)"],
            ["(-) Costos adicionales", -dash.costosAdicionales, "var(--danger)"],
            ["= Margen bruto", dash.margenBruto, "var(--accent2)"],
            ["(-) Gastos fijos", -dash.gastosFijosTotal, "var(--danger)"],
            ["= EBITDA", dash.ebitda, dash.ebitda >= 0 ? "var(--accent2)" : "var(--danger)"],
          ].map(([label, val, color]) => (
            <div key={label} className="flex justify-between" style={{ padding: "5px 0", borderBottom: label.startsWith("=") ? "2px solid var(--border2)" : "1px solid var(--border)" }}>
              <span style={{ fontSize: 12.5, color: label.startsWith("=") ? "var(--text)" : "var(--text2)", fontWeight: label.startsWith("=") ? 700 : 400 }}>{label}</span>
              <span style={{ fontSize: 12.5, color, fontWeight: label.startsWith("=") ? 700 : 400 }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 mb-4">
        {/* Cobros y pagos */}
        <div className="card">
          <div className="card-title">{Icons.cash} Flujo de Caja</div>
          <div className="grid-2">
            <div>
              <div className="text-sm text-muted">Por Cobrar (CxC)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-display)", marginTop: 4 }}>{fmt(dash.cxc)}</div>
            </div>
            <div>
              <div className="text-sm text-muted">Por Pagar Maestros</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--danger)", fontFamily: "var(--font-display)", marginTop: 4 }}>{fmt(dash.cxp)}</div>
            </div>
          </div>
        </div>

        {/* Ventas historicas */}
        <div className="card">
          <div className="card-title">{Icons.chart} Ventas Últimos 6 Meses</div>
          <BarChart data={months6} color="#4f8ef7" />
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <div className="card-title">{Icons.insight} Insights Estratégicos</div>
        {insights.length === 0 && <div className="text-muted text-sm">Sin alertas relevantes este período.</div>}
        {insights.map((ins, i) => (
          <div key={i} className={`insight-card ${ins.type}`}>{ins.msg}</div>
        ))}
        <div className="insight-card">
          {Icons.tools} Costos directos totales: {fmt(dash.costosDirectos)} — {fmtPct(dash.ventasNetas > 0 ? dash.costosDirectos / dash.ventasNetas : 0)} de los ingresos.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────
function Clientes({ clientes, setClientes, trabajos }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");

  const open = (c = null) => { setForm(c ? { ...c } : { nombre: "", rut: "", email: "", telefono: "", direccion: "", comuna: "", notas: "" }); setModal(c ? "edit" : "new"); };

  const save = () => {
    if (!form.nombre) return alert("Nombre requerido");
    if (modal === "new") setClientes(prev => [...prev, { ...form, id: Date.now() }]);
    else setClientes(prev => prev.map(c => c.id === form.id ? form : c));
    setModal(null);
  };

  const del = (id) => { if (confirm("¿Eliminar cliente?")) setClientes(prev => prev.filter(c => c.id !== id)); };

  const filtered = clientes.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <input placeholder="🔍 Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <button className="btn btn-primary" onClick={() => open()}>{Icons.plus} Nuevo Cliente</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Nombre</th><th>RUT</th><th>Email</th><th>Teléfono</th><th>Comuna</th><th>Trabajos</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><strong>{c.nombre}</strong></td>
                <td className="text-muted">{c.rut || "—"}</td>
                <td>{c.email}</td>
                <td>{c.telefono}</td>
                <td>{c.comuna}</td>
                <td>{trabajos.filter(t => t.clienteId === c.id).length}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => open(c)}>{Icons.edit}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>{Icons.trash}</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">Sin clientes</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Nuevo Cliente" : "Editar Cliente"} onClose={() => setModal(null)}>
          <div className="grid-2">
            <Field label="Nombre *"><input value={form.nombre || ""} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
            <Field label="RUT"><input value={form.rut || ""} onChange={e => setForm({ ...form, rut: e.target.value })} placeholder="12.345.678-9" /></Field>
            <Field label="Email"><input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Teléfono"><input value={form.telefono || ""} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Dirección"><input value={form.direccion || ""} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field>
            <Field label="Comuna"><input value={form.comuna || ""} onChange={e => setForm({ ...form, comuna: e.target.value })} /></Field>
          </div>
          <Field label="Notas"><textarea rows={2} value={form.notas || ""} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field>
          <div className="flex gap-3 mt-4">
            <button className="btn btn-primary" onClick={save}>Guardar</button>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAESTROS
// ─────────────────────────────────────────────
function Maestros({ maestros, setMaestros, trabajos }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});

  const open = (m = null) => { setForm(m ? { ...m } : { nombre: "", especialidad: "", telefono: "", modalidad: "Por trabajo", notas: "" }); setModal(true); };
  const save = () => {
    if (!form.nombre) return alert("Nombre requerido");
    if (form.id) setMaestros(prev => prev.map(m => m.id === form.id ? form : m));
    else setMaestros(prev => [...prev, { ...form, id: Date.now() }]);
    setModal(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-muted">{maestros.length} maestros registrados</span>
        <button className="btn btn-primary" onClick={() => open()}>{Icons.plus} Nuevo Maestro</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Nombre</th><th>Especialidad</th><th>Teléfono</th><th>Modalidad</th><th>Trabajos</th><th>Acciones</th></tr></thead>
          <tbody>
            {maestros.map(m => (
              <tr key={m.id}>
                <td><strong>{m.nombre}</strong></td>
                <td>{m.especialidad}</td>
                <td>{m.telefono}</td>
                <td>{statusBadge(m.modalidad === "Fijo" ? "EN_PROCESO" : "PENDIENTE_ACEPTACION", { Fijo: "Fijo", "Por trabajo": "Por trabajo" })}<span className="badge badge-gray">{m.modalidad}</span></td>
                <td>{trabajos.filter(t => t.maestroId === m.id).length}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => open(m)}>{Icons.edit}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Maestro/Técnico" onClose={() => setModal(false)}>
          <div className="grid-2">
            <Field label="Nombre *"><input value={form.nombre || ""} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
            <Field label="Especialidad">
              <select value={form.especialidad || ""} onChange={e => setForm({ ...form, especialidad: e.target.value })}>
                <option value="">Seleccionar</option>
                {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Teléfono"><input value={form.telefono || ""} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
            <Field label="Modalidad">
              <select value={form.modalidad || "Por trabajo"} onChange={e => setForm({ ...form, modalidad: e.target.value })}>
                <option>Fijo</option><option>Por trabajo</option>
              </select>
            </Field>
          </div>
          <Field label="Notas"><textarea rows={2} value={form.notas || ""} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field>
          <div className="flex gap-3 mt-4">
            <button className="btn btn-primary" onClick={save}>Guardar</button>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ITEMS PRESUPUESTO EDITOR
// ─────────────────────────────────────────────
function ItemsEditor({ items, setItems }) {
  const add = (tipo) => {
    const base = { id: Date.now(), tipo };
    if (tipo === "servicio") setItems(prev => [...prev, { ...base, descripcion: "", cantidad: 1, precioUnitarioNeto: 0 }]);
    if (tipo === "material") setItems(prev => [...prev, { ...base, descripcion: "", cantidad: 1, costoCompraUnitarioNeto: 0, precioVentaUnitarioNeto: 0 }]);
    if (tipo === "adicional") setItems(prev => [...prev, { ...base, descripcion: "", subTipo: "transporte", costoNeto: 0, precioVentaNeto: 0 }]);
  };
  const upd = (id, field, val) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: field.includes("cantidad") || field.includes("Neto") || field.includes("precio") || field.includes("costo") ? Number(val) : val } : it));
  const rem = (id) => setItems(prev => prev.filter(it => it.id !== id));

  const renderItem = (it) => {
    if (it.tipo === "servicio") return (
      <tr key={it.id}>
        <td><span className="badge badge-accent">Servicio</span></td>
        <td><input value={it.descripcion} onChange={e => upd(it.id, "descripcion", e.target.value)} placeholder="Descripción" /></td>
        <td><input type="number" value={it.cantidad} onChange={e => upd(it.id, "cantidad", e.target.value)} style={{ width: 60 }} /></td>
        <td><input type="number" value={it.precioUnitarioNeto} onChange={e => upd(it.id, "precioUnitarioNeto", e.target.value)} style={{ width: 100 }} /></td>
        <td className="text-right">{fmt(it.cantidad * it.precioUnitarioNeto)}</td>
        <td>—</td>
        <td><button className="btn btn-danger btn-sm" onClick={() => rem(it.id)}>✕</button></td>
      </tr>
    );
    if (it.tipo === "material") return (
      <tr key={it.id}>
        <td><span className="badge badge-green">Material</span></td>
        <td><input value={it.descripcion} onChange={e => upd(it.id, "descripcion", e.target.value)} placeholder="Descripción" /></td>
        <td><input type="number" value={it.cantidad} onChange={e => upd(it.id, "cantidad", e.target.value)} style={{ width: 60 }} /></td>
        <td><input type="number" value={it.precioVentaUnitarioNeto} onChange={e => upd(it.id, "precioVentaUnitarioNeto", e.target.value)} style={{ width: 100 }} /></td>
        <td className="text-right">{fmt(it.cantidad * it.precioVentaUnitarioNeto)}</td>
        <td className="text-muted text-sm">Costo: {fmt(it.cantidad * it.costoCompraUnitarioNeto)}<br /><input type="number" value={it.costoCompraUnitarioNeto} onChange={e => upd(it.id, "costoCompraUnitarioNeto", e.target.value)} style={{ width: 90, marginTop: 4 }} placeholder="Costo u/n" /></td>
        <td><button className="btn btn-danger btn-sm" onClick={() => rem(it.id)}>✕</button></td>
      </tr>
    );
    if (it.tipo === "adicional") return (
      <tr key={it.id}>
        <td><span className="badge badge-orange">Adicional</span></td>
        <td><input value={it.descripcion} onChange={e => upd(it.id, "descripcion", e.target.value)} placeholder="Descripción" /></td>
        <td>1</td>
        <td><input type="number" value={it.precioVentaNeto} onChange={e => upd(it.id, "precioVentaNeto", e.target.value)} style={{ width: 100 }} /></td>
        <td className="text-right">{fmt(it.precioVentaNeto)}</td>
        <td className="text-muted text-sm">Costo: <input type="number" value={it.costoNeto} onChange={e => upd(it.id, "costoNeto", e.target.value)} style={{ width: 80 }} /></td>
        <td><button className="btn btn-danger btn-sm" onClick={() => rem(it.id)}>✕</button></td>
      </tr>
    );
  };

  const totals = (() => {
    let neto = 0, costoTotal = 0;
    for (const it of items) {
      if (it.tipo === "servicio") { neto += it.cantidad * it.precioUnitarioNeto; }
      if (it.tipo === "material") { neto += it.cantidad * it.precioVentaUnitarioNeto; costoTotal += it.cantidad * it.costoCompraUnitarioNeto; }
      if (it.tipo === "adicional") { neto += it.precioVentaNeto; costoTotal += it.costoNeto; }
    }
    return { neto, iva: neto * 0.19, total: neto * 1.19, costoTotal };
  })();

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button className="btn btn-secondary btn-sm" onClick={() => add("servicio")}>{Icons.plus} Servicio</button>
        <button className="btn btn-secondary btn-sm" onClick={() => add("material")}>{Icons.plus} Material</button>
        <button className="btn btn-secondary btn-sm" onClick={() => add("adicional")}>{Icons.plus} Adicional</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Tipo</th><th>Descripción</th><th>Cant.</th><th>P. Venta Neto</th><th>Total Venta</th><th>Costo</th><th></th></tr></thead>
          <tbody>{items.map(renderItem)}</tbody>
        </table>
      </div>
      <div className="divider" />
      <div style={{ maxWidth: 320, marginLeft: "auto" }}>
        {[["Subtotal Neto", totals.neto], ["IVA 19%", totals.iva], ["Total con IVA", totals.total]].map(([k, v]) => (
          <div key={k} className="flex justify-between" style={{ padding: "4px 0", fontWeight: k === "Total con IVA" ? 700 : 400 }}>
            <span style={{ color: "var(--text2)" }}>{k}</span>
            <span style={{ color: k === "Total con IVA" ? "var(--accent)" : "var(--text)" }}>{fmt(v)}</span>
          </div>
        ))}
        <div className="text-sm text-muted mt-2">Costo total interno: {fmt(totals.costoTotal)}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PDF — HTML TEMPLATE (reutilizable)
// ─────────────────────────────────────────────
function buildQuoteHTML(trabajo, cliente, config) {
  const p = trabajo.presupuesto;
  const calc = calcTrabajo(trabajo);
  return `
  <div style="font-family:Arial,sans-serif;font-size:13px;color:#222;width:750px;margin:0 auto;">
    <div style="background:#1a2540;color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:22px;font-weight:900;">⚡ ${config.empresa.nombre}</div>
        <div style="font-size:11px;opacity:.7;margin-top:6px;">${config.empresa.rut} • ${config.empresa.telefono} • ${config.empresa.email}</div>
        <div style="font-size:11px;opacity:.7;margin-top:2px;">${config.empresa.direccion}</div>
      </div>
      <div style="text-align:right;font-size:12px;">
        <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;">Presupuesto</div>
        <div style="font-size:22px;font-weight:900;margin:4px 0;">${p.numero}</div>
        <div>Fecha: ${p.fecha}</div>
        <div>Válido por: ${p.validez}</div>
      </div>
    </div>
    <div style="padding:28px 32px;background:#fff;">
      <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:20px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">Cliente</div>
            <strong style="font-size:14px;">${cliente.nombre}</strong><br>
            ${cliente.rut ? `<span style="color:#666;">RUT: ${cliente.rut}</span><br>` : ""}
            <span style="color:#666;">${cliente.email}</span><br>
            <span style="color:#666;">${cliente.telefono}</span><br>
            <span style="color:#666;">${cliente.direccion}, ${cliente.comuna}</span>
          </td>
          <td style="width:50%;vertical-align:top;padding-left:20px;border-left:1px solid #eee;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">Detalle del Trabajo</div>
            <div><strong>Tipo:</strong> ${trabajo.tipoServicio}</div>
            <div style="margin-top:4px;"><strong>Descripción:</strong> ${trabajo.descripcion}</div>
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f5f7ff;">
            <th style="padding:9px 10px;text-align:left;font-size:11px;border-bottom:2px solid #d0d5e8;">Tipo</th>
            <th style="padding:9px 10px;text-align:left;font-size:11px;border-bottom:2px solid #d0d5e8;">Descripción</th>
            <th style="padding:9px 10px;text-align:center;font-size:11px;border-bottom:2px solid #d0d5e8;">Cant.</th>
            <th style="padding:9px 10px;text-align:right;font-size:11px;border-bottom:2px solid #d0d5e8;">P.Unit.Neto</th>
            <th style="padding:9px 10px;text-align:right;font-size:11px;border-bottom:2px solid #d0d5e8;">Total Neto</th>
          </tr>
        </thead>
        <tbody>
          ${(p.items || []).map((it, idx) => {
            const bg = idx % 2 === 0 ? "#fff" : "#fafbff";
            if (it.tipo === "servicio") return `<tr style="background:${bg};"><td style="padding:8px 10px;border-bottom:1px solid #eee;"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Servicio</span></td><td style="padding:8px 10px;border-bottom:1px solid #eee;">${it.descripcion}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${it.cantidad}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">$${(it.precioUnitarioNeto||0).toLocaleString("es-CL")}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$${((it.cantidad||0)*(it.precioUnitarioNeto||0)).toLocaleString("es-CL")}</td></tr>`;
            if (it.tipo === "material") return `<tr style="background:${bg};"><td style="padding:8px 10px;border-bottom:1px solid #eee;"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Material</span></td><td style="padding:8px 10px;border-bottom:1px solid #eee;">${it.descripcion}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${it.cantidad}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">$${(it.precioVentaUnitarioNeto||0).toLocaleString("es-CL")}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$${((it.cantidad||0)*(it.precioVentaUnitarioNeto||0)).toLocaleString("es-CL")}</td></tr>`;
            if (it.tipo === "adicional") return `<tr style="background:${bg};"><td style="padding:8px 10px;border-bottom:1px solid #eee;"><span style="background:#fed7aa;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">Adicional</span></td><td style="padding:8px 10px;border-bottom:1px solid #eee;">${it.descripcion}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">1</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">$${(it.precioVentaNeto||0).toLocaleString("es-CL")}</td><td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$${(it.precioVentaNeto||0).toLocaleString("es-CL")}</td></tr>`;
            return "";
          }).join("")}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
        <table style="width:280px;border-collapse:collapse;">
          <tr><td style="padding:7px 12px;color:#666;">Subtotal Neto</td><td style="padding:7px 12px;text-align:right;font-weight:600;">$${Math.round(calc.subtotalNeto).toLocaleString("es-CL")}</td></tr>
          <tr><td style="padding:7px 12px;color:#666;">IVA 19%</td><td style="padding:7px 12px;text-align:right;font-weight:600;">$${Math.round(calc.iva).toLocaleString("es-CL")}</td></tr>
          <tr style="background:#1a2540;"><td style="padding:10px 12px;color:#fff;font-size:15px;font-weight:900;">TOTAL</td><td style="padding:10px 12px;text-align:right;color:#fff;font-size:15px;font-weight:900;">$${Math.round(calc.total).toLocaleString("es-CL")}</td></tr>
        </table>
      </div>
      ${p.condiciones ? `<div style="background:#f9faff;border:1px solid #dde4f5;border-radius:6px;padding:14px 16px;margin-bottom:20px;font-size:12px;color:#444;"><strong>Condiciones:</strong><br>${p.condiciones}</div>` : ""}
      <div style="border-top:1px solid #eee;padding-top:12px;text-align:center;font-size:11px;color:#999;">
        ${config.empresa.nombre} — ${config.empresa.email} — ${config.empresa.telefono}
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// DESCARGA PDF REAL — usa html2pdf instalado vía npm
// NO usa CDN, NO usa window.open, NO usa window.print
// ─────────────────────────────────────────────
const PDF_OPTIONS = {
  margin: [10, 10, 10, 10],
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
};

function crearContenedorPDF(htmlContent) {
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  // Fuera de pantalla pero con dimensiones reales para que html2canvas lo renderice correctamente
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;background:#fff;z-index:-1;";
  document.body.appendChild(container);
  return container;
}

async function downloadQuotePDF(trabajo, cliente, config) {
  // ── Validaciones previas ──────────────────────────────────────
  if (!trabajo) {
    alert("Error: No hay datos del trabajo. Intenta recargar la página.");
    return;
  }
  if (!cliente) {
    alert("Error: Trabajo sin cliente asociado.\nAsigna un cliente al trabajo antes de generar el PDF.");
    return;
  }
  if (!trabajo.presupuesto || !trabajo.presupuesto.numero) {
    alert("Error: Falta presupuesto o número de presupuesto.\nCompleta el presupuesto del trabajo primero.");
    return;
  }

  const filename = "Presupuesto_" + trabajo.presupuesto.numero + ".pdf";
  const container = crearContenedorPDF(buildQuoteHTML(trabajo, cliente, config));

  try {
    if (IS_ELECTRON) {
      // En Electron: generar blob y guardar con diálogo nativo del sistema operativo
      const pdfBlob = await html2pdf()
        .set({ ...PDF_OPTIONS, filename })
        .from(container)
        .outputPdf("blob");

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const result = await window.electronAPI.savePDF(Array.from(uint8Array), filename);

      if (result.success) {
        // Mostrar confirmación discreta (no modal) si se guardó correctamente
        if (!result.canceled) {
          // El main process ya mostró diálogo de guardado
        }
      } else {
        throw new Error(result.error || "Error al guardar el archivo");
      }
    } else {
      // En browser: descarga directa (comportamiento anterior)
      await html2pdf()
        .set({ ...PDF_OPTIONS, filename })
        .from(container)
        .save();
    }
  } finally {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

// ─────────────────────────────────────────────
// OBTENER PDF COMO BASE64 (para email)
// ─────────────────────────────────────────────
// ENVIAR POR GMAIL (via backend Node.js)
// ─────────────────────────────────────────────
// URL del backend — gestionada por getBackendBase() dinámicamente
// La constante BACKEND_URL se mantiene para backward compat con funciones no migradas
const BACKEND_URL = getBackendBase();

// ─────────────────────────────────────────────
// TRABAJOS (core module)
// ─────────────────────────────────────────────
function Trabajos({ trabajos, setTrabajos, clientes, maestros, config }) {
  const [view, setView] = useState("list"); // list | detail | new
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMes, setFilterMes] = useState("");
  const [tab, setTab] = useState("info");

  const open = (t) => { setSelected(t); setView("detail"); setTab("info"); };
  const backToList = () => { setView("list"); setSelected(null); };

  // Filtered
  const filtered = trabajos.filter(t => {
    if (filterStatus && t.statusTrabajo !== filterStatus) return false;
    if (filterMes && getMonthKey(t.fechaCreacion) !== filterMes) return false;
    return true;
  });

  const updateTrabajo = (updated) => {
    setTrabajos(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
  };

  if (view === "new") return <NuevoTrabajo clientes={clientes} maestros={maestros} onSave={(t) => { setTrabajos(prev => [...prev, t]); backToList(); }} onCancel={backToList} />;
  if (view === "detail" && selected) return <DetalleTrabajo t={selected} clientes={clientes} maestros={maestros} onBack={backToList} onUpdate={updateTrabajo} config={config} tab={tab} setTab={setTab} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="month" value={filterMes} onChange={e => setFilterMes(e.target.value)} style={{ width: 160 }} />
          {filterStatus || filterMes ? <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(""); setFilterMes(""); }}>✕ Limpiar</button> : null}
        </div>
        <button className="btn btn-primary" onClick={() => setView("new")}>{Icons.plus} Nuevo Trabajo</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>N°</th><th>Cliente</th><th>Tipo</th><th>Fecha</th><th>Status</th><th>Status Pago</th><th>Total</th><th>Saldo</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const c = clientes.find(c => c.id === t.clienteId);
              const calc = calcTrabajo(t);
              return (
                <tr key={t.id} onClick={() => open(t)}>
                  <td><span className="text-muted">#{t.id}</span></td>
                  <td><strong>{c?.nombre || "—"}</strong></td>
                  <td>{t.tipoServicio}</td>
                  <td className="text-muted">{t.fechaCreacion}</td>
                  <td>{statusBadge(t.statusTrabajo)}</td>
                  <td>{statusBadge(t.statusPagoCliente, STATUS_PAGO)}</td>
                  <td>{fmt(calc.total)}</td>
                  <td style={{ color: calc.saldoPorCobrar > 0 ? "var(--danger)" : "var(--accent2)" }}>{fmt(calc.saldoPorCobrar)}</td>
                  <td><button className="btn btn-secondary btn-sm">{Icons.eye}</button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={9} className="empty">Sin trabajos para mostrar</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// NUEVO TRABAJO
// ─────────────────────────────────────────────
function NuevoTrabajo({ clientes, maestros, onSave, onCancel }) {
  const [form, setForm] = useState({
    fechaCreacion: today(), fechaEjecucionInicio: today(), fechaEjecucionFin: today(),
    tipoServicio: "Gasfitería", descripcion: "", statusTrabajo: "PENDIENTE_ACEPTACION",
    statusPagoCliente: "PENDIENTE", statusPagoMaestro: "PENDIENTE",
    costeMaestroNeto: 0, observaciones: "", etiquetas: [], clienteId: "", maestroId: "",
    presupuesto: { numero: `PRE-${Date.now()}`, fecha: today(), condiciones: "30% anticipo, 70% al término. Garantía 30 días.", validez: "10 días", items: [] },
    pagosCliente: [], pagosPerito: [], fechaVencimiento: today(),
  });
  const [items, setItems] = useState([]);

  const save = () => {
    if (!form.clienteId || !form.maestroId) return alert("Selecciona cliente y maestro");
    const t = { ...form, id: Date.now(), clienteId: Number(form.clienteId), maestroId: Number(form.maestroId), presupuesto: { ...form.presupuesto, items } };
    onSave(t);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>← Volver</button>
        <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800 }}>Nuevo Trabajo</h2>
      </div>
      <div className="card mb-4">
        <div className="card-title">Información General</div>
        <div className="grid-2">
          <Field label="Cliente *">
            <select value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Maestro/Técnico *">
            <select value={form.maestroId} onChange={e => setForm({ ...form, maestroId: e.target.value })}>
              <option value="">Seleccionar maestro</option>
              {maestros.map(m => <option key={m.id} value={m.id}>{m.nombre} — {m.especialidad}</option>)}
            </select>
          </Field>
          <Field label="Tipo de Servicio">
            <select value={form.tipoServicio} onChange={e => setForm({ ...form, tipoServicio: e.target.value })}>
              {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.statusTrabajo} onChange={e => setForm({ ...form, statusTrabajo: e.target.value })}>
              {Object.entries(STATUS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Fecha Creación"><input type="date" value={form.fechaCreacion} onChange={e => setForm({ ...form, fechaCreacion: e.target.value })} /></Field>
          <Field label="Fecha Ejecución"><input type="date" value={form.fechaEjecucionInicio} onChange={e => setForm({ ...form, fechaEjecucionInicio: e.target.value })} /></Field>
          <Field label="Costo Maestro Neto (CLP)"><input type="number" value={form.costeMaestroNeto} onChange={e => setForm({ ...form, costeMaestroNeto: Number(e.target.value) })} /></Field>
          <Field label="Fecha Vencimiento Pago"><input type="date" value={form.fechaVencimiento} onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })} /></Field>
        </div>
        <Field label="Descripción General"><textarea rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></Field>
      </div>

      <div className="card mb-4">
        <div className="card-title">Presupuesto</div>
        <div className="grid-2 mb-3">
          <Field label="N° Presupuesto"><input value={form.presupuesto.numero} onChange={e => setForm({ ...form, presupuesto: { ...form.presupuesto, numero: e.target.value } })} /></Field>
          <Field label="Validez"><input value={form.presupuesto.validez} onChange={e => setForm({ ...form, presupuesto: { ...form.presupuesto, validez: e.target.value } })} /></Field>
        </div>
        <Field label="Condiciones del Presupuesto">
          <textarea rows={2} value={form.presupuesto.condiciones} onChange={e => setForm({ ...form, presupuesto: { ...form.presupuesto, condiciones: e.target.value } })} />
        </Field>
        <ItemsEditor items={items} setItems={setItems} />
      </div>

      <div className="flex gap-3">
        <button className="btn btn-primary" onClick={save}>💾 Guardar Trabajo</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DETALLE TRABAJO
// ─────────────────────────────────────────────
function DetalleTrabajo({ t, clientes, maestros, onBack, onUpdate, config, tab, setTab }) {
  const cliente = clientes.find(c => c.id === t.clienteId);
  const maestro = maestros.find(m => m.id === t.maestroId);
  const calc = calcTrabajo(t);
  const [items, setItems] = useState(t.presupuesto?.items || []);
  const [editing, setEditing] = useState(false);
  const [pagoForm, setPagoForm] = useState({ monto: "", fecha: today(), metodo: "Transferencia", referencia: "", tipo: "cliente" });
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPDF = async () => {
    // Validaciones antes de intentar generar
    if (!t) {
      alert("Error: No hay datos del trabajo disponibles.");
      return;
    }
    if (!cliente) {
      alert("Error: Este trabajo no tiene un cliente asociado.\nAsigna un cliente al trabajo antes de generar el PDF.");
      return;
    }
    if (!t.presupuesto || !t.presupuesto.numero) {
      alert("Error: Falta el presupuesto o número de presupuesto.\nCompleta el presupuesto del trabajo primero.");
      return;
    }

    setPdfLoading(true);
    try {
      await downloadQuotePDF(t, cliente, config);
    } catch (e) {
      // Siempre mostrar el error al usuario, nunca silenciarlo
      const msg = e && e.message ? e.message : "Error desconocido";
      alert("Error generando PDF: " + msg + "\n\nSi el problema persiste, verifica que html2pdf esté instalado con:\nnpm install html2pdf.js");
    } finally {
      setPdfLoading(false);
    }
  };

  const addPago = () => {
    if (!pagoForm.monto) return alert("Ingresa monto");
    const pago = { id: Date.now(), monto: Number(pagoForm.monto), fecha: pagoForm.fecha, metodo: pagoForm.metodo, referencia: pagoForm.referencia };
    const updated = { ...t };
    if (pagoForm.tipo === "cliente") {
      updated.pagosCliente = [...(t.pagosCliente || []), pago];
      const newCalc = calcTrabajo(updated);
      updated.statusPagoCliente = newCalc.saldoPorCobrar <= 0 ? "PAGADO" : newCalc.totalAbonado > 0 ? "ABONADO" : "PENDIENTE";
    } else {
      updated.pagosPerito = [...(t.pagosPerito || []), pago];
      const newTotalPagado = (updated.pagosPerito || []).reduce((s, p) => s + p.monto, 0);
      updated.statusPagoMaestro = newTotalPagado >= (t.costeMaestroNeto || 0) ? "PAGADO" : "PENDIENTE";
    }
    onUpdate(updated);
    setPagoForm({ monto: "", fecha: today(), metodo: "Transferencia", referencia: "", tipo: "cliente" });
  };

  const saveItems = () => {
    onUpdate({ ...t, presupuesto: { ...t.presupuesto, items } });
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Volver</button>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800 }}>Trabajo #{t.id}</h2>
          {statusBadge(t.statusTrabajo)}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? "⏳ Generando..." : "⬇️ Descargar PDF"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4 mb-4">
        <div className="card-sm"><div className="card-title">Total c/IVA</div><div className="kpi-value">{fmt(calc.total)}</div></div>
        <div className="card-sm"><div className="card-title">Cobrado</div><div className="kpi-value" style={{ color: "var(--accent2)" }}>{fmt(calc.totalAbonado)}</div></div>
        <div className="card-sm"><div className="card-title">Saldo Cliente</div><div className="kpi-value" style={{ color: calc.saldoPorCobrar > 0 ? "var(--danger)" : "var(--accent2)" }}>{fmt(calc.saldoPorCobrar)}</div></div>
        <div className="card-sm"><div className="card-title">Utilidad Neta</div><div className="kpi-value" style={{ color: calc.utilidadNeta >= 0 ? "var(--accent2)" : "var(--danger)" }}>{fmt(calc.utilidadNeta)}</div><div className="kpi-sub">Margen: {fmtPct(calc.margen)}</div></div>
      </div>

      <div className="tabs">
        {["info", "presupuesto", "pagos", "costos"].map(t => <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t === "info" ? "Información" : t === "presupuesto" ? "Presupuesto" : t === "pagos" ? "Pagos" : "Costos"}</div>)}
      </div>

      {tab === "info" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Cliente</div>
            <div><strong>{cliente?.nombre}</strong></div>
            <div className="text-muted text-sm">{cliente?.email} • {cliente?.telefono}</div>
            <div className="text-muted text-sm mt-1">{cliente?.direccion}, {cliente?.comuna}</div>
          </div>
          <div className="card">
            <div className="card-title">Maestro/Técnico</div>
            <div><strong>{maestro?.nombre}</strong></div>
            <div className="text-muted text-sm">{maestro?.especialidad} • {maestro?.telefono}</div>
          </div>
          <div className="card">
            <div className="card-title">Detalles del Trabajo</div>
            <div className="text-sm mb-2"><strong>Tipo:</strong> {t.tipoServicio}</div>
            <div className="text-sm mb-2"><strong>Descripción:</strong> {t.descripcion}</div>
            <div className="text-sm mb-2"><strong>Fecha creación:</strong> {t.fechaCreacion}</div>
            <div className="text-sm mb-2"><strong>Fecha ejecución:</strong> {t.fechaEjecucionInicio}</div>
            <div className="text-sm mb-2"><strong>Vencimiento pago:</strong> {t.fechaVencimiento}</div>
            {t.etiquetas?.length > 0 && <div className="mt-2">{t.etiquetas.map(e => <span key={e} className="tag">{e}</span>)}</div>}
          </div>
          <div className="card">
            <div className="card-title">Status</div>
            <div className="flex gap-3 mb-2">
              <div>
                <div className="text-sm text-muted mb-1">Trabajo</div>
                <select value={t.statusTrabajo} onChange={e => onUpdate({ ...t, statusTrabajo: e.target.value })} style={{ width: "auto" }}>
                  {Object.entries(STATUS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Pago Cliente</div>
                {statusBadge(t.statusPagoCliente, STATUS_PAGO)}
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Pago Maestro</div>
                {statusBadge(t.statusPagoMaestro, STATUS_MAESTRO)}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "presupuesto" && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-bold">{t.presupuesto?.numero}</div>
              <div className="text-sm text-muted">Válido: {t.presupuesto?.validez}</div>
            </div>
            <div className="flex gap-2">
              {editing
                ? <><button className="btn btn-primary btn-sm" onClick={saveItems}>Guardar</button><button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancelar</button></>
                : <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>{Icons.edit} Editar ítems</button>
              }
              <button className="btn btn-green btn-sm" onClick={handleDownloadPDF} disabled={pdfLoading}>
                {pdfLoading ? "⏳ Generando..." : "⬇️ Descargar PDF"}
              </button>
            </div>
          </div>
          <ItemsEditor items={editing ? items : (t.presupuesto?.items || [])} setItems={editing ? setItems : () => {}} />
          {!editing && (
            <div className="mt-3">
              <div className="text-sm text-muted"><strong>Condiciones:</strong> {t.presupuesto?.condiciones}</div>
            </div>
          )}
        </div>
      )}

      {tab === "pagos" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Pagos del Cliente</div>
            <table>
              <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Ref.</th></tr></thead>
              <tbody>
                {(t.pagosCliente || []).map(p => <tr key={p.id}><td>{p.fecha}</td><td style={{ color: "var(--accent2)" }}>{fmt(p.monto)}</td><td>{p.metodo}</td><td className="text-muted">{p.referencia}</td></tr>)}
                {(t.pagosCliente || []).length === 0 && <tr><td colSpan={4} className="empty">Sin pagos</td></tr>}
              </tbody>
            </table>
            <div className="divider" />
            <div className="flex justify-between text-sm">
              <span>Saldo pendiente:</span>
              <strong style={{ color: calc.saldoPorCobrar > 0 ? "var(--danger)" : "var(--accent2)" }}>{fmt(calc.saldoPorCobrar)}</strong>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Pagos al Maestro</div>
            <table>
              <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th></tr></thead>
              <tbody>
                {(t.pagosPerito || []).map(p => <tr key={p.id}><td>{p.fecha}</td><td style={{ color: "var(--accent2)" }}>{fmt(p.monto)}</td><td>{p.metodo}</td></tr>)}
                {(t.pagosPerito || []).length === 0 && <tr><td colSpan={3} className="empty">Sin pagos</td></tr>}
              </tbody>
            </table>
            <div className="divider" />
            <div className="flex justify-between text-sm">
              <span>Saldo pendiente maestro:</span>
              <strong style={{ color: calc.saldoPorPagarMaestro > 0 ? "var(--danger)" : "var(--accent2)" }}>{fmt(calc.saldoPorPagarMaestro)}</strong>
            </div>
          </div>
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-title">Registrar Nuevo Pago</div>
            <div className="grid-4">
              <Field label="Tipo">
                <select value={pagoForm.tipo} onChange={e => setPagoForm({ ...pagoForm, tipo: e.target.value })}>
                  <option value="cliente">Pago de Cliente</option>
                  <option value="maestro">Pago a Maestro</option>
                </select>
              </Field>
              <Field label="Monto"><input type="number" value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} placeholder="$0" /></Field>
              <Field label="Fecha"><input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} /></Field>
              <Field label="Método">
                <select value={pagoForm.metodo} onChange={e => setPagoForm({ ...pagoForm, metodo: e.target.value })}>
                  {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Referencia"><input value={pagoForm.referencia} onChange={e => setPagoForm({ ...pagoForm, referencia: e.target.value })} placeholder="N° transferencia, cheque, etc." /></Field>
            <button className="btn btn-primary" onClick={addPago}>{Icons.plus} Registrar Pago</button>
          </div>
        </div>
      )}

      {tab === "costos" && (
        <div className="card">
          <div className="card-title">Resumen Financiero del Trabajo</div>
          <div className="grid-2">
            <div>
              <div className="section-label text-sm text-muted mb-2">INGRESOS (VENTA)</div>
              {[
                ["Subtotal Neto Cliente", calc.subtotalNeto],
                ["IVA 19%", calc.iva],
                ["Total con IVA", calc.total],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm">{k}</span>
                  <span style={{ fontWeight: k === "Total con IVA" ? 700 : 400, color: k === "Total con IVA" ? "var(--accent)" : "var(--text)" }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="section-label text-sm text-muted mb-2">COSTOS INTERNOS</div>
              {[
                ["Costo Maestro", t.costeMaestroNeto || 0],
                ["Costo Materiales", calc.costoMaterialesNeto],
                ["Costo Adicionales", calc.costoAdicionalesNeto],
                ["Costo Total", calc.costoTotal],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm">{k}</span>
                  <span style={{ fontWeight: k === "Costo Total" ? 700 : 400, color: k === "Costo Total" ? "var(--danger)" : "var(--text)" }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="divider" />
          <div className="grid-2">
            <div className="card-sm" style={{ background: "var(--surface2)" }}>
              <div className="card-title">Utilidad Neta</div>
              <div className="kpi-value" style={{ color: calc.utilidadNeta >= 0 ? "var(--accent2)" : "var(--danger)" }}>{fmt(calc.utilidadNeta)}</div>
            </div>
            <div className="card-sm" style={{ background: "var(--surface2)" }}>
              <div className="card-title">Margen</div>
              <div className="kpi-value" style={{ color: calc.margen >= 0.3 ? "var(--accent2)" : "var(--warn)" }}>{fmtPct(calc.margen)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FINANZAS (CxC / CxP summary)
// ─────────────────────────────────────────────
function Finanzas({ trabajos, clientes, maestros, gastosFijos, setGastosFijos, config, setConfig }) {
  const [tab, setTab] = useState("cxc");
  const [gastoForm, setGastoForm] = useState({ nombre: "", monto: "" });

  const pendientesCliente = trabajos.filter(t => t.statusPagoCliente !== "PAGADO");
  const pendientesMaestro = trabajos.filter(t => t.statusPagoMaestro !== "PAGADO");

  return (
    <div>
      <div className="tabs">
        {["cxc", "cxp", "gastos", "metas"].map(t => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "cxc" ? "Cuentas x Cobrar" : t === "cxp" ? "Cuentas x Pagar" : t === "gastos" ? "Gastos Fijos" : "Metas"}
          </div>
        ))}
      </div>

      {tab === "cxc" && (
        <div>
          <div className="card-sm mb-3" style={{ background: "var(--surface2)" }}>
            <strong>Total por Cobrar: </strong>
            <span style={{ color: "var(--accent)", fontSize: 18, fontWeight: 800 }}>{fmt(pendientesCliente.reduce((s, t) => s + calcTrabajo(t).saldoPorCobrar, 0))}</span>
            <span className="text-muted text-sm ml-2">— {pendientesCliente.length} trabajo(s)</span>
          </div>
          <div className="card">
            <table>
              <thead><tr><th>Trabajo</th><th>Cliente</th><th>Tipo</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Status</th><th>Vencimiento</th></tr></thead>
              <tbody>
                {pendientesCliente.map(t => {
                  const c = clientes.find(cl => cl.id === t.clienteId);
                  const calc = calcTrabajo(t);
                  const vencido = t.fechaVencimiento && t.fechaVencimiento < today();
                  return (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td><strong>{c?.nombre}</strong></td>
                      <td>{t.tipoServicio}</td>
                      <td>{fmt(calc.total)}</td>
                      <td style={{ color: "var(--accent2)" }}>{fmt(calc.totalAbonado)}</td>
                      <td style={{ color: "var(--danger)", fontWeight: 700 }}>{fmt(calc.saldoPorCobrar)}</td>
                      <td>{statusBadge(t.statusPagoCliente, STATUS_PAGO)}</td>
                      <td style={{ color: vencido ? "var(--danger)" : "var(--text)" }}>{t.fechaVencimiento} {vencido && "⚠️"}</td>
                    </tr>
                  );
                })}
                {pendientesCliente.length === 0 && <tr><td colSpan={8} className="empty">✅ Sin saldos pendientes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "cxp" && (
        <div>
          <div className="card-sm mb-3" style={{ background: "var(--surface2)" }}>
            <strong>Total por Pagar Maestros: </strong>
            <span style={{ color: "var(--danger)", fontSize: 18, fontWeight: 800 }}>{fmt(pendientesMaestro.reduce((s, t) => s + calcTrabajo(t).saldoPorPagarMaestro, 0))}</span>
            <span className="text-muted text-sm ml-2">— {pendientesMaestro.length} trabajo(s)</span>
          </div>
          <div className="card">
            <table>
              <thead><tr><th>Trabajo</th><th>Maestro</th><th>Tipo</th><th>Costo Total</th><th>Pagado</th><th>Saldo</th><th>Status</th></tr></thead>
              <tbody>
                {pendientesMaestro.map(t => {
                  const m = maestros.find(m => m.id === t.maestroId);
                  const calc = calcTrabajo(t);
                  return (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td><strong>{m?.nombre}</strong></td>
                      <td>{t.tipoServicio}</td>
                      <td>{fmt(t.costeMaestroNeto)}</td>
                      <td style={{ color: "var(--accent2)" }}>{fmt(calc.totalPagadoMaestro)}</td>
                      <td style={{ color: "var(--danger)", fontWeight: 700 }}>{fmt(calc.saldoPorPagarMaestro)}</td>
                      <td>{statusBadge(t.statusPagoMaestro, STATUS_MAESTRO)}</td>
                    </tr>
                  );
                })}
                {pendientesMaestro.length === 0 && <tr><td colSpan={7} className="empty">✅ Sin pagos pendientes a maestros</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "gastos" && (
        <div>
          <div className="card mb-4">
            <div className="card-title">Gastos Fijos Mensuales</div>
            <table>
              <thead><tr><th>Concepto</th><th>Monto Mensual</th><th></th></tr></thead>
              <tbody>
                {gastosFijos.map(g => (
                  <tr key={g.id}>
                    <td>{g.nombre}</td>
                    <td>{fmt(g.monto)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => setGastosFijos(prev => prev.filter(x => x.id !== g.id))}>✕</button></td>
                  </tr>
                ))}
                <tr style={{ background: "var(--surface2)" }}>
                  <td colSpan={1}><strong>Total Gastos Fijos</strong></td>
                  <td><strong>{fmt(gastosFijos.reduce((s, g) => s + g.monto, 0))}</strong></td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-title">Agregar Gasto Fijo</div>
            <div className="flex gap-3">
              <Field label="Concepto"><input value={gastoForm.nombre} onChange={e => setGastoForm({ ...gastoForm, nombre: e.target.value })} placeholder="ej: Arriendo bodega" /></Field>
              <Field label="Monto Mensual"><input type="number" value={gastoForm.monto} onChange={e => setGastoForm({ ...gastoForm, monto: e.target.value })} placeholder="$ 0" /></Field>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 14 }}>
                <button className="btn btn-primary" onClick={() => {
                  if (!gastoForm.nombre || !gastoForm.monto) return;
                  setGastosFijos(prev => [...prev, { id: Date.now(), nombre: gastoForm.nombre, monto: Number(gastoForm.monto) }]);
                  setGastoForm({ nombre: "", monto: "" });
                }}>+ Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "metas" && (
        <div className="card">
          <div className="card-title">Configuración de Metas</div>
          <div className="grid-2">
            <Field label="Objetivo Ventas Netas Mensual (CLP)">
              <input type="number" value={config.objetivoVentasNeto} onChange={e => setConfig({ ...config, objetivoVentasNeto: Number(e.target.value) })} />
            </Field>
            <Field label="Margen Bruto Promedio (para breakeven)">
              <input type="number" step="0.01" min="0" max="1" value={config.margenBrutoConfig} onChange={e => setConfig({ ...config, margenBrutoConfig: Number(e.target.value) })} placeholder="ej: 0.45" />
              <span className="text-muted text-sm">Actual: {fmtPct(config.margenBrutoConfig)}</span>
            </Field>
          </div>
          <div className="card-sm mt-4" style={{ background: "var(--surface2)" }}>
            <div className="text-sm text-muted mb-1">Punto de Equilibrio Estimado:</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--warn)", fontFamily: "var(--font-display)" }}>
              {fmt(gastosFijos.reduce((s, g) => s + g.monto, 0) / (config.margenBrutoConfig || 0.45))}
            </div>
            <div className="text-sm text-muted mt-1">= Gastos fijos ÷ Margen bruto ({fmtPct(config.margenBrutoConfig)})</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CONFIG / SETTINGS
// ─────────────────────────────────────────────
function Configuracion({ config, setConfig }) {
  const [form, setForm] = useState({ ...config });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/config", {
        empresa_nombre: form.empresa.nombre,
        empresa_rut: form.empresa.rut,
        empresa_email: form.empresa.email,
        empresa_telefono: form.empresa.telefono,
        empresa_direccion: form.empresa.direccion,
        margen_bruto: String(form.margenBrutoConfig || 0.65),
        gastos_minimos: String(form.gastosMinimos || 500000),
      });
      setConfig(form);
      alert("✅ Configuración guardada correctamente.");
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (IS_ELECTRON) {
      const r = await window.electronAPI.exportDB();
      if (r?.success) alert("✅ Datos exportados en:\n" + r.path);
      else if (!r?.canceled) alert("Error exportando: " + r?.error);
    } else {
      alert("La exportación de datos solo está disponible en FLA Desktop.");
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card mb-4">
        <div className="card-title">Datos de la Empresa (Encabezado PDF)</div>
        <Field label="Nombre Empresa"><input value={form.empresa?.nombre || ""} onChange={e => setForm({ ...form, empresa: { ...form.empresa, nombre: e.target.value } })} /></Field>
        <Field label="RUT Empresa"><input value={form.empresa?.rut || ""} onChange={e => setForm({ ...form, empresa: { ...form.empresa, rut: e.target.value } })} /></Field>
        <Field label="Teléfono"><input value={form.empresa?.telefono || ""} onChange={e => setForm({ ...form, empresa: { ...form.empresa, telefono: e.target.value } })} /></Field>
        <Field label="Email empresa"><input value={form.empresa?.email || ""} onChange={e => setForm({ ...form, empresa: { ...form.empresa, email: e.target.value } })} /></Field>
        <Field label="Dirección"><input value={form.empresa?.direccion || ""} onChange={e => setForm({ ...form, empresa: { ...form.empresa, direccion: e.target.value } })} /></Field>
        <div className="divider" />
        <div className="card-title">Configuración Financiera</div>
        <div className="text-sm text-muted mb-3">IVA fijo: 19% (Chile). Moneda: CLP.</div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando..." : "💾 Guardar Configuración"}</button>
      </div>

      {IS_ELECTRON && (
        <div className="card">
          <div className="card-title">💾 Datos y respaldo</div>
          <div className="text-sm text-muted mb-3">
            Todos tus datos se guardan localmente en tu computador en una base de datos SQLite.
            Sin internet, sin suscripciones. Los PDFs se guardan en <strong>Documentos / FLA_PDFs/</strong>.
          </div>
          <button className="btn btn-secondary" onClick={exportData}>📤 Exportar todos los datos (JSON)</button>
        </div>
      )}
    </div>
  );
}
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [clientes, setClientes] = useState(SEED_CLIENTES);
  const [maestros, setMaestros] = useState(SEED_MAESTROS);
  const [trabajos, setTrabajos] = useState(SEED_TRABAJOS);
  const [gastosFijos, setGastosFijos] = useState(SEED_GASTOS_FIJOS);
  const [config, setConfig] = useState(SEED_CONFIG);
  const [backendReady, setBackendReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ── Cargar datos desde el backend SQLite al iniciar ──────────────────
  useEffect(() => {
    let retries = 0;
    const maxRetries = 15; // esperar hasta 15 segundos

    async function loadAll() {
      try {
        const [cfgRaw, cls, maes, trabs] = await Promise.all([
          api.get("/api/config"),
          api.get("/api/clientes"),
          api.get("/api/maestros"),
          api.get("/api/trabajos"),
        ]);

        // Convertir config flat (key/value) a formato del frontend
        const cfgMapped = {
          empresa: {
            nombre: cfgRaw.empresa_nombre || SEED_CONFIG.empresa.nombre,
            rut: cfgRaw.empresa_rut || SEED_CONFIG.empresa.rut,
            email: cfgRaw.empresa_email || SEED_CONFIG.empresa.email,
            telefono: cfgRaw.empresa_telefono || SEED_CONFIG.empresa.telefono,
            direccion: cfgRaw.empresa_direccion || SEED_CONFIG.empresa.direccion,
          },
          margenBrutoConfig: parseFloat(cfgRaw.margen_bruto || "0.65"),
          gastosMinimos: parseFloat(cfgRaw.gastos_minimos || "500000"),
        };

        setConfig(cfgMapped);
        setClientes(cls.length > 0 ? cls : SEED_CLIENTES);
        setMaestros(maes.length > 0 ? maes : SEED_MAESTROS);
        // Los trabajos de la DB ya vienen con formato camelCase desde parseTrabajo
        setTrabajos(trabs.length > 0 ? trabs.map(t => ({
          ...t,
          // Asegurar campos compatibles con el frontend
          fechaVencimiento: t.presupuesto?.fecha || null,
        })) : SEED_TRABAJOS);
        setBackendReady(true);
        setLoadError(null);
      } catch (err) {
        retries++;
        if (retries < maxRetries) {
          // Backend aún arrancando, reintentar
          setTimeout(loadAll, 1000);
        } else {
          console.warn("Backend no disponible, usando datos de ejemplo:", err.message);
          setLoadError(err.message);
          setBackendReady(true); // continuar con seed data
        }
      }
    }

    loadAll();
  }, []);

  // ── Funciones de mutación persistentes ──────────────────────────────
  const updateTrabajo = useCallback(async (updated) => {
    try {
      if (updated.id && backendReady) {
        const saved = await api.put("/api/trabajos/" + updated.id, updated);
        setTrabajos(prev => prev.map(t => t.id === saved.id ? { ...saved, fechaVencimiento: saved.presupuesto?.fecha || null } : t));
      } else {
        setTrabajos(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (err) {
      console.error("Error guardando trabajo:", err);
      // Actualizar UI igual (optimistic)
      setTrabajos(prev => prev.map(t => t.id === updated.id ? updated : t));
    }
  }, [backendReady]);

  // ── Help panel listener (desde menú Electron) ────────────────────────
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    if (!IS_ELECTRON) return;
    const unsub = window.electronAPI.onOpenHelpPanel(() => setShowHelp(true));
    return unsub;
  }, []);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dashboard, section: "Principal" },
    { id: "trabajos", label: "Trabajos", icon: Icons.trabajos, section: "Gestión" },
    { id: "clientes", label: "Clientes", icon: Icons.clientes },
    { id: "maestros", label: "Maestros", icon: Icons.maestros },
    { id: "finanzas", label: "Finanzas", icon: Icons.finanzas, section: "Finanzas" },
    { id: "config", label: "Configuración", icon: Icons.config, section: "Sistema" },
  ];

  const PAGE_TITLES = { dashboard: "Dashboard", trabajos: "Trabajos", clientes: "Clientes", maestros: "Maestros", finanzas: "Finanzas", config: "Configuración" };

  // Alerts
  const vencidos = trabajos.filter(t => t.fechaVencimiento && t.fechaVencimiento < today() && t.statusPagoCliente !== "PAGADO").length;
  const pendMaestros = trabajos.filter(t => t.statusPagoMaestro === "PENDIENTE").length;

  // Mostrar spinner mientras el backend arranca
  if (!backendReady) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0f172a", color: "#fff", gap: 20 }}>
          <div style={{ fontSize: 48 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>FLA Desktop</div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>Iniciando base de datos...</div>
          <div style={{ width: 200, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
            <div style={{ width: "60%", height: "100%", background: "#3b82f6", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      {/* Panel de ayuda (abierto desde menú Electron > Ayuda) */}
      {showHelp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
             onClick={() => setShowHelp(false)}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 32, maxWidth: 480, width: "90%", color: "#e2e8f0" }}
               onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>ℹ️ Estado de FLA Desktop</div>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div>✅ Base de datos: <code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>SQLite local</code></div>
              <div>✅ Servidor interno: <code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>puerto {window.__BACKEND_PORT__||3001}</code></div>
              <div>📄 PDFs guardados en: <strong>Documentos/FLA_PDFs/</strong></div>
              <div>💾 Datos en: <strong>AppData/Roaming/FLA Desktop/</strong></div>
              {loadError && <div style={{ color: "#f87171", marginTop: 8 }}>⚠️ {loadError}</div>}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" onClick={async () => {
                const r = await window.electronAPI?.exportDB();
                if (r?.success) alert("Exportación guardada en: " + r.path);
                else if (!r?.canceled) alert("Error: " + r?.error);
                setShowHelp(false);
              }}>💾 Exportar datos</button>
              <button className="btn btn-secondary" onClick={() => setShowHelp(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      <div id="root">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>⚡ Felipe Lo Arregla</h1>
            <span>Gestión & Finanzas</span>
          </div>
          <nav className="sidebar-nav">
            {nav.map((item, i) => (
              <div key={item.id}>
                {item.section && <div className="nav-section">{item.section}</div>}
                <div className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === "finanzas" && vencidos > 0 && <span className="badge badge-red" style={{ marginLeft: "auto", fontSize: 10, padding: "1px 6px" }}>{vencidos}</span>}
                </div>
              </div>
            ))}
          </nav>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>FLA Desktop v1.0{IS_ELECTRON ? " ⚡" : " (web)"}</div>
            {vencidos > 0 && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>⚠️ {vencidos} pago(s) vencido(s)</div>}
            {pendMaestros > 0 && <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 2 }}>🔧 {pendMaestros} maestro(s) sin pagar</div>}
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-title">{PAGE_TITLES[page]}</div>
            <div className="topbar-right">
              {vencidos > 0 && <span className="badge badge-red">⚠️ {vencidos} vencido(s)</span>}
              <span className="badge badge-accent">Admin</span>
            </div>
          </header>
          <main className="content">
            {page === "dashboard" && <Dashboard trabajos={trabajos} gastosFijos={gastosFijos} config={config} />}
            {page === "trabajos" && <Trabajos trabajos={trabajos} setTrabajos={setTrabajos} clientes={clientes} maestros={maestros} config={config} />}
            {page === "clientes" && <Clientes clientes={clientes} setClientes={setClientes} trabajos={trabajos} />}
            {page === "maestros" && <Maestros maestros={maestros} setMaestros={setMaestros} trabajos={trabajos} />}
            {page === "finanzas" && <Finanzas trabajos={trabajos} clientes={clientes} maestros={maestros} gastosFijos={gastosFijos} setGastosFijos={setGastosFijos} config={config} setConfig={setConfig} />}
            {page === "config" && <Configuracion config={config} setConfig={setConfig} />}
          </main>
        </div>
      </div>
    </>
  );
}
