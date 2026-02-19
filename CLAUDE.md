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
- **Sistema de Botones** (ver sección dedicada abajo)
- **Sistema de Diálogos** (ver sección dedicada abajo)

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

DynamicFormDialogBase (formularios dinámicos en diálogos)
├── AddClientDialogComponent
└── AddMaterialDialogComponent
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

#### Servicios Core Globales (NO reimplementar)
```
core/services/
├── NotificationService   → Notificaciones centralizadas (SIEMPRE usar este)
└── FiscalYearService     → Año fiscal activo de la empresa (SIEMPRE usar este)
```

**FiscalYearService** (`src/app/core/services/fiscal-year.service.ts`):
- Lee la configuración de `business_info/main` (campo `fiscalYear`) via `BusinessInfoService`
- Expone `currentFY()` como `computed` signal → `{ label, prefix, startDate, endDate }`
- Fallback automático si no hay config: año calendario, formato `FY{YY}`
- **USO:** inyectar donde se necesite el prefijo para numeración de documentos o el período fiscal

```typescript
// ✅ CORRECTO: usar FiscalYearService
private fiscalYearService = inject(FiscalYearService);
const prefix = this.fiscalYearService.currentFY().prefix; // "FY26-"
const label  = this.fiscalYearService.currentFY().label;  // "FY26"

// ❌ INCORRECTO: calcular el año fiscal manualmente
const year = new Date().getFullYear() % 100;
const prefix = `FY${year}-`;  // ← hardcodeado, ignora configuración de empresa
```

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

### 5. **NotificationService (Notificaciones Centralizadas)**

**Ubicación:** `src/app/core/services/notification.service.ts`

**REGLA FUNDAMENTAL:** NO usar `MatSnackBar` directamente en componentes. SIEMPRE usar `NotificationService`.

❌ **NUNCA hacer esto:**
```typescript
import { MatSnackBar } from '@angular/material/snack-bar';
this.snackBar.open('Mensaje', 'Cerrar', { duration: 3000 });
```

✅ **SIEMPRE hacer esto:**
```typescript
// En componentes standalone (sin herencia de base)
import { NotificationService } from '@core/services/notification.service';
private notify = inject(NotificationService);

// En componentes que heredan de GenericListBaseComponent, GenericGridConfigBaseComponent,
// GenericConfigBaseComponent o DynamicFormDialogBase → ya tienen `protected notify`
// NO redeclarar, usar directamente this.notify.*
```

**API disponible:**

| Categoría | Método | Uso |
|-----------|--------|-----|
| **Base** | `success(msg)`, `error(msg)`, `warning(msg)`, `info(msg)` | Mensajes genéricos |
| **CRUD** | `crud.created(entity)`, `crud.updated(entity)`, `crud.deleted(entity)` | Operaciones exitosas |
| **CRUD** | `crud.deletedMultiple(count, entity)`, `crud.statusChanged(entity, status)` | Operaciones múltiples/estado |
| **CRUD** | `crud.saveError(entity)`, `crud.deleteError(entity)`, `crud.loadError(entity)`, `crud.statusError(entity)` | Errores CRUD |
| **Validation** | `validation.invalidForm()`, `validation.required(field)` | Validación de formularios |
| **Validation** | `validation.selectAtLeastOne(entity)`, `validation.configUnavailable()`, `validation.duplicate(entity)` | Validaciones comunes |
| **System** | `system.refreshed()`, `system.refreshError()` | Actualización de datos |
| **System** | `system.exported(format)`, `system.exportError(format)` | Exportaciones |
| **System** | `system.configUpdated()`, `system.configError()`, `system.configLoadError()` | Configuración |
| **System** | `system.unauthorized()` | Autenticación |

**Ejemplo de uso:**
```typescript
// CRUD
this.notify.crud.created('Cliente');        // → "Cliente creado exitosamente"
this.notify.crud.deleteError('el cliente'); // → "Error al eliminar el cliente"

// Validación
this.notify.validation.invalidForm();       // → "Por favor completa todos los campos correctamente"
this.notify.validation.duplicate('categoría'); // → "Este categoría ya está agregado"

// Sistema
this.notify.system.configUpdated();         // → "Configuración actualizada correctamente"
this.notify.system.exported('CSV');         // → "Exportación CSV completada"

// Mensajes dinámicos (cuando el mensaje viene de un servicio)
this.notify.success(result.message);
this.notify.error(result.message);
```

**Importante para herencia:**
- Las clases base (`GenericListBaseComponent`, `GenericGridConfigBaseComponent`, `DynamicFormDialogBase`) ya proveen `protected notify`
- Los componentes hijos **NO deben** redeclarar `private notify = inject(NotificationService)`
- Simplemente usar `this.notify.*` directamente

### 5.1 **Path Aliases (tsconfig.json)**

El proyecto usa path aliases para imports limpios:

```json
"paths": {
  "@core/*": ["src/app/core/*"]
}
```

**Uso:**
```typescript
// ✅ CORRECTO
import { NotificationService } from '@core/services/notification.service';

// ❌ INCORRECTO (imports relativos largos)
import { NotificationService } from '../../../../core/services/notification.service';
```

### 6. **HTML Select vs Botones**

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

### 6.1 **Actualización de Documentación (OBLIGATORIO)**

**Después de implementar cambios significativos, SIEMPRE proponer actualizar la documentación.**

**¿Cuándo actualizar `README.md`?**
- Se agrega un **nuevo módulo o funcionalidad visible** para el usuario
- Se agrega o elimina una **colección de Firestore**
- Cambian las **versiones de dependencias** principales
- Se modifica el **roadmap** (algo se completa o se agrega)
- Cambia la **estructura de módulos** del proyecto

**¿Cuándo actualizar `CLAUDE.md`?**
- Se crea un **nuevo componente base o compartido**
- Se agrega una **nueva regla o convención** de desarrollo
- Se modifica la **jerarquía de herencia** de componentes
- Se agrega un **nuevo servicio base** o patrón reutilizable
- Se agregan **nuevas clases globales** en `styles.css`
- Se cambia una **decisión arquitectónica** (ej: nueva forma de manejar estado)
- Se descubre un **nuevo error común** que otros deben evitar

**Flujo obligatorio:**
```
1. Implementar la funcionalidad
2. PREGUNTARSE: ¿Este cambio afecta README.md o CLAUDE.md?
3. Si la respuesta es SÍ → Proponer los cambios al usuario
4. Si el usuario aprueba → Actualizar los archivos en el mismo PR/commit
```

> **Regla:** La documentación desactualizada genera más problemas que la falta de documentación.
> Si haces un cambio y no actualizas los docs, el próximo desarrollador (o IA) cometerá errores evitables.

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
- [ ] ¿Es un diálogo? → ¿Usé clases del DIALOG SYSTEM en lugar de CSS custom?
- [ ] ¿Notificaciones? → ¿Usé `NotificationService` en lugar de `MatSnackBar` directo?
- [ ] ¿Numeración de documentos o período fiscal? → ¿Usé `FiscalYearService.currentFY()` en lugar de calcular el año manualmente?
- [ ] ¿Texto con llaves `{}` en un template? → ¿Escapé con `&#123;` / `&#125;` para evitar error ICU?
- [ ] ¿Este cambio requiere actualizar `README.md` o `CLAUDE.md`? → Proponer al usuario

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
│   │   ├── services/                       # Auth, Config, Language, Inactivity, Logger, Navigation, ⭐ NotificationService, ⭐ FiscalYearService
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
│   │   │   ├── dynamic-form-dialog-base/   # ⭐ Base para diálogos con formularios dinámicos
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
- [ ] ¿Año fiscal / prefijo de documentos? → `FiscalYearService.currentFY()` (NO calcular manualmente)

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

### Error: Llaves `{}` en texto de template Angular (ICU messages)
**Problema:** Colocar `{texto}` como contenido de texto en el HTML hace que el compilador Angular lo interprete como una expresión ICU (`{variable, pluralType, cases}`), rompiendo todo el template con errores en cascada como:
- `error NG5002: Invalid ICU message. Missing '}'`
- `error NG5002: Unclosed block "if"` (falso positivo en bloques `@if` válidos)
- `error NG5002: Unexpected character "EOF"`

**Solución:** Escapar las llaves literales en **texto visible** usando entidades HTML:
- `{` → `&#123;`
- `}` → `&#125;`

```html
<!-- ❌ INCORRECTO: Angular lo parsea como ICU, rompe el template -->
<option value="FY{YY}">FY{YY} — Ejemplo: FY26</option>

<!-- ✅ CORRECTO: entidades HTML en el texto visible; el value="" no se ve afectado -->
<option value="FY{YY}">FY&#123;YY&#125; — Ejemplo: FY26</option>
```

> **Nota:** El atributo `value="FY{YY}"` no necesita escape porque los atributos HTML estáticos no son parseados como ICU. Solo el **contenido de texto** del elemento es vulnerable.

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

## 🔘 Sistema de Botones (BUTTON SYSTEM)

**Ubicación:** `src/styles.css` - Sección "BUTTON SYSTEM"

**REGLA FUNDAMENTAL:** NO definir estilos de botones en archivos de componentes. Todos los botones usan las clases globales.

### Nomenclatura

| Tipo | Clases | Uso |
|------|--------|-----|
| **Variantes** | `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-cancel`, `.btn-draft` | Botones de texto |
| **Tamaños** | `.btn-sm`, `.btn-lg` | Modificadores (md es default) |
| **Icon-only** | `.btn-icon` / `.icon-btn`, `.btn-icon-sm`, `.btn-icon-lg`, `.btn-icon-ghost` | Botones solo icono |
| **Loading** | `.btn-spinner` | Spinner dentro de botón |
| **Aliases** | `.btn-save`, `.btn-edit`, `.back-btn`, `.close-btn` | Compatibilidad |

### Design Tokens

| Propiedad | sm | md (default) | lg |
|-----------|-----|-------------|-----|
| padding | 6px 12px | 8px 16px | 10px 24px |
| font-size | 12px | 13px | 14px |
| border-radius | 8px | 10px | 12px |
| icon-size | 16px | 18px | 20px |

### Tematización por Módulo (CSS Variables)

Los botones primarios se adaptan al color del módulo usando CSS variables en `:host`:

```css
/* En el componente de lista o formulario */
:host {
  --btn-accent-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  --btn-accent: #f59e0b;
  --btn-accent-shadow: rgba(245, 158, 11, 0.3);
  --btn-accent-shadow-hover: rgba(245, 158, 11, 0.4);
}
```

**ModuleHeaderComponent** usa `data-module-color` automáticamente:
```html
<header [attr.data-module-color]="moduleColor()">
  <button class="btn-secondary btn-lg">Secundario</button>
  <button class="btn-primary btn-lg">Primario</button>
</header>
```

### Colores por Módulo

| Módulo | Variable | Colores |
|--------|----------|---------|
| Workers | `--btn-accent: #f59e0b` | amber |
| Clients | `--btn-accent: #9333ea` | purple |
| Materials | `--btn-accent: #10b981` | green |
| Projects | `--btn-accent: #3b82f6` | blue |
| Treasury | `--btn-accent: #14b8a6` | teal |
| Work Planning | `--btn-accent: #6366f1` | indigo |

### Ejemplo de Uso

```html
<!-- Botón primario (hereda color del módulo via CSS vars) -->
<button class="btn-primary" (click)="save()">
  <mat-icon>save</mat-icon> Guardar
</button>

<!-- Botón cancelar -->
<button class="btn-cancel" (click)="cancel()">
  <mat-icon>close</mat-icon> Cancelar
</button>

<!-- Botón peligro -->
<button class="btn-danger" (click)="delete()">
  <mat-icon>delete</mat-icon> Eliminar
</button>

<!-- Botón icono -->
<button class="btn-icon" (click)="settings()">
  <mat-icon>settings</mat-icon>
</button>

<!-- Botón con spinner de carga -->
<button class="btn-primary" [disabled]="saving()">
  @if (saving()) {
    <span class="btn-spinner"></span>
  } @else {
    <mat-icon>save</mat-icon>
  }
  Guardar
</button>
```

### Variables CSS para Formularios (no-button)

Los formularios aún usan variables `--form-accent-*` para estilos de inputs:
```css
:host {
  /* Para botones */
  --btn-accent-gradient: linear-gradient(...);
  --btn-accent-shadow: rgba(...);
  /* Para inputs (form-base.css) */
  --form-accent: #f59e0b;
  --form-accent-ring: rgba(245, 158, 11, 0.1);
  --form-accent-light: #fffbeb;
}
```

## 🪟 Sistema de Diálogos (DIALOG SYSTEM)

**Ubicación:** `src/styles.css` - Sección "DIALOG SYSTEM"

**REGLA FUNDAMENTAL:** NO duplicar estilos de diálogos en archivos de componentes. Los patrones comunes están centralizados en `styles.css`.

### Clases Disponibles

| Categoría | Clases | Uso |
|-----------|--------|-----|
| **Scrollbar** | `.dialog-scrollbar`, `.dialog-content`, `.tab-content-modern`, `mat-dialog-content`, `.overflow-y-auto`, `.table-container` | Scrollbar delgado automático |
| **Option Cards** | `.option-card`, `.option-card.danger-option` | Cards de selección en delete dialogs |
| **Role Cards** | `.role-radio-card`, `.role-icon-admin`, `.role-icon-user`, `.role-icon-viewer` | Selección de roles (admin dialogs) |
| **Select Cards** | `.permission-card`, `.module-card`, `.module-icon-large` | Cards de permisos/módulos |
| **Chips** | `.modern-chip`, `.permission-chip`, `.module-chip` | Preview de selecciones |
| **Inputs** | `.dialog-input`, `.dialog-input-error` | Campos de entrada en diálogos |
| **Confirmation** | `.confirmation-input-custom` (`.valid`/`.invalid`) | Input de confirmación con keyword |
| **Tabs** | `.tab-icon`, `.tab-text`, `.tab-check` | Tabs personalizados en diálogos |
| **Animations** | `.dialog-stagger-item`, `.dialog-warning-icon` | Entrada staggered y pulse de warning |

### Cuándo usar estilos locales vs globales

```
✅ GLOBAL (styles.css): Scrollbar, option-card, role-card, permission-card, chips, tabs
❌ LOCAL (component.css): Solo estilos ÚNICOS del componente (ej: user-avatar-large, json-section)
```

### Ejemplo de uso

```css
/* En el component.css del diálogo - SOLO lo específico */
/* delete-logs-dialog.component.css */

/* Override de padding específico */
.option-card {
  padding: 20px;
}

/* Estilos únicos de este diálogo */
.keyword-badge {
  animation: keywordPulse 2s infinite;
}

/* TODO LO DEMÁS viene de styles.css automáticamente */
```

### Reducción de CSS por diálogo

Antes de la centralización, cada diálogo tenía 150-335 líneas de CSS duplicado.
Ahora solo contienen estilos específicos (30-147 líneas), con el resto centralizado.

---

**Última actualización:** 2026-02-19
