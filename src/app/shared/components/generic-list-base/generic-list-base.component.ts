// src/app/shared/components/generic-list-base/generic-list-base.component.ts

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { ModuleConfigBaseService } from '../../modules/dynamic-form-builder/services/module-config-base.service';
import { FieldConfig } from '../../modules/dynamic-form-builder/models/field-config.interface';
import { ColumnOption } from '../column-visibility-control/column-visibility-control.component';
import { formatFieldValue, getFieldValue } from '../../modules/dynamic-form-builder/utils';

/**
 * Componente base genérico para listados de módulos
 * Proporciona toda la lógica compartida de:
 * - Visibilidad de columnas
 * - Filtros dinámicos
 * - Búsqueda global
 * - Exportación (CSV/JSON)
 * - Paginación
 * - Ordenamiento
 *
 * Los componentes hijos solo necesitan implementar la lógica específica del módulo.
 */
@Component({
  selector: 'app-generic-list-base',
  standalone: true,
  imports: [CommonModule],
  template: '',  // Los hijos proveen su propio template
})
export abstract class GenericListBaseComponent<T extends { id: string | number }> implements OnInit {
  // Services (deben ser inyectados por el componente hijo)
  protected snackBar = inject(MatSnackBar);
  protected router = inject(Router);

  // Propiedades abstractas que cada módulo debe implementar
  abstract configService: ModuleConfigBaseService<any>;
  abstract storageKey: string;  // Ej: 'clients-visible-columns'
  abstract modulePath: string;  // Ej: '/modules/clients'

  // Datos abstractos que cada módulo debe proveer
  abstract data: () => T[];  // Signal de datos del módulo
  abstract gridFields: () => FieldConfig[];  // Campos del grid desde configService

  // ==============================================
  // SIGNALS COMPARTIDOS - Columnas Visibles
  // ==============================================

  // Inicializar vacío - se cargará en ngOnInit cuando storageKey esté definido
  visibleColumnIds = signal<string[]>([]);

  defaultVisibleColumnIds = computed(() => {
    return this.gridFields()
      .filter(field => field.gridConfig?.showInGrid === true)
      .map(field => field.id);
  });

  columnOptions = computed<ColumnOption[]>(() => {
    const visibleIds = this.visibleColumnIds();
    const defaultIds = this.defaultVisibleColumnIds();

    // Si no hay columnas seleccionadas (primera carga), usar las por defecto
    const activeIds = visibleIds.length === 0 ? defaultIds : visibleIds;

    return this.gridFields().map(field => ({
      id: field.id,
      label: field.label,
      visible: activeIds.includes(field.id)
    }));
  });

  visibleGridFields = computed(() => {
    const allFields = this.gridFields();
    const visibleIds = this.visibleColumnIds();

    if (visibleIds.length === 0) {
      return allFields.filter(field => field.gridConfig?.showInGrid === true);
    }

    return allFields.filter(field => visibleIds.includes(field.id));
  });

  // ==============================================
  // SIGNALS COMPARTIDOS - Filtros
  // ==============================================

  filterableFields = computed(() => {
    const allFields = this.gridFields();
    return allFields.filter(field =>
      field.gridConfig?.filterable === true && field.isActive
    );
  });

  customFieldFilters = signal<Record<string, any>>({});
  openFilterDropdown = signal<string | null>(null);
  filterSearchTerms = signal<Record<string, string>>({});

  uniqueValuesByField = computed(() => {
    const dataList = this.data();
    const filterableFieldsList = this.filterableFields();
    const result: Record<string, Array<{ value: any; label: string; count: number }>> = {};

    for (const field of filterableFieldsList) {
      const valuesMap = new Map<any, number>();

      for (const item of dataList) {
        const value = getFieldValue(item, field.name);

        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            for (const v of value) {
              valuesMap.set(v, (valuesMap.get(v) || 0) + 1);
            }
          } else {
            valuesMap.set(value, (valuesMap.get(value) || 0) + 1);
          }
        }
      }

      const uniqueValues = Array.from(valuesMap.entries()).map(([value, count]) => {
        let label = String(value);
        if (field.type === 'select' || field.type === 'multiselect' || field.type === 'dictionary') {
          const option = field.options?.find(opt => opt.value === value);
          if (option) {
            label = option.label;
          }
        }
        return { value, label, count };
      });

      uniqueValues.sort((a, b) => a.label.localeCompare(b.label));
      result[field.name] = uniqueValues;
    }

    return result;
  });

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

  // ==============================================
  // SIGNALS COMPARTIDOS - Búsqueda y Ordenamiento
  // ==============================================

  searchTerm = signal<string>('');
  currentSort = signal<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'name',
    direction: 'asc'
  });

  // ==============================================
  // SIGNALS COMPARTIDOS - Paginación
  // ==============================================

  currentPage = signal<number>(0);

  // itemsPerPage ahora es un computed que se sincroniza automáticamente con la configuración
  itemsPerPage = computed(() => {
    const config = this.configService.config();
    return config?.gridConfig?.itemsPerPage || 10;
  });

  // Sincronizar pageSizeOptions con la configuración
  pageSizeOptions = [10, 25, 50, 100];

  // ==============================================
  // SIGNALS COMPARTIDOS - Selección
  // ==============================================

  selectedIds = signal<Set<string | number>>(new Set());

  // Exponer Object para uso en template
  Object = Object;

  ngOnInit(): void {
    // Cargar columnas visibles desde localStorage
    // Se hace aquí porque storageKey es una propiedad abstracta
    // que solo está disponible después de que el componente hijo se construye
    const stored = this.loadVisibleColumnsFromStorage();
    if (stored.length > 0) {
      this.visibleColumnIds.set(stored);
    }
    // Si stored.length === 0, visibleColumnIds queda [], y columnOptions/visibleGridFields
    // automáticamente usarán las columnas por defecto (showInGrid: true)
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Columnas Visibles
  // ==============================================

  /**
   * Cargar columnas visibles desde localStorage
   */
  protected loadVisibleColumnsFromStorage(): string[] {
    const stored = localStorage.getItem(this.storageKey);

    if (stored) {
      try {
        const columnIds = JSON.parse(stored) as string[];
        if (columnIds && columnIds.length > 0) {
          return columnIds;
        }
      } catch (error) {
        console.error('Error cargando columnas desde localStorage:', error);
      }
    }

    return [];
  }

  /**
   * Manejar cambio de visibilidad de columnas
   * Actualiza el signal y persiste en localStorage para mantener sincronización
   */
  onColumnVisibilityChange(visibleIds: string[]): void {
    this.visibleColumnIds.set(visibleIds);
    // Guardar en localStorage para mantener sincronización
    // (column-visibility-control también guarda, pero esto asegura consistencia)
    localStorage.setItem(this.storageKey, JSON.stringify(visibleIds));
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Búsqueda
  // ==============================================

  /**
   * Manejar cambio en la búsqueda global
   */
  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(0);
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Filtros
  // ==============================================

  /**
   * Toggle dropdown de filtro
   */
  toggleFilterDropdown(fieldName: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const current = this.openFilterDropdown();
    if (current === fieldName) {
      this.openFilterDropdown.set(null);
    } else {
      this.openFilterDropdown.set(fieldName);
    }
  }

  /**
   * Cerrar dropdown de filtro
   */
  closeFilterDropdown(): void {
    this.openFilterDropdown.set(null);
  }

  /**
   * Verificar si dropdown está abierto
   */
  isFilterDropdownOpen(fieldName: string): boolean {
    return this.openFilterDropdown() === fieldName;
  }

  /**
   * Manejar cambio en búsqueda dentro de dropdown
   */
  onFilterSearchChange(fieldName: string, searchTerm: string): void {
    const current = this.filterSearchTerms();
    this.filterSearchTerms.set({
      ...current,
      [fieldName]: searchTerm
    });
  }

  /**
   * Seleccionar valor de filtro
   */
  selectFilterValue(fieldName: string, value: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const current = this.customFieldFilters();

    if (value === null) {
      const newFilters = { ...current };
      delete newFilters[fieldName];
      this.customFieldFilters.set(newFilters);
    } else {
      this.customFieldFilters.set({
        ...current,
        [fieldName]: value
      });
    }

    this.closeFilterDropdown();
    this.currentPage.set(0);
  }

  /**
   * Obtener label del filtro seleccionado
   */
  getSelectedFilterLabel(fieldName: string): string {
    const filterValue = this.customFieldFilters()[fieldName];
    if (!filterValue) return 'Todos';

    const uniqueValues = this.uniqueValuesByField()[fieldName];
    const selectedOption = uniqueValues?.find(opt => opt.value === filterValue);
    return selectedOption ? selectedOption.label : String(filterValue);
  }

  /**
   * Limpiar todos los filtros
   */
  clearAllFilters(): void {
    this.customFieldFilters.set({});
    this.currentPage.set(0);
  }

  /**
   * Verificar si hay filtros activos
   */
  hasActiveFilters = computed(() => {
    return Object.keys(this.customFieldFilters()).length > 0;
  });

  /**
   * Contar filtros activos
   */
  activeFiltersCount = computed(() => {
    return Object.keys(this.customFieldFilters()).length;
  });

  // ==============================================
  // MÉTODOS COMPARTIDOS - Ordenamiento
  // ==============================================

  /**
   * Ordenar por campo
   */
  sortBy(field: string): void {
    const current = this.currentSort();

    if (current.field === field) {
      this.currentSort.set({
        field,
        direction: current.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      this.currentSort.set({
        field,
        direction: 'asc'
      });
    }

    this.currentPage.set(0);
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Paginación
  // ==============================================

  /**
   * Ir a una página específica
   */
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  /**
   * Cambiar tamaño de página
   * Ahora actualiza la configuración para que persista el cambio
   */
  async changePageSize(newSize: number): Promise<void> {
    try {
      const config = this.configService.config();
      if (config?.gridConfig) {
        const updatedGridConfig = {
          ...config.gridConfig,
          itemsPerPage: newSize
        };

        // Actualizar en el servicio (que guarda en Firestore)
        await this.configService.updateConfig({
          gridConfig: updatedGridConfig
        });
      }

      // Resetear a la primera página
      this.currentPage.set(0);
    } catch (error) {
      console.error('Error actualizando itemsPerPage:', error);
    }
  }

  /**
   * Calcular total de páginas (debe ser implementado por el hijo)
   */
  abstract totalPages(): number;

  // ==============================================
  // MÉTODOS COMPARTIDOS - Exportación
  // ==============================================

  /**
   * Exportar datos filtrados a CSV
   */
  exportToCSV(filteredData: T[], fileName: string): void {
    try {
      if (filteredData.length === 0) {
        this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
        return;
      }

      const fields = this.visibleGridFields();

      // Encabezados
      const headers = fields.map(f => f.label).join(',');

      // Filas
      const rows = filteredData.map(item => {
        return fields.map(field => {
          const value = getFieldValue(item, field.name);
          const formatted = formatFieldValue(value, field);

          // Escapar comillas y agregar comillas si contiene comas
          if (typeof formatted === 'string' && (formatted.includes(',') || formatted.includes('"'))) {
            return `"${formatted.replace(/"/g, '""')}"`;
          }

          return formatted;
        }).join(',');
      }).join('\n');

      const csv = `${headers}\n${rows}`;

      // Crear blob y descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
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
   * Exportar datos filtrados a JSON
   */
  exportToJSON(filteredData: T[], fileName: string): void {
    try {
      if (filteredData.length === 0) {
        this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
        return;
      }

      const json = JSON.stringify(filteredData, null, 2);

      // Crear blob y descargar
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.json`);
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

  // ==============================================
  // MÉTODOS COMPARTIDOS - Selección
  // ==============================================

  /**
   * Manejar cambio de selección
   */
  onSelectionChange(selectedIds: (string | number)[] | Set<string | number>): void {
    if (Array.isArray(selectedIds)) {
      this.selectedIds.set(new Set(selectedIds));
    } else {
      this.selectedIds.set(selectedIds);
    }
  }

  /**
   * Limpiar selección
   */
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // ==============================================
  // MÉTODOS ABSTRACTOS - Navegación
  // ==============================================

  /**
   * Ir a configuración del módulo
   */
  goToConfig(): void {
    this.router.navigate([`${this.modulePath}/config`]);
  }

  /**
   * Refrescar datos (debe ser implementado por el hijo)
   */
  abstract refreshData(): Promise<void>;
}
