import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop:
 * Automatically resets the scroll position to the top of the viewport
 * whenever the route changes, preventing pages from loading pre-scrolled.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;

