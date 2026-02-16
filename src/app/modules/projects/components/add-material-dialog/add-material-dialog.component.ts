// src/app/modules/projects/components/add-material-dialog/add-material-dialog.component.ts

import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MaterialsService } from '../../../materials/services/materials.service';
import { MaterialsConfigService } from '../../../materials/services/materials-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Material, FieldConfig, FieldType } from '../../../materials/models';

@Component({
  selector: 'app-add-material-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './add-material-dialog.component.html',
  styleUrls: ['./add-material-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddMaterialDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private materialsService = inject(MaterialsService);
  private configService = inject(MaterialsConfigService);
  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<AddMaterialDialogComponent>);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(false);
  fields = signal<FieldConfig[]>([]);
  materialForm!: FormGroup;

  FieldType = FieldType;

  async ngOnInit() {
    await this.initForm();
  }

  async initForm() {
    try {
      this.isLoading.set(true);

      await this.configService.initialize();

      const activeFields = this.configService.getActiveFields();

      if (activeFields.length === 0) {
        this.snackBar.open('No hay campos configurados. Contacta al administrador.', 'Cerrar', { duration: 5000 });
        this.dialogRef.close();
        return;
      }

      this.fields.set(activeFields);
      this.buildForm();
      this.cdr.markForCheck();

    } catch (error) {
      console.error('Error inicializando formulario:', error);
      this.snackBar.open('Error al cargar el formulario', 'Cerrar', { duration: 3000 });
      this.dialogRef.close();
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private buildForm() {
    const formControls: any = {};
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

    this.materialForm = this.fb.group(formControls);
  }

  private getDefaultValueByType(type: FieldType): any {
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

  private createValidators(field: FieldConfig): ValidatorFn[] {
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

  private urlValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) return null;
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      return urlPattern.test(control.value) ? null : { url: { value: control.value } };
    };
  }

  async save() {
    if (this.materialForm.invalid) {
      this.materialForm.markAllAsTouched();
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isLoading.set(true);
      const formValue = this.materialForm.value;

      const defaultFields: any = {};
      const customFields: any = {};

      this.fields().forEach(field => {
        if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
          const dictionaryValue: any = {};
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

      const materialData: Partial<Material> = {
        ...defaultFields,
        customFields
      };

      const uid = this.authService.authorizedUser()?.uid || '';
      const result = await this.materialsService.createMaterial(materialData, uid);

      if (result.success) {
        // Obtener el material recién creado del signal actualizado
        const newMaterial = this.materialsService.materials().find(m => m.id === result.data?.id);
        this.snackBar.open('Material creado exitosamente', 'Cerrar', { duration: 2000 });
        this.dialogRef.close(newMaterial || null);
      } else {
        this.snackBar.open(result.message || 'Error al crear el material', 'Cerrar', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error creando material:', error);
      this.snackBar.open('Error al crear el material', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.materialForm.get(fieldName);
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
    const control = this.materialForm.get(fieldName);
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
