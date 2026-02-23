#!/usr/bin/env node
/**
 * scripts/generate-icons.js
 * Genera los íconos necesarios para el instalador.
 * En producción real: usar un .ico/.icns profesional.
 * Este script crea un ícono mínimo funcional como placeholder.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../build-resources");
fs.mkdirSync(dir, { recursive: true });

// SVG del ícono FLA
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" rx="40" fill="#1a2540"/>
  <text x="128" y="180" text-anchor="middle" font-size="160" font-family="Arial">⚡</text>
</svg>`;

fs.writeFileSync(path.join(dir, "icon.svg"), svg);
console.log("✅ icon.svg generado en build-resources/");
console.log("⚠️  Para producción: convertir icon.svg → icon.ico (Windows) y icon.icns (Mac)");
console.log("   Herramientas: https://cloudconvert.com/svg-to-ico");
console.log("   O: npm install -g electron-icon-maker && electron-icon-maker --input=icon.png --output=./build-resources");
