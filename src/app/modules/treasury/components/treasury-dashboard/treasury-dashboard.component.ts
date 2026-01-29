import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { TreasuryService } from '../../services/treasury.service';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '../../models';
import { ModuleHeaderComponent, StatChip, ActionButton } from '../../../../shared/components/module-header/module-header.component';

@Component({
  selector: 'app-treasury-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatIconModule,
    ModuleHeaderComponent
  ],
  template: `
    <div class="max-w-[1400px] mx-auto p-5">
      <!-- ============================================
           HEADER COMPACTO - Usando ModuleHeaderComponent
           ============================================ -->
      <app-module-header
        icon="account_balance_wallet"
        title="Tesorería"
        [subtitle]="(stats().totalCobros + stats().totalPagos) + ' registros en el sistema'"
        moduleColor="teal"
        [stats]="headerStats()"
        [actionButtons]="headerActions()"
        primaryButtonLabel="Registrar Cobro"
        (primaryAction)="goToCobros('new')"
        (secondaryAction)="goToPagos('new')">

        <!-- Stats especiales: Balance y Este Mes -->
        <div slot="extra-stats" class="hidden md:flex items-center gap-2">
          <!-- Balance Badge - Dimensiones exactas de stat-chip estándar -->
          <div class="flex flex-col items-center justify-center rounded-[10px] px-3 py-1.5 min-w-[65px] border"
               [ngClass]="{
                 'bg-emerald-50 border-emerald-200': stats().balance >= 0,
                 'bg-red-50 border-red-200': stats().balance < 0
               }">
            <span class="text-base font-bold leading-[1.2]"
                  [ngClass]="{
                    'text-emerald-600': stats().balance >= 0,
                    'text-red-600': stats().balance < 0
                  }">{{ stats().balance | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
            <span class="text-[9px] uppercase tracking-[0.3px] font-semibold"
                  [ngClass]="{
                    'text-emerald-500': stats().balance >= 0,
                    'text-red-500': stats().balance < 0
                  }">Balance</span>
          </div>

          <!-- Este Mes Badge - Compacto y proporcional -->
          <div class="flex flex-col items-center rounded-[10px] px-2.5 py-1.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 min-w-[65px]">
            <div class="flex items-center gap-1">
              <mat-icon class="!text-amber-600 !text-sm !w-3.5 !h-3.5">calendar_month</mat-icon>
              <span class="text-[9px] uppercase tracking-[0.3px] font-semibold text-amber-700 leading-none">Este Mes</span>
            </div>
            <div class="flex items-center gap-1 mt-1">
              <span class="text-[11px] font-bold text-emerald-600 leading-none">+{{ stats().cobrosEsteMes | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
              <span class="text-[9px] text-slate-400 font-medium">/</span>
              <span class="text-[11px] font-bold text-red-600 leading-none">-{{ stats().pagosEsteMes | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <!-- Botón Registrar Pago (rojo) en slot de acciones -->
        <button slot="actions"
                class="inline-flex items-center gap-2 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-sm px-4 py-2 transition-colors duration-200"
                (click)="goToPagos('new')">
          <mat-icon class="!w-5 !h-5 !text-[20px]">add</mat-icon>
          Registrar Pago
        </button>
      </app-module-header>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="spinner teal"></div>
          <p>Cargando datos...</p>
        </div>
      } @else {
        <!-- Quick Actions -->
        <div class="sections-grid">
          <!-- Cobros Section -->
          <div class="section-card cobros-section">
            <div class="section-header">
              <div class="section-title">
                <div class="section-icon-box emerald">
                  <mat-icon>savings</mat-icon>
                </div>
                <h2>Cobros</h2>
              </div>
              <button class="btn-primary emerald" (click)="goToCobros()">
                <mat-icon>visibility</mat-icon>
                Ver todos
              </button>
            </div>
            <div class="divider"></div>
            <div class="section-content">
              <p class="section-description">
                Registra los pagos recibidos de clientes por proyectos completados.
              </p>
              <div class="action-buttons">
                <button class="btn-outline emerald" (click)="goToCobros('new')">
                  <mat-icon>add</mat-icon>
                  Registrar Cobro
                </button>
              </div>
            </div>

            <!-- Recent Cobros -->
            @if (recentCobros().length > 0) {
              <div class="divider"></div>
              <div class="recent-list">
                <h3>Últimos cobros</h3>
                @for (cobro of recentCobros(); track cobro.id) {
                  <div class="recent-item">
                    <div class="item-icon cobros">
                      <mat-icon>{{ getPaymentIcon(cobro.paymentMethod) }}</mat-icon>
                    </div>
                    <div class="item-details">
                      <span class="item-title">{{ cobro.clientName }}</span>
                      <span class="item-subtitle">{{ cobro.proposalNumber }}</span>
                    </div>
                    <span class="item-amount positive">
                      +{{ cobro.amount | currency:'USD':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Pagos Section -->
          <div class="section-card pagos-section">
            <div class="section-header">
              <div class="section-title">
                <div class="section-icon-box red">
                  <mat-icon>payments</mat-icon>
                </div>
                <h2>Pagos</h2>
              </div>
              <button class="btn-primary red" (click)="goToPagos()">
                <mat-icon>visibility</mat-icon>
                Ver todos
              </button>
            </div>
            <div class="divider"></div>
            <div class="section-content">
              <p class="section-description">
                Registra los pagos realizados a trabajadores por proyectos completados.
              </p>
              <div class="action-buttons">
                <button class="btn-outline red" (click)="goToPagos('new')">
                  <mat-icon>add</mat-icon>
                  Registrar Pago
                </button>
              </div>
            </div>

            <!-- Recent Pagos -->
            @if (recentPagos().length > 0) {
              <div class="divider"></div>
              <div class="recent-list">
                <h3>Últimos pagos</h3>
                @for (pago of recentPagos(); track pago.id) {
                  <div class="recent-item">
                    <div class="item-icon pagos">
                      <mat-icon>{{ getPaymentIcon(pago.paymentMethod) }}</mat-icon>
                    </div>
                    <div class="item-details">
                      <span class="item-title">{{ pago.workerName }}</span>
                      <span class="item-subtitle">{{ pago.proposalNumbers.join(', ') }}</span>
                    </div>
                    <span class="item-amount negative">
                      -{{ pago.amount | currency:'USD':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Animación fadeIn */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }

    /* Loading Spinner */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      color: #64748b;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .spinner.teal {
      border-top-color: #14b8a6;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    /* Section Icon Box */
    .section-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-icon-box mat-icon {
      color: white;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .section-icon-box.emerald {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .section-icon-box.red {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    /* Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      color: white;
      transition: all 0.15s ease;
    }

    .btn-primary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-primary.emerald {
      background: #10b981;
    }

    .btn-primary.emerald:hover {
      background: #059669;
    }

    .btn-primary.red {
      background: #ef4444;
    }

    .btn-primary.red:hover {
      background: #dc2626;
    }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      background: transparent;
      transition: all 0.15s ease;
    }

    .btn-outline mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-outline.emerald {
      border: 1px solid #10b981;
      color: #10b981;
    }

    .btn-outline.emerald:hover {
      background: #ecfdf5;
    }

    .btn-outline.red {
      border: 1px solid #ef4444;
      color: #ef4444;
    }

    .btn-outline.red:hover {
      background: #fef2f2;
    }

    /* Divider */
    .divider {
      height: 1px;
      background: #e2e8f0;
    }

    /* Sections Grid */
    .sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .section-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .section-title h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
    }

    .section-content {
      padding: 1.5rem;
    }

    .section-description {
      color: #64748b;
      margin: 0 0 1.25rem;
      line-height: 1.6;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Recent List */
    .recent-list {
      padding: 1rem 1.5rem 1.5rem;
    }

    .recent-list h3 {
      margin: 0 0 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .recent-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .recent-item:last-child {
      border-bottom: none;
    }

    .item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .item-icon.cobros {
      background: #dcfce7;
      color: #16a34a;
    }

    .item-icon.pagos {
      background: #fee2e2;
      color: #dc2626;
    }

    .item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-weight: 500;
      color: #1e293b;
    }

    .item-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .item-amount {
      font-weight: 600;
    }

    .item-amount.positive {
      color: #16a34a;
    }

    .item-amount.negative {
      color: #dc2626;
    }

    @media (max-width: 768px) {
      .sections-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TreasuryDashboardComponent implements OnInit {
  private treasuryService = inject(TreasuryService);
  private router = inject(Router);

  isLoading = this.treasuryService.isLoading;
  stats = this.treasuryService.stats;
  cobros = this.treasuryService.activeCobros;
  pagos = this.treasuryService.activePagos;

  // Configuración del header
  headerStats = computed<StatChip[]>(() => {
    const currentStats = this.stats();
    return [
      { value: currentStats.totalCobros, label: 'COBROS', color: 'success' as const },
      { value: currentStats.totalPagos, label: 'PAGOS', color: 'warning' as const }
    ];
  });

  headerActions = computed<ActionButton[]>(() => [
    { icon: 'refresh', tooltip: 'Actualizar', action: () => this.refresh() }
  ]);

  // Recent items (last 5)
  recentCobros = computed(() => this.cobros().slice(0, 5));
  recentPagos = computed(() => this.pagos().slice(0, 5));

  paymentMethodLabels = PAYMENT_METHOD_LABELS;
  paymentMethodIcons = PAYMENT_METHOD_ICONS;

  async ngOnInit(): Promise<void> {
    await this.treasuryService.initialize();
  }

  async refresh(): Promise<void> {
    await this.treasuryService.initialize();
  }

  getPaymentIcon(method: string): string {
    return this.paymentMethodIcons[method as keyof typeof this.paymentMethodIcons] || 'payment';
  }

  goToCobros(action?: string): void {
    if (action === 'new') {
      this.router.navigate(['/modules/treasury/cobros'], { queryParams: { action: 'new' } });
    } else {
      this.router.navigate(['/modules/treasury/cobros']);
    }
  }

  goToPagos(action?: string): void {
    if (action === 'new') {
      this.router.navigate(['/modules/treasury/pagos'], { queryParams: { action: 'new' } });
    } else {
      this.router.navigate(['/modules/treasury/pagos']);
    }
  }
}
