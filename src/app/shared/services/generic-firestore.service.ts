/**
 * Servicio genérico base para operaciones CRUD en Firestore
 * Usa Signals de Angular para manejo de estado reactivo
 *
 * Patrones utilizados:
 * - firebase/firestore SDK directo (no @angular/fire)
 * - firebase-logger.utils para monitoreo de rendimiento
 * - OperationResult para respuestas consistentes
 * - Signals para estado reactivo
 *
 * @example
 * export class ProductosService extends GenericFirestoreService<Producto> {
 *   constructor() {
 *     super('productos');
 *   }
 *
 *   // Agregar computed signals específicos
 *   productosActivos = computed(() => this.items().filter(p => p.isActive));
 * }
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import {
  getDocWithLogging as getDoc,
  getDocsWithLogging as getDocs,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc
} from '../utils/firebase-logger.utils';
import { GenericEntity } from '../models/generic-entity.interface';
import {
  OperationResult,
  createSuccessResult,
  createErrorResult
} from '../models/operation-result.interface';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export abstract class GenericFirestoreService<T extends GenericEntity> {
  protected db = getFirestore();
  protected authService = inject(AuthService);

  // Signals para estado reactivo
  protected itemsSignal = signal<T[]>([]);
  items = this.itemsSignal.asReadonly();
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Control de inicialización
  protected isInitialized = false;

  // Computed signals básicos (los hijos pueden agregar más)
  activeItems = computed(() => this.items().filter(item => item.isActive !== false));
  itemsCount = computed(() => this.items().length);
  activeCount = computed(() => this.activeItems().length);

  constructor(protected collectionName: string) {}

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  /**
   * Inicializa el servicio cargando los items
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadItems();
    this.isInitialized = true;
  }

  /**
   * Forzar recarga de datos
   */
  async forceReload(): Promise<void> {
    await this.loadItems();
  }

  // ============================================
  // OPERACIONES DE LECTURA
  // ============================================

  /**
   * Carga todos los items de la colección
   */
  async loadItems(constraints: QueryConstraint[] = []): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const collectionRef = collection(this.db, this.collectionName);
      const q = constraints.length > 0
        ? query(collectionRef, ...constraints)
        : query(collectionRef, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return this.convertTimestamps({
          id: docSnap.id,
          ...data
        }) as T;
      });

      this.itemsSignal.set(items);
    } catch (error: any) {
      console.error(`❌ Error cargando ${this.collectionName}:`, error);
      this.error.set(`Error al cargar los datos: ${error.message}`);
      this.itemsSignal.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtiene un item por ID desde la cache local
   */
  getById(id: string): T | undefined {
    return this.items().find(item => item.id === id);
  }

  /**
   * Obtiene un item por ID desde Firestore
   */
  async fetchById(id: string): Promise<T | null> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.convertTimestamps({
          id: docSnap.id,
          ...docSnap.data()
        }) as T;
      }

      return null;
    } catch (error: any) {
      console.error(`❌ Error obteniendo ${this.collectionName}/${id}:`, error);
      return null;
    }
  }

  // ============================================
  // OPERACIONES DE ESCRITURA
  // ============================================

  /**
   * Crea un nuevo item
   */
  async create(data: Omit<T, 'id'>, currentUserUid?: string): Promise<OperationResult<{ id: string }>> {
    try {
      const user = currentUserUid || this.authService.authorizedUser()?.uid || 'unknown';
      const collectionRef = collection(this.db, this.collectionName);

      const newItem = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user,
        updatedBy: user,
        isActive: (data as any).isActive ?? true
      };

      const docRef = await addDoc(collectionRef, newItem as any);
      await this.loadItems();

      return createSuccessResult('Elemento creado exitosamente', { id: docRef.id });
    } catch (error: any) {
      console.error(`❌ Error creando ${this.collectionName}:`, error);
      return createErrorResult(`Error al crear: ${error.message}`);
    }
  }

  /**
   * Actualiza un item existente
   */
  async update(id: string, data: Partial<T>, currentUserUid?: string): Promise<OperationResult> {
    try {
      const user = currentUserUid || this.authService.authorizedUser()?.uid || 'unknown';
      const docRef = doc(this.db, this.collectionName, id);

      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: user
      };

      // Eliminar campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await updateDoc(docRef, updateData);
      await this.loadItems();

      return createSuccessResult('Elemento actualizado exitosamente');
    } catch (error: any) {
      console.error(`❌ Error actualizando ${this.collectionName}/${id}:`, error);
      return createErrorResult(`Error al actualizar: ${error.message}`);
    }
  }

  /**
   * Elimina un item (eliminación física)
   */
  async delete(id: string): Promise<OperationResult> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      await deleteDoc(docRef);
      await this.loadItems();

      return createSuccessResult('Elemento eliminado exitosamente');
    } catch (error: any) {
      console.error(`❌ Error eliminando ${this.collectionName}/${id}:`, error);
      return createErrorResult(`Error al eliminar: ${error.message}`);
    }
  }

  /**
   * Elimina múltiples items
   */
  async deleteMultiple(ids: string[]): Promise<OperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    for (const id of ids) {
      try {
        const docRef = doc(this.db, this.collectionName, id);
        await deleteDoc(docRef);
        successCount++;
      } catch (error: any) {
        errors.push(`Error eliminando ${id}: ${error.message}`);
      }
    }

    await this.loadItems();

    if (errors.length === 0) {
      return createSuccessResult(`${successCount} elemento(s) eliminado(s) exitosamente`);
    } else if (successCount > 0) {
      return {
        success: true,
        message: `${successCount} eliminado(s), ${errors.length} fallido(s)`,
        errors
      };
    } else {
      return createErrorResult('Error al eliminar elementos', errors);
    }
  }

  /**
   * Marca un item como activo/inactivo (eliminación lógica)
   */
  async toggleActive(id: string, isActive: boolean, currentUserUid?: string): Promise<OperationResult> {
    try {
      const user = currentUserUid || this.authService.authorizedUser()?.uid || 'unknown';
      const docRef = doc(this.db, this.collectionName, id);

      await updateDoc(docRef, {
        isActive,
        updatedAt: Timestamp.now(),
        updatedBy: user
      });

      await this.loadItems();

      return createSuccessResult(`Elemento ${isActive ? 'activado' : 'inactivado'} exitosamente`);
    } catch (error: any) {
      console.error(`❌ Error cambiando estado de ${this.collectionName}/${id}:`, error);
      return createErrorResult(`Error al cambiar estado: ${error.message}`);
    }
  }

  // ============================================
  // UTILIDADES DE BÚSQUEDA Y FILTRADO
  // ============================================

  /**
   * Busca items por texto en campos específicos
   */
  search(searchTerm: string, searchFields: string[]): T[] {
    if (!searchTerm?.trim()) return this.items();

    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.items().filter(item => {
      return searchFields.some(field => {
        const value = (item as any)[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }

  /**
   * Ordena items por campo
   */
  sort(items: T[], field: string, direction: 'asc' | 'desc' = 'asc'): T[] {
    return [...items].sort((a, b) => {
      const aVal = (a as any)[field];
      const bVal = (b as any)[field];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Pagina items
   */
  paginate(items: T[], page: number, itemsPerPage: number): T[] {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }

  // ============================================
  // UTILIDADES INTERNAS
  // ============================================

  /**
   * Refresca los datos
   */
  async refresh(): Promise<void> {
    await this.loadItems();
  }

  /**
   * Limpia el estado del servicio
   */
  clear(): void {
    this.itemsSignal.set([]);
    this.error.set(null);
    this.isLoading.set(false);
    this.isInitialized = false;
  }

  /**
   * Convierte Timestamps de Firestore a Dates
   */
  protected convertTimestamps(data: any): any {
    const converted = { ...data };
    Object.keys(converted).forEach(key => {
      const value = converted[key];
      // Verificar si es un Timestamp de Firestore
      if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        converted[key] = value.toDate();
      }
    });
    return converted;
  }
}
