import { chamarApi } from '../../../shared/lib/api.js'

/** Fatura TIM (PDF) + Controle de Chips → rateio por centro de custo, com a planilha em base64. */
export function enviarRateioTelefonia(fatura, controle) {
  const formData = new FormData()
  formData.append('fatura', fatura)
  formData.append('controle', controle)
  return chamarApi('/rateio/telefonia', { method: 'POST', body: formData })
}
