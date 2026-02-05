// src/app/modules/workers/components/workers-config/workers-config.component.ts

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

import { WorkersConfigService } from '../../services';
import { GenericGridConfigBaseComponent } from '../../../../shared/components/generic-grid-config-base/generic-grid-config-base.component';
import { ModuleHeaderComponent, ActionButton } from '../../../../shared/components/module-header/module-header.component';
import { GridConfigSectionComponent, ConfigChangeEvent } from '../../../../shared/components/grid-config-section/grid-config-section.component';

/**
 * Componente de configuración del módulo de Workers
 * Hereda toda la lógica de configuración de tabla de GenericGridConfigBaseComponent
 *
 * Este componente solo gestiona la configuración de la tabla (GridConfiguration).
 * No incluye gestión de campos dinámicos ya que Workers usa formulario hardcodeado.
 */
@Component({
  selector: 'app-workers-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatDividerModule,
    ModuleHeaderComponent,
    GridConfigSectionComponent,
  ],
  templateUrl: './workers-config.component.html',
  styleUrl: './workers-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkersConfigComponent extends GenericGridConfigBaseComponent {
  // Implementar propiedades abstractas requeridas
  configService = inject(WorkersConfigService);
  override modulePath = '/modules/workers';

  // Toda la lógica compartida (gridConfig, allFeaturesEnabled, updateGridConfig,
  // toggleAllFeatures, loadConfig, goBack, pageSizeOptions) ya está en la clase base.

  /**
   * Botones de acción para el header compartido
   */
  headerActions = computed<ActionButton[]>(() => [
    {
      icon: 'refresh',
      tooltip: 'Recargar configuración',
      action: () => this.loadConfig()
    }
  ]);

  /**
   * Handler para cambios desde GridConfigSectionComponent
   */
  onConfigChange(event: ConfigChangeEvent): void {
    this.itemsPerPageSignal.set(
      event.key === 'itemsPerPage' ? event.value : this.itemsPerPageSignal()
    );
    this.updateGridConfig(event.key, event.value);
  }
}
