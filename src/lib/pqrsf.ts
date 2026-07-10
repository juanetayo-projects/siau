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

export const FALLA_SEMAFORO: Record<string, 'verde' | 'amarillo' | 'rojo'> = {
  '1. Caída del sistema': 'verde', '1. Cambio de Profesional': 'verde',
  '1. No entrega de Resultados': 'verde', '1. No responde el contact center': 'verde',
  '1. Retraso en admisión': 'verde', '1. Servicio no contratado': 'verde',
  '1. Servicio no disponible en la sede': 'verde',
  '1. Valor elevado en tarifa (cuota moderadora, copago, cotización particular)': 'amarillo',
  '2. Administración tardía de medicamentos y/o conductas': 'amarillo',
  '2. Demora en los trámites de remisión': 'amarillo',
  '2. Inoportunidad en la programación de ayudas diagnostica intrahospitalarias': 'amarillo',
  '2. No disponibilidad de agenda': 'verde', '2. No recibió llamada de retorno': 'verde',
  '2. Recurso limitado': 'amarillo', '2. Reprogramación de cita o turno': 'verde',
  '2. Retraso en la atención': 'amarillo', '2. Retraso en la entrega de resultados': 'verde',
  '2. Retraso en la programación de procedimientos': 'verde',
  '2. Retraso en la respuesta interconsulta': 'verde',
  '3. Daño en infraestructura': 'verde', '3. Identificación incorrecta del paciente': 'amarillo',
  '3. Limpieza': 'verde', '3. Procedimiento asistencial inapropiado': 'amarillo',
  '4. Errores en formulas': 'verde', '4. Inconformidad con tratamiento': 'rojo',
  '4. Información Errada': 'rojo', '4. Retraso en autorización home care': 'amarillo',
  '5. Falta de información al paciente para su intervención': 'rojo',
  '6. Calidad/cantidad en la alimentación': 'verde',
  '6. Disposición y flexibilidad de quien le atiende': 'verde',
  '6. Instalaciones no confortables': 'amarillo', '6. Ruido': 'amarillo',
  '6. Trato humanizado': 'rojo', '7. Felicitaciones': 'verde',
}

export const SEMAFORO_CFG: Record<'verde' | 'amarillo' | 'rojo', { bg: string; fg: string; dot: string; label: string }> = {
  verde: { bg: '#dcfce7', fg: '#15803d', dot: '#16a34a', label: 'Verde' },
  amarillo: { bg: '#fef9c3', fg: '#92400e', dot: '#ca8a04', label: 'Amarillo' },
  rojo: { bg: '#fee2e2', fg: '#991b1b', dot: '#dc2626', label: 'Rojo' },
}

export type ListaItem = { nombre: string }
export type ListaProceso = { nombre: string; correo: string | null }
export type ListaFalla = { nombre: string; grupo: string | null }

export const CAMPOS_PERMITIDOS_REPORTE = [
  'tipo_reporte', 'entidad', 'sede', 'proceso', 'fecha_manifestacion', 'fuente',
  'fecha_apertura', 'tipo_usuario', 'convenio_eps', 'regimen', 'nombre_paciente',
  'numero_identificacion', 'direccion', 'telefono', 'email_reporta', 'descripcion',
  'falla_atributo', 'especialidad', 'colaborador', 'correo_proceso',
  'dias_habiles', 'archivo_url', 'archivo_nombre',
] as const
