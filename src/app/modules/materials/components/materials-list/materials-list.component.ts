import { Component, AfterViewInit, inject, signal, computed, effect, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { MaterialsService, MaterialsConfigService } from '../../services';
import { Material } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GenericSearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { GenericDataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ColumnVisibilityControlComponent } from '../../../../shared/components/column-visibility-control/column-visibility-control.component';
import { TableColumn, TableConfig } from '../../../../shared/components/data-table/models';
import { createGenericConfig } from '../../config/materials.config';
import { AuthService } from '../../../../core/services/auth.service';
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
import { filterData, paginateData } from '../../../../shared/utils';
import { GenericListBaseComponent } from '../../../../shared/components/generic-list-base/generic-list-base.component';

/**
 * Componente de listado de Materiales
 * Hereda toda la lógica común de GenericListBaseComponent
 * Solo contiene lógica específica de materiales
 */
@Component({
  selector: 'app-materials-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    PaginationComponent,
    GenericSearchBarComponent,
    GenericDataTableComponent,
    ColumnVisibilityControlComponent
  ],
  templateUrl: './materials-list.component.html',
  styleUrl: './materials-list.component.css'
})
export class MaterialsListComponent extends GenericListBaseComponent<Material> implements AfterViewInit {
  // Implementar propiedades abstractas requeridas
  configService = inject(MaterialsConfigService);
  override storageKey = 'materials-visible-columns';
  override modulePath = '/modules/materials';

  // Servicios específicos de materiales
  private materialsService = inject(MaterialsService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // Proveer datos requeridos por la clase base
  data = this.materialsService.materials;
  gridFields = computed(() => this.configService.getGridFields());

  // Templates para columnas personalizadas
  @ViewChild('statusColumn') statusColumnTemplate!: TemplateRef<any>;
  @ViewChild('actionsColumn') actionsColumnTemplate!: TemplateRef<any>;

  // Estado específico de materiales
  isLoading = signal(false);
  templatesReady = signal(false);

  // Configuración de la tabla
  tableConfig = signal<TableConfig<Material>>({
    columns: [],
    selectable: 'multiple',
    showSelectAll: true,
    clickableRows: false,
    hoverEffect: true,
    themeColor: 'green',
    emptyMessage: 'Comienza agregando tu primer material',
    emptyIcon: 'inventory_2',
    loadingMessage: 'Cargando materiales...'
  });

  // Datos filtrados y paginados (específicos del tipo Material)
  filteredMaterials = computed(() => {
    let materials = this.materials();
    const search = this.searchTerm();
    const customFilters = this.customFieldFilters();
    const sort = this.currentSort();

    // Aplicar filtros personalizados
    if (Object.keys(customFilters).length > 0) {
      materials = materials.filter(material => {
        for (const [fieldName, filterValue] of Object.entries(customFilters)) {
          if (!filterValue || filterValue === '' || filterValue === 'all') {
            continue;
          }

          const materialValue = getFieldValue(material, fieldName);
          if (materialValue === undefined || materialValue === null) {
            return false;
          }

          if (String(materialValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    // Aplicar búsqueda global
    if (search) {
      const searchFields: string[] = ['name', 'code', 'description'];

      for (const field of this.gridFields()) {
        if (field.name === 'name' || field.name === 'code' || field.name === 'description') {
          continue;
        }
        searchFields.push(`customFields.${field.name}`);
      }

      materials = filterData(materials, search, searchFields);
    }

    // Aplicar ordenamiento
    if (sort.field) {
      const allFields = this.gridFields();
      const sortField = allFields.find(f => f.name === sort.field);

      materials = [...materials].sort((a, b) => {
        let aValue = getFieldValue(a, sort.field);
        let bValue = getFieldValue(b, sort.field);

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        let comparison = 0;

        if (sortField) {
          if (sortField.type === 'number' || sortField.type === 'currency') {
            comparison = Number(aValue) - Number(bValue);
          } else if (sortField.type === 'date') {
            const aDate = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
            const bDate = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
            comparison = aDate - bDate;
          } else if (sortField.type === 'checkbox') {
            comparison = (aValue === true ? 1 : 0) - (bValue === true ? 1 : 0);
          } else {
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            comparison = aStr.localeCompare(bStr);
          }
        } else {
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }

        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return materials;
  });

  paginatedMaterials = computed(() => {
    return paginateData(
      this.filteredMaterials(),
      this.currentPage(),
      this.itemsPerPage()
    );
  });

  totalPages = computed(() => {
    const total = this.filteredMaterials().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  // Alias para compatibilidad con template
  materials = this.materialsService.materials;
  config = this.configService.config;

  genericConfig = computed(() => {
    const materialConfig = this.config();
    return materialConfig ? createGenericConfig(materialConfig) : null;
  });

  constructor() {
    super();

    // Effect para actualizar tabla cuando cambien las columnas visibles
    effect(() => {
      if (this.templatesReady()) {
        const fields = this.visibleGridFields();
        this.updateTableConfig();
      }
    });
  }

  override async ngOnInit() {
    super.ngOnInit();

    this.isLoading.set(true);
    await Promise.all([
      this.configService.initialize(),
      this.materialsService.initialize()
    ]);

    const config = this.config();
    if (config?.gridConfig) {
      this.itemsPerPage.set(config.gridConfig.itemsPerPage || 10);
    }

    this.isLoading.set(false);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.templatesReady.set(true);
      this.cdr.detectChanges();
    }, 0);
  }

  /**
   * Actualizar configuración de la tabla
   */
  private updateTableConfig() {
    const config = this.config();
    const enableBulkActions = config?.gridConfig?.enableBulkActions !== false;

    this.tableConfig.set({
      columns: this.buildTableColumns(),
      selectable: enableBulkActions ? 'multiple' : false,
      showSelectAll: enableBulkActions,
      clickableRows: false,
      hoverEffect: true,
      sortable: true,
      themeColor: 'green',
      emptyMessage: this.searchTerm() && this.searchTerm().length >= 2
        ? 'No se encontraron materiales con esos criterios'
        : 'Comienza agregando tu primer material',
      emptyIcon: 'inventory_2',
      loadingMessage: 'Cargando materiales...'
    });
  }

  /**
   * Construir columnas de la tabla
   */
  private buildTableColumns(): TableColumn<Material>[] {
    const columns: TableColumn<Material>[] = [];

    // Columnas dinámicas desde configuración
    for (const field of this.visibleGridFields()) {
      columns.push({
        id: field.id,
        label: field.label,
        field: field.name as keyof Material,
        width: field.gridConfig.gridWidth || 'auto',
        sortable: field.gridConfig?.sortable === true,
        valueFormatter: (value, row) => formatFieldValue(value, field)
      });
    }

    // Columna de Estado
    columns.push({
      id: 'status',
      label: 'Estado',
      field: 'isActive',
      width: '120px',
      cellTemplate: this.statusColumnTemplate,
      cellAlign: 'left',
      sortable: false
    });

    // Columna de Acciones
    columns.push({
      id: 'actions',
      label: 'Acciones',
      width: '80px',
      cellTemplate: this.actionsColumnTemplate,
      cellAlign: 'right',
      sortable: false
    });

    return columns;
  }

  /**
   * Override para actualizar mensaje de empty state
   */
  override onSearch(term: string): void {
    super.onSearch(term);

    const currentConfig = this.tableConfig();
    this.tableConfig.set({
      ...currentConfig,
      emptyMessage: term && term.length >= 2
        ? 'No se encontraron materiales con esos criterios'
        : 'Comienza agregando tu primer material'
    });
  }

  // ==============================================
  // MÉTODOS ESPECÍFICOS DE MATERIALES
  // ==============================================

  /**
   * Crear nuevo material
   */
  createMaterial(): void {
    this.router.navigate(['/modules/materials/new']);
  }

  /**
   * Editar material
   */
  editMaterial(material: Material): void {
    this.router.navigate(['/modules/materials', material.id, 'edit']);
  }

  /**
   * Toggle activo/inactivo
   */
  async toggleActive(material: Material): Promise<void> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser?.uid) {
      this.snackBar.open('Usuario no autenticado', 'Cerrar', { duration: 3000 });
      return;
    }

    const newStatus = !material.isActive;
    const result = await this.materialsService.toggleActive(material.id, newStatus, currentUser.uid);

    if (result.success) {
      this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
    } else {
      this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
    }
  }

  /**
   * Eliminar material
   */
  async deleteMaterial(material: Material): Promise<void> {
    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      data: {
        entity: material as any,
        config: config
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.materialsService.deleteMaterial(material.id);
        if (deleteResult.success) {
          this.snackBar.open('Material eliminado exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  /**
   * Eliminar materiales seleccionados
   */
  async deleteSelectedMaterials(): Promise<void> {
    const selectedArray = Array.from(this.selectedIds()) as string[];

    if (selectedArray.length === 0) {
      this.snackBar.open('Selecciona al menos un material', 'Cerrar', { duration: 3000 });
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.materials().filter(m => selectedArray.includes(m.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      data: {
        entities: selectedList as any[],
        count: selectedList.length,
        config: config
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.materialsService.deleteMultipleMaterials(selectedArray);

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedIds.set(new Set());
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  /**
   * Refrescar datos
   */
  async refreshData(): Promise<void> {
    this.isLoading.set(true);
    await this.materialsService.initialize();
    this.isLoading.set(false);
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  /**
   * Exportar a CSV (usa método de base)
   */
  override exportToCSV(): void {
    super.exportToCSV(this.filteredMaterials(), 'materiales');
  }

  /**
   * Exportar a JSON (usa método de base)
   */
  override exportToJSON(): void {
    super.exportToJSON(this.filteredMaterials(), 'materiales');
  }

  /**
   * Obtener cantidad de materiales activos
   */
  getActiveMaterialsCount(): number {
    return this.materials().filter(m => m.isActive).length;
  }
}
