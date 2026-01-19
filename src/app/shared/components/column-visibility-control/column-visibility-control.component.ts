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
    console.log('🔵 ColumnVisibility ngOnInit - Intentando cargar desde localStorage');
    this.tryLoadFromStorage();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Cuando defaultVisibleColumns cambia y no hemos inicializado
    if (changes['defaultVisibleColumns']) {
      console.log('🟡 ColumnVisibility ngOnChanges', {
        isInitialized: this.isInitialized,
        loadedFromStorage: this.loadedFromStorage,
        isFirstChange: changes['defaultVisibleColumns'].isFirstChange(),
        previousValue: changes['defaultVisibleColumns'].previousValue,
        currentValue: changes['defaultVisibleColumns'].currentValue
      });

      if (!this.isInitialized && !this.loadedFromStorage) {
        const change = changes['defaultVisibleColumns'];
        // Solo actuar en el primer cambio (de undefined a un valor)
        if (change.isFirstChange() || change.previousValue === undefined) {
          const newValue = change.currentValue;
          if (newValue && newValue.length > 0) {
            console.log('🟢 Inicializando con defaultVisibleColumns:', newValue);
            this.initializeDefaultColumns();
          }
        }
      } else {
        console.log('⚪ Ignorando cambio - ya inicializado o cargado de storage');
      }
    }
  }

  /**
   * Intentar cargar desde localStorage
   */
  private tryLoadFromStorage() {
    if (this.storageKey) {
      const stored = localStorage.getItem(this.storageKey);
      console.log('🔷 tryLoadFromStorage - stored:', stored);

      if (stored) {
        try {
          const columnIds = JSON.parse(stored) as string[];
          // Validar que el array no esté vacío
          if (columnIds && columnIds.length > 0) {
            console.log('✅ Cargado desde localStorage:', columnIds);
            this.visibleColumnIds.set(new Set(columnIds));
            this.loadedFromStorage = true;
            this.isInitialized = true;
            return;
          } else {
            console.log('⚠️ localStorage tiene array vacío');
          }
        } catch (error) {
          console.error('❌ Error cargando preferencias de columnas:', error);
        }
      } else {
        console.log('⚠️ No hay datos en localStorage');
      }
    }

    // NO inicializar aquí - dejar que ngOnChanges lo haga cuando defaultVisibleColumns esté disponible
    console.log('⏳ Esperando defaultVisibleColumns en ngOnChanges');
  }

  /**
   * Inicializar con columnas por defecto
   */
  private initializeDefaultColumns() {
    // SOLO inicializar si tenemos defaultVisibleColumns con valores
    if (this.defaultVisibleColumns && this.defaultVisibleColumns.length > 0) {
      console.log('💾 Guardando columnas por defecto:', this.defaultVisibleColumns);
      this.visibleColumnIds.set(new Set(this.defaultVisibleColumns));
      this.isInitialized = true;
      this.saveToStorage();
    } else {
      console.log('⚠️ No hay defaultVisibleColumns para inicializar');
    }
    // NO usar fallback de "todas las columnas" - esto causaba el bug
  }

  /**
   * Guardar preferencias en localStorage
   */
  private saveToStorage() {
    if (!this.storageKey) return;

    const columnIds = Array.from(this.visibleColumnIds());
    console.log('💾 Guardando en localStorage:', columnIds);
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
      console.log('➖ Ocultando columna:', columnId);
    } else {
      visible.add(columnId);
      console.log('➕ Mostrando columna:', columnId);
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
