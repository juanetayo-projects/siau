import ExcelJS from 'exceljs'

const AZUL = 'FF0D2D6B'

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

export type ColExport = { header: string; key: string; width?: number }

export async function exportarExcel(
  nombreArchivo: string, hoja: string, columnas: ColExport[], filas: Record<string, unknown>[],
  opciones?: { titulo?: string; filtrosTexto?: string },
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SIAU · Clínica CAC Santa Bárbara'
  const ws = wb.addWorksheet(hoja, { views: [{ state: 'frozen', ySplit: 4 }] })

  const titulo = opciones?.titulo ?? hoja
  const lastCol = String.fromCharCode(64 + Math.min(Math.max(columnas.length, 2), 26))

  const b64 = await logoBase64()
  if (b64) {
    const imgId = wb.addImage({ base64: b64, extension: 'png' })
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 110, height: 44 } })
  }

  ws.mergeCells(`B1:${lastCol}1`)
  const tCell = ws.getCell('B1')
  tCell.value = titulo
  tCell.font = { bold: true, size: 14, color: { argb: AZUL } }
  tCell.alignment = { vertical: 'middle' }
  ws.getRow(1).height = 30

  ws.mergeCells(`B2:${lastCol}2`)
  ws.getCell('B2').value = `Clínica CAC Santa Bárbara · SIAU · Generado ${new Date().toLocaleString('es-CO')}`
  ws.getCell('B2').font = { size: 9, color: { argb: 'FF64748B' } }

  ws.mergeCells(`B3:${lastCol}3`)
  ws.getCell('B3').value = `Filtros: ${opciones?.filtrosTexto || 'Sin filtros aplicados'}`
  ws.getCell('B3').font = { size: 9, italic: true, color: { argb: 'FF64748B' } }

  ws.columns = columnas.map((c) => ({ key: c.key, width: c.width ?? 20 }))
  const head = ws.getRow(4)
  columnas.forEach((c, i) => {
    const cell = head.getCell(i + 1)
    cell.value = c.header
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
  head.height = 22

  filas.forEach((f, idx) => {
    const r = ws.addRow(f)
    if (idx % 2) r.eachCell({ includeEmpty: true }, (c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    })
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}
