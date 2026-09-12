import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Sparkles } from 'lucide-react';

/**
 * GoogleSignInButton
 * Integrates Google Identity Services (GIS) OAuth 2.0 with AthleteGuard.
 * Supports:
 * - Live Google GIS one-tap / standard sign-in when Google Client ID is configured.
 * - Graceful developer sandbox sign-in when running offline or before Client ID is provided.
 */
export const GoogleSignInButton = ({
  role = 'ATHLETE',
  isRegistering = false,
  onSuccess,
  onError,
  className = ''
}) => {
  const { loginWithGoogle } = useAuth();
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [isConfigured, setIsConfigured] = useState(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));
  const [isLoading, setIsLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const buttonContainerRef = useRef(null);

  // 1. Fetch Google OAuth config from backend if not in frontend env
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const config = await api.get('/api/auth/google/config');
        if (isMounted && config?.client_id) {
          setClientId(config.client_id);
          setIsConfigured(Boolean(config.is_configured));
        }
      } catch (err) {
        console.warn('[GOOGLE_AUTH] Could not fetch remote Google config:', err);
      }
    };

    if (!clientId) {
      loadConfig();
    } else {
      setIsConfigured(true);
    }

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // 2. Load Google Identity Services (GIS) script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const scriptId = 'google-gsi-client';
    const existingScript = document.getElementById(scriptId);
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGisLoaded(true);
      script.onerror = () => {
        console.warn('[GOOGLE_AUTH] Failed to load Google Identity Services script.');
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setGisLoaded(true));
    }
  }, []);

  // 3. Handle credential from Google GIS callback
  const handleCredentialResponse = async (response) => {
    if (!response?.credential) {
      if (onError) onError('Google login failed: no credential received.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithGoogle(response.credential, role);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('[GOOGLE_AUTH] Login error:', err);
      if (onError) onError(err.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Initialize and render official Google button when GIS is ready & configured
  useEffect(() => {
    if (gisLoaded && isConfigured && clientId && buttonContainerRef.current && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: isRegistering ? 'signup_with' : 'continue_with',
          width: 340,
          logo_alignment: 'left'
        });
      } catch (err) {
        console.warn('[GOOGLE_AUTH] Error rendering Google button:', err);
      }
    }
  }, [gisLoaded, isConfigured, clientId, isRegistering]);

  // 5. Fallback sandbox click (when no Google Client ID is configured yet)
  const handleSandboxClick = async () => {
    setIsLoading(true);
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const testEmail = `athlete.google${randomSuffix}@athleteguard.ai`;
      const testName = `Alex Vance (${randomSuffix})`;
      const testSub = `google_sub_sandbox_${randomSuffix}`;
      const mockToken = `mock_google_token_:${testEmail}:${testName}:${testSub}`;

      await loginWithGoogle(mockToken, role);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('[GOOGLE_AUTH] Sandbox login error:', err);
      if (onError) onError(err.message || 'Sandbox authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* If Google Client ID is configured and GIS is available, show rendered Google container */}
      {isConfigured && clientId ? (
        <div className="w-full flex justify-center min-h-[44px]">
          <div ref={buttonContainerRef} className="w-full max-w-[340px] flex justify-center" />
        </div>
      ) : (
        /* Styled Cyber-Athletic fallback button */
        <button
          type="button"
          onClick={handleSandboxClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all shadow-md group cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>

              <span>
                {isRegistering ? 'Sign up with Google' : 'Continue with Google'}
              </span>

              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/60">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                OAuth 2.0
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
