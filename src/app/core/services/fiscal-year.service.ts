// src/app/core/services/fiscal-year.service.ts
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { BusinessInfoService } from '../../admin/services/business-info.service';
import { FiscalYearConfig, FiscalYearLabelFormat } from '../../admin/models/business-info.interface';

/**
 * Información calculada del año fiscal actual
 */
export interface FiscalYearInfo {
  /** Etiqueta del año fiscal (ej: "FY26", "FY2026", "2025-2026") */
  label: string;
  /** Prefijo para numeración de documentos (ej: "FY26-") */
  prefix: string;
  /** Fecha de inicio del período fiscal */
  startDate: Date;
  /** Fecha de fin del período fiscal */
  endDate: Date;
}

/** Configuración por defecto: año fiscal = año calendario, formato FY{YY} */
const DEFAULT_CONFIG: FiscalYearConfig = {
  startMonth: 1,
  startDay: 1,
  labelFormat: 'FY{YY}'
};

/**
 * Servicio centralizado para la gestión del año fiscal de la empresa.
 *
 * Provee el período fiscal activo y el prefijo de numeración de documentos
 * basándose en la configuración almacenada en business_info/main.
 *
 * Fallback automático: si no hay configuración, usa año calendario con formato FY{YY}.
 *
 * @example
 * ```typescript
 * private fiscalYear = inject(FiscalYearService);
 *
 * // En una plantilla o computed:
 * const info = this.fiscalYear.currentFY();
 * // info.label    → "FY26"
 * // info.prefix   → "FY26-"
 * // info.startDate → Date(2026-01-01)
 * // info.endDate   → Date(2026-12-31)
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class FiscalYearService {

  private businessInfoService = inject(BusinessInfoService);

  /**
   * Configuración fiscal activa (reactive a cambios de businessInfo)
   */
  readonly config = computed<FiscalYearConfig>(() => {
    const info = this.businessInfoService.businessInfo();
    return info?.fiscalYear ?? DEFAULT_CONFIG;
  });

  /**
   * Información completa del año fiscal actual.
   * Se recalcula automáticamente si cambia la configuración.
   */
  readonly currentFY = computed<FiscalYearInfo>(() => {
    return this.calculateCurrentFY(this.config());
  });

  constructor() {
    // Cargar businessInfo si aún no está en memoria
    const info = this.businessInfoService.businessInfo();
    if (!info) {
      this.businessInfoService.getBusinessInfo();
    }
  }

  // ============================================
  // CÁLCULO DEL AÑO FISCAL
  // ============================================

  private calculateCurrentFY(config: FiscalYearConfig): FiscalYearInfo {
    const today = new Date();
    const currentYear = today.getFullYear();

    // ¿Cuándo empezó el AF este año calendario?
    const fyStartThisYear = new Date(currentYear, config.startMonth - 1, config.startDay);

    // Si ya pasó esa fecha, el AF empezó este año; si no, empezó el año pasado
    const fyStartYear = today >= fyStartThisYear ? currentYear : currentYear - 1;

    const startDate = new Date(fyStartYear, config.startMonth - 1, config.startDay);
    const endDate = new Date(fyStartYear + 1, config.startMonth - 1, config.startDay - 1);

    const label = this.formatLabel(config.labelFormat, fyStartYear);

    return { label, prefix: `${label}-`, startDate, endDate };
  }

  private formatLabel(format: FiscalYearLabelFormat, fyStartYear: number): string {
    switch (format) {
      case 'FY{YY}':
        return `FY${(fyStartYear % 100).toString().padStart(2, '0')}`;
      case 'FY{YYYY}':
        return `FY${fyStartYear}`;
      case '{YYYY}-{YYYY+1}':
        return `${fyStartYear}-${fyStartYear + 1}`;
    }
  }
}
