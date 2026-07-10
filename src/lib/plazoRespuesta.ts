export const PLAZO_DIAS_MAP: Record<string, number> = {
  '24 horas': 1,
  '48 horas': 2,
  '72 horas': 3,
  '1 a 5 días calendario': 5,
}

export function diasDePlazo(diasHabiles: string | null): number | null {
  if (!diasHabiles) return null
  if (PLAZO_DIAS_MAP[diasHabiles] != null) return PLAZO_DIAS_MAP[diasHabiles]
  const m = diasHabiles.match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

export type EstadoPlazo = 'verde' | 'amarillo' | 'rojo' | 'completado' | 'sin_plazo'

export function calcularPlazo(diasHabiles: string | null, fechaInicio: string | null, estaCerrado: boolean): {
  plazoDias: number | null; diasRestantes: number | null; pct: number; estado: EstadoPlazo
} {
  const plazoDias = diasDePlazo(diasHabiles)
  if (!plazoDias || !fechaInicio) return { plazoDias, diasRestantes: null, pct: 0, estado: 'sin_plazo' }

  const inicio = new Date(fechaInicio.length <= 10 ? `${fechaInicio}T00:00:00` : fechaInicio)
  const hoy = new Date()
  const msPorDia = 86400000
  const diasTranscurridos = Math.floor((hoy.getTime() - inicio.getTime()) / msPorDia)
  const diasRestantes = plazoDias - diasTranscurridos
  const pct = Math.max(0, Math.min(100, (diasTranscurridos / plazoDias) * 100))

  if (estaCerrado) return { plazoDias, diasRestantes, pct: 100, estado: 'completado' }

  let estado: EstadoPlazo
  if (diasRestantes <= 0) estado = 'rojo'
  else if (diasRestantes <= Math.max(1, Math.ceil(plazoDias / 3))) estado = 'amarillo'
  else estado = 'verde'

  return { plazoDias, diasRestantes, pct, estado }
}
