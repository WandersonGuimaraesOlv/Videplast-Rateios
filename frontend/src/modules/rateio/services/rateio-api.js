import { chamarApi } from '../../../shared/lib/api.js'

export function enviarRateio(arquivosMedicao, arquivoSetores) {
  const formData = new FormData()
  arquivosMedicao.forEach((arquivo) => formData.append('medicao', arquivo))
  formData.append('setores', arquivoSetores)
  return chamarApi('/rateio/impressoras', { method: 'POST', body: formData })
}
