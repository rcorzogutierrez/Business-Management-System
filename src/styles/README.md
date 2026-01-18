# Estructura de Estilos Globales

Este directorio contiene estilos reutilizables organizados por responsabilidad única. Todos los archivos se importan automáticamente en `angular.json`.

## 📁 Estructura de Archivos

### **Base & Utilidades**
- **`scrollbars.css`** - Scrollbars personalizados para toda la aplicación

### **Material Design Overrides**
- **`material-checkbox.css`** - Personalización de checkboxes de Angular Material
  - Tamaño estándar (16px)
  - Tamaño compacto (14px)
  - Sin usar `::ng-deep` (deprecated en Angular 20)

### **Componentes de Tabla**
- **`table-compact-mode.css`** - Modo compacto para tablas
  - Reduce altura de filas
  - Reduce padding de celdas
  - Reduce tamaño de badges y botones
  - Se activa con la clase `.compact-mode`

### **Componentes de Diálogos**
- **`delete-dialog-base.css`** - Estilos base para diálogos de eliminación
  - Header con icono de advertencia
  - Sección de confirmación con input
  - Animaciones y estados

- **`field-config-dialog-base.css`** - Estilos para diálogos de configuración
  - Header con gradiente púrpura
  - Secciones de formulario
  - Grid responsivo
  - Selector de iconos

- **`dialog-inputs.css`** - Estilos compartidos para inputs en diálogos
  - Estados: valid, invalid, focus
  - Inputs con iconos
  - Textos de ayuda

## 🎯 Principios de Organización

### 1. **Responsabilidad Única**
Cada archivo tiene una única responsabilidad clara y bien definida.

### 2. **Reutilización**
Los estilos son compartidos por múltiples componentes del proyecto.

### 3. **Sin ::ng-deep**
Todos los estilos evitan usar `::ng-deep` (deprecated en Angular 20).

### 4. **Documentación**
Cada archivo incluye comentarios explicativos sobre su propósito.

### 5. **Orden de Carga**
Los archivos se cargan en este orden en `angular.json`:
```json
"styles": [
  "@angular/material/prebuilt-themes/indigo-pink.css",
  "src/styles.css",                      // Base de Tailwind + variables
  "src/styles/scrollbars.css",           // Scrollbars globales
  "src/styles/material-checkbox.css",    // Overrides de Material
  "src/styles/table-compact-mode.css",   // Tablas compactas
  "src/styles/delete-dialog-base.css",   // Diálogos de eliminación
  "src/styles/field-config-dialog-base.css", // Diálogos de config
  "src/styles/dialog-inputs.css"         // Inputs compartidos
]
```

## ➕ Agregar Nuevos Estilos

Cuando agregues nuevos estilos globales:

1. **Crear archivo específico** en `/src/styles/`
   ```css
   /**
    * Nombre descriptivo
    * Explicación del propósito
    */

   /* Estilos aquí */
   ```

2. **Registrar en angular.json**
   ```json
   "styles": [
     // ... estilos existentes
     "src/styles/nuevo-archivo.css"
   ]
   ```

3. **Actualizar este README** con la descripción del nuevo archivo

4. **Principios a seguir:**
   - ✅ Responsabilidad única y clara
   - ✅ Nombres descriptivos y semánticos
   - ✅ Comentarios explicativos
   - ✅ Evitar `::ng-deep`
   - ✅ Usar Tailwind cuando sea posible
   - ❌ No mezclar responsabilidades
   - ❌ No duplicar estilos existentes

## 🔄 Migración desde styles.css

Si encuentras estilos en `styles.css` que deberían ser globales:

1. Identifica la responsabilidad del estilo
2. Busca si existe un archivo apropiado
3. Si no existe, crea uno nuevo
4. Mueve los estilos al archivo apropiado
5. Elimina del `styles.css`
6. Actualiza `angular.json` si es nuevo archivo

## 📝 Ejemplo de Buenas Prácticas

### ✅ CORRECTO
```css
/* material-button.css */
/**
 * Material Button Overrides
 * Personalización global de botones de Angular Material
 */

.mat-mdc-button {
  border-radius: 12px !important;
  font-weight: 600 !important;
}
```

### ❌ INCORRECTO
```css
/* estilos-varios.css */
/* Múltiples responsabilidades mezcladas */

.mat-mdc-button { /* Botones */ }
.data-table { /* Tablas */ }
.dialog-header { /* Diálogos */ }
```

## 🚀 Beneficios

- **Mantenibilidad:** Fácil localizar y modificar estilos
- **Escalabilidad:** Agregar nuevos estilos sin afectar existentes
- **Rendimiento:** Carga optimizada y caching por archivo
- **Colaboración:** Estructura clara para todo el equipo
- **Reutilización:** Estilos compartidos entre componentes
