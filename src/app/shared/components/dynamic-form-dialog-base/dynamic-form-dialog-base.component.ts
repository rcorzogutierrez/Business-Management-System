// src/app/shared/components/dynamic-form-dialog-base/dynamic-form-dialog-base.component.ts

import { inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FieldConfig, FieldType } from '../../modules/dynamic-form-builder/models/field-config.interface';

/**
 * Clase base abstracta para diálogos con formularios dinámicos.
 *
 * Centraliza la lógica compartida entre AddClientDialog y AddMaterialDialog:
 * - Construcción de formulario reactivo desde FieldConfig[]
 * - Validadores dinámicos
 * - Mensajes de error
 * - Utilidades de layout
 *
 * Los hijos solo implementan: initForm() y save()
 */
export abstract class DynamicFormDialogBase {
  protected fb = inject(FormBuilder);
  protected snackBar = inject(MatSnackBar);
  protected cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(false);
  fields = signal<FieldConfig[]>([]);
  form!: FormGroup;

  // Exponer FieldType al template
  FieldType = FieldType;

  /**
   * Construye el FormGroup dinámico basado en los campos configurados.
   * Maneja campos normales y tipo DICTIONARY (un control por opción).
   */
  protected buildForm(): void {
    const formControls: Record<string, any> = {};
    const fields = this.fields();

    fields.forEach(field => {
      if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
        field.options.forEach(option => {
          const controlName = `${field.name}_${option.value}`;
          const validators = field.validation.required ? [Validators.required] : [];
          formControls[controlName] = ['', validators];
        });
      } else if (field.type !== FieldType.DICTIONARY) {
        const initialValue = this.getDefaultValueByType(field.type);
        const validators = this.createValidators(field);
        formControls[field.name] = [initialValue, validators];
      }
    });

    this.form = this.fb.group(formControls);
  }

  /**
   * Separa los valores del formulario en campos default y custom.
   * Útil para construir el payload antes de guardar.
   */
  protected separateFormValues(): { defaultFields: Record<string, any>; customFields: Record<string, any> } {
    const formValue = this.form.value;
    const defaultFields: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    this.fields().forEach(field => {
      if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
        const dictionaryValue: Record<string, any> = {};
        field.options.forEach(option => {
          const controlName = `${field.name}_${option.value}`;
          dictionaryValue[option.value] = formValue[controlName] || '';
        });

        if (field.isDefault) {
          defaultFields[field.name] = dictionaryValue;
        } else {
          customFields[field.name] = dictionaryValue;
        }
      } else {
        const value = formValue[field.name];
        if (field.isDefault) {
          defaultFields[field.name] = value;
        } else {
          customFields[field.name] = value;
        }
      }
    });

    return { defaultFields, customFields };
  }

  protected getDefaultValueByType(type: FieldType): any {
    switch (type) {
      case FieldType.CHECKBOX:
        return false;
      case FieldType.NUMBER:
      case FieldType.CURRENCY:
        return null;
      case FieldType.MULTISELECT:
        return [];
      default:
        return '';
    }
  }

  protected createValidators(field: FieldConfig): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    const validation = field.validation;

    if (validation.required) {
      validators.push(Validators.required);
    }
    if (validation.minLength) {
      validators.push(Validators.minLength(validation.minLength));
    }
    if (validation.maxLength) {
      validators.push(Validators.maxLength(validation.maxLength));
    }
    if (validation.pattern) {
      validators.push(Validators.pattern(validation.pattern));
    }
    if (validation.email || field.type === FieldType.EMAIL) {
      validators.push(Validators.email);
    }
    if (validation.min !== undefined) {
      validators.push(Validators.min(validation.min));
    }
    if (validation.max !== undefined) {
      validators.push(Validators.max(validation.max));
    }
    if (validation.url || field.type === FieldType.URL) {
      validators.push(this.urlValidator());
    }

    return validators;
  }

  protected urlValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null;
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      return urlPattern.test(control.value) ? null : { url: { value: control.value } };
    };
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    const field = this.fields().find(f => f.name === fieldName);
    const errors = control.errors;

    if (errors['required']) return `${field?.label || fieldName} es requerido`;
    if (errors['email']) return 'Formato de correo electrónico inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return `El valor mínimo es ${errors['min'].min}`;
    if (errors['max']) return `El valor máximo es ${errors['max'].max}`;
    if (errors['pattern']) return 'Formato inválido';
    if (errors['url']) return 'URL inválida';

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  getFieldWidth(field: FieldConfig): string {
    if (field.type === FieldType.TEXTAREA || field.type === FieldType.DICTIONARY) {
      return 'col-span-2';
    }
    if (field.type === FieldType.MULTISELECT && field.options && field.options.length > 4) {
      return 'col-span-2';
    }
    return 'col-span-1';
  }
}
