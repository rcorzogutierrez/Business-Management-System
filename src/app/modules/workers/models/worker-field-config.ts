// src/app/modules/workers/models/worker-field-config.ts

import { FieldConfig, FieldType, FieldValidation, FieldGridConfig } from '../../../shared/models/field-config.interface';

/**
 * Campos por defecto del módulo de trabajadores
 */
export const DEFAULT_WORKER_FIELDS: Partial<FieldConfig>[] = [
  {
    name: 'fullName',
    label: 'Nombre Completo',
    type: FieldType.TEXT,
    validation: { required: true, minLength: 2, maxLength: 150 },
    placeholder: 'Nombre completo del trabajador',
    icon: 'person',
    gridConfig: { showInGrid: true, gridOrder: 0, gridWidth: '200px', sortable: true, filterable: true },
    formOrder: 0,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: true
  },
  {
    name: 'workerType',
    label: 'Tipo de Trabajador',
    type: FieldType.SELECT,
    validation: { required: true },
    options: [
      { value: 'internal', label: 'Empleado Propio', color: '#2563eb' },
      { value: 'contractor', label: 'Subcontratado', color: '#7c3aed' }
    ],
    placeholder: 'Seleccione tipo',
    icon: 'engineering',
    gridConfig: { showInGrid: true, gridOrder: 1, gridWidth: '150px', sortable: true, filterable: true },
    formOrder: 1,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: true
  },
  {
    name: 'phone',
    label: 'Teléfono',
    type: FieldType.PHONE,
    validation: { pattern: '^[+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$' },
    placeholder: '+1 234 567 8900',
    icon: 'phone',
    gridConfig: { showInGrid: true, gridOrder: 2, gridWidth: '150px', sortable: false, filterable: false },
    formOrder: 2,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: false
  },
  {
    name: 'idOrLicense',
    label: 'ID o Licencia',
    type: FieldType.TEXT,
    validation: { maxLength: 50 },
    placeholder: 'Número de identificación o licencia',
    icon: 'badge',
    gridConfig: { showInGrid: false, gridOrder: 3, gridWidth: '150px', sortable: true, filterable: true },
    formOrder: 3,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: false
  },
  {
    name: 'socialSecurity',
    label: 'Seguro Social',
    type: FieldType.TEXT,
    validation: { maxLength: 50 },
    placeholder: 'Número de seguro social',
    icon: 'security',
    gridConfig: { showInGrid: false, gridOrder: 4, gridWidth: '150px', sortable: false, filterable: false },
    formOrder: 4,
    formWidth: 'half',
    isDefault: true,
    isActive: false,
    isSystem: false
  },
  {
    name: 'address',
    label: 'Dirección',
    type: FieldType.TEXTAREA,
    validation: { maxLength: 250 },
    placeholder: 'Calle, número, ciudad, código postal',
    icon: 'location_on',
    gridConfig: { showInGrid: false, gridOrder: 5, sortable: false, filterable: false },
    formOrder: 5,
    formWidth: 'full',
    isDefault: true,
    isActive: false,
    isSystem: false
  },
  {
    name: 'companyName',
    label: 'Empresa (Subcontratado)',
    type: FieldType.TEXT,
    validation: { maxLength: 150 },
    placeholder: 'Nombre de la empresa',
    icon: 'business',
    helpText: 'Solo aplica para trabajadores subcontratados',
    gridConfig: { showInGrid: true, gridOrder: 6, gridWidth: '180px', sortable: true, filterable: true },
    formOrder: 6,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: false
  },
  {
    name: 'isActive',
    label: 'Estado',
    type: FieldType.CHECKBOX,
    validation: {},
    defaultValue: true,
    icon: 'toggle_on',
    gridConfig: { showInGrid: true, gridOrder: 7, gridWidth: '100px', sortable: true, filterable: true },
    formOrder: 7,
    formWidth: 'half',
    isDefault: true,
    isActive: true,
    isSystem: true
  }
];
