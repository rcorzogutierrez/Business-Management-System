// src/app/shared/components/generic-config-base/generic-config-base.component.ts

import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GenericGridConfigBaseComponent } from '../generic-grid-config-base/generic-grid-config-base.component';
import { ModuleConfigBaseService } from '../../modules/dynamic-form-builder/services/module-config-base.service';
import { FieldConfig } from '../../modules/dynamic-form-builder/models/field-config.interface';
import { FormLayoutConfig } from '../../modules/dynamic-form-builder/models/module-config.interface';

/**
 * Componente base genérico para configuración de módulos CON form builder
 *
 * Hereda de GenericGridConfigBaseComponent (configuración de tabla) y agrega:
 * - Gestión de campos dinámicos
 * - Form layout configuration
 * - Validación de campos
 * - Estadísticas de campos
 *
 * Los componentes hijos solo necesitan implementar la lógica específica del módulo.
 *
 * Úsalo para módulos que:
 * - Usan el form builder (campos dinámicos)
 * - Necesitan configurar tanto tabla como formulario
 * - Ejemplo: Clientes, Materiales
 */
@Component({
  selector: 'app-generic-config-base',
  standalone: true,
  imports: [CommonModule],
  template: '',  // Los hijos proveen su propio template
})
export abstract class GenericConfigBaseComponent extends GenericGridConfigBaseComponent {
  // Sobrescribir el tipo del configService para ser más específico
  abstract override configService: ModuleConfigBaseService<any>;

  // ==============================================
  // PROPIEDADES ESPECÍFICAS DE CAMPOS DINÁMICOS
  // ==============================================

  fields: FieldConfig[] = [];

  // ==============================================
  // COMPUTED Y GETTERS - Form Layout
  // ==============================================

  /**
   * Form layout del módulo
   */
  get formLayout(): FormLayoutConfig | undefined {
    return this.configService.getFormLayout();
  }

  // ==============================================
  // GETTERS - Estadísticas de Campos
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
  // CONSTRUCTOR
  // ==============================================

  constructor() {
    super();

    // Effect para reaccionar a cambios en los campos
    effect(() => {
      const fields = this.configService.fields();
      this.fields = [...fields].sort((a, b) => a.formOrder - b.formOrder);
      this.cdr.markForCheck();
    });
  }

  // ==============================================
  // MÉTODOS ESPECÍFICOS - Gestión de Campos
  // ==============================================

  /**
   * Manejar cambios en el layout del formulario
   */
  async onLayoutChange(layout: FormLayoutConfig): Promise<void> {
    try {
      // Validar que exista al menos un campo obligatorio
      const activeFields = this.configService.getActiveFields();
      const hasRequiredField = activeFields.some(field => field.validation?.required === true);

      if (!hasRequiredField) {
        this.notify.warning('Debes tener al menos un campo obligatorio en el formulario');
        return;
      }

      await this.configService.saveFormLayout(layout);

      this.notify.success('Diseño del formulario guardado correctamente');

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error guardando layout:', error);
      this.notify.error('Error al guardar el diseño del formulario');
    }
  }

  /**
   * Manejar cuando se agrega un nuevo campo desde el diseñador
   */
  async onFieldAdded(): Promise<void> {
    // Recargar la configuración para obtener el nuevo campo
    await this.loadConfig();
  }

  /**
   * Tracking para @for
   */
  trackByFieldId(index: number, field: FieldConfig): string {
    return field.id;
  }
}
