import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth, tieneAcceso, Seccion } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import { Spinner } from './components/ui'

import RegistrarPqrsf from './pages/reporte/RegistrarPqrsf'
import ResponderPqrsf from './pages/respuesta/ResponderPqrsf'
import GestionPqrsf from './pages/consola/GestionPqrsf'
import GestionSatisfaccion from './pages/consola/GestionSatisfaccion'
import Dashboard from './pages/analisis/Dashboard'
import Reportes from './pages/analisis/Reportes'
import MapaCalorPqrsf from './pages/analisis/MapaCalorPqrsf'
import MapaCalorSatisfaccion from './pages/analisis/MapaCalorSatisfaccion'
import Usuarios from './pages/admin/Usuarios'
import TablasMaestrasResumen from './pages/admin/TablasMaestrasResumen'
import ColoresMapaCalor from './pages/admin/ColoresMapaCalor'
import Encuesta from './pages/public/Encuesta'

function AreaProtegida() {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner texto="Verificando sesión…" /></div>
  if (!session) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

function RequiereSeccion({ seccion, children }: { seccion: Seccion; children: React.ReactNode }) {
  const { perfil, loading } = useAuth()
  if (loading) return <Spinner texto="Cargando…" />
  if (!tieneAcceso(perfil, seccion)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        No tiene permisos para acceder a esta sección. Si cree que es un error, contacte al administrador.
      </div>
    )
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/encuesta" element={<Encuesta />} />

      <Route element={<AreaProtegida />}>
        <Route index element={<Navigate to="/reporte/registrar" replace />} />

        <Route path="/reporte/registrar" element={
          <RequiereSeccion seccion="reporte"><RegistrarPqrsf /></RequiereSeccion>
        } />

        <Route path="/respuesta/responder" element={
          <RequiereSeccion seccion="respuesta"><ResponderPqrsf /></RequiereSeccion>
        } />

        <Route path="/consola/pqrsf" element={
          <RequiereSeccion seccion="consola_pqrsf"><GestionPqrsf /></RequiereSeccion>
        } />
        <Route path="/consola/satisfaccion" element={
          <RequiereSeccion seccion="consola_satisfaccion"><GestionSatisfaccion /></RequiereSeccion>
        } />

        <Route path="/analisis/dashboard" element={
          <RequiereSeccion seccion="analisis_pqrsf"><Dashboard /></RequiereSeccion>
        } />
        <Route path="/analisis/reportes" element={
          <RequiereSeccion seccion="analisis_pqrsf"><Reportes /></RequiereSeccion>
        } />
        <Route path="/analisis/mapa-calor-pqrsf" element={
          <RequiereSeccion seccion="analisis_pqrsf"><MapaCalorPqrsf /></RequiereSeccion>
        } />
        <Route path="/analisis/mapa-calor-satisfaccion" element={
          <RequiereSeccion seccion="analisis_satisfaccion"><MapaCalorSatisfaccion /></RequiereSeccion>
        } />

        <Route path="/admin/usuarios" element={
          <RequiereSeccion seccion="administrador"><Usuarios /></RequiereSeccion>
        } />
        <Route path="/admin/tablas-maestras/resumen" element={
          <RequiereSeccion seccion="administrador"><TablasMaestrasResumen /></RequiereSeccion>
        } />
        <Route path="/admin/tablas-maestras/colores-mapa-calor" element={
          <RequiereSeccion seccion="administrador"><ColoresMapaCalor /></RequiereSeccion>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
