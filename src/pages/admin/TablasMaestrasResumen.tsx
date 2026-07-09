import { PageHeader } from '../../components/ui'
import CatalogoEditor from '../../components/CatalogoEditor'

export default function TablasMaestrasResumen() {
  return (
    <div>
      <PageHeader titulo="Tablas maestras · Resumen" subtitulo="Catálogos usados en los formularios de PQRSF" />
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
  )
}
