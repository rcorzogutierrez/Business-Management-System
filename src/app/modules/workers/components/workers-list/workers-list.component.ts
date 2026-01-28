import { Component, OnInit, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
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
import { GenericListBaseComponent } from '../../../../shared/components/generic-list-base/generic-list-base.component';
import { FieldConfig } from '../../../../shared/modules/dynamic-form-builder/models';

/**
 * Componente de listado de Workers
 * Ahora hereda de GenericListBaseComponent para reutilizar funcionalidad común
 */
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
  styleUrl: './workers-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkersListComponent extends GenericListBaseComponent<Worker> implements OnInit {
  // Implementar propiedades abstractas requeridas por la base
  configService = inject(WorkersConfigService);
  override storageKey = 'workers-visible-columns';
  override modulePath = '/modules/workers';

  // Servicios específicos de workers
  private workersService = inject(WorkersService);
  private authService = inject(AuthService);
  private companiesService = inject(CompaniesService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBarService = inject(MatSnackBar);

  // Proveer datos requeridos por la clase base
  data = this.workersService.workers;

  // gridFields para workers (hardcoded ya que no usa configuración dinámica como clients/materials)
  gridFields = computed<FieldConfig[]>(() => {
    return [
      { id: 'fullName', name: 'fullName', label: 'Nombre', type: 'text', isActive: true, gridConfig: { showInGrid: true, filterable: false } },
      { id: 'workerType', name: 'workerType', label: 'Tipo', type: 'text', isActive: true, gridConfig: { showInGrid: true, filterable: false } },
      { id: 'phone', name: 'phone', label: 'Teléfono', type: 'phone', isActive: true, gridConfig: { showInGrid: true, filterable: false } },
      { id: 'companyName', name: 'companyName', label: 'Empresa', type: 'text', isActive: true, gridConfig: { showInGrid: true, filterable: false } },
      { id: 'isActive', name: 'isActive', label: 'Estado', type: 'boolean', isActive: true, gridConfig: { showInGrid: true, filterable: false } }
    ] as FieldConfig[];
  });

  // Filtros específicos de workers
  filterType = signal<WorkerType | 'all'>('all');
  filterCompanyId = signal<string | null>(null);
  filterCompanyName = signal<string | null>(null);

  // Estado de carga específico de workers
  isLoading = this.workersService.isLoading;

  // Labels para tipos
  workerTypeLabels = WORKER_TYPE_LABELS;

  // Math para templates
  Math = Math;

  // Computed para verificar si el usuario es admin
  isAdmin = computed(() => {
    const user = this.authService.authorizedUser();
    return user?.role === 'admin';
  });

  // Exponer configuración del servicio para uso reactivo en el template
  config = this.workersConfigService.config;

  // Workers paginados (override del base para aplicar filtros específicos)
  paginatedWorkers = computed(() => {
    let workers = this.data();
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

    // Aplicar paginación
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return workers.slice(start, end);
  });

  // Total de páginas (override del base)
  override totalPages = computed(() => {
    let workers = this.data();
    const search = this.searchTerm().toLowerCase();
    const typeFilter = this.filterType();
    const companyId = this.filterCompanyId();

    // Filtrar por empresa
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

    const perPage = this.itemsPerPage();
    return Math.ceil(workers.length / perPage);
  });

  // Workers filtrados (para stats y export)
  filteredWorkers = computed(() => {
    let workers = this.data();
    const search = this.searchTerm().toLowerCase();
    const typeFilter = this.filterType();
    const companyId = this.filterCompanyId();

    // Filtrar por empresa
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

  // Alias para selectedWorkers (compatibilidad con template)
  selectedWorkers = computed(() => Array.from(this.selectedIds()));

  constructor() {
    super();

    // Effect para resetear página cuando cambia itemsPerPage
    effect(() => {
      const itemsPerPageValue = this.itemsPerPage();
      this.currentPage.set(0);
    });
  }

  override async ngOnInit() {
    super.ngOnInit();

    // Cargar configuración y trabajadores en paralelo
    await Promise.all([
      this.workersService.initialize(),
      this.configService.initialize()
    ]);

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
  }

  // === MÉTODOS ESPECÍFICOS DE WORKERS ===

  clearCompanyFilter() {
    this.filterCompanyId.set(null);
    this.filterCompanyName.set(null);
    // Limpiar queryParams de la URL
    this.router.navigate(['/modules/workers']);
  }

  setFilterType(type: WorkerType | 'all') {
    this.filterType.set(type);
    this.currentPage.set(0);
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

  async toggleActive(worker: Worker) {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser?.uid) {
      this.snackBarService.open('Usuario no autenticado', 'Cerrar', { duration: 3000 });
      return;
    }

    const newStatus = !worker.isActive;
    const result = await this.workersService.toggleActive(worker.id, newStatus, currentUser.uid);

    if (result.success) {
      this.snackBarService.open(result.message, 'Cerrar', { duration: 3000 });
    } else {
      this.snackBarService.open(result.message, 'Cerrar', { duration: 4000 });
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
          this.snackBarService.open('Trabajador eliminado exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBarService.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  async deleteSelectedWorkers() {
    const selectedIds = Array.from(this.selectedIds());
    if (selectedIds.length === 0) {
      this.snackBarService.open('Selecciona al menos un trabajador', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.data().filter(w => selectedIds.includes(w.id));

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
        const deleteResult = await this.workersService.deleteMultipleWorkers(selectedIds as string[]);

        if (deleteResult.success) {
          this.snackBarService.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedIds.set(new Set());
        } else {
          this.snackBarService.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(workerId: string) {
    const selected = new Set(this.selectedIds());
    if (selected.has(workerId)) {
      selected.delete(workerId);
    } else {
      selected.add(workerId);
    }
    this.selectedIds.set(selected);
  }

  isSelected(workerId: string): boolean {
    return this.selectedIds().has(workerId);
  }

  toggleSelectAll() {
    const selected = this.selectedIds();
    const paginated = this.paginatedWorkers();

    if (selected.size === paginated.length) {
      this.clearSelection();
    } else {
      this.selectedIds.set(new Set(paginated.map(worker => worker.id)));
    }
  }

  isAllSelected(): boolean {
    const selected = this.selectedIds();
    const paginated = this.paginatedWorkers();
    return paginated.length > 0 && selected.size === paginated.length;
  }

  isIndeterminate(): boolean {
    const selected = this.selectedIds();
    const paginated = this.paginatedWorkers();
    return selected.size > 0 && selected.size < paginated.length;
  }

  override async refreshData() {
    await this.workersService.forceReload();
    this.snackBarService.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  trackById(index: number, worker: Worker): string {
    return worker.id;
  }

  getActiveWorkers(): Worker[] {
    return this.data().filter(w => w.isActive);
  }

  getActiveWorkersCount(): number {
    return this.getActiveWorkers().length;
  }

  getInternalCount(): number {
    return this.data().filter(w => w.workerType === 'internal').length;
  }

  getContractorCount(): number {
    return this.data().filter(w => w.workerType === 'contractor').length;
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

  // Verificar si una columna está visible (compatibilidad con template)
  isColumnVisible(columnId: string): boolean {
    return this.visibleColumnIds().includes(columnId);
  }

  // ==========================================
  // MÉTODOS DE EXPORTACIÓN (usar los de base)
  // ==========================================

  exportToCSV(): void {
    const workers = this.filteredWorkers();
    super.exportToCSV(workers, 'trabajadores');
  }

  exportToJSON(): void {
    const workers = this.filteredWorkers();
    super.exportToJSON(workers, 'trabajadores');
  }
}
