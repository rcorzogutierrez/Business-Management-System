#!/usr/bin/env node

/**
 * Script de Auditoría de Estilos Duplicados
 * Detecta clases CSS duplicadas entre estilos globales y componentes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Clases globales que NO deben duplicarse
const GLOBAL_CLASSES = [
  // De styles.css
  'icon-btn',
  'btn-icon',
  'header-icon-box',
  'badge',
  'badge-status-active',
  'badge-status-inactive',
  'badge-role-admin',
  'badge-role-user',
  'card-corporate',
  'card-modern',
  'empty-state',
  'animate-fadeIn',
  'animate-fadeInUp',
  'animate-fadeInDown',
  'animate-fadeInScale',

  // De form-base.css
  'back-btn',
  'form-back-btn',
  'form-header',
  'form-content',
  'form-fields',
  'form-group',
  'form-label',
  'form-input',
  'form-textarea',
  'form-select',
  'form-actions',
  'btn-cancel',
  'btn-save',
  'btn-edit',
  'validation-banner',
  'validation-icon',
  'checkbox-card',
  'checkbox-input',
  'checkbox-content',
  'checkbox-header',
  'dictionary-grid',
  'dictionary-item',
  'field-wrapper',

  // De config-base.css
  'stat-chip-base',
  'stat-chip-green',
  'stat-chip-purple',
  'config-drag-preview',
  'config-field-card',
  'config-field-actions',
];

console.log(`${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   🔍 Auditoría de Estilos Duplicados              ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

let totalDuplicates = 0;
const duplicatesByClass = {};

// Buscar cada clase en componentes
GLOBAL_CLASSES.forEach(className => {
  const pattern = `\\.${className}\\s*\\{`;

  try {
    // Usar grep para buscar en archivos de componentes
    const result = execSync(
      `grep -r "${pattern}" src/app --include="*.css" || true`,
      { encoding: 'utf8' }
    );

    if (result.trim()) {
      const files = result.trim().split('\n').map(line => {
        const match = line.match(/^([^:]+):/);
        return match ? match[1] : null;
      }).filter(Boolean);

      if (files.length > 0) {
        totalDuplicates += files.length;
        duplicatesByClass[className] = files;
      }
    }
  } catch (error) {
    // Ignorar errores (grep devuelve 1 si no encuentra nada)
  }
});

// Mostrar resultados
if (totalDuplicates === 0) {
  console.log(`${colors.green}✅ ¡Excelente! No se encontraron duplicados.${colors.reset}\n`);
  console.log(`${colors.green}Todas las clases globales se están reutilizando correctamente.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}❌ Se encontraron ${totalDuplicates} duplicados en ${Object.keys(duplicatesByClass).length} clases diferentes.${colors.reset}\n`);

  console.log(`${colors.yellow}Detalles de duplicación:${colors.reset}\n`);

  Object.entries(duplicatesByClass).forEach(([className, files]) => {
    console.log(`${colors.red}  • .${className}${colors.reset} ${colors.yellow}(${files.length} archivos)${colors.reset}`);
    files.forEach(file => {
      console.log(`    ${colors.magenta}→${colors.reset} ${file.replace('src/app/', '')}`);
    });
    console.log('');
  });

  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  console.log(`${colors.yellow}📝 Acciones recomendadas:${colors.reset}\n`);
  console.log(`  1. Eliminar las definiciones duplicadas de los componentes`);
  console.log(`  2. Usar directamente las clases globales en el HTML`);
  console.log(`  3. Verificar que los estilos globales cubren las necesidades\n`);

  console.log(`${colors.cyan}📚 Documentación:${colors.reset} src/styles/README.md\n`);

  process.exit(1);
}
