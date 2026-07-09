import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { MetricCard, PageHeader, Spinner } from '../../components/ui'
import { EXPERIENCIA_COLORS } from '../../lib/satisfaccion'

const TIPO_COLOR: Record<string, string> = {
  'Petición': '#2471c8', Queja: '#ea580c', Reclamo: '#dc2626', Sugerencia: '#16a34a', 'Felicitación': '#ca8a04',
}
const ESTADO_COLOR: Record<string, string> = {
  Recibida: '#94a3b8', 'En gestión': '#f59e0b', Respondida: '#10b981', Cerrada: '#64748b',
}

type ReportePQRSF = { tipo_reporte: string | null; estado: string | null }
type RespuestaSat = { p1_recepcion: number | null; p2_personal_asistencial: number | null; p3_comodidad: number | null; p4_experiencia_global: string | null; p6_recomendaria: string | null }

export default function Dashboard() {
  const [reportes, setReportes] = useState<ReportePQRSF[] | null>(null)
  const [satisfaccion, setSatisfaccion] = useState<RespuestaSat[] | null>(null)

  useEffect(() => {
    void supabase.from('reportes_pqrsf').select('tipo_reporte,estado').then(({ data }) => setReportes(data ?? []))
    void supabase.from('satisfaccion_respuestas')
      .select('p1_recepcion,p2_personal_asistencial,p3_comodidad,p4_experiencia_global,p6_recomendaria')
      .then(({ data }) => setSatisfaccion(data ?? []))
  }, [])

  const pqrsf = useMemo(() => {
    if (!reportes) return null
    const total = reportes.length
    const pendientes = reportes.filter((r) => r.estado === 'Recibida' || r.estado === 'En gestión' || !r.estado).length
    const respondidas = reportes.filter((r) => r.estado === 'Respondida' || r.estado === 'Cerrada').length
    const porTipo = Object.entries(
      reportes.reduce<Record<string, number>>((acc, r) => {
        const k = r.tipo_reporte || 'Sin tipo'
        acc[k] = (acc[k] ?? 0) + 1
        return acc
      }, {}),
    ).map(([tipo, cantidad]) => ({ tipo, cantidad }))
    const porEstado = Object.entries(
      reportes.reduce<Record<string, number>>((acc, r) => {
        const k = r.estado || 'Recibida'
        acc[k] = (acc[k] ?? 0) + 1
        return acc
      }, {}),
    ).map(([estado, cantidad]) => ({ estado, cantidad }))
    return { total, pendientes, respondidas, porTipo, porEstado }
  }, [reportes])

  const sat = useMemo(() => {
    if (!satisfaccion) return null
    const total = satisfaccion.length
    const avg = (f: keyof RespuestaSat) => {
      const vals = satisfaccion.map((r) => r[f]).filter((v): v is number => typeof v === 'number')
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
    }
    const recomienda = satisfaccion.filter((r) => r.p6_recomendaria === 'Si').length
    const pctRecomienda = total ? Math.round((recomienda / total) * 100) : 0
    const porExperiencia = Object.entries(
      satisfaccion.reduce<Record<string, number>>((acc, r) => {
        const k = r.p4_experiencia_global || 'Sin dato'
        acc[k] = (acc[k] ?? 0) + 1
        return acc
      }, {}),
    ).map(([experiencia, cantidad]) => ({ experiencia, cantidad }))
    return { total, avgRecepcion: avg('p1_recepcion'), avgPersonal: avg('p2_personal_asistencial'), avgComodidad: avg('p3_comodidad'), pctRecomienda, porExperiencia }
  }, [satisfaccion])

  if (!pqrsf || !sat) return <Spinner texto="Cargando indicadores…" />

  return (
    <div className="space-y-8">
      <PageHeader titulo="Dashboard" subtitulo="Indicadores consolidados de PQRSF y Satisfacción" />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">PQRSF</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard titulo="Total registrados" valor={pqrsf.total} icono="📋" color="azul" />
          <MetricCard titulo="Pendientes de gestión" valor={pqrsf.pendientes} icono="⏳" color="ambar" />
          <MetricCard titulo="Respondidas / Cerradas" valor={pqrsf.respondidas} icono="✅" color="verde" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <h3 className="mb-3 text-sm font-semibold text-slate-600">Por tipo de PQRSF</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pqrsf.porTipo}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {pqrsf.porTipo.map((d) => <Cell key={d.tipo} fill={TIPO_COLOR[d.tipo] ?? '#64748b'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <h3 className="mb-3 text-sm font-semibold text-slate-600">Por estado</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pqrsf.porEstado}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {pqrsf.porEstado.map((d) => <Cell key={d.estado} fill={ESTADO_COLOR[d.estado] ?? '#64748b'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">Satisfacción</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard titulo="Encuestas registradas" valor={sat.total} icono="🙂" color="azul" />
          <MetricCard titulo="Promedio recepción" valor={sat.avgRecepcion} sub="sobre 5" icono="⭐" color="cyan" />
          <MetricCard titulo="Promedio personal asistencial" valor={sat.avgPersonal} sub="sobre 5" icono="⭐" color="morado" />
          <MetricCard titulo="Recomendaría la IPS" valor={`${sat.pctRecomienda}%`} icono="👍" color="verde" />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Experiencia global</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sat.porExperiencia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="experiencia" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                {sat.porExperiencia.map((d) => <Cell key={d.experiencia} fill={EXPERIENCIA_COLORS[d.experiencia]?.hex ?? '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
