// src/app/modules/workers/services/worker-config.service.ts

import { Injectable } from '@angular/core';
import { WorkerModuleConfig, DEFAULT_MODULE_CONFIG, DEFAULT_WORKER_FIELDS } from '../models';
import { ModuleConfigBaseService } from '../../../shared/modules/dynamic-form-builder';

/**
 * Servicio de configuración específico para el módulo de trabajadores
 * Extiende ModuleConfigBaseService para heredar toda la funcionalidad común
 * y agregar funcionalidad específica de trabajadores
 */
@Injectable({
  providedIn: 'root'
})
export class WorkerConfigService extends ModuleConfigBaseService<WorkerModuleConfig> {

  // Implementación de propiedades abstractas
  protected readonly collectionPath = 'moduleConfigs/workers';
  protected readonly defaultFields = DEFAULT_WORKER_FIELDS;

  /**
   * Retorna la configuración por defecto del módulo de trabajadores
   */
  protected getDefaultConfig(): Omit<WorkerModuleConfig, 'id' | 'lastModified' | 'modifiedBy'> {
    return {
      ...DEFAULT_MODULE_CONFIG,
      fields: [], // Los campos se agregarán desde defaultFields
      // Asegurar que settings específicos de trabajadores estén incluidos
      settings: {
        enableTags: true,
        enableAssignment: true,
        enableStatus: true,
        requireApproval: false,
        autoArchive: false,
        autoArchiveDays: 365
      }
    };
  }

  // ========================================
  // Métodos específicos de trabajadores
  // (no están en la clase base)
  // ========================================

  /**
   * Actualizar configuración del grid
   */
  async updateGridConfig(gridConfig: Partial<WorkerModuleConfig['gridConfig']>): Promise<void> {
    try {
      const currentConfig = this.config();
      if (!currentConfig) {
        throw new Error('Configuración no cargada');
      }

      const updatedGridConfig = {
        ...currentConfig.gridConfig,
        ...gridConfig
      };

      await this.updateConfig({ gridConfig: updatedGridConfig });

    } catch (error) {
      console.error('❌ Error actualizando configuración del grid:', error);
      throw error;
    }
  }

  /**
   * Actualizar permisos del módulo
   */
  async updatePermissions(permissions: Partial<WorkerModuleConfig['permissions']>): Promise<void> {
    try {
      const currentConfig = this.config();
      if (!currentConfig) {
        throw new Error('Configuración no cargada');
      }

      const updatedPermissions = {
        ...currentConfig.permissions,
        ...permissions
      };

      await this.updateConfig({ permissions: updatedPermissions });

    } catch (error) {
      console.error('❌ Error actualizando permisos:', error);
      throw error;
    }
  }

  /**
   * Actualizar layout del formulario
   * (sobrescribe el método de la clase base para agregar validación específica)
   */
  override async saveFormLayout(layout: import('../models/worker-module-config.interface').FormLayoutConfig): Promise<void> {
    try {
      // Validación específica de trabajadores si es necesaria
      if (layout.columns < 2 || layout.columns > 4) {
        throw new Error('El número de columnas debe estar entre 2 y 4');
      }

      // Llamar al método de la clase base
      await super.saveFormLayout(layout);

    } catch (error) {
      console.error('❌ Error actualizando layout del formulario:', error);
      throw error;
    }
  }
}
