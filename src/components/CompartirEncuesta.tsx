import { useEffect, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Boton, Modal } from './ui'

const ENCUESTA_URL = `${window.location.origin}${import.meta.env.BASE_URL}#/encuesta`
const LOGO_BLANCO = `${import.meta.env.BASE_URL}images/logo_cacsb_blanc.png`
const QR_SIZE = 220

export default function CompartirEncuesta() {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!abierto) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const cx = QR_SIZE / 2
    const cy = QR_SIZE / 2
    const radioExterior = QR_SIZE * 0.15

    // Insignia azul con borde blanco, para que el logo blanco resalte sobre el QR.
    ctx.beginPath(); ctx.arc(cx, cy, radioExterior, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.beginPath(); ctx.arc(cx, cy, radioExterior * 0.86, 0, Math.PI * 2); ctx.fillStyle = '#0D2D6B'; ctx.fill()

    const img = new Image()
    img.onload = () => {
      const logoSize = radioExterior * 1.15
      ctx.drawImage(img, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
    }
    img.src = LOGO_BLANCO
  }, [abierto])

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
            <QRCodeCanvas ref={canvasRef} value={ENCUESTA_URL} size={QR_SIZE} fgColor="#0D2D6B" level="H" />
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
