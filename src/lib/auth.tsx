import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

export type Rol = 'admin' | 'analista' | 'gestor'
export type Modulo = 'respuesta' | 'satisfaccion'

export type Perfil = {
  id: string
  email: string
  nombre: string
  rol: Rol
  modulos: Modulo[]
  proceso: string | null
  activo: boolean
}

// Claves de acceso usadas por el menú y las rutas protegidas.
export type Seccion =
  | 'reporte'
  | 'respuesta'
  | 'consola_pqrsf'
  | 'consola_satisfaccion'
  | 'analisis_pqrsf'
  | 'analisis_satisfaccion'
  | 'administrador'

export function tieneAcceso(perfil: Perfil | null, seccion: Seccion): boolean {
  if (!perfil || !perfil.activo) return false
  if (perfil.rol === 'admin') return true
  // Gestor: acceso a todos los módulos excepto Administrador (Usuarios, Resumen, Colores mapa de calor).
  if (perfil.rol === 'gestor') return seccion !== 'administrador'
  switch (seccion) {
    case 'reporte':
    case 'consola_pqrsf':
    case 'analisis_pqrsf':
      return true
    case 'respuesta':
      return perfil.modulos.includes('respuesta')
    case 'consola_satisfaccion':
    case 'analisis_satisfaccion':
      return perfil.modulos.includes('satisfaccion')
    case 'administrador':
      return false
  }
}

type Ctx = {
  session: Session | null
  perfil: Perfil | null
  loading: boolean
  refrescarPerfil: () => Promise<void>
  salir: () => Promise<void>
}
const AuthCtx = createContext<Ctx>({
  session: null, perfil: null, loading: true,
  refrescarPerfil: async () => {}, salir: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(uid: string) {
    const { data } = await supabase.from('consola_perfiles').select('*').eq('id', uid).single()
    if (data) setPerfil({ ...data, modulos: data.modulos ?? [] } as Perfil)
  }

  useEffect(() => {
    // El loading se resuelve con .finally() aunque la carga del perfil falle,
    // para no quedar colgados en "Cargando" (gotcha conocido de otras apps CAC).
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session)
        if (data.session) void cargarPerfil(data.session.user.id)
      })
      .finally(() => setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) void cargarPerfil(s.user.id)
      else setPerfil(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const refrescarPerfil = async () => {
    if (session) await cargarPerfil(session.user.id)
  }
  const salir = async () => { await supabase.auth.signOut(); setPerfil(null) }

  return (
    <AuthCtx.Provider value={{ session, perfil, loading, refrescarPerfil, salir }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
