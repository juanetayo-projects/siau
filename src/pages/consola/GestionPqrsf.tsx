import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { SEMAFORO_CFG, type Semaforo } from '../../lib/pqrsf'
import { calcularPlazo } from '../../lib/plazoRespuesta'
import { PageHeader, FilterBar, Campo, Input, Select, Boton, Tabla, THead, TH, TR, TD, Modal, Spinner, IconoOjo, IconoPapelera } from '../../components/ui'
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
type Evento = { id: number; tipo: 'Abierto' | 'Cerrado'; fecha: string; registrado_por_nombre: string | null }
type Reporte = {
  id: number; tipo_reporte: string | null; estado: string | null; entidad: string | null; sede: string | null
  proceso: string | null; fuente: string | null; fecha_manifestacion: string | null; convenio_eps: string | null
  regimen: string | null; tipo_usuario: string | null
  nombre_paciente: string | null; numero_identificacion: string | null; telefono: string | null
  email_reporta: string | null; direccion: string | null
  falla_atributo: string | null; especialidad: string | null; colaborador: string | null
  descripcion: string | null; dias_habiles: string | null
  archivo_url: string | null; archivo_nombre: string | null
  created_at: string; fecha_apertura: string | null
  respuestas_pqrsf: Respuesta[]
}

const COLOR_PLAZO: Record<string, string> = { verde: '#16a34a', amarillo: '#f59e0b', rojo: '#dc2626', completado: '#64748b' }

function BarraTiempoRespuesta({ r }: { r: Reporte }) {
  const cerrado = r.estado === 'Respondida' || r.estado === 'Cerrada'
  const { diasRestantes, pct, estado } = calcularPlazo(r.dias_habiles, r.fecha_apertura ?? r.created_at?.slice(0, 10), cerrado)
  if (estado === 'sin_plazo') return <span className="text-xs text-slate-300">—</span>

  const color = COLOR_PLAZO[estado]
  let texto: string
  if (estado === 'completado') texto = r.estado ?? 'Completado'
  else if (diasRestantes! < 0) texto = `Vencido ${Math.abs(diasRestantes!)}d`
  else if (diasRestantes === 0) texto = 'Vence hoy'
  else texto = `${diasRestantes}d restantes`

  return (
    <div className="w-28">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-0.5 text-[10px] font-medium" style={{ color }}>{texto}</div>
    </div>
  )
}

function TiempoGestionDetalle({ r }: { r: Reporte }) {
  const cerrado = r.estado === 'Respondida' || r.estado === 'Cerrada'
  const fechaInicio = r.fecha_apertura ?? r.created_at?.slice(0, 10)
  const { plazoDias, diasRestantes, pct, estado } = calcularPlazo(r.dias_habiles, fechaInicio, cerrado)

  if (estado === 'sin_plazo') {
    return <p className="mb-4 text-sm text-slate-400">Sin plazo de respuesta definido para este PQRSF.</p>
  }

  const color = COLOR_PLAZO[estado]
  let texto: string
  if (estado === 'completado') texto = `${r.estado} — plazo de ${plazoDias} día(s) desde ${fechaInicio}`
  else if (diasRestantes! < 0) texto = `Vencido hace ${Math.abs(diasRestantes!)} día(s)`
  else if (diasRestantes === 0) texto = 'Vence hoy'
  else texto = `Quedan ${diasRestantes} día(s) de ${plazoDias}`

  return (
    <div className="mb-4">
      <div className="pqf-record-grid">
        <Campo2 l="Plazo de respuesta" v={r.dias_habiles} />
        <Campo2 l="Fecha de apertura" v={fechaInicio} />
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-1 text-xs font-semibold" style={{ color }}>{texto}</div>
    </div>
  )
}

function FallaBadge({ falla, colores }: { falla: string | null; colores: Record<string, Semaforo> }) {
  if (!falla) return <span className="text-slate-300">—</span>
  const cfg = SEMAFORO_CFG[colores[falla] ?? 'amarillo']
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 whitespace-normal rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.fg }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.dot }} />{falla}
    </span>
  )
}

export default function GestionPqrsf() {
  const { perfil, session } = useAuth()
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
  const [eliminarId, setEliminarId] = useState<number | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [registrandoEvento, setRegistrandoEvento] = useState(false)
  const [fallaColores, setFallaColores] = useState<Record<string, Semaforo>>({})

  async function cargar() {
    setCargando(true)
    const [{ data }, { data: fallas }] = await Promise.all([
      supabase
        .from('reportes_pqrsf')
        .select('*, respuestas_pqrsf(id,fecha_respuesta,respuesta,colaborador,respondido_por_nombre,respondido_por_email,archivo_url,archivo_nombre)')
        .order('id', { ascending: false }),
      supabase.from('lista_fallas').select('nombre,color'),
    ])
    setRegistros((data ?? []) as Reporte[])
    setFallaColores(Object.fromEntries((fallas ?? []).map((f: any) => [f.nombre, f.color as Semaforo])))
    setCargando(false)
  }
  useEffect(() => { void cargar() }, [])

  const tipos = useMemo(() => ([...new Set(registros.map((r) => r.tipo_reporte).filter(Boolean))] as string[]).sort(), [registros])
  const sedes = useMemo(() => ([...new Set(registros.map((r) => r.sede).filter(Boolean))] as string[]).sort(), [registros])

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

  async function cargarEventos(reporteId: number) {
    const { data } = await supabase.from('reportes_pqrsf_eventos').select('id,tipo,fecha,registrado_por_nombre')
      .eq('reporte_id', reporteId).order('fecha', { ascending: false })
    setEventos((data ?? []) as Evento[])
  }
  function abrir(r: Reporte) { setSeleccionado(r); void cargarEventos(r.id) }
  function cerrar() { setSeleccionado(null); setEventos([]) }

  async function cambiarEstado(nuevo: string) {
    if (!seleccionado) return
    await supabase.from('reportes_pqrsf').update({ estado: nuevo }).eq('id', seleccionado.id)
    const actualizado = { ...seleccionado, estado: nuevo }
    setSeleccionado(actualizado)
    setRegistros((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
  }

  async function registrarEvento(tipo: 'Abierto' | 'Cerrado') {
    if (!seleccionado || !session) return
    setRegistrandoEvento(true)
    try {
      await supabase.from('reportes_pqrsf_eventos').insert({
        reporte_id: seleccionado.id, tipo, registrado_por: session.user.id, registrado_por_nombre: perfil?.nombre ?? null,
      })
      await cargarEventos(seleccionado.id)
    } finally {
      setRegistrandoEvento(false)
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
              <TH>Tiempo de respuesta</TH><TH>Radicado</TH><TH>Tipo</TH><TH>Paciente</TH><TH>Entidad</TH><TH>Sede</TH>
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
                  <TD><BarraTiempoRespuesta r={r} /></TD>
                  <TD className="whitespace-nowrap font-mono text-xs font-bold text-[#0D2D6B]">{radicado}</TD>
                  <TD><span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: TIPO_CFG[r.tipo_reporte ?? ''] ?? '#6b7280' }}>{r.tipo_reporte}</span></TD>
                  <TD className="max-w-[150px] truncate">{r.nombre_paciente || '—'}</TD>
                  <TD className="max-w-[130px] truncate text-xs">{r.entidad || '—'}</TD>
                  <TD className="max-w-[130px] truncate text-xs">{r.sede || '—'}</TD>
                  <TD><FallaBadge falla={r.falla_atributo} colores={fallaColores} /></TD>
                  <TD className="whitespace-nowrap text-xs">{r.fecha_manifestacion ? new Date(r.fecha_manifestacion + 'T12:00:00').toLocaleDateString('es-CO') : '—'}</TD>
                  <TD><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[r.estado ?? 'Recibida']}`}>{r.estado ?? 'Recibida'}</span></TD>
                  <TD>{hasResp ? <span className="text-xs font-semibold text-emerald-600">Sí</span> : <span className="text-xs font-semibold text-slate-400">No</span>}</TD>
                  <TD>
                    <div className="flex gap-1">
                      <button onClick={() => abrir(r)} title="Ver" aria-label="Ver"
                        className="rounded-lg p-1.5 text-[#16468E] hover:bg-[#EAF0FA]">
                        <IconoOjo />
                      </button>
                      {esAdmin && (
                        <button onClick={() => setEliminarId(r.id)} title="Eliminar" aria-label="Eliminar"
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                          <IconoPapelera />
                        </button>
                      )}
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

            <div className="pqf-section-title">Tiempo de gestión</div>
            <TiempoGestionDetalle r={seleccionado} />

            <div className="pqf-section-title">Datos del reporte</div>
            <div className="pqf-record-grid">
              <Campo2 l="Entidad" v={seleccionado.entidad} /><Campo2 l="Sede" v={seleccionado.sede} />
              <Campo2 l="Proceso / Servicio" v={seleccionado.proceso} /><Campo2 l="Fuente" v={seleccionado.fuente} />
              <Campo2 l="Convenio / EPS" v={seleccionado.convenio_eps} /><Campo2 l="Régimen" v={seleccionado.regimen} />
              <Campo2 l="Paciente" v={seleccionado.nombre_paciente} /><Campo2 l="Identificación" v={seleccionado.numero_identificacion} />
              <Campo2 l="Teléfono" v={seleccionado.telefono} /><Campo2 l="Correo" v={seleccionado.email_reporta} />
              <Campo2 l="Especialidad" v={seleccionado.especialidad} /><Campo2 l="Colaborador" v={seleccionado.colaborador} />
            </div>
            <div style={{ marginBottom: 12 }}><FallaBadge falla={seleccionado.falla_atributo} colores={fallaColores} /></div>
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

            <div className="pqf-section-title" style={{ marginTop: 16 }}>Bitácora Abierto / Cerrado</div>
            <div className="mb-3 flex gap-2">
              <Boton variante="secundario" onClick={() => registrarEvento('Abierto')} disabled={registrandoEvento}>🔓 Marcar Abierto</Boton>
              <Boton variante="secundario" onClick={() => registrarEvento('Cerrado')} disabled={registrandoEvento || !resp}
                title={!resp ? 'No se puede cerrar un PQRSF sin respuesta registrada' : undefined}>
                🔒 Marcar Cerrado
              </Boton>
              {!resp && <span className="self-center text-xs text-amber-600">Requiere una respuesta registrada para poder cerrarse</span>}
            </div>
            {eventos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin eventos registrados.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-100">
                {eventos.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 border-b border-slate-50 px-3 py-2 text-sm last:border-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ev.tipo === 'Abierto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{ev.tipo}</span>
                    <span className="text-xs text-slate-500">{new Date(ev.fecha).toLocaleString('es-CO')}</span>
                    <span className="ml-auto text-xs text-slate-400">{ev.registrado_por_nombre ?? '—'}</span>
                  </div>
                ))}
              </div>
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
