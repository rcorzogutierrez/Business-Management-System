// src/app/modules/projects/components/proposal-config/proposal-config.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Material imports (solo MatIcon según CLAUDE.md)
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { ProposalConfigService } from '../../services/proposal-config.service';
import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';

// Base Component and Shared Components
import { GenericGridConfigBaseComponent } from '../../../../shared/components/generic-grid-config-base/generic-grid-config-base.component';
import { ModuleHeaderComponent } from '../../../../shared/components/module-header/module-header.component';
import { GridConfigSectionComponent, ConfigChangeEvent } from '../../../../shared/components/grid-config-section/grid-config-section.component';

// Models
import { ProposalClientFieldsMapping, ProposalAddressMapping, MaterialMarkupCategory, JobCategoryConfig } from '../../models';
import { FieldConfig } from '../../../clients/models/field-config.interface';

/**
 * Configuración de un campo de mapeo
 */
interface FieldMappingConfig {
  formControlName: string;
  icon: string;
  destinationIcon?: string;  // Icono para el campo destino (si es diferente al de origen)
  label: string;
  targetTheme: 'purple' | 'green';
  badge?: string;
}

@Component({
  selector: 'app-proposal-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    ModuleHeaderComponent,
    GridConfigSectionComponent,
  ],
  templateUrl: './proposal-config.component.html',
  styleUrl: './proposal-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalConfigComponent extends GenericGridConfigBaseComponent implements OnInit {
  // Implementar propiedades abstractas requeridas por GenericGridConfigBaseComponent
  configService = inject(ProposalConfigService);
  override modulePath = '/modules/projects';

  // Servicios específicos de proposals
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private clientConfigService = inject(ClientConfigServiceRefactored);

  // Signals específicos de proposals
  isSaving = signal<boolean>(false);
  availableFields = signal<FieldConfig[]>([]);
  markupCategories = signal<MaterialMarkupCategory[]>([]);
  markupEnabled = signal<boolean>(false);
  jobCategories = signal<JobCategoryConfig[]>([]);

  // Form
  configForm!: FormGroup;

  // Configuraciones de mapeo de campos básicos
  basicFieldMappings: FieldMappingConfig[] = [
    { formControlName: 'name', icon: 'badge', label: 'Nombre del Cliente', targetTheme: 'purple' },
    { formControlName: 'email', icon: 'email', label: 'Email del Cliente', targetTheme: 'purple' },
    { formControlName: 'phone', icon: 'phone', label: 'Teléfono del Cliente', targetTheme: 'purple' },
    { formControlName: 'company', icon: 'business', label: 'Compañía del Cliente', targetTheme: 'purple' }
  ];

  // Configuraciones de mapeo de campos de dirección
  addressFieldMappings: FieldMappingConfig[] = [
    { formControlName: 'address', icon: 'home', destinationIcon: 'location_on', label: 'Dirección del Trabajo', targetTheme: 'purple' },
    { formControlName: 'city', icon: 'location_city', label: 'Ciudad', targetTheme: 'purple' },
    { formControlName: 'state', icon: 'map', label: 'Estado', targetTheme: 'purple' },
    { formControlName: 'zipCode', icon: 'markunread_mailbox', label: 'Código Postal', targetTheme: 'purple' }
  ];

  constructor() {
    super();
    this.initForm();
  }

  override async ngOnInit() {
    // Llamar a la inicialización del componente base (carga gridConfig)
    super.ngOnInit();

    // Inicializar servicios específicos de proposals
    await Promise.all([
      this.configService.initialize(),
      this.clientConfigService.initialize()
    ]);

    // Cargar campos disponibles del cliente
    this.loadAvailableFields();

    // Cargar configuración actual
    this.loadCurrentConfig();
  }

  /**
   * Inicializar formulario
   */
  initForm() {
    this.configForm = this.fb.group({
      // Mapeo de campos básicos del cliente
      name: ['name', Validators.required],
      email: ['email', Validators.required],
      phone: ['phone', Validators.required],
      company: ['company', Validators.required],
      // Mapeo de campos de dirección
      address: ['address', Validators.required],
      city: ['city', Validators.required],
      state: ['estado', Validators.required],
      zipCode: ['codigo_postal', Validators.required],
      // Valores por defecto
      defaultTaxPercentage: [0, [Validators.min(0), Validators.max(100)]],
      defaultValidityDays: [30, [Validators.min(1)]],
      defaultWorkType: ['residential', Validators.required],
      defaultTerms: ['']
    });
  }

  /**
   * Cargar campos disponibles del módulo de clientes
   */
  loadAvailableFields() {
    try {
      this.isLoading = true;
      this.cdr.markForCheck();

      // Obtener todos los campos configurados en el módulo de clientes
      const fields = this.clientConfigService.getFieldsInUse();

      // Agregar campos estándar que siempre existen (sin todas las propiedades de FieldConfig)
      const standardFields: Pick<FieldConfig, 'name' | 'label' | 'type'>[] = [
        { name: 'address', label: 'Dirección', type: 'text' as any },
        { name: 'city', label: 'Ciudad', type: 'text' as any }
      ];

      // Combinar campos estándar con campos personalizados
      // Convertimos standardFields a FieldConfig parcial
      const allFields: FieldConfig[] = [
        ...standardFields.map(f => ({ ...f, id: f.name } as any as FieldConfig)),
        ...fields
      ];

      // Ordenar alfabéticamente
      allFields.sort((a, b) => a.label.localeCompare(b.label));

      this.availableFields.set(allFields);

    } catch (error) {
      console.error('❌ Error cargando campos disponibles:', error);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Sugerir el mejor campo del cliente por similitud de nombre
   * @param targetFieldName Nombre del campo destino (ej: 'state', 'zipCode')
   * @returns El nombre del campo sugerido del cliente
   */
  suggestClientField(targetFieldName: string): string {
    const available = this.availableFields();
    if (available.length === 0) return targetFieldName;

    // Mapeo de sinónimos comunes
    const synonyms: Record<string, string[]> = {
      name: ['name', 'nombre', 'client_name', 'nombre_cliente'],
      email: ['email', 'correo', 'email_address', 'correo_electronico'],
      phone: ['phone', 'telefono', 'phone_number', 'tel'],
      company: ['company', 'empresa', 'compania', 'compañia'],
      address: ['address', 'direccion', 'domicilio', 'calle'],
      city: ['city', 'ciudad'],
      state: ['state', 'estado', 'provincia'],
      zipCode: ['zipcode', 'zip_code', 'codigo_postal', 'codigopostal', 'cp', 'postal']
    };

    const targetSynonyms = synonyms[targetFieldName] || [targetFieldName];

    // Buscar coincidencia exacta (case insensitive)
    for (const synonym of targetSynonyms) {
      const exact = available.find(f =>
        f.name.toLowerCase() === synonym.toLowerCase()
      );
      if (exact) return exact.name;
    }

    // Buscar coincidencia parcial
    for (const synonym of targetSynonyms) {
      const partial = available.find(f =>
        f.name.toLowerCase().includes(synonym.toLowerCase()) ||
        synonym.toLowerCase().includes(f.name.toLowerCase())
      );
      if (partial) return partial.name;
    }

    // Si no hay coincidencia, retornar el primero disponible
    return available[0]?.name || targetFieldName;
  }

  /**
   * Cargar configuración actual o usar sugerencias inteligentes
   */
  loadCurrentConfig() {
    const config = this.configService.config();

    if (config) {
      // Cargar configuración existente
      this.configForm.patchValue({
        name: config.clientFieldsMapping?.name || 'name',
        email: config.clientFieldsMapping?.email || 'email',
        phone: config.clientFieldsMapping?.phone || 'phone',
        company: config.clientFieldsMapping?.company || 'company',
        address: config.clientAddressMapping.address,
        city: config.clientAddressMapping.city,
        state: config.clientAddressMapping.state,
        zipCode: config.clientAddressMapping.zipCode,
        defaultTaxPercentage: config.defaultTaxPercentage || 0,
        defaultValidityDays: config.defaultValidityDays || 30,
        defaultWorkType: config.defaultWorkType || 'residential',
        defaultTerms: config.defaultTerms || this.configService.getDefaultTerms()
      });

      // Cargar clasificación de servicios
      if (config.jobCategories) {
        this.jobCategories.set([...config.jobCategories]);
      } else {
        this.jobCategories.set(this.getDefaultJobCategories());
      }

      // Cargar configuración de markup
      if (config.materialMarkupConfig) {
        this.markupEnabled.set(config.materialMarkupConfig.enabled);
        this.markupCategories.set([...config.materialMarkupConfig.categories]);
      }

    } else {
      // No hay configuración, usar sugerencias inteligentes
      this.configForm.patchValue({
        name: this.suggestClientField('name'),
        email: this.suggestClientField('email'),
        phone: this.suggestClientField('phone'),
        company: this.suggestClientField('company'),
        address: this.suggestClientField('address'),
        city: this.suggestClientField('city'),
        state: this.suggestClientField('state'),
        zipCode: this.suggestClientField('zipCode'),
        defaultTaxPercentage: 0,
        defaultValidityDays: 30,
        defaultWorkType: 'residential',
        defaultTerms: this.configService.getDefaultTerms()
      });

      // Cargar clasificación de servicios por defecto
      this.jobCategories.set(this.getDefaultJobCategories());

      // Cargar configuración de markup por defecto
      const markupConfig = this.configService.getMaterialMarkupConfig();
      if (markupConfig) {
        this.markupEnabled.set(markupConfig.enabled);
        this.markupCategories.set([...markupConfig.categories]);
      }
    }
  }

  /**
   * Guardar configuración
   */
  async saveConfig() {
    if (this.configForm.invalid) {
      this.notify.validation.invalidForm();
      return;
    }

    // Validar categorías de markup antes de guardar
    const categories = this.markupCategories();
    if (categories.length > 0) {
      // Validar nombres duplicados
      const names = categories.map(c => c.name.toLowerCase().trim());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        this.notify.warning('No puede haber categorías con el mismo nombre');
        return;
      }

      // Validar porcentajes duplicados
      const percentages = categories.map(c => c.percentage);
      const uniquePercentages = new Set(percentages);
      if (percentages.length !== uniquePercentages.size) {
        this.notify.warning('No puede haber categorías con el mismo porcentaje');
        return;
      }

      // Validar nombres vacíos
      if (categories.some(c => !c.name.trim())) {
        this.notify.warning('Todas las categorías deben tener un nombre');
        return;
      }

      // Validar porcentajes válidos
      if (categories.some(c => c.percentage < 0 || c.percentage > 1000)) {
        this.notify.warning('Los porcentajes deben estar entre 0 y 1000');
        return;
      }
    }

    try {
      this.isSaving.set(true);

      const formValue = this.configForm.value;

      const clientFieldsMapping = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        company: formValue.company
      };

      const addressMapping: ProposalAddressMapping = {
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode
      };

      // Preparar configuración de markup
      const categories = this.markupCategories();
      const defaultCategory = categories.find(c => c.isActive);

      await this.configService.updateConfig({
        clientFieldsMapping: clientFieldsMapping,
        clientAddressMapping: addressMapping,
        defaultTaxPercentage: formValue.defaultTaxPercentage,
        defaultValidityDays: formValue.defaultValidityDays,
        defaultWorkType: formValue.defaultWorkType,
        defaultTerms: formValue.defaultTerms,
        jobCategories: this.jobCategories().filter(c => c.label.trim()),
        materialMarkupConfig: {
          enabled: this.markupEnabled(),
          categories: categories,
          defaultCategoryId: defaultCategory?.id
        }
      });

      this.notify.system.configUpdated();

    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      this.notify.system.configError();
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Restablecer a sugerencias automáticas
   */
  resetToDefaults() {
    this.configForm.patchValue({
      name: this.suggestClientField('name'),
      email: this.suggestClientField('email'),
      phone: this.suggestClientField('phone'),
      company: this.suggestClientField('company'),
      address: this.suggestClientField('address'),
      city: this.suggestClientField('city'),
      state: this.suggestClientField('state'),
      zipCode: this.suggestClientField('zipCode'),
      defaultTaxPercentage: 0,
      defaultValidityDays: 30,
      defaultWorkType: 'residential',
      defaultTerms: this.configService.getDefaultTerms()
    });

    this.notify.info('Valores restablecidos con sugerencias automáticas');
  }

  /**
   * Obtener el label de un campo por su nombre
   */
  getFieldLabel(fieldName: string): string {
    const field = this.availableFields().find(f => f.name === fieldName);
    return field ? field.label : fieldName;
  }

  /**
   * Toggle habilitar/deshabilitar markup
   */
  toggleMarkupEnabled() {
    this.markupEnabled.set(!this.markupEnabled());
  }

  /**
   * Agregar nueva categoría de markup
   */
  addMarkupCategory() {
    const categories = this.markupCategories();
    const newOrder = categories.length + 1;
    const newId = `category_${Date.now()}`;

    const newCategory: MaterialMarkupCategory = {
      id: newId,
      name: `Categoría ${newOrder}`,
      percentage: 10,
      order: newOrder,
      isActive: categories.length === 0 // Primera categoría es activa por defecto
    };

    this.markupCategories.set([...categories, newCategory]);
  }

  /**
   * Eliminar categoría de markup
   */
  deleteMarkupCategory(categoryId: string) {
    const categories = this.markupCategories().filter(c => c.id !== categoryId);
    // Reordenar
    categories.forEach((cat, index) => {
      cat.order = index + 1;
    });
    this.markupCategories.set([...categories]);
  }

  /**
   * Actualizar nombre de categoría
   */
  updateCategoryName(categoryId: string, name: string) {
    // Validar que el nombre no esté vacío
    const trimmedName = name.trim();
    if (!trimmedName) {
      this.notify.warning('El nombre no puede estar vacío');
      return;
    }

    // Validar que no haya otro con el mismo nombre
    const categories = this.markupCategories();
    const duplicate = categories.find(c =>
      c.id !== categoryId && c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      this.notify.validation.duplicate('categoría');
      return;
    }

    const updated = categories.map(c =>
      c.id === categoryId ? { ...c, name: trimmedName } : c
    );
    this.markupCategories.set(updated);
  }

  /**
   * Actualizar porcentaje de categoría
   */
  updateCategoryPercentage(categoryId: string, percentage: number) {
    // Validar que el porcentaje sea válido
    if (percentage < 0) {
      this.notify.warning('El porcentaje no puede ser negativo');
      return;
    }

    if (percentage > 1000) {
      this.notify.warning('El porcentaje no puede ser mayor a 1000%');
      return;
    }

    // Validar que no haya otro con el mismo porcentaje
    const categories = this.markupCategories();
    const duplicate = categories.find(c =>
      c.id !== categoryId && c.percentage === percentage
    );

    if (duplicate) {
      this.notify.warning('Ya existe una categoría con ese porcentaje');
      return;
    }

    const updated = categories.map(c =>
      c.id === categoryId ? { ...c, percentage } : c
    );
    this.markupCategories.set(updated);
  }

  /**
   * Toggle activo de categoría (solo una puede ser activa)
   */
  toggleCategoryActive(categoryId: string) {
    const categories = this.markupCategories().map(c => ({
      ...c,
      isActive: c.id === categoryId
    }));
    this.markupCategories.set(categories);
  }

  // ========== Clasificación de Servicios ==========

  getDefaultJobCategories(): JobCategoryConfig[] {
    return [
      { id: 'remodeling', label: 'Remodelación', order: 1, isActive: true },
      { id: 'pre_plumbing', label: 'Pre-Plomería', order: 2, isActive: true },
      { id: 'plumbing', label: 'Plomería', order: 3, isActive: true },
      { id: 'services', label: 'Servicios', order: 4, isActive: true },
      { id: 'equipment', label: 'Instalación de equipos', order: 5, isActive: true },
      { id: 'new_construction', label: 'Nueva Construcción', order: 6, isActive: true }
    ];
  }

  addJobCategory() {
    const categories = this.jobCategories();
    const newOrder = categories.length + 1;
    const newCategory: JobCategoryConfig = {
      id: `job_${Date.now()}`,
      label: '',
      order: newOrder,
      isActive: true
    };
    this.jobCategories.set([...categories, newCategory]);
  }

  updateJobCategoryLabel(categoryId: string, label: string) {
    const updated = this.jobCategories().map(c =>
      c.id === categoryId ? { ...c, label } : c
    );
    this.jobCategories.set(updated);
  }

  deleteJobCategory(categoryId: string) {
    const categories = this.jobCategories().filter(c => c.id !== categoryId);
    categories.forEach((cat, index) => {
      cat.order = index + 1;
    });
    this.jobCategories.set([...categories]);
  }

  toggleJobCategoryActive(categoryId: string) {
    const updated = this.jobCategories().map(c =>
      c.id === categoryId ? { ...c, isActive: !c.isActive } : c
    );
    this.jobCategories.set(updated);
  }

  /**
   * Handler para cambios desde GridConfigSectionComponent
   */
  onConfigChange(event: ConfigChangeEvent): void {
    this.itemsPerPageSignal.set(
      event.key === 'itemsPerPage' ? event.value : this.itemsPerPageSignal()
    );
    this.updateGridConfig(event.key, event.value);
  }

  // Los siguientes métodos ya están implementados en GenericGridConfigBaseComponent:
  // - updateGridConfig()
  // - toggleAllFeatures()
  // - gridConfig (computed)
  // - itemsPerPageSignal
  // - pageSizeOptions
  // - goBack()
}
