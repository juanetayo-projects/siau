import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { MetricCard, PageHeader, Spinner, FilterBar, Campo, Select, Boton } from '../../components/ui'
import { EXPERIENCIA_COLORS, SEDES, SERVICIOS, ENTIDADES, EXPERIENCIA_GLOBAL } from '../../lib/satisfaccion'
import { exportarImagenSeccion, exportarPDFSeccion } from '../../lib/exportarSeccion'

const LOGO = `${import.meta.env.BASE_URL}images/logo_cacsb2.png`

const TIPO_COLOR: Record<string, string> = {
  'Petición': '#2471c8', Queja: '#ea580c', Reclamo: '#dc2626', Sugerencia: '#16a34a', 'Felicitación': '#ca8a04',
}
const ESTADO_COLOR: Record<string, string> = {
  Recibida: '#94a3b8', 'En gestión': '#f59e0b', Respondida: '#10b981', Cerrada: '#64748b',
}
const ESTADOS_PQRSF = ['Recibida', 'En gestión', 'Respondida', 'Cerrada']

type ReportePQRSF = {
  tipo_reporte: string | null; estado: string | null; sede: string | null; proceso: string | null
  convenio_eps: string | null; fecha_manifestacion: string | null
}
type RespuestaSat = {
  p1_recepcion: number | null; p2_personal_asistencial: number | null; p3_comodidad: number | null
  p4_experiencia_global: string | null; p6_recomendaria: string | null
  sede: string | null; servicio: string | null; entidad_salud: string | null; fecha: string | null
}

function EncabezadoExport({ titulo, filtrosTexto }: { titulo: string; filtrosTexto: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
      <img src={LOGO} alt="CAC Santa Bárbara" className="h-8 object-contain" />
      <div>
        <div className="text-sm font-bold text-[#0D2D6B]">SIAU · {titulo}</div>
        <div className="text-xs text-slate-500">{filtrosTexto}</div>
      </div>
    </div>
  )
}

function BotonesExportar({ elementId, titulo, filtrosTexto, archivo }: { elementId: string; titulo: string; filtrosTexto: string; archivo: string }) {
  const [exportando, setExportando] = useState('')
  const [error, setError] = useState('')
  async function imagen() {
    setExportando('imagen'); setError('')
    try { await exportarImagenSeccion(elementId, archivo) } catch (e: any) { setError(e?.message ?? 'No se pudo generar la imagen.') } finally { setExportando('') }
  }
  async function pdf() {
    setExportando('pdf'); setError('')
    try { await exportarPDFSeccion(elementId, titulo, filtrosTexto, archivo) } catch (e: any) { setError(e?.message ?? 'No se pudo generar el PDF.') } finally { setExportando('') }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Boton variante="secundario" onClick={imagen} disabled={!!exportando}>{exportando === 'imagen' ? 'Generando…' : '🖼️ Imagen'}</Boton>
        <Boton variante="secundario" onClick={pdf} disabled={!!exportando}>{exportando === 'pdf' ? 'Generando…' : '📄 PDF'}</Boton>
      </div>
      {error && <span className="text-xs text-rose-600">⚠ {error}</span>}
    </div>
  )
}

export default function Dashboard() {
  const [reportes, setReportes] = useState<ReportePQRSF[] | null>(null)
  const [satisfaccion, setSatisfaccion] = useState<RespuestaSat[] | null>(null)

  const [fp, setFp] = useState<{ tipo?: string; estado?: string; sede?: string; proceso?: string; convenio?: string; desde?: string; hasta?: string }>({})
  const [fs, setFs] = useState<{ sede?: string; servicio?: string; entidad?: string; experiencia?: string; desde?: string; hasta?: string }>({})

  useEffect(() => {
    void supabase.from('reportes_pqrsf').select('tipo_reporte,estado,sede,proceso,convenio_eps,fecha_manifestacion').then(({ data }) => setReportes(data ?? []))
    void supabase.from('satisfaccion_respuestas')
      .select('p1_recepcion,p2_personal_asistencial,p3_comodidad,p4_experiencia_global,p6_recomendaria,sede,servicio,entidad_salud,fecha')
      .then(({ data }) => setSatisfaccion(data ?? []))
  }, [])

  const procesosPqrsf = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.proceso).filter(Boolean))] as string[]).sort(), [reportes])
  const conveniosPqrsf = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.convenio_eps).filter(Boolean))] as string[]).sort(), [reportes])
  const sedesPqrsf = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.sede).filter(Boolean))] as string[]).sort(), [reportes])
  const tiposPqrsf = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.tipo_reporte).filter(Boolean))] as string[]).sort(), [reportes])

  const reportesFiltrados = useMemo(() => {
    if (!reportes) return null
    return reportes.filter((r) => {
      if (fp.tipo && r.tipo_reporte !== fp.tipo) return false
      if (fp.estado && r.estado !== fp.estado) return false
      if (fp.sede && r.sede !== fp.sede) return false
      if (fp.proceso && r.proceso !== fp.proceso) return false
      if (fp.convenio && r.convenio_eps !== fp.convenio) return false
      if (fp.desde && r.fecha_manifestacion && r.fecha_manifestacion < fp.desde) return false
      if (fp.hasta && r.fecha_manifestacion && r.fecha_manifestacion > fp.hasta) return false
      return true
    })
  }, [reportes, fp])

  const satFiltrados = useMemo(() => {
    if (!satisfaccion) return null
    return satisfaccion.filter((r) => {
      if (fs.sede && r.sede !== fs.sede) return false
      if (fs.servicio && r.servicio !== fs.servicio) return false
      if (fs.entidad && r.entidad_salud !== fs.entidad) return false
      if (fs.experiencia && r.p4_experiencia_global !== fs.experiencia) return false
      if (fs.desde && r.fecha && r.fecha < fs.desde) return false
      if (fs.hasta && r.fecha && r.fecha > fs.hasta + 'T23:59:59') return false
      return true
    })
  }, [satisfaccion, fs])

  const pqrsf = useMemo(() => {
    if (!reportesFiltrados) return null
    const total = reportesFiltrados.length
    const pendientes = reportesFiltrados.filter((r) => r.estado === 'Recibida' || r.estado === 'En gestión' || !r.estado).length
    const respondidas = reportesFiltrados.filter((r) => r.estado === 'Respondida' || r.estado === 'Cerrada').length
    const porTipo = Object.entries(
      reportesFiltrados.reduce<Record<string, number>>((acc, r) => { const k = r.tipo_reporte || 'Sin tipo'; acc[k] = (acc[k] ?? 0) + 1; return acc }, {}),
    ).map(([tipo, cantidad]) => ({ tipo, cantidad }))
    const porEstado = Object.entries(
      reportesFiltrados.reduce<Record<string, number>>((acc, r) => { const k = r.estado || 'Recibida'; acc[k] = (acc[k] ?? 0) + 1; return acc }, {}),
    ).map(([estado, cantidad]) => ({ estado, cantidad }))
    return { total, pendientes, respondidas, porTipo, porEstado }
  }, [reportesFiltrados])

  const sat = useMemo(() => {
    if (!satFiltrados) return null
    const total = satFiltrados.length
    const avg = (f: keyof RespuestaSat) => {
      const vals = satFiltrados.map((r) => r[f]).filter((v): v is number => typeof v === 'number')
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—'
    }
    const recomienda = satFiltrados.filter((r) => r.p6_recomendaria === 'Si').length
    const pctRecomienda = total ? Math.round((recomienda / total) * 100) : 0
    const porExperiencia = Object.entries(
      satFiltrados.reduce<Record<string, number>>((acc, r) => { const k = r.p4_experiencia_global || 'Sin dato'; acc[k] = (acc[k] ?? 0) + 1; return acc }, {}),
    ).map(([experiencia, cantidad]) => ({ experiencia, cantidad }))
    return { total, avgRecepcion: avg('p1_recepcion'), avgPersonal: avg('p2_personal_asistencial'), avgComodidad: avg('p3_comodidad'), pctRecomienda, porExperiencia }
  }, [satFiltrados])

  if (!pqrsf || !sat) return <Spinner texto="Cargando indicadores…" />

  const filtrosTextoPqrsf = [
    fp.tipo && `Tipo: ${fp.tipo}`, fp.estado && `Estado: ${fp.estado}`, fp.sede && `Sede: ${fp.sede}`,
    fp.proceso && `Proceso: ${fp.proceso}`, fp.convenio && `Convenio: ${fp.convenio}`,
    fp.desde && `Desde ${fp.desde}`, fp.hasta && `Hasta ${fp.hasta}`,
  ].filter(Boolean).join(' · ') || 'Sin filtros aplicados'

  const filtrosTextoSat = [
    fs.sede && `Sede: ${fs.sede}`, fs.servicio && `Servicio: ${fs.servicio}`, fs.entidad && `Entidad: ${fs.entidad}`,
    fs.experiencia && `Experiencia: ${fs.experiencia}`, fs.desde && `Desde ${fs.desde}`, fs.hasta && `Hasta ${fs.hasta}`,
  ].filter(Boolean).join(' · ') || 'Sin filtros aplicados'

  return (
    <div className="space-y-8">
      <PageHeader titulo="Dashboard" subtitulo="Indicadores consolidados de PQRSF y Satisfacción" />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">PQRSF</h2>
          <BotonesExportar elementId="dashboard-pqrsf" titulo="Dashboard PQRSF" filtrosTexto={filtrosTextoPqrsf} archivo={`dashboard-pqrsf-${new Date().toISOString().slice(0, 10)}`} />
        </div>
        <FilterBar nowrap>
          <Campo label="Tipo" className="shrink-0">
            <Select value={fp.tipo ?? ''} onChange={(e) => setFp((f) => ({ ...f, tipo: e.target.value || undefined }))}>
              <option value="">Todos</option>{tiposPqrsf.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Estado" className="shrink-0">
            <Select value={fp.estado ?? ''} onChange={(e) => setFp((f) => ({ ...f, estado: e.target.value || undefined }))}>
              <option value="">Todos</option>{ESTADOS_PQRSF.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Sede" className="shrink-0">
            <Select value={fp.sede ?? ''} onChange={(e) => setFp((f) => ({ ...f, sede: e.target.value || undefined }))}>
              <option value="">Todas</option>{sedesPqrsf.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Proceso" className="shrink-0">
            <Select value={fp.proceso ?? ''} onChange={(e) => setFp((f) => ({ ...f, proceso: e.target.value || undefined }))} className="w-36">
              <option value="">Todos</option>{procesosPqrsf.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Convenio / EPS" className="shrink-0">
            <Select value={fp.convenio ?? ''} onChange={(e) => setFp((f) => ({ ...f, convenio: e.target.value || undefined }))}>
              <option value="">Todos</option>{conveniosPqrsf.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Desde" className="shrink-0"><input type="date" value={fp.desde ?? ''} onChange={(e) => setFp((f) => ({ ...f, desde: e.target.value || undefined }))} className="neu-inset rounded-lg px-3 py-2 text-sm" /></Campo>
          <Campo label="Hasta" className="shrink-0"><input type="date" value={fp.hasta ?? ''} onChange={(e) => setFp((f) => ({ ...f, hasta: e.target.value || undefined }))} className="neu-inset rounded-lg px-3 py-2 text-sm" /></Campo>
          <Boton variante="secundario" onClick={() => setFp({})} className="shrink-0">Limpiar</Boton>
        </FilterBar>

        <div id="dashboard-pqrsf" className="rounded-2xl bg-white p-4">
          <EncabezadoExport titulo="Dashboard PQRSF" filtrosTexto={filtrosTextoPqrsf} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard titulo="Total registrados" valor={pqrsf.total} icono="📋" color="azul" />
            <MetricCard titulo="Pendientes de gestión" valor={pqrsf.pendientes} icono="⏳" color="ambar" />
            <MetricCard titulo="Respondidas / Cerradas" valor={pqrsf.respondidas} icono="✅" color="verde" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="neu-card rounded-2xl p-5">
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
            <div className="neu-card rounded-2xl p-5">
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
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">Satisfacción</h2>
          <BotonesExportar elementId="dashboard-satisfaccion" titulo="Dashboard Satisfacción" filtrosTexto={filtrosTextoSat} archivo={`dashboard-satisfaccion-${new Date().toISOString().slice(0, 10)}`} />
        </div>
        <FilterBar nowrap>
          <Campo label="Sede" className="shrink-0">
            <Select value={fs.sede ?? ''} onChange={(e) => setFs((f) => ({ ...f, sede: e.target.value || undefined }))}>
              <option value="">Todas</option>{SEDES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Servicio" className="shrink-0">
            <Select value={fs.servicio ?? ''} onChange={(e) => setFs((f) => ({ ...f, servicio: e.target.value || undefined }))}>
              <option value="">Todos</option>{SERVICIOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Entidad" className="shrink-0">
            <Select value={fs.entidad ?? ''} onChange={(e) => setFs((f) => ({ ...f, entidad: e.target.value || undefined }))}>
              <option value="">Todas</option>{ENTIDADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Experiencia global" className="shrink-0">
            <Select value={fs.experiencia ?? ''} onChange={(e) => setFs((f) => ({ ...f, experiencia: e.target.value || undefined }))}>
              <option value="">Todas</option>{EXPERIENCIA_GLOBAL.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Desde" className="shrink-0"><input type="date" value={fs.desde ?? ''} onChange={(e) => setFs((f) => ({ ...f, desde: e.target.value || undefined }))} className="neu-inset rounded-lg px-3 py-2 text-sm" /></Campo>
          <Campo label="Hasta" className="shrink-0"><input type="date" value={fs.hasta ?? ''} onChange={(e) => setFs((f) => ({ ...f, hasta: e.target.value || undefined }))} className="neu-inset rounded-lg px-3 py-2 text-sm" /></Campo>
          <Boton variante="secundario" onClick={() => setFs({})} className="shrink-0">Limpiar</Boton>
        </FilterBar>

        <div id="dashboard-satisfaccion" className="rounded-2xl bg-white p-4">
          <EncabezadoExport titulo="Dashboard Satisfacción" filtrosTexto={filtrosTextoSat} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard titulo="Encuestas registradas" valor={sat.total} icono="🙂" color="azul" />
            <MetricCard titulo="Promedio recepción" valor={sat.avgRecepcion} sub="sobre 5" icono="⭐" color="cyan" />
            <MetricCard titulo="Promedio personal asistencial" valor={sat.avgPersonal} sub="sobre 5" icono="⭐" color="morado" />
            <MetricCard titulo="Recomendaría la IPS" valor={`${sat.pctRecomienda}%`} icono="👍" color="verde" />
          </div>
          <div className="mt-4 neu-card rounded-2xl p-5">
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
        </div>
      </section>
    </div>
  )
}
