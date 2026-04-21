import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthenticationGuard, AuthenticationProblem } from '../../hooks/useAuthenticationGuard';
import { Shield, AlertTriangle } from 'lucide-react';

interface AuthenticationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  enableAutoRedirect?: boolean;
  validationInterval?: number;
  enableStorageValidation?: boolean;
  enableTokenValidation?: boolean;
  onProblemDetected?: (problem: AuthenticationProblem) => void;
  showLoadingIndicator?: boolean;
  loadingComponent?: React.ReactNode;
}

interface LoadingIndicatorProps {
  message?: string;
  subMessage?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Validating authentication...",
  subMessage = "Please wait while we verify your session"
}) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
          <Shield className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {message}
        </h2>
        <p className="text-gray-600 text-sm">
          {subMessage}
        </p>
      </div>
    </div>
  </div>
);

interface BlockedIndicatorProps {
  problem: AuthenticationProblem;
  onRetry?: () => void;
}

const BlockedIndicator: React.FC<BlockedIndicatorProps> = ({ problem, onRetry }) => {
  const getProblemDetails = (problem: AuthenticationProblem) => {
    switch (problem) {
      case 'not_authenticated':
        return {
          title: 'Authentication Required',
          message: 'You need to log in to access this content.',
          severity: 'warning'
        };
      case 'missing_user':
        return {
          title: 'User Data Missing',
          message: 'Unable to load your user information.',
          severity: 'error'
        };
      case 'auth_error':
        return {
          title: 'Authentication Error',
          message: 'An error occurred during authentication.',
          severity: 'error'
        };
      case 'session_corrupt':
        return {
          title: 'Session Corrupted',
          message: 'Your session appears to be corrupted.',
          severity: 'error'
        };
      case 'invalid_token':
        return {
          title: 'Invalid Token',
          message: 'Your authentication token is invalid or expired.',
          severity: 'error'
        };
      case 'storage_inconsistent':
        return {
          title: 'Storage Issue',
          message: 'There\'s an inconsistency in your stored session data.',
          severity: 'warning'
        };
      default:
        return {
          title: 'Authentication Issue',
          message: 'There\'s an issue with your authentication.',
          severity: 'warning'
        };
    }
  };

  const details = getProblemDetails(problem);
  const isError = details.severity === 'error';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${isError ? 'from-red-50 to-orange-50' : 'from-yellow-50 to-orange-50'} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${isError ? 'bg-red-100' : 'bg-yellow-100'} mb-4`}>
            <AlertTriangle className={`h-8 w-8 ${isError ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {details.title}
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            {details.message}
          </p>
          
          {onRetry && (
            <div className="space-y-3">
              <button
                onClick={onRetry}
                className={`w-full px-4 py-2 rounded-lg font-medium ${
                  isError 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                } transition-colors`}
              >
                Retry Authentication
              </button>
              <p className="text-xs text-gray-500">
                This will redirect you to resolve the authentication issue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AuthenticationGuard: React.FC<AuthenticationGuardProps> = ({
  children,
  fallback,
  redirectTo = '/session-expired',
  enableAutoRedirect = true,
  validationInterval = 0, // Disabled by default
  enableStorageValidation = true,
  enableTokenValidation = true,
  onProblemDetected,
  showLoadingIndicator = true,
  loadingComponent
}) => {
  const { isLoading } = useAuth0();
  const location = useLocation();

  const {
    isValidating,
    problem,
    canProceed,
    shouldBlock,
    debugInfo
  } = useAuthenticationGuard({
    enableAutoRedirect,
    redirectPath: redirectTo,
    validationInterval,
    enableStorageValidation,
    enableTokenValidation,
    onProblemDetected: (detectedProblem: AuthenticationProblem) => {
      onProblemDetected?.(detectedProblem);
    }
  });

  // Debug logging in development
  if (import.meta.env?.DEV && debugInfo) {
    console.log('🛡️ AuthenticationGuard Debug:', debugInfo);
  }

  // Show loading indicator during initial Auth0 loading or validation
  if ((isLoading || isValidating) && showLoadingIndicator) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    const loadingMessage = isLoading ? 
      "Loading authentication..." : 
      "Validating session...";
    
    const loadingSubMessage = isLoading ?
      "Initializing your session" :
      "Performing security checks";

    return (
      <LoadingIndicator 
        message={loadingMessage}
        subMessage={loadingSubMessage}
      />
    );
  }

  // If auto-redirect is disabled and we have a problem, show fallback or blocked indicator
  if (!enableAutoRedirect && problem && shouldBlock) {
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <BlockedIndicator 
        problem={problem}
        onRetry={() => {
          console.log('🔄 AuthenticationGuard: User requested retry');
          // Navigate to session expired page to handle the problem
          window.location.href = redirectTo;
        }}
      />
    );
  }

  // If auto-redirect is enabled and we have a problem, redirect
  if (enableAutoRedirect && problem && shouldBlock) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ 
          problem, 
          returnTo: location.pathname,
          timestamp: Date.now()
        }}
        replace 
      />
    );
  }

  // If we can proceed, render children
  if (canProceed) {
    return <>{children}</>;
  }

  // Fallback: show loading if nothing else matches
  console.log('⏳ AuthenticationGuard: Waiting for authentication state to resolve...');
  return showLoadingIndicator ? (
    loadingComponent ? <>{loadingComponent}</> : <LoadingIndicator />
  ) : null;
};

export default AuthenticationGuard;