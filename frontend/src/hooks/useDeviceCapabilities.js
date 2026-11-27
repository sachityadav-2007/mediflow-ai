import { useState, useEffect } from 'react';

/**
 * Custom Hook: useDeviceCapabilities
 * Detects client hardware and browser support for WebGL, WebXR, AR, and VR.
 */
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    checked: false,
    supportsWebGL: false,
    supportsWebXR: false,
    supportsAR: false,
    supportsVR: false,
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    supportsQuickLook: false,
    supportsSceneViewer: false,
    arMessage: 'Checking AR capability...',
    vrMessage: 'Checking VR capability...',
    fallbackMode: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkCapabilities() {
      // 1. Device and OS detection
      const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      const isAndroid = /android/i.test(userAgent);
      const isMobile = isIOS || isAndroid || /Mobi|Tablet|Touch/i.test(userAgent);

      // 2. WebGL check
      let supportsWebGL = false;
      try {
        const canvas = document.createElement('canvas');
        supportsWebGL = !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch {
        supportsWebGL = false;
      }

      // 3. WebXR check
      let supportsWebXR = false;
      let supportsAR = false;
      let supportsVR = false;

      if (navigator.xr) {
        supportsWebXR = true;
        try {
          if (navigator.xr.isSessionSupported) {
            supportsAR = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
            supportsVR = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
          }
        } catch {
          // Hardware/permission rejection
        }
      }

      // 4. Quick Look (iOS USDZ) and Scene Viewer (Android)
      // Google <model-viewer> handles this directly when on mobile
      const supportsQuickLook = isIOS;
      const supportsSceneViewer = isAndroid;

      // Effective AR support (either WebXR or native mobile viewers)
      const hasEffectiveAR = supportsAR || isMobile;

      // Messages per requirements
      const arMessage = hasEffectiveAR
        ? 'Your device supports this AR experience.'
        : 'Your device does not support this immersive mode. You can still explore the 3D experience.';

      const vrMessage = supportsVR
        ? 'Your browser supports WebXR VR.'
        : 'Your device does not support this immersive mode. You can still explore the 3D experience.';

      if (isMounted) {
        setCapabilities({
          checked: true,
          supportsWebGL,
          supportsWebXR,
          supportsAR: hasEffectiveAR,
          supportsVR,
          isMobile,
          isIOS,
          isAndroid,
          supportsQuickLook,
          supportsSceneViewer,
          arMessage,
          vrMessage,
          fallbackMode: !supportsAR && !supportsVR,
        });
      }
    }

    checkCapabilities();

    return () => {
      isMounted = false;
    };
  }, []);

  return capabilities;
}

export default useDeviceCapabilities;
