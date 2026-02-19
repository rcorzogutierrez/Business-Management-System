// src/app/core/services/notification.service.ts
import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  type: NotificationType;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  private readonly defaultConfig: Partial<MatSnackBarConfig> = {
    horizontalPosition: 'end',
    verticalPosition: 'top',
  };

  private readonly DURATIONS: Record<NotificationType, number> = {
    success: 4000,
    error: 8000,
    warning: 6000,
    info: 5000,
  };

  // --- Métodos base ---

  success(message: string, duration?: number): void {
    this.show(message, {
      ...this.defaultConfig,
      duration: duration ?? this.DURATIONS.success,
      panelClass: ['success-snackbar'],
    });
  }

  error(message: string, duration?: number): void {
    this.show(message, {
      ...this.defaultConfig,
      duration: duration ?? this.DURATIONS.error,
      panelClass: ['error-snackbar'],
    });
  }

  warning(message: string, duration?: number): void {
    this.show(message, {
      ...this.defaultConfig,
      duration: duration ?? this.DURATIONS.warning,
      panelClass: ['warning-snackbar'],
    });
  }

  info(message: string, duration?: number): void {
    this.show(message, {
      ...this.defaultConfig,
      duration: duration ?? this.DURATIONS.info,
      panelClass: ['info-snackbar'],
    });
  }

  // --- Métodos CRUD predefinidos ---

  readonly crud = {
    created: (entity: string) => this.success(`${entity} creado exitosamente`),
    updated: (entity: string) => this.success(`${entity} actualizado exitosamente`),
    deleted: (entity: string) => this.success(`${entity} eliminado exitosamente`),
    deletedMultiple: (count: number, entity: string) =>
      this.success(`${count} ${entity}(s) eliminado(s) exitosamente`),
    statusChanged: (entity: string, status: string) =>
      this.success(`${entity} ${status} exitosamente`),
    saveError: (entity: string) => this.error(`Error al guardar ${entity}`),
    deleteError: (entity: string) => this.error(`Error al eliminar ${entity}`),
    loadError: (entity: string) => this.error(`Error al cargar ${entity}`),
    statusError: (entity: string) => this.error(`Error al cambiar el estado de ${entity}`),
  };

  // --- Métodos de validación ---

  readonly validation = {
    required: (field: string) => this.warning(`${field} es requerido`),
    selectAtLeastOne: (entity: string) =>
      this.warning(`Selecciona al menos un ${entity}`),
    invalidForm: () =>
      this.warning('Por favor completa todos los campos correctamente'),
    configUnavailable: () => this.warning('Configuración no disponible'),
    duplicate: (entity: string) => this.warning(`Este ${entity} ya está agregado`),
  };

  // --- Métodos de sistema ---

  readonly system = {
    refreshed: () => this.success('Datos actualizados', 2000),
    refreshError: () => this.error('Error al actualizar los datos'),
    exported: (format: string) => this.success(`Exportación ${format} completada`),
    exportError: (format: string) => this.error(`Error en la exportación ${format}`),
    unauthorized: () => this.error('Usuario no autenticado'),
    configUpdated: () => this.success('Configuración actualizada correctamente'),
    configError: () => this.error('Error al actualizar la configuración'),
    configLoadError: () => this.error('Error al cargar la configuración'),
  };

  show(message: string, config?: MatSnackBarConfig, action: string = 'Cerrar'): void {
    this.snackBar.open(message, action, config);
  }

  dismiss(): void {
    this.snackBar.dismiss();
  }
}
