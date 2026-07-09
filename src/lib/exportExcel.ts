import ExcelJS from 'exceljs'

export async function exportarExcel(nombreArchivo: string, hoja: string, columnas: { header: string; key: string; width?: number }[], filas: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(hoja)
  ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2D6B' } }
  filas.forEach((f) => ws.addRow(f))
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}
