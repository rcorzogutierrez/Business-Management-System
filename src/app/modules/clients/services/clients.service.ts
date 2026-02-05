// src/app/modules/clients/services/clients.service.ts

import { Injectable, inject, signal } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import {
  getDocWithLogging as getDoc,
  getDocsWithLogging as getDocs,
  addDocWithLogging as addDoc,
  updateDocWithLogging as updateDoc,
  deleteDocWithLogging as deleteDoc
} from '../../../shared/utils/firebase-logger.utils';
import {
  OperationResult,
  createSuccessResult,
  createErrorResult
} from '../../../shared/models';
import {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientSort,
  ClientStats
} from '../models';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private db = getFirestore();
  private authService = inject(AuthService);

  // Collection reference
  private clientsCollection = collection(this.db, 'clients');

  // Signals
  clients = signal<Client[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  stats = signal<ClientStats>({
    total: 0,
    active: 0,
    inactive: 0,
    potential: 0,
    archived: 0,
    byStatus: {}
  });

  private isInitialized = false;

  constructor() {}

  /**
   * Inicializar el servicio - cargar todos los clientes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadClients();
    this.isInitialized = true;
  }

  /**
   * Forzar recarga de datos
   */
  async forceReload(): Promise<void> {
    await this.loadClients();
  }

  /**
   * Cargar todos los clientes
   */
  async loadClients(filters?: ClientFilters, sort?: ClientSort): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Construir query
      const constraints: QueryConstraint[] = [];

      // Aplicar filtros
      if (filters?.isActive !== undefined) {
        constraints.push(where('isActive', '==', filters.isActive));
      }

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.assignedTo) {
        constraints.push(where('assignedTo', '==', filters.assignedTo));
      }

      // NOTA: No usamos orderBy de Firestore porque requiere índices compuestos
      // y puede fallar si algunos documentos no tienen el campo de ordenamiento.
      // En su lugar, ordenamos en memoria después de recuperar los documentos.

      const q = query(this.clientsCollection, ...constraints);
      const snapshot = await getDocs(q);

      const clients: Client[] = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data() as Omit<Client, 'id'>
      }));

      // Ordenar en memoria por el campo especificado
      if (clients.length > 0) {
        const sortField = sort?.field || 'name';
        const sortDirection = sort?.direction || 'asc';
        clients.sort((a: any, b: any) => {
          const aVal = a[sortField] || '';
          const bVal = b[sortField] || '';
          if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
          }
        });
      }

      // Aplicar filtro de búsqueda en memoria (para búsqueda global)
      let filteredClients = clients;
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredClients = clients.filter(client =>
          client.name.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.phone?.includes(term) ||
          client.company?.toLowerCase().includes(term)
        );
      }

      this.clients.set(filteredClients);
      this.calculateStats(filteredClients);

    } catch (error: any) {
      console.error('❌ Error cargando clientes:', error);
      this.error.set('Error al cargar los clientes');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Obtener un cliente por ID
   */
  async getClientById(id: string): Promise<Client | null> {
    try {
      const docRef = doc(this.db, `clients/${id}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data() as Omit<Client, 'id'>
        };
      }

      return null;
    } catch (error: any) {
      console.error(`❌ Error obteniendo cliente ${id}:`, error);
      return null;
    }
  }

  /**
   * Crear un nuevo cliente
   */
  async createClient(data: CreateClientData): Promise<OperationResult<Client>> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        return createErrorResult('Usuario no autenticado');
      }

      const now = Timestamp.now();

      const clientData: Omit<Client, 'id'> = {
        ...data,
        customFields: data.customFields || {},
        isActive: true,
        status: data.status || 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid
      };

      const docRef = await addDoc(this.clientsCollection, clientData as any);

      const newClient: Client = {
        id: docRef.id,
        ...clientData
      };

      // Actualizar la lista local
      this.clients.update(clients => [...clients, newClient]);
      this.calculateStats(this.clients());

      return createSuccessResult('Cliente creado exitosamente', newClient);

    } catch (error: any) {
      console.error('❌ Error creando cliente:', error);
      this.error.set('Error al crear el cliente');
      return createErrorResult(`Error al crear cliente: ${error.message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Actualizar un cliente existente
   */
  async updateClient(id: string, data: UpdateClientData): Promise<OperationResult> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        return createErrorResult('Usuario no autenticado');
      }

      const docRef = doc(this.db, `clients/${id}`);

      const updateData: Partial<Client> = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      await updateDoc(docRef, updateData as any);

      // Actualizar la lista local
      this.clients.update(clients =>
        clients.map(client =>
          client.id === id
            ? { ...client, ...updateData }
            : client
        )
      );

      this.calculateStats(this.clients());

      return createSuccessResult('Cliente actualizado exitosamente');

    } catch (error: any) {
      console.error(`❌ Error actualizando cliente ${id}:`, error);
      this.error.set('Error al actualizar el cliente');
      return createErrorResult(`Error al actualizar cliente: ${error.message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Eliminar un cliente
   */
  async deleteClient(id: string): Promise<OperationResult> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const docRef = doc(this.db, `clients/${id}`);
      await deleteDoc(docRef);

      // Actualizar la lista local
      this.clients.update(clients => clients.filter(client => client.id !== id));
      this.calculateStats(this.clients());

      return createSuccessResult('Cliente eliminado exitosamente');

    } catch (error: any) {
      console.error(`❌ Error eliminando cliente ${id}:`, error);
      this.error.set('Error al eliminar el cliente');
      return createErrorResult(`Error al eliminar cliente: ${error.message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Eliminar múltiples clientes
   */
  async deleteMultipleClients(ids: string[]): Promise<OperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    this.isLoading.set(true);

    for (const id of ids) {
      try {
        const docRef = doc(this.db, `clients/${id}`);
        await deleteDoc(docRef);
        successCount++;
      } catch (error: any) {
        errors.push(`Error eliminando cliente ${id}: ${error.message}`);
      }
    }

    // Actualizar la lista local
    this.clients.update(clients => clients.filter(client => !ids.includes(client.id)));
    this.calculateStats(this.clients());

    this.isLoading.set(false);

    if (errors.length === 0) {
      return createSuccessResult(`${successCount} cliente(s) eliminado(s) exitosamente`);
    } else if (successCount > 0) {
      return {
        success: true,
        message: `${successCount} eliminado(s), ${errors.length} fallido(s)`,
        errors
      };
    } else {
      return createErrorResult('Error al eliminar clientes', errors);
    }
  }

  /**
   * Archivar/Desarchivar un cliente
   */
  async toggleClientStatus(id: string, isActive: boolean): Promise<OperationResult> {
    return this.updateClient(id, { isActive });
  }

  /**
   * Asignar cliente a un usuario
   */
  async assignClient(clientId: string, userId: string): Promise<OperationResult> {
    return this.updateClient(clientId, { assignedTo: userId });
  }

  /**
   * Actualizar campos personalizados de un cliente
   */
  async updateCustomFields(clientId: string, customFields: Record<string, any>): Promise<OperationResult> {
    try {
      const client = await this.getClientById(clientId);
      if (!client) {
        return createErrorResult('Cliente no encontrado');
      }

      const updatedFields = {
        ...client.customFields,
        ...customFields
      };

      return this.updateClient(clientId, { customFields: updatedFields });
    } catch (error: any) {
      console.error(`❌ Error actualizando campos personalizados del cliente ${clientId}:`, error);
      return createErrorResult(`Error al actualizar campos: ${error.message}`);
    }
  }

  /**
   * Calcular estadísticas de clientes
   */
  private calculateStats(clients: Client[]): void {
    const stats: ClientStats = {
      total: clients.length,
      active: clients.filter(c => c.isActive && c.status === 'active').length,
      inactive: clients.filter(c => !c.isActive || c.status === 'inactive').length,
      potential: clients.filter(c => c.status === 'potential').length,
      archived: clients.filter(c => c.status === 'archived').length,
      byStatus: {}
    };

    // Contar por status
    clients.forEach(client => {
      const status = client.status || 'active';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    this.stats.set(stats);
  }

  /**
   * Buscar clientes
   */
  async searchClients(searchTerm: string): Promise<Client[]> {
    const filters: ClientFilters = { searchTerm };
    await this.loadClients(filters);
    return this.clients();
  }

  /**
   * Obtener clientes por usuario asignado
   */
  async getClientsByUser(userId: string): Promise<Client[]> {
    const filters: ClientFilters = { assignedTo: userId };
    await this.loadClients(filters);
    return this.clients();
  }

  /**
   * Refrescar la lista de clientes
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Limpiar el servicio
   */
  clear(): void {
    this.clients.set([]);
    this.stats.set({
      total: 0,
      active: 0,
      inactive: 0,
      potential: 0,
      archived: 0,
      byStatus: {}
    });
    this.isLoading.set(false);
    this.error.set(null);
    this.isInitialized = false;
  }
}
