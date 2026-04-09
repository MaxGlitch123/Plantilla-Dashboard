/**
 * SessionCleanupService
 * 
 * Comprehensive service for cleaning up authentication state and storage.
 * This service handles complete session cleanup including Auth0 state,
 * browser storage, cookies, cache, and other authentication-related data.
 */

export interface CleanupOptions {
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
  clearCookies?: boolean;
  clearCache?: boolean;
  clearAuth0Storage?: boolean;
  customStorageKeys?: string[];
  preserveKeys?: string[];
  logCleanup?: boolean;
}

export interface CleanupResult {
  success: boolean;
  clearedItems: {
    localStorage: string[];
    sessionStorage: string[];
    cookies: string[];
    caches: string[];
    auth0Keys: string[];
    customKeys: string[];
  };
  errors: Array<{
    type: string;
    message: string;
    error?: any;
  }>;
  timestamp: number;
}

class SessionCleanupService {
  private static instance: SessionCleanupService;
  private readonly logger: (message: string, data?: any) => void;

  private constructor() {
    this.logger = (message: string, data?: any) => {
      console.log(`🧹 [SessionCleanup] ${message}`, data || '');
    };
  }

  public static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService();
    }
    return SessionCleanupService.instance;
  }

  /**
   * Perform comprehensive session cleanup
   */
  public async performCompleteCleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const defaultOptions: CleanupOptions = {
      clearLocalStorage: true,
      clearSessionStorage: true,
      clearCookies: true,
      clearCache: true,
      clearAuth0Storage: true,
      customStorageKeys: [],
      preserveKeys: [],
      logCleanup: true
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    const result: CleanupResult = {
      success: true,
      clearedItems: {
        localStorage: [],
        sessionStorage: [],
        cookies: [],
        caches: [],
        auth0Keys: [],
        customKeys: []
      },
      errors: [],
      timestamp: Date.now()
    };

    if (finalOptions.logCleanup) {
      this.logger('Starting comprehensive session cleanup...', finalOptions);
    }

    // 1. Clear localStorage
    if (finalOptions.clearLocalStorage) {
      try {
        const localStorageResult = this.clearLocalStorage(
          finalOptions.preserveKeys || [],
          finalOptions.logCleanup || false
        );
        result.clearedItems.localStorage = localStorageResult.cleared;
        if (localStorageResult.errors.length > 0) {
          result.errors.push(...localStorageResult.errors);
        }
      } catch (error) {
        result.errors.push({
          type: 'localStorage',
          message: 'Failed to clear localStorage',
          error
        });
        result.success = false;
      }
    }

    // 2. Clear sessionStorage
    if (finalOptions.clearSessionStorage) {
      try {
        const sessionStorageResult = this.clearSessionStorage(
          finalOptions.preserveKeys || [],
          finalOptions.logCleanup || false
        );
        result.clearedItems.sessionStorage = sessionStorageResult.cleared;
        if (sessionStorageResult.errors.length > 0) {
          result.errors.push(...sessionStorageResult.errors);
        }
      } catch (error) {
        result.errors.push({
          type: 'sessionStorage',
          message: 'Failed to clear sessionStorage',
          error
        });
        result.success = false;
      }
    }

    // 3. Clear Auth0 specific storage
    if (finalOptions.clearAuth0Storage) {
      try {
        const auth0Result = this.clearAuth0Storage(finalOptions.logCleanup || false);
        result.clearedItems.auth0Keys = auth0Result.cleared;
        if (auth0Result.errors.length > 0) {
          result.errors.push(...auth0Result.errors);
        }
      } catch (error) {
        result.errors.push({
          type: 'auth0Storage',
          message: 'Failed to clear Auth0 storage',
          error
        });
        result.success = false;
      }
    }

    // 4. Clear cookies
    if (finalOptions.clearCookies) {
      try {
        const cookiesResult = this.clearCookies(finalOptions.logCleanup || false);
        result.clearedItems.cookies = cookiesResult.cleared;
        if (cookiesResult.errors.length > 0) {
          result.errors.push(...cookiesResult.errors);
        }
      } catch (error) {
        result.errors.push({
          type: 'cookies',
          message: 'Failed to clear cookies',
          error
        });
        result.success = false;
      }
    }

    // 5. Clear browser cache
    if (finalOptions.clearCache) {
      try {
        const cacheResult = await this.clearBrowserCache(finalOptions.logCleanup || false);
        result.clearedItems.caches = cacheResult.cleared;
        if (cacheResult.errors.length > 0) {
          result.errors.push(...cacheResult.errors);
        }
      } catch (error) {
        result.errors.push({
          type: 'cache',
          message: 'Failed to clear browser cache',
          error
        });
        result.success = false;
      }
    }

    // 6. Clear custom storage keys
    if (finalOptions.customStorageKeys && finalOptions.customStorageKeys.length > 0) {
      try {
        const customResult = this.clearCustomKeys(
          finalOptions.customStorageKeys,
          finalOptions.logCleanup || false
        );
        result.clearedItems.customKeys = customResult.cleared;
        if (customResult.errors.length > 0) {
          result.errors.push(...customResult.errors);
        }
      } catch (error) {
        result.errors.push({
          type: 'customKeys',
          message: 'Failed to clear custom keys',
          error
        });
        result.success = false;
      }
    }

    if (finalOptions.logCleanup) {
      this.logger('Session cleanup completed', {
        success: result.success,
        totalCleared: Object.values(result.clearedItems).reduce((acc, arr) => acc + arr.length, 0),
        errorCount: result.errors.length
      });
    }

    return result;
  }

  /**
   * Clear localStorage with preservation options
   */
  private clearLocalStorage(preserveKeys: string[] = [], logCleanup: boolean = true): {
    cleared: string[];
    errors: Array<{ type: string; message: string; error?: any }>;
  } {
    const result = { cleared: [] as string[], errors: [] as Array<{ type: string; message: string; error?: any }> };
    
    try {
      const keys = Object.keys(localStorage);
      if (logCleanup) {
        this.logger(`Found ${keys.length} localStorage keys`, keys);
      }

      for (const key of keys) {
        if (!preserveKeys.includes(key)) {
          try {
            localStorage.removeItem(key);
            result.cleared.push(key);
            if (logCleanup) {
              this.logger(`✅ Removed localStorage key: ${key}`);
            }
          } catch (error) {
            result.errors.push({
              type: 'localStorage',
              message: `Failed to remove key: ${key}`,
              error
            });
            if (logCleanup) {
              this.logger(`❌ Failed to remove localStorage key: ${key}`, error);
            }
          }
        } else {
          if (logCleanup) {
            this.logger(`⏭️ Preserved localStorage key: ${key}`);
          }
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'localStorage',
        message: 'Failed to access localStorage',
        error
      });
    }

    return result;
  }

  /**
   * Clear sessionStorage with preservation options
   */
  private clearSessionStorage(preserveKeys: string[] = [], logCleanup: boolean = true): {
    cleared: string[];
    errors: Array<{ type: string; message: string; error?: any }>;
  } {
    const result = { cleared: [] as string[], errors: [] as Array<{ type: string; message: string; error?: any }> };
    
    try {
      const keys = Object.keys(sessionStorage);
      if (logCleanup) {
        this.logger(`Found ${keys.length} sessionStorage keys`, keys);
      }

      for (const key of keys) {
        if (!preserveKeys.includes(key)) {
          try {
            sessionStorage.removeItem(key);
            result.cleared.push(key);
            if (logCleanup) {
              this.logger(`✅ Removed sessionStorage key: ${key}`);
            }
          } catch (error) {
            result.errors.push({
              type: 'sessionStorage',
              message: `Failed to remove key: ${key}`,
              error
            });
            if (logCleanup) {
              this.logger(`❌ Failed to remove sessionStorage key: ${key}`, error);
            }
          }
        } else {
          if (logCleanup) {
            this.logger(`⏭️ Preserved sessionStorage key: ${key}`);
          }
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'sessionStorage',
        message: 'Failed to access sessionStorage',
        error
      });
    }

    return result;
  }

  /**
   * Clear Auth0 specific storage keys
   */
  private clearAuth0Storage(logCleanup: boolean = true): {
    cleared: string[];
    errors: Array<{ type: string; message: string; error?: any }>;
  } {
    const result = { cleared: [] as string[], errors: [] as Array<{ type: string; message: string; error?: any }> };
    
    try {
      // Auth0 typically uses keys that start with @@auth0spajs@@
      const auth0Patterns = [
        /^@@auth0spajs@@/,
        /auth0/i,
        /oauth/i,
        /jwt/i,
        /token/i
      ];

      // Check localStorage
      const localKeys = Object.keys(localStorage);
      for (const key of localKeys) {
        if (auth0Patterns.some(pattern => pattern.test(key))) {
          try {
            localStorage.removeItem(key);
            result.cleared.push(`localStorage:${key}`);
            if (logCleanup) {
              this.logger(`✅ Removed Auth0 localStorage key: ${key}`);
            }
          } catch (error) {
            result.errors.push({
              type: 'auth0Storage',
              message: `Failed to remove localStorage key: ${key}`,
              error
            });
          }
        }
      }

      // Check sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      for (const key of sessionKeys) {
        if (auth0Patterns.some(pattern => pattern.test(key))) {
          try {
            sessionStorage.removeItem(key);
            result.cleared.push(`sessionStorage:${key}`);
            if (logCleanup) {
              this.logger(`✅ Removed Auth0 sessionStorage key: ${key}`);
            }
          } catch (error) {
            result.errors.push({
              type: 'auth0Storage',
              message: `Failed to remove sessionStorage key: ${key}`,
              error
            });
          }
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'auth0Storage',
        message: 'Failed to clear Auth0 storage',
        error
      });
    }

    return result;
  }

  /**
   * Clear browser cookies
   */
  private clearCookies(logCleanup: boolean = true): {
    cleared: string[];
    errors: Array<{ type: string; message: string; error?: any }>;
  } {
    const result = { cleared: [] as string[], errors: [] as Array<{ type: string; message: string; error?: any }> };
    
    try {
      const cookies = document.cookie.split(";");
      if (logCleanup) {
        this.logger(`Found ${cookies.length} cookies to clear`);
      }

      for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (name) {
          try {
            // Clear for current domain and path
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            // Clear for parent domain
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
            // Clear for exact hostname
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            
            result.cleared.push(name);
            if (logCleanup) {
              this.logger(`✅ Cleared cookie: ${name}`);
            }
          } catch (error) {
            result.errors.push({
              type: 'cookies',
              message: `Failed to clear cookie: ${name}`,
              error
            });
            if (logCleanup) {
              this.logger(`❌ Failed to clear cookie: ${name}`, error);
            }
          }
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'cookies',
        message: 'Failed to access cookies',
        error
      });
    }

    return result;
  }

  /**
   * Clear browser cache (if supported)
   */
  private async clearBrowserCache(logCleanup: boolean = true): Promise<{
    cleared: string[];
    errors: Array<{ type: string; message: string; error?: any }>;
  }> {
    const result = { cleared: [] as string[], errors: [] as Array<{ type: string; message: string; error?: any }> };
    
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        if (logCleanup) {
          this.logger(`Found ${cacheNames.length} caches to clear`, cacheNames);
        }

        const deletePromises = cacheNames.map(async (cacheName) => {
          try {
            const deleted = await caches.delete(cacheName);
            if (deleted) {
              result.cleared.push(cacheName);
              if (logCleanup) {
                this.logger(`✅ Cleared cache: ${cacheName}`);
              }
            }
          } catch (error) {
            result.errors.push({
              type: 'cache',
              message: `Failed to clear cache: ${cacheName}`,
              error
            });
            if (logCleanup) {
              this.logger(`❌ Failed to clear cache: ${cacheName}`, error);
            }
          }
        });

        await Promise.all(deletePromises);
      } catch (error) {
        result.errors.push({
          type: 'cache',
          message: 'Failed to access caches',
          error
        });
        if (logCleanup) {
          this.logger('❌ Failed to access browser caches', error);
        }
      }
    } else {
      if (logCleanup) {
        this.logger('ℹ️ Browser cache API not supported');
      }
    }

    return result;
  }

  /**
   * Clear custom storage keys
   */
  private clearCustomKeys(customKeys: string[], logCleanup: boolean = true): {
    cleared: string[];
    errors: Array<{ type: string; message: string; error?: any }>;
  } {
    const result = { cleared: [] as string[], errors: [] as Array<{ type: string; message: string; error?: any }> };
    
    for (const key of customKeys) {
      try {
        // Try localStorage first
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          result.cleared.push(`localStorage:${key}`);
          if (logCleanup) {
            this.logger(`✅ Removed custom localStorage key: ${key}`);
          }
        }

        // Try sessionStorage
        if (sessionStorage.getItem(key) !== null) {
          sessionStorage.removeItem(key);
          result.cleared.push(`sessionStorage:${key}`);
          if (logCleanup) {
            this.logger(`✅ Removed custom sessionStorage key: ${key}`);
          }
        }
      } catch (error) {
        result.errors.push({
          type: 'customKeys',
          message: `Failed to clear custom key: ${key}`,
          error
        });
        if (logCleanup) {
          this.logger(`❌ Failed to clear custom key: ${key}`, error);
        }
      }
    }

    return result;
  }

  /**
   * Quick cleanup for emergency situations
   */
  public async emergencyCleanup(): Promise<CleanupResult> {
    return this.performCompleteCleanup({
      clearLocalStorage: true,
      clearSessionStorage: true,
      clearCookies: true,
      clearCache: false, // Skip cache in emergency for speed
      clearAuth0Storage: true,
      preserveKeys: [], // Don't preserve anything in emergency
      logCleanup: false // Reduce console noise in emergency
    });
  }

  /**
   * Gentle cleanup that preserves some data
   */
  public async gentleCleanup(preserveKeys: string[] = []): Promise<CleanupResult> {
    const defaultPreserveKeys = [
      'theme',
      'language',
      'user-preferences',
      'app-settings',
      'pos-sales',
      'pos-storage',
      'pos-last-sale',
      ...preserveKeys
    ];

    return this.performCompleteCleanup({
      clearLocalStorage: true,
      clearSessionStorage: true,
      clearCookies: false, // Preserve cookies in gentle cleanup
      clearCache: false,
      clearAuth0Storage: true,
      preserveKeys: defaultPreserveKeys,
      logCleanup: true
    });
  }
}

// Export singleton instance
export const sessionCleanupService = SessionCleanupService.getInstance();
export default sessionCleanupService;