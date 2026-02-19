// src/app/admin/components/manage-users/manage-users.component.ts
import { Component, OnInit, effect, ChangeDetectionStrategy, ChangeDetectorRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/services/notification.service';
import { Router } from '@angular/router';

import { ModuleHeaderComponent, ActionButton } from '../../../shared/components/module-header/module-header.component';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService, User, AdminStats } from '../../services/admin.service';
import { AddUserDialogComponent } from '../add-user-dialog/add-user-dialog.component';
import { GenericDeleteDialogComponent } from '../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { AssignModulesDialogComponent } from '../assign-modules-dialog/assign-modules-dialog.component';
import { EditUserRoleDialogComponent } from '../edit-user-role-dialog/edit-user-role-dialog.component';
import { ADMIN_USERS_CONFIG, adaptUserToGenericEntity } from '../../config/admin-users.config';

import {
  getInitials,
  getAvatarColor,
  formatDate,
  getRelativeTime
} from '../../../shared/utils';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    ModuleHeaderComponent,
  ],
  templateUrl: './manage-users.component.html',
  styleUrl: './manage-users.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageUsersComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private adminService = inject(AdminService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.authorizedUser;

  /**
   * Botones de acción para el header compartido
   */
  headerActions = computed<ActionButton[]>(() => [
    {
      icon: 'refresh',
      tooltip: 'Recargar usuarios',
      action: () => this.refreshData()
    }
  ]);

  // Stats
  totalUsers = 0;
  activeUsers = 0;
  adminUsers = 0;

  // Usuarios
  users: User[] = [];
  displayedUsers: User[] = [];
  filteredUsers: User[] = [];

  // Control de filtros y búsqueda
  currentFilter: 'all' | 'admin' | 'modules' | 'active' = 'all';
  searchTerm = '';

  // Control de carga
  isLoading = false;

  // Control de selección múltiple
  selectedUsers = new Set<string>();

  // Utilidades
  readonly getInitials = getInitials;
  readonly getAvatarColor = getAvatarColor;
  readonly formatDate = formatDate;
  readonly getRelativeTime = getRelativeTime;

  constructor() {
    effect(() => {
      const users = this.adminService.users();
      this.users = users;
      this.applyFilters();
      this.cdr.markForCheck();
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    this.cdr.markForCheck();

    await this.loadData();

    this.isLoading = false;
    this.cdr.markForCheck();
  }

  private async loadData() {
    try {
      await this.adminService.initialize();

      const stats = await this.adminService.getAdminStats();
      this.totalUsers = stats.totalUsers;
      this.activeUsers = stats.activeUsers;
      this.adminUsers = stats.adminUsers;

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.notify.crud.loadError('datos');
    }
  }

  private applyFilters() {
    let filtered = [...this.users];

    switch (this.currentFilter) {
      case 'admin':
        filtered = filtered.filter(u => u.role === 'admin');
        break;
      case 'modules':
        filtered = filtered.filter(u => u.modules && u.modules.length > 0);
        break;
      case 'active':
        filtered = filtered.filter(u => u.isActive);
        break;
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(term) ||
        (u.displayName && u.displayName.toLowerCase().includes(term))
      );
    }

    this.filteredUsers = filtered;
    this.updateDisplayedUsers();
    this.cdr.markForCheck();
  }

  private updateDisplayedUsers() {
    this.displayedUsers = this.filteredUsers.slice(0, 10);
  }

  setFilter(filter: 'all' | 'admin' | 'modules' | 'active') {
    this.currentFilter = filter;
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  loadMoreUsers() {
    const currentLength = this.displayedUsers.length;
    const nextBatch = this.filteredUsers.slice(0, Math.min(currentLength + 10, this.filteredUsers.length));

    if (nextBatch.length > this.displayedUsers.length) {
      this.displayedUsers = nextBatch;
      this.notify.info(`Mostrando ${this.displayedUsers.length} de ${this.filteredUsers.length} usuarios`);
    }
  }

  async refreshData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      await this.loadData();
      this.notify.system.refreshed();
    } catch (error) {
      this.notify.system.refreshError();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // SELECCIÓN MÚLTIPLE
  // ============================================

  canSelectUser(user: User): boolean {
    if (this.currentUser()?.email === user.email) return false;

    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) return false;
    }

    return true;
  }

  getSelectionTooltip(user: User): string {
    if (this.currentUser()?.email === user.email) {
      return 'No puedes seleccionar tu propia cuenta';
    }

    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        return 'No se puede seleccionar el último administrador';
      }
    }

    return 'Seleccionar usuario';
  }

  toggleUserSelection(uid: string) {
    if (this.selectedUsers.has(uid)) {
      this.selectedUsers.delete(uid);
    } else {
      this.selectedUsers.add(uid);
    }
  }

  isUserSelected(uid: string): boolean {
    return this.selectedUsers.has(uid);
  }

  isAllSelected(): boolean {
    const selectableUsers = this.displayedUsers.filter(u => u.uid && this.canSelectUser(u));
    if (selectableUsers.length === 0) return false;
    return selectableUsers.every(u => this.selectedUsers.has(u.uid!));
  }

  isSomeSelected(): boolean {
    const selectableUsers = this.displayedUsers.filter(u => u.uid && this.canSelectUser(u));
    if (selectableUsers.length === 0) return false;
    const selectedCount = selectableUsers.filter(u => this.selectedUsers.has(u.uid!)).length;
    return selectedCount > 0 && selectedCount < selectableUsers.length;
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.displayedUsers
        .filter(u => u.uid && this.canSelectUser(u))
        .forEach(u => this.selectedUsers.add(u.uid!));
    }
  }

  clearSelection() {
    this.selectedUsers.clear();
  }

  async deleteSelectedUsers() {
    if (this.selectedUsers.size === 0) {
      this.notify.validation.selectAtLeastOne('usuario');
      return;
    }

    const selectedUsersList = this.users.filter(u => u.uid && this.selectedUsers.has(u.uid));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        entities: selectedUsersList.map(adaptUserToGenericEntity),
        count: this.selectedUsers.size,
        config: ADMIN_USERS_CONFIG
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.performBulkDeletion(Array.from(this.selectedUsers));
      }
    });
  }

  private async performBulkDeletion(uids: string[]) {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.notify.info(`Eliminando ${uids.length} usuario(s)...`);

    try {
      const result = await this.adminService.deleteMultipleUsers(uids);

      if (result.success) {
        this.notify.success(result.message);
        this.clearSelection();
        await this.refreshData();
      } else {
        this.notify.error(result.message);
      }
    } catch (error: any) {
      this.notify.error(`Error: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // ACCIONES DE USUARIO
  // ============================================

  goBack() {
    this.router.navigate(['/admin']);
  }

  trackByUid(index: number, user: User): string {
    return user.uid || user.email;
  }

  getRoleIcon(role: string): string {
    const icons: Record<string, string> = { admin: 'shield', user: 'person', viewer: 'visibility' };
    return icons[role] || 'person';
  }

  getUserModules(email: string): string[] {
    const user = this.users.find(u => u.email === email);
    return user?.modules || [];
  }

  addUser() {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.refreshData();
      }
    });
  }

  viewUserDetails(user: User) {
    this.notify.info(`Detalles de ${user.displayName || user.email}`);
  }

  editUser(user: User) {
    const dialogRef = this.dialog.open(EditUserRoleDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { user }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.success) {
        this.notify.success(result.message);
        await this.refreshData();
      }
    });
  }

  async resetUserPassword(user: User) {
    const result = await this.adminService.resetUserPassword(user.email);
    if (result.success) {
      this.notify.success(result.message);
    } else {
      this.notify.error(result.message);
    }
  }

  async toggleUserStatus(user: User) {
    if (!user.uid) return;

    const result = await this.adminService.toggleUserStatus(user.uid);
    if (result.success) {
      this.notify.success(result.message);
    } else {
      this.notify.error(result.message);
    }

    if (result.success) {
      await this.refreshData();
    }
  }

  assignModules(user: User) {
    const dialogRef = this.dialog.open(AssignModulesDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { user }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.success) {
        this.notify.success(result.message);
        await this.refreshData();
      } else if (result?.navigateToModules) {
        this.router.navigate(['/admin/modules']);
      }
    });
  }

  async deleteUser(user: User) {
    if (!user.uid) {
      this.notify.error('Error: Usuario sin UID válido');
      return;
    }

    if (this.currentUser()?.email === user.email) {
      this.notify.error('No puedes eliminar tu propia cuenta');
      return;
    }

    if (user.role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount === 1) {
        this.notify.error('No puedes eliminar el último administrador');
        return;
      }
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        entity: adaptUserToGenericEntity(user),
        config: ADMIN_USERS_CONFIG
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        await this.performUserDeletion(user);
      }
    });
  }

  private async performUserDeletion(user: User) {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.notify.info(`Eliminando usuario ${user.displayName}...`);

    try {
      const result = await this.adminService.deleteUser(user.uid!);

      if (result.success) {
        this.notify.success(result.message);
        await this.refreshData();
      } else {
        this.notify.error(result.message);
      }
    } catch (error: any) {
      this.notify.error(`Error: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async exportData() {
    try {
      const result = await this.adminService.exportUsers();

      if (result.success && result.data) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.notify.system.exported('JSON');
      }
    } catch (error) {
      this.notify.system.exportError('JSON');
    }
  }
}
