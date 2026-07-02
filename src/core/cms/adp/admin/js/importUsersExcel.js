const COLUMNS = [
  { header: 'Фамилия', key: 'last_name', width: 22 },
  { header: 'Имя', key: 'first_name', width: 18 },
  { header: 'Отчество', key: 'middle_name', width: 22 },
  { header: 'Логин', key: 'username', width: 20 },
  { header: 'E-mail', key: 'email', width: 32 },
]

async function loadExcelJS() {
  const ExcelJSModule = await import('exceljs')
  const ExcelJS = ExcelJSModule.default || ExcelJSModule.ExcelJS || ExcelJSModule
  return ExcelJS.Workbook || ExcelJS
}

export async function downloadImportUsersTemplate() {
  const Workbook = await loadExcelJS()
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet('Пользователи')

  worksheet.columns = COLUMNS
  worksheet.getRow(1).font = { bold: true }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  worksheet.addRow({
    last_name: 'Иванов',
    first_name: 'Иван',
    middle_name: 'Иванович',
    username: 'ivanov.ii',
    email: 'ivanov@example.com',
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'shablon_zagruzki_polzovatelej.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
