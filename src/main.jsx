import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './services/csrf.js'
import App from './App.jsx'
import { MenuProvider } from './MenuContext.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import MaterialThemeProvider from './theme/MaterialThemeProvider.jsx'

createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <ThemeProvider>
      <MaterialThemeProvider>
        <MenuProvider>
          <App />
        </MenuProvider>
      </MaterialThemeProvider>
    </ThemeProvider>
  </HelmetProvider>,
)
