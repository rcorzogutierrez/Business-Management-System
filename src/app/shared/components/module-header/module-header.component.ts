import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Interfaz para los chips de estadísticas
 */
export interface StatChip {
  value: number | string;
  label: string;
  color: 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'green' | 'amber';
}

/**
 * Interfaz para los botones de acción
 */
export interface ActionButton {
  icon: string;
  tooltip: string;
  action: () => void;
  color?: string;
}

/**
 * Componente genérico de header para módulos
 * Reutilizable en toda la aplicación siguiendo DRY
 *
 * @example
 * <app-module-header
 *   icon="groups"
 *   title="Gestión de Clientes"
 *   subtitle="16 registros en el sistema"
 *   moduleColor="purple"
 *   [stats]="statsChips"
 *   [actionButtons]="actions"
 *   primaryButtonLabel="Nuevo Cliente"
 *   (primaryAction)="onNewClient()"
 *   [showBackButton]="true"
 *   (backAction)="goBack()"
 * />
 */
@Component({
  selector: 'app-module-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <header class="bg-white rounded-2xl p-4 mb-5 border border-slate-200 shadow-sm animate-fadeIn">
      <div class="flex items-center justify-between gap-4 flex-wrap">

        <!-- Sección izquierda: Back Button + Icono + Título -->
        <div class="flex items-center gap-3">
          <!-- Back button (opcional) -->
          @if (showBackButton()) {
            <button
              type="button"
              class="icon-btn"
              [matTooltip]="backButtonTooltip()"
              (click)="backAction.emit()">
              <mat-icon>arrow_back</mat-icon>
            </button>
          }
          <!-- Icono del módulo -->
          <div [class]="iconBoxClass()">
            <mat-icon>{{ icon() }}</mat-icon>
          </div>

          <!-- Título y subtítulo -->
          <div>
            <h1 class="text-lg font-bold text-slate-800 leading-tight">
              {{ title() }}
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ subtitle() }}
            </p>
          </div>
        </div>

        <!-- Sección derecha: Stats + Botones -->
        <div class="flex items-center gap-3 flex-wrap">

          <!-- Chips de estadísticas (Tailwind puro) -->
          @for (stat of stats(); track $index) {
            <div [class]="getStatChipClass(stat.color)" class="hidden md:flex flex-col items-center rounded-[10px] px-3 py-1.5 min-w-[65px] border">
              <span class="text-base font-bold leading-tight" [class]="getStatValueClass(stat.color)">{{ stat.value }}</span>
              <span class="text-[9px] font-semibold uppercase tracking-wide" [class]="getStatLabelClass(stat.color)">{{ stat.label }}</span>
            </div>
          }

          <!-- Slot para stats/badges especiales (balance, este mes, etc.) -->
          <ng-content select="[slot='extra-stats']"></ng-content>

          <!-- Botones de acción -->
          @for (btn of actionButtons(); track $index) {
            <button
              class="icon-btn"
              [matTooltip]="btn.tooltip"
              (click)="btn.action()">
              <mat-icon>{{ btn.icon }}</mat-icon>
            </button>
          }

          <!-- Slot para acciones personalizadas (column selector, export menu, etc.) -->
          <ng-content select="[slot='actions']"></ng-content>

          <!-- Botón secundario (opcional) -->
          @if (secondaryButtonLabel()) {
            <button
              class="inline-flex items-center gap-2 border-2 rounded-xl font-semibold text-sm px-4 py-2 transition-colors duration-200"
              [class]="secondaryButtonClass()"
              (click)="secondaryAction.emit()">
              @if (secondaryButtonIcon()) {
                <mat-icon class="!w-5 !h-5 !text-[20px]">{{ secondaryButtonIcon() }}</mat-icon>
              }
              {{ secondaryButtonLabel() }}
            </button>
          }

          <!-- Botón principal CTA -->
          @if (primaryButtonLabel()) {
            <button
              class="inline-flex items-center gap-2 rounded-xl font-semibold text-sm px-6 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              [class]="primaryButtonClass()"
              (click)="primaryAction.emit()">
              <mat-icon class="!w-5 !h-5 !text-[20px]">add</mat-icon>
              {{ primaryButtonLabel() }}
            </button>
          }
        </div>
      </div>
    </header>
  `
})
export class ModuleHeaderComponent {
  // Inputs
  icon = input.required<string>();
  title = input.required<string>();
  subtitle = input.required<string>();
  moduleColor = input<'purple' | 'green' | 'amber' | 'blue' | 'teal' | 'indigo'>('blue');

  stats = input<StatChip[]>([]);
  actionButtons = input<ActionButton[]>([]);

  primaryButtonLabel = input<string>('');
  secondaryButtonLabel = input<string>('');
  secondaryButtonIcon = input<string>('');

  // Back button inputs
  showBackButton = input<boolean>(false);
  backButtonTooltip = input<string>('Volver');

  // Outputs
  primaryAction = output<void>();
  secondaryAction = output<void>();
  backAction = output<void>();

  // Computed
  iconBoxClass = computed(() => {
    const color = this.moduleColor();
    return `header-icon-box ${color}`;
  });

  primaryButtonClass = computed(() => {
    const color = this.moduleColor();
    const colorMap: Record<string, string> = {
      purple: 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-purple-500/30 hover:shadow-purple-600/40',
      green: 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/30 hover:shadow-green-600/40',
      amber: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/30 hover:shadow-amber-600/40',
      blue: 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/30 hover:shadow-blue-600/40',
      teal: 'bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-teal-500/30 hover:shadow-teal-600/40',
      indigo: 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/30 hover:shadow-indigo-600/40',
    };
    return colorMap[color] || colorMap['blue'];
  });

  secondaryButtonClass = computed(() => {
    const color = this.moduleColor();
    const colorMap: Record<string, string> = {
      purple: 'border-purple-600 text-purple-600 hover:bg-purple-50',
      green: 'border-green-600 text-green-600 hover:bg-green-50',
      amber: 'border-amber-600 text-amber-600 hover:bg-amber-50',
      blue: 'border-blue-600 text-blue-600 hover:bg-blue-50',
      teal: 'border-teal-600 text-teal-600 hover:bg-teal-50',
      indigo: 'border-indigo-600 text-indigo-600 hover:bg-indigo-50',
    };
    return colorMap[color] || colorMap['blue'];
  });

  getStatChipClass(color: string): string {
    const bgMap: Record<string, string> = {
      purple: 'bg-purple-50 border-purple-200',
      green: 'bg-emerald-50 border-emerald-200',
      amber: 'bg-amber-50 border-amber-200',
      primary: 'bg-blue-50 border-blue-200',
      success: 'bg-green-50 border-green-200',
      warning: 'bg-amber-50 border-amber-200',
      info: 'bg-sky-50 border-sky-200',
    };
    return bgMap[color] || bgMap['primary'];
  }

  getStatValueClass(color: string): string {
    const colorMap: Record<string, string> = {
      purple: 'text-violet-600',
      green: 'text-emerald-600',
      amber: 'text-amber-600',
      primary: 'text-blue-600',
      success: 'text-green-600',
      warning: 'text-amber-600',
      info: 'text-sky-600',
    };
    return colorMap[color] || colorMap['primary'];
  }

  getStatLabelClass(color: string): string {
    const colorMap: Record<string, string> = {
      purple: 'text-violet-500',
      green: 'text-emerald-500',
      amber: 'text-amber-500',
      primary: 'text-blue-500',
      success: 'text-green-500',
      warning: 'text-amber-500',
      info: 'text-sky-500',
    };
    return colorMap[color] || colorMap['primary'];
  }
}
