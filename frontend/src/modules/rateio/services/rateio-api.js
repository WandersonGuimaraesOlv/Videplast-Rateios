import { chamarApi } from '../../../shared/lib/api.js'

export function enviarRateio(arquivoMedicao, arquivoSetores) {
  const formData = new FormData()
  formData.append('medicao', arquivoMedicao)
  formData.append('setores', arquivoSetores)
  return chamarApi('/rateio/impressoras', { method: 'POST', body: formData })
}
