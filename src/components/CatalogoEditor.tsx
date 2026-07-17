import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Boton, Input, Spinner, Modal } from './ui'

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
  const [editando, setEditando] = useState<Fila | null>(null)
  const [eliminando, setEliminando] = useState<Fila | null>(null)

  async function cargar() {
    const cols = ['id', 'nombre', 'activo', tieneOrden ? 'orden' : null, campoExtra?.key].filter(Boolean).join(',')
    const { data } = await supabase.from(tabla).select(cols).order('nombre')
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

  async function guardarEdicion() {
    if (!editando || !editando.nombre.trim()) return
    setGuardando(true)
    try {
      const payload: Record<string, unknown> = { nombre: editando.nombre.trim() }
      if (campoExtra) payload[campoExtra.key] = editando[campoExtra.key] || null
      await supabase.from(tabla).update(payload).eq('id', editando.id)
      setFilas((prev) => prev!.map((f) => (f.id === editando.id ? { ...f, ...payload } as Fila : f)))
      setEditando(null)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!eliminando) return
    setGuardando(true)
    try {
      await supabase.from(tabla).delete().eq('id', eliminando.id)
      setFilas((prev) => prev!.filter((f) => f.id !== eliminando.id))
      setEliminando(null)
    } finally {
      setGuardando(false)
    }
  }

  const activos = filas?.filter((f) => f.activo).length ?? null

  return (
    <div className="neu-card rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-[#0D2D6B]">{label}</span>
        {activos != null && (
          <span className="text-sm text-slate-500">{activos} activo{activos !== 1 ? 's' : ''}{filas && filas.length !== activos ? ` de ${filas.length}` : ''}</span>
        )}
      </div>
      {!filas ? <Spinner /> : (
        <>
          <div className="neu-inset max-h-80 overflow-auto rounded-lg">
            {filas.map((f) => (
              <div key={f.id} className="flex items-center gap-2 border-b border-black/5 px-3 py-2 text-sm last:border-0">
                <span className={`flex-1 ${!f.activo ? 'text-slate-400 line-through' : ''}`}>{f.nombre}</span>
                {campoExtra && f[campoExtra.key] && <span className="text-xs text-slate-400">{f[campoExtra.key]}</span>}
                <button onClick={() => alternarActivo(f)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {f.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => setEditando(f)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#16468E] hover:bg-[#EAF0FA]">Editar</button>
                <button onClick={() => setEliminando(f)} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Eliminar</button>
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

      <Modal open={!!editando} onClose={() => setEditando(null)} titulo={`Editar ${label.toLowerCase()}`}>
        {editando && (
          <div className="space-y-3">
            <Input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} placeholder="Nombre" />
            {campoExtra && (
              <Input value={editando[campoExtra.key] ?? ''} onChange={(e) => setEditando({ ...editando, [campoExtra.key]: e.target.value })} placeholder={campoExtra.label} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Boton variante="secundario" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Boton>
              <Boton onClick={guardarEdicion} disabled={guardando || !editando.nombre.trim()}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!eliminando} onClose={() => setEliminando(null)} titulo="Eliminar registro">
        <p className="text-sm text-slate-600">¿Está seguro de eliminar "{eliminando?.nombre}"? Esta acción no se puede deshacer.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setEliminando(null)} disabled={guardando}>Cancelar</Boton>
          <Boton variante="peligro" onClick={eliminar} disabled={guardando}>{guardando ? 'Eliminando…' : 'Eliminar'}</Boton>
        </div>
      </Modal>
    </div>
  )
}
