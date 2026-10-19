import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingState } from './components/ui/EmptyState'
import { PageHeader } from './components/ui/PageHeader'
import { CopyrightPage, PrivacyPage, TermsPage } from './pages/LegalPage'
import { PendingSection } from './pages/PendingSection'

// Cada pantalla se descarga solo cuando se visita (carga más rápida al abrir la app).
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const OrderFormPage = lazy(() => import('./pages/OrderFormPage').then((m) => ({ default: m.OrderFormPage })))

function NotFound() {
  return <PageHeader title="Página no encontrada" description="La dirección que buscas no existe en Hilo." />
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="privacidad" element={<PrivacyPage />} />
          <Route path="terminos" element={<TermsPage />} />
          <Route path="derechos-de-autor" element={<CopyrightPage />} />
          <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="pedidos/nuevo" element={<OrderFormPage mode="create" />} />
            <Route path="pedidos/:id" element={<OrderDetailPage />} />
            <Route path="pedidos/:id/editar" element={<OrderFormPage mode="edit" />} />
            <Route path="clientes" element={<CustomersPage />} />
            <Route path="clientes/:id" element={<CustomerDetailPage />} />
            <Route path="calendario" element={<PendingSection title="Calendario" stage="la Etapa 4 (funciones complementarias)" />} />
            <Route path="reportes" element={<PendingSection title="Reportes" stage="la Etapa 4 (funciones complementarias)" />} />
            <Route path="configuracion" element={<PendingSection title="Configuración" stage="la Etapa 4 (funciones complementarias)" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  )
}
