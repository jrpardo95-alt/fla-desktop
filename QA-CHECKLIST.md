# ✅ QA Checklist — FLA Desktop v1.0

## Entorno de prueba
- [ ] Windows 10 (build 1903+)
- [ ] Windows 11
- [ ] Cuenta de usuario sin permisos de administrador

---

## 🔧 Instalación

| # | Test | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 1 | Doble clic en Setup.exe | Abre asistente de instalación | |
| 2 | Instalar en carpeta por defecto | Instalación completa sin error | |
| 3 | Instalar en carpeta personalizada | Instalación completa sin error | |
| 4 | Shortcut creado en escritorio | Ícono ⚡ FLA Desktop visible | |
| 5 | Shortcut en menú inicio | Aparece en "Todos los programas" | |
| 6 | Abrir desde escritorio | App abre en < 15 segundos | |
| 7 | Segunda apertura (ya instalado) | App abre en < 5 segundos | |
| 8 | Abrir dos instancias | Solo se abre una (segunda instance se ignora o foco) | |

---

## 🗄️ Persistencia de datos

| # | Test | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 9 | Crear cliente nuevo | Aparece en lista inmediatamente | |
| 10 | Cerrar app y reabrir | Cliente creado sigue presente | |
| 11 | Crear trabajo nuevo | Aparece en lista | |
| 12 | Guardar cambios en trabajo | Cambios persisten al reabrir | |
| 13 | Crear presupuesto con 3 ítems | Ítems y totales calculados correctamente | |
| 14 | Reiniciar Windows y abrir app | Todos los datos presentes | |
| 15 | Eliminar cliente | Desaparece de la lista | |

---

## 📄 PDF

| # | Test | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 16 | Trabajo sin cliente → clic Descargar PDF | Alert: "Trabajo sin cliente asociado" | |
| 17 | Trabajo sin presupuesto → clic Descargar PDF | Alert: "Falta presupuesto o número" | |
| 18 | Trabajo válido → clic Descargar PDF | Botón muestra "⏳ Generando..." | |
| 19 | PDF generado | Diálogo de guardado del OS aparece | |
| 20 | Guardar PDF | Archivo .pdf creado en ubicación elegida | |
| 21 | PDF auto-guardado | Archivo en Documentos/FLA_PDFs/ creado también | |
| 22 | Abrir PDF generado | Se abre correctamente en Adobe/Edge | |
| 23 | Contenido del PDF | Muestra: logo empresa, datos cliente, ítems, totales con IVA | |
| 24 | PDF con nombre correcto | "Presupuesto_PRE-001.pdf" (no genérico) | |
| 25 | Menú Ayuda → Abrir carpeta PDFs | Abre Explorador en carpeta correcta | |

---

## 📧 Gmail OAuth y envío

| # | Test | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 26 | Sin credenciales → clic Conectar Gmail | Mensaje de error claro | |
| 27 | Ingresar Client ID y Secret → Guardar | Configuración guardada sin error | |
| 28 | Clic "Conectar Gmail" | Se abre el navegador del sistema (Chrome/Edge) | |
| 29 | Autorizar en Google | Página de confirmación verde en el navegador | |
| 30 | Volver a app → Verificar | Muestra ✅ Gmail conectado | |
| 31 | Cerrar y reabrir app | Gmail sigue conectado (token persistente) | |
| 32 | Enviar presupuesto a cliente con email | Botón: Generando → Enviando → ✅ Enviado | |
| 33 | Email recibido | Email llega con PDF adjunto correcto | |
| 34 | Asunto del email | "Presupuesto [Empresa] - PRE-001" | |
| 35 | Cuerpo del email | Saludo personalizado con nombre cliente y total | |
| 36 | PDF adjunto | Se puede abrir el adjunto del email | |
| 37 | Log de email | Aparece en base de datos (verificar exportando JSON) | |
| 38 | Cliente sin email → Enviar | Alert: "El cliente no tiene email registrado" | |
| 39 | Desconectar Gmail | Estado cambia a ⚠️ No conectado | |
| 40 | Token vencido → reautorizar | Proceso funciona igual que la primera vez | |

---

## 🔄 Ciclo de vida y estabilidad

| # | Test | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 41 | Usar app durante 30 minutos continuo | Sin crashes ni freezes | |
| 42 | Cerrar con X | App cierra limpiamente | |
| 43 | Cerrar con Archivo → Salir | App cierra limpiamente | |
| 44 | Alt+F4 | App cierra limpiamente | |
| 45 | Abrir app con internet desconectado | App funciona (solo Gmail requiere internet) | |
| 46 | Zoom in/out (Ctrl+/-) | Interfaz se escala correctamente | |
| 47 | Pantalla completa (F11) | App funciona en pantalla completa | |
| 48 | Exportar datos | Archivo JSON generado con todos los datos | |
| 49 | Menú Ayuda → Estado | Panel muestra puerto, paths correctos | |
| 50 | Desinstalar | App se desinstala limpiamente, datos en AppData se mantienen | |

---

## 🔒 Seguridad

| # | Test | Resultado esperado | ✅/❌ |
|---|---|---|---|
| 51 | Backend solo en localhost | No accesible desde otra PC en la red | |
| 52 | URL externas | Se abren en navegador, no en Electron | |
| 53 | Credenciales Google en DB | Guardadas en SQLite local, no en texto plano visible | |

---

## 📊 Resumen QA

- Tests totales: 53
- Bloqueantes (PDF + Gmail + Data): tests 9-40
- Nice to have: tests 41-53

**Criterio para release:**
- ✅ Tests 1-40 todos pasados
- ✅ Tests 41-44 todos pasados
- ✅ Sin crashes en sesión de 30 minutos
