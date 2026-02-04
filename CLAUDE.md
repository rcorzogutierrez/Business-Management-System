# Guía de Desarrollo - Business Management System

## 🎯 Reglas Fundamentales (SIEMPRE cumplir)

### ⚠️ CRÍTICO: Recursos Compartidos

**ANTES de implementar cualquier funcionalidad, PREGÚNTATE:**

1. **¿Esta funcionalidad ya existe en un componente base?**
   - Header de módulo → `ModuleHeaderComponent` (shared)
   - Paginación → `GenericListBaseComponent`
   - Filtros → `GenericListBaseComponent`
   - Búsqueda → `GenericListBaseComponent`
   - Columnas visibles → `GenericListBaseComponent`
   - Exportación → `GenericListBaseComponent`
   - Configuración de grid → `GenericGridConfigBaseComponent`
   - Formularios dinámicos → `GenericConfigBaseComponent`

2. **¿Se usa en 2+ módulos?** → Mover a componente base INMEDIATAMENTE

3. **¿Estoy duplicando código?** → DETENER y refactorizar primero

**Ejemplo Real del Proyecto:**
```
❌ INCORRECTO: Implementar itemsPerPage en cada módulo
✅ CORRECTO: itemsPerPage en GenericListBaseComponent (herencia)

❌ INCORRECTO: Tres servicios con el mismo método loadConfig()
✅ CORRECTO: Un ModuleConfigBaseService<T> (herencia)
```

**Jerarquía de Componentes Base:**
```
Para LISTAS:
  GenericListBaseComponent<T>
  ├── visibleColumnIds, columnOptions
  ├── filterableFields, customFieldFilters
  ├── searchTerm, currentSort
  ├── currentPage, itemsPerPage ← COMPARTIDO
  ├── pageSizeOptions ← COMPARTIDO
  └── selectedIds

Para CONFIGURACIÓN:
  GenericGridConfigBaseComponent
  ├── config(), gridConfig()
  ├── isLoading, cdr
  ├── pageSizeOptions ← COMPARTIDO
  ├── itemsPerPageSignal ← COMPARTIDO
  └── updateGridConfig()
      └── GenericConfigBaseComponent
          ├── Hereda todo de arriba
          └── Agrega: customFields, formConfig
```

**Regla de Oro:**
> "Si copias y pegas código entre workers/clients/materials → ESTÁS HACIENDO MAL.
> Mueve el código al componente base y usa herencia."

### 1. **Estilos y CSS**
- ✅ **SIEMPRE usar Tailwind CSS** por encima de Angular Material
- ✅ **Reutilizar al máximo los estilos globales** de `src/styles.css`
- ❌ **NUNCA usar `::ng-deep`** - Solo CSS puro o Tailwind
- ❌ **Evitar Material Design components** cuando sea posible (excepto MatIcon)
- ✅ Los estilos custom deben ser mínimos y específicos
- ✅ Verificar `styles.css` antes de crear nuevas clases duplicadas

**Clases globales disponibles:**
- `.header-icon-box` (con variantes: `.purple`, `.green`, `.blue`, `.amber`)
- `.stat-chip`
- `.icon-btn`
- `.loading-spinner`
- Gradientes: `.bg-gradient-purple`, `.bg-gradient-green`, `.bg-gradient-blue`, `.bg-gradient-amber`

### 2. **Arquitectura del Proyecto**

#### Componentes Compartidos Clave

**ModuleHeaderComponent** (header reutilizable para TODOS los módulos):
```
ModuleHeaderComponent → Usado por todos los módulos de lista y configuración
```

#### Componentes Base Genéricos
El proyecto usa **herencia de componentes base** para compartir funcionalidad:

```
GenericListBaseComponent<T>
├── ClientsListComponent
├── WorkersListComponent
└── MaterialsListComponent

GenericGridConfigBaseComponent
├── GenericConfigBaseComponent (hereda + formularios)
│   ├── ClientConfigComponent
│   └── MaterialConfigComponent
├── WorkersConfigComponent (solo grid, sin formularios)
└── ProposalConfigComponent (config de propuestas)
```

**Regla importante:**
- Si una funcionalidad se usa en 2+ módulos → mover a componente base
- Ejemplo: `itemsPerPage`, `pageSizeOptions`, filtros, búsqueda, etc.

#### Servicios Base
```
ModuleConfigBaseService<TConfig>
├── ClientConfigServiceRefactored (extiende base)
└── MaterialsConfigService (extiende base)

Servicios con patrón propio (sin herencia):
├── WorkersConfigService (solo grid config, implementación simple)
└── ProposalConfigService (config específica de propuestas)
```

**Nota:** No todos los servicios de configuración heredan de `ModuleConfigBaseService`. Los módulos que solo necesitan configuración de grid (workers) o que tienen configuración muy específica (proposals) pueden usar su propia implementación siempre que expongan `config()` como signal.

### 3. **Angular 20 - Signals y Reactive Programming**

✅ **USAR:**
- `signal()` para estado mutable
- `computed()` para valores derivados (read-only)
- `effect()` para side effects
- Standalone components
- `ChangeDetectionStrategy.OnPush` siempre
- Control flow syntax: `@if`, `@for`, `@switch`

❌ **NO USAR:**
- `BehaviorSubject` / `Observable` (usar signals)
- NgModules (todo standalone)
- `*ngIf`, `*ngFor` (usar nueva sintaxis)

**Ejemplo correcto:**
```typescript
// ✅ Signal mutable
currentPage = signal<number>(0);

// ✅ Computed para valores derivados
itemsPerPage = computed(() => {
  const config = this.configService.config();
  return config?.gridConfig?.itemsPerPage || 10;
});

// ✅ Effect para side effects
effect(() => {
  const page = this.currentPage();
  console.log('Página cambió:', page);
});
```

### 4. **Firebase/Firestore**

✅ **Imports correctos:**
```typescript
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
```

✅ **Usar signals para estado de Firestore:**
```typescript
private _config = signal<ModuleConfig | null>(null);
config = this._config.asReadonly();
```

❌ **NO importar** de `@angular/fire` (usar SDK directo)

### 5. **HTML Select vs Botones**

**Problema conocido:** Los `<select>` HTML nativos no funcionan bien con:
- Signals de Angular 20
- `ChangeDetectionStrategy.OnPush`
- Valores dinámicos de Firestore

**Solución:**
```html
<!-- ✅ CORRECTO: usar ngModel para binding reactivo -->
<select
  [ngModel]="itemsPerPage"
  (ngModelChange)="onChange($event)"
  class="...tailwind classes...">
  @for (option of options; track option) {
    <option [value]="option">{{ option }}</option>
  }
</select>

<!-- ❌ INCORRECTO: [value] no se actualiza con signals -->
<select [value]="itemsPerPage" (change)="onChange($event)">
  ...
</select>
```

**Alternativa:** Usar botones si el select no funciona

### 6. **Commits y Git**

✅ **Commits en español** con formato:
```
tipo: Descripción breve

Detalle de los cambios realizados:
1. Cambio 1
2. Cambio 2
3. Cambio 3

Beneficios/Resultado final.
```

**Tipos:** `feat`, `fix`, `refactor`, `chore`, `style`, `docs`

✅ **Branch naming:** `claude/descripcion-tarea-XXXXX`

### 7. **Código Limpio**

❌ **Eliminar en producción:**
- `console.log()` de debug (solo mantener `console.error()`)
- Código comentado
- Imports no usados
- Variables no usadas

✅ **Buenas prácticas:**
- Nombres descriptivos en español
- Métodos pequeños y enfocados
- DRY (Don't Repeat Yourself)
- Comentarios solo cuando la lógica no es obvia

### 8. **Temas de Color por Módulo**

Cada módulo tiene su color distintivo:
- **Workers:** `amber` (#f59e0b)
- **Clients:** `purple` (#9333ea)
- **Materials:** `green` (#10b981)
- **Projects/Proposals:** `blue` (#3b82f6)
- **Treasury:** `teal` (#14b8a6)
- **Work Planning:** `indigo` (#6366f1)

Usar clases Tailwind correspondientes:
- `bg-amber-600`, `text-amber-600`, `hover:bg-amber-50`
- `bg-purple-600`, `text-purple-600`, `hover:bg-purple-50`
- `bg-green-600`, `text-green-600`, `hover:bg-green-50`
- `bg-blue-600`, `text-blue-600`, `hover:bg-blue-50`
- `bg-teal-600`, `text-teal-600`, `hover:bg-teal-50`
- `bg-indigo-600`, `text-indigo-600`, `hover:bg-indigo-50`

### 9. **ModuleHeaderComponent (Header Compartido)**

**SIEMPRE usar** `ModuleHeaderComponent` para los headers de módulos. NO crear headers custom por módulo.

**Ubicación:** `src/app/shared/components/module-header/`

**Uso básico:**
```html
<app-module-header
  icon="people"
  title="Trabajadores"
  subtitle="Gestión de personal"
  moduleColor="amber"
  [stats]="statsArray"
  [actionButtons]="actionButtons"
  primaryButtonLabel="Nuevo Trabajador"
  (primaryAction)="crearTrabajador()"
/>
```

**Interfaces disponibles:**
```typescript
interface StatChip {
  value: number | string;
  label: string;
  color: 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'green' | 'amber';
}

interface ActionButton {
  icon: string;
  tooltip: string;
  action: () => void;
  color?: string;
}
```

**Colores soportados por moduleColor:**
`'purple'` | `'green'` | `'amber'` | `'blue'` | `'teal'` | `'indigo'`

**Inputs:**
- `icon` (requerido) - Nombre del icono Material
- `title` (requerido) - Título del módulo
- `subtitle` (requerido) - Subtítulo descriptivo
- `moduleColor` - Color temático del módulo
- `stats` - Array de `StatChip` para mostrar estadísticas
- `actionButtons` - Array de `ActionButton` para acciones adicionales
- `primaryButtonLabel` - Texto del botón principal (CTA)
- `secondaryButtonLabel` - Texto del botón secundario
- `showBackButton` - Mostrar botón de regreso

**Outputs:**
- `primaryAction` - Click en botón principal
- `secondaryAction` - Click en botón secundario
- `backAction` - Click en botón de regreso

**Regla:** Si modificas un header de módulo, hazlo en `ModuleHeaderComponent` para que el cambio aplique a todos los módulos.

## 📋 Checklist Antes de Commit

- [ ] ¿Usé Tailwind en lugar de Material?
- [ ] ¿Reutilicé estilos globales de `styles.css`?
- [ ] ¿Evité `::ng-deep`?
- [ ] ¿La funcionalidad es compartida? → ¿La moví a componente base?
- [ ] ¿Usé signals en lugar de Observables?
- [ ] ¿Agregué `ChangeDetectionStrategy.OnPush`?
- [ ] ¿Eliminé todos los `console.log()` de debug?
- [ ] ¿El commit está en español con descripción clara?
- [ ] ¿Usé `ModuleHeaderComponent` para headers de módulo? (NO crear headers custom)
- [ ] ¿Usé el color correcto del módulo? (amber/purple/green/blue/teal/indigo)

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm start

# Build
npm run build

# Linter
npm run lint
```

## 🔄 Recursos Compartidos Disponibles

### Para Componentes de Lista (workers-list, clients-list, materials-list)

**Heredan de:** `GenericListBaseComponent<T>`

**Recursos disponibles (NO reimplementar):**

#### Paginación:
```typescript
currentPage = signal<number>(0);
itemsPerPage = computed(() => config.gridConfig.itemsPerPage || 10);
pageSizeOptions = [10, 25, 50, 100];

goToPage(page: number): void
changePageSize(newSize: number): Promise<void>  // Guarda en Firestore
```

#### Filtros:
```typescript
filterableFields = computed(() => ...)
customFieldFilters = signal<Record<string, any>>({})
openFilterDropdown = signal<string | null>(null)
filterSearchTerms = signal<Record<string, string>>({})
uniqueValuesByField = computed(() => ...)  // Opciones únicas con conteo
filteredOptions = computed(() => ...)
hasActiveFilters = computed(() => ...)     // Boolean: hay filtros activos
activeFiltersCount = computed(() => ...)   // Número de filtros activos

toggleFilterDropdown(fieldName: string, event?: Event): void
closeFilterDropdown(): void
isFilterDropdownOpen(fieldName: string): boolean
onFilterSearchChange(fieldName: string, searchTerm: string): void
selectFilterValue(fieldName: string, value: any, event?: Event): void
getSelectedFilterLabel(fieldName: string): string
clearAllFilters(): void
```

#### Búsqueda:
```typescript
searchTerm = signal<string>('')
onSearch(term: string): void
```

#### Columnas Visibles:
```typescript
visibleColumnIds = signal<string[]>(...)
columnOptions = computed<ColumnOption[]>(...)
visibleGridFields = computed(() => ...)

onColumnVisibilityChange(visibleIds: string[]): void
```

#### Exportación:
```typescript
exportToCSV(filteredData: T[], fileName: string): void
exportToJSON(filteredData: T[], fileName: string): void
```

#### Ordenamiento:
```typescript
currentSort = signal<{ field: string; direction: 'asc' | 'desc' }>()
sortBy(field: string): void
```

#### Selección:
```typescript
selectedIds = signal<Set<string | number>>(new Set())
onSelectionChange(selectedIds: Set): void
clearSelection(): void
```

#### Métodos Abstractos (DEBEN implementarse en cada hijo):
```typescript
abstract totalPages(): number;    // Calcular total de páginas
abstract refreshData(): void;     // Recargar datos del módulo
```

### Para Componentes de Configuración

**Nivel 1:** `GenericGridConfigBaseComponent`
```typescript
// Solo configuración de tabla (workers-config)
config = computed(() => configService.config())
gridConfig = computed(() => config()?.gridConfig)
pageSizeOptions = [10, 25, 50, 100]
itemsPerPageSignal = signal<number>(10)

updateGridConfig(key: string, value: any): Promise<void>
toggleAllFeatures(): void
loadConfig(): Promise<void>
```

**Nivel 2:** `GenericConfigBaseComponent` (hereda Nivel 1 + agrega)
```typescript
// Configuración completa con formularios (client-config, material-config)
customFields = computed(() => ...)
formConfig = computed(() => ...)

updateCustomField(fieldId: string, updates: any): Promise<void>
toggleFieldActive(fieldId: string): Promise<void>
```

### Para Servicios de Configuración

**Heredan de:** `ModuleConfigBaseService<TConfig>`

```typescript
config = signal<TConfig | null>(null)  // ← USAR ESTE
isLoading = signal<boolean>(false)
error = signal<string | null>(null)

async initialize(): Promise<void>
async updateConfig(updates: Partial<TConfig>): Promise<void>  // ← USAR ESTE
```

**Ejemplo de uso correcto:**
```typescript
// ✅ Servicio hijo solo define el tipo y paths
export class ClientConfigServiceRefactored extends ModuleConfigBaseService<ClientConfig> {
  protected override configPath = 'modules/clients/config';

  // Métodos específicos de clientes (si los hay)
  getGridFields(): FieldConfig[] {
    return this.config()?.fields?.filter(f => f.gridConfig?.showInGrid) || [];
  }
}
```

## 📁 Estructura de Archivos Importante

```
src/
├── app/
│   ├── core/
│   │   ├── services/                       # Auth, Config, Language, Inactivity, Logger, Navigation
│   │   ├── guards/                         # Auth, Login, Role, Module
│   │   └── layout/                         # Layout, Header, Sidebar
│   ├── auth/                               # Login component
│   ├── dashboard/                          # Dashboard principal
│   ├── admin/                              # Panel de administración completo
│   ├── shared/
│   │   ├── components/
│   │   │   ├── module-header/              # ⭐ Header compartido para TODOS los módulos
│   │   │   ├── generic-list-base/          # Base para listas (herencia)
│   │   │   ├── generic-grid-config-base/   # Base para config grid
│   │   │   ├── generic-config-base/        # Base para config completa
│   │   │   ├── data-table/                 # Tabla genérica
│   │   │   ├── pagination/                 # Paginación compartida
│   │   │   ├── search-bar/                 # Barra de búsqueda
│   │   │   ├── column-visibility-control/  # Control de columnas visibles
│   │   │   ├── confirm-dialog/             # Diálogo de confirmación
│   │   │   ├── generic-delete-dialog/      # Eliminación individual
│   │   │   ├── generic-delete-multiple-dialog/ # Eliminación múltiple
│   │   │   └── inactivity-warning-dialog/  # Advertencia de inactividad
│   │   ├── modules/
│   │   │   └── dynamic-form-builder/       # Constructor de formularios dinámicos
│   │   │       └── services/
│   │   │           └── module-config-base.service.ts  # ⭐ Base para servicios de config
│   │   ├── services/                       # GenericFirestoreService, UiUtils
│   │   ├── models/                         # GenericEntity, OperationResult, ErrorTypes
│   │   ├── pipes/                          # CurrencyFormatter
│   │   └── utils/                          # Audit, DateTime, ErrorHandler, String, Table, etc.
│   ├── modules/
│   │   ├── workers/                        # Gestión de trabajadores + submódulo empresas
│   │   ├── clients/                        # CRM de clientes
│   │   ├── materials/                      # Gestión de materiales
│   │   ├── projects/                       # Propuestas y estimados
│   │   ├── work-planning/                  # Planificación de trabajo
│   │   └── treasury/                       # Tesorería y finanzas
│   └── app.routes.ts                       # Rutas principales
├── assets/
│   └── i18n/                               # Traducciones (es.json, en.json)
└── styles.css                              # ⭐ SIEMPRE REVISAR PRIMERO
```

## ⚠️ Errores Comunes y Soluciones

### Error: "Esta funcionalidad solo está en workers, debería estar en todos"
**Problema:** Implementaste algo (ej: itemsPerPage) solo en un módulo
**Solución:**
1. DETENER inmediatamente
2. Mover a componente base (`GenericListBaseComponent` o `GenericGridConfigBaseComponent`)
3. Eliminar código duplicado de módulos hijos
4. Verificar que herencia funciona en todos los módulos

**Checklist de recursos compartidos:**
- [ ] ¿Header de módulo? → `ModuleHeaderComponent` (NO crear headers custom)
- [ ] ¿Paginación? → `GenericListBaseComponent.itemsPerPage` (computed)
- [ ] ¿Filtros? → `GenericListBaseComponent.customFieldFilters`
- [ ] ¿Búsqueda? → `GenericListBaseComponent.searchTerm`
- [ ] ¿Columnas? → `GenericListBaseComponent.visibleColumnIds`
- [ ] ¿Config grid? → `GenericGridConfigBaseComponent.updateGridConfig()`

### Error: Select no se actualiza
**Problema:** `<select [value]="signal()">` no reacciona a cambios
**Solución:** Usar `[ngModel]` + `(ngModelChange)` con `FormsModule`

```html
<!-- ✅ CORRECTO -->
<select [ngModel]="itemsPerPage" (ngModelChange)="onChange($event)">

<!-- ❌ INCORRECTO -->
<select [value]="itemsPerPage" (change)="onChange($event)">
```

### Error: Código duplicado entre módulos
**Problema:** Misma lógica en workers, clients, materials
**Solución:** Mover a `GenericListBaseComponent` o `GenericConfigBaseComponent`

**Pasos:**
1. Identificar código duplicado
2. Mover a componente base apropiado
3. Hacer que sea `public` o `protected` (no `private`)
4. Verificar herencia: `extends GenericListBaseComponent<Client>`
5. Eliminar código de hijos

### Error: Estilos no aplicándose
**Problema:** Usar CSS custom que ya existe en `styles.css`
**Solución:** Revisar `styles.css` primero, reutilizar clases existentes

### Error: TypeScript con signals
**Problema:** `Type 'Signal<T>' is not assignable to type 'T'`
**Solución:** Llamar el signal como función: `signal()` no `signal`

## 📏 Ancho Estándar de Contenedores

**IMPORTANTE:** Todos los módulos principales deben usar el mismo ancho máximo para uniformidad.

### Ancho Estándar: `1400px`

```css
/* CSS tradicional */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}
```

```html
<!-- Tailwind inline -->
<div class="max-w-[1400px] mx-auto p-5">
```

**Módulos actualizados:**
- ✅ `clients-list` - 1400px
- ✅ `workers-list` - 1400px
- ✅ `materials-list` - 1400px
- ✅ `proposals-list` - 1400px
- ✅ `work-plans-list` - 1400px
- ✅ `treasury` - 1400px

**Razón:** Mejor aprovechamiento de pantallas modernas sin sacrificar legibilidad.

## 🎓 Filosofía del Proyecto

1. **Compartir, no duplicar**: Si algo se repite, heredar de un base component
2. **Tailwind primero**: Material solo cuando no hay alternativa
3. **Signals everywhere**: Angular 20 reactive programming
4. **Clean y simple**: Menos código, más mantenible
5. **Usuario primero**: UX intuitiva sobre complejidad técnica

---

**Última actualización:** 2026-02-04
