import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, FilterBar, Campo, Input, Select, Boton, Tabla, THead, TH, TR, TD, Modal, Spinner } from '../../components/ui'
import type { Modulo, Rol } from '../../lib/auth'

type Perfil = { id: string; nombre: string; email: string; rol: Rol; proceso: string | null; procesos: string[]; modulos: Modulo[]; activo: boolean; created_at: string }

const MODULOS_DISPONIBLES: { valor: Modulo; label: string }[] = [
  { valor: 'respuesta', label: 'Respuesta PQRSF' },
  { valor: 'satisfaccion', label: 'Satisfacción' },
]

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Perfil[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Perfil | null>(null)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listaProcesos, setListaProcesos] = useState<string[]>([])

  async function cargar() {
    const { data } = await supabase.from('consola_perfiles').select('*').order('nombre')
    setUsuarios((data ?? []).map((u: any) => ({
      ...u, modulos: u.modulos ?? [], procesos: u.procesos?.length ? u.procesos : (u.proceso ? [u.proceso] : []),
    })) as Perfil[])
  }
  useEffect(() => {
    void cargar()
    void supabase.from('lista_procesos').select('nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setListaProcesos((data ?? []).map((p: any) => p.nombre)))
  }, [])

  const filtrados = useMemo(() => {
    if (!usuarios) return []
    const q = busqueda.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) => `${u.nombre} ${u.email}`.toLowerCase().includes(q))
  }, [usuarios, busqueda])

  async function guardarEdicion(u: Perfil) {
    setGuardando(true); setError('')
    try {
      const { error: upError } = await supabase.from('consola_perfiles').update({
        nombre: u.nombre, rol: u.rol, procesos: u.procesos, proceso: u.procesos.join(', ') || null, modulos: u.modulos, activo: u.activo,
      }).eq('id', u.id)
      if (upError) throw upError
      await cargar()
      setEditando(null)
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (!usuarios) return <Spinner texto="Cargando usuarios…" />

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Usuarios" subtitulo={`${usuarios.length} usuarios en consola`}
        acciones={<Boton onClick={() => setCreando(true)}>+ Nuevo usuario</Boton>} />

      <FilterBar>
        <Campo label="Buscar" className="min-w-64">
          <Input placeholder="Nombre o correo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </Campo>
      </FilterBar>

      <Tabla>
        <THead><tr><TH>Nombre</TH><TH>Correo</TH><TH>Rol</TH><TH>Proceso</TH><TH>Módulos</TH><TH>Estado</TH><TH>Acciones</TH></tr></THead>
        <tbody>
          {filtrados.map((u, i) => (
            <TR key={u.id} i={i}>
              <TD className="font-medium">{u.nombre}</TD>
              <TD className="text-xs break-all">{u.email}</TD>
              <TD><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${u.rol === 'admin' ? 'bg-[#0D2D6B] text-white' : 'bg-slate-100 text-slate-700'}`}>{u.rol}</span></TD>
              <TD className="text-xs">{u.procesos.length ? u.procesos.map((p) => <div key={p}>{p}</div>) : '—'}</TD>
              <TD className="text-xs">{u.modulos.length ? u.modulos.join(', ') : '—'}</TD>
              <TD className="whitespace-nowrap">{u.activo ? <span className="text-xs font-semibold text-emerald-600">Activo</span> : <span className="text-xs font-semibold text-rose-500">Inactivo</span>}</TD>
              <TD className="whitespace-nowrap"><button onClick={() => setEditando(u)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#16468E] hover:bg-[#EAF0FA]">Editar</button></TD>
            </TR>
          ))}
          {filtrados.length === 0 && <TR><TD className="text-slate-400">Sin usuarios.</TD></TR>}
        </tbody>
      </Tabla>

      <Modal open={!!editando} onClose={() => setEditando(null)} titulo={editando ? `Editar · ${editando.nombre}` : ''}>
        {editando && (
          <div className="space-y-3">
            <Campo label="Nombre"><Input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} /></Campo>
            <Campo label="Rol">
              <Select value={editando.rol} onChange={(e) => setEditando({ ...editando, rol: e.target.value as Rol })}>
                <option value="analista">Analista</option>
                <option value="gestor">Gestor</option>
                <option value="admin">Administrador</option>
              </Select>
            </Campo>
            <Campo label="Procesos asignados (opcional)">
              <ProcesosSelector opciones={listaProcesos} seleccion={editando.procesos} onChange={(procesos) => setEditando({ ...editando, procesos })} />
            </Campo>
            <Campo label="Módulos adicionales">
              <div className="flex flex-col gap-1.5">
                {MODULOS_DISPONIBLES.map((m) => (
                  <label key={m.valor} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editando.modulos.includes(m.valor)}
                      onChange={(e) => setEditando({
                        ...editando,
                        modulos: e.target.checked ? [...editando.modulos, m.valor] : editando.modulos.filter((x) => x !== m.valor),
                      })} />
                    {m.label}
                  </label>
                ))}
              </div>
            </Campo>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} />
              Usuario activo
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Boton variante="secundario" onClick={() => setEditando(null)} disabled={guardando}>Cancelar</Boton>
              <Boton onClick={() => guardarEdicion(editando)} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
            </div>
          </div>
        )}
      </Modal>

      {creando && <NuevoUsuarioModal listaProcesos={listaProcesos} onClose={() => setCreando(false)} onCreado={cargar} />}
    </div>
  )
}

function ProcesosSelector({ opciones, seleccion, onChange }: { opciones: string[]; seleccion: string[]; onChange: (v: string[]) => void }) {
  const [filtro, setFiltro] = useState('')
  // Incluye procesos ya asignados que ya no estén activos en la lista maestra
  const todas = useMemo(() => [...new Set([...seleccion, ...opciones])].sort((a, b) => a.localeCompare(b)), [opciones, seleccion])
  const visibles = todas.filter((p) => p.toLowerCase().includes(filtro.trim().toLowerCase()))
  const alternar = (p: string, on: boolean) => onChange(on ? [...seleccion, p] : seleccion.filter((x) => x !== p))

  return (
    <div className="space-y-2">
      {seleccion.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {seleccion.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 rounded-full bg-[#EAF0FA] px-2 py-0.5 text-xs font-medium text-[#0D2D6B]">
              {p}
              <button type="button" onClick={() => alternar(p, false)} className="text-[#16468E] hover:text-rose-600" aria-label={`Quitar ${p}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <Input placeholder="Buscar proceso…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
        {visibles.length === 0 && <div className="px-1 text-xs text-slate-400">Sin coincidencias.</div>}
        {visibles.map((p) => (
          <label key={p} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-[#F6F8FC]">
            <input type="checkbox" checked={seleccion.includes(p)} onChange={(e) => alternar(p, e.target.checked)} />
            {p}
          </label>
        ))}
      </div>
      <div className="text-xs text-slate-500">{seleccion.length} seleccionado(s)</div>
    </div>
  )
}

function NuevoUsuarioModal({ listaProcesos, onClose, onCreado }: { listaProcesos: string[]; onClose: () => void; onCreado: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('analista')
  const [procesos, setProcesos] = useState<string[]>([])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function crear() {
    setGuardando(true); setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{ ok: boolean; id: string; error?: string }>('create-user', {
        body: { email: email.trim(), password, nombre: nombre.trim(), rol, procesos, modulos },
      })
      if (fnError || !data?.ok) {
        // Ante un estado no-2xx, el mensaje útil viene en el cuerpo de la respuesta de la función
        let detalle = data?.error
        const ctx = (fnError as any)?.context
        if (!detalle && ctx && typeof ctx.json === 'function') {
          try { detalle = (await ctx.json())?.error } catch { /* cuerpo no JSON */ }
        }
        throw new Error(detalle || fnError?.message || 'No se pudo crear el usuario')
      }
      onCreado()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Error al crear el usuario')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open onClose={onClose} titulo="Nuevo usuario">
      <div className="space-y-3">
        <Campo label="Nombre completo"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
        <Campo label="Correo institucional"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@cacsantabarbara.co" /></Campo>
        <Campo label="Contraseña temporal"><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></Campo>
        <Campo label="Rol">
          <Select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            <option value="analista">Analista</option>
            <option value="gestor">Gestor</option>
            <option value="admin">Administrador</option>
          </Select>
        </Campo>
        <Campo label="Procesos asignados (opcional)">
          <ProcesosSelector opciones={listaProcesos} seleccion={procesos} onChange={setProcesos} />
        </Campo>
        <Campo label="Módulos adicionales">
          <div className="flex flex-col gap-1.5">
            {MODULOS_DISPONIBLES.map((m) => (
              <label key={m.valor} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={modulos.includes(m.valor)}
                  onChange={(e) => setModulos(e.target.checked ? [...modulos, m.valor] : modulos.filter((x) => x !== m.valor))} />
                {m.label}
              </label>
            ))}
          </div>
        </Campo>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="secundario" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton onClick={crear} disabled={guardando || !email || password.length < 6 || !nombre}>{guardando ? 'Creando…' : 'Crear usuario'}</Boton>
        </div>
      </div>
    </Modal>
  )
}
