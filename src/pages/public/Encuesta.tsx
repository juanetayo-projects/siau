import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SEDES, ENTIDADES, SERVICIOS, EXPERIENCIA_GLOBAL, MOTIVOS_INSATISFACCION, EXPERIENCIA_COLORS } from '../../lib/satisfaccion'
import { Boton, Input, Select, Textarea, Campo } from '../../components/ui'
import StarRating from '../../components/StarRating'

const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`

const INICIAL = {
  nombre_completo: '', numero_identificacion: '', telefono: '',
  sede: '', entidad_salud: '', servicio: '',
  p1_recepcion: null as number | null, p2_personal_asistencial: null as number | null, p3_comodidad: null as number | null,
  p4_experiencia_global: '', p5_motivo_insatisfaccion: '',
  p6_recomendaria: '' as '' | 'Si' | 'No', comentarios: '',
}

export default function Encuesta() {
  const [form, setForm] = useState(INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  function cambiar(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      const { error: err } = await supabase.from('satisfaccion_respuestas').insert([{
        ...form,
        p4_experiencia_global: form.p4_experiencia_global || null,
        p5_motivo_insatisfaccion: form.p5_motivo_insatisfaccion || null,
        fecha: new Date().toISOString(),
      }])
      if (err) throw err
      setEnviado(true)
    } catch (e: any) {
      setError(e.message ?? 'Error al enviar. Intente de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E3E6EC] p-4">
        <div className="neu-card w-full max-w-md rounded-3xl p-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">✓</div>
          <h2 className="mb-3 text-2xl font-bold text-gray-800">¡Gracias por su opinión!</h2>
          <p className="mb-8 text-gray-500">
            Su evaluación ha sido registrada exitosamente. Su retroalimentación nos ayuda a mejorar continuamente la calidad del servicio.
          </p>
          <Boton onClick={() => { setForm(INICIAL); setEnviado(false) }}>Registrar otra encuesta</Boton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E3E6EC]">
      <div className="bg-gradient-to-r from-[#0D2D6B] to-[#16468E] text-white">
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <img src={LOGO_BLANCO} alt="Clínica de Alta Complejidad Santa Bárbara" className="mx-auto h-16 object-contain drop-shadow-md" />
          <h1 className="mt-4 mb-1 text-2xl font-extrabold">Encuesta de Satisfacción</h1>
          <p className="text-sm text-white/80">Su opinión es muy importante para nosotros</p>
        </div>
      </div>

      <form onSubmit={enviar} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <section className="neu-card rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0D2D6B]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF0FA] text-xs font-bold text-[#0D2D6B]">1</span>
            Datos del paciente
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nombre completo" className="sm:col-span-2">
              <Input name="nombre_completo" value={form.nombre_completo} onChange={cambiar} placeholder="Ingrese su nombre completo" />
            </Campo>
            <Campo label="Número de identificación">
              <Input name="numero_identificacion" value={form.numero_identificacion} onChange={cambiar} placeholder="Cédula / Tarjeta de identidad" />
            </Campo>
            <Campo label="Teléfono de contacto">
              <Input name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="3XX XXX XXXX" />
            </Campo>
          </div>
        </section>

        <section className="neu-card rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0D2D6B]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF0FA] text-xs font-bold text-[#0D2D6B]">2</span>
            Información de la atención
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Sede de atención *">
              <Select name="sede" value={form.sede} onChange={cambiar} required>
                <option value="">— Seleccione —</option>
                {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Campo>
            <Campo label="Entidad de salud *">
              <Select name="entidad_salud" value={form.entidad_salud} onChange={cambiar} required>
                <option value="">— Seleccione —</option>
                {ENTIDADES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Campo>
            <Campo label="Servicio en que fue atendido *" className="sm:col-span-2">
              <Select name="servicio" value={form.servicio} onChange={cambiar} required>
                <option value="">— Seleccione —</option>
                {SERVICIOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Campo>
          </div>
        </section>

        <section className="neu-card rounded-2xl p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-[#0D2D6B]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF0FA] text-xs font-bold text-[#0D2D6B]">3</span>
            Calificación del servicio
          </h2>
          <p className="neu-inset mb-5 rounded-xl px-4 py-2 text-xs text-gray-500">
            Seleccione un número del 1 al 5 siendo <strong>1 = Muy malo</strong> y <strong>5 = Excelente</strong>
          </p>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Recepción</label>
              <StarRating value={form.p1_recepcion} onChange={(v) => setForm((f) => ({ ...f, p1_recepcion: v }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Personal asistencial</label>
              <StarRating value={form.p2_personal_asistencial} onChange={(v) => setForm((f) => ({ ...f, p2_personal_asistencial: v }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Comodidad, orden y confort</label>
              <StarRating value={form.p3_comodidad} onChange={(v) => setForm((f) => ({ ...f, p3_comodidad: v }))} />
            </div>
          </div>
        </section>

        <section className="neu-card rounded-2xl p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-[#0D2D6B]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF0FA] text-xs font-bold text-[#0D2D6B]">4</span>
            Experiencia global
          </h2>
          <label className="mb-3 block text-sm font-semibold text-gray-700">¿Cómo califica su experiencia general?</label>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCIA_GLOBAL.map((opt) => {
              const color = EXPERIENCIA_COLORS[opt]
              const selected = form.p4_experiencia_global === opt
              return (
                <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, p4_experiencia_global: opt }))}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    selected ? `${color.bg} ${color.text} neu-btn-pressed scale-105` : 'neu-btn bg-white text-gray-500'
                  }`}>
                  {opt}
                </button>
              )
            })}
          </div>
        </section>

        <section className="neu-card rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#0D2D6B]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF0FA] text-xs font-bold text-[#0D2D6B]">5</span>
            Información adicional
          </h2>
          <div className="space-y-4">
            <Campo label="Motivo de insatisfacción (opcional)">
              <Select name="p5_motivo_insatisfaccion" value={form.p5_motivo_insatisfaccion} onChange={cambiar}>
                <option value="">— Seleccione —</option>
                {MOTIVOS_INSATISFACCION.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Campo>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ¿Recomendaría nuestra IPS a sus amigos y familiares? *
              </label>
              <div className="flex gap-3">
                {(['Si', 'No'] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => setForm((f) => ({ ...f, p6_recomendaria: opt }))}
                    className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
                      form.p6_recomendaria === opt
                        ? opt === 'Si' ? 'neu-btn-pressed bg-green-500 text-white' : 'neu-btn-pressed bg-red-500 text-white'
                        : 'neu-btn bg-white text-gray-500'
                    }`}>
                    {opt === 'Si' ? '👍 Sí' : '👎 No'}
                  </button>
                ))}
              </div>
            </div>

            <Campo label="Comentarios adicionales (opcional)">
              <Textarea name="comentarios" value={form.comentarios} onChange={cambiar} rows={3} placeholder="Comparta cualquier comentario o sugerencia..." />
            </Campo>
          </div>
        </section>

        {error && <p className="neu-inset rounded-xl px-4 py-3 text-sm text-red-700">{error}</p>}

        <Boton type="submit" disabled={enviando || !form.sede || !form.entidad_salud || !form.servicio || !form.p6_recomendaria}
          className="w-full justify-center py-4 text-base">
          {enviando ? 'Enviando…' : 'Enviar encuesta'}
        </Boton>

        <p className="pb-6 text-center text-xs text-gray-400">
          Sus datos son confidenciales y serán usados únicamente para mejorar nuestros servicios.
        </p>
      </form>
    </div>
  )
}
