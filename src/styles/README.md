# Estructura de Estilos Globales

Este directorio contiene estilos reutilizables organizados por responsabilidad única. Todos los archivos se importan automáticamente en `angular.json`.

## 📁 Estructura de Archivos

### **Base & Utilidades**
- **`scrollbars.css`** - Scrollbars personalizados para toda la aplicación
- **`form-base.css`** ⭐ **NUEVO** - Estilos base globales para formularios (importado en styles.css)
- **`config-base.css`** ⭐ **NUEVO** - Estilos base para componentes de configuración (importado en styles.css)

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

## 🎯 Clases Globales Disponibles (NO DUPLICAR)

### ⚠️ IMPORTANTE: Anti-Duplicación
Las siguientes clases están disponibles **globalmente** en todo el sistema. **NO las dupliques** en archivos CSS de componentes individuales.

### 📦 De `styles.css` (Sistema Global)

#### Iconos y Botones
```css
.icon-btn, .btn-icon          /* Botones de icono cuadrados */
.header-icon-box              /* Contenedor de icono con gradiente */
.header-icon-box.purple       /* Variantes de color disponibles */
.header-icon-box.green
.header-icon-box.amber
/* ... más colores disponibles */
```

#### Badges
```css
.badge
.badge-status-active
.badge-status-inactive
.badge-role-admin
.badge-role-user
```

#### Cards
```css
.card-corporate
.card-modern
.empty-state
```

#### Animaciones
```css
.animate-fadeIn
.animate-fadeInUp
.animate-fadeInDown
.animate-fadeInScale
```

### 📝 De `form-base.css` (Formularios)

```css
.back-btn                     /* Botón atrás */
.form-header                  /* Header de formulario */
.form-content                 /* Contenido del formulario */
.form-fields                  /* Área de campos */
.form-group                   /* Grupo de campo */
.form-label                   /* Etiqueta de campo */
.form-input                   /* Input base */
.form-textarea                /* Textarea */
.form-select                  /* Select */
.form-actions                 /* Área de botones */
.btn-cancel                   /* Botón cancelar */
.btn-save                     /* Botón guardar */
.btn-edit                     /* Botón editar */
.validation-banner            /* Banner de validación */
.checkbox-card                /* Card con checkbox */
.dictionary-grid              /* Grid de diccionario */
.field-wrapper                /* Wrapper con animación staggered */
```

### ⚙️ De `config-base.css` (Configuración)

```css
.stat-chip-base
.stat-chip-green
.stat-chip-purple
.config-drag-preview
.config-field-card
.config-field-actions
```

### 🚫 Ejemplo de Duplicación (NO HACER)

```css
/* ❌ INCORRECTO - En client-form.component.css */
.header-icon-box {
  width: 40px;
  height: 40px;
  /* Esta clase YA EXISTE globalmente */
}

.back-btn {
  /* Esta clase YA EXISTE en form-base.css */
}
```

### ✅ Uso Correcto

```html
<!-- ✅ CORRECTO - Usar directamente -->
<div class="header-icon-box green">
  <mat-icon>inventory</mat-icon>
</div>

<button class="back-btn">
  <mat-icon>arrow_back</mat-icon>
</button>
```

### 🔍 Verificar Antes de Crear Estilos

Antes de agregar estilos a un componente, verifica:

1. ✅ ¿Existe en `styles.css`?
2. ✅ ¿Existe en `form-base.css`?
3. ✅ ¿Existe en `config-base.css`?
4. ✅ ¿Puedo usar Tailwind CSS?
5. ✅ ¿Es realmente específico del componente?

### 🛠️ Herramientas de Auditoría

```bash
# Buscar duplicados de header-icon-box
grep -r "\.header-icon-box\s*{" src/app --include="*.css"

# Buscar duplicados de icon-btn
grep -r "\.icon-btn\s*{" src/app --include="*.css"

# Buscar duplicados de back-btn
grep -r "\.back-btn\s*{" src/app --include="*.css"
```

---

## 🚀 Beneficios

- **Mantenibilidad:** Fácil localizar y modificar estilos
- **Escalabilidad:** Agregar nuevos estilos sin afectar existentes
- **Rendimiento:** Carga optimizada y caching por archivo
- **Colaboración:** Estructura clara para todo el equipo
- **Reutilización:** Estilos compartidos entre componentes
- **DRY:** Sin código duplicado en el sistema
