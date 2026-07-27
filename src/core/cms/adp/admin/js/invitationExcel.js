import { tGlobal } from '@/i18n/index.js'

const EMAIL_HEADER = 'Email'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function loadExcelJS() {
  const ExcelJSModule = await import('exceljs')
  const ExcelJS = ExcelJSModule.default || ExcelJSModule.ExcelJS || ExcelJSModule
  return ExcelJS.Workbook || ExcelJS
}

function normalizeCellValue(value) {
  if (value == null) {
    return ''
  }
  if (typeof value === 'object' && value.text != null) {
    return String(value.text).trim()
  }
  return String(value).trim()
}

function findEmailColumnIndex(headerRow) {
  const normalizedHeaders = headerRow.map((cell) => normalizeCellValue(cell).toLowerCase())
  const emailIndex = normalizedHeaders.findIndex(
    (header) => header === 'email' || header === 'e-mail'
    // Intentional RU Excel header aliases for import compatibility (do not i18n)
    || header === 'почта' || header === 'электронная почта',
  )
  return emailIndex >= 0 ? emailIndex : 0
}

export function isValidEmailFormat(email) {
  return EMAIL_REGEX.test(email)
}

export async function downloadInvitationTemplate() {
  const Workbook = await loadExcelJS()
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet(tGlobal('admin.invitations.sheetName'))

  worksheet.columns = [{ header: EMAIL_HEADER, key: 'email', width: 40 }]
  worksheet.getRow(1).font = { bold: true }
  worksheet.addRow({ email: 'user@example.com' })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'shablon_priglashenij.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

export async function parseInvitationEmailsFromFile(file) {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith('.csv')) {
    return parseCsvEmails(file)
  }
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelEmails(file)
  }
  throw new Error(tGlobal('admin.invitations.fileTypeError'))
}

async function parseCsvEmails(file) {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) {
    return []
  }

  const delimiter = lines[0].includes(';') ? ';' : ','
  const headerCells = lines[0].split(delimiter).map((cell) => cell.trim())
  const emailColumnIndex = findEmailColumnIndex(headerCells)
  const emails = []

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(delimiter)
    const email = normalizeCellValue(cells[emailColumnIndex])
    if (email) {
      emails.push(email)
    }
  }

  return emails
}

async function parseExcelEmails(file) {
  const Workbook = await loadExcelJS()
  const workbook = new Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return []
  }

  const rows = []
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push(row.values.slice(1))
  })

  if (!rows.length) {
    return []
  }

  const emailColumnIndex = findEmailColumnIndex(rows[0])
  const emails = []

  for (let i = 1; i < rows.length; i += 1) {
    const email = normalizeCellValue(rows[i][emailColumnIndex])
    if (email) {
      emails.push(email)
    }
  }

  return emails
}

export function buildEmailPreviewList(rawEmails) {
  const seen = new Set()
  const preview = []

  rawEmails.forEach((rawEmail, index) => {
    const email = rawEmail.trim().toLowerCase()
    if (!email) {
      return
    }

    if (seen.has(email)) {
      preview.push({
        email,
        row: index + 2,
        status: 'duplicate',
        statusLabel: tGlobal('admin.invitations.statusDuplicate'),
        canInvite: false,
      })
      return
    }
    seen.add(email)

    if (!isValidEmailFormat(email)) {
      preview.push({
        email,
        row: index + 2,
        status: 'invalid',
        statusLabel: tGlobal('admin.invitations.statusInvalidEmail'),
        canInvite: false,
      })
      return
    }

    preview.push({
      email,
      row: index + 2,
      status: 'ready',
      statusLabel: tGlobal('admin.invitations.statusReady'),
      canInvite: true,
    })
  })

  return preview
}
