import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { TreasuryService } from '../../services/treasury.service';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '../../models';

@Component({
  selector: 'app-treasury-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatIconModule
  ],
  template: `
    <div class="max-w-[1200px] mx-auto p-5">
      <!-- ============================================
           HEADER COMPACTO ESTILO CLIENTES
           ============================================ -->
      <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5 animate-fadeIn">
        <div class="flex items-center justify-between gap-5 flex-wrap">

          <!-- Left Section -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
              <mat-icon class="!text-white !text-xl">account_balance_wallet</mat-icon>
            </div>
            <div>
              <h1 class="text-lg font-bold text-slate-800">Tesorería</h1>
              <p class="text-xs text-slate-500">
                {{ stats().totalCobros + stats().totalPagos }} registros en el sistema
              </p>
            </div>
          </div>

          <!-- Right Section - Stats & Actions -->
          <div class="flex items-center gap-3 flex-wrap">
            <!-- Stats inline -->
            <div class="hidden md:flex items-center gap-2">
              <div class="flex flex-col items-center justify-center rounded-lg px-4 py-2 min-w-[75px] bg-emerald-50 border border-emerald-200">
                <span class="text-base font-bold leading-tight text-emerald-600">{{ stats().totalCobros }}</span>
                <span class="text-[10px] uppercase tracking-wider font-medium mt-1 text-emerald-500">Cobros</span>
              </div>
              <div class="flex flex-col items-center justify-center rounded-lg px-4 py-2 min-w-[75px] bg-red-50 border border-red-200">
                <span class="text-base font-bold leading-tight text-red-600">{{ stats().totalPagos }}</span>
                <span class="text-[10px] uppercase tracking-wider font-medium mt-1 text-red-500">Pagos</span>
              </div>
              <div class="flex flex-col items-center justify-center rounded-lg px-4 py-2 min-w-[85px] border"
                   [ngClass]="{
                     'bg-emerald-50 border-emerald-200': stats().balance >= 0,
                     'bg-red-50 border-red-200': stats().balance < 0
                   }">
                <span class="text-base font-bold leading-tight"
                      [ngClass]="{
                        'text-emerald-600': stats().balance >= 0,
                        'text-red-600': stats().balance < 0
                      }">{{ stats().balance | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
                <span class="text-[10px] uppercase tracking-wider font-medium mt-1"
                      [ngClass]="{
                        'text-emerald-500': stats().balance >= 0,
                        'text-red-500': stats().balance < 0
                      }">Balance</span>
              </div>

              <!-- Este Mes Badge -->
              <div class="flex gap-2 items-center rounded-lg px-4 py-2 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <div class="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
                  <mat-icon class="!text-white !text-lg">calendar_month</mat-icon>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-[9px] uppercase tracking-wider font-bold text-amber-600">Este Mes</span>
                  <span class="text-sm font-bold leading-tight text-emerald-600">+{{ stats().cobrosEsteMes | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
                  <span class="text-sm font-bold leading-tight text-red-600">-{{ stats().pagosEsteMes | currency:'USD':'symbol-narrow':'1.0-0' }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2">
              <button type="button"
                      class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      (click)="refresh()"
                      [disabled]="isLoading()"
                      title="Actualizar">
                <mat-icon class="!text-slate-600 !text-xl" [class.animate-spin]="isLoading()">refresh</mat-icon>
              </button>

              <button type="button"
                      class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-teal-500 to-teal-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-lg shadow-teal-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                      (click)="goToCobros('new')"
                      [disabled]="isLoading()">
                <mat-icon class="!text-lg">add</mat-icon>
                Registrar Cobro
              </button>

              <button type="button"
                      class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-red-500 to-red-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-lg shadow-red-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                      (click)="goToPagos('new')"
                      [disabled]="isLoading()">
                <mat-icon class="!text-lg">add</mat-icon>
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      </header>

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
