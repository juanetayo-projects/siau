import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageHeader, FilterBar, Campo, Select, Boton, Spinner, MetricCard, Tabla, THead, TH, TR, TD } from '../../components/ui'
import { calcularPlazo, diasDePlazo } from '../../lib/plazoRespuesta'

const TIPO_COLOR: Record<string, string> = {
  'Petición': '#2471c8', Queja: '#ea580c', Reclamo: '#dc2626', Sugerencia: '#16a34a', 'Felicitación': '#ca8a04',
}
const ESTADO_COLOR: Record<string, string> = {
  Recibida: '#94a3b8', 'En gestión': '#f59e0b', Respondida: '#10b981', Cerrada: '#64748b',
}
const ESTADOS_PQRSF = ['Recibida', 'En gestión', 'Respondida', 'Cerrada']
const TIPOS_PQRSF = ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación']
const CAL_ESCALA = ['#EAF0FA', '#B9CCE9', '#7FA0D6', '#3E6DAE', '#0D2D6B']
const PAGINA_TAM = 10

type Respuesta = { fecha_respuesta: string | null; respondido_por_nombre: string | null }
type Reporte = {
  id: number; tipo_reporte: string | null; estado: string | null; sede: string | null; proceso: string | null
  colaborador: string | null; fecha_manifestacion: string | null; dias_habiles: string | null
  nombre_paciente: string | null; respuestas_pqrsf: Respuesta[] | null
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function radicado(id: number) { return `PQRSF-${String(id).padStart(6, '0')}` }
function estaCerrado(estado: string | null) { return estado === 'Respondida' || estado === 'Cerrada' }
function diffDiasCal(a: string, b: string): number {
  const d1 = new Date(a.length <= 10 ? `${a}T00:00:00` : a)
  const d2 = new Date(b.length <= 10 ? `${b}T00:00:00` : b)
  return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}
function diaSemanaLunes0(iso: string): number { return (new Date(`${iso}T00:00:00`).getDay() + 6) % 7 }
function badgeStyle(color: string) { return { background: `${color}22`, color } }

function Badge({ texto, color }: { texto: string; color: string }) {
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap" style={badgeStyle(color)}>
      {texto}
    </span>
  )
}

function AnilloSimple({ pct, color, tamano = 96, grosor = 10, children }:
  { pct: number; color: string; tamano?: number; grosor?: number; children?: React.ReactNode }) {
  const r = (tamano - grosor) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="-rotate-90">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="#EAF0FA" strokeWidth={grosor} />
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color} strokeWidth={grosor}
          strokeDasharray={c} strokeDashoffset={c - (clamped / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

function AnillosConcentricos({ datos, tamano = 168, grosor = 14 }:
  { datos: { nombre: string; valor: number; color: string }[]; tamano?: number; grosor?: number }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <svg width={tamano} height={tamano} className="-rotate-90 shrink-0">
      {datos.map((d, i) => {
        const r = tamano / 2 - grosor / 2 - i * (grosor + 4)
        if (r <= 0) return null
        const c = 2 * Math.PI * r
        const pct = d.valor / max
        return (
          <g key={d.nombre}>
            <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="#EAF0FA" strokeWidth={grosor} />
            <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={d.color} strokeWidth={grosor}
              strokeDasharray={c} strokeDashoffset={c - pct * c} strokeLinecap="round" />
          </g>
        )
      })}
    </svg>
  )
}

export default function PanelEjecutivo() {
  const [reportes, setReportes] = useState<Reporte[] | null>(null)

  const hoyIso = isoDate(new Date())
  const [f, setF] = useState<{ tipo?: string; estado?: string; sede?: string; proceso?: string; desde: string; hasta: string }>(() => {
    const hasta = new Date()
    const desde = new Date(); desde.setDate(desde.getDate() - 29)
    return { desde: isoDate(desde), hasta: isoDate(hasta) }
  })
  const [mesCal, setMesCal] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    void supabase.from('reportes_pqrsf')
      .select('id,tipo_reporte,estado,sede,proceso,colaborador,fecha_manifestacion,dias_habiles,nombre_paciente,respuestas_pqrsf(fecha_respuesta,respondido_por_nombre)')
      .then(({ data }) => setReportes((data as any) ?? []))
  }, [])

  const tipos = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.tipo_reporte).filter(Boolean))] as string[]).sort(), [reportes])
  const sedes = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.sede).filter(Boolean))] as string[]).sort(), [reportes])
  const procesos = useMemo(() => ([...new Set((reportes ?? []).map((r) => r.proceso).filter(Boolean))] as string[]).sort(), [reportes])

  // Filtros sin fecha (usados por el calendario, que navega su propio mes)
  const reportesSinFecha = useMemo(() => (reportes ?? []).filter((r) => {
    if (f.tipo && r.tipo_reporte !== f.tipo) return false
    if (f.estado && r.estado !== f.estado) return false
    if (f.sede && r.sede !== f.sede) return false
    if (f.proceso && r.proceso !== f.proceso) return false
    return true
  }), [reportes, f.tipo, f.estado, f.sede, f.proceso])

  const filtrados = useMemo(() => reportesSinFecha.filter((r) => {
    if (f.desde && (!r.fecha_manifestacion || r.fecha_manifestacion < f.desde)) return false
    if (f.hasta && (!r.fecha_manifestacion || r.fecha_manifestacion > f.hasta)) return false
    return true
  }), [reportesSinFecha, f.desde, f.hasta])

  useEffect(() => setPagina(1), [f])

  // ---- Resumen del periodo (vs periodo anterior de igual duración) ----
  const resumenPeriodo = useMemo(() => {
    const dDesde = new Date(`${f.desde}T00:00:00`)
    const dHasta = new Date(`${f.hasta}T00:00:00`)
    const dias = Math.max(1, Math.round((dHasta.getTime() - dDesde.getTime()) / 86400000) + 1)
    const prevHasta = new Date(dDesde); prevHasta.setDate(prevHasta.getDate() - 1)
    const prevDesde = new Date(prevHasta); prevDesde.setDate(prevDesde.getDate() - (dias - 1))
    const prevDesdeIso = isoDate(prevDesde), prevHastaIso = isoDate(prevHasta)
    const total = filtrados.length
    const anterior = reportesSinFecha.filter((r) => r.fecha_manifestacion && r.fecha_manifestacion >= prevDesdeIso && r.fecha_manifestacion <= prevHastaIso).length
    const delta = total - anterior
    const deltaPct = anterior ? Math.round((delta / anterior) * 100) : (total > 0 ? 100 : 0)
    return { dias, total, anterior, delta, deltaPct }
  }, [filtrados, reportesSinFecha, f.desde, f.hasta])

  // ---- Casos por semana/día en el rango seleccionado ----
  const serieTiempo = useMemo(() => {
    const agruparPorDia = resumenPeriodo.dias <= 15
    const grupos: Record<string, { orden: string; etiqueta: string; cantidad: number }> = {}
    filtrados.forEach((r) => {
      if (!r.fecha_manifestacion) return
      const d = new Date(`${r.fecha_manifestacion}T00:00:00`)
      let clave: string; let etiqueta: string
      if (agruparPorDia) {
        clave = r.fecha_manifestacion
        etiqueta = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      } else {
        const lunes = new Date(d); lunes.setDate(d.getDate() - diaSemanaLunes0(r.fecha_manifestacion))
        clave = isoDate(lunes)
        etiqueta = `Sem ${lunes.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`
      }
      grupos[clave] = grupos[clave] ?? { orden: clave, etiqueta, cantidad: 0 }
      grupos[clave].cantidad++
    })
    return Object.values(grupos).sort((a, b) => a.orden.localeCompare(b.orden))
  }, [filtrados, resumenPeriodo.dias])

  // ---- Cumplimiento de plazo (SLA) ----
  const sla = useMemo(() => {
    let cumplidos = 0, incumplidos = 0, enCurso = 0, sinPlazo = 0
    filtrados.forEach((r) => {
      const plazoDias = diasDePlazo(r.dias_habiles)
      if (!plazoDias || !r.fecha_manifestacion) { sinPlazo++; return }
      const resp = r.respuestas_pqrsf?.[0]
      if (resp?.fecha_respuesta) {
        const dias = diffDiasCal(r.fecha_manifestacion, resp.fecha_respuesta)
        if (dias <= plazoDias) cumplidos++; else incumplidos++
      } else {
        const p = calcularPlazo(r.dias_habiles, r.fecha_manifestacion, false)
        if (p.estado === 'rojo') incumplidos++; else enCurso++
      }
    })
    const evaluables = cumplidos + incumplidos
    const pct = evaluables ? Math.round((cumplidos / evaluables) * 100) : 0
    let etiqueta = 'Sin datos', color = '#94a3b8'
    if (evaluables) {
      if (pct >= 90) { etiqueta = 'Excelente'; color = '#16a34a' }
      else if (pct >= 75) { etiqueta = 'Bueno'; color = '#0D2D6B' }
      else if (pct >= 50) { etiqueta = 'Regular'; color = '#ca8a04' }
      else { etiqueta = 'Crítico'; color = '#dc2626' }
    }
    return { cumplidos, incumplidos, enCurso, sinPlazo, pct, etiqueta, color }
  }, [filtrados])

  // ---- Calendario de actividad (mes navegable, independiente del rango de fechas) ----
  const calendario = useMemo(() => {
    const { y, m } = mesCal
    const primerDia = new Date(y, m, 1)
    const diasEnMes = new Date(y, m + 1, 0).getDate()
    const offset = diaSemanaLunes0(isoDate(primerDia))
    const conteos: Record<number, number> = {}
    reportesSinFecha.forEach((r) => {
      if (!r.fecha_manifestacion) return
      const d = new Date(`${r.fecha_manifestacion}T00:00:00`)
      if (d.getFullYear() === y && d.getMonth() === m) conteos[d.getDate()] = (conteos[d.getDate()] ?? 0) + 1
    })
    const max = Math.max(1, ...Object.values(conteos))
    const celdas: ({ dia: number; cantidad: number } | null)[] = Array.from({ length: offset }, () => null)
    for (let dia = 1; dia <= diasEnMes; dia++) celdas.push({ dia, cantidad: conteos[dia] ?? 0 })
    const total = Object.values(conteos).reduce((a, b) => a + b, 0)
    return { celdas, max, total }
  }, [reportesSinFecha, mesCal])

  // ---- Distribución por tipo (anillos concéntricos) ----
  const porTipo = useMemo(() => {
    const conteo: Record<string, number> = {}
    filtrados.forEach((r) => { const k = r.tipo_reporte || 'Sin tipo'; conteo[k] = (conteo[k] ?? 0) + 1 })
    return TIPOS_PQRSF.map((t) => ({ nombre: t, valor: conteo[t] ?? 0, color: TIPO_COLOR[t] }))
      .sort((a, b) => b.valor - a.valor)
  }, [filtrados])
  const totalTipos = porTipo.reduce((a, b) => a + b.valor, 0)

  // ---- Alertas combinadas: vencidos + próximos a vencer + sin asignar ----
  const alertas = useMemo(() => {
    type Alerta = { id: number; tipo: 'vencido' | 'por_vencer' | 'sin_asignar'; r: Reporte; orden: number }
    const usados = new Set<number>()
    const lista: Alerta[] = []
    filtrados.forEach((r) => {
      if (estaCerrado(r.estado)) return
      const p = calcularPlazo(r.dias_habiles, r.fecha_manifestacion, false)
      if (p.estado === 'rojo') { lista.push({ id: r.id, tipo: 'vencido', r, orden: p.diasRestantes ?? 0 }); usados.add(r.id) }
    })
    filtrados.forEach((r) => {
      if (usados.has(r.id) || estaCerrado(r.estado)) return
      if (!r.colaborador || !r.colaborador.trim()) { lista.push({ id: r.id, tipo: 'sin_asignar', r, orden: 0 }); usados.add(r.id) }
    })
    filtrados.forEach((r) => {
      if (usados.has(r.id) || estaCerrado(r.estado)) return
      const p = calcularPlazo(r.dias_habiles, r.fecha_manifestacion, false)
      if (p.estado === 'amarillo') { lista.push({ id: r.id, tipo: 'por_vencer', r, orden: p.diasRestantes ?? 0 }); usados.add(r.id) }
    })
    lista.sort((a, b) => a.orden - b.orden)
    return { total: lista.length, top: lista.slice(0, 8) }
  }, [filtrados])

  // ---- Respuestas: tiempo promedio, % a tiempo y ranking de colaboradores ----
  const respuestasInfo = useMemo(() => {
    const conRespuesta = filtrados
      .map((r) => ({ r, resp: r.respuestas_pqrsf?.[0] }))
      .filter((x): x is { r: Reporte; resp: Respuesta } => !!x.resp?.fecha_respuesta && !!x.r.fecha_manifestacion)
    const dias = conRespuesta.map((x) => diffDiasCal(x.r.fecha_manifestacion as string, x.resp.fecha_respuesta as string))
    const tiempoPromedio = dias.length ? (dias.reduce((a, b) => a + b, 0) / dias.length).toFixed(1) : '—'
    const conPlazo = conRespuesta.filter((x) => diasDePlazo(x.r.dias_habiles) != null)
    const aTiempo = conPlazo.filter((x) => {
      const plazoDias = diasDePlazo(x.r.dias_habiles) as number
      return diffDiasCal(x.r.fecha_manifestacion as string, x.resp.fecha_respuesta as string) <= plazoDias
    }).length
    const pctATiempo = conPlazo.length ? Math.round((aTiempo / conPlazo.length) * 100) : null

    const ranking: Record<string, number> = {}
    conRespuesta.forEach((x) => { const k = x.resp.respondido_por_nombre || 'Sin asignar'; ranking[k] = (ranking[k] ?? 0) + 1 })
    const rankingLista = Object.entries(ranking).map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad).slice(0, 6)

    return { totalRespondidas: conRespuesta.length, tiempoPromedio, pctATiempo, rankingLista }
  }, [filtrados])

  // ---- Tabla paginada ----
  const filasOrdenadas = useMemo(() => [...filtrados].sort((a, b) => (b.fecha_manifestacion ?? '').localeCompare(a.fecha_manifestacion ?? '')), [filtrados])
  const totalPaginas = Math.max(1, Math.ceil(filasOrdenadas.length / PAGINA_TAM))
  const filasPagina = filasOrdenadas.slice((pagina - 1) * PAGINA_TAM, pagina * PAGINA_TAM)

  if (!reportes) return <Spinner texto="Cargando panel…" />

  const nombreMes = new Date(mesCal.y, mesCal.m, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <PageHeader titulo="Panel Ejecutivo" subtitulo="Vista consolidada de PQRSF: reportes y respuestas" />

      <FilterBar nowrap>
        <Campo label="Tipo" className="shrink-0">
          <Select value={f.tipo ?? ''} onChange={(e) => setF((s) => ({ ...s, tipo: e.target.value || undefined }))}>
            <option value="">Todos</option>{tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Estado" className="shrink-0">
          <Select value={f.estado ?? ''} onChange={(e) => setF((s) => ({ ...s, estado: e.target.value || undefined }))}>
            <option value="">Todos</option>{ESTADOS_PQRSF.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Sede" className="shrink-0">
          <Select value={f.sede ?? ''} onChange={(e) => setF((s) => ({ ...s, sede: e.target.value || undefined }))}>
            <option value="">Todas</option>{sedes.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Proceso" className="shrink-0">
          <Select value={f.proceso ?? ''} onChange={(e) => setF((s) => ({ ...s, proceso: e.target.value || undefined }))} className="w-40">
            <option value="">Todos</option>{procesos.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Desde" className="shrink-0">
          <input type="date" value={f.desde} max={f.hasta} onChange={(e) => setF((s) => ({ ...s, desde: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Campo>
        <Campo label="Hasta" className="shrink-0">
          <input type="date" value={f.hasta} min={f.desde} max={hoyIso} onChange={(e) => setF((s) => ({ ...s, hasta: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Campo>
        <Boton variante="secundario" className="shrink-0" onClick={() => setF((s) => ({ tipo: undefined, estado: undefined, sede: undefined, proceso: undefined, desde: s.desde, hasta: s.hasta }))}>
          Limpiar filtros
        </Boton>
      </FilterBar>

      {/* Fila 1: resumen · casos en el rango · cumplimiento SLA */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Resumen del periodo</h3>
          <div className="text-xs text-slate-400">{f.desde} → {f.hasta} ({resumenPeriodo.dias} días)</div>
          <div className="mt-2 text-3xl font-bold text-[#0D2D6B]">{resumenPeriodo.total}</div>
          <div className="text-xs text-slate-500">casos registrados</div>
          <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            resumenPeriodo.delta > 0 ? 'bg-rose-50 text-rose-600' : resumenPeriodo.delta < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            {resumenPeriodo.delta > 0 ? '▲' : resumenPeriodo.delta < 0 ? '▼' : '·'} {Math.abs(resumenPeriodo.deltaPct)}% vs periodo anterior ({resumenPeriodo.anterior})
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Casos reportados en el rango</h3>
          <div className="text-2xl font-bold text-[#0D2D6B]">{filtrados.length} <span className="text-sm font-normal text-slate-400">total</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={serieTiempo}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#16468E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Cumplimiento de plazo (SLA)</h3>
          <div className="flex items-center gap-4">
            <AnilloSimple pct={sla.pct} color={sla.color}>
              <span className="text-xl font-bold" style={{ color: sla.color }}>{sla.pct}</span>
              <span className="text-[10px] text-slate-400">de 100</span>
            </AnilloSimple>
            <div>
              <div className="text-base font-bold" style={{ color: sla.color }}>{sla.etiqueta}</div>
              <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                <div>✅ Cumplidos: <b>{sla.cumplidos}</b></div>
                <div>❌ Incumplidos: <b>{sla.incumplidos}</b></div>
                <div>🕓 En curso: <b>{sla.enCurso}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2: calendario · anillos por tipo · alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-600">Días con más PQRSF</h3>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => setMesCal((s) => { const m = s.m - 1; return m < 0 ? { y: s.y - 1, m: 11 } : { y: s.y, m } })}
                className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100">‹</button>
              <span className="w-28 text-center font-medium capitalize text-slate-600">{nombreMes}</span>
              <button onClick={() => setMesCal((s) => { const m = s.m + 1; return m > 11 ? { y: s.y + 1, m: 0 } : { y: s.y, m } })}
                className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100">›</button>
            </div>
          </div>
          <div className="text-xs text-slate-400 mb-2">{calendario.total} casos en el mes</div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendario.celdas.map((c, i) => {
              if (!c) return <div key={i} />
              const intensidad = c.cantidad === 0 ? 0 : Math.min(4, Math.ceil((c.cantidad / calendario.max) * 4))
              return (
                <div key={i} title={`${c.dia}: ${c.cantidad} caso(s)`}
                  className="flex aspect-square items-center justify-center rounded text-[10px] font-medium"
                  style={{ background: CAL_ESCALA[intensidad], color: intensidad >= 3 ? 'white' : '#334155' }}>
                  {c.dia}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Distribución por tipo</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <AnillosConcentricos datos={porTipo.filter((t) => t.valor > 0)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[#0D2D6B]">{totalTipos}</span>
                <span className="text-[10px] text-slate-400">casos</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              {porTipo.map((t) => (
                <div key={t.nombre} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                  <span className="text-slate-600">{t.nombre}</span>
                  <span className="font-semibold text-slate-800">{t.valor}</span>
                  <span className="text-slate-400">({totalTipos ? Math.round((t.valor / totalTipos) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-600">Alertas importantes</h3>
            <Badge texto={`${alertas.total} activas`} color="#dc2626" />
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {alertas.top.length === 0 && <p className="text-xs text-slate-400">Sin alertas en el periodo seleccionado.</p>}
            {alertas.top.map(({ id, tipo, r }) => {
              const cfg = tipo === 'vencido'
                ? { icono: '🔴', texto: 'Plazo vencido', color: '#dc2626' }
                : tipo === 'sin_asignar'
                  ? { icono: '⚪', texto: 'Sin colaborador asignado', color: '#64748b' }
                  : { icono: '🟠', texto: 'Próximo a vencer', color: '#ca8a04' }
              return (
                <div key={id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2">
                  <span>{cfg.icono}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-[#0D2D6B]">{radicado(id)}</span>
                      <span className="shrink-0 text-[10px]" style={{ color: cfg.color }}>{cfg.texto}</span>
                    </div>
                    <div className="truncate text-[11px] text-slate-500">{r.tipo_reporte ?? 'Sin tipo'} · {r.sede ?? 'Sin sede'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fila 3: KPIs de respuestas + ranking de colaboradores */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricCard titulo="Tiempo promedio de respuesta" valor={respuestasInfo.tiempoPromedio} sub="días" icono="⏱️" color="morado" />
        <MetricCard titulo="Respondidas dentro del plazo" valor={respuestasInfo.pctATiempo != null ? `${respuestasInfo.pctATiempo}%` : '—'} sub={`${respuestasInfo.totalRespondidas} respondidas en el periodo`} icono="🎯" color="cyan" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
          <h3 className="mb-3 text-sm font-semibold text-slate-600">Respuestas por colaborador</h3>
          {respuestasInfo.rankingLista.length === 0 ? (
            <p className="text-xs text-slate-400">Sin respuestas registradas en el periodo seleccionado.</p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={respuestasInfo.rankingLista} layout="vertical" margin={{ left: 8, right: 12 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nombre" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                  {respuestasInfo.rankingLista.map((_, i) => <Cell key={i} fill="#16468E" fillOpacity={1 - i * 0.1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabla paginada */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600">Listado de PQRSF ({filasOrdenadas.length})</h3>
          <Link to="/consola/pqrsf" className="text-xs font-medium text-[#16468E] hover:underline">Ir a Gestión PQRSF ↗</Link>
        </div>
        <Tabla>
          <THead><tr><TH>Radicado</TH><TH>Tipo</TH><TH>Paciente</TH><TH>Sede</TH><TH>Proceso</TH><TH>Estado</TH><TH>Plazo</TH><TH>Fecha</TH><TH></TH></tr></THead>
          <tbody>
            {filasPagina.map((r, i) => {
              const p = calcularPlazo(r.dias_habiles, r.fecha_manifestacion, estaCerrado(r.estado))
              const plazoTexto = p.estado === 'sin_plazo' ? '—' : p.estado === 'completado' ? 'Completado'
                : p.diasRestantes != null ? (p.diasRestantes <= 0 ? 'Vencido' : `${p.diasRestantes} día(s)`) : '—'
              const plazoColor = p.estado === 'rojo' ? '#dc2626' : p.estado === 'amarillo' ? '#ca8a04' : p.estado === 'verde' ? '#16a34a' : '#64748b'
              return (
                <TR key={r.id} i={i}>
                  <TD className="whitespace-nowrap font-mono text-xs font-bold text-[#0D2D6B]">{radicado(r.id)}</TD>
                  <TD><Badge texto={r.tipo_reporte ?? '—'} color={TIPO_COLOR[r.tipo_reporte ?? ''] ?? '#64748b'} /></TD>
                  <TD>{r.nombre_paciente || '—'}</TD>
                  <TD>{r.sede || '—'}</TD>
                  <TD>{r.proceso || '—'}</TD>
                  <TD><Badge texto={r.estado ?? 'Recibida'} color={ESTADO_COLOR[r.estado ?? 'Recibida'] ?? '#64748b'} /></TD>
                  <TD><span className="text-xs font-medium" style={{ color: plazoColor }}>{plazoTexto}</span></TD>
                  <TD className="whitespace-nowrap text-xs">{r.fecha_manifestacion ?? '—'}</TD>
                  <TD>
                    <Link to="/consola/pqrsf" className="text-xs font-medium text-[#16468E] hover:underline">Gestionar ↗</Link>
                  </TD>
                </TR>
              )
            })}
            {filasPagina.length === 0 && <TR><TD className="text-slate-400">Sin registros para los filtros seleccionados.</TD></TR>}
          </tbody>
        </Tabla>
        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-xs">
            <Boton variante="secundario" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}>‹ Anterior</Boton>
            <span className="text-slate-500">Página {pagina} de {totalPaginas}</span>
            <Boton variante="secundario" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>Siguiente ›</Boton>
          </div>
        )}
      </div>
    </div>
  )
}
