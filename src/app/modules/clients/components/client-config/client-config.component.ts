// src/app/modules/clients/components/client-config/client-config.component.ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FieldConfig, FieldType } from '../../models';
import { FormDesignerComponent, FieldConfigDialogComponent } from '../../../../shared/modules/dynamic-form-builder';
import { GenericConfigBaseComponent } from '../../../../shared/components/generic-config-base/generic-config-base.component';

/**
 * Componente de configuración del módulo de Clientes
 * Hereda toda la lógica común de GenericConfigBaseComponent
 * Contiene lógica específica para gestión avanzada de campos (editar, eliminar, reordenar)
 */
@Component({
  selector: 'app-client-config',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatTabsModule,
    MatSlideToggleModule,
    DragDropModule,
    FormDesignerComponent
  ],
  templateUrl: './client-config.component.html',
  styleUrl: './client-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientConfigComponent extends GenericConfigBaseComponent {
  // Implementar propiedades abstractas requeridas
  configService = inject(ClientConfigServiceRefactored);
  override modulePath = '/modules/clients';

  // Propiedades específicas de clientes
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  currentUser = this.authService.authorizedUser;

  // Toda la lógica compartida (gridConfig, allFeaturesEnabled, stats, updateGridConfig,
  // toggleAllFeatures, loadConfig, onLayoutChange, etc.) ya está en la clase base.

  // ==============================================
  // MÉTODOS ESPECÍFICOS DE CLIENTES
  // ==============================================

  /**
   * Abre el dialog para editar un campo
   */
  editField(field: FieldConfig): void {
    const dialogRef = this.dialog.open(FieldConfigDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        mode: 'edit',
        field,
        configService: this.configService,
        moduleName: 'clientes'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        // Recargar configuración después de editar
        this.loadConfig();
      }
    });
  }

  /**
   * Elimina un campo personalizado
   */
  async deleteField(field: FieldConfig): Promise<void> {
    if (field.isSystem) {
      this.snackBar.open('No se pueden eliminar campos del sistema', 'Cerrar', { duration: 3000 });
      return;
    }

    const confirm = window.confirm(
      `¿Estás seguro de eliminar el campo "${field.label}"?\n\nEsta acción no se puede deshacer y los datos existentes se perderán.`
    );

    if (!confirm) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.deleteField(field.id);
      this.snackBar.open('Campo eliminado exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error eliminando campo:', error);
      this.snackBar.open('Error al eliminar el campo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Toggle del estado activo/inactivo de un campo
   */
  async toggleFieldStatus(field: FieldConfig): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.toggleFieldActive(field.id, !field.isActive);
      this.snackBar.open(
        `Campo ${!field.isActive ? 'activado' : 'desactivado'}`,
        'Cerrar',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error cambiando estado:', error);
      this.snackBar.open('Error al cambiar el estado del campo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Toggle de visibilidad en el grid
   */
  async toggleGridVisibility(field: FieldConfig): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.configService.updateField(field.id, {
        gridConfig: {
          ...field.gridConfig,
          showInGrid: !field.gridConfig.showInGrid
        }
      });
      this.snackBar.open(
        `Campo ${!field.gridConfig.showInGrid ? 'visible' : 'oculto'} en tabla`,
        'Cerrar',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error cambiando visibilidad:', error);
      this.snackBar.open('Error al cambiar la visibilidad', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Maneja el reordenamiento drag & drop
   */
  async onFieldDrop(event: CdkDragDrop<FieldConfig[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;

    const fieldsCopy = [...this.fields];
    moveItemInArray(fieldsCopy, event.previousIndex, event.currentIndex);

    // Actualizar orden localmente
    this.fields = fieldsCopy;
    this.cdr.markForCheck();

    // Guardar en Firestore
    const fieldIds = fieldsCopy.map(f => f.id);

    try {
      await this.configService.reorderFields(fieldIds);
      this.snackBar.open('Orden actualizado', '', { duration: 2000 });
    } catch (error) {
      console.error('Error reordenando campos:', error);
      this.snackBar.open('Error al guardar el orden', 'Cerrar', { duration: 3000 });
      await this.loadConfig(); // Recargar si falla
    }
  }

  /**
   * Obtiene el icono según el tipo de campo
   */
  getFieldTypeIcon(type: FieldType): string {
    const icons: Record<FieldType, string> = {
      [FieldType.TEXT]: 'text_fields',
      [FieldType.NUMBER]: 'numbers',
      [FieldType.EMAIL]: 'email',
      [FieldType.PHONE]: 'phone',
      [FieldType.SELECT]: 'arrow_drop_down_circle',
      [FieldType.MULTISELECT]: 'checklist',
      [FieldType.DICTIONARY]: 'list_alt',
      [FieldType.DATE]: 'calendar_today',
      [FieldType.DATETIME]: 'event',
      [FieldType.CHECKBOX]: 'check_box',
      [FieldType.TEXTAREA]: 'notes',
      [FieldType.URL]: 'link',
      [FieldType.CURRENCY]: 'attach_money'
    };
    return icons[type] || 'help_outline';
  }

  /**
   * Obtiene el label legible del tipo
   */
  getFieldTypeLabel(type: FieldType): string {
    const labels: Record<FieldType, string> = {
      [FieldType.TEXT]: 'Texto',
      [FieldType.NUMBER]: 'Número',
      [FieldType.EMAIL]: 'Email',
      [FieldType.PHONE]: 'Teléfono',
      [FieldType.SELECT]: 'Selector',
      [FieldType.MULTISELECT]: 'Multi-selector',
      [FieldType.DICTIONARY]: 'Diccionario',
      [FieldType.DATE]: 'Fecha',
      [FieldType.DATETIME]: 'Fecha/Hora',
      [FieldType.CHECKBOX]: 'Casilla',
      [FieldType.TEXTAREA]: 'Área de texto',
      [FieldType.URL]: 'URL',
      [FieldType.CURRENCY]: 'Moneda'
    };
    return labels[type] || type;
  }

  // Los métodos goBack() y trackByFieldId() ya están implementados en la clase base
}
