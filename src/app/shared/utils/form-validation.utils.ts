// src/app/shared/utils/form-validation.utils.ts
//
// Utilidades compartidas para validación de formularios dinámicos.
// Extraído de client-form y material-form (código 100% idéntico en ambos).

import { ValidatorFn, Validators, AbstractControl } from '@angular/forms';

/**
 * Crea validadores de Angular Forms basados en la configuración del campo.
 */
export function createFieldValidators(field: { type: string; validation: any }): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  const validation = field.validation;

  if (!validation) return validators;

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
  if (validation.email || field.type === 'email') {
    validators.push(Validators.email);
  }
  if (validation.min !== undefined) {
    validators.push(Validators.min(validation.min));
  }
  if (validation.max !== undefined) {
    validators.push(Validators.max(validation.max));
  }
  if (validation.url || field.type === 'url') {
    validators.push(urlValidator());
  }

  return validators;
}

/**
 * Validador personalizado para URLs.
 */
export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      return null;
    }
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const valid = urlPattern.test(control.value);
    return valid ? null : { url: { value: control.value } };
  };
}

/**
 * Obtiene el valor por defecto según el tipo de campo.
 */
export function getDefaultValueByFieldType(type: string): any {
  switch (type) {
    case 'checkbox':
      return false;
    case 'number':
    case 'currency':
      return null;
    case 'multiselect':
      return [];
    default:
      return '';
  }
}

/**
 * Obtiene el valor inicial de un campo, buscando en la entidad o usando defaults.
 *
 * @param field - Configuración del campo con name, type y defaultValue
 * @param entity - Entidad existente (client, material, etc.) o undefined para modo crear
 * @param textTypes - Tipos considerados como texto (por defecto: text, textarea, email, phone, url)
 */
export function getFieldInitialValue(
  field: { name: string; type: string; defaultValue?: any },
  entity?: any,
  textTypes: string[] = ['text', 'textarea', 'email', 'phone', 'url']
): any {
  if (!entity) {
    if (field.defaultValue !== null && field.defaultValue !== undefined) {
      if (field.defaultValue === '' && !textTypes.includes(field.type)) {
        return getDefaultValueByFieldType(field.type);
      }
      return field.defaultValue;
    }
    return getDefaultValueByFieldType(field.type);
  }

  // Buscar en campos directos de la entidad
  if (field.name in entity) {
    return entity[field.name];
  }

  // Buscar en customFields
  if (entity.customFields && field.name in entity.customFields) {
    return entity.customFields[field.name];
  }

  // Fallback
  if (field.defaultValue !== null && field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  return getDefaultValueByFieldType(field.type);
}

/**
 * Obtiene el mensaje de error para un campo de formulario.
 */
export function getFieldErrorMessage(
  control: AbstractControl | null,
  fieldLabel?: string
): string {
  if (!control || !control.errors || !control.touched) {
    return '';
  }

  const errors = control.errors;
  const label = fieldLabel || 'Campo';

  if (errors['required']) return `${label} es requerido`;
  if (errors['email']) return 'Formato de correo electrónico inválido';
  if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
  if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
  if (errors['min']) return `El valor mínimo es ${errors['min'].min}`;
  if (errors['max']) return `El valor máximo es ${errors['max'].max}`;
  if (errors['pattern']) return 'Formato inválido';
  if (errors['url']) return 'URL inválida';

  return 'Campo inválido';
}

/**
 * Verifica si un campo tiene error y ha sido tocado.
 */
export function fieldHasError(control: AbstractControl | null): boolean {
  return !!(control && control.invalid && control.touched);
}
