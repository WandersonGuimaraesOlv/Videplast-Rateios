import { API_BASE } from '../../app/config.js'

/**
 * Chamada à API do backend. Sempre devolve { sucesso, ... } e nunca lança erro de rede,
 * para a tela mostrar a mensagem em vez de quebrar.
 */
export async function chamarApi(caminho, opcoes = {}) {
  try {
    const resposta = await fetch(`${API_BASE}${caminho}`, opcoes)
    const corpo = await resposta.json().catch(() => null)
    if (!corpo) return { sucesso: false, erro: `Resposta inválida do servidor (HTTP ${resposta.status}).` }
    return corpo
  } catch {
    return { sucesso: false, erro: 'Não foi possível alcançar o servidor. Verifique a rede.' }
  }
}
