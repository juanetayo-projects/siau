import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RespuestaSatisfaccion } from '../lib/satisfaccion'

export type FiltrosEncuesta = {
  sede?: string
  servicio?: string
  entidad?: string
  desde?: string
  hasta?: string
  search?: string
}

export function useSurveyData(filters: FiltrosEncuesta = {}) {
  const [data, setData] = useState<RespuestaSatisfaccion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('satisfaccion_respuestas')
        .select('*', { count: 'exact' })
        .order('fecha', { ascending: false })

      if (filters.sede) query = query.eq('sede', filters.sede)
      if (filters.servicio) query = query.eq('servicio', filters.servicio)
      if (filters.entidad) query = query.eq('entidad_salud', filters.entidad)
      if (filters.desde) query = query.gte('fecha', filters.desde)
      if (filters.hasta) query = query.lte('fecha', filters.hasta + 'T23:59:59')
      if (filters.search) {
        query = query.or(`nombre_completo.ilike.%${filters.search}%,numero_identificacion.ilike.%${filters.search}%`)
      }

      query = query.range((page - 1) * pageSize, page * pageSize - 1)

      const { data: rows, count, error: err } = await query
      if (err) throw err
      setData((rows ?? []) as RespuestaSatisfaccion[])
      setTotal(count ?? 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { void fetch() }, [fetch])

  return { data, total, loading, error, page, setPage, pageSize, refetch: fetch }
}
