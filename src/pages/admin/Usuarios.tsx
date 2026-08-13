import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, FilterBar, Campo, Input, Select, Boton, Tabla, THead, TH, TR, TD, Modal, Spinner } from '../../components/ui'
import type { Modulo, Rol } from '../../lib/auth'

type Perfil = { id: string; nombre: string; email: string; rol: Rol; proceso: string | null; modulos: Modulo[]; activo: boolean; created_at: string }

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

  async function cargar() {
    const { data } = await supabase.from('consola_perfiles').select('*').order('nombre')
    setUsuarios((data ?? []).map((u: any) => ({ ...u, modulos: u.modulos ?? [] })) as Perfil[])
  }
  useEffect(() => { void cargar() }, [])

  const filtrados = useMemo(() => {
    if (!usuarios) return []
    const q = busqueda.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) => `${u.nombre} ${u.email}`.toLowerCase().includes(q))
  }, [usuarios, busqueda])

  async function guardarEdicion(u: Perfil) {
    setGuardando(true); setError('')
    try {
      await supabase.from('consola_perfiles').update({
        nombre: u.nombre, rol: u.rol, proceso: u.proceso || null, modulos: u.modulos, activo: u.activo,
      }).eq('id', u.id)
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
    <div className="mx-auto max-w-3xl">
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
              <TD className="text-xs">{u.email}</TD>
              <TD><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.rol === 'admin' ? 'bg-[#0D2D6B] text-white' : 'bg-slate-100 text-slate-700'}`}>{u.rol}</span></TD>
              <TD className="text-xs">{u.proceso || '—'}</TD>
              <TD className="text-xs">{u.modulos.length ? u.modulos.join(', ') : '—'}</TD>
              <TD>{u.activo ? <span className="text-xs font-semibold text-emerald-600">Activo</span> : <span className="text-xs font-semibold text-rose-500">Inactivo</span>}</TD>
              <TD><button onClick={() => setEditando(u)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#16468E] hover:bg-[#EAF0FA]">Editar</button></TD>
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
            <Campo label="Proceso asignado (opcional)"><Input value={editando.proceso ?? ''} onChange={(e) => setEditando({ ...editando, proceso: e.target.value })} /></Campo>
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

      {creando && <NuevoUsuarioModal onClose={() => setCreando(false)} onCreado={cargar} />}
    </div>
  )
}

function NuevoUsuarioModal({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('analista')
  const [proceso, setProceso] = useState('')
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function crear() {
    setGuardando(true); setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{ ok: boolean; id: string; error?: string }>('create-user', {
        body: { email, password, nombre, rol, proceso },
      })
      if (fnError || !data?.ok) throw new Error(data?.error || fnError?.message || 'No se pudo crear el usuario')
      if (modulos.length) {
        await supabase.from('consola_perfiles').update({ modulos }).eq('id', data.id)
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
        <Campo label="Proceso asignado (opcional)"><Input value={proceso} onChange={(e) => setProceso(e.target.value)} /></Campo>
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
