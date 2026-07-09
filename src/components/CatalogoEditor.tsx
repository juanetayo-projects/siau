import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Boton, Input, Spinner } from './ui'

type Fila = { id: number; nombre: string; activo: boolean; orden?: number; correo?: string | null; grupo?: string | null }

export default function CatalogoEditor({ tabla, label, campoExtra, tieneOrden = true }: {
  tabla: string; label: string
  campoExtra?: { key: 'correo' | 'grupo'; label: string }
  tieneOrden?: boolean
}) {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoExtra, setNuevoExtra] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const cols = ['id', 'nombre', 'activo', tieneOrden ? 'orden' : null, campoExtra?.key].filter(Boolean).join(',')
    const q = supabase.from(tabla).select(cols)
    const { data } = tieneOrden ? await q.order('orden') : await q.order('nombre')
    setFilas((data ?? []) as unknown as Fila[])
  }
  useEffect(() => { setFilas(null); void cargar() }, [tabla])

  async function agregar() {
    if (!nuevoNombre.trim()) return
    setGuardando(true)
    try {
      const payload: Record<string, unknown> = { nombre: nuevoNombre.trim(), activo: true }
      if (campoExtra) payload[campoExtra.key] = nuevoExtra.trim() || null
      if (tieneOrden) payload.orden = (filas?.length ?? 0) + 1
      await supabase.from(tabla).insert(payload)
      setNuevoNombre(''); setNuevoExtra('')
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  async function alternarActivo(fila: Fila) {
    await supabase.from(tabla).update({ activo: !fila.activo }).eq('id', fila.id)
    setFilas((prev) => prev!.map((f) => (f.id === fila.id ? { ...f, activo: !f.activo } : f)))
  }

  const activos = filas?.filter((f) => f.activo).length ?? null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-[#0D2D6B]">{label}</span>
        {activos != null && (
          <span className="text-sm text-slate-500">{activos} activo{activos !== 1 ? 's' : ''}{filas && filas.length !== activos ? ` de ${filas.length}` : ''}</span>
        )}
      </div>
      {!filas ? <Spinner /> : (
        <>
          <div className="max-h-80 overflow-auto rounded-lg border border-slate-100">
            {filas.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border-b border-slate-50 px-3 py-2 text-sm last:border-0">
                <span className={`flex-1 ${!f.activo ? 'text-slate-400 line-through' : ''}`}>{f.nombre}</span>
                {campoExtra && f[campoExtra.key] && <span className="text-xs text-slate-400">{f[campoExtra.key]}</span>}
                <button onClick={() => alternarActivo(f)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {f.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
            ))}
            {filas.length === 0 && <div className="px-3 py-4 text-center text-sm text-slate-400">Sin registros.</div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input placeholder={`Nuevo ${label.toLowerCase()}…`} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="flex-1" />
            {campoExtra && <Input placeholder={campoExtra.label} value={nuevoExtra} onChange={(e) => setNuevoExtra(e.target.value)} className="w-48" />}
            <Boton variante="secundario" onClick={agregar} disabled={guardando || !nuevoNombre.trim()}>+ Agregar</Boton>
          </div>
        </>
      )}
    </div>
  )
}
