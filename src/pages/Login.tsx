import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Boton, Input } from '../components/ui'

type Modo = 'ingresar' | 'recuperar'
const LOGO = `${import.meta.env.BASE_URL}images/logo_cacsb2.png`
const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

export default function Login() {
  const { session, loading } = useAuth()
  const nav = useNavigate()
  const [modo, setModo] = useState<Modo>('ingresar')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verPass, setVerPass] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setMsg(''); setCargando(true)
    try {
      if (modo === 'ingresar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw new Error('Credenciales inválidas o usuario no confirmado.')
        nav('/', { replace: true })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/restablecer`,
        })
        if (error) throw error
        setMsg('Le enviamos un correo con el enlace para restablecer su contraseña.')
      }
    } catch (e: any) {
      setErr(e.message ?? 'Ocurrió un error.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0D2D6B] to-[#16468E] p-4">
      <div className="neu-card w-full max-w-md overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-r from-[#0D2D6B] to-[#16468E] px-8 py-6 text-white">
          <img src={LOGO_BLANCO} alt="CAC Santa Bárbara" className="h-14 object-contain" />
          <h1 className="text-lg font-bold">SIAU</h1>
          <p className="text-xs opacity-80">Sistema de Información y Atención al Usuario</p>
        </div>
        <form onSubmit={enviar} className="flex flex-col gap-3 px-8 py-6">
          <img src={LOGO} alt="" className="mx-auto mb-1 h-10 object-contain" />
          <h2 className="text-center text-sm font-semibold text-slate-600">
            {modo === 'ingresar' ? 'Ingrese a su cuenta' : 'Recuperar contraseña'}
          </h2>

          <Input type="email" placeholder="correo@cacsantabarbara.co" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          {modo === 'ingresar' && (
            <div className="relative">
              <Input type={verPass ? 'text' : 'password'} placeholder="Contraseña" value={pass}
                onChange={(e) => setPass(e.target.value)} required minLength={6} className="w-full pr-10"
                autoComplete="current-password" />
              <button type="button" onClick={() => setVerPass((v) => !v)}
                aria-label={verPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-[#16468E]">
                {verPass ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {err && <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          {msg && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}

          <Boton type="submit" disabled={cargando} className="justify-center">
            {cargando ? 'Procesando…' : modo === 'ingresar' ? 'Ingresar' : 'Enviar enlace'}
          </Boton>

          <div className="mt-1 flex flex-col items-center gap-1 text-xs text-[#16468E]">
            {modo === 'ingresar' ? (
              <button type="button" onClick={() => { setModo('recuperar'); setErr(''); setMsg('') }} className="hover:underline">
                ¿Olvidó su contraseña?
              </button>
            ) : (
              <button type="button" onClick={() => { setModo('ingresar'); setErr(''); setMsg('') }} className="hover:underline">
                ← Volver a ingresar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
