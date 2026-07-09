import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Boton, Modal } from './ui'

const ENCUESTA_URL = `${window.location.origin}${import.meta.env.BASE_URL}#/encuesta`
const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`
const QR_SIZE = 220

// Compone una vez (fuera de qrcode.react) una insignia azul con el logo blanco,
// para pasarla como imageSettings.src — dibujar directamente sobre el canvas del
// QR no sirve porque la librería lo redimensiona y transforma (devicePixelRatio +
// ctx.scale) en cada render, y cualquier dibujo externo queda mal ubicado o se borra.
function useInsigniaBlanca() {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const size = 88
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const r = size / 2
      ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.fillStyle = '#0D2D6B'; ctx.fill()
      const logoSize = size * 0.6
      ctx.drawImage(img, r - logoSize / 2, r - logoSize / 2, logoSize, logoSize)
      setUrl(canvas.toDataURL('image/png'))
    }
    img.src = LOGO_BLANCO
  }, [])
  return url
}

export default function CompartirEncuesta() {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const insignia = useInsigniaBlanca()

  function copiar() {
    void navigator.clipboard.writeText(ENCUESTA_URL)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function descargarPNG() {
    const canvas = canvasRef.current
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
            <QRCodeCanvas
              ref={canvasRef}
              value={ENCUESTA_URL}
              size={QR_SIZE}
              fgColor="#0D2D6B"
              level="H"
              imageSettings={insignia ? { src: insignia, height: 46, width: 46, excavate: true } : undefined}
            />
          </div>
          <Boton onClick={descargarPNG} className="w-full justify-center">⬇ Descargar QR (PNG)</Boton>
          <div className="w-full rounded-xl bg-slate-50 p-3 text-center font-mono text-xs break-all text-slate-600">
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
