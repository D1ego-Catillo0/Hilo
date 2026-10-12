import { Toaster } from 'sonner'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PageHeader } from './components/ui/PageHeader'
import { PendingSection } from './pages/PendingSection'

function NotFound() {
  return (
    <>
      <PageHeader title="Página no encontrada" description="La dirección que buscas no existe en Hilo." />
    </>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<PendingSection title="Inicio" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="pedidos" element={<PendingSection title="Pedidos" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="pedidos/nuevo" element={<PendingSection title="Nuevo pedido" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="pedidos/:id" element={<PendingSection title="Detalle del pedido" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="pedidos/:id/editar" element={<PendingSection title="Editar pedido" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="clientes" element={<PendingSection title="Clientes" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="clientes/:id" element={<PendingSection title="Ficha del cliente" stage="la Etapa 3 (funciones principales)" />} />
          <Route path="calendario" element={<PendingSection title="Calendario" stage="la Etapa 4 (funciones complementarias)" />} />
          <Route path="reportes" element={<PendingSection title="Reportes" stage="la Etapa 4 (funciones complementarias)" />} />
          <Route path="configuracion" element={<PendingSection title="Configuración" stage="la Etapa 4 (funciones complementarias)" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors closeButton />
    </>
  )
}
