import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Boton, Spinner } from '../../components/ui'
import CatalogoEditor from '../../components/CatalogoEditor'

const TABLAS = [
  { t: 'reportes_pqrsf', icono: '📥', color: '#2471c8' },
  { t: 'respuestas_pqrsf', icono: '↩️', color: '#16a34a' },
  { t: 'satisfaccion_respuestas', icono: '🙂', color: '#8b5cf6' },
  { t: 'consola_perfiles', icono: '👥', color: '#ea580c' },
  { t: 'lista_tipo_reporte', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_entidades', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_sedes', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_procesos', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_fuentes', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_tipo_usuario', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_convenios', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_regimen', icono: '📋', color: '#8b5cf6' },
  { t: 'lista_fallas', icono: '📋', color: '#8b5cf6' },
  { t: 'especialidades', icono: '📋', color: '#8b5cf6' },
]

function ResumenTablas() {
  const [conteos, setConteos] = useState<Record<string, number | null> | null>(null)
  const [cargando, setCargando] = useState(false)

  async function cargar() {
    setCargando(true)
    const resultados = await Promise.all(
      TABLAS.map(({ t }) => supabase.from(t).select('id', { count: 'exact', head: true })),
    )
    const mapa: Record<string, number | null> = {}
    TABLAS.forEach(({ t }, i) => { mapa[t] = resultados[i].error ? null : (resultados[i].count ?? 0) })
    setConteos(mapa)
    setCargando(false)
  }
  useEffect(() => { void cargar() }, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-bold text-[#0D2D6B]">📊 Resumen de tablas</span>
        <Boton variante="secundario" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando…' : '↻ Actualizar'}</Boton>
      </div>
      {!conteos ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2">Tabla</th><th className="px-5 py-2">Registros</th><th className="px-5 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {TABLAS.map(({ t, icono, color }) => {
                const n = conteos[t]
                return (
                  <tr key={t} className="border-t border-slate-50">
                    <td className="px-5 py-2"><span style={{ color }} className="mr-2">{icono}</span>{t}</td>
                    <td className="px-5 py-2 text-base font-extrabold" style={{ color }}>{n ?? '—'}</td>
                    <td className="px-5 py-2 text-xs" style={{ color: n !== null ? '#16a34a' : '#dc2626' }}>{n !== null ? '✓ OK' : '✗ No existe'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="m-4 rounded-lg bg-[#EAF0FA] p-3 text-xs leading-relaxed text-slate-600">
        ℹ️ Los catálogos (listas desplegables de los formularios PQRSF) se administran más abajo, en <b>Catálogos</b>.
      </div>
    </div>
  )
}

export default function TablasMaestrasResumen() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Tablas maestras · Resumen" subtitulo="Estado de las tablas y catálogos usados en PQRSF y Satisfacción" />
      <div className="space-y-6">
        <ResumenTablas />

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0D2D6B]">Catálogos</h2>
          <div className="space-y-3">
            <CatalogoEditor tabla="lista_tipo_reporte" label="Tipos de PQRSF" />
            <CatalogoEditor tabla="lista_entidades" label="Entidades" />
            <CatalogoEditor tabla="lista_sedes" label="Sedes" />
            <CatalogoEditor tabla="lista_procesos" label="Procesos / Servicios" campoExtra={{ key: 'correo', label: 'Correo de notificación' }} />
            <CatalogoEditor tabla="lista_fuentes" label="Fuentes" />
            <CatalogoEditor tabla="lista_tipo_usuario" label="Tipos de usuario" />
            <CatalogoEditor tabla="lista_convenios" label="Convenios / EPS" />
            <CatalogoEditor tabla="lista_regimen" label="Régimen" />
            <CatalogoEditor tabla="lista_fallas" label="Fallas / Atributos" campoExtra={{ key: 'grupo', label: 'Grupo' }} />
            <CatalogoEditor tabla="especialidades" label="Especialidades" tieneOrden={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
