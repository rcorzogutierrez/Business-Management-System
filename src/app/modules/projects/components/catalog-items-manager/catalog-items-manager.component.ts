// src/app/modules/projects/components/catalog-items-manager/catalog-items-manager.component.ts

import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CatalogItemsService } from '../../services/catalog-items.service';
import { CatalogItem, CreateCatalogItemData } from '../../models';
import { MaterialsService } from '../../../materials/services/materials.service';
import { Material } from '../../../materials/models';

@Component({
  selector: 'app-catalog-items-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './catalog-items-manager.component.html',
  styleUrls: ['./catalog-items-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogItemsManagerComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CatalogItemsManagerComponent>);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private catalogItemsService = inject(CatalogItemsService);
  private materialsService = inject(MaterialsService);
  private snackBar = inject(MatSnackBar);

  // Signals
  catalogItems = this.catalogItemsService.catalogItems;
  isLoading = this.catalogItemsService.isLoading;
  isEditMode = signal<boolean>(false);
  editingItemId = signal<string | null>(null);
  searchTerm = signal<string>('');

  // Materials import
  showMaterialsPicker = signal<boolean>(false);
  materialSearchTerm = signal<string>('');
  materialsLoading = signal<boolean>(false);

  filteredMaterials = computed(() => {
    const materials = this.materialsService.activeMaterials();
    const existingNames = new Set(
      this.catalogItems().filter(i => i.name).map(i => i.name.toLowerCase())
    );
    const term = this.materialSearchTerm().toLowerCase().trim();

    return materials.filter(m => {
      const name = this.getMaterialName(m);
      if (!name) return false;
      const nameLower = name.toLowerCase();
      const notImported = !existingNames.has(nameLower);
      const matchesSearch = !term || nameLower.includes(term);
      return notImported && matchesSearch;
    });
  });

  // Form
  itemForm!: FormGroup;

  async ngOnInit() {
    this.initForm();
    this.loadMaterials();
  }

  private async loadMaterials() {
    try {
      this.materialsLoading.set(true);
      await this.materialsService.initialize();
    } catch (error) {
      console.error('Error cargando materiales:', error);
    } finally {
      this.materialsLoading.set(false);
    }
  }

  /**
   * Inicializar formulario
   */
  initForm() {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
  }

  /**
   * Buscar items
   */
  get filteredItems(): CatalogItem[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.catalogItems();
    }

    return this.catalogItems().filter(item => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const descMatch = item.description?.toLowerCase().includes(term) || false;
      return nameMatch || descMatch;
    });
  }

  /**
   * Manejar cambio en búsqueda
   */
  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  /**
   * Crear o actualizar item
   */
  async saveItem() {
    if (this.itemForm.invalid) {
      this.snackBar.open('Por favor completa el nombre del item', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      const formValue = this.itemForm.value;

      // Construir itemData solo con campos que tienen valor
      const itemData: CreateCatalogItemData = {
        name: formValue.name,
        order: this.catalogItems().length + 1
      };

      // Solo agregar description si tiene valor
      if (formValue.description && formValue.description.trim()) {
        itemData.description = formValue.description.trim();
      }

      if (this.isEditMode() && this.editingItemId()) {
        // Actualizar item existente
        await this.catalogItemsService.updateItem(this.editingItemId()!, itemData);
        this.snackBar.open('Item actualizado exitosamente', 'Cerrar', { duration: 3000 });
      } else {
        // Crear nuevo item
        await this.catalogItemsService.createItem(itemData);
        this.snackBar.open('Item creado exitosamente', 'Cerrar', { duration: 3000 });
      }

      this.resetForm();
    } catch (error) {
      console.error('Error guardando item:', error);
      this.snackBar.open('Error al guardar el item', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Editar item
   */
  editItem(item: CatalogItem) {
    this.isEditMode.set(true);
    this.editingItemId.set(item.id);

    this.itemForm.patchValue({
      name: item.name,
      description: item.description || ''
    });

    // Scroll to form
    setTimeout(() => {
      document.querySelector('.item-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  /**
   * Eliminar item
   */
  async deleteItem(item: CatalogItem) {
    // Importar dinámicamente el diálogo de confirmación
    const { ConfirmDialogComponent } = await import('../../../../shared/components/confirm-dialog/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Eliminar Item',
        message: `¿Estás seguro de eliminar "${item.name}"?\n\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete'
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.catalogItemsService.deleteItem(item.id);
          this.snackBar.open('Item eliminado exitosamente', 'Cerrar', { duration: 3000 });

          // Si estábamos editando este item, resetear form
          if (this.editingItemId() === item.id) {
            this.resetForm();
          }
        } catch (error) {
          console.error('Error eliminando item:', error);
          this.snackBar.open('Error al eliminar el item', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  /**
   * Resetear formulario
   */
  resetForm() {
    this.itemForm.reset();
    this.isEditMode.set(false);
    this.editingItemId.set(null);
  }

  /**
   * Obtener nombre del material (busca en root y customFields)
   * Los materiales de formularios dinámicos guardan todo en customFields
   * con nombres en español (ej: "nombre", "descripcion", "precio")
   */
  getMaterialName(material: Material): string {
    if (material.name) return material.name;
    const cf = (material as any).customFields;
    if (!cf) return '';
    return cf.nombre || cf.name || cf.material || cf.descripcion || '';
  }

  getMaterialDescription(material: Material): string {
    if (material.description) return material.description;
    const cf = (material as any).customFields;
    if (!cf) return '';
    return cf.descripcion || cf.description || '';
  }

  /**
   * Toggle panel de importar materiales
   */
  toggleMaterialsPicker() {
    this.showMaterialsPicker.update(v => !v);
    this.materialSearchTerm.set('');
  }

  /**
   * Buscar materiales
   */
  onMaterialSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.materialSearchTerm.set(value);
  }

  /**
   * Importar material como item del catálogo
   */
  async importMaterial(material: Material) {
    try {
      const name = this.getMaterialName(material);
      if (!name || name === 'Sin nombre') return;

      const itemData: CreateCatalogItemData = {
        name,
        order: this.catalogItems().length + 1
      };

      const description = this.getMaterialDescription(material);
      if (description) {
        itemData.description = description;
      }

      await this.catalogItemsService.createItem(itemData);
      this.snackBar.open(`"${name}" agregado al catálogo`, 'Cerrar', { duration: 2000 });
    } catch (error) {
      console.error('Error importando material:', error);
      this.snackBar.open('Error al importar el material', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Cerrar dialog
   */
  close() {
    this.dialogRef.close();
  }
}
