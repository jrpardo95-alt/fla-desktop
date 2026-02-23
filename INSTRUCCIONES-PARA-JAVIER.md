# 📱 FLA Desktop — Instrucciones para Javier

> Guía paso a paso para instalar y usar FLA Desktop en Windows.
> Sin terminal. Sin internet. Sin tecnicismos.

---

## 🖥️ Parte 1: Instalar la aplicación

### Paso 1 — Descargar el instalador
1. El developer te enviará un archivo llamado **`FLA Desktop Setup 1.0.0.exe`**
2. Guárdalo en tu escritorio o carpeta de Descargas

### Paso 2 — Instalar
1. Haz **doble clic** en `FLA Desktop Setup 1.0.0.exe`
2. Si Windows muestra una advertencia azul ("Windows protegió su equipo"), haz clic en **"Más información"** → **"Ejecutar de todas formas"**
   > ℹ️ Esta advertencia es normal en apps nuevas. La aplicación es segura.
3. Sigue el instalador:
   - Haz clic en **"Siguiente"**
   - Elige carpeta de instalación (o deja la que sugiere)
   - Haz clic en **"Instalar"**
   - Haz clic en **"Finalizar"**

### Paso 3 — Abrir la app
- Busca el ícono **⚡ FLA Desktop** en el escritorio
- Haz **doble clic**
- La app abre en 5-10 segundos (la primera vez puede tardar un poco más)

---

## 📋 Parte 2: Usar la aplicación

### Crear un cliente
1. Haz clic en **"Clientes"** en el menú izquierdo
2. Haz clic en **"+ Nuevo Cliente"**
3. Completa nombre, teléfono, dirección
4. Haz clic en **"Guardar"**

### Crear un trabajo
1. Haz clic en **"Trabajos"** en el menú izquierdo
2. Haz clic en **"+ Nuevo Trabajo"**
3. Selecciona el cliente, tipo de servicio y descripción
4. Haz clic en **"Crear"**

### Hacer un presupuesto
1. Abre un trabajo (clic en su nombre en la lista)
2. Ve a la pestaña **"Presupuesto"**
3. Agrega servicios y materiales con el botón **"+ Agregar ítem"**
4. La app calcula automáticamente neto, IVA 19% y total
5. Completa el número de presupuesto (ej: PRE-001)

---

## 📄 Parte 3: Descargar el PDF del presupuesto

### Paso 1 — Abrir el trabajo
1. Ve a **"Trabajos"** en el menú izquierdo
2. Haz clic en el trabajo que quieres

### Paso 2 — Generar el PDF
1. En la esquina superior derecha, haz clic en **"⬇️ Descargar PDF"**
2. El botón cambia a **"⏳ Generando..."** por unos segundos (normal, está creando el PDF)

### Paso 3 — Guardar el PDF
1. Aparece una ventana de Windows para **elegir dónde guardar el archivo**
2. Navega a la carpeta donde quieres guardarlo (por ejemplo, el escritorio)
3. El nombre del archivo ya viene puesto: `Presupuesto_PRE-001.pdf`
4. Haz clic en **"Guardar PDF"**

> 📌 **El PDF también se guarda automáticamente** en:
> `Mis Documentos / FLA_PDFs / Presupuesto_PRE-001.pdf`
> aunque cierres el diálogo de guardado.

### Abrir la carpeta de PDFs directamente
- En la app: menú **Ayuda** (arriba) → **"Abrir carpeta de PDFs"**
- Abre el Explorador de Windows directo a la carpeta

---

## 💾 Parte 4: Tus datos

### ¿Dónde se guardan?
Todos tus datos viven **en tu computador**, sin internet:
- **Base de datos:** `C:\Users\[TuNombre]\AppData\Roaming\FLA Desktop\fla.db`
- **PDFs:** `C:\Users\[TuNombre]\Documents\FLA_PDFs\`

### Hacer un respaldo
1. En la app, ve a **Configuración** (ícono ⚙️ en el menú)
2. Haz clic en **"📤 Exportar todos los datos (JSON)"**
3. Elige dónde guardar el archivo de respaldo
4. Guárdalo en un pendrive o Google Drive como copia de seguridad

### Abrir la carpeta de datos
- Menú **Ayuda** → **"Abrir carpeta de datos"**

---

## ⚙️ Parte 5: Configurar los datos de tu empresa

Los datos de tu empresa aparecen en el encabezado de cada PDF.

1. Ve a **Configuración** (ícono ⚙️ en el menú)
2. Edita: Nombre, RUT, teléfono, email, dirección
3. Haz clic en **"💾 Guardar Configuración"**
4. El próximo PDF que generes usará los datos nuevos

---

## 🆘 Solución de problemas

| Problema | Solución |
|---|---|
| La app no abre | Espera 30 segundos. Si sigue, reinicia el computador e intenta de nuevo. |
| El botón PDF no hace nada | Verifica que el trabajo tenga: (1) cliente asignado y (2) número de presupuesto. |
| Aparece "Error generando PDF" | Cierra y vuelve a abrir la app, luego intenta de nuevo. |
| El PDF abre en blanco | Espera 3 segundos después de que aparezca el diálogo de guardado antes de hacer clic en Guardar. |
| No encuentro el PDF | Ve a Ayuda → "Abrir carpeta de PDFs". Siempre queda una copia automática ahí. |
| Los datos desaparecieron | No, siguen ahí. Ve a Ayuda → "Abrir carpeta de datos" para verificar. |
| La app muestra pantalla azul cargando | Espera 15 segundos, el servidor interno está iniciando por primera vez. |

---

## 📞 Soporte técnico

Si algo no funciona, antes de contactar al developer:
1. Ve a **Ayuda** → **"Ver logs"**
2. Copia ese archivo
3. Envíalo al developer con una descripción del problema

---

*FLA Desktop v1.0 — Toda la gestión de tu negocio en tu computador. Sin internet, sin suscripciones.*
