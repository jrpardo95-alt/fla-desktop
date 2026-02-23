/**
 * FLA Desktop — server/db.js
 * SQLite con better-sqlite3 (síncrono, embebido, sin servidor externo)
 */
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

let db = null;

function getDbPath() {
  try {
    const { app } = require("electron");
    return path.join(app.getPath("userData"), "fla.db");
  } catch {
    const devPath = path.join(__dirname, "../dev-data");
    if (!fs.existsSync(devPath)) fs.mkdirSync(devPath, { recursive: true });
    return path.join(devPath, "fla.db");
  }
}

function safeParse(str, fallback) {
  try { return JSON.parse(str || "null") ?? fallback; } catch { return fallback; }
}

function parseTrabajo(row) {
  if (!row) return null;
  return {
    ...row,
    presupuesto: safeParse(row.presupuesto, {}),
    pagosCliente: safeParse(row.pagos_cliente, []),
    pagosPerito: safeParse(row.pagos_perito, []),
    materiales: safeParse(row.materiales, []),
    clienteId: row.cliente_id,
    maestroId: row.maestro_id,
    tipoServicio: row.tipo_servicio,
    statusTrabajo: row.status_trabajo,
    statusPagoCliente: row.status_pago_cliente,
    statusPagoMaestro: row.status_pago_maestro,
    costeMaestroNeto: row.coste_maestro_neto,
  };
}

function initDB() {
  if (db) return db;
  const dbPath = getDbPath();
  log.info("DB:", dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL, rut TEXT, email TEXT, telefono TEXT,
      direccion TEXT, comuna TEXT, notas TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS maestros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL, rut TEXT, telefono TEXT, email TEXT,
      tipo TEXT, tarifa REAL DEFAULT 0, activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS trabajos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      maestro_id INTEGER REFERENCES maestros(id) ON DELETE SET NULL,
      tipo_servicio TEXT, descripcion TEXT,
      status_trabajo TEXT DEFAULT 'EN_PROCESO',
      status_pago_cliente TEXT DEFAULT 'PENDIENTE',
      status_pago_maestro TEXT DEFAULT 'PENDIENTE',
      coste_maestro_neto REAL DEFAULT 0,
      presupuesto TEXT DEFAULT '{}',
      pagos_cliente TEXT DEFAULT '[]',
      pagos_perito TEXT DEFAULT '[]',
      materiales TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    -- (email_log y gmail_tokens eliminados — sin integración Gmail)
  `);

  // Config defaults
  const n = db.prepare("SELECT count(*) as n FROM config").get().n;
  if (n === 0) {
    const ins = db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)");
    const tx = db.transaction((e) => { for (const [k,v] of e) ins.run(k, v); });
    tx(Object.entries({
      empresa_nombre: "Felipe Lo Arregla",
      empresa_rut: "12.345.678-9",
      empresa_email: "felipeloaregla@gmail.com",
      empresa_telefono: "+56 9 1234 5678",
      empresa_direccion: "Santiago, Chile",
      iva_pct: "19", moneda: "CLP",
    }));
  }

  // Seed demo
  const nc = db.prepare("SELECT count(*) as n FROM clientes").get().n;
  if (nc === 0) {
    db.exec(`
      INSERT INTO clientes (nombre,rut,email,telefono,direccion,comuna) VALUES
        ('María González','12.345.678-9','maria@gmail.com','+56 9 8765 4321','Los Aromos 234','Providencia'),
        ('Carlos Pérez','9.876.543-2','cperez@gmail.com','+56 9 7654 3210','Av. Italia 1010','Ñuñoa');
      INSERT INTO maestros (nombre,rut,telefono,tipo,tarifa) VALUES
        ('Roberto Silva','14.567.890-3','+56 9 5432 1098','Electricista',45000);
    `);
    db.prepare(`INSERT INTO trabajos (cliente_id,maestro_id,tipo_servicio,descripcion,presupuesto) VALUES (1,1,'Eléctrico','Instalación tablero depto 5B',?)`)
      .run(JSON.stringify({
        numero: "PRE-001",
        fecha: new Date().toISOString().slice(0,10),
        validez: "30 días",
        condiciones: "50% al inicio, 50% al finalizar",
        items: [
          {id:1,tipo:"servicio",descripcion:"Instalación eléctrica",cantidad:1,precioUnitarioNeto:80000},
          {id:2,tipo:"material",descripcion:"Cable 2.5mm x 10m",cantidad:2,precioVentaUnitarioNeto:15000,costoCompraUnitario:10000}
        ]
      }));
  }

  log.info("DB lista");
  return db;
}

const CONFIG = {
  getAll: () => Object.fromEntries(db.prepare("SELECT key,value FROM config").all().map(r=>[r.key,r.value])),
  setMany: (obj) => {
    const s = db.prepare("INSERT OR REPLACE INTO config (key,value) VALUES (?,?)");
    db.transaction((e) => { for (const [k,v] of e) s.run(k, String(v)); })(Object.entries(obj));
  },
};

const CLIENTES = {
  getAll: () => db.prepare("SELECT * FROM clientes ORDER BY nombre").all(),
  getById: (id) => db.prepare("SELECT * FROM clientes WHERE id=?").get(id),
  create: (d) => {
    const r = db.prepare("INSERT INTO clientes (nombre,rut,email,telefono,direccion,comuna,notas) VALUES (@nombre,@rut,@email,@telefono,@direccion,@comuna,@notas)").run(d);
    return CLIENTES.getById(r.lastInsertRowid);
  },
  update: (id, d) => {
    db.prepare("UPDATE clientes SET nombre=@nombre,rut=@rut,email=@email,telefono=@telefono,direccion=@direccion,comuna=@comuna,notas=@notas,updated_at=datetime('now') WHERE id=@id").run({...d,id});
    return CLIENTES.getById(id);
  },
  delete: (id) => db.prepare("DELETE FROM clientes WHERE id=?").run(id),
};

const MAESTROS = {
  getAll: () => db.prepare("SELECT * FROM maestros ORDER BY nombre").all(),
  getById: (id) => db.prepare("SELECT * FROM maestros WHERE id=?").get(id),
  create: (d) => {
    const r = db.prepare("INSERT INTO maestros (nombre,rut,telefono,email,tipo,tarifa,activo) VALUES (@nombre,@rut,@telefono,@email,@tipo,@tarifa,@activo)").run(d);
    return MAESTROS.getById(r.lastInsertRowid);
  },
  update: (id, d) => {
    db.prepare("UPDATE maestros SET nombre=@nombre,rut=@rut,telefono=@telefono,email=@email,tipo=@tipo,tarifa=@tarifa,activo=@activo,updated_at=datetime('now') WHERE id=@id").run({...d,id});
    return MAESTROS.getById(id);
  },
  delete: (id) => db.prepare("DELETE FROM maestros WHERE id=?").run(id),
};

const TRABAJOS = {
  getAll: () => db.prepare("SELECT * FROM trabajos ORDER BY created_at DESC").all().map(parseTrabajo),
  getById: (id) => parseTrabajo(db.prepare("SELECT * FROM trabajos WHERE id=?").get(id)),
  create: (d) => {
    const r = db.prepare(`INSERT INTO trabajos (cliente_id,maestro_id,tipo_servicio,descripcion,status_trabajo,status_pago_cliente,status_pago_maestro,coste_maestro_neto,presupuesto,pagos_cliente,pagos_perito,materiales)
      VALUES (@clienteId,@maestroId,@tipoServicio,@descripcion,@statusTrabajo,@statusPagoCliente,@statusPagoMaestro,@costeMaestroNeto,@presupuesto,@pagosCliente,@pagosPerito,@materiales)`).run({
      clienteId:d.clienteId??null, maestroId:d.maestroId??null,
      tipoServicio:d.tipoServicio??"", descripcion:d.descripcion??"",
      statusTrabajo:d.statusTrabajo??"EN_PROCESO",
      statusPagoCliente:d.statusPagoCliente??"PENDIENTE",
      statusPagoMaestro:d.statusPagoMaestro??"PENDIENTE",
      costeMaestroNeto:d.costeMaestroNeto??0,
      presupuesto:JSON.stringify(d.presupuesto??{}),
      pagosCliente:JSON.stringify(d.pagosCliente??[]),
      pagosPerito:JSON.stringify(d.pagosPerito??[]),
      materiales:JSON.stringify(d.materiales??[]),
    });
    return TRABAJOS.getById(r.lastInsertRowid);
  },
  update: (id, d) => {
    db.prepare(`UPDATE trabajos SET cliente_id=@clienteId,maestro_id=@maestroId,tipo_servicio=@tipoServicio,descripcion=@descripcion,status_trabajo=@statusTrabajo,status_pago_cliente=@statusPagoCliente,status_pago_maestro=@statusPagoMaestro,coste_maestro_neto=@costeMaestroNeto,presupuesto=@presupuesto,pagos_cliente=@pagosCliente,pagos_perito=@pagosPerito,materiales=@materiales,updated_at=datetime('now') WHERE id=@id`).run({
      id,
      clienteId:d.clienteId??null, maestroId:d.maestroId??null,
      tipoServicio:d.tipoServicio??"", descripcion:d.descripcion??"",
      statusTrabajo:d.statusTrabajo??"EN_PROCESO",
      statusPagoCliente:d.statusPagoCliente??"PENDIENTE",
      statusPagoMaestro:d.statusPagoMaestro??"PENDIENTE",
      costeMaestroNeto:d.costeMaestroNeto??0,
      presupuesto:JSON.stringify(d.presupuesto??{}),
      pagosCliente:JSON.stringify(d.pagosCliente??[]),
      pagosPerito:JSON.stringify(d.pagosPerito??[]),
      materiales:JSON.stringify(d.materiales??[]),
    });
    return TRABAJOS.getById(id);
  },
  delete: (id) => db.prepare("DELETE FROM trabajos WHERE id=?").run(id),
};



function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    config: CONFIG.getAll(),
    clientes: CLIENTES.getAll(),
    maestros: MAESTROS.getAll(),
    trabajos: TRABAJOS.getAll(),

  };
}

module.exports = { initDB, CONFIG, CLIENTES, MAESTROS, TRABAJOS, exportAll };
