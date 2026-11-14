export function exportCSV(category, usernames) {
  const quote = value => `"${String(value).replaceAll('"', '""')}"`
  const csv = ['username', ...usernames].map(quote).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `instagram-${category}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
