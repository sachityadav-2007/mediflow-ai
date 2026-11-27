import { useState, useEffect, useCallback } from 'react';

/**
 * Custom Hook: useWebXR
 * Manages entering and exiting WebXR sessions with device session handlers.
 */
export function useWebXR() {
  const [xrSession, setXrSession] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [sessionType, setSessionType] = useState(null); // 'immersive-vr' | 'immersive-ar'
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (navigator.xr && navigator.xr.isSessionSupported) {
      Promise.all([
        navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
        navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
      ]).then(([vr, ar]) => {
        if (mounted) {
          setIsSupported(vr || ar);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const startSession = useCallback(async (mode = 'immersive-vr') => {
    setError(null);
    if (!navigator.xr) {
      setError('WebXR is not supported on this browser or platform.');
      return null;
    }

    try {
      const session = await navigator.xr.requestSession(mode, {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });

      session.addEventListener('end', () => {
        setXrSession(null);
        setSessionType(null);
      });

      setXrSession(session);
      setSessionType(mode);
      return session;
    } catch (err) {
      console.warn(`Could not start WebXR session (${mode}):`, err);
      setError(err.message || 'Failed to start WebXR session.');
      return null;
    }
  }, []);

  const endSession = useCallback(async () => {
    if (xrSession) {
      try {
        await xrSession.end();
      } catch (err) {
        console.warn('Error ending WebXR session:', err);
      } finally {
        setXrSession(null);
        setSessionType(null);
      }
    }
  }, [xrSession]);

  return {
    isSupported,
    isInSession: !!xrSession,
    isInVR: sessionType === 'immersive-vr',
    isInAR: sessionType === 'immersive-ar',
    session: xrSession,
    error,
    startSession,
    endSession,
  };
}

export default useWebXR;
