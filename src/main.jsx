import { createRoot } from 'react-dom/client'
import './index.css'
import './services/csrf.js'
import App from './App.jsx'
import { MenuProvider } from './MenuContext.jsx'
import { ThemeProvider } from './ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <MenuProvider>
      <App />
    </MenuProvider>,
  </ThemeProvider>,
)
