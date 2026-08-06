import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import SandboxApp from './sandbox/App.tsx'
import MonitorApp from './monitor/App.tsx'
import PixiJSTestApp from './shared/components/PixiJSTestApp.tsx'
import ThreeJSTestApp from './shared/components/ThreeJSTestApp.tsx'
import './index.css'
import './sandbox/App.css'

function Root() {
  // Combine pathname and hash to support direct URL entries and SPA hash redirects
  const [route, setRoute] = useState(window.location.pathname + window.location.hash);

  useEffect(() => {
    const handleNavigation = () => {
      setRoute(window.location.pathname + window.location.hash);
    };
    
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Speculative routing branches for comparison testing
  const normalizedRoute = route.toLowerCase();

  if (normalizedRoute.includes('gpu-test-pixijs')) {
    return <PixiJSTestApp />;
  } else if (normalizedRoute.includes('gpu-test-threejs') || normalizedRoute.includes('gpu-test-r3f')) {
    return <ThreeJSTestApp />;
  } else if (normalizedRoute.includes('sandbox')) {
    return <SandboxApp />;
  } else {
    return <MonitorApp />;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
