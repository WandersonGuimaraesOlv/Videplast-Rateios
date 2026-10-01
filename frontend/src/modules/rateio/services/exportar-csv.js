/** CSV com ";" e BOM para abrir direto no Excel em pt-BR. */
export function gerarCsvRelatorio(relatorio) {
  const decimal = (n) => (relatorio.tipo === 'telefonia' ? Number(n).toFixed(2).replace('.', ',') : String(n))
  const titulo = relatorio.tipo === 'telefonia' ? 'Valor (R$)' : 'Total de Páginas'
  const linhas = [
    ['Ordem', 'Setor', titulo],
    ...relatorio.dados.map((d) => [d.ordem, d.setor, decimal(d.total)]),
    ['', 'TOTAL GERAL', decimal(relatorio.totalGeral)],
  ]
  return '﻿' + linhas.map((l) => l.join(';')).join('\r\n')
}

export function baixarCsvRelatorio(relatorio) {
  const blob = new Blob([gerarCsvRelatorio(relatorio)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `rateio-${relatorio.tipo}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
