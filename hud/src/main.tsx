import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import SandboxApp from './sandbox/App.tsx'
import MonitorApp from './monitor/App.tsx'
import './sandbox/App.css'
import './monitor/App.css'

function Root() {
  // Combine pathname and hash to support direct URL entries (e.g. /sandbox) and SPA hash redirects (e.g. /#/sandbox)
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

  // If path or hash contains 'sandbox', render the offline Sandbox. Else, render the Live Monitor.
  if (route.toLowerCase().includes('sandbox')) {
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
