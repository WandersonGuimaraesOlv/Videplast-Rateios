import { chamarApi } from '../../../shared/lib/api.js'

export const testarConexao = () => chamarApi('/teste-rateio', { method: 'POST' })
