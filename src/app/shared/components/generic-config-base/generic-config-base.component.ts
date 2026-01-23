// src/app/shared/components/generic-config-base/generic-config-base.component.ts

import { Component, OnInit, effect, computed, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ModuleConfigBaseService } from '../../modules/dynamic-form-builder/services/module-config-base.service';
import { FieldConfig } from '../../modules/dynamic-form-builder/models/field-config.interface';
import { FormLayoutConfig, GridConfiguration } from '../../modules/dynamic-form-builder/models/module-config.interface';

/**
 * Componente base genérico para configuración de módulos
 * Proporciona toda la lógica compartida de:
 * - Panel de configuración de tabla (gridConfig)
 * - Toggles de funcionalidades
 * - Gestión de campos
 * - Validación de layout
 *
 * Los componentes hijos solo necesitan implementar la lógica específica del módulo.
 */
@Component({
  selector: 'app-generic-config-base',
  standalone: true,
  imports: [CommonModule],
  template: '',  // Los hijos proveen su propio template
})
export abstract class GenericConfigBaseComponent implements OnInit {
  // Services (deben ser inyectados por el componente hijo)
  protected snackBar = inject(MatSnackBar);
  protected router = inject(Router);
  protected cdr = inject(ChangeDetectorRef);

  // Propiedades abstractas que cada módulo debe implementar
  abstract configService: ModuleConfigBaseService<any>;
  abstract modulePath: string;  // Ej: '/modules/clients'

  // ==============================================
  // PROPIEDADES COMPARTIDAS
  // ==============================================

  fields: FieldConfig[] = [];
  isLoading = false;

  // ==============================================
  // COMPUTED SIGNALS COMPARTIDOS
  // ==============================================

  /**
   * Form layout del módulo
   */
  get formLayout(): FormLayoutConfig | undefined {
    return this.configService.getFormLayout();
  }

  /**
   * Grid configuration con valores por defecto
   */
  gridConfig = computed(() => {
    const config = this.configService.config();

    // Si no existe gridConfig, retornar valores por defecto
    if (!config?.gridConfig) {
      return {
        defaultView: 'table' as const,
        itemsPerPage: 10,
        sortBy: 'name',
        sortOrder: 'asc' as const,
        enableSearch: true,
        enableFilters: true,
        enableExport: true,
        enableBulkActions: true,
        enableColumnSelector: true,
        showThumbnails: false,
        compactMode: false
      };
    }

    return config.gridConfig;
  });

  /**
   * Verificar si todas las funcionalidades están activas
   */
  allFeaturesEnabled = computed(() => {
    const gc = this.gridConfig();
    return gc.enableSearch &&
           gc.enableFilters &&
           gc.enableExport &&
           gc.enableBulkActions &&
           gc.enableColumnSelector &&
           gc.compactMode;
  });

  // ==============================================
  // GETTERS COMPARTIDOS - Estadísticas
  // ==============================================

  get totalFields(): number {
    return this.fields.length;
  }

  get activeFields(): number {
    return this.fields.filter(f => f.isActive).length;
  }

  get customFields(): number {
    return this.fields.filter(f => !f.isSystem).length;
  }

  get systemFields(): number {
    return this.fields.filter(f => f.isSystem).length;
  }

  get gridColumns(): number {
    return this.fields.filter(f => f.gridConfig.showInGrid).length;
  }

  // ==============================================
  // LIFECYCLE
  // ==============================================

  constructor() {
    // Effect para reaccionar a cambios en los campos
    effect(() => {
      const fields = this.configService.fields();
      this.fields = [...fields].sort((a, b) => a.formOrder - b.formOrder);
      this.cdr.markForCheck();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadConfig();
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Configuración
  // ==============================================

  /**
   * Cargar configuración del módulo
   */
  async loadConfig(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.loadConfig();
    } catch (error) {
      console.error('Error cargando configuración:', error);
      this.snackBar.open('Error al cargar la configuración', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Actualizar una configuración del grid
   */
  async updateGridConfig(key: keyof GridConfiguration, value: any): Promise<void> {
    try {
      const currentConfig = this.configService.config();
      if (!currentConfig) return;

      // Si no existe gridConfig, usar el computed que tiene valores por defecto
      const currentGridConfig = currentConfig.gridConfig || this.gridConfig();

      const updatedConfig = {
        ...currentConfig,
        gridConfig: {
          ...currentGridConfig,
          [key]: value
        }
      };

      await this.configService.updateConfig(updatedConfig);

      this.snackBar.open('✅ Configuración actualizada correctamente', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error actualizando configuración del grid:', error);
      this.snackBar.open('❌ Error al actualizar la configuración', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Toggle: Activa o desactiva todas las funcionalidades de la tabla
   */
  async toggleAllFeatures(): Promise<void> {
    try {
      const currentConfig = this.configService.config();
      if (!currentConfig) return;

      const currentGridConfig = currentConfig.gridConfig || this.gridConfig();
      const shouldEnable = !this.allFeaturesEnabled();

      const updatedConfig = {
        ...currentConfig,
        gridConfig: {
          ...currentGridConfig,
          enableColumnSelector: shouldEnable,
          enableFilters: shouldEnable,
          enableExport: shouldEnable,
          enableBulkActions: shouldEnable,
          enableSearch: shouldEnable,
          compactMode: shouldEnable
        }
      };

      this.isLoading = true;
      this.cdr.markForCheck();

      await this.configService.updateConfig(updatedConfig);

      const message = shouldEnable
        ? '✅ Todas las funcionalidades han sido activadas'
        : '✅ Todas las funcionalidades han sido desactivadas';

      this.snackBar.open(message, '', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error al cambiar funcionalidades:', error);
      this.snackBar.open('❌ Error al cambiar las funcionalidades', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Manejar cambios en el layout del formulario
   */
  async onLayoutChange(layout: FormLayoutConfig): Promise<void> {
    try {
      // Validar que exista al menos un campo obligatorio
      const activeFields = this.configService.getActiveFields();
      const hasRequiredField = activeFields.some(field => field.validation?.required === true);

      if (!hasRequiredField) {
        this.snackBar.open('⚠️ Debes tener al menos un campo obligatorio en el formulario', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['snackbar-warning']
        });
        return;
      }

      await this.configService.saveFormLayout(layout);

      this.snackBar.open('✅ Diseño del formulario guardado correctamente', '', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error guardando layout:', error);
      this.snackBar.open('❌ Error al guardar el diseño del formulario', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Manejar cuando se agrega un nuevo campo desde el diseñador
   */
  async onFieldAdded(): Promise<void> {
    // Recargar la configuración para obtener el nuevo campo
    await this.loadConfig();
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Navegación
  // ==============================================

  /**
   * Volver al listado del módulo
   */
  goBack(): void {
    this.router.navigate([this.modulePath]);
  }

  /**
   * Tracking para @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }
}
