/** Baixa a planilha Excel que o servidor devolve em base64 junto com o relatório. */
export function baixarPlanilha(relatorio) {
  const binario = atob(relatorio.planilha)
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = relatorio.nomePlanilha || `rateio-${relatorio.tipo}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
