import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Boton, Modal } from './ui'

const ENCUESTA_URL = `${window.location.origin}${window.location.pathname}#/encuesta`
const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`
const QR_SIZE = 220
const LOGO_ANCHO_QR = 100 // ancho de la insignia dentro del QR (alto se deriva de la proporción real del logo; con marginSize y nivel de corrección H, ~130 ya no decodifica — 100 es el máximo verificado con jsQR)
const EXPORT_SIZE = 1800 // resolución del PNG descargado, para impresión tipográfica (no el tamaño mostrado en pantalla)
const LOGO_ANCHO_EXPORT = Math.round((LOGO_ANCHO_QR / QR_SIZE) * EXPORT_SIZE)
// La zona de silencio (margen en blanco alrededor del código) es obligatoria en el
// estándar QR para que un lector real la detecte de forma confiable — sin ella
// (marginSize por defecto de qrcode.react es 0) el patrón queda pegado al borde de
// la imagen y ningún lector de celular logra ubicarlo, sin importar el logo.
// Causa raíz real de que el QR no escaneara. 4 módulos es el mínimo del estándar.
const QR_MARGIN = 4

// Compone una vez (fuera de qrcode.react) una insignia azul con el logo blanco,
// para pasarla como imageSettings.src — dibujar directamente sobre el canvas del
// QR no sirve porque la librería lo redimensiona y transforma (devicePixelRatio +
// ctx.scale) en cada render, y cualquier dibujo externo queda mal ubicado o se borra.
// El logo real es un lockup ancho (1909x538, ~3.55:1, incluye el texto "Santa
// Bárbara"), así que la insignia respeta esa proporción en vez de forzarlo a un
// cuadrado — evita distorsión.
function useInsigniaBlanca() {
  const [insignia, setInsignia] = useState<{ url: string; aspecto: number } | null>(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const aspecto = img.naturalWidth / img.naturalHeight
      const escala = 4 // renderizar a mayor resolución que el tamaño mostrado, para que no se vea pixelado
      const padding = 14 * escala
      const logoW = 220 * escala
      const logoH = logoW / aspecto
      const w = logoW + padding * 2
      const h = logoH + padding * 2
      const radio = 14 * escala

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(radio, 0)
      ctx.arcTo(w, 0, w, h, radio)
      ctx.arcTo(w, h, 0, h, radio)
      ctx.arcTo(0, h, 0, 0, radio)
      ctx.arcTo(0, 0, w, 0, radio)
      ctx.closePath()
      ctx.fillStyle = '#0D2D6B'
      ctx.fill()

      ctx.drawImage(img, padding, padding, logoW, logoH)
      setInsignia({ url: canvas.toDataURL('image/png'), aspecto: w / h })
    }
    img.src = LOGO_BLANCO
  }, [])
  return insignia
}

export default function CompartirEncuesta() {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const insignia = useInsigniaBlanca()

  function copiar() {
    void navigator.clipboard.writeText(ENCUESTA_URL)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function descargarPNG() {
    const canvas = exportCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'QR-Encuesta-Satisfaccion-CACsantabarbara.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}>🔗 Compartir encuesta</Boton>
      <Modal open={abierto} onClose={() => setAbierto(false)} titulo="Compartir Encuesta de Satisfacción">
        <div className="flex flex-col items-center gap-4">
          <div className="neu-inset rounded-2xl p-4">
            <QRCodeCanvas
              ref={canvasRef}
              value={ENCUESTA_URL}
              size={QR_SIZE}
              fgColor="#0D2D6B"
              level="H"
              marginSize={QR_MARGIN}
              imageSettings={insignia ? {
                src: insignia.url,
                width: LOGO_ANCHO_QR,
                height: LOGO_ANCHO_QR / insignia.aspecto,
                excavate: true,
              } : undefined}
            />
          </div>
          <QRCodeCanvas
            ref={exportCanvasRef}
            value={ENCUESTA_URL}
            size={EXPORT_SIZE}
            fgColor="#0D2D6B"
            level="H"
            marginSize={QR_MARGIN}
            style={{ display: 'none' }}
            imageSettings={insignia ? {
              src: insignia.url,
              width: LOGO_ANCHO_EXPORT,
              height: LOGO_ANCHO_EXPORT / insignia.aspecto,
              excavate: true,
            } : undefined}
          />
          <Boton onClick={descargarPNG} className="w-full justify-center">⬇ Descargar QR (PNG)</Boton>
          <div className="neu-inset w-full rounded-xl p-3 text-center font-mono text-xs break-all text-slate-600">
            {ENCUESTA_URL}
          </div>
          <Boton variante="secundario" onClick={copiar} className="w-full justify-center">
            {copiado ? '✓ Copiado' : '📋 Copiar enlace'}
          </Boton>
          <p className="text-center text-xs text-slate-400">
            Imprima el QR en sala de espera o comparta el enlace directamente con el paciente. No requiere iniciar sesión.
          </p>
        </div>
      </Modal>
    </>
  )
}
