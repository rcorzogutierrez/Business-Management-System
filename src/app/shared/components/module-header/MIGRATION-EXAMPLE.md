# 🔄 Ejemplo de Migración Real

## Caso: Gestión de Clientes

### ❌ ANTES (Código actual duplicado)

#### `clients-list.component.html` (líneas ~1-60)
```html
<!-- Header manual con ~50 líneas de código -->
<header class="bg-white rounded-2xl p-6 mb-6 border border-slate-200 shadow-soft">
  <div class="flex items-center justify-between flex-wrap gap-4">

    <!-- Sección izquierda -->
    <div class="flex items-center gap-4">
      <!-- Icono -->
      <div class="header-icon-box purple">
        <mat-icon>groups</mat-icon>
      </div>

      <!-- Título -->
      <div>
        <h1 class="text-xl font-bold text-slate-900">
          Gestión de Clientes
        </h1>
        <p class="text-sm text-slate-500">
          {{ totalClients() }} registros en el sistema
        </p>
      </div>
    </div>

    <!-- Sección derecha -->
    <div class="flex items-center gap-3">

      <!-- Chip: Activos -->
      <div class="stat-chip-base stat-chip-success">
        <span class="stat-value">{{ activeClients() }}</span>
        <span class="stat-label">ACTIVOS</span>
      </div>

      <!-- Chip: Potenciales -->
      <div class="stat-chip-base stat-chip-warning">
        <span class="stat-value">{{ potentialClients() }}</span>
        <span class="stat-label">POTENCIALES</span>
      </div>

      <!-- Chip: Inactivos -->
      <div class="stat-chip-base stat-chip-info">
        <span class="stat-value">{{ inactiveClients() }}</span>
        <span class="stat-label">INACTIVOS</span>
      </div>

      <!-- Botón: Refresh -->
      <button class="icon-btn" matTooltip="Recargar" (click)="loadClients()">
        <mat-icon>refresh</mat-icon>
      </button>

      <!-- Botón: Columnas -->
      <button class="icon-btn" matTooltip="Columnas" (click)="toggleColumns()">
        <mat-icon>view_column</mat-icon>
      </button>

      <!-- Botón: Exportar -->
      <button class="icon-btn" matTooltip="Exportar" (click)="exportData()">
        <mat-icon>download</mat-icon>
      </button>

      <!-- Botón: Configuración -->
      <button class="icon-btn" matTooltip="Configuración" (click)="goToConfig()">
        <mat-icon>settings</mat-icon>
      </button>

      <!-- Botón principal -->
      <button
        mat-raised-button
        class="!rounded-xl !font-semibold !bg-gradient-to-br !from-purple-600 !to-purple-700 !text-white !shadow-lg hover:!shadow-xl !px-6 !py-2.5"
        (click)="onNewClient()">
        <mat-icon class="!w-5 !h-5">add</mat-icon>
        Nuevo Cliente
      </button>
    </div>
  </div>
</header>
```

#### `clients-list.component.css`
```css
/* Estilos específicos para el header (ya duplicados en styles.css) */
.stat-chip-base {
  display: flex;
  flex-direction: column;
  /* ... 20+ líneas más */
}

.stat-chip-success { /* ... */ }
.stat-chip-warning { /* ... */ }
/* ... más duplicación */
```

**Problemas:**
- ❌ ~60 líneas de HTML duplicado
- ❌ ~30 líneas de CSS duplicado
- ❌ Código repetido en workers, materials, dashboard
- ❌ Difícil de mantener (cambio en 4+ lugares)
- ❌ Inconsistencias visuales entre módulos

---

### ✅ DESPUÉS (Con ModuleHeaderComponent)

#### `clients-list.component.html` (líneas ~1-10)
```html
<!-- Header reutilizable con ~10 líneas de código -->
<app-module-header
  icon="groups"
  title="Gestión de Clientes"
  [subtitle]="totalClients() + ' registros en el sistema'"
  moduleColor="purple"
  [stats]="headerStats()"
  [actionButtons]="headerActions"
  primaryButtonLabel="Nuevo Cliente"
  (primaryAction)="onNewClient()"
/>
```

#### `clients-list.component.ts`
```typescript
import { ModuleHeaderComponent, StatChip, ActionButton } from '@shared/components/module-header';

@Component({
  // ...
  imports: [ModuleHeaderComponent, ...]
})
export class ClientsListComponent {

  // Computed stats (reactividad automática con signals)
  headerStats = computed<StatChip[]>(() => [
    { value: this.activeClients(), label: 'ACTIVOS', color: 'success' },
    { value: this.potentialClients(), label: 'POTENCIALES', color: 'warning' },
    { value: this.inactiveClients(), label: 'INACTIVOS', color: 'info' }
  ]);

  // Botones de acción (configuración única)
  headerActions: ActionButton[] = [
    { icon: 'refresh', tooltip: 'Recargar', action: () => this.loadClients() },
    { icon: 'view_column', tooltip: 'Columnas', action: () => this.toggleColumns() },
    { icon: 'download', tooltip: 'Exportar', action: () => this.exportData() },
    { icon: 'settings', tooltip: 'Configuración', action: () => this.goToConfig() }
  ];

  onNewClient() {
    this.router.navigate(['/clients/new']);
  }
}
```

#### `clients-list.component.css`
```css
/* ¡No se necesita CSS! Todo está en estilos globales */
```

**Beneficios:**
- ✅ ~60 líneas → ~10 líneas de HTML (-83%)
- ✅ CSS eliminado completamente
- ✅ Type safety con TypeScript
- ✅ Reactividad automática con signals
- ✅ Un solo lugar para cambios
- ✅ Consistencia garantizada

---

## 📊 Comparación de Código

| Aspecto | ANTES | DESPUÉS | Mejora |
|---------|-------|---------|--------|
| Líneas HTML | ~60 | ~10 | -83% |
| Líneas CSS | ~30 | 0 | -100% |
| Archivos afectados para cambios | 4+ | 1 | Centralizado |
| Type Safety | ❌ | ✅ | +100% |
| Reactividad automática | ❌ | ✅ | +100% |
| Consistencia visual | ⚠️ Variable | ✅ Garantizada | +100% |

---

## 🎯 Resultado Final

### Antes
```
clients-list/
├── clients-list.component.html (150 líneas)
├── clients-list.component.css (80 líneas)
└── clients-list.component.ts (200 líneas)

workers-list/
├── workers-list.component.html (150 líneas)  ← DUPLICADO
├── workers-list.component.css (80 líneas)    ← DUPLICADO
└── workers-list.component.ts (200 líneas)

materials-list/
├── materials-list.component.html (150 líneas) ← DUPLICADO
├── materials-list.component.css (80 líneas)   ← DUPLICADO
└── materials-list.component.ts (200 líneas)

Total: ~1,260 líneas con código duplicado
```

### Después
```
shared/components/module-header/
├── module-header.component.ts (200 líneas) ← COMPARTIDO
└── MODULE-HEADER-USAGE.md

clients-list/
├── clients-list.component.html (100 líneas) ← -50 líneas
├── clients-list.component.css (0 líneas)    ← -80 líneas
└── clients-list.component.ts (220 líneas)   ← +20 líneas (config)

workers-list/
├── workers-list.component.html (100 líneas) ← -50 líneas
├── workers-list.component.css (0 líneas)    ← -80 líneas
└── workers-list.component.ts (220 líneas)

materials-list/
├── materials-list.component.html (100 líneas) ← -50 líneas
├── materials-list.component.css (0 líneas)    ← -80 líneas
└── materials-list.component.ts (220 líneas)

Total: ~960 líneas sin duplicación (-24%)
```

---

## 🚀 Pasos de Migración

### 1. Preparación
```bash
# Verificar que el componente existe
ls src/app/shared/components/module-header/
```

### 2. Actualizar imports en `clients-list.component.ts`
```typescript
import { ModuleHeaderComponent, StatChip, ActionButton } from '@shared/components/module-header';

@Component({
  imports: [
    CommonModule,
    ModuleHeaderComponent,  // ← AGREGAR
    // ... otros imports
  ]
})
```

### 3. Agregar configuración de header
```typescript
export class ClientsListComponent {
  headerStats = computed<StatChip[]>(() => [
    { value: this.activeClients(), label: 'ACTIVOS', color: 'success' },
    { value: this.potentialClients(), label: 'POTENCIALES', color: 'warning' },
    { value: this.inactiveClients(), label: 'INACTIVOS', color: 'info' }
  ]);

  headerActions: ActionButton[] = [
    { icon: 'refresh', tooltip: 'Recargar', action: () => this.loadClients() },
    { icon: 'view_column', tooltip: 'Columnas', action: () => this.toggleColumns() },
    { icon: 'download', tooltip: 'Exportar', action: () => this.exportData() },
    { icon: 'settings', tooltip: 'Configuración', action: () => this.goToConfig() }
  ];

  onNewClient() {
    this.router.navigate(['/clients/new']);
  }
}
```

### 4. Reemplazar HTML del header
```html
<!-- ANTES: Eliminar todo el bloque <header>...</header> -->

<!-- DESPUÉS: Agregar esto -->
<app-module-header
  icon="groups"
  title="Gestión de Clientes"
  [subtitle]="totalClients() + ' registros en el sistema'"
  moduleColor="purple"
  [stats]="headerStats()"
  [actionButtons]="headerActions"
  primaryButtonLabel="Nuevo Cliente"
  (primaryAction)="onNewClient()"
/>
```

### 5. Eliminar CSS duplicado
```css
/* clients-list.component.css */

/* ELIMINAR todas estas secciones: */
/* .stat-chip-base, .stat-chip-success, etc. */
/* Ya están disponibles globalmente */
```

### 6. Probar
```bash
ng serve
# Verificar que el header se vea y funcione correctamente
```

---

## ✅ Checklist de Migración

- [ ] Componente ModuleHeaderComponent creado
- [ ] Import agregado en el componente
- [ ] `headerStats` configurado
- [ ] `headerActions` configurado
- [ ] HTML del header reemplazado
- [ ] CSS duplicado eliminado
- [ ] Probado en desarrollo
- [ ] Funcionalidad verificada

---

## 💡 Tips

1. **Usa computed() para stats dinámicas:** Se actualizan automáticamente
2. **Reutiliza ActionButton[]:** Mismas acciones en todos los módulos
3. **Mantén consistencia de colores:** purple=clientes, green=materiales, amber=trabajadores
4. **Documenta custom stats:** Si usas colores personalizados

---

## 🎉 Resultado

Un código más limpio, mantenible y consistente siguiendo el principio **DRY**!

**De ~60 líneas duplicadas → 10 líneas reutilizables** ✨
