// src/app/modules/projects/components/add-client-dialog/add-client-dialog.component.ts

import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule
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
        this.notify.warning('No hay campos configurados. Contacta al administrador.');
        this.dialogRef.close();
        return;
      }

      this.fields.set(fieldsInUse);
      this.buildForm();
      this.cdr.markForCheck();

    } catch (error) {
      console.error('Error inicializando formulario:', error);
      this.notify.error('Error al cargar el formulario');
      this.dialogRef.close();
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.validation.invalidForm();
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
      this.notify.crud.created('cliente');
      this.dialogRef.close(newClient);
    } catch (error) {
      console.error('Error creando cliente:', error);
      this.notify.crud.saveError('cliente');
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
