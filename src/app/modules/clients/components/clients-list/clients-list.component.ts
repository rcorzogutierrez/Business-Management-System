// src/app/modules/clients/components/clients-list/clients-list.component.ts

import { Component, AfterViewInit, inject, signal, computed, effect, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ClientsService } from '../../services/clients.service';
import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GenericSearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { GenericDataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ColumnVisibilityControlComponent } from '../../../../shared/components/column-visibility-control/column-visibility-control.component';
import { Client } from '../../models';
import { createGenericConfig } from '../../clients-config';
import { TableColumn, TableConfig } from '../../../../shared/components/data-table/models';
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
import { filterData, paginateData } from '../../../../shared/utils';
import { GenericListBaseComponent } from '../../../../shared/components/generic-list-base/generic-list-base.component';

/**
 * Componente de listado de Clientes
 * Hereda toda la lógica común de GenericListBaseComponent
 * Solo contiene lógica específica de clientes
 */
@Component({
  selector: 'app-clients-list',
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
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css'
})
export class ClientsListComponent extends GenericListBaseComponent<Client> implements AfterViewInit {
  // Implementar propiedades abstractas requeridas
  configService = inject(ClientConfigServiceRefactored);
  override storageKey = 'clients-visible-columns';
  override modulePath = '/modules/clients';

  // Servicios específicos de clientes
  private clientsService = inject(ClientsService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // Proveer datos requeridos por la clase base
  data = this.clientsService.clients;
  gridFields = computed(() => this.configService.getGridFields());

  // Templates para columnas personalizadas
  @ViewChild('statusColumn') statusColumnTemplate!: TemplateRef<any>;
  @ViewChild('actionsColumn') actionsColumnTemplate!: TemplateRef<any>;

  // Estado específico de clientes
  isLoading = this.clientsService.isLoading;
  stats = this.clientsService.stats;
  templatesReady = signal(false);

  // Alias para compatibilidad con el template (usa selectedIds de la base, pero expone como selectedClients)
  selectedClients = this.selectedIds;

  // Computed para verificar si el usuario es admin
  isAdmin = computed(() => {
    const user = this.authService.authorizedUser();
    return user?.role === 'admin';
  });

  // Configuración de la tabla
  tableConfig = signal<TableConfig<Client>>({
    columns: [],
    selectable: 'multiple',
    showSelectAll: true,
    clickableRows: false,
    hoverEffect: true,
    themeColor: 'blue',
    emptyMessage: 'Comienza agregando tu primer cliente',
    emptyIcon: 'groups',
    loadingMessage: 'Cargando clientes...'
  });

  // Datos filtrados y paginados (específicos del tipo Client)
  filteredClients = computed(() => {
    let clients = this.clients();
    const search = this.searchTerm();
    const customFilters = this.customFieldFilters();
    const sort = this.currentSort();

    // Aplicar filtros personalizados
    if (Object.keys(customFilters).length > 0) {
      clients = clients.filter(client => {
        for (const [fieldName, filterValue] of Object.entries(customFilters)) {
          if (!filterValue || filterValue === '' || filterValue === 'all') {
            continue;
          }

          const clientValue = getFieldValue(client, fieldName);
          if (clientValue === undefined || clientValue === null) {
            return false;
          }

          if (String(clientValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    // Aplicar búsqueda global
    if (search) {
      const searchFields: string[] = ['name', 'email', 'phone'];

      for (const field of this.gridFields()) {
        if (field.name === 'name' || field.name === 'email' || field.name === 'phone') {
          continue;
        }
        searchFields.push(`customFields.${field.name}`);
      }

      clients = filterData(clients, search, searchFields);
    }

    // Aplicar ordenamiento
    if (sort.field) {
      const allFields = this.gridFields();
      const sortField = allFields.find(f => f.name === sort.field);

      clients = [...clients].sort((a, b) => {
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

    return clients;
  });

  paginatedClients = computed(() => {
    return paginateData(
      this.filteredClients(),
      this.currentPage(),
      this.itemsPerPage()
    );
  });

  totalPages = computed(() => {
    const total = this.filteredClients().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  // Alias para compatibilidad con template
  clients = this.clientsService.clients;
  config = this.configService.config;

  genericConfig = computed(() => {
    const clientConfig = this.config();
    return clientConfig ? createGenericConfig(clientConfig) : null;
  });

  // Exponer funciones de formateo para uso en template
  formatFieldValue = formatFieldValue;
  getFieldValue = getFieldValue;

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

    await Promise.all([
      this.configService.initialize(),
      this.clientsService.initialize()
    ]);

    // itemsPerPage ahora es un computed que se sincroniza automáticamente con la config
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
      themeColor: 'blue',
      emptyMessage: this.searchTerm() && this.searchTerm().length >= 2
        ? 'No se encontraron clientes con esos criterios'
        : 'Comienza agregando tu primer cliente',
      emptyIcon: 'groups',
      loadingMessage: 'Cargando clientes...'
    });
  }

  /**
   * Construir columnas de la tabla
   */
  private buildTableColumns(): TableColumn<Client>[] {
    const columns: TableColumn<Client>[] = [];

    // Columnas dinámicas desde configuración
    for (const field of this.visibleGridFields()) {
      columns.push({
        id: field.id,
        label: field.label,
        field: field.name as keyof Client,
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
        ? 'No se encontraron clientes con esos criterios'
        : 'Comienza agregando tu primer cliente'
    });
  }

  // ==============================================
  // MÉTODOS ESPECÍFICOS DE CLIENTES
  // ==============================================

  /**
   * Crear nuevo cliente
   */
  createClient(): void {
    this.router.navigate(['/modules/clients/new']);
  }

  /**
   * Editar cliente
   */
  editClient(client: Client): void {
    this.router.navigate(['/modules/clients', client.id, 'edit']);
  }

  /**
   * Ver detalles del cliente
   */
  viewClient(client: Client): void {
    this.router.navigate(['/modules/clients', client.id]);
  }

  /**
   * Eliminar cliente
   */
  async deleteClient(client: Client): Promise<void> {
    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      data: {
        entity: client as any,
        config: config
      },
      width: '600px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        await this.clientsService.deleteClient(client.id);
        this.snackBar.open('Cliente eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        this.snackBar.open('Error al eliminar el cliente', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Eliminar clientes seleccionados
   */
  async deleteSelectedClients(): Promise<void> {
    const selectedIds = this.selectedClients();

    if (selectedIds.size === 0) {
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const clients = this.clients().filter(c => selectedIds.has(c.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      data: {
        entities: clients as any[],
        count: clients.length,
        config: config
      },
      width: '800px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        await Promise.all(Array.from(selectedIds).map(id => this.clientsService.deleteClient(id as string)));
        this.selectedClients.set(new Set());
        this.snackBar.open(`${clients.length} cliente(s) eliminado(s) exitosamente`, 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando clientes:', error);
        this.snackBar.open('Error al eliminar los clientes', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Toggle estado activo/inactivo
   */
  async toggleClientStatus(client: Client): Promise<void> {
    try {
      await this.clientsService.toggleClientStatus(client.id, !client.isActive);
      const status = !client.isActive ? 'activado' : 'desactivado';
      this.snackBar.open(`Cliente ${status} exitosamente`, 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error cambiando estado del cliente:', error);
      this.snackBar.open('Error al cambiar el estado', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Refrescar datos (implementación requerida por la base)
   */
  async refreshData(): Promise<void> {
    try {
      await this.clientsService.refresh();
      this.snackBar.open('Lista actualizada', 'Cerrar', { duration: 2000 });
    } catch (error) {
      console.error('Error refrescando lista:', error);
      this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Alias para compatibilidad con template
   */
  refresh(): Promise<void> {
    return this.refreshData();
  }

  /**
   * Exportar a CSV (usa método de base)
   */
  override exportToCSV(): void {
    super.exportToCSV(this.filteredClients(), 'clientes');
  }

  /**
   * Exportar a JSON (usa método de base)
   */
  override exportToJSON(): void {
    super.exportToJSON(this.filteredClients(), 'clientes');
  }

  /**
   * Seleccionar/deseleccionar cliente
   */
  toggleClientSelection(clientId: string): void {
    const selected = new Set(this.selectedClients());
    if (selected.has(clientId)) {
      selected.delete(clientId);
    } else {
      selected.add(clientId);
    }
    this.selectedClients.set(selected);
  }

  /**
   * Seleccionar/deseleccionar todos
   */
  toggleSelectAll(): void {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();

    if (selected.size === paginated.length && paginated.length > 0) {
      this.selectedClients.set(new Set());
    } else {
      this.selectedClients.set(new Set(paginated.map(c => c.id)));
    }
  }

  /**
   * Verificar si está seleccionado
   */
  isSelected(clientId: string): boolean {
    return this.selectedClients().has(clientId);
  }

  /**
   * Verificar si todos están seleccionados
   */
  isAllSelected(): boolean {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();
    return paginated.length > 0 && selected.size === paginated.length;
  }

  /**
   * Verificar si hay selección parcial
   */
  isIndeterminate(): boolean {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();
    return selected.size > 0 && selected.size < paginated.length;
  }
}
