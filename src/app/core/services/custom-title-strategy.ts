// src/app/core/services/custom-title-strategy.ts
import { Injectable, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { AppConfigService } from './app-config.service';

/**
 * Estrategia personalizada para títulos de página
 *
 * Obtiene el nombre de la aplicación dinámicamente desde Firebase:
 * 1. appConfig.appName (nombre configurado en Firebase)
 * 2. Si no hay configuración, muestra solo el título de la ruta
 * 3. Durante la carga inicial, muestra "Loading..."
 *
 * Formato: "[Nombre App] | [Título de la Ruta]"
 *
 * @example
 * Si appName = "Business Management"
 * Ruta con title: 'Dashboard' → Se muestra: "Business Management | Dashboard"
 *
 * Si no hay appName configurado en Firebase:
 * Ruta con title: 'Dashboard' → Se muestra: "Dashboard"
 *
 * El título se actualiza automáticamente cuando cambia la configuración
 */
@Injectable({ providedIn: 'root' })
export class CustomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly appConfigService = inject(AppConfigService);
  private currentRouteTitle: string | undefined;

  constructor() {
    super();

    // Efecto reactivo: actualiza el título cuando cambia appConfig
    effect(() => {
      const appName = this.appConfigService.appName();
      const isLoaded = this.appConfigService.isLoaded();

      // Si aún no ha cargado, mostrar "Loading..."
      if (!isLoaded) {
        this.title.setTitle('Loading...');
        return;
      }

      // Una vez cargado, usar appName si existe o solo el título de la ruta
      if (this.currentRouteTitle) {
        if (appName) {
          this.title.setTitle(`${appName} | ${this.currentRouteTitle}`);
        } else {
          this.title.setTitle(this.currentRouteTitle);
        }
      } else {
        this.title.setTitle(appName || 'Dashboard');
      }
    });
  }

  /**
   * Actualiza el título de la página con el formato personalizado
   */
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.currentRouteTitle = routeTitle;

    const appName = this.appConfigService.appName();
    const isLoaded = this.appConfigService.isLoaded();

    // Si aún no ha cargado, mostrar "Loading..."
    if (!isLoaded) {
      this.title.setTitle('Loading...');
      return;
    }

    // Una vez cargado, usar appName si existe o solo el título de la ruta
    if (routeTitle) {
      if (appName) {
        this.title.setTitle(`${appName} | ${routeTitle}`);
      } else {
        this.title.setTitle(routeTitle);
      }
    } else {
      this.title.setTitle(appName || 'Dashboard');
    }
  }
}
