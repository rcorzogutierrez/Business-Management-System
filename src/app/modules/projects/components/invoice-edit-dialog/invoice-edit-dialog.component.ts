// src/app/modules/projects/components/invoice-edit-dialog/invoice-edit-dialog.component.ts

import { Component, inject, signal, computed, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { Proposal, SelectedMaterial, SelectedWorker } from '../../models';
import { ProposalsService } from '../../services/proposals.service';
import { ProposalConfigService } from '../../services/proposal-config.service';
import { MaterialsService } from '../../../materials/services/materials.service';
import { MaterialsConfigService } from '../../../materials/services/materials-config.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { LanguageService } from '../../../../core/services/language.service';
import { Material } from '../../../materials/models';
import { Worker } from '../../../workers/models';
import { MaterialMarkupCategory } from '../../models';
import { FieldType } from '../../../materials/models';
import { getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-invoice-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './invoice-edit-dialog.component.html',
  styleUrls: ['./invoice-edit-dialog.component.css']
})
export class InvoiceEditDialogComponent implements OnInit {
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<InvoiceEditDialogComponent>);
  private proposalsService = inject(ProposalsService);
  private proposalConfigService = inject(ProposalConfigService);
  private materialsService = inject(MaterialsService);
  private materialsConfigService = inject(MaterialsConfigService);
  private workersService = inject(WorkersService);
  private languageService = inject(LanguageService);
  private snackBar = inject(MatSnackBar);
  private elementRef = inject(ElementRef);
  public data = inject<{ proposal: Proposal }>(MAT_DIALOG_DATA);

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const materialDropdown = this.elementRef.nativeElement.querySelector('.material-search-container');
    const workerDropdown = this.elementRef.nativeElement.querySelector('.worker-search-container');

    if (materialDropdown && !materialDropdown.contains(target)) {
      this.closeMaterialDropdown();
    }
    if (workerDropdown && !workerDropdown.contains(target)) {
      this.closeWorkerDropdown();
    }
  }

  // Signals
  isSaving = signal(false);
  availableMaterials = signal<Material[]>([]);
  availableWorkers = signal<Worker[]>([]);
  markupCategories = signal<MaterialMarkupCategory[]>([]);
  markupEnabled = signal<boolean>(false);

  // Material search dropdown
  materialSearchTerm = signal<string>('');
  materialDropdownOpen = signal<boolean>(false);

  // Worker search dropdown
  workerSearchTerm = signal<string>('');
  workerDropdownOpen = signal<boolean>(false);

  // Filtered materials based on search term
  filteredMaterials = computed(() => {
    const materials = this.availableMaterials();
    const searchTerm = this.materialSearchTerm().toLowerCase().trim();

    if (!searchTerm) {
      return materials;
    }

    return materials.filter(material => {
      const name = this.getMaterialName(material).toLowerCase();
      return name.includes(searchTerm);
    });
  });

  // Filtered workers based on search term
  filteredWorkers = computed(() => {
    const workers = this.availableWorkers();
    const searchTerm = this.workerSearchTerm().toLowerCase().trim();

    if (!searchTerm) {
      return workers;
    }

    return workers.filter(worker => {
      const name = this.getWorkerName(worker).toLowerCase();
      return name.includes(searchTerm);
    });
  });

  // Form data
  language: 'es' | 'en' = 'es'; // Idioma del documento
  invoiceDate: string = '';
  workStartDate: string = '';
  workEndDate: string = '';
  workTime: number | null = null;
  customerName: string = '';
  notes: string = '';
  terms: string = '';
  showTermsInPrint: boolean = true;
  selectedMaterials: SelectedMaterial[] = [];
  selectedWorkers: SelectedWorker[] = [];
  selectedMarkupCategoryId: string | null = null;

  async ngOnInit() {
    try {
      await this.loadData();
      this.initFormData();
    } catch (error) {
      console.error('❌ Error en ngOnInit:', error);
    }
  }

  /**
   * Cuando cambia la categoría de markup, recalcular precios de materiales
   */
  onMarkupCategoryChange() {
    if (!this.markupEnabled() || !this.selectedMarkupCategoryId) {
      return;
    }

    const selectedCategory = this.markupCategories().find(c => c.id === this.selectedMarkupCategoryId);
    if (!selectedCategory) {
      return;
    }

    // Recalcular precio de cada material basado en su basePrice
    this.selectedMaterials = this.selectedMaterials.map(material => {
      let newPrice = material.basePrice;

      if (selectedCategory.percentage > 0) {
        const markupAmount = (material.basePrice * selectedCategory.percentage) / 100;
        newPrice = material.basePrice + markupAmount;
      }

      return {
        ...material,
        price: newPrice
      };
    });
  }

  /**
   * Cargar materiales y trabajadores disponibles
   */
  async loadData() {
    try {
      // Inicializar servicios en paralelo
      await Promise.all([
        this.proposalConfigService.initialize(),
        this.materialsConfigService.initialize(),
        this.materialsService.initialize(),
        this.workersService.initialize()
      ]);

      // Los signals de los servicios ya están actualizados después de initialize()
      // Simplemente leemos los valores actuales
      const materials = this.materialsService.activeMaterials();
      const workers = this.workersService.activeWorkers();

      this.availableMaterials.set(materials);
      this.availableWorkers.set(workers);

      // Cargar configuración de markup
      this.markupEnabled.set(this.proposalConfigService.isMarkupEnabled());
      if (this.markupEnabled()) {
        const activeCategories = this.proposalConfigService.getActiveMarkupCategories();
        this.markupCategories.set(activeCategories);
      }

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error al cargar materiales y trabajadores', 'Cerrar', {
        duration: 3000
      });
      throw error;
    }
  }

  /**
   * Inicializar datos del formulario con los datos existentes del proposal
   */
  initFormData() {
    const proposal = this.data.proposal;

    // Idioma del documento (heredar del proposal o usar español por defecto)
    this.language = proposal.language || 'es';

    // Fecha de factura (si existe, cargar; si no, usar fecha actual)
    if (proposal.invoiceDate) {
      const date = proposal.invoiceDate.toDate();
      this.invoiceDate = date.toISOString().split('T')[0];
    } else {
      // Usar fecha actual por defecto
      this.invoiceDate = new Date().toISOString().split('T')[0];
    }

    // Fechas de trabajo
    if (proposal.workStartDate) {
      const date = proposal.workStartDate.toDate();
      this.workStartDate = date.toISOString().split('T')[0];
    }
    if (proposal.workEndDate) {
      const date = proposal.workEndDate.toDate();
      this.workEndDate = date.toISOString().split('T')[0];
    }

    // Tiempo de trabajo
    this.workTime = proposal.workTime || null;

    // Cliente final, notas y términos
    this.customerName = proposal.customerName || '';
    this.notes = proposal.notes || '';
    this.terms = proposal.terms || '';
    this.showTermsInPrint = proposal.showTermsInPrint !== false;

    // Materiales
    if (proposal.materialsUsed && proposal.materialsUsed.length > 0) {
      this.selectedMaterials = proposal.materialsUsed.map(m => ({
        materialId: m.id,
        materialName: m.material,
        amount: m.amount,
        // Si existe basePrice guardado (nuevo sistema), usarlo; sino usar price como fallback (facturas antiguas)
        basePrice: (m as any).basePrice !== undefined ? (m as any).basePrice : m.price,
        price: m.price  // El precio que se muestra y edita
      }));
    }

    // Trabajadores
    if (proposal.workers && proposal.workers.length > 0) {
      this.selectedWorkers = proposal.workers.map(w => ({
        workerId: w.id,
        workerName: w.name
      }));
    }

    // Categoría de markup
    if (proposal.materialMarkupCategoryId) {
      this.selectedMarkupCategoryId = proposal.materialMarkupCategoryId;
    } else if (this.markupEnabled()) {
      // Si no hay categoría seleccionada, usar la por defecto
      const defaultCategory = this.proposalConfigService.getDefaultMarkupCategory();
      this.selectedMarkupCategoryId = defaultCategory?.id || null;
    }

  }

  async openAddMaterialDialog() {
    const { AddMaterialDialogComponent } = await import('../add-material-dialog/add-material-dialog.component');
    const dialogRef = this.dialog.open(AddMaterialDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((newMaterial: Material | undefined) => {
      if (newMaterial) {
        this.availableMaterials.set(this.materialsService.activeMaterials());
        this.addMaterial(newMaterial.id!);
      }
    });
  }

  /**
   * Agregar material seleccionado
   */
  addMaterial(materialId: string) {
    if (!materialId) {
      return;
    }

    const material = this.availableMaterials().find(m => m.id === materialId);
    if (!material) {
      console.error('  ❌ Material no encontrado:', materialId);
      return;
    }

    // Obtener nombre y precio base del material usando campos dinámicos
    const materialName = this.getMaterialName(material);
    const basePrice = this.getMaterialPrice(material);

    // Verificar si ya está agregado
    const exists = this.selectedMaterials.find(m => m.materialId === materialId);
    if (exists) {
      this.snackBar.open('Este material ya está agregado', 'Cerrar', { duration: 2000 });
      return;
    }

    // Calcular precio con markup si hay categoría seleccionada
    let appliedPrice = basePrice;
    if (this.markupEnabled() && this.selectedMarkupCategoryId) {
      const selectedCategory = this.markupCategories().find(c => c.id === this.selectedMarkupCategoryId);
      if (selectedCategory && selectedCategory.percentage > 0) {
        const markupAmount = (basePrice * selectedCategory.percentage) / 100;
        appliedPrice = basePrice + markupAmount;
      }
    }

    this.selectedMaterials.push({
      materialId: material.id!,
      materialName: materialName,
      amount: 1,
      basePrice: basePrice,        // Precio original
      price: appliedPrice           // Precio con markup (editable)
    });

  }

  /**
   * Eliminar material
   */
  removeMaterial(index: number) {
    this.selectedMaterials.splice(index, 1);
  }

  /**
   * Open material dropdown
   */
  openMaterialDropdown(): void {
    this.materialDropdownOpen.set(true);
  }

  /**
   * Close material dropdown
   */
  closeMaterialDropdown(): void {
    this.materialDropdownOpen.set(false);
    this.materialSearchTerm.set('');
  }

  /**
   * Handle material search input
   */
  onMaterialSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.materialSearchTerm.set(input.value);
    if (!this.materialDropdownOpen()) {
      this.materialDropdownOpen.set(true);
    }
  }

  /**
   * Select material from dropdown
   */
  selectMaterial(materialId: string): void {
    this.addMaterial(materialId);
    this.closeMaterialDropdown();
  }

  /**
   * Open worker dropdown
   */
  openWorkerDropdown(): void {
    this.workerDropdownOpen.set(true);
  }

  /**
   * Close worker dropdown
   */
  closeWorkerDropdown(): void {
    this.workerDropdownOpen.set(false);
    this.workerSearchTerm.set('');
  }

  /**
   * Handle worker search input
   */
  onWorkerSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.workerSearchTerm.set(input.value);
    if (!this.workerDropdownOpen()) {
      this.workerDropdownOpen.set(true);
    }
  }

  /**
   * Select worker from dropdown
   */
  selectWorker(workerId: string): void {
    this.addWorker(workerId);
    this.closeWorkerDropdown();
  }

  /**
   * Agregar trabajador seleccionado
   */
  addWorker(workerId: string) {
    if (!workerId) {
      return;
    }

    const worker = this.availableWorkers().find(w => w.id === workerId);
    if (!worker) {
      console.error('  ❌ Trabajador no encontrado:', workerId);
      return;
    }

    // Obtener nombre del trabajador usando campos dinámicos
    const workerName = this.getWorkerName(worker);

    // Verificar si ya está agregado
    const exists = this.selectedWorkers.find(w => w.workerId === workerId);
    if (exists) {
      this.snackBar.open('Este trabajador ya está agregado', 'Cerrar', { duration: 2000 });
      return;
    }

    this.selectedWorkers.push({
      workerId: worker.id!,
      workerName: workerName
    });

  }

  /**
   * Eliminar trabajador
   */
  removeWorker(index: number) {
    this.selectedWorkers.splice(index, 1);
  }

  /**
   * Validar formulario
   */
  validate(): boolean {
    // Validar fecha de factura (requerida)
    if (!this.invoiceDate) {
      this.snackBar.open('Debes ingresar la fecha de emisión de la factura', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar fechas de trabajo (requeridas)
    if (!this.workStartDate) {
      this.snackBar.open('Debes ingresar la fecha de inicio del trabajo', 'Cerrar', { duration: 3000 });
      return false;
    }

    if (!this.workEndDate) {
      this.snackBar.open('Debes ingresar la fecha de finalización del trabajo', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar que fecha inicio no sea mayor a fecha fin
    const startDate = new Date(this.workStartDate);
    const endDate = new Date(this.workEndDate);
    if (startDate > endDate) {
      this.snackBar.open('La fecha de inicio no puede ser mayor a la fecha de finalización', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar horas trabajadas (requeridas)
    if (this.workTime === null || this.workTime === undefined || this.workTime <= 0) {
      this.snackBar.open('Debes ingresar las horas trabajadas (mayor a 0)', 'Cerrar', { duration: 3000 });
      return false;
    }

    if (this.selectedMaterials.length === 0) {
      this.snackBar.open('Debes agregar al menos un material', 'Cerrar', { duration: 3000 });
      return false;
    }

    if (this.selectedWorkers.length === 0) {
      this.snackBar.open('Debes agregar al menos un trabajador', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar que todos los materiales tengan cantidad y precio válidos
    for (const material of this.selectedMaterials) {
      if (!material.amount || material.amount <= 0) {
        this.snackBar.open(`El material "${material.materialName}" debe tener una cantidad mayor a 0`, 'Cerrar', {
          duration: 3000
        });
        return false;
      }

      // Permitir precio 0 (gratis), pero no null/undefined/negativo
      if (material.price === null || material.price === undefined || material.price < 0) {
        this.snackBar.open(`El material "${material.materialName}" debe tener un precio válido (mínimo 0)`, 'Cerrar', {
          duration: 3000
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Guardar cambios y cambiar estado a 'converted_to_invoice'
   */
  async save() {
    if (!this.validate()) {
      return;
    }

    try {
      this.isSaving.set(true);

      const updateData: any = {
        language: this.language,
        customerName: this.customerName.trim() || null,
        notes: this.notes.trim() || null,
        terms: this.terms.trim() || null,
        showTermsInPrint: this.showTermsInPrint,
        workers: this.selectedWorkers.map(w => ({
          id: w.workerId,
          name: w.workerName
        })),
        materialsUsed: this.selectedMaterials.map(m => ({
          id: m.materialId,
          material: m.materialName,
          amount: m.amount,
          price: m.price,  // El precio ya tiene el markup aplicado (si corresponde)
          basePrice: m.basePrice  // Guardar precio base para futuras ediciones
        })),
        workTime: this.workTime || null,
        status: 'converted_to_invoice' // Cambiar el estado al guardar
      };

      // Guardar información de categoría de markup solo para registro histórico (NO se usa en cálculos)
      if (this.markupEnabled() && this.selectedMarkupCategoryId) {
        const selectedCategory = this.markupCategories().find(c => c.id === this.selectedMarkupCategoryId);
        if (selectedCategory) {
          updateData.materialMarkupCategoryId = selectedCategory.id;
          updateData.materialMarkupCategoryName = selectedCategory.name;
          // NO guardamos materialMarkupPercentage para evitar que se aplique nuevamente en cálculos
        }
      }

      // Convertir fechas a Timestamp si existen
      if (this.invoiceDate) {
        updateData.invoiceDate = Timestamp.fromDate(new Date(this.invoiceDate));
      }
      if (this.workStartDate) {
        updateData.workStartDate = Timestamp.fromDate(new Date(this.workStartDate));
      }
      if (this.workEndDate) {
        updateData.workEndDate = Timestamp.fromDate(new Date(this.workEndDate));
      }

      await this.proposalsService.updateProposal(this.data.proposal.id, updateData);

      this.snackBar.open('Factura creada exitosamente', 'Cerrar', { duration: 3000 });

      this.dialogRef.close(true);
    } catch (error) {
      console.error('❌ Error guardando datos de factura:', error);
      this.snackBar.open('Error al guardar los datos', 'Cerrar', {
        duration: 3000
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Cancelar
   */
  cancel() {
    this.dialogRef.close(false);
  }

  /**
   * Obtener subtotal del estimado original
   */
  getProposalSubtotal(): number {
    return this.data.proposal.subtotal || 0;
  }

  /**
   * Calcular subtotal de materiales
   */
  calculateMaterialsSubtotal(): number {
    return this.selectedMaterials.reduce((total, material) => {
      return total + (material.amount * material.price);
    }, 0);
  }

  /**
   * Calcular gran total (estimado + materiales)
   */
  calculateGrandTotal(): number {
    return this.getProposalSubtotal() + this.calculateMaterialsSubtotal();
  }

  /**
   * Manejar cambio de idioma
   */
  onLanguageChange(language: 'es' | 'en'): void {
    this.languageService.setLanguage(language);
  }

  /**
   * Formatear número como moneda
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Obtener nombre del material desde sus campos dinámicos
   */
  getMaterialName(material: Material | undefined): string {
    if (!material) return 'Sin nombre';

    const fields = this.materialsConfigService.getFieldsInUse();

    // Buscar el campo de nombre
    const nameField = fields.find(f =>
      f.type === FieldType.TEXT ||
      f.name === 'name' ||
      f.name === 'nombre'
    );

    if (nameField) {
      const value = getFieldValue(material, nameField.name);
      if (value) return String(value);
    }

    // Fallback a campos estándar
    if (material.name) return material.name;

    return 'Sin nombre';
  }

  /**
   * Obtener precio del material desde sus campos dinámicos
   */
  getMaterialPrice(material: Material | undefined): number {
    if (!material) return 0;

    const fields = this.materialsConfigService.getFieldsInUse();

    // Buscar el campo de precio (puede ser NUMBER o CURRENCY)
    const priceField = fields.find(f =>
      f.type === FieldType.NUMBER ||
      f.type === FieldType.CURRENCY ||
      f.name === 'price' ||
      f.name === 'precio' ||
      f.name === 'cost' ||
      f.name === 'costo' ||
      f.name === 'unit_price' ||
      f.name === 'precio_unitario'
    );

    if (priceField) {
      const value = getFieldValue(material, priceField.name);
      if (value !== null && value !== undefined) {
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      }
    }

    // Fallback a campo estándar si existe
    if (material.customFields && material.customFields['price']) {
      return Number(material.customFields['price']) || 0;
    }

    return 0;
  }

  /**
   * Obtener nombre del trabajador
   * El modelo Worker ahora tiene campos fijos (fullName)
   */
  getWorkerName(worker: Worker | undefined): string {
    if (!worker) return 'Sin nombre';

    // El modelo Worker ahora tiene fullName como campo fijo
    if (worker.fullName) return worker.fullName;

    return 'Sin nombre';
  }
}
