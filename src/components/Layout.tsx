import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth, tieneAcceso, Seccion } from '../lib/auth'

const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

type Item = { to: string; label: string; icono: string; seccion: Seccion }
type Grupo = { titulo: string; items: Item[] }

const GRUPOS: Grupo[] = [
  { titulo: 'Reporte', items: [
    { to: '/reporte/registrar', label: 'Registrar PQRSF', icono: '📝', seccion: 'reporte' },
  ] },
  { titulo: 'Respuesta', items: [
    { to: '/respuesta/responder', label: 'Responder PQRSF', icono: '✉️', seccion: 'respuesta' },
  ] },
  { titulo: 'Consola', items: [
    { to: '/consola/pqrsf', label: 'Gestión PQRSF', icono: '✅', seccion: 'consola_pqrsf' },
    { to: '/consola/satisfaccion', label: 'Gestión Satisfacción', icono: '🙂', seccion: 'consola_satisfaccion' },
  ] },
  { titulo: 'Análisis', items: [
    { to: '/analisis/dashboard', label: 'Dashboard', icono: '📊', seccion: 'analisis_pqrsf' },
    { to: '/analisis/panel-ejecutivo', label: 'Panel Ejecutivo', icono: '🧭', seccion: 'analisis_pqrsf' },
    { to: '/analisis/reportes', label: 'Reportes', icono: '📑', seccion: 'analisis_pqrsf' },
    { to: '/analisis/mapa-calor-pqrsf', label: 'Mapa de Calor PQRSF', icono: '🔥', seccion: 'analisis_pqrsf' },
    { to: '/analisis/mapa-calor-satisfaccion', label: 'Mapa de Calor Satisfacción', icono: '🔥', seccion: 'analisis_satisfaccion' },
  ] },
  { titulo: 'Administrador', items: [
    { to: '/admin/usuarios', label: 'Usuarios', icono: '👤', seccion: 'administrador' },
    { to: '/admin/tablas-maestras/resumen', label: 'Resumen', icono: '🗂️', seccion: 'administrador' },
    { to: '/admin/tablas-maestras/colores-mapa-calor', label: 'Colores mapa de calor', icono: '🎨', seccion: 'administrador' },
  ] },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { perfil, salir } = useAuth()
  const nav = useNavigate()
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({})

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/80 hover:bg-white/10'
    }`

  const gruposVisibles = GRUPOS
    .map((g) => ({ ...g, items: g.items.filter((i) => tieneAcceso(perfil, i.seccion)) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-[#0D2D6B] to-[#16468E] p-4 text-white">
        <div className="mb-6 flex flex-col items-center gap-1 border-b border-white/15 pb-4">
          <img src={LOGO_BLANCO} alt="CAC" className="h-12 object-contain" />
          <span className="text-sm font-bold">SIAU</span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">
            Sistema de Información y Atención al Usuario
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {gruposVisibles.map((g) => (
            <div key={g.titulo} className="mb-1">
              <button
                onClick={() => setColapsados((p) => ({ ...p, [g.titulo]: !p[g.titulo] }))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/60 hover:bg-white/10"
              >
                {g.titulo} <span>{colapsados[g.titulo] ? '▸' : '▾'}</span>
              </button>
              {!colapsados[g.titulo] && g.items.map((i) => (
                <NavLink key={i.to} to={i.to} className={linkCls}>
                  <span>{i.icono}</span>{i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4
                           bg-gradient-to-r from-[#0D2D6B] to-[#16468E] px-6 py-3 text-white shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏥</span>
            <span className="font-semibold">SIAU · CAC Santa Bárbara</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {iniciales(perfil?.nombre)}
            </div>
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium">{perfil?.nombre}</div>
              <div className="text-xs capitalize text-white/70">{perfil?.rol}</div>
            </div>
            <button onClick={async () => { await salir(); nav('/login') }}
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-[#E3E6EC] p-6">{children}</main>
      </div>
    </div>
  )
}

function iniciales(nombre?: string) {
  if (!nombre) return '·'
  const p = nombre.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '·'
}
