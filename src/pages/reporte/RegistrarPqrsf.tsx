import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import '../../styles/pqrsf-form.css'
import {
  TIPO_REPORTE_UI, TIPO_USUARIO_UI, PLAZOS_RESPUESTA, FALLA_SEMAFORO, SEMAFORO_CFG,
  CAMPOS_PERMITIDOS_REPORTE, type ListaItem, type ListaProceso, type ListaFalla,
} from '../../lib/pqrsf'

const TOTAL_STEPS = 6

type Form = {
  entidad: string; sede: string; fecha_manifestacion: string; fuente: string; fecha_apertura: string
  convenio: string; regimen: string
  nombre_paciente: string; numero_id: string; telefono: string; direccion: string; email_reporta: string
  descripcion: string; falla: string; especialidad: string; colaborador: string
}
const FORM_INICIAL: Form = {
  entidad: '', sede: '', fecha_manifestacion: new Date().toISOString().slice(0, 10), fuente: '',
  fecha_apertura: new Date().toISOString().slice(0, 10),
  convenio: '', regimen: '',
  nombre_paciente: '', numero_id: '', telefono: '', direccion: '', email_reporta: '',
  descripcion: '', falla: '', especialidad: '', colaborador: '',
}

type Listas = {
  tipos: ListaItem[]; entidades: ListaItem[]; sedes: ListaItem[]; procesos: ListaProceso[]
  fuentes: ListaItem[]; tiposUsuario: ListaItem[]; convenios: ListaItem[]; regimenes: ListaItem[]
  fallas: ListaFalla[]; especialidades: ListaItem[]
}

function agrupar<T extends { grupo?: string | null }>(items: T[]): Record<string, T[]> {
  const g: Record<string, T[]> = {}
  items.forEach((it) => {
    const k = it.grupo || 'Otros'
    g[k] = g[k] ?? []
    g[k].push(it)
  })
  return g
}

/* ── Multi-select de Proceso con tags removibles ─────────────── */
function ProcesoMultiSelect({ procesos, seleccion, onChange }: {
  procesos: ListaProceso[]; seleccion: string[]; onChange: (v: string[]) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  function quitar(nombre: string) {
    onChange(seleccion.filter((s) => s !== nombre))
  }
  function alternar(nombre: string) {
    onChange(seleccion.includes(nombre) ? seleccion.filter((s) => s !== nombre) : [...seleccion, nombre])
  }

  return (
    <div className="pqf-ms-wrap" ref={ref}>
      <div className="pqf-ms-trigger" onClick={() => setAbierto((v) => !v)}>
        {seleccion.length === 0 ? (
          <span className="pqf-ms-placeholder">— Seleccione uno o más —</span>
        ) : (
          seleccion.map((s) => (
            <span key={s} className="pqf-ms-tag">
              {s}
              <button type="button" className="pqf-ms-tag-remove" onClick={(e) => { e.stopPropagation(); quitar(s) }}>✕</button>
            </span>
          ))
        )}
      </div>
      <span className={`pqf-ms-arrow${abierto ? ' open' : ''}`}>▾</span>
      {abierto && (
        <div className="pqf-ms-dropdown">
          {procesos.length === 0 && <div className="pqf-ms-item">Sin opciones disponibles</div>}
          {procesos.map((p) => (
            <label key={p.nombre} className="pqf-ms-item">
              <input type="checkbox" checked={seleccion.includes(p.nombre)} onChange={() => alternar(p.nombre)} />
              {p.nombre}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Dropdown de Falla con semaforización ────────────────────── */
function FallaSelect({ fallas, valor, onChange }: { fallas: ListaFalla[]; valor: string; onChange: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const grupos = agrupar(fallas)

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const nivel = valor ? FALLA_SEMAFORO[valor] : undefined
  const cfg = nivel ? SEMAFORO_CFG[nivel] : null

  return (
    <div className="pqf-falla-wrap" ref={ref}>
      <div className="pqf-falla-trigger" onClick={() => setAbierto((v) => !v)}>
        {valor && cfg ? (
          <span className="pqf-falla-sel" style={{ background: cfg.bg, color: cfg.fg }}>
            <span className="pqf-falla-dot" style={{ background: cfg.dot }} />{valor}
          </span>
        ) : (
          <span className="pqf-falla-placeholder">— Seleccione —</span>
        )}
        <span className={`pqf-falla-arrow${abierto ? ' open' : ''}`}>▾</span>
      </div>
      {abierto && (
        <div className="pqf-falla-dropdown">
          {Object.entries(grupos).map(([grupo, items]) => (
            <div key={grupo}>
              <div className="pqf-falla-group">{grupo}</div>
              {items.map((f) => {
                const n = FALLA_SEMAFORO[f.nombre] ?? 'verde'
                const c = SEMAFORO_CFG[n]
                return (
                  <div key={f.nombre} className="pqf-falla-item" onClick={() => { onChange(f.nombre); setAbierto(false) }}>
                    <span className="pqf-falla-badge" style={{ background: c.bg, color: c.fg }}>
                      <span className="pqf-falla-dot" style={{ background: c.dot }} />{f.nombre}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RegistrarPqrsf() {
  const { session, perfil } = useAuth()
  const [listas, setListas] = useState<Listas | null>(null)
  const [step, setStep] = useState(1)
  const [tipoReporte, setTipoReporte] = useState('')
  const [tipoUsuario, setTipoUsuario] = useState('')
  const [procesoSel, setProcesoSel] = useState<string[]>([])
  const [plazo, setPlazo] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [form, setForm] = useState<Form>(FORM_INICIAL)
  const [errores, setErrores] = useState<Record<number, string>>({})
  const [enviando, setEnviando] = useState('')
  const [errorEnvio, setErrorEnvio] = useState('')
  const [radicado, setRadicado] = useState('')

  useEffect(() => {
    async function cargar() {
      const [tipos, entidades, sedes, procesos, fuentes, tiposUsuario, convenios, regimenes, fallas, especialidades] = await Promise.all([
        supabase.from('lista_tipo_reporte').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_entidades').select('nombre').eq('activo', true).order('nombre'),
        supabase.from('lista_sedes').select('nombre').eq('activo', true).order('nombre'),
        supabase.from('lista_procesos').select('nombre,correo').eq('activo', true).order('nombre'),
        supabase.from('lista_fuentes').select('nombre').eq('activo', true).order('nombre'),
        supabase.from('lista_tipo_usuario').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_convenios').select('nombre').eq('activo', true).order('nombre'),
        supabase.from('lista_regimen').select('nombre').eq('activo', true).order('nombre'),
        supabase.from('lista_fallas').select('nombre,grupo').eq('activo', true).order('nombre'),
        supabase.from('especialidades').select('nombre').eq('activo', true).order('nombre'),
      ])
      setListas({
        tipos: tipos.data ?? [], entidades: entidades.data ?? [], sedes: sedes.data ?? [],
        procesos: (procesos.data ?? []) as ListaProceso[], fuentes: fuentes.data ?? [],
        tiposUsuario: tiposUsuario.data ?? [], convenios: convenios.data ?? [], regimenes: regimenes.data ?? [],
        fallas: (fallas.data ?? []) as ListaFalla[], especialidades: especialidades.data ?? [],
      })
    }
    void cargar()
  }, [])

  function campo<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function validar(n: number): string {
    switch (n) {
      case 1: return tipoReporte ? '' : 'Seleccione el tipo de PQRSF.'
      case 2:
        if (!form.entidad) return 'Seleccione la entidad.'
        if (!form.sede) return 'Seleccione la sede.'
        if (!procesoSel.length) return 'Seleccione al menos un proceso o servicio.'
        if (!form.fecha_manifestacion) return 'Ingrese la fecha de la manifestación.'
        if (!form.fuente) return 'Seleccione la fuente.'
        return ''
      case 3:
        if (!tipoUsuario) return 'Seleccione el tipo de usuario.'
        if (!form.convenio) return 'Seleccione el convenio / EPS.'
        if (!form.regimen) return 'Seleccione el régimen.'
        return ''
      case 4:
        if (!form.nombre_paciente.trim()) return 'Ingrese el nombre y apellido del paciente.'
        if (!form.numero_id.trim()) return 'Ingrese el número de identificación.'
        if (form.email_reporta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_reporta)) return 'El correo electrónico no tiene formato válido.'
        return ''
      case 5:
        if (!form.descripcion.trim()) return 'Ingrese la descripción de su PQRSF.'
        if (!form.falla) return 'Seleccione la falla o atributo identificado.'
        if (!form.colaborador.trim()) return 'Ingrese el nombre del colaborador involucrado.'
        if (!plazo) return 'Seleccione el plazo de días hábiles para responder.'
        return ''
      default: return ''
    }
  }

  function siguiente() {
    const err = validar(step)
    setErrores((e) => ({ ...e, [step]: err }))
    if (err) return
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function anterior() {
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const permitidos = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
    if (!permitidos.includes(f.type)) { alert('Formato no permitido. Use: PDF, DOC, DOCX, TXT, PNG o JPG.'); return }
    if (f.size > 10 * 1024 * 1024) { alert('El archivo supera el límite de 10 MB.'); return }
    setArchivo(f)
  }

  async function enviar() {
    if (!session) { setErrorEnvio('Su sesión expiró. Vuelva a iniciar sesión e intente de nuevo.'); return }
    setErrorEnvio('')

    let archivoUrl: string | null = null
    let archivoNombre: string | null = null
    if (archivo) {
      setEnviando('Subiendo archivo…')
      try {
        const ext = archivo.name.split('.').pop()
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage.from('pqrsf-adjuntos').upload(path, archivo, { cacheControl: '3600', upsert: false })
        if (error) throw error
        archivoUrl = supabase.storage.from('pqrsf-adjuntos').getPublicUrl(data.path).data.publicUrl
        archivoNombre = archivo.name
      } catch {
        archivoNombre = `${archivo.name} (no subido)`
      }
    }

    setEnviando('Guardando…')
    const correoProceso = procesoSel.length
      ? listas?.procesos.find((p) => p.nombre === procesoSel[0])?.correo ?? ''
      : ''

    const payloadCompleto: Record<string, unknown> = {
      tipo_reporte: tipoReporte, entidad: form.entidad, sede: form.sede,
      proceso: procesoSel.join(', '), fecha_manifestacion: form.fecha_manifestacion || null,
      fuente: form.fuente, fecha_apertura: form.fecha_apertura || null, tipo_usuario: tipoUsuario,
      convenio_eps: form.convenio, regimen: form.regimen, nombre_paciente: form.nombre_paciente,
      numero_identificacion: form.numero_id, direccion: form.direccion, telefono: form.telefono,
      email_reporta: form.email_reporta, descripcion: form.descripcion, falla_atributo: form.falla,
      especialidad: form.especialidad, colaborador: form.colaborador, dias_habiles: plazo || null,
      correo_proceso: correoProceso || '', archivo_url: archivoUrl, archivo_nombre: archivoNombre,
    }
    const payload: Record<string, unknown> = {}
    for (const k of CAMPOS_PERMITIDOS_REPORTE) if (payloadCompleto[k] !== undefined && payloadCompleto[k] !== '') payload[k] = payloadCompleto[k]

    try {
      const { data: result, error } = await supabase.functions.invoke<{ ok: boolean; id: number; error?: string }>(
        'crear-reporte-pqrsf', { body: { data: payload } },
      )
      if (error || !result?.ok) throw new Error(result?.error || error?.message || 'No se pudo registrar el reporte')
      const nuevoId = result.id
      setRadicado(`PQRSF-${String(nuevoId).padStart(6, '0')}`)

      if (payload.correo_proceso || payload.email_reporta) {
        setEnviando('Enviando notificación…')
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        try {
          await Promise.race([
            supabase.functions.invoke('notify-pqrsf', { body: { reporte: { ...payload, id: nuevoId } } }),
            timeout,
          ])
        } catch { /* no bloquea el flujo si el correo falla */ }
      }
      setStep(7)
    } catch (e: any) {
      setErrorEnvio(e.message ?? 'No se pudo enviar el formulario. Verifique la conexión e intente de nuevo.')
    } finally {
      setEnviando('')
    }
  }

  function reiniciar() {
    setStep(1); setTipoReporte(''); setTipoUsuario(''); setProcesoSel([]); setPlazo('')
    setArchivo(null); setForm(FORM_INICIAL); setErrores({}); setErrorEnvio(''); setRadicado('')
  }

  if (!listas) return <p className="p-8 text-center text-slate-500">Cargando formulario…</p>

  if (step === 7) {
    return (
      <div className="pqf">
        <div className="pqf-container">
          <div className="pqf-step pqf-success">
            <div className="pqf-success-circle">✓</div>
            <h2>¡PQRSF registrada exitosamente!</h2>
            <p>Su reporte fue registrado y será atendido dentro del plazo indicado. Puede hacer seguimiento con el número de radicado.</p>
            <div className="pqf-ticket">
              <span className="pqf-ticket-label">Número de radicado</span>
              <span className="pqf-ticket-number">{radicado}</span>
            </div>
            <div>
              <button className="pqf-btn pqf-btn-success" onClick={reiniciar}>Registrar otra PQRSF</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pqf">
      <h1 className="mb-1 text-lg font-bold text-[#0D2D6B]">Registrar PQRSF</h1>
      <p className="mb-4 text-sm text-slate-500">{perfil ? `Registrado por ${perfil.nombre}` : ''}</p>

      <div className="pqf-container">
        <div className="pqf-progress-wrap"><div className="pqf-progress-bar" style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }} /></div>
        <div className="pqf-step-indicator">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
            <span key={n} className={`pqf-dot${n === step ? ' active' : n < step ? ' done' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="pqf-step">
            <div className="pqf-step-header">
              <span className="pqf-step-num">1</span>
              <div><h2>¿Qué tipo de PQRSF desea registrar?</h2><p>Seleccione la categoría que mejor describe su manifestación</p></div>
            </div>
            <div className="pqf-type-grid">
              {listas.tipos.map((t) => {
                const ui = TIPO_REPORTE_UI[t.nombre] ?? { icon: '📌', desc: '' }
                const sel = tipoReporte === t.nombre
                return (
                  <div key={t.nombre} className={`pqf-type-card${sel ? ' sel' : ''}`}
                    onClick={() => { setTipoReporte(t.nombre); setErrores((e) => ({ ...e, 1: '' })); setStep(2) }}>
                    <div className={`pqf-type-icon ${TIPO_REPORTE_UI[t.nombre] ? colorDeTipo(t.nombre) : 'blue'}`}>{ui.icon}</div>
                    <h3>{t.nombre}</h3><p>{ui.desc}</p>
                  </div>
                )
              })}
            </div>
            {errores[1] && <p className="pqf-error">⚠ {errores[1]}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="pqf-step">
            <div className="pqf-step-header">
              <span className="pqf-step-num">2</span>
              <div><h2>Información institucional</h2><p>Datos de la entidad, sede y proceso involucrado</p></div>
            </div>
            <div className="pqf-grid">
              <div className="pqf-field"><label>Entidad que recibe la PQRSF <span className="req">*</span></label>
                <select value={form.entidad} onChange={(e) => campo('entidad', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.entidades.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </div>
              <div className="pqf-field"><label>Sede <span className="req">*</span></label>
                <select value={form.sede} onChange={(e) => campo('sede', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.sedes.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </div>
              <div className="pqf-field full"><label>Proceso / Servicio <span className="req">*</span></label>
                <ProcesoMultiSelect procesos={listas.procesos} seleccion={procesoSel} onChange={setProcesoSel} />
              </div>
              <div className="pqf-field"><label>Fecha de la manifestación <span className="req">*</span></label>
                <input type="date" value={form.fecha_manifestacion} onChange={(e) => campo('fecha_manifestacion', e.target.value)} />
              </div>
              <div className="pqf-field"><label>Fecha apertura del buzón</label>
                <input type="date" value={form.fecha_apertura} onChange={(e) => campo('fecha_apertura', e.target.value)} />
              </div>
              <div className="pqf-field full"><label>Fuente <span className="req">*</span></label>
                <select value={form.fuente} onChange={(e) => campo('fuente', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.fuentes.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </div>
            </div>
            {errores[2] && <p className="pqf-error">⚠ {errores[2]}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="pqf-step">
            <div className="pqf-step-header">
              <span className="pqf-step-num">3</span>
              <div><h2>Tipo de usuario</h2><p>¿Quién realiza la manifestación?</p></div>
            </div>
            <div className="pqf-user-grid">
              {listas.tiposUsuario.map((t) => {
                const ui = TIPO_USUARIO_UI[t.nombre] ?? { icon: '👤' }
                const sel = tipoUsuario === t.nombre
                return (
                  <div key={t.nombre} className={`pqf-user-card${sel ? ' sel' : ''}`} onClick={() => setTipoUsuario(t.nombre)}>
                    <span className="ic">{ui.icon}</span><span className="lbl">{t.nombre}</span>
                  </div>
                )
              })}
            </div>
            <div className="pqf-grid">
              <div className="pqf-field"><label>Convenio / EPS <span className="req">*</span></label>
                <select value={form.convenio} onChange={(e) => campo('convenio', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.convenios.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </div>
              <div className="pqf-field"><label>Régimen <span className="req">*</span></label>
                <select value={form.regimen} onChange={(e) => campo('regimen', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.regimenes.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </div>
            </div>
            {errores[3] && <p className="pqf-error">⚠ {errores[3]}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="pqf-step">
            <div className="pqf-step-header">
              <span className="pqf-step-num">4</span>
              <div><h2>Datos personales</h2><p>Información de contacto del paciente</p></div>
            </div>
            <div className="pqf-grid">
              <div className="pqf-field full"><label>Nombre y apellido del paciente <span className="req">*</span></label>
                <input value={form.nombre_paciente} onChange={(e) => campo('nombre_paciente', e.target.value)} placeholder="Ej: Juan Carlos Pérez García" />
              </div>
              <div className="pqf-field"><label>Número de identificación <span className="req">*</span></label>
                <input value={form.numero_id} onChange={(e) => campo('numero_id', e.target.value)} placeholder="Ej: 12345678" />
              </div>
              <div className="pqf-field"><label>Teléfono de contacto</label>
                <input type="tel" value={form.telefono} onChange={(e) => campo('telefono', e.target.value)} placeholder="Ej: 3001234567" />
              </div>
              <div className="pqf-field full"><label>Dirección de residencia</label>
                <input value={form.direccion} onChange={(e) => campo('direccion', e.target.value)} placeholder="Ej: Calle 10 #5-23, Barrio Centro" />
              </div>
              <div className="pqf-field full"><label>Correo electrónico del reportante</label>
                <input type="email" value={form.email_reporta} onChange={(e) => campo('email_reporta', e.target.value)} placeholder="Ej: ejemplo@correo.com" />
              </div>
            </div>
            {errores[4] && <p className="pqf-error">⚠ {errores[4]}</p>}
          </div>
        )}

        {step === 5 && (
          <div className="pqf-step">
            <div className="pqf-step-header">
              <span className="pqf-step-num">5</span>
              <div><h2>Descripción del caso</h2><p>Detalle su PQRSF y la falla identificada</p></div>
            </div>
            <div className="pqf-grid">
              <div className="pqf-field full"><label>Describa su PQRSF <span className="req">*</span></label>
                <textarea rows={4} value={form.descripcion} onChange={(e) => campo('descripcion', e.target.value.slice(0, 1000))}
                  placeholder="Describa con detalle su petición, queja, reclamo, sugerencia o felicitación…" />
                <div className="pqf-char-count">{form.descripcion.length}/1000</div>
              </div>
              <div className="pqf-field full"><label>Falla o atributo identificado <span className="req">*</span></label>
                <FallaSelect fallas={listas.fallas} valor={form.falla} onChange={(v) => campo('falla', v)} />
              </div>
              <div className="pqf-field"><label>Especialidad</label>
                <select value={form.especialidad} onChange={(e) => campo('especialidad', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.especialidades.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </select>
              </div>
              <div className="pqf-field"><label>Colaborador involucrado <span className="req">*</span></label>
                <input value={form.colaborador} onChange={(e) => campo('colaborador', e.target.value)} placeholder="Nombre del colaborador" />
              </div>
              <div className="pqf-field full"><label>Días hábiles para responder <span className="req">*</span></label>
                <div className="pqf-plazo-options">
                  {PLAZOS_RESPUESTA.map((p) => (
                    <div key={p} className={`pqf-plazo-option${plazo === p ? ' sel' : ''}`} onClick={() => setPlazo(p)}>
                      <span className="pqf-plazo-radio" /><span className="pqf-plazo-text">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pqf-field full"><label>Documento adjunto <span style={{ color: 'var(--gray-500)', fontWeight: 400 }}>(opcional)</span></label>
                {!archivo ? (
                  <label className="pqf-file-drop">
                    <span className="ic">📎</span>
                    <span>Haga clic para adjuntar un archivo</span>
                    <small>PDF, DOC, DOCX, TXT, PNG o JPG · máx. 10 MB</small>
                    <input type="file" accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg" onChange={onArchivo} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div className="pqf-file-preview">
                    <span className="name">{archivo.name}</span>
                    <span className="size">{(archivo.size / 1024).toFixed(0)} KB</span>
                    <button type="button" className="pqf-file-remove" onClick={() => setArchivo(null)}>✕</button>
                  </div>
                )}
              </div>
            </div>
            {errores[5] && <p className="pqf-error">⚠ {errores[5]}</p>}
          </div>
        )}

        {step === 6 && (
          <div className="pqf-step">
            <div className="pqf-step-header">
              <span className="pqf-step-num">6</span>
              <div><h2>Resumen de su PQRSF</h2><p>Verifique la información antes de enviar</p></div>
            </div>
            <div className="pqf-summary-grid">
              {[
                ['Tipo', tipoReporte], ['Entidad', form.entidad], ['Sede', form.sede],
                ['Proceso', procesoSel.join(', ') || '—'],
                ['Manifestación', form.fecha_manifestacion], ['Fuente', form.fuente],
                ['Usuario', tipoUsuario], ['Convenio/EPS', form.convenio], ['Régimen', form.regimen],
                ['Paciente', form.nombre_paciente], ['Identificación', form.numero_id],
                ['Teléfono', form.telefono || '—'], ['Email', form.email_reporta || '—'],
                ['Especialidad', form.especialidad || '—'], ['Adjunto', archivo?.name || '—'],
                ['Plazo respuesta', plazo],
              ].map(([label, value]) => (
                <div key={label} className="pqf-summary-item">
                  <div className="s-label">{label}</div>
                  <div className="s-value">{value}</div>
                </div>
              ))}
              <div className="pqf-summary-item full">
                <div className="s-label">Falla / Atributo</div>
                <div className="s-value">{form.falla}</div>
              </div>
              <div className="pqf-summary-item full">
                <div className="s-label">Descripción</div>
                <div className="s-value">{form.descripcion}</div>
              </div>
            </div>
            <div className="pqf-privacy">Sus datos son confidenciales y solo serán usados para dar trámite a esta PQRSF.</div>
            {errorEnvio && <p className="pqf-error">⚠ {errorEnvio}</p>}
          </div>
        )}

        <div style={{ padding: '0 28px 28px' }}>
          <div className="pqf-nav">
            {step > 1 ? <button className="pqf-btn pqf-btn-secondary" onClick={anterior} disabled={!!enviando}>← Anterior</button> : <span />}
            {step < 6 && step > 1 && <button className="pqf-btn pqf-btn-primary" onClick={siguiente}>Siguiente →</button>}
            {step === 6 && <button className="pqf-btn pqf-btn-primary" onClick={enviar} disabled={!!enviando}>{enviando || 'Enviar PQRSF'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function colorDeTipo(nombre: string): string {
  const map: Record<string, string> = { 'Petición': 'blue', Queja: 'orange', Reclamo: 'red', Sugerencia: 'green', 'Felicitación': 'gold' }
  return map[nombre] ?? 'blue'
}
