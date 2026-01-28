// src/app/modules/projects/components/confirm-dialog/confirm-dialog.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule
  ],
  template: `
    <div class="min-w-[360px] max-w-[480px] bg-white rounded-xl overflow-hidden animate-fadeIn">
      <!-- Header con degradado -->
      <div [class]="getHeaderClass()">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 flex items-center justify-center bg-white/20 rounded-lg backdrop-blur-sm">
            <mat-icon class="!text-white !text-xl">{{ data.icon || getDefaultIcon() }}</mat-icon>
          </div>
          <h2 class="text-base font-bold text-white">{{ data.title }}</h2>
        </div>
      </div>

      <!-- Contenido -->
      <div class="px-5 py-6 bg-white">
        <p class="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line">{{ data.message }}</p>
      </div>

      <!-- Footer con botones -->
      <div class="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50 border-t border-slate-200">
        <button
          type="button"
          (click)="onCancel()"
          class="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-slate-200 rounded-lg bg-white text-slate-600 text-sm font-semibold cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800">
          <mat-icon class="!text-lg">close</mat-icon>
          <span>{{ data.cancelText || 'Cancelar' }}</span>
        </button>
        <button
          type="button"
          (click)="onConfirm()"
          [class]="getConfirmButtonClass()">
          <mat-icon class="!text-lg">{{ getConfirmIcon() }}</mat-icon>
          <span>{{ data.confirmText || 'Confirmar' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }

    @media (max-width: 480px) {
      .min-w-\\[360px\\] {
        min-width: 100% !important;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  public data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  getHeaderClass(): string {
    const baseClass = 'flex items-center px-5 py-4';

    if (this.data.confirmColor === 'warn') {
      return `${baseClass} bg-gradient-to-br from-red-500 to-red-600 text-white`;
    }
    if (this.data.confirmColor === 'accent') {
      return `${baseClass} bg-gradient-to-br from-green-500 to-green-600 text-white`;
    }
    return `${baseClass} bg-gradient-to-br from-blue-500 to-blue-600 text-white`;
  }

  getConfirmButtonClass(): string {
    const baseClass = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold cursor-pointer transition-all shadow-lg hover:-translate-y-0.5';

    if (this.data.confirmColor === 'warn') {
      return `${baseClass} bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30 hover:shadow-red-500/40 hover:shadow-xl`;
    }
    if (this.data.confirmColor === 'accent') {
      return `${baseClass} bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/30 hover:shadow-green-500/40 hover:shadow-xl`;
    }
    return `${baseClass} bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30 hover:shadow-blue-500/40 hover:shadow-xl`;
  }

  getDefaultIcon(): string {
    if (this.data.confirmColor === 'warn') {
      return 'warning';
    }
    if (this.data.confirmColor === 'accent') {
      return 'check_circle';
    }
    return 'help_outline';
  }

  getConfirmIcon(): string {
    if (this.data.confirmColor === 'warn') {
      return 'delete';
    }
    if (this.data.confirmColor === 'accent') {
      return 'check';
    }
    return 'check';
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
