import { Component, Input, Output, EventEmitter, signal, computed, effect, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
export class ColumnVisibilityControlComponent implements OnInit, OnChanges {
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

  // Computed
  visibleCount = computed(() => this.visibleColumnIds().size);
  totalCount = computed(() => this.columns.length);

  constructor() {
    // Effect para emitir cambios cuando visibleColumnIds cambia
    effect(() => {
      const visible = Array.from(this.visibleColumnIds());
      this.visibilityChange.emit(visible);
    });
  }

  ngOnInit() {
    this.tryLoadFromStorage();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Cuando defaultVisibleColumns cambia y no hemos inicializado
    if (changes['defaultVisibleColumns'] && !this.isInitialized && !this.loadedFromStorage) {
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

  /**
   * Intentar cargar desde localStorage
   */
  private tryLoadFromStorage() {
    if (this.storageKey) {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          const columnIds = JSON.parse(stored) as string[];
          this.visibleColumnIds.set(new Set(columnIds));
          this.loadedFromStorage = true;
          this.isInitialized = true;
          return;
        } catch (error) {
          console.error('Error cargando preferencias de columnas:', error);
        }
      }
    }

    // Si no cargamos desde localStorage, intentar inicializar con columnas por defecto
    if (!this.loadedFromStorage && !this.isInitialized) {
      this.initializeDefaultColumns();
    }
  }

  /**
   * Inicializar con columnas por defecto
   */
  private initializeDefaultColumns() {
    if (this.defaultVisibleColumns && this.defaultVisibleColumns.length > 0) {
      this.visibleColumnIds.set(new Set(this.defaultVisibleColumns));
      this.isInitialized = true;
    } else if (this.columns.length > 0) {
      // Si no hay columnas por defecto especificadas, mostrar todas
      const allIds = this.columns.map(col => col.id);
      this.visibleColumnIds.set(new Set(allIds));
      this.isInitialized = true;
    }
    // Guardar la inicialización
    this.saveToStorage();
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
