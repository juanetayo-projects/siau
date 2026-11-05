export type Adjunto = { nombre: string; url: string; tamano?: number | null }

type RespuestaConAdjuntos = {
  adjuntos?: Adjunto[] | null
  archivo_url?: string | null
  archivo_nombre?: string | null
}

/** Adjuntos de una respuesta, incluido el archivo único de las respuestas históricas. */
export function adjuntosDeRespuesta(r: RespuestaConAdjuntos): Adjunto[] {
  const lista: Adjunto[] = r.adjuntos?.length
    ? r.adjuntos
    : r.archivo_url ? [{ nombre: r.archivo_nombre || 'Documento adjunto', url: r.archivo_url }] : []
  // La lista llega del formulario público: solo se enlazan URLs web (evita javascript:).
  return lista.filter((a) => /^https?:\/\//i.test(a?.url ?? ''))
}

export function formatoTamano(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
