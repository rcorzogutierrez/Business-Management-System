// src/app/modules/workers/components/workers-config/workers-config.component.ts

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';

import { WorkersConfigService } from '../../services';
import { GenericGridConfigBaseComponent } from '../../../../shared/components/generic-grid-config-base/generic-grid-config-base.component';

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
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatDividerModule
  ],
  templateUrl: './workers-config.component.html',
  styleUrl: './workers-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkersConfigComponent extends GenericGridConfigBaseComponent {
  // Implementar propiedades abstractas requeridas
  configService = inject(WorkersConfigService);
  override modulePath = '/modules/workers';

  // Opciones para el select de itemsPerPage
  pageSizeOptions = [10, 25, 50, 100];

  // Toda la lógica compartida (gridConfig, allFeaturesEnabled, updateGridConfig,
  // toggleAllFeatures, loadConfig, goBack) ya está en la clase base.

  // No hay métodos específicos adicionales para workers en este momento
  // Si en el futuro se necesitan, se pueden agregar aquí
}
