import { useState } from 'react'
import { enviarRateio } from '../services/rateio-api.js'

export function useRateio() {
  const [carregando, setCarregando] = useState(false)
  const [relatorio, setRelatorio] = useState(null)
  const [erro, setErro] = useState('')

  async function processar(arquivosMedicao, arquivoSetores) {
    setCarregando(true)
    setErro('')
    setRelatorio(null)
    const resposta = await enviarRateio(arquivosMedicao, arquivoSetores)
    if (resposta.sucesso) setRelatorio(resposta)
    else setErro(resposta.erro || 'Erro ao processar os arquivos.')
    setCarregando(false)
  }

  return { carregando, relatorio, erro, processar }
}
