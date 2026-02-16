// src/app/modules/projects/components/add-client-dialog/add-client-dialog.component.ts

import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';
import { CreateClientData } from '../../../clients/models';
import { DynamicFormDialogBase } from '../../../../shared/components/dynamic-form-dialog-base/dynamic-form-dialog-base.component';

@Component({
  selector: 'app-add-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './add-client-dialog.component.html',
  styleUrls: ['./add-client-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddClientDialogComponent extends DynamicFormDialogBase implements OnInit {
  private clientsService = inject(ClientsService);
  private configService = inject(ClientConfigServiceRefactored);
  private dialogRef = inject(MatDialogRef<AddClientDialogComponent>);

  async ngOnInit() {
    await this.initForm();
  }

  async initForm() {
    try {
      this.isLoading.set(true);

      await this.configService.initialize();
      const fieldsInUse = this.configService.getFieldsInUse();

      if (fieldsInUse.length === 0) {
        this.snackBar.open('No hay campos configurados. Contacta al administrador.', 'Cerrar', { duration: 5000 });
        this.dialogRef.close();
        return;
      }

      this.fields.set(fieldsInUse);
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

      const clientData = {
        ...defaultFields,
        customFields
      } as CreateClientData;

      const newClient = await this.clientsService.createClient(clientData);
      this.snackBar.open('Cliente creado exitosamente', 'Cerrar', { duration: 2000 });
      this.dialogRef.close(newClient);
    } catch (error) {
      console.error('Error creando cliente:', error);
      this.snackBar.open('Error al crear el cliente', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
