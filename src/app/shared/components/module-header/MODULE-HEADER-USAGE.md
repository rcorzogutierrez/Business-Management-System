# 📋 Guía de Uso: ModuleHeaderComponent

Componente reutilizable para headers de módulos que sigue el principio **DRY**.

---

## 🎯 Propósito

Estandarizar y reutilizar el header de módulos principales eliminando código duplicado en:
- `clients-list`
- `workers-list`
- `materials-list`
- `dashboard`
- Cualquier otro módulo que necesite un header similar

---

## 📦 Importación

```typescript
import { ModuleHeaderComponent, StatChip, ActionButton } from '@shared/components/module-header/module-header.component';

@Component({
  // ...
  imports: [ModuleHeaderComponent, ...]
})
```

---

## 🔧 Ejemplo 1: Gestión de Clientes (Púrpura)

### TypeScript
```typescript
export class ClientsListComponent {
  // Stats para el header
  headerStats: StatChip[] = [
    { value: 16, label: 'ACTIVOS', color: 'success' },
    { value: 0, label: 'POTENCIALES', color: 'warning' },
    { value: 0, label: 'INACTIVOS', color: 'info' }
  ];

  // Botones de acción del header
  headerActions: ActionButton[] = [
    { icon: 'refresh', tooltip: 'Recargar', action: () => this.loadClients() },
    { icon: 'view_column', tooltip: 'Columnas', action: () => this.openColumnsDialog() },
    { icon: 'download', tooltip: 'Exportar', action: () => this.exportData() },
    { icon: 'settings', tooltip: 'Configuración', action: () => this.openConfig() }
  ];

  onNewClient() {
    this.router.navigate(['/clients/new']);
  }
}
```

### HTML
```html
<app-module-header
  icon="groups"
  title="Gestión de Clientes"
  subtitle="16 registros en el sistema"
  moduleColor="purple"
  [stats]="headerStats"
  [actionButtons]="headerActions"
  primaryButtonLabel="Nuevo Cliente"
  (primaryAction)="onNewClient()"
/>
```

---

## 🔧 Ejemplo 2: Gestión de Materiales (Verde)

### TypeScript
```typescript
export class MaterialsListComponent {
  headerStats: StatChip[] = [
    { value: 91, label: 'TOTAL', color: 'info' },
    { value: 91, label: 'ACTIVOS', color: 'success' }
  ];

  headerActions: ActionButton[] = [
    { icon: 'refresh', tooltip: 'Recargar', action: () => this.loadMaterials() },
    { icon: 'view_column', tooltip: 'Columnas', action: () => this.toggleColumns() },
    { icon: 'settings', tooltip: 'Configuración', action: () => this.goToConfig() }
  ];

  onNewMaterial() {
    this.router.navigate(['/materials/new']);
  }
}
```

### HTML
```html
<app-module-header
  icon="inventory"
  title="Gestión de Materiales"
  subtitle="Control y seguimiento de inventario"
  moduleColor="green"
  [stats]="headerStats"
  [actionButtons]="headerActions"
  primaryButtonLabel="Nuevo Material"
  (primaryAction)="onNewMaterial()"
/>
```

---

## 🔧 Ejemplo 3: Gestión de Trabajadores (Ámbar)

### TypeScript
```typescript
export class WorkersListComponent {
  headerStats: StatChip[] = [
    { value: 2, label: 'TOTAL', color: 'info' },
    { value: 2, label: 'ACTIVOS', color: 'success' },
    { value: 1, label: 'PROPIOS', color: 'primary' },
    { value: 1, label: 'SUBCONTRAT.', color: 'purple' }
  ];

  headerActions: ActionButton[] = [
    { icon: 'refresh', tooltip: 'Recargar', action: () => this.loadWorkers() },
    { icon: 'view_column', tooltip: 'Columnas', action: () => this.toggleColumns() },
    { icon: 'download', tooltip: 'Exportar', action: () => this.exportWorkers() },
    { icon: 'settings', tooltip: 'Configuración', action: () => this.openConfig() }
  ];

  onNewWorker() {
    this.router.navigate(['/workers/new']);
  }

  onManageCompanies() {
    this.openCompaniesDialog();
  }
}
```

### HTML
```html
<app-module-header
  icon="engineering"
  title="Gestión de Trabajadores"
  subtitle="Control y administración de personal"
  moduleColor="amber"
  [stats]="headerStats"
  [actionButtons]="headerActions"
  primaryButtonLabel="Nuevo Trabajador"
  secondaryButtonLabel="Empresas"
  secondaryButtonIcon="business"
  (primaryAction)="onNewWorker()"
  (secondaryAction)="onManageCompanies()"
/>
```

---

## 🔧 Ejemplo 4: Dashboard (Azul)

### TypeScript
```typescript
export class DashboardComponent {
  headerStats: StatChip[] = [
    { value: 4, label: 'PERMISOS', color: 'primary' },
    { value: 1, label: 'MÓDULOS', color: 'success' }
  ];

  headerActions: ActionButton[] = [
    { icon: 'notifications', tooltip: 'Notificaciones', action: () => this.showNotifications() }
  ];
}
```

### HTML
```html
<app-module-header
  icon="dashboard"
  title="¡Bienvenido de nuevo!"
  subtitle="Última sesión: Hace 9 minutos"
  moduleColor="blue"
  [stats]="headerStats"
  [actionButtons]="headerActions"
/>
```

---

## 📊 Inputs Disponibles

| Input | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `icon` | `string` | ✅ | Icono de Material Icons |
| `title` | `string` | ✅ | Título principal del módulo |
| `subtitle` | `string` | ✅ | Subtítulo descriptivo |
| `moduleColor` | `'purple' \| 'green' \| 'amber' \| 'blue' \| 'teal' \| 'indigo'` | ❌ (default: `'blue'`) | Color del módulo |
| `stats` | `StatChip[]` | ❌ | Chips de estadísticas |
| `actionButtons` | `ActionButton[]` | ❌ | Botones de acción |
| `primaryButtonLabel` | `string` | ❌ | Texto del botón principal |
| `secondaryButtonLabel` | `string` | ❌ | Texto del botón secundario |
| `secondaryButtonIcon` | `string` | ❌ | Icono del botón secundario |

---

## 📤 Outputs Disponibles

| Output | Tipo | Descripción |
|--------|------|-------------|
| `primaryAction` | `void` | Evento cuando se hace clic en el botón principal |
| `secondaryAction` | `void` | Evento cuando se hace clic en el botón secundario |

---

## 🎨 Colores de Módulo

| Color | Uso Recomendado |
|-------|-----------------|
| `purple` | Clientes |
| `green` | Materiales, Inventario |
| `amber` | Trabajadores, Personal |
| `blue` | Dashboard, General |
| `teal` | Finanzas, Tesorería |
| `indigo` | Proyectos, Planificación |

---

## 🎨 Colores de Stats

| Color | Uso Recomendado |
|-------|-----------------|
| `primary` | Datos generales (azul) |
| `success` | Activos, completados (verde) |
| `warning` | Pendientes, en proceso (amarillo) |
| `info` | Información neutral (cyan) |
| `purple` | Categoría especial |
| `green` | Exitoso, activo |
| `amber` | Atención, revisar |

---

## ✅ Beneficios

1. **DRY (Don't Repeat Yourself):** Un solo componente para todos los headers
2. **Consistencia:** Diseño uniforme en toda la aplicación
3. **Mantenibilidad:** Cambios en un solo lugar
4. **Type Safety:** Interfaces TypeScript para prevenir errores
5. **Responsive:** Se adapta automáticamente a móviles
6. **Flexible:** Soporta múltiples configuraciones

---

## 🚫 No Duplicar

### ❌ ANTES (Código duplicado en cada módulo)
```html
<!-- En clients-list.component.html -->
<header class="bg-white rounded-2xl p-6 mb-6...">
  <div class="header-icon-box purple">...</div>
  <h1>Gestión de Clientes</h1>
  <!-- ... 50+ líneas de código duplicado -->
</header>

<!-- En workers-list.component.html -->
<header class="bg-white rounded-2xl p-6 mb-6...">
  <div class="header-icon-box amber">...</div>
  <h1>Gestión de Trabajadores</h1>
  <!-- ... 50+ líneas de código duplicado -->
</header>
```

### ✅ DESPUÉS (Componente reutilizable)
```html
<!-- En clients-list.component.html -->
<app-module-header
  icon="groups"
  title="Gestión de Clientes"
  moduleColor="purple"
  [stats]="stats"
  [actionButtons]="actions"
  primaryButtonLabel="Nuevo Cliente"
  (primaryAction)="onNewClient()"
/>

<!-- En workers-list.component.html -->
<app-module-header
  icon="engineering"
  title="Gestión de Trabajadores"
  moduleColor="amber"
  [stats]="stats"
  [actionButtons]="actions"
  primaryButtonLabel="Nuevo Trabajador"
  (primaryAction)="onNewWorker()"
/>
```

**Reducción:** ~50 líneas → ~10 líneas por módulo 🎉

---

## 📝 Checklist de Migración

Para migrar un header existente:

- [ ] Importar `ModuleHeaderComponent`
- [ ] Crear array `headerStats: StatChip[]`
- [ ] Crear array `headerActions: ActionButton[]`
- [ ] Reemplazar HTML del header con `<app-module-header>`
- [ ] Configurar inputs (icon, title, subtitle, color)
- [ ] Conectar output `primaryAction`
- [ ] Conectar output `secondaryAction` (si aplica)
- [ ] Eliminar código HTML/CSS del header antiguo
- [ ] Probar funcionamiento

---

## 🔗 Archivos Relacionados

- Componente: `src/app/shared/components/module-header/module-header.component.ts`
- Estilos globales: `src/styles.css` (`.header-icon-box`, `.icon-btn`)
- Documentación: Este archivo

---

## 💡 Tip Pro

Puedes crear un método helper en tu componente para generar stats dinámicamente:

```typescript
get headerStats(): StatChip[] {
  return [
    { value: this.totalClients(), label: 'TOTAL', color: 'info' },
    { value: this.activeClients(), label: 'ACTIVOS', color: 'success' },
    { value: this.inactiveClients(), label: 'INACTIVOS', color: 'warning' }
  ];
}
```

De esta forma, los stats se actualizan automáticamente cuando cambian los signals! ✨

---

## 🎨 Uso Avanzado: Slots de Contenido

### Slot `extra-stats` - Stats Personalizados

Para módulos que necesitan badges o stats con diseño especial (como Tesorería), usa el slot `extra-stats`:

```html
<app-module-header
  icon="account_balance_wallet"
  title="Tesorería"
  subtitle="Control financiero"
  moduleColor="teal"
  [stats]="headerStats"
  [actionButtons]="headerActions"
  primaryButtonLabel="Registrar Cobro"
  (primaryAction)="onNewCobro()">

  <!-- Stats especiales con diseño personalizado -->
  <div slot="extra-stats" class="hidden md:flex items-center gap-2">

    <!-- Balance Badge (condicional verde/rojo) -->
    <div class="flex flex-col items-center rounded-lg px-4 py-2 min-w-[85px] border"
         [ngClass]="{
           'bg-emerald-50 border-emerald-200': balance() >= 0,
           'bg-red-50 border-red-200': balance() < 0
         }">
      <span class="text-base font-bold"
            [ngClass]="{
              'text-emerald-600': balance() >= 0,
              'text-red-600': balance() < 0
            }">{{ balance() | currency }}</span>
      <span class="text-[10px] uppercase">Balance</span>
    </div>

    <!-- Badge "Este Mes" con diseño único -->
    <div class="flex items-center gap-3 rounded-lg px-4 py-2 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
      <div class="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
        <mat-icon class="text-white">calendar_month</mat-icon>
      </div>
      <div>
        <span class="text-[10px] uppercase font-bold text-amber-700">Este Mes</span>
        <div class="flex gap-2">
          <span class="text-sm font-bold text-emerald-600">+{{ cobrosEsteMes() | currency }}</span>
          <span>/</span>
          <span class="text-sm font-bold text-red-600">-{{ pagosEsteMes() | currency }}</span>
        </div>
      </div>
    </div>

  </div>
</app-module-header>
```

### Slot `actions` - Componentes Especializados

Para column selector, export menu, u otros componentes complejos:

```html
<app-module-header
  icon="groups"
  title="Gestión de Clientes"
  moduleColor="purple"
  [stats]="stats"
  [actionButtons]="actions"
  primaryButtonLabel="Nuevo Cliente"
  (primaryAction)="onNew()">

  <!-- Componentes especializados -->
  <div slot="actions" class="flex items-center gap-2">

    <!-- Column Selector Component -->
    <app-column-visibility-control
      [columns]="columnOptions()"
      [storageKey]="'clients-visible-columns'"
      [themeColor]="'purple'"
      (visibilityChange)="onColumnChange($event)">
    </app-column-visibility-control>

    <!-- Export Menu -->
    <button class="icon-btn" [matMenuTriggerFor]="exportMenu">
      <mat-icon>download</mat-icon>
    </button>
    <mat-menu #exportMenu="matMenu">
      <button mat-menu-item (click)="exportToCSV()">
        <mat-icon>table_chart</mat-icon>
        <span>Exportar a CSV</span>
      </button>
      <button mat-menu-item (click)="exportToJSON()">
        <mat-icon>code</mat-icon>
        <span>Exportar a JSON</span>
      </button>
    </mat-menu>

  </div>
</app-module-header>
```

### 📊 Orden de Renderizado

Los slots se renderizan en este orden dentro del header:

1. **Stats básicos** (chips estándar via `[stats]`)
2. **Slot `extra-stats`** (badges personalizados)
3. **Action buttons** (botones via `[actionButtons]`)
4. **Slot `actions`** (componentes especializados)
5. **Botón secundario** (via `secondaryButtonLabel`)
6. **Botón primario CTA** (via `primaryButtonLabel`)

---

## 🎯 Casos de Uso Reales

### ✅ Caso 1: Módulo Simple (Clientes, Materiales, Trabajadores)
- Usar solo inputs básicos
- Stats con chips estándar
- Action buttons simples

### ✅ Caso 2: Módulo con Componentes Especiales (Proposals, Workers)
- Inputs básicos + slot `actions`
- Column selector y export menu proyectados

### ✅ Caso 3: Módulo con Stats Personalizados (Tesorería)
- Inputs básicos + slot `extra-stats`
- Balance y "Este Mes" con diseño único
- Botón secundario para segunda acción principal
