// src/app/core/services/app-config.service.ts
import { Injectable, signal, effect, OnDestroy, inject } from '@angular/core';
import {
  getFirestore,
  doc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { getDocWithLogging as getDoc } from '../../shared/utils/firebase-logger.utils';
import { SystemConfig } from '../../admin/models/system-config.interface';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService implements OnDestroy {
  private db = getFirestore();
  private readonly CONFIG_DOC_ID = 'system_config';
  private readonly CONFIG_COLLECTION = 'config';
  private unsubscribe: Unsubscribe | null = null;
  private isInitialized = false; // ✅ Evitar inicializaciones duplicadas
  private logger = inject(LoggerService);

  // Valores por defecto para layout
  private readonly DEFAULT_CONTAINER_MAX_WIDTH = 1400;
  private readonly DEFAULT_BODY_BACKGROUND = 'linear-gradient(to bottom right, #f8fafc, #f1f5f9, #e2e8f0)';

  // Signals privados (writable) - Valores null iniciales hasta cargar desde Firestore
  private _appName = signal<string | null>(null);
  private _appDescription = signal<string | null>(null);
  private _logoUrl = signal<string | null>(null);
  private _logoBackgroundColor = signal<string>('transparent');
  private _faviconUrl = signal<string | null>(null);
  private _adminContactEmail = signal<string | null>(null);
  private _footerText = signal<string | null>(null);
  private _footerColor = signal<string>('#1e293b');
  private _footerTextColor = signal<string>('#94a3b8');
  private _isLoaded = signal<boolean>(false);

  // Signals de layout global
  private _containerMaxWidth = signal<number>(this.DEFAULT_CONTAINER_MAX_WIDTH);
  private _bodyBackground = signal<string>(this.DEFAULT_BODY_BACKGROUND);

  // Signals públicos (readonly)
  readonly appName = this._appName.asReadonly();
  readonly appDescription = this._appDescription.asReadonly();
  readonly logoUrl = this._logoUrl.asReadonly();
  readonly logoBackgroundColor = this._logoBackgroundColor.asReadonly();
  readonly faviconUrl = this._faviconUrl.asReadonly();
  readonly adminContactEmail = this._adminContactEmail.asReadonly();
  readonly footerText = this._footerText.asReadonly();
  readonly footerColor = this._footerColor.asReadonly();
  readonly footerTextColor = this._footerTextColor.asReadonly();
  readonly isLoaded = this._isLoaded.asReadonly();

  // Signals públicos de layout
  readonly containerMaxWidth = this._containerMaxWidth.asReadonly();
  readonly bodyBackground = this._bodyBackground.asReadonly();

  constructor() {
    this.logger.debug('AppConfigService inicializando...');
    this.setupFaviconUpdater();
    this.setupLayoutUpdater();
    // ✅ NO inicializamos el listener automáticamente
  }

  /**
   * ✅ NUEVO: Inicializa la configuración solo cuando se necesita
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('AppConfigService ya inicializado, omitiendo...');
      return;
    }

    this.logger.info('Cargando configuración inicial...');
    await this.loadConfigOnce();
    this.isInitialized = true;
  }

  /**
   * ✅ NUEVO: Carga la configuración una sola vez (sin listener en tiempo real)
   */
  private async loadConfigOnce(): Promise<void> {
    try {
      const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);
      const docSnap = await getDoc(configRef);

      if (docSnap.exists()) {
        const config = docSnap.data() as SystemConfig;
        this.logger.debug('Configuración cargada desde Firestore', config);
        this.updateSignals(config);
        this._isLoaded.set(true);
      } else {
        this.logger.warn('Documento de configuración no existe, usando valores por defecto');
        this.setDefaultValues();
        this._isLoaded.set(true);
      }
    } catch (error) {
      this.logger.error('Error cargando configuración', error);
      this.setDefaultValues();
      this._isLoaded.set(true);
    }
  }

  /**
   * ✅ LIMPIEZA DEL LISTENER AL DESTRUIR EL SERVICIO
   */
  ngOnDestroy(): void {
    this.logger.debug('Limpiando AppConfigService...');
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.logger.debug('Listener de Firestore desconectado');
    }
  }

  /**
   * Actualiza todos los signals con los datos de Firestore
   */
  private updateSignals(config: SystemConfig) {
    this.logger.debug('Actualizando signals con configuración', config);

    this._appName.set(config.appName || null);
    this._appDescription.set(config.appDescription || null);
    this._logoUrl.set(config.logoUrl || null);
    this._logoBackgroundColor.set(config.logoBackgroundColor || 'transparent');
    this._faviconUrl.set(config.faviconUrl || config.logoUrl || null);
    this._adminContactEmail.set(config.adminContactEmail || null);
    this._footerText.set(config.footerText || null);
    this._footerColor.set(config.footerColor || '#1e293b');
    this._footerTextColor.set(config.footerTextColor || '#94a3b8');

    // Layout global
    this._containerMaxWidth.set(config.layout?.containerMaxWidth || this.DEFAULT_CONTAINER_MAX_WIDTH);
    this._bodyBackground.set(config.layout?.bodyBackgroundValue || this.DEFAULT_BODY_BACKGROUND);

    this.logger.debug('Signals actualizados correctamente');
  }

  /**
   * Establece valores por defecto (null - indica que no hay configuración)
   */
  private setDefaultValues() {
    this.logger.info('Estableciendo valores por defecto (null)');
    this._appName.set(null);
    this._appDescription.set(null);
    this._logoUrl.set(null);
    this._logoBackgroundColor.set('transparent');
    this._faviconUrl.set(null);
    this._adminContactEmail.set(null);
    this._footerText.set(null);
    this._footerColor.set('#1e293b');
    this._footerTextColor.set('#94a3b8');

    // Layout con valores por defecto
    this._containerMaxWidth.set(this.DEFAULT_CONTAINER_MAX_WIDTH);
    this._bodyBackground.set(this.DEFAULT_BODY_BACKGROUND);
  }

  /**
   * Configura el actualizador automático del favicon
   */
  private setupFaviconUpdater() {
    effect(() => {
      const faviconUrl = this._faviconUrl();
      this.logger.debug('Effect de favicon ejecutado', { url: faviconUrl });

      if (faviconUrl) {
        this.updateFavicon(faviconUrl);
      } else {
        this.resetFavicon();
      }
    });
  }

  /**
   * Configura el actualizador de CSS variables para layout global
   */
  private setupLayoutUpdater() {
    effect(() => {
      const maxWidth = this._containerMaxWidth();
      const background = this._bodyBackground();

      this.logger.debug('Effect de layout ejecutado', { maxWidth, background });

      // Actualizar CSS variables en :root
      document.documentElement.style.setProperty('--container-max-width', `${maxWidth}px`);
      document.documentElement.style.setProperty('--body-bg', background);
    });
  }

  /**
   * Actualiza el favicon del navegador
   */
  private updateFavicon(url: string) {
    try {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");

      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      link.href = url;
      this.logger.debug('Favicon actualizado', { url });
    } catch (error) {
      this.logger.error('Error actualizando favicon', error);
    }
  }

  /**
   * Resetea el favicon al por defecto
   */
  private resetFavicon() {
    try {
      const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");

      if (link) {
        link.href = '/favicon.ico';
      }

      this.logger.debug('Favicon reseteado al por defecto');
    } catch (error) {
      this.logger.error('Error reseteando favicon', error);
    }
  }

  /**
   * Actualiza el título del documento
   */
  updateDocumentTitle(suffix?: string) {
    const appName = this._appName();
    if (!appName) {
      document.title = suffix || 'Dashboard';
      return;
    }
    document.title = suffix ? `${suffix} - ${appName}` : appName;
  }

  /**
   * Obtiene la información completa de la app
   * Retorna null para valores no cargados aún
   */
  getAppInfo() {
    const isLoaded = this._isLoaded();

    return {
      name: isLoaded ? (this._appName() || '') : null,
      description: isLoaded ? (this._appDescription() || '') : null,
      supportEmail: isLoaded ? (this._adminContactEmail() || '') : null
    };
  }

  /**
   * ✅ OPTIMIZADO: Método para forzar recarga manual
   */
  async forceReload(): Promise<void> {
    this.logger.info('Forzando recarga de configuración...');
    this.isInitialized = false; // Permitir reinicialización
    await this.initialize();
  }
}