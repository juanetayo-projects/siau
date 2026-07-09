import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { useSurveyData } from '../../hooks/useSurveyData'
import { SEDES, SERVICIOS, RATING_COLORS, EXPERIENCIA_COLORS } from '../../lib/satisfaccion'
import { PageHeader, FilterBar, Campo, Input, Select, Boton, Tabla, THead, TH, TR, TD, Modal, Spinner } from '../../components/ui'
import CompartirEncuesta from '../../components/CompartirEncuesta'

function RatingBadge({ value }: { value: number | null }) {
  if (!value) return <span className="text-slate-300">—</span>
  const c = RATING_COLORS[value]
  return <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${c.bg} ${c.text}`}>{value}</span>
}
function ExperienciaBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-300">—</span>
  const c = EXPERIENCIA_COLORS[value] ?? { bg: 'bg-slate-100', text: 'text-slate-700' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>{value}</span>
}

export default function GestionSatisfaccion() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [filters, setFilters] = useState<{ sede?: string; servicio?: string; desde?: string; hasta?: string; search?: string }>({})
  const [verDetalle, setVerDetalle] = useState<number | null>(null)
  const [eliminando, setEliminando] = useState<number | null>(null)

  const { data, total, loading, page, setPage, pageSize, refetch } = useSurveyData(filters)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const registro = data.find((r) => r.id === verDetalle) ?? null

  async function eliminar(id: number) {
    setEliminando(id)
    try {
      await supabase.from('satisfaccion_respuestas').delete().eq('id', id)
      await refetch()
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div>
      <PageHeader titulo="Gestión Satisfacción" subtitulo={`${total.toLocaleString()} encuestas registradas`} acciones={<CompartirEncuesta />} />

      <FilterBar>
        <Campo label="Buscar" className="min-w-56">
          <Input placeholder="Nombre o identificación…" onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        </Campo>
        <Campo label="Sede">
          <Select value={filters.sede ?? ''} onChange={(e) => setFilters((f) => ({ ...f, sede: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {SEDES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Campo>
        <Campo label="Servicio">
          <Select value={filters.servicio ?? ''} onChange={(e) => setFilters((f) => ({ ...f, servicio: e.target.value || undefined }))}>
            <option value="">Todos</option>
            {SERVICIOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Campo>
        <Campo label="Desde">
          <Input type="date" value={filters.desde ?? ''} onChange={(e) => setFilters((f) => ({ ...f, desde: e.target.value || undefined }))} />
        </Campo>
        <Campo label="Hasta">
          <Input type="date" value={filters.hasta ?? ''} onChange={(e) => setFilters((f) => ({ ...f, hasta: e.target.value || undefined }))} />
        </Campo>
        <Boton variante="secundario" onClick={() => setFilters({})}>Limpiar</Boton>
      </FilterBar>

      {loading ? <Spinner /> : (
        <Tabla>
          <THead>
            <tr>
              <TH>Fecha</TH><TH>Paciente</TH><TH>Sede</TH><TH>Servicio</TH>
              <TH>P1</TH><TH>P2</TH><TH>P3</TH><TH>Experiencia</TH><TH>Recomienda</TH><TH>Acciones</TH>
            </tr>
          </THead>
          <tbody>
            {data.length === 0 && (
              <TR><TD className="py-10 text-center text-slate-400" /></TR>
            )}
            {data.map((row, i) => (
              <TR key={row.id} i={i}>
                <TD className="whitespace-nowrap text-xs text-slate-500">{row.fecha ? new Date(row.fecha).toLocaleDateString('es-CO') : '—'}</TD>
                <TD>
                  <div className="max-w-[160px] truncate font-medium text-slate-800">{row.nombre_completo || '—'}</div>
                  <div className="text-xs text-slate-400">{row.numero_identificacion}</div>
                </TD>
                <TD className="max-w-[140px] truncate text-xs text-slate-600">{row.sede}</TD>
                <TD className="max-w-[160px] truncate text-xs text-slate-600">{row.servicio}</TD>
                <TD><RatingBadge value={row.p1_recepcion} /></TD>
                <TD><RatingBadge value={row.p2_personal_asistencial} /></TD>
                <TD><RatingBadge value={row.p3_comodidad} /></TD>
                <TD><ExperienciaBadge value={row.p4_experiencia_global} /></TD>
                <TD>
                  {row.p6_recomendaria === 'Si'
                    ? <span className="text-xs font-semibold text-emerald-600">Sí</span>
                    : <span className="text-xs font-semibold text-rose-500">No</span>}
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setVerDetalle(row.id)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#16468E] hover:bg-[#EAF0FA]">Ver</button>
                    {esAdmin && (
                      <button onClick={() => eliminar(row.id)} disabled={eliminando === row.id}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                        {eliminando === row.id ? '…' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Tabla>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Anterior</Boton>
            <Boton variante="secundario" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente →</Boton>
          </div>
        </div>
      )}

      <Modal open={!!registro} onClose={() => setVerDetalle(null)} titulo="Detalle de la encuesta">
        {registro && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-500">Paciente:</span> <span className="font-medium">{registro.nombre_completo || '—'}</span></div>
              <div><span className="text-slate-500">Identificación:</span> {registro.numero_identificacion || '—'}</div>
              <div><span className="text-slate-500">Teléfono:</span> {registro.telefono || '—'}</div>
              <div><span className="text-slate-500">Fecha:</span> {new Date(registro.fecha).toLocaleString('es-CO')}</div>
              <div><span className="text-slate-500">Sede:</span> {registro.sede}</div>
              <div><span className="text-slate-500">Entidad:</span> {registro.entidad_salud}</div>
              <div className="col-span-2"><span className="text-slate-500">Servicio:</span> {registro.servicio}</div>
            </div>
            <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3">
              <div>Recepción: <RatingBadge value={registro.p1_recepcion} /></div>
              <div>Personal asistencial: <RatingBadge value={registro.p2_personal_asistencial} /></div>
              <div>Comodidad: <RatingBadge value={registro.p3_comodidad} /></div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <span className="text-slate-500">Experiencia global:</span> <ExperienciaBadge value={registro.p4_experiencia_global} />
            </div>
            {registro.p5_motivo_insatisfaccion && (
              <div><span className="text-slate-500">Motivo de insatisfacción:</span> {registro.p5_motivo_insatisfaccion}</div>
            )}
            <div><span className="text-slate-500">¿Recomienda?:</span> {registro.p6_recomendaria === 'Si' ? 'Sí' : 'No'}</div>
            {registro.comentarios && (
              <div className="rounded-lg bg-slate-50 p-3"><span className="text-slate-500">Comentarios:</span> {registro.comentarios}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
