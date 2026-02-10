// src/app/modules/projects/projects.routes.ts

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { moduleGuard } from '../../core/guards/module.guard';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard(['admin', 'user']), moduleGuard('projects')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/proposals-list/proposals-list.component').then(
            m => m.ProposalsListComponent
          ),
        title: 'Estimados y Facturas'
      },
      // Rutas específicas DEBEN ir antes de las rutas dinámicas (:id)
      {
        path: 'new',
        loadComponent: () =>
          import('./components/proposal-form/proposal-form.component').then(
            m => m.ProposalFormComponent
          ),
        title: 'Nuevo Estimado'
      },
      {
        path: 'invoice/new',
        loadComponent: () =>
          import('./components/direct-invoice-form/direct-invoice-form.component').then(
            m => m.DirectInvoiceFormComponent
          ),
        title: 'Nueva Factura'
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./components/proposal-config/proposal-config.component').then(
            m => m.ProposalConfigComponent
          ),
        title: 'Configuración de Estimados'
      },
      // Rutas dinámicas van al final
      {
        path: ':id',
        loadComponent: () =>
          import('./components/proposal-view/proposal-view.component').then(
            m => m.ProposalViewComponent
          ),
        title: 'Ver Estimado'
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/proposal-form/proposal-form.component').then(
            m => m.ProposalFormComponent
          ),
        data: { mode: 'edit' },
        title: 'Editar Estimado'
      },
      {
        path: ':id/edit-invoice',
        loadComponent: () =>
          import('./components/direct-invoice-form/direct-invoice-form.component').then(
            m => m.DirectInvoiceFormComponent
          ),
        data: { mode: 'edit' },
        title: 'Editar Factura'
      }
    ]
  }
];
