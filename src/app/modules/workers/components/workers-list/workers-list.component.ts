import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Router, ActivatedRoute } from '@angular/router';

import { WorkersService, WorkersConfigService } from '../../services';
import { Worker, WORKER_TYPE_LABELS, WorkerType } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { AuthService } from '../../../../core/services/auth.service';
import { GenericModuleConfig } from '../../../../shared/models/generic-entity.interface';
import { CompaniesListDialogComponent } from '../companies-list-dialog/companies-list-dialog.component';
import { CompaniesService } from '../../companies/services/companies.service';
import { ColumnVisibilityControlComponent, ColumnOption } from '../../../../shared/components/column-visibility-control/column-visibility-control.component';

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDividerModule,
    MatChipsModule,
    MatDialogModule,
    ColumnVisibilityControlComponent
  ],
  templateUrl: './workers-list.component.html',
  styleUrl: './workers-list.component.css'
})
export class WorkersListComponent implements OnInit {
  searchTerm = signal<string>('');
  selectedWorkers = signal<string[]>([]);
  isLoading = false;
  filterType = signal<WorkerType | 'all'>('all');
  filterCompanyId = signal<string | null>(null);
  filterCompanyName = signal<string | null>(null);

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(25); // Se actualiza desde gridConfig en ngOnInit

  // Math para templates
  Math = Math;

  // Labels para tipos
  workerTypeLabels = WORKER_TYPE_LABELS;

  workers = this.workersService.workers;

  // === COLUMNAS VISIBLES ===
  // Columnas disponibles (hardcoded)
  private readonly AVAILABLE_COLUMNS = [
    { id: 'fullName', label: 'Nombre', alwaysVisible: true },
    { id: 'workerType', label: 'Tipo', alwaysVisible: false },
    { id: 'phone', label: 'Teléfono', alwaysVisible: false },
    { id: 'companyName', label: 'Empresa', alwaysVisible: false },
    { id: 'isActive', label: 'Estado', alwaysVisible: false }
  ];

  // Columnas por defecto (visible al inicio)
  private readonly DEFAULT_VISIBLE_COLUMNS = ['fullName', 'workerType', 'phone', 'isActive'];

  // Signal para columnas visibles (inicializar desde localStorage)
  visibleColumnIds = signal<string[]>(this.loadVisibleColumnsFromStorage());

  // Opciones de columnas para el control de visibilidad
  columnOptions = computed<ColumnOption[]>(() => {
    const visible = this.visibleColumnIds();
    return this.AVAILABLE_COLUMNS.map(col => ({
      id: col.id,
      label: col.label,
      visible: visible.includes(col.id),
      disabled: col.alwaysVisible // fullName siempre visible
    }));
  });

  // Computed para verificar si el usuario es admin
  isAdmin = computed(() => {
    const user = this.authService.authorizedUser();
    return user?.role === 'admin';
  });

  // Workers filtrados
  filteredWorkers = computed(() => {
    let workers = this.workers();
    const search = this.searchTerm().toLowerCase();
    const typeFilter = this.filterType();
    const companyId = this.filterCompanyId();

    // Filtrar por empresa (companyId)
    if (companyId) {
      workers = workers.filter(w => w.companyId === companyId);
    }

    // Filtrar por tipo
    if (typeFilter !== 'all') {
      workers = workers.filter(w => w.workerType === typeFilter);
    }

    // Filtrar por búsqueda
    if (search) {
      workers = workers.filter(worker => {
        if (worker.fullName?.toLowerCase().includes(search)) return true;
        if (worker.phone?.includes(search)) return true;
        if (worker.idOrLicense?.toLowerCase().includes(search)) return true;
        if (worker.companyName?.toLowerCase().includes(search)) return true;
        if (worker.address?.toLowerCase().includes(search)) return true;
        return false;
      });
    }

    return workers;
  });

  // Workers paginados
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

  // Config para diálogos de eliminación
  genericConfig: GenericModuleConfig = {
    collection: 'workers',
    entityName: 'Trabajador',
    entityNamePlural: 'Trabajadores',
    fields: [
      { name: 'fullName', label: 'Nombre', showInGrid: true, showInDelete: true },
      { name: 'phone', label: 'Teléfono', type: 'phone', showInGrid: true, showInDelete: true },
      { name: 'companyName', label: 'Empresa', showInGrid: true, showInDelete: true }
    ],
    searchFields: ['fullName', 'phone', 'companyName'],
    deleteDialogFieldsCount: 3
  };

  constructor(
    private workersService: WorkersService,
    private workersConfigService: WorkersConfigService,
    private companiesService: CompaniesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.isLoading = true;

    // Cargar configuración y trabajadores en paralelo
    await Promise.all([
      this.workersService.initialize(),
      this.workersConfigService.initialize()
    ]);

    // Aplicar itemsPerPage desde config.gridConfig
    const config = this.workersConfigService.config();
    if (config?.gridConfig?.itemsPerPage) {
      this.itemsPerPage.set(config.gridConfig.itemsPerPage);
    }

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
    });

    this.isLoading = false;
  }

  // === MÉTODOS DE COLUMNAS VISIBLES ===

  /**
   * Cargar columnas visibles desde localStorage
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
        console.error('Error cargando columnas desde localStorage:', error);
      }
    }

    // Retornar columnas por defecto si no hay nada en localStorage
    return this.DEFAULT_VISIBLE_COLUMNS;
  }

  /**
   * Manejar cambio de visibilidad de columnas
   */
  onColumnVisibilityChange(visibleIds: string[]) {
    // Asegurar que fullName siempre esté visible
    if (!visibleIds.includes('fullName')) {
      visibleIds.unshift('fullName');
    }

    this.visibleColumnIds.set(visibleIds);
  }

  /**
   * Verificar si una columna está visible
   */
  isColumnVisible(columnId: string): boolean {
    return this.visibleColumnIds().includes(columnId);
  }

  // === MÉTODOS EXISTENTES ===

  clearCompanyFilter() {
    this.filterCompanyId.set(null);
    this.filterCompanyName.set(null);
    // Limpiar queryParams de la URL
    this.router.navigate(['/modules/workers']);
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0);
  }

  setFilterType(type: WorkerType | 'all') {
    this.filterType.set(type);
    this.currentPage.set(0);
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  createWorker() {
    this.router.navigate(['/modules/workers/new']);
  }

  editWorker(worker: Worker) {
    this.router.navigate(['/modules/workers', worker.id, 'edit']);
  }

  viewWorker(worker: Worker) {
    this.router.navigate(['/modules/workers', worker.id]);
  }

  goToConfig() {
    this.router.navigate(['/modules/workers/config']);
  }

  async toggleActive(worker: Worker) {
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
  }

  async deleteWorker(worker: Worker) {
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      data: {
        entity: worker as any,
        config: this.genericConfig
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.workersService.deleteWorker(worker.id);
        if (deleteResult.success) {
          this.snackBar.open('Trabajador eliminado exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  async deleteSelectedWorkers() {
    const selectedIds = this.selectedWorkers();
    if (selectedIds.length === 0) {
      this.snackBar.open('Selecciona al menos un trabajador', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.workers().filter(w => selectedIds.includes(w.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      data: {
        entities: selectedList as any[],
        count: selectedList.length,
        config: this.genericConfig
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.workersService.deleteMultipleWorkers(selectedIds);

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedWorkers.set([]);
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(workerId: string) {
    const selected = this.selectedWorkers();
    if (selected.includes(workerId)) {
      this.selectedWorkers.set(selected.filter(id => id !== workerId));
    } else {
      this.selectedWorkers.set([...selected, workerId]);
    }
  }

  isSelected(workerId: string): boolean {
    return this.selectedWorkers().includes(workerId);
  }

  toggleSelectAll() {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();

    if (selected.length === paginated.length) {
      this.clearSelection();
    } else {
      this.selectedWorkers.set(paginated.map(worker => worker.id));
    }
  }

  isAllSelected(): boolean {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();
    return paginated.length > 0 && selected.length === paginated.length;
  }

  isIndeterminate(): boolean {
    const selected = this.selectedWorkers();
    const paginated = this.paginatedWorkers();
    return selected.length > 0 && selected.length < paginated.length;
  }

  clearSelection() {
    this.selectedWorkers.set([]);
  }

  async refreshData() {
    this.isLoading = true;
    await this.workersService.forceReload();
    this.isLoading = false;
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  trackById(index: number, worker: Worker): string {
    return worker.id;
  }

  getActiveWorkers(): Worker[] {
    return this.workers().filter(w => w.isActive);
  }

  getActiveWorkersCount(): number {
    return this.getActiveWorkers().length;
  }

  getInternalCount(): number {
    return this.workers().filter(w => w.workerType === 'internal').length;
  }

  getContractorCount(): number {
    return this.workers().filter(w => w.workerType === 'contractor').length;
  }

  getWorkerTypeBadgeClass(type: WorkerType): string {
    return type === 'internal'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';
  }

  openCompaniesDialog() {
    this.dialog.open(CompaniesListDialogComponent, {
      width: '750px',
      maxHeight: '90vh',
      disableClose: false
    });
  }
}
