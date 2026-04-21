import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export type AuthenticationProblem = 
  | 'not_authenticated' 
  | 'missing_user' 
  | 'auth_error' 
  | 'session_corrupt' 
  | 'invalid_token'
  | 'storage_inconsistent'
  | 'manual';

interface AuthGuardState {
  isValidating: boolean;
  problem: AuthenticationProblem | null;
  isAuthenticated: boolean;
  canProceed: boolean;
  lastCheck: number;
}

interface UseAuthenticationGuardOptions {
  enableAutoRedirect?: boolean;
  redirectPath?: string;
  validationInterval?: number; // ms, 0 disables periodic validation
  enableStorageValidation?: boolean;
  enableTokenValidation?: boolean;
  onProblemDetected?: (problem: AuthenticationProblem) => void;
}

export const useAuthenticationGuard = (options: UseAuthenticationGuardOptions = {}) => {
  const {
    enableAutoRedirect = true,
    redirectPath = '/session-expired',
    validationInterval = 0, // Disabled - no periodic validation
    enableStorageValidation = true,
    enableTokenValidation = true,
    onProblemDetected
  } = options;

  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    error, 
    getAccessTokenSilently,
    getIdTokenClaims 
  } = useAuth0();

  const navigate = useNavigate();
  const intervalRef = useRef<number | null>(null);
  const lastValidationRef = useRef<number>(0);

  const [state, setState] = useState<AuthGuardState>({
    isValidating: false,
    problem: null,
    isAuthenticated: false,
    canProceed: false,
    lastCheck: 0
  });

  // Console logging helper — only active in development
  const log = useCallback((_message: string, _data?: any) => {
    // logs disabled in production
  }, []);

  // Analyze authentication problems
  const analyzeAuthenticationState = useCallback(async (): Promise<AuthenticationProblem | null> => {
    log('Starting comprehensive authentication analysis...');

    // 1. Check for Auth0 errors first
    if (error) {
      log('❌ Auth0 error detected', error.message);
      return 'auth_error';
    }

    // 2. Check basic authentication state (if not loading)
    if (!isLoading && !isAuthenticated) {
      log('❌ User not authenticated (after loading)');
      return 'not_authenticated';
    }

    // 3. Check user data availability
    if (!isLoading && isAuthenticated && !user) {
      log('❌ Authenticated but no user data available');
      return 'missing_user';
    }

    // 4. Check for corrupt session (authenticated but missing essential user info)
    if (!isLoading && isAuthenticated && user && (!user.sub || !user.email)) {
      log('❌ Session appears corrupt - missing essential user data');
      return 'session_corrupt';
    }

    // 5. Token validation (if enabled and not loading)
    if (enableTokenValidation && !isLoading && isAuthenticated) {
      try {
        log('🔍 Validating tokens...');
        
        // Try to get access token silently (use cache to avoid failures with 3rd-party cookie restrictions)
        const accessToken = await getAccessTokenSilently({
          timeoutInSeconds: 10,
        });

        if (!accessToken || accessToken.trim() === '') {
          log('❌ Invalid or empty access token');
          return 'invalid_token';
        }

        // Try to get ID token claims
        const idTokenClaims = await getIdTokenClaims();
        if (!idTokenClaims || !idTokenClaims.sub) {
          log('❌ Invalid or missing ID token claims');
          return 'invalid_token';
        }

        log('✅ Token validation passed');
      } catch (tokenError) {
        log('❌ Token validation failed', tokenError);
        return 'invalid_token';
      }
    }

    // 6. Storage consistency validation (if enabled)
    if (enableStorageValidation && !isLoading && isAuthenticated) {
      try {
        log('🔍 Validating storage consistency...');
        
        // Check for Auth0 data in localStorage
        const auth0StorageKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('@@auth0spajs@@') || key.includes('auth0')
        );

        if (auth0StorageKeys.length === 0) {
          log('❌ Auth0 storage data missing from localStorage');
          return 'storage_inconsistent';
        }

        // Check if user data in storage matches current user
        const userStorageKey = auth0StorageKeys.find(key => key.includes('user'));
        if (userStorageKey) {
          try {
            const storedUserData = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
            if (storedUserData.sub && user?.sub && storedUserData.sub !== user.sub) {
              log('❌ Storage user data inconsistent with current user');
              return 'storage_inconsistent';
            }
          } catch (parseError) {
            log('❌ Error parsing stored user data', parseError);
            return 'storage_inconsistent';
          }
        }

        log('✅ Storage consistency validation passed');
      } catch (storageError) {
        log('❌ Storage validation failed', storageError);
        return 'storage_inconsistent';
      }
    }

    log('✅ All authentication validations passed');
    return null;
  }, [
    isLoading, 
    isAuthenticated, 
    user, 
    error, 
    enableTokenValidation, 
    enableStorageValidation, 
    getAccessTokenSilently, 
    getIdTokenClaims,
    log
  ]);

  // Perform validation
  const validateAuthentication = useCallback(async () => {
    const now = Date.now();
    
    // Prevent too frequent validations (min 5 seconds apart)
    if (now - lastValidationRef.current < 5000) {
      return state.problem;
    }

    setState(prev => ({ ...prev, isValidating: true }));
    lastValidationRef.current = now;

    try {
      const problem = await analyzeAuthenticationState();
      
      setState(prev => ({
        ...prev,
        isValidating: false,
        problem,
        isAuthenticated: !problem && isAuthenticated,
        canProceed: !problem && isAuthenticated && !isLoading,
        lastCheck: now
      }));

      // Trigger callback if problem detected
      if (problem && onProblemDetected) {
        onProblemDetected(problem);
      }

      // Auto-redirect if enabled and problem detected
      if (problem && enableAutoRedirect) {
        // Not authenticated = normal state, send to login
        // Real session problems = send to session-expired
        const target = problem === 'not_authenticated' ? '/login' : redirectPath;
        navigate(target, { 
          state: { 
            problem, 
            timestamp: now,
            returnTo: window.location.pathname 
          },
          replace: true
        });
      }

      return problem;
    } catch (validationError) {
      log('❌ Validation process failed', validationError);
      setState(prev => ({
        ...prev,
        isValidating: false,
        problem: 'auth_error',
        isAuthenticated: false,
        canProceed: false,
        lastCheck: now
      }));
      return 'auth_error';
    }
  }, [
    analyzeAuthenticationState, 
    isAuthenticated, 
    isLoading, 
    enableAutoRedirect, 
    redirectPath, 
    navigate, 
    onProblemDetected,
    log,
    state.problem
  ]);

  // Manual validation trigger
  const revalidate = useCallback(() => {
    log('🔄 Manual revalidation triggered');
    return validateAuthentication();
  }, [validateAuthentication, log]);

  // Setup periodic validation
  useEffect(() => {
    if (validationInterval > 0) {
      log(`⏰ Setting up periodic validation every ${validationInterval}ms`);
      
      intervalRef.current = setInterval(() => {
        if (!isLoading) {
          log('⏰ Periodic validation triggered');
          validateAuthentication();
        }
      }, validationInterval) as unknown as number;

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [validationInterval, validateAuthentication, isLoading, log]);

  // Initial validation when auth state changes
  useEffect(() => {
    if (!isLoading) {
      log('🔄 Auth state changed, triggering validation');
      validateAuthentication();
    }
  }, [isLoading, isAuthenticated, user, error, validateAuthentication, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    isValidating: state.isValidating,
    problem: state.problem,
    isAuthenticated: state.isAuthenticated,
    canProceed: state.canProceed,
    lastCheck: state.lastCheck,
    
    // Methods
    revalidate,
    
    // Helpers
    hasAuthProblem: !!state.problem,
    isProblemCritical: state.problem && ['auth_error', 'session_corrupt', 'invalid_token'].includes(state.problem),
    shouldBlock: !state.canProceed && !isLoading,
    
    // Debug info
    debugInfo: import.meta.env?.DEV ? {
      auth0State: { isLoading, isAuthenticated, hasUser: !!user, hasError: !!error },
      validationConfig: { enableAutoRedirect, enableStorageValidation, enableTokenValidation },
      timings: { lastCheck: state.lastCheck, interval: validationInterval }
    } : undefined
  };
};

export default useAuthenticationGuard;