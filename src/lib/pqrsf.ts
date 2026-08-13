export const TIPO_REPORTE_UI: Record<string, { icon: string; desc: string }> = {
  'Petición': { icon: '📄', desc: 'Solicitud de información, documentos o actuaciones de la institución' },
  'Queja': { icon: '⚠️', desc: 'Manifestación de inconformidad por la prestación del servicio' },
  'Reclamo': { icon: '⚖️', desc: 'Exigencia de un derecho que se considera vulnerado o desconocido' },
  'Sugerencia': { icon: '💡', desc: 'Propuesta para mejorar los procesos o servicios de la institución' },
  'Felicitación': { icon: '⭐', desc: 'Reconocimiento por una experiencia positiva o excelente atención' },
}

export const TIPO_USUARIO_UI: Record<string, { icon: string }> = {
  'Familiar/Paciente': { icon: '👨‍👩‍👧' },
  'Asegurador': { icon: '🛡️' },
  'Ente de Control / SuperSalud': { icon: '🏛️' },
}

export const PLAZOS_RESPUESTA = ['24 horas', '48 horas', '72 horas', '1 a 5 días calendario']

// Tipos de usuario para los que el plazo de respuesta se resalta en rojo (asegurador / control).
export const TIPOS_USUARIO_ALERTA_ROJA = ['Asegurador', 'Ente de Control / SuperSalud']

export type Semaforo = 'amarillo' | 'naranja' | 'rojo'

// El color de cada Falla/Atributo ya no es un mapa estático: se edita en
// Administrador > Tablas maestras > Fallas / Atributos y vive en la columna
// `color` de `lista_fallas` (ver ListaFalla).
export const SEMAFORO_CFG: Record<Semaforo, { bg: string; fg: string; dot: string; label: string }> = {
  amarillo: { bg: '#fef9c3', fg: '#92400e', dot: '#ca8a04', label: 'Amarillo' },
  naranja: { bg: '#ffedd5', fg: '#9a3412', dot: '#f97316', label: 'Naranja' },
  rojo: { bg: '#fee2e2', fg: '#991b1b', dot: '#dc2626', label: 'Rojo' },
}

export type ListaItem = { nombre: string }
export type ListaProceso = { nombre: string; correo: string | null }
export type ListaFalla = { nombre: string; grupo: string | null; color: Semaforo }

export const CAMPOS_PERMITIDOS_REPORTE = [
  'tipo_reporte', 'entidad', 'sede', 'proceso', 'fecha_manifestacion', 'fuente',
  'fecha_apertura', 'tipo_usuario', 'convenio_eps', 'regimen', 'nombre_paciente',
  'numero_identificacion', 'direccion', 'telefono', 'email_reporta', 'descripcion',
  'falla_atributo', 'especialidad', 'colaborador', 'correo_proceso',
  'dias_habiles', 'archivo_url', 'archivo_nombre',
] as const
