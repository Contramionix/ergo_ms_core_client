const escapeHtml = (text) => {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = String(text)
  return div.innerHTML
}

const parseMarkdownTable = (markdownTable) => {
  try {
    const lines = markdownTable.trim().split('\n').map((line) => line.trim()).filter((line) => line)
    if (lines.length < 2) return markdownTable

    let separatorIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\|[\s\-:|]+\|$/)) {
        separatorIndex = i
        break
      }
    }
    if (separatorIndex === -1) return markdownTable

    const headerLine = lines[0]
    if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) return markdownTable

    const headers = headerLine
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell, index, arr) => index > 0 && index < arr.length - 1)
    if (headers.length === 0) return markdownTable

    const dataLines = lines.slice(separatorIndex + 1)
    const rows = dataLines
      .filter((line) => line.startsWith('|') && line.endsWith('|'))
      .map((line) =>
        line
          .split('|')
          .map((cell) => cell.trim())
          .filter((cell, index, arr) => index > 0 && index < arr.length - 1)
      )
      .filter((row) => row.length > 0)

    let html = '<div class="markdown-table-wrapper"><table class="markdown-table">'
    html += '<thead><tr>'
    headers.forEach((header) => {
      html += `<th>${escapeHtml(header)}</th>`
    })
    html += '</tr></thead>'
    if (rows.length > 0) {
      html += '<tbody>'
      rows.forEach((row) => {
        html += '<tr>'
        headers.forEach((_, index) => {
          const cell = row[index] || ''
          html += `<td>${escapeHtml(cell)}</td>`
        })
        html += '</tr>'
      })
      html += '</tbody>'
    }
    html += '</table></div>'
    return html
  } catch {
    return markdownTable
  }
}

export function formatMarkdown(text) {
  if (!text) return ''

  let content = text
  const tables = []
  let tableIndex = 0
  const lines = content.split('\n')
  const processedLines = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      let tableStart = i
      let tableLines = [trimmedLine]
      i++

      while (i < lines.length) {
        const nextLine = lines[i]
        const trimmedNextLine = nextLine.trim()
        if (trimmedNextLine.startsWith('|') && trimmedNextLine.endsWith('|')) {
          tableLines.push(trimmedNextLine)
          i++
        } else if (trimmedNextLine === '' && i + 1 < lines.length) {
          const afterEmpty = lines[i + 1].trim()
          if (afterEmpty.startsWith('|') && afterEmpty.endsWith('|')) {
            i++
          } else break
        } else break
      }

      let hasSeparator = false
      let separatorIndex = -1
      for (let j = 0; j < tableLines.length; j++) {
        const cells = tableLines[j].split('|').map((c) => c.trim()).filter((c) => c)
        if (cells.length > 0 && cells.every((cell) => /^[\s\-:]+$/.test(cell))) {
          hasSeparator = true
          separatorIndex = j
          break
        }
      }

      if (hasSeparator && tableLines.length >= 2 && separatorIndex > 0) {
        const tableText = tableLines.join('\n')
        const tableId = `md-table-${tableIndex++}`
        const htmlTable = parseMarkdownTable(tableText)
        if (htmlTable !== tableText && htmlTable.includes('<table')) {
          tables.push({ id: tableId, html: htmlTable })
          processedLines.push(`__TABLE_${tableId}__`)
          continue
        }
      }
      for (let k = tableStart; k < i; k++) processedLines.push(lines[k])
      continue
    }
    processedLines.push(lines[i])
    i++
  }

  content = processedLines.join('\n')

  content = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')

  tables.forEach((table) => {
    content = content.replace(`__TABLE_${table.id}__`, table.html)
  })

  content = content.replace(/\n{3,}/g, '\n\n').trim().replace(/\n/g, '<br>')
  return content
}
