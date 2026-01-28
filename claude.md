# Guía de Desarrollo - Business Management System

## 🎯 Reglas Fundamentales (SIEMPRE cumplir)

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
└── WorkersConfigComponent (solo grid, sin formularios)
```

**Regla importante:**
- Si una funcionalidad se usa en 2+ módulos → mover a componente base
- Ejemplo: `itemsPerPage`, `pageSizeOptions`, filtros, búsqueda, etc.

#### Servicios Base
```
ModuleConfigBaseService<TConfig>
├── ClientConfigServiceRefactored
├── MaterialConfigServiceRefactored
└── WorkersConfigService
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

Usar clases Tailwind correspondientes:
- `bg-amber-600`, `text-amber-600`, `hover:bg-amber-50`
- `bg-purple-600`, `text-purple-600`, `hover:bg-purple-50`
- `bg-green-600`, `text-green-600`, `hover:bg-green-50`

## 📋 Checklist Antes de Commit

- [ ] ¿Usé Tailwind en lugar de Material?
- [ ] ¿Reutilicé estilos globales de `styles.css`?
- [ ] ¿Evité `::ng-deep`?
- [ ] ¿La funcionalidad es compartida? → ¿La moví a componente base?
- [ ] ¿Usé signals en lugar de Observables?
- [ ] ¿Agregué `ChangeDetectionStrategy.OnPush`?
- [ ] ¿Eliminé todos los `console.log()` de debug?
- [ ] ¿El commit está en español con descripción clara?

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm start

# Build
npm run build

# Linter
npm run lint
```

## 📁 Estructura de Archivos Importante

```
src/
├── app/
│   ├── core/                    # Servicios core (auth, etc)
│   ├── shared/
│   │   ├── components/
│   │   │   ├── generic-list-base/          # Base para listas
│   │   │   ├── generic-grid-config-base/   # Base para config grid
│   │   │   ├── generic-config-base/        # Base para config completa
│   │   │   ├── pagination/
│   │   │   ├── data-table/
│   │   │   └── ...
│   │   └── modules/
│   │       └── dynamic-form-builder/
│   ├── modules/
│   │   ├── workers/
│   │   ├── clients/
│   │   └── materials/
│   └── styles.css               # ⭐ SIEMPRE REVISAR PRIMERO
```

## ⚠️ Errores Comunes y Soluciones

### Error: Select no se actualiza
**Problema:** `<select [value]="signal()">` no reacciona a cambios
**Solución:** Usar `[ngModel]` + `(ngModelChange)` con `FormsModule`

### Error: Código duplicado entre módulos
**Problema:** Misma lógica en workers, clients, materials
**Solución:** Mover a `GenericListBaseComponent` o `GenericConfigBaseComponent`

### Error: Estilos no aplicándose
**Problema:** Usar CSS custom que ya existe en `styles.css`
**Solución:** Revisar `styles.css` primero, reutilizar clases existentes

### Error: TypeScript con signals
**Problema:** `Type 'Signal<T>' is not assignable to type 'T'`
**Solución:** Llamar el signal como función: `signal()` no `signal`

## 🎓 Filosofía del Proyecto

1. **Compartir, no duplicar**: Si algo se repite, heredar de un base component
2. **Tailwind primero**: Material solo cuando no hay alternativa
3. **Signals everywhere**: Angular 20 reactive programming
4. **Clean y simple**: Menos código, más mantenible
5. **Usuario primero**: UX intuitiva sobre complejidad técnica

---

**Última actualización:** 2026-01-28
