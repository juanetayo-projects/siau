import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { supabase } from '../../lib/supabase'
import { useHeatmapColores, construirGrilla, resumenCelda, DIAS, HORAS } from '../../lib/heatmap'
import { PageHeader, Spinner, Modal, Tabla, THead, TH, TR, TD } from '../../components/ui'

type Fila = { id: number; nombre_completo: string | null; servicio: string | null; p4_experiencia_global: string | null; fecha: string }

export default function MapaCalorSatisfaccion() {
  const colores = useHeatmapColores('satisfaccion')
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [sel, setSel] = useState<{ dia: number; hora: number } | null>(null)

  useEffect(() => {
    void supabase.from('satisfaccion_respuestas').select('id,nombre_completo,servicio,p4_experiencia_global,fecha')
      .then(({ data }) => setFilas((data ?? []) as Fila[]))
  }, [])

  const { data, max, celdas } = useMemo(() => construirGrilla((filas ?? []).map((f) => f.fecha)), [filas])

  const detalle = useMemo(() => {
    if (!sel || !filas) return []
    const idxs = celdas[`${sel.dia}-${sel.hora}`] ?? []
    return idxs.map((i) => filas[i])
  }, [sel, filas, celdas])

  if (!filas) return <Spinner texto="Cargando mapa de calor…" />

  const option = {
    tooltip: {
      position: 'top',
      formatter: (p: any) => {
        const [h, d, v] = p.value as [number, number, number]
        if (!v) return `${DIAS[d]} · ${h}:00<br/>Sin registros`
        const idxs = celdas[`${d}-${h}`] ?? []
        const porExperiencia = resumenCelda(idxs, filas ?? [], 'p4_experiencia_global')
        return `<b>${DIAS[d]} · ${h}:00</b><br/><b>${v}</b> encuesta(s)<br/>${porExperiencia}<br/><span style="font-size:10px;color:#888">Clic para ver el detalle</span>`
      },
    },
    grid: { left: 50, right: 10, top: 10, bottom: 60 },
    xAxis: { type: 'category', data: HORAS.map((h) => `${h}h`), splitArea: { show: true }, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'category', data: DIAS, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    visualMap: { min: 0, max: Math.max(max, 1), calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: colores }, itemHeight: 80, textStyle: { fontSize: 10 } },
    series: [{
      name: 'Satisfacción', type: 'heatmap', data,
      label: { show: true, fontSize: 10, formatter: (p: any) => (p.value[2] ? p.value[2] : '') },
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
    }],
  }
  const onEvents = { click: (p: any) => { const [h, d, v] = p.value as [number, number, number]; if (v > 0) setSel({ dia: d, hora: h }) } }

  return (
    <div>
      <PageHeader titulo="Mapa de Calor Satisfacción" subtitulo="Distribución de encuestas por día de la semana y hora de registro" />
      <div className="neu-card rounded-2xl p-5">
        <ReactECharts option={option} style={{ height: 340, width: '100%' }} notMerge onEvents={onEvents} />
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} titulo={sel ? `Satisfacción · ${DIAS[sel.dia]} a las ${sel.hora}:00 (${detalle.length})` : ''} ancho="max-w-3xl">
        <Tabla>
          <THead><tr><TH>Paciente</TH><TH>Servicio</TH><TH>Experiencia</TH></tr></THead>
          <tbody>
            {detalle.map((f, i) => (
              <TR key={f.id} i={i}>
                <TD>{f.nombre_completo || '—'}</TD>
                <TD>{f.servicio || '—'}</TD>
                <TD>{f.p4_experiencia_global || '—'}</TD>
              </TR>
            ))}
            {detalle.length === 0 && <TR><TD className="text-slate-400">Sin registros.</TD></TR>}
          </tbody>
        </Tabla>
      </Modal>
    </div>
  )
}
