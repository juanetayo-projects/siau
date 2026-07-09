import { useState } from 'react'
import { PageHeader } from '../../components/ui'
import CatalogoEditor from '../../components/CatalogoEditor'

// Mismo orden y nombres del módulo "Tablas maestras" original de pqrsf-consola.
const CATALOGOS = [
  { tabla: 'especialidades', label: 'Especialidades', tieneOrden: false },
  { tabla: 'lista_convenios', label: 'Convenios / EPS' },
  { tabla: 'lista_entidades', label: 'Entidades' },
  { tabla: 'lista_fallas', label: 'Fallas / Atributos', campoExtra: { key: 'grupo' as const, label: 'Grupo' } },
  { tabla: 'lista_fuentes', label: 'Fuentes' },
  { tabla: 'lista_procesos', label: 'Procesos / Servicios', campoExtra: { key: 'correo' as const, label: 'Correo de notificación' } },
  { tabla: 'lista_regimen', label: 'Régimen' },
  { tabla: 'lista_sedes', label: 'Sedes' },
  { tabla: 'lista_tipo_reporte', label: 'Tipo de reporte' },
  { tabla: 'lista_tipo_usuario', label: 'Tipo de usuario' },
]

export default function TablasMaestrasResumen() {
  const [activo, setActivo] = useState(CATALOGOS[0].tabla)
  const catalogo = CATALOGOS.find((c) => c.tabla === activo)!

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Tablas maestras" subtitulo="Catálogos usados en los formularios de PQRSF y Satisfacción" />
      <div className="mb-4 flex flex-wrap gap-2">
        {CATALOGOS.map((c) => (
          <button key={c.tabla} onClick={() => setActivo(c.tabla)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activo === c.tabla ? 'bg-[#0D2D6B] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-[#16468E] hover:text-[#16468E]'
            }`}>
            {c.label}
          </button>
        ))}
      </div>
      <CatalogoEditor key={catalogo.tabla} tabla={catalogo.tabla} label={catalogo.label} campoExtra={catalogo.campoExtra} tieneOrden={catalogo.tieneOrden} />
    </div>
  )
}
