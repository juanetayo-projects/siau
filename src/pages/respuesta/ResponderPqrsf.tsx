import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import '../../styles/pqrsf-form.css'

const TIPO_CONFIG: Record<string, { color: string }> = {
  'Petición': { color: '#2471c8' }, Queja: { color: '#ea580c' }, Reclamo: { color: '#dc2626' },
  Sugerencia: { color: '#16a34a' }, 'Felicitación': { color: '#ca8a04' },
}
const ETAPAS = ['Recibida', 'En gestión', 'Respondida', 'Cerrada']
const PASOS = [
  { icono: '🔍', label: 'Radicado' },
  { icono: '✏️', label: 'Respuesta' },
  { icono: '📎', label: 'Adjunto' },
  { icono: '✅', label: 'Resumen' },
]

type Reporte = {
  id: number; tipo_reporte: string | null; estado: string | null; entidad: string | null; sede: string | null
  proceso: string | null; fuente: string | null; fecha_manifestacion: string | null
  nombre_paciente: string | null; numero_identificacion: string | null; telefono: string | null
  tipo_usuario: string | null; convenio_eps: string | null; regimen: string | null; email_reporta: string | null
  falla_atributo: string | null; especialidad: string | null; colaborador: string | null; descripcion: string | null
}

function campoValor(v: string | null | undefined) {
  return v && v.trim() ? v : <span className="pqf-record-value empty">—</span>
}

export default function ResponderPqrsf() {
  const { perfil } = useAuth()
  const [step, setStep] = useState(1)
  const [radicadoInput, setRadicadoInput] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [noEncontrado, setNoEncontrado] = useState<string | null>(null)
  const [reporte, setReporte] = useState<Reporte | null>(null)

  const [fechaRespuesta, setFechaRespuesta] = useState(new Date().toISOString().slice(0, 10))
  const [respondidoPor, setRespondidoPor] = useState(perfil?.nombre ?? '')
  const [correoResponsable, setCorreoResponsable] = useState('')
  const [respuestaTexto, setRespuestaTexto] = useState('')
  const [colaborador, setColaborador] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)

  const [errores, setErrores] = useState<Record<number, string>>({})
  const [enviando, setEnviando] = useState('')
  const [errorEnvio, setErrorEnvio] = useState('')
  const [radicadoFinal, setRadicadoFinal] = useState('')
  const [notaCorreo, setNotaCorreo] = useState('')

  async function buscar() {
    const match = radicadoInput.trim().match(/(\d+)$/)
    if (!match) { setErrores((e) => ({ ...e, 1: 'Formato inválido. Use: PQRSF-000001 o simplemente el número.' })); return }
    setErrores((e) => ({ ...e, 1: '' }))
    setBuscando(true); setNoEncontrado(null); setReporte(null)
    const id = parseInt(match[1], 10)
    const { data, error } = await supabase.from('reportes_pqrsf').select('*').eq('id', id).single()
    setBuscando(false)
    if (error || !data) { setNoEncontrado('No se encontró ningún PQRSF con ese número de radicado.'); return }

    if (perfil && perfil.rol !== 'admin' && perfil.proceso) {
      const userProceso = perfil.proceso.trim().toLowerCase()
      const procesosReporte = (data.proceso ?? '').split(',').map((p: string) => p.trim().toLowerCase())
      if (!procesosReporte.includes(userProceso)) {
        setNoEncontrado('Sin acceso a este radicado: pertenece a un proceso diferente al suyo. Si cree que es un error, contacte al administrador.')
        return
      }
    }
    setReporte(data as Reporte)
  }

  function validarPaso2() {
    if (!fechaRespuesta) return 'La fecha de respuesta es obligatoria.'
    if (!respondidoPor.trim()) return 'Ingrese el nombre del responsable.'
    if (!respuestaTexto.trim()) return 'La respuesta oficial es obligatoria.'
    return ''
  }

  function siguiente() {
    if (step === 1 && !reporte) { setErrores((e) => ({ ...e, 1: 'Primero busque un radicado válido.' })); return }
    if (step === 2) {
      const err = validarPaso2()
      setErrores((e) => ({ ...e, 2: err }))
      if (err) return
    }
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
    if (!permitidos.includes(f.type)) { setErrores((e) => ({ ...e, 3: 'Tipo de archivo no permitido. Use PDF, DOC, DOCX, TXT, PNG o JPG.' })); return }
    if (f.size > 10 * 1024 * 1024) { setErrores((e) => ({ ...e, 3: 'El archivo supera los 10 MB.' })); return }
    setErrores((e) => ({ ...e, 3: '' }))
    setArchivo(f)
  }

  async function enviar() {
    if (!reporte) return
    setErrorEnvio('')
    try {
      let archivoUrl: string | null = null
      let archivoNombre: string | null = null
      if (archivo) {
        setEnviando('Subiendo documento…')
        const ext = archivo.name.split('.').pop()
        const name = `resp_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('pqrsf-adjuntos').upload(name, archivo, { contentType: archivo.type, upsert: false })
        if (!error) {
          archivoUrl = supabase.storage.from('pqrsf-adjuntos').getPublicUrl(name).data.publicUrl
          archivoNombre = archivo.name
        }
      }

      const radicado = `PQRSF-${String(reporte.id).padStart(6, '0')}`
      setEnviando('Registrando respuesta…')
      const payload = {
        reporte_id: reporte.id, numero_radicado: radicado, fecha_respuesta: fechaRespuesta,
        respuesta: respuestaTexto, colaborador: colaborador || null,
        respondido_por_nombre: respondidoPor, respondido_por_email: correoResponsable || null,
        archivo_url: archivoUrl, archivo_nombre: archivoNombre,
      }
      const { data: respData, error: respError } = await supabase.from('respuestas_pqrsf').insert([payload]).select().single()
      if (respError) throw respError

      await supabase.from('reportes_pqrsf').update({ estado: 'Respondida' }).eq('id', reporte.id)

      let nota = ''
      if (reporte.email_reporta) {
        setEnviando('Enviando notificación…')
        try {
          const { error: fnErr } = await supabase.functions.invoke('notify-respuesta', {
            body: { respuesta: { ...payload, id: respData.id }, reporte: { ...reporte } },
          })
          nota = fnErr ? '⚠️ Respuesta guardada. El correo no pudo enviarse.' : `📧 Notificación enviada a ${reporte.email_reporta}`
        } catch {
          nota = '⚠️ Respuesta guardada. El correo no pudo enviarse.'
        }
      } else {
        nota = '⚠️ El usuario no tiene correo registrado. Respuesta guardada sin notificación.'
      }

      setRadicadoFinal(radicado)
      setNotaCorreo(nota)
      setStep(5)
    } catch (e: any) {
      setErrorEnvio('Error al guardar: ' + (e.message ?? String(e)))
    } finally {
      setEnviando('')
    }
  }

  function reiniciar() {
    setStep(1); setRadicadoInput(''); setReporte(null); setNoEncontrado(null)
    setFechaRespuesta(new Date().toISOString().slice(0, 10)); setRespondidoPor(perfil?.nombre ?? '')
    setCorreoResponsable(''); setRespuestaTexto(''); setColaborador(''); setArchivo(null)
    setErrores({}); setErrorEnvio(''); setRadicadoFinal(''); setNotaCorreo('')
  }

  const cfg = reporte ? (TIPO_CONFIG[reporte.tipo_reporte ?? ''] ?? { color: '#1a4f9b' }) : null
  const etapaIdx = reporte ? ETAPAS.indexOf(reporte.estado ?? 'Recibida') : -1

  if (step === 5) {
    return (
      <div className="pqf">
        <div className="pqf-container">
          <div className="pqf-step pqf-success">
            <div className="pqf-success-circle">✓</div>
            <h2>¡Respuesta registrada exitosamente!</h2>
            <p>{notaCorreo}</p>
            <div className="pqf-ticket">
              <span className="pqf-ticket-label">Radicado respondido</span>
              <span className="pqf-ticket-number">{radicadoFinal}</span>
            </div>
            <div><button className="pqf-btn pqf-btn-success" onClick={reiniciar}>Responder otro radicado</button></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pqf">
      <h1 className="mb-1 text-lg font-bold text-[#0D2D6B]">Responder PQRSF</h1>
      <p className="mb-4 text-sm text-slate-500">{perfil ? perfil.nombre : ''}</p>

      <div className="pqf-container">
        <div className="pqf-steps-h">
          {PASOS.map((p, i) => {
            const n = i + 1
            const cls = n < step ? 'done' : n === step ? 'active' : ''
            return (
              <span key={p.label} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span className="pqf-step-sep">›</span>}
                <span className={`pqf-step-h ${cls}`}>{n < step ? '✓' : p.icono} {p.label}</span>
              </span>
            )
          })}
        </div>
        <div className="pqf-progress-wrap" style={{ margin: '12px 0 0' }}><div className="pqf-progress-bar" style={{ width: `${(step / 4) * 100}%` }} /></div>

        {step === 1 && (
          <div className="pqf-step">
            <div className="pqf-step-header"><span className="pqf-step-num">1</span>
              <div><h2>Buscar radicado PQRSF</h2><p>Ingrese el número de radicado a responder</p></div>
            </div>
            <div className="pqf-search-wrap">
              <input value={radicadoInput} onChange={(e) => setRadicadoInput(e.target.value)}
                placeholder="Ej: PQRSF-000001  o  1" onKeyDown={(e) => e.key === 'Enter' && buscar()} />
              <button className="pqf-btn-search" onClick={buscar} disabled={buscando}>{buscando ? 'Buscando…' : 'Buscar'}</button>
            </div>
            {errores[1] && <p className="pqf-error">⚠ {errores[1]}</p>}

            {noEncontrado && (
              <div className="pqf-not-found" style={{ marginTop: 16 }}>
                <span className="ic">🔎</span>{noEncontrado}
              </div>
            )}

            {reporte && cfg && (
              <div className="pqf-card" style={{ marginTop: 16 }}>
                <div className="pqf-card-header">
                  <span className="pqf-card-radicado">PQRSF-{String(reporte.id).padStart(6, '0')}</span>
                  <div className="pqf-card-badges">
                    <span className="pqf-badge-tipo" style={{ background: cfg.color }}>{reporte.tipo_reporte ?? '—'}</span>
                    <span className="pqf-badge-estado">{reporte.estado ?? 'Recibida'}</span>
                  </div>
                </div>
                <div className="pqf-status-bar">
                  {ETAPAS.map((e, i) => (
                    <div key={e} className={`pqf-status-stage ${i < etapaIdx ? 'done' : i === etapaIdx ? 'current' : ''}`}>
                      {i < etapaIdx ? '✓ ' : ''}{e}
                    </div>
                  ))}
                </div>
                <div className="pqf-card-body">
                  <div className="pqf-section-title">Información institucional</div>
                  <div className="pqf-record-grid">
                    <Campo l="Entidad" v={reporte.entidad} /><Campo l="Sede" v={reporte.sede} />
                    <Campo l="Proceso / Servicio" v={reporte.proceso} /><Campo l="Fuente" v={reporte.fuente} />
                    <Campo l="Fecha manifestación" v={reporte.fecha_manifestacion} /><Campo l="Estado actual" v={reporte.estado} />
                  </div>
                  <div className="pqf-section-title">Datos del usuario</div>
                  <div className="pqf-record-grid">
                    <Campo l="Paciente" v={reporte.nombre_paciente} /><Campo l="Identificación" v={reporte.numero_identificacion} />
                    <Campo l="Teléfono" v={reporte.telefono} /><Campo l="Tipo usuario" v={reporte.tipo_usuario} />
                    <Campo l="Convenio / EPS" v={reporte.convenio_eps} /><Campo l="Régimen" v={reporte.regimen} />
                    <div className="pqf-record-field full"><div className="pqf-record-label">Correo notificación</div><div className="pqf-record-value">{campoValor(reporte.email_reporta)}</div></div>
                  </div>
                  <div className="pqf-section-title">Descripción del caso</div>
                  <div className="pqf-record-grid">
                    <Campo l="Falla / Atributo" v={reporte.falla_atributo} /><Campo l="Especialidad" v={reporte.especialidad} />
                    <Campo l="Colaborador" v={reporte.colaborador} />
                  </div>
                  {reporte.descripcion && (
                    <div className="pqf-record-desc">
                      <div className="pqf-record-label">Descripción completa</div>
                      <div className="pqf-record-value">{reporte.descripcion}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && reporte && (
          <div className="pqf-step">
            <div className="pqf-step-header"><span className="pqf-step-num">2</span>
              <div><h2>Datos de la respuesta</h2><p>PQRSF-{String(reporte.id).padStart(6, '0')} · {reporte.nombre_paciente}</p></div>
            </div>
            <div className="pqf-grid">
              <div className="pqf-field"><label>Fecha de respuesta <span className="req">*</span></label>
                <input type="date" value={fechaRespuesta} onChange={(e) => setFechaRespuesta(e.target.value)} />
              </div>
              <div className="pqf-field"><label>Respondido por (nombre) <span className="req">*</span></label>
                <input value={respondidoPor} onChange={(e) => setRespondidoPor(e.target.value)} placeholder="Nombre completo del responsable" />
              </div>
              <div className="pqf-field full"><label>Correo del responsable</label>
                <input type="email" value={correoResponsable} onChange={(e) => setCorreoResponsable(e.target.value)} placeholder="correo@cacsantabarbara.co" />
              </div>
              <div className="pqf-field full"><label>Respuesta oficial <span className="req">*</span></label>
                <textarea rows={5} value={respuestaTexto} onChange={(e) => setRespuestaTexto(e.target.value.slice(0, 2000))}
                  placeholder="Escriba la respuesta oficial que se comunicará al usuario…" />
                <div className="pqf-char-count">{respuestaTexto.length}/2000</div>
              </div>
              <div className="pqf-field full"><label>Colaborador involucrado en la manifestación</label>
                <input value={colaborador} onChange={(e) => setColaborador(e.target.value)} placeholder="Nombre del colaborador (si aplica)" />
              </div>
            </div>
            {errores[2] && <p className="pqf-error">⚠ {errores[2]}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="pqf-step">
            <div className="pqf-step-header"><span className="pqf-step-num">3</span>
              <div><h2>Documento adjunto</h2><p>Opcional — soporte de la respuesta</p></div>
            </div>
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
            {errores[3] && <p className="pqf-error">⚠ {errores[3]}</p>}
          </div>
        )}

        {step === 4 && reporte && (
          <div className="pqf-step">
            <div className="pqf-step-header"><span className="pqf-step-num">4</span>
              <div><h2>Resumen de la respuesta</h2><p>Verifique antes de enviar</p></div>
            </div>
            <div className="pqf-kv-grid">
              <Fila l="Radicado" v={`PQRSF-${String(reporte.id).padStart(6, '0')}`} />
              <Fila l="Tipo de solicitud" v={reporte.tipo_reporte} />
              <Fila l="Paciente" v={reporte.nombre_paciente} />
              <Fila l="Correo paciente" v={reporte.email_reporta || 'No registrado'} />
              <Fila l="Fecha de respuesta" v={fechaRespuesta} />
              <Fila l="Respondido por" v={respondidoPor} />
              <Fila l="Correo responsable" v={correoResponsable || '—'} />
              <Fila l="Colaborador involucrado" v={colaborador || '—'} />
              {archivo && <Fila l="Archivo adjunto" v={`${archivo.name} (${(archivo.size / 1024).toFixed(0)} KB)`} />}
              <div className="pqf-kv-label">Respuesta oficial</div>
              <div className="pqf-kv-value full">{respuestaTexto}</div>
            </div>
            {errorEnvio && <p className="pqf-error">⚠ {errorEnvio}</p>}
          </div>
        )}

        <div style={{ padding: '0 28px 28px' }}>
          <div className="pqf-nav">
            {step > 1 ? <button className="pqf-btn pqf-btn-secondary" onClick={anterior} disabled={!!enviando}>← Anterior</button> : <span />}
            {step < 4 && <button className="pqf-btn pqf-btn-primary" onClick={siguiente}>Siguiente →</button>}
            {step === 4 && <button className="pqf-btn pqf-btn-primary" onClick={enviar} disabled={!!enviando}>{enviando || 'Registrar y notificar'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Campo({ l, v }: { l: string; v: string | null | undefined }) {
  return <div className="pqf-record-field"><div className="pqf-record-label">{l}</div><div className={`pqf-record-value${!v ? ' empty' : ''}`}>{v || '—'}</div></div>
}
function Fila({ l, v }: { l: string; v: string | null | undefined }) {
  return <><div className="pqf-kv-label">{l}</div><div className="pqf-kv-value">{v || '—'}</div></>
}
