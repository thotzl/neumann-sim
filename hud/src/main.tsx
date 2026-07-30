import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import SandboxApp from './sandbox/App.tsx'
import MonitorApp from './monitor/App.tsx'
import './sandbox/App.css'
import './monitor/App.css'

function Root() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Simple routing: if hash contains 'sandbox', show the Sandbox, else show the Monitor
  if (route.includes('sandbox')) {
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
