// src/app/modules/projects/components/add-material-dialog/add-material-dialog.component.ts

import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { MaterialsService } from '../../../materials/services/materials.service';
import { MaterialsConfigService } from '../../../materials/services/materials-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Material } from '../../../materials/models';
import { DynamicFormDialogBase } from '../../../../shared/components/dynamic-form-dialog-base/dynamic-form-dialog-base.component';

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
export class AddMaterialDialogComponent extends DynamicFormDialogBase implements OnInit {
  private materialsService = inject(MaterialsService);
  private configService = inject(MaterialsConfigService);
  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<AddMaterialDialogComponent>);

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

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isLoading.set(true);
      const { defaultFields, customFields } = this.separateFormValues();

      const materialData: Partial<Material> = {
        ...defaultFields,
        customFields
      };

      const uid = this.authService.authorizedUser()?.uid || '';
      const result = await this.materialsService.createMaterial(materialData, uid);

      if (result.success) {
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
}
