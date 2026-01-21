// src/app/modules/workers/components/workers-list/workers-list.component.ts

import { Component, OnInit, AfterViewInit, inject, signal, computed, effect, ViewChild, TemplateRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

// Material imports (solo los necesarios)
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Services
import { WorkersService } from '../../services';
import { WorkerConfigService } from '../../services/worker-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CompaniesService } from '../../companies/services/companies.service';

// Generic Components
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GenericSearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { GenericDataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ColumnVisibilityControlComponent, ColumnOption } from '../../../../shared/components/column-visibility-control/column-visibility-control.component';

// Custom Components
import { CompaniesListDialogComponent } from '../companies-list-dialog/companies-list-dialog.component';

// Models
import { Worker, WorkerType, WORKER_TYPE_LABELS } from '../../models';
import { createGenericConfig } from '../../workers-config';
import { TableColumn, TableConfig } from '../../../../shared/components/data-table/models';

// Shared utilities
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
import { filterData, paginateData } from '../../../../shared/utils';

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    GenericSearchBarComponent,
    GenericDataTableComponent,
    ColumnVisibilityControlComponent,
    PaginationComponent,
  ],
  templateUrl: './workers-list.component.html',
  styleUrl: './workers-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkersListComponent implements OnInit, AfterViewInit {
  private workersService = inject(WorkersService);
  private configService = inject(WorkerConfigService);
  private authService = inject(AuthService);
  private companiesService = inject(CompaniesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  // ViewChild templates for GenericDataTable
  @ViewChild('statusColumn') statusColumnTemplate!: TemplateRef<any>;
  @ViewChild('actionsColumn') actionsColumnTemplate!: TemplateRef<any>;
  @ViewChild('typeColumn') typeColumnTemplate!: TemplateRef<any>;

  // Signals del servicio
  workers = this.workersService.workers;
  isLoading = this.workersService.isLoading;

  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

  // Columnas visibles (manejado por ColumnVisibilityControl)
  // Inicializar con localStorage para evitar flash de todas las columnas
  visibleColumnIds = signal<string[]>(this.loadVisibleColumnsFromStorage());

  // Columnas por defecto (las que tienen showInGrid: true)
  defaultVisibleColumnIds = computed(() => {
    return this.gridFields()
      .filter(field => field.gridConfig?.showInGrid === true)
      .map(field => field.id);
  });

  // Opciones de columnas para el control de visibilidad
  columnOptions = computed<ColumnOption[]>(() => {
    return this.gridFields().map(field => ({
      id: field.id,
      label: field.label,
      visible: this.visibleColumnIds().includes(field.id)
    }));
  });

  // Grid fields filtrados por columnas visibles
  visibleGridFields = computed(() => {
    const allFields = this.gridFields();
    const visibleIds = this.visibleColumnIds();

    // Si no hay columnas seleccionadas, mostrar solo las que tienen showInGrid: true
    if (visibleIds.length === 0) {
      return allFields.filter(field => field.gridConfig?.showInGrid === true);
    }

    return allFields.filter(field => visibleIds.includes(field.id));
  });

  // Campos filtrables (filterable: true)
  filterableFields = computed(() => {
    const allFields = this.gridFields();
    return allFields.filter(field =>
      field.gridConfig?.filterable === true && field.isActive
    );
  });

  // Filtros activos por campos personalizados
  customFieldFilters = signal<Record<string, any>>({});

  // Estado de dropdowns de filtros
  openFilterDropdown = signal<string | null>(null);
  filterSearchTerms = signal<Record<string, string>>({});

  // Filtros específicos de workers
  filterType = signal<WorkerType | 'all'>('all');
  filterCompanyId = signal<string | null>(null);
  filterCompanyName = signal<string | null>(null);

  // Valores únicos por campo filtrable
  uniqueValuesByField = computed(() => {
    const workers = this.workers();
    const filterableFieldsList = this.filterableFields();
    const result: Record<string, Array<{ value: any; label: string; count: number }>> = {};

    for (const field of filterableFieldsList) {
      const valuesMap = new Map<any, number>();

      for (const worker of workers) {
        const value = this.getFieldValue(worker, field.name);

        if (value !== null && value !== undefined && value !== '') {
          // Para campos array (multiselect), procesar cada valor
          if (Array.isArray(value)) {
            for (const v of value) {
              valuesMap.set(v, (valuesMap.get(v) || 0) + 1);
            }
          } else {
            valuesMap.set(value, (valuesMap.get(value) || 0) + 1);
          }
        }
      }

      // Convertir a array y agregar labels
      const uniqueValues = Array.from(valuesMap.entries()).map(([value, count]) => {
        // Para select/dictionary, obtener el label de las opciones
        let label = String(value);
        if (field.type === 'select' || field.type === 'multiselect' || field.type === 'dictionary') {
          const option = field.options?.find(opt => opt.value === value);
          if (option) {
            label = option.label;
          }
        }

        return { value, label, count };
      });

      // Ordenar por label
      uniqueValues.sort((a, b) => a.label.localeCompare(b.label));

      result[field.name] = uniqueValues;
    }

    return result;
  });

  // Opciones filtradas por búsqueda interna
  filteredOptions = computed(() => {
    const uniqueValues = this.uniqueValuesByField();
    const searchTerms = this.filterSearchTerms();
    const result: Record<string, Array<{ value: any; label: string; count: number }>> = {};

    for (const [fieldName, values] of Object.entries(uniqueValues)) {
      const searchTerm = (searchTerms[fieldName] || '').toLowerCase();

      if (!searchTerm) {
        result[fieldName] = values;
      } else {
        result[fieldName] = values.filter(item =>
          item.label.toLowerCase().includes(searchTerm)
        );
      }
    }

    return result;
  });

  // Generic config for delete dialogs
  genericConfig = computed(() => {
    const workerConfig = this.config();
    return workerConfig ? createGenericConfig(workerConfig) : null;
  });

  // Verificar si el usuario es admin
  isAdmin = computed(() => this.authService.authorizedUser()?.role === 'admin');

  // Template synchronization
  templatesReady = signal(false);
  tableConfig = signal<TableConfig<Worker>>({
    columns: [],
    selectable: 'multiple',
    showSelectAll: true,
    sortable: true,
    themeColor: 'amber',
    emptyMessage: 'No hay trabajadores disponibles'
  });

  // Señales locales
  searchTerm = signal<string>('');
  currentSort = signal<{ field: string; direction: 'asc' | 'desc' }>({ field: 'fullName', direction: 'asc' });
  selectedWorkers = signal<Set<string | number>>(new Set());

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(10); // Valor por defecto: 10 registros por página

  // Opciones de registros por página
  pageSizeOptions = [10, 20, 50, 100];

  // Math para templates
  Math = Math;

  // Expose Object for template use
  Object = Object;

  // Workers labels
  workerTypeLabels = WORKER_TYPE_LABELS;

  // Workers filtrados y paginados
  filteredWorkers = computed(() => {
    let workers = this.workers();
    const search = this.searchTerm().toLowerCase();
    const fields = this.visibleGridFields();
    const customFilters = this.customFieldFilters();
    const typeFilter = this.filterType();
    const companyId = this.filterCompanyId();

    // 1. Filtrar por empresa (companyId)
    if (companyId) {
      workers = workers.filter(w => w.companyId === companyId);
    }

    // 2. Filtrar por tipo
    if (typeFilter !== 'all') {
      workers = workers.filter(w => w.workerType === typeFilter);
    }

    // 3. Filtrar por campos personalizados (filterable: true)
    if (Object.keys(customFilters).length > 0) {
      workers = workers.filter(worker => {
        for (const [fieldName, filterValue] of Object.entries(customFilters)) {
          // Si el filtro está vacío o es "all", ignorar
          if (!filterValue || filterValue === '' || filterValue === 'all') {
            continue;
          }

          // Obtener el valor del campo en el worker
          const workerValue = this.getFieldValue(worker, fieldName);

          // Si el campo no existe o no coincide, filtrar
          if (workerValue === undefined || workerValue === null) {
            return false;
          }

          // Comparar valores (normalizar a string)
          if (String(workerValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    // 4. Filtrar por búsqueda global
    if (search) {
      workers = workers.filter(worker => {
        // Buscar en todos los campos visibles en el grid
        for (const field of fields) {
          const value = this.getFieldValue(worker, field.name);

          if (value !== null && value !== undefined) {
            // Para campos tipo select/dictionary, usar el valor formateado (labels)
            const formattedValue = this.formatFieldValue(value, field);
            if (formattedValue.toLowerCase().includes(search)) {
              return true;
            }
          }
        }

        // También buscar en campos por defecto que no estén en el grid
        if (worker.fullName?.toLowerCase().includes(search)) return true;
        if (worker.phone?.includes(search)) return true;
        if (worker.idOrLicense?.toLowerCase().includes(search)) return true;
        if (worker.companyName?.toLowerCase().includes(search)) return true;
        if (worker.address?.toLowerCase().includes(search)) return true;

        return false;
      });
    }

    // 5. Ordenar (sortable: true)
    const sort = this.currentSort();
    if (sort.field) {
      const allFields = this.gridFields();
      const sortField = allFields.find(f => f.name === sort.field);

      workers = [...workers].sort((a, b) => {
        let aValue = this.getFieldValue(a, sort.field);
        let bValue = this.getFieldValue(b, sort.field);

        // Manejar valores null/undefined
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Ordenar según tipo de campo
        let comparison = 0;

        if (sortField) {
          if (sortField.type === 'number' || sortField.type === 'currency') {
            // Números: comparación numérica
            comparison = Number(aValue) - Number(bValue);
          } else if (sortField.type === 'date') {
            // Fechas: comparación de timestamps
            const aDate = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
            const bDate = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
            comparison = aDate - bDate;
          } else if (sortField.type === 'checkbox') {
            // Booleanos: true > false
            comparison = (aValue === true ? 1 : 0) - (bValue === true ? 1 : 0);
          } else {
            // Texto: comparación alfabética (case-insensitive)
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            comparison = aStr.localeCompare(bStr);
          }
        } else {
          // Campo por defecto (fullName, phone, etc): comparación alfabética
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }

        // Aplicar dirección (asc/desc)
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return workers;
  });

  paginatedWorkers = computed(() => {
    const workers = this.filteredWorkers();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return workers.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredWorkers().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  // Stats
  stats = computed(() => {
    const workers = this.workers();
    return {
      total: workers.length,
      active: workers.filter(w => w.isActive).length,
      internal: workers.filter(w => w.workerType === 'internal').length,
      contractor: workers.filter(w => w.workerType === 'contractor').length
    };
  });

  constructor() {
    // Effect para actualizar la tabla cuando:
    // 1. Los templates estén disponibles (templatesReady)
    // 2. Las columnas visibles cambien (visibleGridFields)
    effect(() => {
      if (this.templatesReady()) {
        // Capturar visibleGridFields para que el effect reaccione a sus cambios
        const fields = this.visibleGridFields();
        this.updateTableConfig();
      }
    });
  }

  async ngOnInit() {
    // Cargar preferencias de filtros
    this.loadFilterPreferences();
    // Cargar datos
    await this.loadData();

    // Leer queryParam companyId para filtrar
    this.route.queryParams.subscribe(async params => {
      const companyId = params['companyId'];
      if (companyId) {
        this.filterCompanyId.set(companyId);
        // Obtener nombre de la empresa
        await this.companiesService.initialize();
        const company = this.companiesService.companies().find(c => c.id === companyId);
        if (company) {
          this.filterCompanyName.set(company.legalName);
        }
      } else {
        this.filterCompanyId.set(null);
        this.filterCompanyName.set(null);
      }
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
    // Asegurarnos de que los templates estén realmente disponibles
    setTimeout(() => {
      this.templatesReady.set(true);
      this.cdr.detectChanges();
    }, 0);
  }

  /**
   * Cargar datos iniciales
   */
  async loadData() {
    try {
      // Cargar configuración y workers en paralelo
      await Promise.all([
        this.configService.initialize(),
        this.workersService.initialize()
      ]);

      const config = this.config();

      if (config && config.gridConfig) {
        this.itemsPerPage.set(config.gridConfig.itemsPerPage || 10);
        this.currentSort.set({
          field: config.gridConfig.sortBy || 'fullName',
          direction: config.gridConfig.sortOrder || 'asc'
        });
      } else {
        // Usar valores por defecto si no hay configuración
        this.itemsPerPage.set(10);
        this.currentSort.set({
          field: 'fullName',
          direction: 'asc'
        });
      }

      // NO inicializar visibleColumnIds aquí
      // El ColumnVisibilityControl maneja su propia inicialización y persistencia

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
    }
  }

  // ============================================
  // GESTIÓN DE COLUMNAS VISIBLES
  // ============================================

  /**
   * Cargar columnas visibles desde localStorage
   * Se ejecuta en la inicialización para evitar flash de todas las columnas
   */
  private loadVisibleColumnsFromStorage(): string[] {
    const storageKey = 'workers-visible-columns';
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const columnIds = JSON.parse(stored) as string[];
        if (columnIds && columnIds.length > 0) {
          return columnIds;
        }
      } catch (error) {
        console.error('Error cargando columnas iniciales:', error);
      }
    }

    // Si no hay datos guardados, retornar array vacío
    // El selector se encargará de inicializar con defaults
    return [];
  }

  /**
   * Manejar cambio de visibilidad de columnas desde ColumnVisibilityControl
   */
  onColumnVisibilityChange(visibleIds: string[]) {
    this.visibleColumnIds.set(visibleIds);
  }

  // ============================================
  // BÚSQUEDA Y FILTROS
  // ============================================

  /**
   * Buscar workers
   */
  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0);
  }

  /**
   * Cargar preferencias de filtros desde localStorage
   */
  private loadFilterPreferences() {
    const storageKey = 'workers-filters';
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const filters = JSON.parse(stored);
        if (filters.customFieldFilters) {
          this.customFieldFilters.set(filters.customFieldFilters);
        }
        if (filters.filterType) {
          this.filterType.set(filters.filterType);
        }
      } catch (error) {
        console.error('Error cargando preferencias de filtros:', error);
      }
    }
  }

  /**
   * Guardar preferencias de filtros en localStorage
   */
  private saveFilterPreferences() {
    const storageKey = 'workers-filters';
    const filters = {
      customFieldFilters: this.customFieldFilters(),
      filterType: this.filterType()
    };
    localStorage.setItem(storageKey, JSON.stringify(filters));
  }

  /**
   * Cambiar filtro de campo personalizado
   */
  onCustomFieldFilterChange(fieldName: string, value: any) {
    const currentFilters = { ...this.customFieldFilters() };

    if (!value || value === '' || value === 'all') {
      // Eliminar filtro si está vacío
      delete currentFilters[fieldName];
    } else {
      // Agregar o actualizar filtro
      currentFilters[fieldName] = value;
    }

    this.customFieldFilters.set(currentFilters);
    this.currentPage.set(0);
    this.saveFilterPreferences();
  }

  /**
   * Cambiar filtro de tipo de worker
   */
  setFilterType(type: WorkerType | 'all') {
    this.filterType.set(type);
    this.currentPage.set(0);
    this.saveFilterPreferences();
  }

  /**
   * Limpiar filtro de empresa
   */
  clearCompanyFilter() {
    this.filterCompanyId.set(null);
    this.filterCompanyName.set(null);
    // Limpiar queryParams de la URL
    this.router.navigate(['/modules/workers']);
  }

  /**
   * Limpiar todos los filtros
   */
  clearAllFilters() {
    this.customFieldFilters.set({});
    this.filterType.set('all');
    this.currentPage.set(0);
    this.saveFilterPreferences();
    this.snackBar.open('Filtros limpiados', '', { duration: 2000 });
  }

  /**
   * Verificar si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return Object.keys(this.customFieldFilters()).length > 0 || this.filterType() !== 'all';
  }

  /**
   * Contar filtros activos
   */
  activeFiltersCount = computed(() => {
    let count = Object.keys(this.customFieldFilters()).length;
    if (this.filterType() !== 'all') count++;
    return count;
  });

  /**
   * Abrir/cerrar dropdown de filtro
   */
  toggleFilterDropdown(fieldName: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const currentOpen = this.openFilterDropdown();
    if (currentOpen === fieldName) {
      this.openFilterDropdown.set(null);
    } else {
      this.openFilterDropdown.set(fieldName);
      // Limpiar búsqueda interna al abrir
      const searchTerms = { ...this.filterSearchTerms() };
      searchTerms[fieldName] = '';
      this.filterSearchTerms.set(searchTerms);
    }
  }

  /**
   * Cerrar dropdown de filtro
   */
  closeFilterDropdown() {
    this.openFilterDropdown.set(null);
  }

  /**
   * Verificar si dropdown está abierto
   */
  isFilterDropdownOpen(fieldName: string): boolean {
    return this.openFilterDropdown() === fieldName;
  }

  /**
   * Actualizar término de búsqueda interna del filtro
   */
  onFilterSearchChange(fieldName: string, searchTerm: string) {
    const searchTerms = { ...this.filterSearchTerms() };
    searchTerms[fieldName] = searchTerm;
    this.filterSearchTerms.set(searchTerms);
  }

  /**
   * Seleccionar valor de filtro desde dropdown
   */
  selectFilterValue(fieldName: string, value: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.onCustomFieldFilterChange(fieldName, value);
    this.closeFilterDropdown();
  }

  /**
   * Obtener label del valor seleccionado
   */
  getSelectedFilterLabel(fieldName: string): string {
    const filterValue = this.customFieldFilters()[fieldName];
    if (!filterValue || filterValue === 'all') {
      return 'Todos';
    }

    const uniqueValues = this.uniqueValuesByField()[fieldName];
    if (!uniqueValues) {
      return String(filterValue);
    }

    const option = uniqueValues.find(opt => opt.value === filterValue);
    return option ? option.label : String(filterValue);
  }

  /**
   * Ordenar por campo
   */
  sortBy(field: string) {
    const current = this.currentSort();

    if (current.field === field) {
      // Toggle direction
      this.currentSort.set({
        field,
        direction: current.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      this.currentSort.set({ field, direction: 'asc' });
    }

    // El computed filteredWorkers se recalculará automáticamente
    // No es necesario llamar al servicio, el ordenamiento es local
  }

  /**
   * Navegar a crear worker
   */
  createWorker() {
    this.router.navigate(['/modules/workers/new']);
  }

  /**
   * Editar worker
   */
  editWorker(worker: Worker) {
    this.router.navigate(['/modules/workers', worker.id, 'edit']);
  }

  /**
   * Ver detalles del worker
   */
  viewWorker(worker: Worker) {
    this.router.navigate(['/modules/workers', worker.id]);
  }

  /**
   * Eliminar worker
   */
  async deleteWorker(worker: Worker) {
    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      data: {
        entity: worker as any,
        config: config
      },
      width: '600px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        const deleteResult = await this.workersService.deleteWorker(worker.id);
        if (deleteResult.success) {
          this.snackBar.open('Trabajador eliminado exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando trabajador:', error);
        this.snackBar.open('Error al eliminar el trabajador', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Eliminar workers seleccionados
   */
  async deleteSelectedWorkers() {
    const selectedIds = this.selectedWorkers();
    if (selectedIds.size === 0) {
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const workers = this.workers().filter(w => selectedIds.has(w.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      data: {
        entities: workers as any[],
        count: workers.length,
        config: config
      },
      width: '800px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        // Eliminar todos los workers seleccionados
        const deleteResult = await this.workersService.deleteMultipleWorkers(Array.from(selectedIds) as string[]);

        if (deleteResult.success) {
          this.selectedWorkers.set(new Set());
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando trabajadores:', error);
        this.snackBar.open('Error al eliminar los trabajadores', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Toggle estado activo/inactivo
   */
  async toggleWorkerStatus(worker: Worker) {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser?.uid) {
        this.snackBar.open('Usuario no autenticado', 'Cerrar', { duration: 3000 });
        return;
      }

      const newStatus = !worker.isActive;
      const result = await this.workersService.toggleActive(worker.id, newStatus, currentUser.uid);

      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error cambiando estado del trabajador:', error);
      this.snackBar.open('Error al cambiar el estado', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Refrescar lista
   */
  async refresh() {
    try {
      await this.workersService.forceReload();
      this.snackBar.open('Lista actualizada', 'Cerrar', { duration: 2000 });
    } catch (error) {
      console.error('Error refrescando lista:', error);
      this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Cambiar página
   */
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  /**
   * Cambiar tamaño de página
   */
  changePageSize(newSize: number) {
    this.itemsPerPage.set(newSize);
    this.currentPage.set(0); // Volver a la primera página
  }

  /**
   * Seleccionar/deseleccionar worker
   */
  toggleWorkerSelection(workerId: string) {
    const selected = new Set(this.selectedWorkers());
    if (selected.has(workerId)) {
      selected.delete(workerId);
    } else {
      selected.add(workerId);
    }
    this.selectedWorkers.set(selected);
  }

  /**
   * Seleccionar/deseleccionar todos
   */
  toggleSelectAll() {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();

    if (selected.size === paginated.length && paginated.length > 0) {
      this.selectedWorkers.set(new Set());
    } else {
      this.selectedWorkers.set(new Set(paginated.map(w => w.id)));
    }
  }

  /**
   * Verificar si está seleccionado
   */
  isSelected(workerId: string): boolean {
    return this.selectedWorkers().has(workerId);
  }

  /**
   * Verificar si todos están seleccionados
   */
  isAllSelected(): boolean {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();
    return paginated.length > 0 && selected.size === paginated.length;
  }

  /**
   * Verificar si hay selección parcial
   */
  isIndeterminate(): boolean {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();
    return selected.size > 0 && selected.size < paginated.length;
  }

  // Usar funciones compartidas de formateo
  formatFieldValue = formatFieldValue;
  getFieldValue = getFieldValue;

  /**
   * Construir columnas de la tabla basadas en visibleGridFields
   */
  private buildTableColumns(): TableColumn<Worker>[] {
    const columns: TableColumn<Worker>[] = [];
    const fields = this.visibleGridFields();

    // Columnas dinámicas basadas en gridFields visibles
    for (const field of fields) {
      // Usar template personalizado para workerType
      if (field.name === 'workerType') {
        columns.push({
          id: field.id,
          label: field.label,
          cellTemplate: this.typeColumnTemplate,
          sortable: field.gridConfig?.sortable === true
        });
      } else {
        columns.push({
          id: field.id,
          label: field.label,
          field: field.name as keyof Worker,
          sortable: field.gridConfig?.sortable === true,
          valueFormatter: (value, row) => this.formatFieldValue(value, field)
        });
      }
    }

    // Columna de estado con template
    columns.push({
      id: 'status',
      label: 'Estado',
      cellTemplate: this.statusColumnTemplate,
      sortable: false
    });

    // Columna de acciones con template
    columns.push({
      id: 'actions',
      label: 'Acciones',
      cellTemplate: this.actionsColumnTemplate,
      sortable: false
    });

    return columns;
  }

  /**
   * Actualizar configuración de la tabla
   */
  private updateTableConfig() {
    const columns = this.buildTableColumns();
    const config = this.config();
    const enableBulkActions = config?.gridConfig?.enableBulkActions !== false;

    this.tableConfig.set({
      columns: columns,
      selectable: enableBulkActions ? 'multiple' : false,
      showSelectAll: enableBulkActions,
      sortable: true,
      themeColor: 'amber',
      emptyMessage: this.searchTerm() && this.searchTerm().length >= 2
        ? 'No se encontraron trabajadores'
        : 'Comienza agregando tu primer trabajador'
    });
    // Forzar detección de cambios INMEDIATA (no solo marcar)
    this.cdr.detectChanges();
  }

  /**
   * Manejar cambio de selección desde GenericDataTable
   */
  onSelectionChange(selectedIds: (string | number)[]) {
    this.selectedWorkers.set(new Set(selectedIds));
  }

  /**
   * Limpiar selección
   */
  clearSelection() {
    this.selectedWorkers.set(new Set());
  }

  /**
   * Navegar a configuración
   */
  goToConfig() {
    this.router.navigate(['/modules/workers/config']);
  }

  /**
   * Abrir diálogo de empresas
   */
  openCompaniesDialog() {
    this.dialog.open(CompaniesListDialogComponent, {
      width: '750px',
      maxHeight: '90vh',
      disableClose: false
    });
  }

  /**
   * Exportar datos a CSV
   */
  exportToCSV() {
    try {
      const workers = this.filteredWorkers();
      if (workers.length === 0) {
        this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
        return;
      }

      const fields = this.visibleGridFields();

      // Encabezados
      const headers = fields.map(f => f.label).join(',');

      // Filas
      const rows = workers.map(worker => {
        return fields.map(field => {
          const value = this.getFieldValue(worker, field.name);
          const formatted = this.formatFieldValue(value, field);
          // Escapar comillas y valores con comas
          return `"${String(formatted).replace(/"/g, '""')}"`;
        }).join(',');
      });

      // Combinar
      const csv = [headers, ...rows].join('\n');

      // Descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `trabajadores-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Datos exportados exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error exportando a CSV:', error);
      this.snackBar.open('Error al exportar datos', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Exportar datos a JSON
   */
  exportToJSON() {
    try {
      const workers = this.filteredWorkers();
      if (workers.length === 0) {
        this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
        return;
      }

      // Convertir a JSON
      const json = JSON.stringify(workers, null, 2);

      // Descargar
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `trabajadores-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Datos exportados exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error exportando a JSON:', error);
      this.snackBar.open('Error al exportar datos', 'Cerrar', { duration: 3000 });
    }
  }
}
