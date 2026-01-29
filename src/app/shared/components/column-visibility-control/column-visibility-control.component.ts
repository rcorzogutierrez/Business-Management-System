import { Component, Input, Output, EventEmitter, signal, computed, effect, OnInit, OnChanges, AfterViewInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

/**
 * ColumnVisibilityControl - Control reutilizable para gestionar visibilidad de columnas
 *
 * Características:
 * - Persistencia en localStorage (configurable)
 * - Dropdown con checkboxes para cada columna
 * - Botón para resetear a valores por defecto
 * - Emisión de eventos cuando cambia la visibilidad
 */
@Component({
  selector: 'app-column-visibility-control',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './column-visibility-control.component.html',
  styleUrl: './column-visibility-control.component.css'
})
export class ColumnVisibilityControlComponent implements OnInit, OnChanges, AfterViewInit {
  /**
   * Lista de columnas disponibles
   */
  @Input({ required: true }) columns: ColumnOption[] = [];

  /**
   * Key para localStorage (ej: 'clients-visible-columns')
   * Si no se proporciona, no se persiste en localStorage
   */
  @Input() storageKey?: string;

  /**
   * Color del tema (para consistencia con el módulo)
   */
  @Input() themeColor: 'purple' | 'green' | 'blue' | 'amber' = 'purple';

  /**
   * IDs de columnas que deben estar visibles por defecto (primera carga)
   * Si no se proporciona, se muestran todas las columnas por defecto
   */
  @Input() defaultVisibleColumns?: string[];

  /**
   * Emite cuando cambia la visibilidad de columnas
   * Devuelve array de IDs de columnas visibles
   */
  @Output() visibilityChange = new EventEmitter<string[]>();

  // Estado
  isMenuOpen = signal<boolean>(false);
  visibleColumnIds = signal<Set<string>>(new Set());
  private loadedFromStorage = false;
  private isInitialized = false;
  private shouldEmitChanges = false; // Control para evitar emisiones prematuras

  // Computed
  visibleCount = computed(() => this.visibleColumnIds().size);
  totalCount = computed(() => this.columns.length);

  constructor() {
    // Effect para emitir cambios cuando visibleColumnIds cambia
    // SOLO emite después de la inicialización completa
    effect(() => {
      if (this.shouldEmitChanges) {
        const visible = Array.from(this.visibleColumnIds());
        this.visibilityChange.emit(visible);
      }
    });
  }

  ngOnInit() {
    this.tryLoadFromStorage();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Cuando las columnas disponibles cambian
    if (changes['columns']) {
      // Si ya cargamos desde storage, validar y filtrar IDs inválidos
      if (this.loadedFromStorage) {
        this.validateAndFilterInvalidIds();
      }
      // Si NO hemos inicializado aún, sincronizar con el campo 'visible' del input
      else if (!this.isInitialized && this.columns.length > 0) {
        this.syncWithColumnsInput();
      }
    }

    // Cuando defaultVisibleColumns cambia y no hemos inicializado
    if (changes['defaultVisibleColumns']) {
      // CRÍTICO: Verificar localStorage directamente antes de sobrescribir
      // porque ngOnChanges se ejecuta ANTES que ngOnInit
      if (!this.isInitialized && !this.loadedFromStorage) {
        // Verificar si hay datos guardados en localStorage
        const hasStoredData = this.storageKey && localStorage.getItem(this.storageKey);

        if (hasStoredData) {
          // NO hacer nada - ngOnInit se encargará de cargar de localStorage
          return;
        }

        const change = changes['defaultVisibleColumns'];
        // Solo actuar en el primer cambio (de undefined a un valor)
        if (change.isFirstChange() || change.previousValue === undefined) {
          const newValue = change.currentValue;
          if (newValue && newValue.length > 0) {
            this.initializeDefaultColumns();
          }
        }
      }
    }
  }

  ngAfterViewInit() {
    // Activar emisión de eventos DESPUÉS de que la vista se haya inicializado completamente
    // Esto asegura que todas las sincronizaciones iniciales hayan terminado
    // y solo emitiremos cambios cuando el usuario interactúe manualmente
    setTimeout(() => {
      this.shouldEmitChanges = true;
    }, 0);
  }

  /**
   * Sincronizar estado interno con el campo 'visible' del input columns
   * Se usa cuando no hay datos en localStorage y las columnas ya vienen
   * con el campo 'visible' configurado por el parent
   */
  private syncWithColumnsInput() {
    const visibleIds = this.columns
      .filter(col => col.visible)
      .map(col => col.id);

    if (visibleIds.length > 0) {
      this.visibleColumnIds.set(new Set(visibleIds));
      this.isInitialized = true;
      // NO activar shouldEmitChanges aquí - esto es una sincronización inicial
      // El parent ya tiene el estado correcto, no necesitamos emitir de vuelta
    }
  }

  /**
   * Validar y filtrar IDs que ya no existen en las columnas actuales
   */
  private validateAndFilterInvalidIds() {
    const validIds = new Set(this.columns.map(col => col.id));
    const currentIds = this.visibleColumnIds();
    const filteredIds = new Set<string>();

    // Filtrar solo los IDs que existen en las columnas actuales
    currentIds.forEach(id => {
      if (validIds.has(id)) {
        filteredIds.add(id);
      }
    });

    // Si hubo cambios, actualizar y guardar
    if (filteredIds.size !== currentIds.size) {
      this.visibleColumnIds.set(filteredIds);
      this.saveToStorage();
    }
  }

  /**
   * Intentar cargar desde localStorage
   */
  private tryLoadFromStorage() {
    if (this.storageKey) {
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        try {
          const columnIds = JSON.parse(stored) as string[];
          // Validar que el array no esté vacío
          if (columnIds && columnIds.length > 0) {
            this.visibleColumnIds.set(new Set(columnIds));
            this.loadedFromStorage = true;
            this.isInitialized = true;
            // NO activar shouldEmitChanges - esto es carga inicial
            // El parent ya cargó desde storage, no necesitamos emitir de vuelta
            return;
          }
        } catch (error) {
          console.error('Error cargando preferencias de columnas:', error);
        }
      }
    }

    // NO inicializar aquí - dejar que ngOnChanges lo haga cuando defaultVisibleColumns esté disponible
  }

  /**
   * Inicializar con columnas por defecto
   */
  private initializeDefaultColumns() {
    // SOLO inicializar si tenemos defaultVisibleColumns con valores
    if (this.defaultVisibleColumns && this.defaultVisibleColumns.length > 0) {
      this.visibleColumnIds.set(new Set(this.defaultVisibleColumns));
      this.isInitialized = true;
      this.saveToStorage();
      // NO activar shouldEmitChanges - esto es inicialización
      // El parent ya tiene estos valores por defecto
    }
    // NO usar fallback de "todas las columnas" - esto causaba el bug
  }

  /**
   * Guardar preferencias en localStorage
   */
  private saveToStorage() {
    if (!this.storageKey) return;

    const columnIds = Array.from(this.visibleColumnIds());
    localStorage.setItem(this.storageKey, JSON.stringify(columnIds));
  }

  /**
   * Toggle menú
   */
  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  /**
   * Cerrar menú
   */
  closeMenu() {
    this.isMenuOpen.set(false);
  }

  /**
   * Toggle visibilidad de una columna
   */
  toggleColumnVisibility(columnId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const visible = new Set(this.visibleColumnIds());

    if (visible.has(columnId)) {
      visible.delete(columnId);
    } else {
      visible.add(columnId);
    }

    this.visibleColumnIds.set(visible);
    this.saveToStorage();
    // shouldEmitChanges ya está activo después de AfterViewInit
  }

  /**
   * Verificar si una columna es visible
   */
  isColumnVisible(columnId: string): boolean {
    return this.visibleColumnIds().has(columnId);
  }

  /**
   * Resetear a valores por defecto
   */
  resetToDefault() {
    this.initializeDefaultColumns();
  }

  /**
   * Obtener clases del tema
   */
  getThemeClasses(): string {
    const themes: Record<string, string> = {
      purple: 'theme-purple',
      green: 'theme-green',
      blue: 'theme-blue',
      amber: 'theme-amber'
    };
    return themes[this.themeColor] || 'theme-purple';
  }
}
