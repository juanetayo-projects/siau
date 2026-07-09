import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { exportarExcel } from '../../lib/exportExcel'
import { PageHeader, FilterBar, Campo, Input, Boton, Spinner } from '../../components/ui'

export default function Reportes() {
  return (
    <div className="space-y-8">
      <PageHeader titulo="Reportes" subtitulo="Exportación a Excel de PQRSF y Satisfacción" />
      <ReportePqrsf />
      <ReporteSatisfaccion />
    </div>
  )
}

function ReportePqrsf() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [generando, setGenerando] = useState(false)
  const [total, setTotal] = useState<number | null>(null)

  async function generar() {
    setGenerando(true)
    try {
      let q = supabase.from('reportes_pqrsf')
        .select('id,tipo_reporte,estado,entidad,sede,proceso,fuente,fecha_manifestacion,nombre_paciente,numero_identificacion,telefono,email_reporta,falla_atributo,especialidad,colaborador,dias_habiles,descripcion,respuestas_pqrsf(fecha_respuesta,respondido_por_nombre,respuesta)')
        .order('id', { ascending: false })
      if (desde) q = q.gte('fecha_manifestacion', desde)
      if (hasta) q = q.lte('fecha_manifestacion', hasta)
      const { data } = await q
      const filas = (data ?? []).map((r: any) => ({
        radicado: `PQRSF-${String(r.id).padStart(6, '0')}`, tipo: r.tipo_reporte, estado: r.estado ?? 'Recibida',
        entidad: r.entidad, sede: r.sede, proceso: r.proceso, fuente: r.fuente, fecha_manifestacion: r.fecha_manifestacion,
        paciente: r.nombre_paciente, identificacion: r.numero_identificacion, telefono: r.telefono, email: r.email_reporta,
        falla: r.falla_atributo, especialidad: r.especialidad, colaborador: r.colaborador, dias_habiles: r.dias_habiles,
        descripcion: r.descripcion, fecha_respuesta: r.respuestas_pqrsf?.[0]?.fecha_respuesta ?? '',
        respondido_por: r.respuestas_pqrsf?.[0]?.respondido_por_nombre ?? '', respuesta: r.respuestas_pqrsf?.[0]?.respuesta ?? '',
      }))
      setTotal(filas.length)
      await exportarExcel(`PQRSF_${new Date().toISOString().slice(0, 10)}.xlsx`, 'PQRSF', [
        { header: 'Radicado', key: 'radicado', width: 16 }, { header: 'Tipo', key: 'tipo', width: 14 },
        { header: 'Estado', key: 'estado', width: 14 }, { header: 'Entidad', key: 'entidad', width: 16 },
        { header: 'Sede', key: 'sede', width: 18 }, { header: 'Proceso', key: 'proceso', width: 22 },
        { header: 'Fuente', key: 'fuente', width: 14 }, { header: 'Fecha manifestación', key: 'fecha_manifestacion', width: 16 },
        { header: 'Paciente', key: 'paciente', width: 24 }, { header: 'Identificación', key: 'identificacion', width: 16 },
        { header: 'Teléfono', key: 'telefono', width: 14 }, { header: 'Email', key: 'email', width: 24 },
        { header: 'Falla / Atributo', key: 'falla', width: 30 }, { header: 'Especialidad', key: 'especialidad', width: 18 },
        { header: 'Colaborador', key: 'colaborador', width: 20 }, { header: 'Días hábiles', key: 'dias_habiles', width: 14 },
        { header: 'Descripción', key: 'descripcion', width: 40 }, { header: 'Fecha respuesta', key: 'fecha_respuesta', width: 16 },
        { header: 'Respondido por', key: 'respondido_por', width: 20 }, { header: 'Respuesta', key: 'respuesta', width: 40 },
      ], filas)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">PQRSF</h2>
      <FilterBar>
        <Campo label="Desde (fecha manifestación)"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
        <Campo label="Hasta"><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo>
        <Boton onClick={generar} disabled={generando}>{generando ? 'Generando…' : '⬇ Descargar Excel'}</Boton>
      </FilterBar>
      {generando && <Spinner texto="Generando archivo…" />}
      {total != null && !generando && <p className="text-sm text-slate-500">Se exportaron {total} registros.</p>}
    </section>
  )
}

function ReporteSatisfaccion() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [generando, setGenerando] = useState(false)
  const [total, setTotal] = useState<number | null>(null)

  async function generar() {
    setGenerando(true)
    try {
      let q = supabase.from('satisfaccion_respuestas').select('*').order('fecha', { ascending: false })
      if (desde) q = q.gte('fecha', desde)
      if (hasta) q = q.lte('fecha', hasta + 'T23:59:59')
      const { data } = await q
      const filas = (data ?? []).map((r: any) => ({
        fecha: r.fecha, paciente: r.nombre_completo, identificacion: r.numero_identificacion, telefono: r.telefono,
        sede: r.sede, entidad: r.entidad_salud, servicio: r.servicio, recepcion: r.p1_recepcion, personal: r.p2_personal_asistencial,
        comodidad: r.p3_comodidad, experiencia: r.p4_experiencia_global, motivo_insatisfaccion: r.p5_motivo_insatisfaccion,
        recomienda: r.p6_recomendaria, comentarios: r.comentarios,
      }))
      setTotal(filas.length)
      await exportarExcel(`Satisfaccion_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Satisfacción', [
        { header: 'Fecha', key: 'fecha', width: 20 }, { header: 'Paciente', key: 'paciente', width: 24 },
        { header: 'Identificación', key: 'identificacion', width: 16 }, { header: 'Teléfono', key: 'telefono', width: 14 },
        { header: 'Sede', key: 'sede', width: 22 }, { header: 'Entidad', key: 'entidad', width: 18 },
        { header: 'Servicio', key: 'servicio', width: 26 }, { header: 'Recepción', key: 'recepcion', width: 12 },
        { header: 'Personal asistencial', key: 'personal', width: 16 }, { header: 'Comodidad', key: 'comodidad', width: 12 },
        { header: 'Experiencia global', key: 'experiencia', width: 16 }, { header: 'Motivo insatisfacción', key: 'motivo_insatisfaccion', width: 30 },
        { header: '¿Recomienda?', key: 'recomienda', width: 12 }, { header: 'Comentarios', key: 'comentarios', width: 40 },
      ], filas)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">Satisfacción</h2>
      <FilterBar>
        <Campo label="Desde"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Campo>
        <Campo label="Hasta"><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Campo>
        <Boton onClick={generar} disabled={generando}>{generando ? 'Generando…' : '⬇ Descargar Excel'}</Boton>
      </FilterBar>
      {generando && <Spinner texto="Generando archivo…" />}
      {total != null && !generando && <p className="text-sm text-slate-500">Se exportaron {total} registros.</p>}
    </section>
  )
}
