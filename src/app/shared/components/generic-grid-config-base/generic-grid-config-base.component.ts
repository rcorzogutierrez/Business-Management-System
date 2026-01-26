// src/app/shared/components/generic-grid-config-base/generic-grid-config-base.component.ts

import { Component, OnInit, computed, signal, effect, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GridConfiguration } from '../../modules/dynamic-form-builder/models/module-config.interface';

/**
 * Componente base genérico para configuración de GridConfiguration solamente
 *
 * Este componente proporciona toda la lógica para gestionar configuración de tablas:
 * - Toggles de funcionalidades (búsqueda, filtros, exportación, etc.)
 * - Configuración de paginación
 * - Modo compacto
 * - Vista por defecto
 *
 * NO incluye gestión de campos dinámicos (eso está en GenericConfigBaseComponent).
 *
 * Úsalo para módulos que:
 * - Tienen formularios hardcodeados (no usan form builder)
 * - Solo necesitan configurar el comportamiento de la tabla
 * - Ejemplo: Workers, Projects (futuros módulos sin campos dinámicos)
 */
@Component({
  selector: 'app-generic-grid-config-base',
  standalone: true,
  imports: [CommonModule],
  template: '',  // Los hijos proveen su propio template
})
export abstract class GenericGridConfigBaseComponent implements OnInit {
  // Services (inyectados por el componente hijo)
  protected snackBar = inject(MatSnackBar);
  protected router = inject(Router);
  protected cdr = inject(ChangeDetectorRef);

  // Propiedades abstractas que cada módulo debe implementar
  abstract configService: any; // Servicio con gridConfig (puede ser ModuleConfigBaseService u otro)
  abstract modulePath: string;  // Ej: '/modules/workers'

  // ==============================================
  // PROPIEDADES COMPARTIDAS
  // ==============================================

  isLoading = false;

  // Opciones para el select de itemsPerPage (compartido por todos los módulos)
  pageSizeOptions = [10, 25, 50, 100];

  // ==============================================
  // COMPUTED SIGNALS COMPARTIDOS
  // ==============================================

  /**
   * GridConfiguration del módulo
   * Intenta obtener de config.gridConfig o directamente de gridConfig()
   */
  gridConfig = computed(() => {
    // Intentar obtener desde config() signal (para módulos con ModuleConfigBaseService)
    const config = this.configService.config?.();
    if (config?.gridConfig) {
      return config.gridConfig;
    }

    // Intentar obtener directamente desde gridConfig() signal (para servicios simples)
    const directGridConfig = this.configService.gridConfig?.();
    if (directGridConfig) {
      return directGridConfig;
    }

    // Retornar valores por defecto si no existe
    return this.getDefaultGridConfig();
  });

  /**
   * Verificar si todas las funcionalidades están activas
   */
  allFeaturesEnabled = computed(() => {
    const gc = this.gridConfig();
    return gc.enableSearch &&
           gc.enableFilters &&
           gc.enableExport &&
           gc.enableBulkActions &&
           gc.enableColumnSelector &&
           gc.compactMode;
  });

  // ==============================================
  // LIFECYCLE
  // ==============================================

  ngOnInit(): void {
    this.loadConfig();
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Carga de Configuración
  // ==============================================

  /**
   * Cargar configuración del módulo
   */
  async loadConfig(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      // Intentar loadConfig() primero (para ModuleConfigBaseService)
      if (typeof this.configService.loadConfig === 'function') {
        await this.configService.loadConfig();
      }
      // Si no existe, intentar initialize() (para servicios simples)
      else if (typeof this.configService.initialize === 'function') {
        await this.configService.initialize();
      }

      // El effect() sincronizará automáticamente selectedItemsPerPage con gridConfig().itemsPerPage
    } catch (error) {
      console.error('Error cargando configuración:', error);
      this.snackBar.open('Error al cargar la configuración', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Actualización de Grid
  // ==============================================

  /**
   * Actualizar una configuración específica del grid
   */
  async updateGridConfig(key: keyof GridConfiguration, value: any): Promise<void> {
    try {
      const currentGridConfig = this.gridConfig();

      // Convertir value a número si es itemsPerPage
      const finalValue = key === 'itemsPerPage' ? Number(value) : value;

      const updatedConfig = {
        ...currentGridConfig,
        [key]: finalValue
      };

      // Llamar al método del servicio para actualizar
      // Puede ser updateGridConfig() o updateConfig()
      if (typeof this.configService.updateGridConfig === 'function') {
        await this.configService.updateGridConfig(updatedConfig);
      } else if (typeof this.configService.updateConfig === 'function') {
        const currentConfig = this.configService.config();
        await this.configService.updateConfig({
          ...currentConfig,
          gridConfig: updatedConfig
        });
      } else {
        console.error('Servicio no tiene método de actualización');
      }

      // Forzar detección de cambios múltiple para asegurar que el select se actualice
      this.cdr.markForCheck();
      setTimeout(() => this.cdr.markForCheck(), 0);

      this.snackBar.open('✅ Configuración actualizada correctamente', '', {
        duration: 2000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Error actualizando configuración del grid:', error);
      this.snackBar.open('❌ Error al actualizar la configuración', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Toggle: Activa o desactiva todas las funcionalidades de la tabla
   */
  async toggleAllFeatures(): Promise<void> {
    try {
      const currentGridConfig = this.gridConfig();
      const shouldEnable = !this.allFeaturesEnabled();

      const updatedConfig = {
        ...currentGridConfig,
        enableColumnSelector: shouldEnable,
        enableFilters: shouldEnable,
        enableExport: shouldEnable,
        enableBulkActions: shouldEnable,
        enableSearch: shouldEnable,
        compactMode: shouldEnable
      };

      this.isLoading = true;
      this.cdr.markForCheck();

      // Llamar al método del servicio para actualizar
      if (typeof this.configService.updateGridConfig === 'function') {
        await this.configService.updateGridConfig(updatedConfig);
      } else if (typeof this.configService.updateConfig === 'function') {
        const currentConfig = this.configService.config();
        await this.configService.updateConfig({
          ...currentConfig,
          gridConfig: updatedConfig
        });
      }

      const message = shouldEnable
        ? '✅ Todas las funcionalidades han sido activadas'
        : '✅ Todas las funcionalidades han sido desactivadas';

      this.snackBar.open(message, '', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error al cambiar funcionalidades:', error);
      this.snackBar.open('❌ Error al cambiar las funcionalidades', '', {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ==============================================
  // MÉTODOS COMPARTIDOS - Navegación
  // ==============================================

  /**
   * Volver al listado del módulo
   */
  goBack(): void {
    this.router.navigate([this.modulePath]);
  }

  // ==============================================
  // MÉTODOS PRIVADOS
  // ==============================================

  /**
   * Obtener configuración de grid por defecto
   */
  private getDefaultGridConfig(): GridConfiguration {
    return {
      defaultView: 'table',
      itemsPerPage: 10,
      sortBy: 'name',
      sortOrder: 'asc',
      enableSearch: true,
      enableFilters: true,
      enableExport: true,
      enableBulkActions: true,
      enableColumnSelector: true,
      showThumbnails: false,
      compactMode: false
    };
  }
}
