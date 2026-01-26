// src/app/modules/workers/services/workers-config.service.ts

import { Injectable, signal } from '@angular/core';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { GridConfiguration } from '../../../shared/modules/dynamic-form-builder/models/module-config.interface';

/**
 * Configuración simple para Workers (solo GridConfiguration)
 */
export interface WorkersConfig {
  gridConfig: GridConfiguration;
  updatedAt?: Date;
  createdAt?: Date;
}

/**
 * Servicio de configuración para el módulo de Workers
 *
 * Gestiona la configuración de GridConfiguration (tabla) persistida en Firestore.
 * NO gestiona campos dinámicos ya que workers usa formulario hardcodeado.
 */
@Injectable({
  providedIn: 'root'
})
export class WorkersConfigService {
  private db = getFirestore();

  // Colección y documento en Firestore
  private readonly CONFIG_COLLECTION = 'moduleConfigs';
  private readonly CONFIG_DOC_ID = 'workers';

  // Signal privado (writable) - ESTRUCTURA SIMILAR A ModuleConfigBaseService
  private _config = signal<WorkersConfig>({
    gridConfig: this.getDefaultGridConfig()
  });

  // Signal público (readonly) - COMPATIBLE CON GenericGridConfigBaseComponent
  config = this._config.asReadonly();

  // También exponer gridConfig directamente para compatibilidad
  gridConfig = () => this._config().gridConfig;

  // Flag de inicialización
  private initialized = false;

  /**
   * Inicializar el servicio cargando la configuración desde Firestore
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadConfig();
      this.initialized = true;
    } catch (error) {
      console.error('Error inicializando WorkersConfigService:', error);
      // Si falla, usar valores por defecto
      this._config.set({
        gridConfig: this.getDefaultGridConfig()
      });
    }
  }

  /**
   * Cargar configuración desde Firestore
   */
  async loadConfig(): Promise<void> {
    try {
      console.log('📥 [SERVICE-LOAD] Cargando configuración desde Firestore...');
      const docRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📄 [SERVICE-LOAD] Datos cargados de Firestore:', data);
        console.log('📄 [SERVICE-LOAD] gridConfig.itemsPerPage:', data?.['gridConfig']?.itemsPerPage, 'tipo:', typeof data?.['gridConfig']?.itemsPerPage);

        if (data?.['gridConfig']) {
          this._config.set({
            gridConfig: data['gridConfig'],
            updatedAt: data['updatedAt']?.toDate?.(),
            createdAt: data['createdAt']?.toDate?.()
          });
          console.log('✅ [SERVICE-LOAD] Signal actualizado con datos de Firestore');
          console.log('📊 [SERVICE-LOAD] _config().gridConfig.itemsPerPage:', this._config().gridConfig.itemsPerPage, 'tipo:', typeof this._config().gridConfig.itemsPerPage);
        } else {
          // Si existe el documento pero no tiene gridConfig, usar valores por defecto
          this._config.set({
            gridConfig: this.getDefaultGridConfig()
          });
          console.log('⚠️ [SERVICE-LOAD] Documento sin gridConfig, usando defaults');
        }
      } else {
        // Si no existe el documento, crear con valores por defecto
        console.log('⚠️ [SERVICE-LOAD] Documento no existe, creando defaults');
        await this.createDefaultConfig();
      }
    } catch (error) {
      console.error('Error cargando configuración de workers:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración del grid en Firestore
   */
  async updateGridConfig(gridConfig: GridConfiguration): Promise<void> {
    try {
      console.log('🔥 [SERVICE] updateGridConfig recibido:', gridConfig);
      console.log('🔥 [SERVICE] itemsPerPage recibido:', gridConfig.itemsPerPage, 'tipo:', typeof gridConfig.itemsPerPage);
      console.log('🔥 [SERVICE] _config ANTES:', this._config());

      const docRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);

      const dataToSave = {
        gridConfig,
        updatedAt: new Date()
      };

      console.log('💾 [SERVICE] Guardando en Firestore:', dataToSave);
      // Actualizar en Firestore
      await setDoc(docRef, dataToSave, { merge: true });
      console.log('✅ [SERVICE] Guardado en Firestore completado');

      // Actualizar signal local
      const newConfig = {
        ...this._config(),
        gridConfig,
        updatedAt: new Date()
      };
      console.log('📡 [SERVICE] Actualizando signal con:', newConfig);
      this._config.set(newConfig);
      console.log('✅ [SERVICE] Signal actualizado');
      console.log('🔥 [SERVICE] _config DESPUÉS:', this._config());
      console.log('🔥 [SERVICE] gridConfig().itemsPerPage DESPUÉS:', this._config().gridConfig.itemsPerPage, 'tipo:', typeof this._config().gridConfig.itemsPerPage);
    } catch (error) {
      console.error('Error actualizando workers grid config:', error);
      throw error;
    }
  }

  /**
   * Crear configuración por defecto en Firestore
   */
  private async createDefaultConfig(): Promise<void> {
    const defaultGridConfig = this.getDefaultGridConfig();
    const newConfig: WorkersConfig = {
      gridConfig: defaultGridConfig,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this._config.set(newConfig);

    const docRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);
    await setDoc(docRef, newConfig);
  }

  /**
   * Obtener configuración de grid por defecto
   */
  private getDefaultGridConfig(): GridConfiguration {
    return {
      defaultView: 'table',
      itemsPerPage: 25, // Workers usa 25 por defecto
      sortBy: 'fullName',
      sortOrder: 'asc',
      enableSearch: true,
      enableFilters: true,
      enableExport: false,
      enableBulkActions: true,
      enableColumnSelector: true,
      showThumbnails: false,
      compactMode: false
    };
  }

  /**
   * Reset a valores por defecto
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = this.getDefaultGridConfig();
    await this.updateGridConfig(defaultConfig);
  }
}
