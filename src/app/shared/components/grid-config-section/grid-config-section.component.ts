// src/app/shared/components/grid-config-section/grid-config-section.component.ts
/**
 * Componente de UI compartido para la sección "Configuración de la Tabla"
 *
 * Este componente renderiza la interfaz para configurar:
 * - Toggles de funcionalidades (búsqueda, filtros, exportación, etc.)
 * - Configuración de paginación (elementos por página)
 * - Modo compacto
 *
 * Es un componente PRESENTACIONAL - recibe datos via @Input y emite eventos via @Output
 * La lógica de persistencia está en el componente padre (que extiende GenericGridConfigBaseComponent)
 *
 * Uso:
 * <app-grid-config-section
 *   [gridConfig]="gridConfig()"
 *   [moduleColor]="'amber'"
 *   [entityLabel]="'trabajadores'"
 *   [pageSizeOptions]="pageSizeOptions"
 *   [itemsPerPage]="itemsPerPageSignal()"
 *   [isLoading]="isLoading"
 *   [allFeaturesEnabled]="allFeaturesEnabled()"
 *   (configChange)="updateGridConfig($event.key, $event.value)"
 *   (toggleAll)="toggleAllFeatures()"
 * />
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { GridConfiguration } from '../../modules/dynamic-form-builder/models/module-config.interface';

export type ModuleColor = 'amber' | 'purple' | 'green' | 'blue' | 'teal' | 'indigo';

export interface ConfigChangeEvent {
  key: keyof GridConfiguration;
  value: any;
}

@Component({
  selector: 'app-grid-config-section',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './grid-config-section.component.html',
  styleUrls: ['./grid-config-section.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridConfigSectionComponent {
  // Inputs
  gridConfig = input.required<GridConfiguration>();
  moduleColor = input<ModuleColor>('purple');
  entityLabel = input<string>('elementos');
  pageSizeOptions = input<number[]>([10, 25, 50, 100]);
  itemsPerPage = input<number>(10);
  isLoading = input<boolean>(false);
  allFeaturesEnabled = input<boolean>(false);

  // Outputs
  configChange = output<ConfigChangeEvent>();
  toggleAll = output<void>();

  // Configuración de toggles (estructura compartida)
  readonly toggleOptions = [
    { key: 'enableColumnSelector', icon: 'view_column', label: 'Selector de Columnas', description: 'Permite ocultar/mostrar columnas' },
    { key: 'enableFilters', icon: 'filter_list', label: 'Filtros', description: 'Habilitar filtros de datos' },
    { key: 'enableExport', icon: 'download', label: 'Exportar', description: 'Permitir exportar datos' },
    { key: 'enableBulkActions', icon: 'checklist', label: 'Acciones Masivas', description: 'Habilitar selección múltiple' },
    { key: 'enableSearch', icon: 'search', label: 'Búsqueda', description: 'Habilitar búsqueda global' },
    { key: 'compactMode', icon: 'compress', label: 'Modo Compacto', description: 'Reducir espaciado de filas' },
  ] as const;

  // Métodos de utilidad para obtener clases CSS según el color del módulo
  getIconBgClass(): string {
    const colorMap: Record<ModuleColor, string> = {
      amber: 'bg-amber-100',
      purple: 'bg-purple-100',
      green: 'bg-green-100',
      blue: 'bg-blue-100',
      teal: 'bg-teal-100',
      indigo: 'bg-indigo-100',
    };
    return colorMap[this.moduleColor()];
  }

  getIconTextClass(): string {
    const colorMap: Record<ModuleColor, string> = {
      amber: 'text-amber-600',
      purple: 'text-purple-600',
      green: 'text-green-600',
      blue: 'text-blue-600',
      teal: 'text-teal-600',
      indigo: 'text-indigo-600',
    };
    return colorMap[this.moduleColor()];
  }

  getHoverBorderClass(): string {
    const colorMap: Record<ModuleColor, string> = {
      amber: 'hover:border-amber-300',
      purple: 'hover:border-purple-300',
      green: 'hover:border-green-300',
      blue: 'hover:border-blue-300',
      teal: 'hover:border-teal-300',
      indigo: 'hover:border-indigo-300',
    };
    return colorMap[this.moduleColor()];
  }

  getActiveButtonClass(): string {
    const colorMap: Record<ModuleColor, string> = {
      amber: 'bg-amber-600 hover:bg-amber-700',
      purple: 'bg-purple-600 hover:bg-purple-700',
      green: 'bg-green-600 hover:bg-green-700',
      blue: 'bg-blue-600 hover:bg-blue-700',
      teal: 'bg-teal-600 hover:bg-teal-700',
      indigo: 'bg-indigo-600 hover:bg-indigo-700',
    };
    return colorMap[this.moduleColor()];
  }

  getInactiveButtonHoverClass(): string {
    const colorMap: Record<ModuleColor, string> = {
      amber: 'hover:bg-amber-50 hover:border-amber-400',
      purple: 'hover:bg-purple-50 hover:border-purple-400',
      green: 'hover:bg-green-50 hover:border-green-400',
      blue: 'hover:bg-blue-50 hover:border-blue-400',
      teal: 'hover:bg-teal-50 hover:border-teal-400',
      indigo: 'hover:bg-indigo-50 hover:border-indigo-400',
    };
    return colorMap[this.moduleColor()];
  }

  // Emitir cambio de configuración
  onConfigChange(key: keyof GridConfiguration, value: any): void {
    this.configChange.emit({ key, value });
  }

  // Emitir toggle all
  onToggleAll(): void {
    this.toggleAll.emit();
  }

  // Obtener el valor de un toggle del gridConfig
  getToggleValue(key: string): boolean {
    const config = this.gridConfig();
    return config ? (config as any)[key] : false;
  }
}
