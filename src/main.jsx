import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import './index.css'

function Root() {
  const [splashDone, setSplashDone] = useState(false)
  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <div style={{
        opacity: splashDone ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: splashDone ? 'auto' : 'none',
      }}>
        <App />
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
