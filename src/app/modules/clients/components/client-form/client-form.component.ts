// src/app/modules/clients/components/client-form/client-form.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';

// Services
import { ClientsService } from '../../services/clients.service';
import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { AuthService } from '../../../../core/services/auth.service';

// Models
import { Client, CreateClientData, UpdateClientData } from '../../models/client.interface';
import { FieldConfig, FieldType } from '../../models/field-config.interface';
import { FormLayoutConfig, FieldPosition } from '../../models/client-module-config.interface';

// Components
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

// Shared utilities
import {
  createFieldValidators,
  urlValidator,
  getDefaultValueByFieldType,
  getFieldInitialValue,
  getFieldErrorMessage,
  fieldHasError
} from '../../../../shared/utils/form-validation.utils';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientsService = inject(ClientsService);
  private configService = inject(ClientConfigServiceRefactored);
  private notify = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  // Signals
  mode = signal<FormMode>('create');
  clientForm!: FormGroup;
  fields = signal<FieldConfig[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  currentClient = signal<Client | null>(null);
  formLayout = signal<FormLayoutConfig | undefined>(undefined);

  // Expose FieldType to template
  FieldType = FieldType;

  constructor() {
    // Exponer el componente en la consola del navegador para debugging
    if (typeof window !== 'undefined') {
      (window as any).clientFormComponent = this;
    }
  }

  async ngOnInit() {
    await this.initializeForm();
  }

  /**
   * Inicializar formulario
   */
  private async initializeForm() {
    try {
      this.isLoading.set(true);

      // Cargar configuración
      await this.configService.initialize();

      // Obtener campos activos ordenados
      const activeFields = this.configService.getActiveFields();

      activeFields.forEach((f, i) => {
        
      });

      // Advertencia si hay campos sin formOrder
      const withoutOrder = activeFields.filter(f => f.formOrder === undefined || f.formOrder === null);
      if (withoutOrder.length > 0) {
        
      }

      // Validar que existan campos configurados
      if (activeFields.length === 0) {

        const currentUser = this.authService.authorizedUser();
        const isAdmin = currentUser?.role === 'admin';

        if (isAdmin) {
          // Admin: mostrar mensaje para ir a configuración
          this.notify.warning('No hay campos configurados. Por favor, configura los campos del formulario primero.');
          this.router.navigate(['/modules/clients/config']);
        } else {
          // Usuario normal: solo mostrar mensaje
          this.notify.warning('No hay campos configurados. Contacta al administrador para configurar este módulo.');
        }

        this.router.navigate(['/modules/clients']);
        return;
      }

      this.fields.set(activeFields);

      // Cargar layout personalizado si existe
      const layout = this.configService.getFormLayout();
      this.formLayout.set(layout);

      // Determinar modo según ruta
      const clientId = this.route.snapshot.paramMap.get('id');
      const isViewMode = this.route.snapshot.data['mode'] === 'view';

      if (clientId) {
        // Modo editar o ver
        this.mode.set(isViewMode ? 'view' : 'edit');
        await this.loadClient(clientId);
      } else {
        // Modo crear
        this.mode.set('create');
        this.buildForm();
      }

      this.cdr.markForCheck();

    } catch (error) {
      console.error('Error inicializando formulario:', error);
      this.notify.crud.loadError('el formulario');
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Cargar cliente existente
   */
  private async loadClient(clientId: string) {
    try {
      const client = await this.clientsService.getClientById(clientId);

      if (!client) {
        this.notify.error('Cliente no encontrado');
        this.router.navigate(['/modules/clients']);
        return;
      }

      this.currentClient.set(client);
      this.buildForm(client);

    } catch (error) {
      console.error('Error cargando cliente:', error);
      this.notify.crud.loadError('el cliente');
      this.router.navigate(['/modules/clients']);
    }
  }

  /**
   * Construir formulario dinámico
   */
  private buildForm(client?: Client) {
    const formControls: any = {};
    const fields = this.fields();
    const layout = this.formLayout();

    // Si hay layout personalizado, obtener solo los campos que están en el layout
    let fieldsToRender = fields;
    if (layout && layout.fields && Object.keys(layout.fields).length > 0) {

      fieldsToRender = fields.filter(field => {
        const isInLayout = layout.fields[field.id] !== undefined;
        if (!isInLayout) {
          
        }
        return isInLayout;
      });

    }

    fieldsToRender.forEach(field => {
      // Verificar que el campo esté activo (no debería haber inactivos aquí)
      if (!field.isActive) {
        console.error(`   ❌ ERROR: Campo INACTIVO "${field.label}" apareció en this.fields() - ESTO ES UN BUG`);
        return; // Skip este campo
      }

      // Para campos tipo DICTIONARY, crear un control por cada opción
      if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
        
        field.options.forEach(option => {
          const controlName = `${field.name}_${option.value}`;
          const initialValue = this.getDictionaryOptionValue(field, option.value, client);
          const validators = field.validation.required ? [Validators.required] : [];

          formControls[controlName] = [
            { value: initialValue, disabled: this.mode() === 'view' },
            validators
          ];
        });
      } else if (field.type === FieldType.DICTIONARY) {

      } else {
        // Para otros tipos de campos, comportamiento normal
        let initialValue = this.getInitialValue(field, client);
        const validators = this.createValidators(field);

        formControls[field.name] = [
          { value: initialValue, disabled: this.mode() === 'view' },
          validators
        ];
      }
    });

    this.clientForm = this.fb.group(formControls);

    // Log del estado del formulario después de construcción

  }

  /**
   * Obtener valor inicial del campo (delegado a utilidad compartida)
   */
  private getInitialValue(field: FieldConfig, client?: Client): any {
    return getFieldInitialValue(field, client);
  }

  /**
   * Obtener valor de una opción específica de un campo DICTIONARY
   */
  private getDictionaryOptionValue(field: FieldConfig, optionValue: string, client?: Client): string {
    if (!client) {
      return '';
    }

    // Buscar en customFields
    if (client.customFields && field.name in client.customFields) {
      const dictionaryData = client.customFields[field.name];

      // Si el diccionario es un objeto, buscar la clave específica
      if (dictionaryData && typeof dictionaryData === 'object' && optionValue in dictionaryData) {
        return dictionaryData[optionValue] || '';
      }
    }

    return '';
  }

  /**
   * Crear validadores dinámicos (delegado a utilidad compartida)
   */
  private createValidators(field: FieldConfig) {
    return createFieldValidators(field);
  }

  /**
   * Guardar cliente
   */
  async onSubmit() {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.notify.validation.invalidForm();
      return;
    }

    try {
      this.isSaving.set(true);
      this.cdr.markForCheck();

      const formValue = this.clientForm.value;

      // Separar campos por defecto y personalizados
      const defaultFields: any = {};
      const customFields: any = {};

      // Obtener solo los campos que están en el layout (los mismos que tienen controles en el FormGroup)
      const layout = this.formLayout();
      let fieldsToProcess = this.fields();

      if (layout && layout.fields && Object.keys(layout.fields).length > 0) {
        fieldsToProcess = this.fields().filter(field => layout.fields[field.id] !== undefined);
        
      }

      fieldsToProcess.forEach(field => {
        // Para campos DICTIONARY, reconstruir el objeto desde los controles individuales
        if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
          const dictionaryValue: any = {};

          field.options.forEach(option => {
            const controlName = `${field.name}_${option.value}`;
            const value = formValue[controlName];
            dictionaryValue[option.value] = value || '';
          });

          if (field.isDefault) {
            defaultFields[field.name] = dictionaryValue;
          } else {
            customFields[field.name] = dictionaryValue;
          }
        } else {
          // Para otros tipos de campos, comportamiento normal
          const value = formValue[field.name];

          if (field.isDefault) {
            defaultFields[field.name] = value;
          } else {
            customFields[field.name] = value;
          }
        }
      });

      if (this.mode() === 'create') {
        // Crear nuevo cliente
        const clientData: CreateClientData = {
          ...defaultFields,
          customFields
        };

        await this.clientsService.createClient(clientData);
        this.notify.crud.created('Cliente');

      } else if (this.mode() === 'edit') {
        // Actualizar cliente existente
        const client = this.currentClient();
        if (!client) return;

        const updateData: UpdateClientData = {
          ...defaultFields,
          customFields: {
            ...client.customFields,
            ...customFields
          }
        };

        await this.clientsService.updateClient(client.id, updateData);
        this.notify.crud.updated('Cliente');
      }

      // Volver a la lista
      this.router.navigate(['/modules/clients']);

    } catch (error) {
      console.error('Error guardando cliente:', error);
      this.notify.crud.saveError('el cliente');
    } finally {
      this.isSaving.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Cancelar y volver
   */
  onCancel() {
    if (this.clientForm.dirty) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: '¿Descartar cambios?',
          message: 'Tienes cambios sin guardar. ¿Estás seguro de que deseas descartarlos?',
          confirmText: 'Descartar',
          cancelText: 'Continuar editando',
          type: 'warning'
        } as ConfirmDialogData
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.router.navigate(['/modules/clients']);
        }
      });
    } else {
      this.router.navigate(['/modules/clients']);
    }
  }

  /**
   * Cambiar a modo edición (desde modo ver)
   */
  enableEdit() {
    this.mode.set('edit');
    this.clientForm.enable();
  }

  /**
   * Obtener mensaje de error de un campo (delegado a utilidad compartida)
   */
  getErrorMessage(fieldName: string): string {
    const control = this.clientForm.get(fieldName);
    const field = this.fields().find(f => f.name === fieldName);
    return getFieldErrorMessage(control, field?.label || fieldName);
  }

  /**
   * Verificar si un campo tiene error (delegado a utilidad compartida)
   */
  hasError(fieldName: string): boolean {
    return fieldHasError(this.clientForm.get(fieldName));
  }

  /**
   * Obtener ancho del campo en el formulario
   * Respeta la configuración formWidth del usuario del builder
   */
  getFieldWidth(field: FieldConfig): string {
    switch (field.formWidth) {
      case 'full':
        return 'col-span-2';
      case 'half':
        return 'col-span-2 md:col-span-1';
      case 'third':
        return 'col-span-2 md:col-span-1 lg:col-span-1';
      default:
        return 'col-span-2 md:col-span-1';
    }
  }

  /**
   * Verificar si el formulario tiene cambios
   */
  hasChanges(): boolean {
    return this.clientForm.dirty;
  }

  /**
   * Obtener lista de campos inválidos
   * IMPORTANTE: Solo retorna campos que están ACTIVOS y presentes en el FormGroup
   */
  getInvalidFields(): FieldConfig[] {
    if (!this.clientForm) return [];

    return this.fields().filter(field => {
      // Verificar que el campo esté activo (doble verificación de seguridad)
      if (!field.isActive) {
        
        return false;
      }

      // Para campos DICTIONARY, verificar cada opción
      if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
        return field.options.some(option => {
          const controlName = `${field.name}_${option.value}`;
          const control = this.clientForm.get(controlName);
          // Solo contar como inválido si el control existe Y es inválido
          return control && control.invalid;
        });
      } else {
        const control = this.clientForm.get(field.name);
        // Solo contar como inválido si el control existe Y es inválido
        return control && control.invalid;
      }
    });
  }

  /**
   * Verificar si el formulario tiene errores de validación
   */
  hasValidationErrors(): boolean {
    return this.clientForm && this.clientForm.invalid;
  }

  /**
   * Obtener mensaje de tooltip para el botón deshabilitado
   */
  getSubmitButtonTooltip(): string {
    if (this.isSaving()) {
      return 'Guardando cliente...';
    }

    if (this.clientForm.invalid) {
      const invalidFields = this.getInvalidFields();
      if (invalidFields.length > 0) {
        const fieldNames = invalidFields.map(f => f.label).slice(0, 3).join(', ');
        const more = invalidFields.length > 3 ? ` y ${invalidFields.length - 3} más` : '';
        return `Completa los campos requeridos: ${fieldNames}${more}`;
      }
      return 'Completa todos los campos requeridos';
    }

    return '';
  }

  /**
   * Marcar todos los campos como touched para mostrar errores
   */
  showAllValidationErrors() {
    this.clientForm.markAllAsTouched();
    this.cdr.markForCheck();
  }

  /**
   * MÉTODO DE DEBUG - Imprimir estado del formulario en consola
   * Puedes llamar esto desde la consola del navegador para debuggear
   */
  debugFormState() {

    this.fields().forEach((field, index) => {

    });

    Object.keys(this.clientForm.controls).forEach((controlName, index) => {
      const control = this.clientForm.get(controlName);

    });

    const invalidFields = this.getInvalidFields();
    if (invalidFields.length === 0) {

    } else {
      invalidFields.forEach((field, index) => {
        const control = this.clientForm.get(field.name);

      });
    }

    // Buscar campo específico por nombre

    const testField = this.fields().find(f => f.name === 'test');
    if (testField) {

      const testControl = this.clientForm.get('test');
      if (testControl) {

      } else {

      }
    } else {

      // Buscar en TODOS los campos de la configuración (incluyendo inactivos)
      const allFields = this.configService.fields();
      const testInAll = allFields.find(f => f.name === 'test');
      if (testInAll) {

      }
    }

  }

  /**
   * SOLUCIÓN TEMPORAL: Desactivar campo problemático
   * Esto marcará el campo "test" como inactivo en Firebase
   */
  async fixTestField() {
    try {
      const allFields = this.configService.fields();
      const testField = allFields.find(f => f.name === 'test');

      if (!testField) {

        this.notify.error('Campo "test" no encontrado en la configuración');
        return;
      }

      await this.configService.updateField(testField.id, { isActive: false });

      this.notify.success('Campo "test" desactivado. Recarga la página.');

    } catch (error) {
      console.error('❌ Error desactivando campo:', error);
      this.notify.error('Error al desactivar el campo');
    }
  }

  // ========== MÉTODOS PARA LAYOUT PERSONALIZADO ==========

  /**
   * Obtener número de columnas del grid
   */
  getFormColumns(): number {
    return this.formLayout()?.columns || 2;
  }

  /**
   * Obtener espaciado configurado
   */
  getFormSpacing(): string {
    const spacing = this.formLayout()?.spacing || 'normal';
    switch (spacing) {
      case 'compact':
        return 'gap-3';
      case 'spacious':
        return 'gap-8';
      default:
        return 'gap-6';
    }
  }

  /**
   * Obtener clase de grid según columnas
   */
  getGridClass(): string {
    const cols = this.getFormColumns();
    const baseClass = 'grid';

    switch (cols) {
      case 2:
        return `${baseClass} grid-cols-1 md:grid-cols-2`;
      case 3:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
      case 4:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-4`;
      default:
        return `${baseClass} grid-cols-1 md:grid-cols-2`;
    }
  }

  /**
   * Obtener filas del grid con sus campos organizados
   */
  getGridRows(): FieldConfig[][] {
    const layout = this.formLayout();
    const fields = this.fields();

    if (!layout || !layout.fields || Object.keys(layout.fields).length === 0) {
      // Sin layout personalizado, usar layout por defecto (lista simple)

      fields.forEach((f, i) => {
        
      });
      return [fields];
    }

    // Organizar campos según posiciones del layout
    const fieldPositions: Array<{field: FieldConfig, position: FieldPosition}> = [];

    fields.forEach(field => {
      const position = layout.fields[field.id];
      if (position) {

        fieldPositions.push({ field, position });
      } else {

      }
    });

    // Ordenar por row y col
    fieldPositions.sort((a, b) => {
      if (a.position.row !== b.position.row) {
        return a.position.row - b.position.row;
      }
      return a.position.col - b.position.col;
    });

    // Agrupar por filas
    const rows: FieldConfig[][] = [];
    let currentRow = -1;
    let currentRowFields: FieldConfig[] = [];

    fieldPositions.forEach(({field, position}) => {
      if (position.row !== currentRow) {
        if (currentRowFields.length > 0) {
          rows.push(currentRowFields);
        }
        currentRow = position.row;
        currentRowFields = [];
      }
      currentRowFields.push(field);
    });

    if (currentRowFields.length > 0) {
      rows.push(currentRowFields);
    }

    return rows;
  }

  /**
   * Verificar si usa layout personalizado
   */
  hasCustomLayout(): boolean {
    const layout = this.formLayout();
    return !!(layout && layout.fields && Object.keys(layout.fields).length > 0);
  }

  /**
   * Obtener configuración de botones
   */
  getButtonsConfig() {
    return this.formLayout()?.buttons || {
      position: 'right',
      order: ['save', 'cancel'],
      style: 'inline',
      showLabels: true
    };
  }

  /**
   * Obtener clase de alineación de botones
   */
  getButtonsJustify(): string {
    const position = this.getButtonsConfig().position;
    switch (position) {
      case 'left':
        return 'justify-start';
      case 'center':
        return 'justify-center';
      default:
        return 'justify-end';
    }
  }

  /**
   * Obtener clase de dirección de botones
   */
  getButtonsDirection(): string {
    const style = this.getButtonsConfig().style;
    return style === 'stacked' ? 'flex-col' : 'flex-row';
  }
}
