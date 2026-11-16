import { chamarApi } from '../../../shared/lib/api.js'

/**
 * Fatura TIM (PDF) + Controle de Chips → rateio por centro de custo, com a planilha em base64.
 * ccValorGeral (opcional): CC que recebe inteiro o valor da fatura fora das linhas (ex.: multa).
 */
export function enviarRateioTelefonia(fatura, controle, ccValorGeral = '') {
  const formData = new FormData()
  formData.append('fatura', fatura)
  formData.append('controle', controle)
  if (ccValorGeral) formData.append('ccValorGeral', ccValorGeral)
  return chamarApi('/rateio/telefonia', { method: 'POST', body: formData })
}
