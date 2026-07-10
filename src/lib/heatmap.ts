import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const COLORES_DEFECTO = ['#EAF0FA', '#7FA0D6', '#16468E', '#0D2D6B']
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const HORAS = Array.from({ length: 24 }, (_, i) => i)

export function useHeatmapColores(modulo: 'pqrsf' | 'satisfaccion') {
  const [colores, setColores] = useState<string[]>(COLORES_DEFECTO)
  useEffect(() => {
    void supabase.from('heatmap_config').select('colores').eq('modulo', modulo).single()
      .then(({ data }) => { if (data?.colores?.length) setColores(data.colores) })
  }, [modulo])
  return colores
}

function diaSemana(iso: string): number {
  const d = new Date(iso)
  return (d.getDay() + 6) % 7 // 0=Lun .. 6=Dom
}

// Resumen de los valores más frecuentes de un campo dentro de una celda (para el tooltip).
export function resumenCelda<T>(idxs: number[], filas: T[], campo: keyof T, top = 3): string {
  if (idxs.length === 0) return ''
  const conteo: Record<string, number> = {}
  idxs.forEach((i) => {
    const v = (filas[i]?.[campo] as unknown as string) || 'Sin dato'
    conteo[v] = (conteo[v] ?? 0) + 1
  })
  return Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, top)
    .map(([k, v]) => `${k} (${v})`).join('<br/>')
}

export function construirGrilla(fechas: string[]): { data: [number, number, number][]; max: number; celdas: Record<string, number[]> } {
  const grid: number[][] = Array.from({ length: 7 }, () => HORAS.map(() => 0))
  const celdas: Record<string, number[]> = {}
  fechas.forEach((f, idx) => {
    if (!f) return
    const d = diaSemana(f)
    const h = new Date(f).getHours()
    grid[d][h]++
    const key = `${d}-${h}`
    celdas[key] = celdas[key] ?? []
    celdas[key].push(idx)
  })
  const data: [number, number, number][] = []
  let max = 0
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
    const v = grid[d][h]
    if (v > max) max = v
    data.push([h, d, v])
  }
  return { data, max, celdas }
}
