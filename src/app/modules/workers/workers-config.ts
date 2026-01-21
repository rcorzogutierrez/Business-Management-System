// src/app/modules/workers/workers-config.ts

import { GenericModuleConfig } from '../../shared/models/generic-entity.interface';
import { mapFieldsToGeneric } from '../../shared/modules/dynamic-form-builder/utils';
import { WorkerModuleConfig } from './models/worker-module-config.interface';

/**
 * Crea GenericModuleConfig a partir de WorkerModuleConfig
 */
export function createGenericConfig(workerConfig: WorkerModuleConfig): GenericModuleConfig {
  return {
    collection: 'workers',
    entityName: 'Trabajador',
    entityNamePlural: 'Trabajadores',
    deleteDialogFieldsCount: 3,
    searchFields: ['fullName', 'phone', 'idOrLicense', 'companyName'],
    defaultSort: {
      field: workerConfig.gridConfig?.sortBy || 'fullName',
      direction: workerConfig.gridConfig?.sortOrder || 'asc'
    },
    itemsPerPage: workerConfig.gridConfig?.itemsPerPage || 10,
    fields: mapFieldsToGeneric(workerConfig.fields)
  };
}

/**
 * Crea GenericModuleConfig por defecto (cuando no hay config cargada)
 */
export function getDefaultGenericConfig(): GenericModuleConfig {
  return {
    collection: 'workers',
    entityName: 'Trabajador',
    entityNamePlural: 'Trabajadores',
    deleteDialogFieldsCount: 3,
    searchFields: ['fullName', 'phone', 'idOrLicense', 'companyName'],
    defaultSort: {
      field: 'fullName',
      direction: 'asc'
    },
    itemsPerPage: 10,
    fields: [
      {
        name: 'fullName',
        label: 'Nombre Completo',
        type: 'text',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      },
      {
        name: 'phone',
        label: 'Teléfono',
        type: 'phone',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      },
      {
        name: 'workerType',
        label: 'Tipo',
        type: 'select',
        showInGrid: true,
        showInDelete: false,
        isDefault: true
      },
      {
        name: 'companyName',
        label: 'Empresa',
        type: 'text',
        showInGrid: true,
        showInDelete: true,
        isDefault: true
      }
    ]
  };
}
