// Exportación a imagen (PNG) y PDF de una sección del dashboard, con título y logo institucional.
// html2canvas-pro (no html2canvas) porque Tailwind v4 usa oklch()/color-mix() en sus
// colores con nombre (emerald, amber, violet, cyan...) y el html2canvas original no los
// soporta: lanza una excepción silenciosa y el botón de exportar "no hace nada".
import html2canvas from 'html2canvas-pro'

async function logoBase64(): Promise<string> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}images/logo_cacsb2.png`)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

function descargar(blob: Blob, archivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = archivo; a.click()
  URL.revokeObjectURL(url)
}

export async function exportarImagenSeccion(elementId: string, archivo: string) {
  const el = document.getElementById(elementId)
  if (!el) throw new Error(`No se encontró la sección a exportar (${elementId}).`)
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => { if (blob) { descargar(blob, `${archivo}.png`); resolve() } else { reject(new Error('No se pudo generar la imagen.')) } }, 'image/png')
  })
}

export async function exportarPDFSeccion(elementId: string, titulo: string, subtitulo: string, archivo: string) {
  const el = document.getElementById(elementId)
  if (!el) throw new Error(`No se encontró la sección a exportar (${elementId}).`)
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/png')

  const pdfMake = (await import('pdfmake/build/pdfmake')).default as any
  const pdfFonts = (await import('pdfmake/build/vfs_fonts')) as any
  pdfMake.vfs = pdfFonts.vfs ?? pdfFonts.pdfMake?.vfs ?? pdfFonts.default?.vfs ?? pdfFonts.default?.pdfMake?.vfs
  const logo = await logoBase64()

  const pageWidthPt = 780
  const imgWidth = pageWidthPt
  const imgHeight = imgWidth * (canvas.height / canvas.width)

  const doc = pdfMake.createPdf({
    pageOrientation: 'landscape',
    pageMargins: [24, 90, 24, 30],
    header: {
      margin: [24, 16, 24, 0],
      columns: [
        logo ? { image: logo, width: 90 } : { text: '' },
        [
          { text: titulo, style: 'h' },
          { text: 'Clínica CAC Santa Bárbara · SIAU', style: 'sub' },
          { text: subtitulo, style: 'sub' },
          { text: `Generado ${new Date().toLocaleString('es-CO')}`, style: 'sub' },
        ],
      ],
    },
    content: [{ image: imgData, width: imgWidth, height: imgHeight }],
    styles: {
      h: { fontSize: 14, bold: true, color: '#0D2D6B', margin: [10, 4, 0, 0] },
      sub: { fontSize: 8, color: '#64748B', margin: [10, 1, 0, 0] },
    },
  })
  doc.getBlob((blob: Blob) => descargar(blob, `${archivo}.pdf`))
}
