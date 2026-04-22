import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AppProvider } from './components/VCC/AppContext'
import { bootstrapAuthFromUrl } from './bootstrapAuth'

const bootstrappedAuth = bootstrapAuthFromUrl(window.location.href, window.localStorage)

if (bootstrappedAuth.didBootstrap) {
  window.sessionStorage.setItem('recent_oauth_login', '1')
}

if (bootstrappedAuth.cleanedUrl !== window.location.href) {
  window.history.replaceState({}, document.title, bootstrappedAuth.cleanedUrl)
}

// Trigger HMR full reload for dark mode root sync
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
)
