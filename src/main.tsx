import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { I18nProvider } from '@/i18n/I18nProvider'
import { Router } from '@/app/Router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <Router />
        <Analytics />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
