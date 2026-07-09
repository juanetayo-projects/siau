import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Boton, Modal } from './ui'

const ENCUESTA_URL = `${window.location.origin}${import.meta.env.BASE_URL}#/encuesta`

export default function CompartirEncuesta() {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  function copiar() {
    void navigator.clipboard.writeText(ENCUESTA_URL)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function descargarPNG() {
    const canvas = document.getElementById('qr-encuesta-canvas') as HTMLCanvasElement | null
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
            <QRCodeCanvas id="qr-encuesta-canvas" value={ENCUESTA_URL} size={220} fgColor="#0D2D6B" level="H" />
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
