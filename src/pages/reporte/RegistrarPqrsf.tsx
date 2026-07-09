import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Boton, Input, Select, Textarea, Campo, PageHeader, Spinner } from '../../components/ui'
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

function agruparFallas(fallas: ListaFalla[]) {
  const grupos: Record<string, string[]> = {}
  fallas.forEach((f) => {
    const g = f.grupo || 'Otros'
    grupos[g] = grupos[g] ?? []
    grupos[g].push(f.nombre)
  })
  return grupos
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
        supabase.from('lista_entidades').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_sedes').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_procesos').select('nombre,correo').eq('activo', true).order('orden'),
        supabase.from('lista_fuentes').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_tipo_usuario').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_convenios').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_regimen').select('nombre').eq('activo', true).order('orden'),
        supabase.from('lista_fallas').select('nombre,grupo').eq('activo', true).order('orden'),
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

  function toggleProceso(nombre: string) {
    setProcesoSel((prev) => (prev.includes(nombre) ? prev.filter((p) => p !== nombre) : [...prev, nombre]))
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

  if (!listas) return <Spinner texto="Cargando formulario…" />

  const fallasAgrupadas = agruparFallas(listas.fallas)
  const nivelFalla = form.falla ? FALLA_SEMAFORO[form.falla] : undefined
  const cfgFalla = nivelFalla ? SEMAFORO_CFG[nivelFalla] : null

  if (step === 7) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-md">
        <p className="text-5xl">✅</p>
        <h2 className="mt-3 text-xl font-bold text-emerald-800">¡PQRSF registrada exitosamente!</h2>
        <p className="mt-2 text-sm text-emerald-700">Número de radicado</p>
        <p className="mt-1 text-2xl font-mono font-bold text-[#0D2D6B]">{radicado}</p>
        <Boton className="mt-6" onClick={reiniciar}>Registrar otra PQRSF</Boton>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Registrar PQRSF" subtitulo={`Paso ${step} de ${TOTAL_STEPS}${perfil ? ` · ${perfil.nombre}` : ''}`} />

      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-[#0D2D6B] to-[#16468E] transition-all" style={{ width: `${((step - 1) / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        {step === 1 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-[#0D2D6B]">¿Qué tipo de PQRSF desea registrar?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listas.tipos.map((t) => {
                const ui = TIPO_REPORTE_UI[t.nombre] ?? { icon: '📌', desc: '' }
                const sel = tipoReporte === t.nombre
                return (
                  <button key={t.nombre} type="button" onClick={() => { setTipoReporte(t.nombre); setErrores((e) => ({ ...e, 1: '' })); setStep(2) }}
                    className={`rounded-xl border-2 p-4 text-left transition ${sel ? 'border-[#16468E] bg-[#EAF0FA]' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="text-2xl">{ui.icon}</div>
                    <div className="mt-1 font-semibold text-slate-800">{t.nombre}</div>
                    <div className="mt-1 text-xs text-slate-500">{ui.desc}</div>
                  </button>
                )
              })}
            </div>
            {errores[1] && <p className="mt-3 text-sm text-rose-600">⚠ {errores[1]}</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-[#0D2D6B]">Información institucional</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Entidad que recibe la PQRSF *">
                <Select value={form.entidad} onChange={(e) => campo('entidad', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.entidades.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </Select>
              </Campo>
              <Campo label="Sede *">
                <Select value={form.sede} onChange={(e) => campo('sede', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.sedes.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </Select>
              </Campo>
              <Campo label="Fecha de la manifestación *">
                <Input type="date" value={form.fecha_manifestacion} onChange={(e) => campo('fecha_manifestacion', e.target.value)} />
              </Campo>
              <Campo label="Fuente *">
                <Select value={form.fuente} onChange={(e) => campo('fuente', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.fuentes.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </Select>
              </Campo>
              <Campo label="Fecha apertura del buzón">
                <Input type="date" value={form.fecha_apertura} onChange={(e) => campo('fecha_apertura', e.target.value)} />
              </Campo>
              <Campo label="Proceso / Servicio *" className="sm:col-span-2">
                <div className="max-h-40 overflow-auto rounded-lg border border-slate-300 p-2">
                  {listas.procesos.map((p) => (
                    <label key={p.nombre} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[#EAF0FA]">
                      <input type="checkbox" checked={procesoSel.includes(p.nombre)} onChange={() => toggleProceso(p.nombre)} />
                      {p.nombre}
                    </label>
                  ))}
                </div>
                {procesoSel.length > 0 && <p className="mt-1 text-xs text-slate-500">Seleccionado: {procesoSel.join(', ')}</p>}
              </Campo>
            </div>
            {errores[2] && <p className="mt-3 text-sm text-rose-600">⚠ {errores[2]}</p>}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-[#0D2D6B]">Tipo de usuario</h2>
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {listas.tiposUsuario.map((t) => {
                const ui = TIPO_USUARIO_UI[t.nombre] ?? { icon: '👤' }
                const sel = tipoUsuario === t.nombre
                return (
                  <button key={t.nombre} type="button" onClick={() => setTipoUsuario(t.nombre)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition ${sel ? 'border-[#16468E] bg-[#EAF0FA]' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="text-2xl">{ui.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{t.nombre}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Convenio / EPS *">
                <Select value={form.convenio} onChange={(e) => campo('convenio', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.convenios.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </Select>
              </Campo>
              <Campo label="Régimen *">
                <Select value={form.regimen} onChange={(e) => campo('regimen', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {listas.regimenes.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                </Select>
              </Campo>
            </div>
            {errores[3] && <p className="mt-3 text-sm text-rose-600">⚠ {errores[3]}</p>}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-[#0D2D6B]">Datos personales</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Nombre y apellido del paciente *">
                <Input value={form.nombre_paciente} onChange={(e) => campo('nombre_paciente', e.target.value)} placeholder="Ej: Juan Carlos Pérez García" />
              </Campo>
              <Campo label="Número de identificación *">
                <Input value={form.numero_id} onChange={(e) => campo('numero_id', e.target.value)} placeholder="Ej: 12345678" />
              </Campo>
              <Campo label="Teléfono de contacto">
                <Input type="tel" value={form.telefono} onChange={(e) => campo('telefono', e.target.value)} placeholder="Ej: 3001234567" />
              </Campo>
              <Campo label="Dirección de residencia">
                <Input value={form.direccion} onChange={(e) => campo('direccion', e.target.value)} placeholder="Ej: Calle 10 #5-23, Barrio Centro" />
              </Campo>
              <Campo label="Correo electrónico del reportante" className="sm:col-span-2">
                <Input type="email" value={form.email_reporta} onChange={(e) => campo('email_reporta', e.target.value)} placeholder="Ej: ejemplo@correo.com" />
              </Campo>
            </div>
            {errores[4] && <p className="mt-3 text-sm text-rose-600">⚠ {errores[4]}</p>}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-[#0D2D6B]">Descripción del caso</h2>
            <div className="grid grid-cols-1 gap-4">
              <Campo label="Describa su PQRSF *">
                <Textarea rows={5} value={form.descripcion} onChange={(e) => campo('descripcion', e.target.value.slice(0, 1000))}
                  placeholder="Describa con detalle su petición, queja, reclamo, sugerencia o felicitación…" />
                <span className="text-xs text-slate-400">{form.descripcion.length}/1000</span>
              </Campo>
              <Campo label="Falla o atributo identificado *">
                <Select value={form.falla} onChange={(e) => campo('falla', e.target.value)}>
                  <option value="">— Seleccione —</option>
                  {Object.entries(fallasAgrupadas).map(([grupo, items]) => (
                    <optgroup key={grupo} label={grupo}>
                      {items.map((n) => <option key={n} value={n}>{n}</option>)}
                    </optgroup>
                  ))}
                </Select>
                {cfgFalla && (
                  <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: cfgFalla.bg, color: cfgFalla.fg }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: cfgFalla.dot }} /> {cfgFalla.label}
                  </span>
                )}
              </Campo>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Especialidad">
                  <Select value={form.especialidad} onChange={(e) => campo('especialidad', e.target.value)}>
                    <option value="">— Seleccione —</option>
                    {listas.especialidades.map((x) => <option key={x.nombre} value={x.nombre}>{x.nombre}</option>)}
                  </Select>
                </Campo>
                <Campo label="Colaborador involucrado *">
                  <Input value={form.colaborador} onChange={(e) => campo('colaborador', e.target.value)} placeholder="Nombre del colaborador" />
                </Campo>
              </div>
              <Campo label="Días hábiles para responder *">
                <div className="flex flex-wrap gap-2">
                  {PLAZOS_RESPUESTA.map((p) => (
                    <button key={p} type="button" onClick={() => setPlazo(p)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm transition ${plazo === p ? 'border-[#16468E] bg-[#EAF0FA] font-semibold text-[#0D2D6B]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </Campo>
              <Campo label="Documento adjunto (opcional)">
                <input type="file" accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg" onChange={onArchivo}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF0FA] file:px-3 file:py-1.5 file:text-[#0D2D6B]" />
                {archivo && <p className="mt-1 text-xs text-slate-500">{archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)</p>}
              </Campo>
            </div>
            {errores[5] && <p className="mt-3 text-sm text-rose-600">⚠ {errores[5]}</p>}
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="mb-4 text-base font-bold text-[#0D2D6B]">Resumen de su PQRSF</h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                ['Tipo de PQRSF', tipoReporte], ['Entidad', form.entidad], ['Sede', form.sede],
                ['Proceso / Servicio', procesoSel.join(', ') || '—'],
                ['Fecha manifestación', form.fecha_manifestacion], ['Fuente', form.fuente],
                ['Tipo de usuario', tipoUsuario], ['Convenio / EPS', form.convenio], ['Régimen', form.regimen],
                ['Nombre del paciente', form.nombre_paciente], ['Identificación', form.numero_id],
                ['Teléfono', form.telefono || '—'], ['Email reportante', form.email_reporta || '—'],
                ['Especialidad', form.especialidad || '—'], ['Documento adjunto', archivo?.name || '—'],
                ['Falla / Atributo', form.falla], ['Días hábiles para responder', plazo],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-500">{label}</div>
                  <div className="text-slate-800">{value}</div>
                </div>
              ))}
              <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
                <div className="text-xs font-medium text-slate-500">Descripción</div>
                <div className="whitespace-pre-wrap text-slate-800">{form.descripcion}</div>
              </div>
            </div>
            {errorEnvio && <p className="mt-3 text-sm text-rose-600">⚠ {errorEnvio}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          {step > 1 ? <Boton variante="secundario" onClick={anterior} disabled={!!enviando}>← Anterior</Boton> : <span />}
          {step < 6 && step > 1 && <Boton onClick={siguiente}>Siguiente →</Boton>}
          {step === 6 && <Boton onClick={enviar} disabled={!!enviando}>{enviando || 'Enviar PQRSF'}</Boton>}
        </div>
      </div>
    </div>
  )
}
