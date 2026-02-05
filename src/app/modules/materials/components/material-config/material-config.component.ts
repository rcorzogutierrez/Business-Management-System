// src/app/modules/materials/components/material-config/material-config.component.ts
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { MaterialsConfigService } from '../../services/materials-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FormDesignerComponent } from '../../../../shared/modules/dynamic-form-builder';
import { GenericConfigBaseComponent } from '../../../../shared/components/generic-config-base/generic-config-base.component';
import { ModuleHeaderComponent, ActionButton, StatChip } from '../../../../shared/components/module-header/module-header.component';
import { GridConfigSectionComponent, ConfigChangeEvent } from '../../../../shared/components/grid-config-section/grid-config-section.component';

/**
 * Componente de configuración del módulo de Materiales
 * Hereda toda la lógica común de GenericConfigBaseComponent
 * Solo contiene lógica específica de materiales (si la hubiera)
 */
@Component({
  selector: 'app-material-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    FormDesignerComponent,
    ModuleHeaderComponent,
    GridConfigSectionComponent,
  ],
  templateUrl: './material-config.component.html',
  styleUrl: './material-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialConfigComponent extends GenericConfigBaseComponent {
  // Implementar propiedades abstractas requeridas
  configService = inject(MaterialsConfigService);
  override modulePath = '/modules/materials';

  // Propiedades específicas de materiales
  private authService = inject(AuthService);
  currentUser = this.authService.authorizedUser;

  // Toda la lógica compartida (gridConfig, allFeaturesEnabled, updateGridConfig,
  // toggleAllFeatures, loadConfig, onLayoutChange, etc.) ya está en la clase base.

  /**
   * Stats para el header compartido
   */
  headerStats = computed<StatChip[]>(() => [
    { value: this.fields.length, label: 'Campos', color: 'green' }
  ]);

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
