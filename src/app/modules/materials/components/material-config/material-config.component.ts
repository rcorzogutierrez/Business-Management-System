// src/app/modules/materials/components/material-config/material-config.component.ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { MaterialsConfigService } from '../../services/materials-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FormDesignerComponent } from '../../../../shared/modules/dynamic-form-builder';
import { GenericConfigBaseComponent } from '../../../../shared/components/generic-config-base/generic-config-base.component';

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
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    FormDesignerComponent
  ],
  templateUrl: './material-config.component.html',
  styleUrl: './material-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialConfigComponent extends GenericConfigBaseComponent {
  // Implementar propiedades abstractas requeridas
  configService = inject(MaterialsConfigService);
  override modulePath = '/modules/materials';

  // Propiedades específicas de materiales (si las hay)
  private authService = inject(AuthService);
  currentUser = this.authService.authorizedUser;

  // Toda la lógica compartida (gridConfig, allFeaturesEnabled, updateGridConfig,
  // toggleAllFeatures, loadConfig, onLayoutChange, etc.) ya está en la clase base.

  // Solo agregar métodos específicos de materiales aquí si son necesarios
}
