// src/app/modules/projects/components/direct-invoice-form/direct-invoice-form.component.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslateModule } from '@ngx-translate/core';
import { Timestamp } from 'firebase/firestore';

// Services
import { ProposalsService } from '../../services/proposals.service';
import { ProposalConfigService } from '../../services/proposal-config.service';
import { ProposalCalculatorService } from '../../services/proposal-calculator.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';
import { ClientDataExtractorService } from '../../../clients/services/client-data-extractor.service';
import { MaterialsService } from '../../../materials/services/materials.service';
import { MaterialsConfigService } from '../../../materials/services/materials-config.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { LanguageService } from '../../../../core/services/language.service';

// Models
import { CreateProposalData, UpdateProposalData, Proposal, SelectedMaterial, SelectedWorker, MaterialMarkupCategory } from '../../models';
import { Client } from '../../../clients/models';
import { Material, FieldType } from '../../../materials/models';
import { Worker } from '../../../workers/models';

// Utilities
import { getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
// Components
import { AddClientDialogComponent } from '../add-client-dialog/add-client-dialog.component';

@Component({
  selector: 'app-direct-invoice-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatAutocompleteModule
  ],
  templateUrl: './direct-invoice-form.component.html',
  styleUrl: './direct-invoice-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DirectInvoiceFormComponent implements OnInit {

  // === Services ===
  private proposalsService = inject(ProposalsService);
  private proposalConfigService = inject(ProposalConfigService);
  private proposalCalculator = inject(ProposalCalculatorService);
  private clientsService = inject(ClientsService);
  private clientConfigService = inject(ClientConfigServiceRefactored);
  private clientDataExtractor = inject(ClientDataExtractorService);
  private materialsService = inject(MaterialsService);
  private materialsConfigService = inject(MaterialsConfigService);
  private workersService = inject(WorkersService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private elementRef = inject(ElementRef);

  // === Edit Mode ===
  editMode = false;
  proposalId = '';

  // Close dropdowns on outside click
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

  // === Signals ===
  isLoading = signal(false);
  useSameAddress = signal(false);
  clients = this.clientsService.clients;
  clientSearchTerm = signal('');

  availableMaterials = signal<Material[]>([]);
  availableWorkers = signal<Worker[]>([]);
  markupCategories = signal<MaterialMarkupCategory[]>([]);
  markupEnabled = signal(false);

  // Dropdowns
  materialSearchTerm = signal('');
  materialDropdownOpen = signal(false);
  workerSearchTerm = signal('');
  workerDropdownOpen = signal(false);

  // === Form Data ===
  language: 'es' | 'en' = 'es';
  invoiceDate = '';
  workStartDate = '';
  workEndDate = '';
  workTime: number | null = null;

  ownerId = '';
  ownerName = '';
  ownerEmail = '';
  ownerPhone = '';
  ownerCompany = '';

  workType: 'residential' | 'commercial' = 'residential';
  jobCategory = '';
  jobCategoryOptions = computed(() => {
    const config = this.proposalConfigService.config();
    const categories = config?.jobCategories;
    if (categories && categories.length > 0) {
      return categories.filter(c => c.isActive);
    }
    return [
      { id: 'remodeling', label: 'Remodelación', order: 1, isActive: true },
      { id: 'pre_plumbing', label: 'Pre-Plomería', order: 2, isActive: true },
      { id: 'plumbing', label: 'Plomería', order: 3, isActive: true },
      { id: 'services', label: 'Servicios', order: 4, isActive: true },
      { id: 'equipment', label: 'Instalación de equipos', order: 5, isActive: true },
      { id: 'new_construction', label: 'Nueva Construcción', order: 6, isActive: true }
    ];
  });
  address = '';
  city = '';
  state = '';
  zipCode = '';
  customerName = '';

  notes = '';
  terms = '';
  showTermsInPrint = true;

  subtotal = 0;
  taxPercentage = 0;
  discountPercentage = 0;

  selectedMarkupCategoryId: string | null = null;
  selectedMaterials: SelectedMaterial[] = [];
  selectedWorkers: SelectedWorker[] = [];

  // === Computed ===
  filteredClients = computed(() => {
    const term = (this.clientSearchTerm() || '').toLowerCase().trim();
    const allClients = this.clients();
    if (!term) return allClients;
    return allClients.filter(client => {
      const name = this.getClientName(client).toLowerCase();
      const email = this.getClientEmail(client).toLowerCase();
      const phone = this.getClientPhone(client).toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  });

  filteredMaterials = computed(() => {
    const materials = this.availableMaterials();
    const searchTerm = this.materialSearchTerm().toLowerCase().trim();
    if (!searchTerm) return materials;
    return materials.filter(material => {
      const name = this.getMaterialName(material).toLowerCase();
      return name.includes(searchTerm);
    });
  });

  filteredWorkers = computed(() => {
    const workers = this.availableWorkers();
    const searchTerm = this.workerSearchTerm().toLowerCase().trim();
    if (!searchTerm) return workers;
    return workers.filter(worker => {
      const name = this.getWorkerName(worker).toLowerCase();
      return name.includes(searchTerm);
    });
  });

  // === Lifecycle ===

  async ngOnInit() {
    // Detect edit mode
    this.editMode = this.route.snapshot.data['mode'] === 'edit';
    if (this.editMode) {
      this.proposalId = this.route.snapshot.paramMap.get('id') || '';
    }

    // Set default date (solo en modo crear)
    if (!this.editMode) {
      this.invoiceDate = this.formatDateForInput(new Date());
    }

    // Initialize all services in parallel
    await Promise.all([
      this.clientConfigService.initialize(),
      this.clientsService.initialize(),
      this.proposalConfigService.initialize(),
      this.materialsConfigService.initialize(),
      this.materialsService.initialize(),
      this.workersService.initialize()
    ]);

    // Load data from services
    this.availableMaterials.set(this.materialsService.activeMaterials());
    this.availableWorkers.set(this.workersService.activeWorkers());

    // Load config defaults (solo en modo crear)
    if (!this.editMode) {
      this.workType = this.proposalConfigService.getDefaultWorkType() as 'residential' | 'commercial';
      this.taxPercentage = this.proposalConfigService.getDefaultTaxPercentage();
      this.terms = this.proposalConfigService.getDefaultTerms();
    }

    // Load markup config
    this.markupEnabled.set(this.proposalConfigService.isMarkupEnabled());
    if (this.markupEnabled()) {
      const activeCategories = this.proposalConfigService.getActiveMarkupCategories();
      this.markupCategories.set(activeCategories);
      if (!this.editMode) {
        const defaultCategory = this.proposalConfigService.getDefaultMarkupCategory();
        this.selectedMarkupCategoryId = defaultCategory?.id || null;
      }
    }

    // En modo edición, cargar los datos existentes
    if (this.editMode && this.proposalId) {
      await this.loadProposal(this.proposalId);
    }
  }

  /**
   * Cargar datos de una factura directa existente para edición
   */
  private async loadProposal(id: string) {
    try {
      this.isLoading.set(true);
      const proposal = await this.proposalsService.getProposalById(id);
      if (!proposal) {
        this.snackBar.open('Factura no encontrada', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/modules/projects']);
        return;
      }

      this.fillFormFromProposal(proposal);
    } catch (error) {
      console.error('Error cargando factura:', error);
      this.snackBar.open('Error al cargar la factura', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/modules/projects']);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Llenar todos los campos del formulario desde un proposal existente
   */
  private fillFormFromProposal(proposal: Proposal) {
    this._loadedStatus = proposal.status || '';
    this.language = proposal.language || 'es';
    this.invoiceDate = this.timestampToInputDate(proposal.invoiceDate) || this.timestampToInputDate(proposal.date) || '';
    this.workStartDate = this.timestampToInputDate(proposal.workStartDate) || '';
    this.workEndDate = this.timestampToInputDate(proposal.workEndDate) || '';
    this.workTime = proposal.workTime || null;

    this.ownerId = proposal.ownerId || '';
    this.ownerName = proposal.ownerName || '';
    this.ownerEmail = proposal.ownerEmail || '';
    this.ownerPhone = proposal.ownerPhone || '';
    this.clientSearchTerm.set(this.ownerName);

    // Cargar company desde el cliente original e inferir useSameAddress
    if (this.ownerId) {
      const client = this.clients().find(c => c.id === this.ownerId);
      if (client) {
        this.ownerCompany = this.getClientCompany(client);

        // Inferir si la dirección del trabajo es la misma que la del cliente
        const clientAddress = this.getClientAddress(client);
        const clientCity = this.getClientCity(client);
        const clientState = this.getClientState(client);
        const clientZip = this.getClientZipCode(client);
        const propAddress = proposal.address || '';
        const propCity = proposal.city || '';
        const propState = proposal.state || '';
        const propZip = proposal.zipCode || '';

        if (clientAddress && propAddress && clientAddress === propAddress
          && clientCity === propCity && clientState === propState && clientZip === propZip) {
          this.useSameAddress.set(true);
        }
      }
    }

    this.workType = (proposal.workType as 'residential' | 'commercial') || 'residential';
    this.jobCategory = proposal.jobCategory || '';
    this.address = proposal.address || '';
    this.city = proposal.city || '';
    this.state = proposal.state || '';
    this.zipCode = proposal.zipCode || '';
    this.customerName = proposal.customerName || '';

    this.notes = proposal.notes || '';
    this.terms = proposal.terms || '';
    this.showTermsInPrint = proposal.showTermsInPrint !== false;

    this.subtotal = proposal.subtotal || 0;
    this.taxPercentage = proposal.taxPercentage || 0;
    this.discountPercentage = proposal.discountPercentage || 0;

    // Markup
    if (proposal.materialMarkupCategoryId) {
      this.selectedMarkupCategoryId = proposal.materialMarkupCategoryId;
    }

    // Materiales
    if (proposal.materialsUsed && proposal.materialsUsed.length > 0) {
      this.selectedMaterials = proposal.materialsUsed.map(m => ({
        materialId: m.id,
        materialName: m.material,
        amount: m.amount,
        basePrice: m.basePrice || m.price,
        price: m.price
      }));
    }

    // Trabajadores
    if (proposal.workers && proposal.workers.length > 0) {
      this.selectedWorkers = proposal.workers.map(w => ({
        workerId: w.id,
        workerName: w.name
      }));
    }
  }

  /**
   * Convertir Timestamp de Firestore a string yyyy-mm-dd para input date
   */
  private timestampToInputDate(timestamp: any): string | null {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return this.formatDateForInput(date);
  }

  // === Client Methods ===

  onClientSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.clientSearchTerm.set(value);
  }

  selectClient(client: Client) {
    this.ownerId = client.id!;
    this.clientSearchTerm.set(this.getClientName(client));
    this.fillClientData(client);
  }

  fillClientData(client: Client) {
    this.ownerName = this.getClientName(client);
    this.ownerEmail = this.getClientEmail(client);
    this.ownerPhone = this.getClientPhone(client);
    this.ownerCompany = this.getClientCompany(client);

    if (this.useSameAddress()) {
      this.copyClientAddress();
    }
  }

  getClientName(client: Client | undefined): string {
    if (!client) return 'Sin nombre';
    const mapping = this.proposalConfigService.getClientFieldsMapping();
    const value = this.clientDataExtractor.getFieldByName(client, mapping.name, 'name');
    return value || 'Sin nombre';
  }

  getClientEmail(client: Client | undefined): string {
    if (!client) return '';
    const mapping = this.proposalConfigService.getClientFieldsMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.email, 'email');
  }

  getClientPhone(client: Client | undefined): string {
    if (!client) return '';
    const mapping = this.proposalConfigService.getClientFieldsMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.phone, 'phone');
  }

  getClientCompany(client: Client | undefined): string {
    if (!client) return '';
    const mapping = this.proposalConfigService.getClientFieldsMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.company, 'company');
  }

  // === Address Methods ===

  copyClientAddress() {
    if (!this.ownerId) return;
    const client = this.clients().find(c => c.id === this.ownerId);
    if (client) {
      this.address = this.getClientAddress(client);
      this.city = this.getClientCity(client);
      this.state = this.getClientState(client);
      this.zipCode = this.getClientZipCode(client);
    }
  }

  getClientAddress(client: Client | undefined): string {
    if (!client) return '';
    if (client.address) return client.address;
    const mapping = this.proposalConfigService.getAddressMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.address);
  }

  getClientCity(client: Client | undefined): string {
    if (!client) return '';
    if (client.city) return client.city;
    const mapping = this.proposalConfigService.getAddressMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.city);
  }

  getClientState(client: Client | undefined): string {
    if (!client) return '';
    const mapping = this.proposalConfigService.getAddressMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.state);
  }

  getClientZipCode(client: Client | undefined): string {
    if (!client) return '';
    const mapping = this.proposalConfigService.getAddressMapping();
    return this.clientDataExtractor.getFieldByName(client, mapping.zipCode);
  }

  onUseSameAddressChange(checked: boolean) {
    this.useSameAddress.set(checked);
    if (checked) {
      this.copyClientAddress();
    } else {
      this.address = '';
      this.city = '';
      this.state = '';
      this.zipCode = '';
    }
  }

  openAddClientDialog() {
    const dialogRef = this.dialog.open(AddClientDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((newClient: Client | undefined) => {
      if (newClient) {
        this.selectClient(newClient);
      }
    });
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

  // === Material Methods ===

  getMaterialName(material: Material | undefined): string {
    if (!material) return 'Sin nombre';
    const fields = this.materialsConfigService.getFieldsInUse();
    const nameField = fields.find(f =>
      f.type === FieldType.TEXT || f.name === 'name' || f.name === 'nombre'
    );
    if (nameField) {
      const value = getFieldValue(material, nameField.name);
      if (value) return String(value);
    }
    if (material.name) return material.name;
    return 'Sin nombre';
  }

  getMaterialPrice(material: Material | undefined): number {
    if (!material) return 0;
    const fields = this.materialsConfigService.getFieldsInUse();
    const priceField = fields.find(f =>
      f.type === FieldType.NUMBER ||
      f.type === FieldType.CURRENCY ||
      f.name === 'price' || f.name === 'precio' ||
      f.name === 'cost' || f.name === 'costo' ||
      f.name === 'unit_price' || f.name === 'precio_unitario'
    );
    if (priceField) {
      const value = getFieldValue(material, priceField.name);
      if (value !== null && value !== undefined) {
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;
      }
    }
    if (material.customFields && material.customFields['price']) {
      return Number(material.customFields['price']) || 0;
    }
    return 0;
  }

  addMaterial(materialId: string) {
    if (!materialId) return;
    const material = this.availableMaterials().find(m => m.id === materialId);
    if (!material) return;

    const materialName = this.getMaterialName(material);
    const basePrice = this.getMaterialPrice(material);

    const exists = this.selectedMaterials.find(m => m.materialId === materialId);
    if (exists) {
      this.snackBar.open('Este material ya está agregado', 'Cerrar', { duration: 2000 });
      return;
    }

    let appliedPrice = basePrice;
    if (this.markupEnabled() && this.selectedMarkupCategoryId) {
      const selectedCategory = this.markupCategories().find(c => c.id === this.selectedMarkupCategoryId);
      if (selectedCategory && selectedCategory.percentage > 0) {
        const markupAmount = (basePrice * selectedCategory.percentage) / 100;
        appliedPrice = basePrice + markupAmount;
      }
    }

    this.selectedMaterials = [...this.selectedMaterials, {
      materialId: material.id!,
      materialName,
      amount: 1,
      basePrice,
      price: appliedPrice
    }];
  }

  removeMaterial(index: number) {
    this.selectedMaterials = this.selectedMaterials.filter((_, i) => i !== index);
  }

  onMarkupCategoryChange() {
    if (!this.markupEnabled() || !this.selectedMarkupCategoryId) return;
    const selectedCategory = this.markupCategories().find(c => c.id === this.selectedMarkupCategoryId);
    if (!selectedCategory) return;

    this.selectedMaterials = this.selectedMaterials.map(material => {
      let newPrice = material.basePrice;
      if (selectedCategory.percentage > 0) {
        const markupAmount = (material.basePrice * selectedCategory.percentage) / 100;
        newPrice = material.basePrice + markupAmount;
      }
      return { ...material, price: newPrice };
    });
  }

  // Material dropdown
  openMaterialDropdown(): void { this.materialDropdownOpen.set(true); }
  closeMaterialDropdown(): void {
    this.materialDropdownOpen.set(false);
    this.materialSearchTerm.set('');
  }
  onMaterialSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.materialSearchTerm.set(input.value);
    if (!this.materialDropdownOpen()) this.materialDropdownOpen.set(true);
  }
  selectMaterial(materialId: string): void {
    this.addMaterial(materialId);
    this.closeMaterialDropdown();
  }

  // === Worker Methods ===

  getWorkerName(worker: Worker | undefined): string {
    if (!worker) return 'Sin nombre';
    if (worker.fullName) return worker.fullName;
    return 'Sin nombre';
  }

  addWorker(workerId: string) {
    if (!workerId) return;
    const worker = this.availableWorkers().find(w => w.id === workerId);
    if (!worker) return;

    const workerName = this.getWorkerName(worker);
    const exists = this.selectedWorkers.find(w => w.workerId === workerId);
    if (exists) {
      this.snackBar.open('Este trabajador ya está agregado', 'Cerrar', { duration: 2000 });
      return;
    }

    this.selectedWorkers = [...this.selectedWorkers, {
      workerId: worker.id!,
      workerName
    }];
  }

  removeWorker(index: number) {
    this.selectedWorkers = this.selectedWorkers.filter((_, i) => i !== index);
  }

  // Worker dropdown
  openWorkerDropdown(): void { this.workerDropdownOpen.set(true); }
  closeWorkerDropdown(): void {
    this.workerDropdownOpen.set(false);
    this.workerSearchTerm.set('');
  }
  onWorkerSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.workerSearchTerm.set(input.value);
    if (!this.workerDropdownOpen()) this.workerDropdownOpen.set(true);
  }
  selectWorker(workerId: string): void {
    this.addWorker(workerId);
    this.closeWorkerDropdown();
  }

  // === Language ===

  onLanguageChange(language: 'es' | 'en'): void {
    this.languageService.setLanguage(language);
  }

  // === Calculations ===

  calculateMaterialsSubtotal(): number {
    return this.selectedMaterials.reduce((total, m) => total + (m.amount * m.price), 0);
  }

  getCombinedSubtotal(): number {
    return (this.subtotal || 0) + this.calculateMaterialsSubtotal();
  }

  calculateTax(): number {
    return this.proposalCalculator.calculateTax(this.getCombinedSubtotal(), this.taxPercentage || 0);
  }

  calculateDiscount(): number {
    return this.proposalCalculator.calculateDiscount(this.getCombinedSubtotal(), this.discountPercentage || 0);
  }

  calculateTotal(): number {
    return this.proposalCalculator.calculateTotal(this.getCombinedSubtotal(), this.calculateTax(), this.calculateDiscount());
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // === Validation ===

  /**
   * Validación mínima para guardar borrador
   */
  validateDraft(): boolean {
    if (!this.invoiceDate) {
      this.snackBar.open('Debes ingresar la fecha de emisión', 'Cerrar', { duration: 3000 });
      return false;
    }
    if (!this.ownerId || !this.ownerName) {
      this.snackBar.open('Debes seleccionar un cliente', 'Cerrar', { duration: 3000 });
      return false;
    }
    if (!this.address) {
      this.snackBar.open('Debes ingresar la dirección del trabajo', 'Cerrar', { duration: 3000 });
      return false;
    }
    if (!this.city) {
      this.snackBar.open('Debes ingresar la ciudad', 'Cerrar', { duration: 3000 });
      return false;
    }
    return true;
  }

  /**
   * Validación completa para finalizar factura
   */
  validate(): boolean {
    if (!this.validateDraft()) return false;

    // Fechas de trabajo obligatorias
    if (!this.workStartDate) {
      this.snackBar.open('Debes ingresar la fecha de inicio del trabajo', 'Cerrar', { duration: 3000 });
      return false;
    }
    if (!this.workEndDate) {
      this.snackBar.open('Debes ingresar la fecha de fin del trabajo', 'Cerrar', { duration: 3000 });
      return false;
    }
    if (!this.workTime || this.workTime <= 0) {
      this.snackBar.open('Debes ingresar las horas trabajadas', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar rango de fechas
    const startDate = new Date(this.workStartDate);
    const endDate = new Date(this.workEndDate);
    if (startDate > endDate) {
      this.snackBar.open('La fecha de inicio no puede ser mayor a la fecha de finalización', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar materiales
    for (const material of this.selectedMaterials) {
      if (!material.amount || material.amount <= 0) {
        this.snackBar.open(`El material "${material.materialName}" debe tener una cantidad mayor a 0`, 'Cerrar', { duration: 3000 });
        return false;
      }
      if (material.price === null || material.price === undefined || material.price < 0) {
        this.snackBar.open(`El material "${material.materialName}" debe tener un precio válido`, 'Cerrar', { duration: 3000 });
        return false;
      }
    }

    return true;
  }

  /**
   * Determinar si estamos editando un borrador
   */
  get isDraft(): boolean {
    return this.editMode && this._loadedStatus === 'draft';
  }

  private _loadedStatus: string = '';

  // === Save ===

  /**
   * Guardar como borrador (validación mínima)
   */
  async saveDraft() {
    await this.saveWithStatus('draft');
  }

  /**
   * Guardar como factura finalizada (validación completa)
   */
  async save() {
    await this.saveWithStatus('not_sent');
  }

  private async saveWithStatus(status: 'draft' | 'not_sent') {
    const isDraft = status === 'draft';
    if (isDraft) {
      if (!this.validateDraft()) return;
    } else {
      if (!this.validate()) return;
    }

    try {
      this.isLoading.set(true);

      const tax = this.calculateTax();
      const discount = this.calculateDiscount();
      const total = this.calculateTotal();

      const proposalData: any = {
        language: this.language,
        ownerId: this.ownerId,
        ownerName: this.ownerName,
        address: this.address,
        city: this.city,
        workType: this.workType,
        date: Timestamp.fromDate(this.parseDateFromInput(this.invoiceDate)),
        includes: [],
        extras: [],
        subtotal: this.subtotal || 0,
        taxPercentage: this.taxPercentage || 0,
        discountPercentage: this.discountPercentage || 0,
        tax,
        discount,
        total,
        status,
        isDirectInvoice: true,
        invoiceDate: Timestamp.fromDate(this.parseDateFromInput(this.invoiceDate)),
        materialsUsed: this.selectedMaterials.map(m => ({
          id: m.materialId,
          material: m.materialName,
          amount: m.amount,
          price: m.price,
          basePrice: m.basePrice
        })),
        workers: this.selectedWorkers.map(w => ({
          id: w.workerId,
          name: w.workerName
        }))
      };

      // Optional fields
      if (this.ownerEmail) proposalData.ownerEmail = this.ownerEmail;
      if (this.ownerPhone) proposalData.ownerPhone = this.ownerPhone;
      if (this.state) proposalData.state = this.state;
      if (this.zipCode) proposalData.zipCode = this.zipCode;
      if (this.jobCategory) proposalData.jobCategory = this.jobCategory;
      if (this.customerName) proposalData.customerName = this.customerName;
      if (this.notes) proposalData.notes = this.notes;
      if (this.terms) proposalData.terms = this.terms;
      proposalData.showTermsInPrint = this.showTermsInPrint;
      if (this.workTime) proposalData.workTime = this.workTime;
      if (this.workStartDate) {
        proposalData.workStartDate = Timestamp.fromDate(this.parseDateFromInput(this.workStartDate));
      }
      if (this.workEndDate) {
        proposalData.workEndDate = Timestamp.fromDate(this.parseDateFromInput(this.workEndDate));
      }

      // Markup info (historical record only)
      if (this.markupEnabled() && this.selectedMarkupCategoryId) {
        const selectedCategory = this.markupCategories().find(c => c.id === this.selectedMarkupCategoryId);
        if (selectedCategory) {
          proposalData.materialMarkupCategoryId = selectedCategory.id;
          proposalData.materialMarkupCategoryName = selectedCategory.name;
        }
      }

      const draftMsg = isDraft ? 'Borrador guardado' : 'Factura';

      if (this.editMode && this.proposalId) {
        await this.proposalsService.updateProposal(this.proposalId, proposalData as UpdateProposalData);
        this.router.navigate(['/modules/projects', this.proposalId]);
        this.snackBar.open(
          isDraft ? 'Borrador guardado exitosamente' : 'Factura actualizada exitosamente',
          'Cerrar',
          { duration: 3000 }
        );
      } else {
        const newProposal = await this.proposalsService.createProposal(proposalData as CreateProposalData);
        this.router.navigate(['/modules/projects']);
        const snackBarRef = this.snackBar.open(
          isDraft
            ? `Borrador ${newProposal.proposalNumber} guardado`
            : `Factura ${newProposal.proposalNumber} creada exitosamente`,
          isDraft ? 'Cerrar' : 'Ver Factura',
          { duration: 5000 }
        );
        if (!isDraft) {
          snackBarRef.onAction().subscribe(() => {
            this.router.navigate(['/modules/projects', newProposal.id]);
          });
        }
      }

    } catch (error) {
      console.error('Error creando factura directa:', error);
      this.snackBar.open('Error al crear la factura', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/modules/projects']);
  }

  // === Helpers ===

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private parseDateFromInput(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
}
