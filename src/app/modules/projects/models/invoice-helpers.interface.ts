// src/app/modules/projects/models/invoice-helpers.interface.ts

/**
 * Material seleccionado para factura (usado en invoice-edit-dialog y direct-invoice-form)
 */
export interface SelectedMaterial {
  materialId: string;
  materialName: string;
  amount: number;
  basePrice: number;      // Precio original del material (sin modificar)
  price: number;          // Precio aplicado (con markup o editado manualmente)
}

/**
 * Trabajador seleccionado para factura (usado en invoice-edit-dialog y direct-invoice-form)
 */
export interface SelectedWorker {
  workerId: string;
  workerName: string;
}
