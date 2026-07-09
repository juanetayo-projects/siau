import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { FALLA_SEMAFORO, SEMAFORO_CFG } from '../../lib/pqrsf'
import { PageHeader, FilterBar, Campo, Input, Select, Boton, Tabla, THead, TH, TR, TD, Modal, Spinner } from '../../components/ui'
import '../../styles/pqrsf-form.css'

const ESTADOS = ['Recibida', 'En gestión', 'Respondida', 'Cerrada']
const TIPO_CFG: Record<string, string> = {
  'Petición': '#2471c8', Queja: '#ea580c', Reclamo: '#dc2626', Sugerencia: '#16a34a', 'Felicitación': '#ca8a04',
}
const ESTADO_BADGE: Record<string, string> = {
  Recibida: 'bg-slate-100 text-slate-700', 'En gestión': 'bg-amber-100 text-amber-700',
  Respondida: 'bg-emerald-100 text-emerald-700', Cerrada: 'bg-slate-200 text-slate-500',
}

type Respuesta = {
  id: number; fecha_respuesta: string | null; respuesta: string | null; colaborador: string | null
  respondido_por_nombre: string | null; respondido_por_email: string | null
  archivo_url: string | null; archivo_nombre: string | null
}
type Reporte = {
  id: number; tipo_reporte: string | null; estado: string | null; entidad: string | null; sede: string | null
  proceso: string | null; fuente: string | null; fecha_manifestacion: string | null; convenio_eps: string | null
  regimen: string | null; tipo_usuario: string | null
  nombre_paciente: string | null; numero_identificacion: string | null; telefono: string | null
  email_reporta: string | null; direccion: string | null
  falla_atributo: string | null; especialidad: string | null; colaborador: string | null
  descripcion: string | null; dias_habiles: string | null
  archivo_url: string | null; archivo_nombre: string | null
  created_at: string
  respuestas_pqrsf: Respuesta[]
}

function FallaBadge({ falla }: { falla: string | null }) {
  if (!falla) return <span className="text-slate-300">—</span>
  const nivel = FALLA_SEMAFORO[falla] ?? 'verde'
  const cfg = SEMAFORO_CFG[nivel]
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 whitespace-normal rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.fg }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.dot }} />{falla}
    </span>
  )
}

export default function GestionPqrsf() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [registros, setRegistros] = useState<Reporte[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fSede, setFSede] = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [seleccionado, setSeleccionado] = useState<Reporte | null>(null)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [eliminarId, setEliminarId] = useState<number | null>(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('reportes_pqrsf')
      .select('*, respuestas_pqrsf(id,fecha_respuesta,respuesta,colaborador,respondido_por_nombre,respondido_por_email,archivo_url,archivo_nombre)')
      .order('id', { ascending: false })
    setRegistros((data ?? []) as Reporte[])
    setCargando(false)
  }
  useEffect(() => { void cargar() }, [])

  const tipos = useMemo(() => [...new Set(registros.map((r) => r.tipo_reporte).filter(Boolean))] as string[], [registros])
  const sedes = useMemo(() => [...new Set(registros.map((r) => r.sede).filter(Boolean))] as string[], [registros])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (fTipo && r.tipo_reporte !== fTipo) return false
      if (fEstado && r.estado !== fEstado) return false
      if (fSede && r.sede !== fSede) return false
      if (fDesde && r.fecha_manifestacion && r.fecha_manifestacion < fDesde) return false
      if (fHasta && r.fecha_manifestacion && r.fecha_manifestacion > fHasta) return false
      if (q) {
        const radicado = `pqrsf-${String(r.id).padStart(6, '0')}`
        const hay = [r.nombre_paciente, r.numero_identificacion, r.entidad, r.sede, r.proceso, r.descripcion, radicado]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [registros, busqueda, fTipo, fEstado, fSede, fDesde, fHasta])

  function abrir(r: Reporte) { setSeleccionado(r); setEditando(false) }
  function cerrar() { setSeleccionado(null); setEditando(false) }

  async function cambiarEstado(nuevo: string) {
    if (!seleccionado) return
    await supabase.from('reportes_pqrsf').update({ estado: nuevo }).eq('id', seleccionado.id)
    const actualizado = { ...seleccionado, estado: nuevo }
    setSeleccionado(actualizado)
    setRegistros((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
  }

  const [edit, setEdit] = useState<Partial<Reporte>>({})
  function iniciarEdicion() {
    if (!seleccionado) return
    setEdit({
      nombre_paciente: seleccionado.nombre_paciente, numero_identificacion: seleccionado.numero_identificacion,
      telefono: seleccionado.telefono, email_reporta: seleccionado.email_reporta,
      especialidad: seleccionado.especialidad, colaborador: seleccionado.colaborador,
      descripcion: seleccionado.descripcion,
    })
    setEditando(true)
  }
  async function guardarEdicion() {
    if (!seleccionado) return
    setGuardando(true)
    try {
      await supabase.from('reportes_pqrsf').update(edit).eq('id', seleccionado.id)
      const actualizado = { ...seleccionado, ...edit }
      setSeleccionado(actualizado)
      setRegistros((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
      setEditando(false)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (eliminarId == null) return
    await supabase.from('respuestas_pqrsf').delete().eq('reporte_id', eliminarId)
    await supabase.from('reportes_pqrsf').delete().eq('id', eliminarId)
    setRegistros((prev) => prev.filter((r) => r.id !== eliminarId))
    setEliminarId(null)
    if (seleccionado?.id === eliminarId) cerrar()
  }

  const resp = seleccionado?.respuestas_pqrsf?.[0] ?? null
  const etapaIdx = seleccionado ? ESTADOS.indexOf(seleccionado.estado ?? 'Recibida') : -1

  return (
    <div>
      <PageHeader titulo="Gestión PQRSF" subtitulo={`${filtrados.length.toLocaleString()} de ${registros.length.toLocaleString()} registros`} />

      <FilterBar>
        <Campo label="Buscar" className="min-w-56">
          <Input placeholder="Radicado, paciente, identificación…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </Campo>
        <Campo label="Tipo">
          <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="">Todos</option>{tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Estado">
          <Select value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
            <option value="">Todos</option>{ESTADOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Sede">
          <Select value={fSede} onChange={(e) => setFSede(e.target.value)}>
            <option value="">Todas</option>{sedes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Desde"><Input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} /></Campo>
        <Campo label="Hasta"><Input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} /></Campo>
        <Boton variante="secundario" onClick={() => { setBusqueda(''); setFTipo(''); setFEstado(''); setFSede(''); setFDesde(''); setFHasta('') }}>Limpiar</Boton>
      </FilterBar>

      {cargando ? <Spinner /> : (
        <Tabla>
          <THead>
            <tr>
              <TH>Radicado</TH><TH>Tipo</TH><TH>Paciente</TH><TH>Entidad</TH><TH>Sede</TH>
              <TH>Falla</TH><TH>Fecha</TH><TH>Estado</TH><TH>Respondida</TH><TH>Acciones</TH>
            </tr>
          </THead>
          <tbody>
            {filtrados.length === 0 && <TR><TD className="py-10 text-center text-slate-400">Sin registros para mostrar</TD></TR>}
            {filtrados.map((r, i) => {
              const radicado = `PQRSF-${String(r.id).padStart(6, '0')}`
              const hasResp = r.respuestas_pqrsf?.length > 0
              return (
                <TR key={r.id} i={i}>
                  <TD className="whitespace-nowrap font-mono text-xs font-bold text-[#0D2D6B]">{radicado}</TD>
                  <TD><span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: TIPO_CFG[r.tipo_reporte ?? ''] ?? '#6b7280' }}>{r.tipo_reporte}</span></TD>
                  <TD className="max-w-[150px] truncate">{r.nombre_paciente || '—'}</TD>
                  <TD className="max-w-[130px] truncate text-xs">{r.entidad || '—'}</TD>
                  <TD className="max-w-[130px] truncate text-xs">{r.sede || '—'}</TD>
                  <TD><FallaBadge falla={r.falla_atributo} /></TD>
                  <TD className="whitespace-nowrap text-xs">{r.fecha_manifestacion ? new Date(r.fecha_manifestacion + 'T12:00:00').toLocaleDateString('es-CO') : '—'}</TD>
                  <TD><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[r.estado ?? 'Recibida']}`}>{r.estado ?? 'Recibida'}</span></TD>
                  <TD>{hasResp ? <span className="text-xs font-semibold text-emerald-600">Sí</span> : <span className="text-xs font-semibold text-slate-400">No</span>}</TD>
                  <TD>
                    <div className="flex gap-2">
                      <button onClick={() => abrir(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#16468E] hover:bg-[#EAF0FA]">Ver</button>
                      {esAdmin && <button onClick={() => setEliminarId(r.id)} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Eliminar</button>}
                    </div>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </Tabla>
      )}

      <Modal open={!!seleccionado} onClose={cerrar} titulo={seleccionado ? `PQRSF-${String(seleccionado.id).padStart(6, '0')}` : ''} ancho="max-w-3xl">
        {seleccionado && (
          <div className="pqf">
            <div className="pqf-status-bar" style={{ borderRadius: 8, marginBottom: 14 }}>
              {ESTADOS.map((e, i) => (
                <div key={e} className={`pqf-status-stage ${i < etapaIdx ? 'done' : i === etapaIdx ? 'current' : ''}`}
                  style={{ cursor: 'pointer' }} onClick={() => cambiarEstado(e)} title={`Cambiar a: ${e}`}>
                  {i < etapaIdx ? '✓ ' : ''}{e}
                </div>
              ))}
            </div>

            {!editando ? (
              <>
                <div className="pqf-section-title">Datos del reporte</div>
                <div className="pqf-record-grid">
                  <Campo2 l="Entidad" v={seleccionado.entidad} /><Campo2 l="Sede" v={seleccionado.sede} />
                  <Campo2 l="Proceso / Servicio" v={seleccionado.proceso} /><Campo2 l="Fuente" v={seleccionado.fuente} />
                  <Campo2 l="Convenio / EPS" v={seleccionado.convenio_eps} /><Campo2 l="Régimen" v={seleccionado.regimen} />
                  <Campo2 l="Paciente" v={seleccionado.nombre_paciente} /><Campo2 l="Identificación" v={seleccionado.numero_identificacion} />
                  <Campo2 l="Teléfono" v={seleccionado.telefono} /><Campo2 l="Correo" v={seleccionado.email_reporta} />
                  <Campo2 l="Especialidad" v={seleccionado.especialidad} /><Campo2 l="Colaborador" v={seleccionado.colaborador} />
                </div>
                <div style={{ marginBottom: 12 }}><FallaBadge falla={seleccionado.falla_atributo} /></div>
                {seleccionado.descripcion && (
                  <div className="pqf-record-desc"><div className="pqf-record-label">Descripción</div><div className="pqf-record-value">{seleccionado.descripcion}</div></div>
                )}

                <div className="pqf-section-title" style={{ marginTop: 16 }}>Respuesta</div>
                {resp ? (
                  <>
                    <div className="pqf-record-grid">
                      <Campo2 l="Fecha respuesta" v={resp.fecha_respuesta} /><Campo2 l="Respondido por" v={resp.respondido_por_nombre} />
                      <Campo2 l="Correo responsable" v={resp.respondido_por_email} /><Campo2 l="Colaborador" v={resp.colaborador} />
                    </div>
                    <div className="pqf-record-desc" style={{ background: 'var(--green-lt)', borderLeftColor: 'var(--green)' }}>
                      <div className="pqf-record-label">Texto de la respuesta</div><div className="pqf-record-value">{resp.respuesta}</div>
                    </div>
                  </>
                ) : (
                  <div className="pqf-not-found">Este PQRSF aún no tiene respuesta registrada.</div>
                )}

                <div className="pqf-nav" style={{ marginTop: 16, padding: 0, border: 'none' }}>
                  <Boton variante="secundario" onClick={iniciarEdicion}>Editar</Boton>
                </div>
              </>
            ) : (
              <>
                <div className="pqf-grid">
                  <div className="pqf-field"><label>Nombre paciente</label><input value={edit.nombre_paciente ?? ''} onChange={(e) => setEdit((v) => ({ ...v, nombre_paciente: e.target.value }))} /></div>
                  <div className="pqf-field"><label>Identificación</label><input value={edit.numero_identificacion ?? ''} onChange={(e) => setEdit((v) => ({ ...v, numero_identificacion: e.target.value }))} /></div>
                  <div className="pqf-field"><label>Teléfono</label><input value={edit.telefono ?? ''} onChange={(e) => setEdit((v) => ({ ...v, telefono: e.target.value }))} /></div>
                  <div className="pqf-field"><label>Correo</label><input value={edit.email_reporta ?? ''} onChange={(e) => setEdit((v) => ({ ...v, email_reporta: e.target.value }))} /></div>
                  <div className="pqf-field"><label>Especialidad</label><input value={edit.especialidad ?? ''} onChange={(e) => setEdit((v) => ({ ...v, especialidad: e.target.value }))} /></div>
                  <div className="pqf-field"><label>Colaborador</label><input value={edit.colaborador ?? ''} onChange={(e) => setEdit((v) => ({ ...v, colaborador: e.target.value }))} /></div>
                  <div className="pqf-field full"><label>Descripción</label><textarea rows={4} value={edit.descripcion ?? ''} onChange={(e) => setEdit((v) => ({ ...v, descripcion: e.target.value }))} /></div>
                </div>
                <div className="pqf-nav" style={{ marginTop: 16, padding: 0, border: 'none' }}>
                  <Boton variante="secundario" onClick={() => setEditando(false)} disabled={guardando}>Cancelar</Boton>
                  <Boton onClick={guardarEdicion} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Boton>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={eliminarId != null} onClose={() => setEliminarId(null)} titulo="Eliminar registro">
        <p className="text-sm text-slate-600">¿Está seguro de eliminar el PQRSF-{eliminarId != null ? String(eliminarId).padStart(6, '0') : ''}? Esta acción no se puede deshacer y también elimina su respuesta si existe.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => setEliminarId(null)}>Cancelar</Boton>
          <Boton variante="peligro" onClick={eliminar}>Eliminar</Boton>
        </div>
      </Modal>
    </div>
  )
}

function Campo2({ l, v }: { l: string; v: string | null | undefined }) {
  return <div className="pqf-record-field"><div className="pqf-record-label">{l}</div><div className={`pqf-record-value${!v ? ' empty' : ''}`}>{v || '—'}</div></div>
}
