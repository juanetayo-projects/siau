export const SEDES = [
  'Central Especialistas',
  'Clínica Alta Complejidad Santa Barbara',
  'Torre de Salud',
  'Urgencias',
]

export const ENTIDADES = [
  'ARL', 'Asmet Salud', 'Batallón', 'Colsanitas Medicina Prepagada', 'Comfenalco',
  'Compañía Aseguradora SOAT', 'Coolmedica Medicina Prepagada', 'Coomeva',
  'Coomeva Medicina Prepagada', 'Coosalud', 'Cosmitec', 'Ecopetrol', 'Emssanar',
  'Famisanar', 'Nueva EPS', 'Nueva EPS - PAC', 'Particular', 'Previser', 'Salud Total',
  'Sanitas', 'SOS', 'SOS - PAC', 'Sura', 'Sura - PAC', 'Unicauca', 'Unisalud',
]

export const SERVICIOS = [
  'Angiografía (cateterismo cardiaco)', 'Apoyo Diagnóstico (ecocardiograma)',
  'Apoyo Diagnóstico (espirometría)', 'Apoyo Diagnóstico (mesa basculante)', 'Cirugía',
  'Consulta externa (medicina especializada)', 'Consulta externa (medicina general)',
  'Consulta externa domiciliaria (medicina general)', 'Consulta externa domiciliaria (trabajo social)',
  'Hospital día (consulta)', 'Hospital día (medicamentos)', 'Hospital día (procedimientos dermatología)',
  'Hospitalización', 'Hospitalización Piso 2', 'Hospitalización Piso 7', 'Hospitalización Piso 8',
  'Imágenes diagnósticas', 'Laboratorio clínico', 'Laboratorio domicilio',
  'Traslado de pacientes en ambulancia', 'Unidad de cuidados intensivos',
  'Unidad de cuidados intermedio', 'Urgencias',
]

export const EXPERIENCIA_GLOBAL = ['Muy buena', 'Buena', 'Regular', 'Mala', 'Muy mala'] as const

export const MOTIVOS_INSATISFACCION = [
  'Actitud inadecuada del personal asistencial', 'Actitud inadecuada del personal de recepción',
  'Calidad del contacto del personal asistencial', 'Cancelación o reprogramación de procedimiento quirúrgico',
  'Claridad en la información suministrada en la consulta',
  'Demora en la toma de imágenes diagnosticas (Resonancias, TAC de cráneo, ecografías, radiografías)',
  'Demora para la toma de laboratorio clínico',
  'Demora para ser atendido por el profesional (médico general o especialista)',
  'Difícil acceso telefónico para solicitud de citas',
  'Efecto no esperado o complicación después de intervención',
  'Errores en prescripción de formulas medicas (errores de digitación, cantidad, medicamento)',
  'Inconformidad conductas médicas instauradas',
  'Información incorrecta o direccionamiento inadecuado por parte del personal de recepción',
  'Instalaciones inadecuadas', 'No disponibilidad de agenda',
  'No retorno de llamada por parte del contact center', 'Reprogramación de cita o turno',
  'Retraso en la atención para la admisión y registro del paciente (personal de recepción)',
  'Retraso en la entrega de resultados', 'Técnica inapropiada en la toma de muestras',
  'Valor elevado en tarifa (cuota moderadora, copago)',
]

export const RATING_COLORS: Record<number, { bg: string; text: string; border: string; label: string; hex: string }> = {
  1: { bg: 'bg-red-500',    text: 'text-white',   border: 'border-red-500',    label: 'Muy malo',  hex: '#EF4444' },
  2: { bg: 'bg-orange-500', text: 'text-white',   border: 'border-orange-500', label: 'Malo',      hex: '#F97316' },
  3: { bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-400', label: 'Regular',  hex: '#FACC15' },
  4: { bg: 'bg-blue-500',   text: 'text-white',   border: 'border-blue-500',   label: 'Bueno',     hex: '#3B82F6' },
  5: { bg: 'bg-green-500',  text: 'text-white',   border: 'border-green-500',  label: 'Excelente', hex: '#22C55E' },
}

export const EXPERIENCIA_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  'Muy buena': { bg: 'bg-green-500',  text: 'text-white',    hex: '#22C55E' },
  'Buena':     { bg: 'bg-blue-500',   text: 'text-white',    hex: '#3B82F6' },
  'Regular':   { bg: 'bg-yellow-400', text: 'text-gray-900', hex: '#FACC15' },
  'Mala':      { bg: 'bg-orange-500', text: 'text-white',    hex: '#F97316' },
  'Muy mala':  { bg: 'bg-red-500',    text: 'text-white',    hex: '#EF4444' },
}

export type RespuestaSatisfaccion = {
  id: number
  fecha: string
  nombre_completo: string | null
  numero_identificacion: string | null
  telefono: string | null
  sede: string
  entidad_salud: string
  servicio: string
  p1_recepcion: number | null
  p2_personal_asistencial: number | null
  p3_comodidad: number | null
  p4_experiencia_global: string | null
  p5_motivo_insatisfaccion: string | null
  p6_recomendaria: 'Si' | 'No' | null
  comentarios: string | null
  created_at: string
}
