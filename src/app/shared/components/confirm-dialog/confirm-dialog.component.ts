// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  icon?: string;
  confirmColor?: string;
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
    <div class="min-w-[300px] max-w-[500px]">
      <!-- Header con icono y título -->
      <div class="flex items-center gap-3 px-6 pt-5 pb-3">
        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" [class]="getIconBgClass()">
          <mat-icon [class]="getIconClass()" class="!text-[22px]">{{ getIcon() }}</mat-icon>
        </div>
        <h2 class="text-lg font-semibold text-slate-800">{{ data.title }}</h2>
      </div>

      <!-- Contenido del mensaje -->
      <div class="px-6 py-3">
        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{{ data.message }}</p>
      </div>

      <!-- Botones de acción -->
      <div class="flex items-center justify-end gap-2 px-6 pb-5 pt-3">
        <button
          type="button"
          (click)="onCancel()"
          class="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button
          type="button"
          (click)="onConfirm()"
          [class]="getConfirmButtonClass()">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  getIcon(): string {
    if (this.data.icon) return this.data.icon;
    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      case 'info':
      default:
        return 'help_outline';
    }
  }

  getIconBgClass(): string {
    switch (this.data.type) {
      case 'warning':
        return 'bg-amber-50';
      case 'danger':
        return 'bg-red-50';
      case 'info':
      default:
        return 'bg-blue-50';
    }
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'warning':
        return 'text-amber-500';
      case 'danger':
        return 'text-red-500';
      case 'info':
      default:
        return 'text-blue-500';
    }
  }

  getConfirmButtonClass(): string {
    const baseClasses = 'px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors shadow-sm';

    switch (this.data.type) {
      case 'danger':
        return `${baseClasses} bg-red-600 hover:bg-red-700`;
      case 'warning':
        return `${baseClasses} bg-amber-600 hover:bg-amber-700`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-600 hover:bg-blue-700`;
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
