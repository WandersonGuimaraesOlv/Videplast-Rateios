const config = require('../../../config');
const supabase = require('../../../lib/supabase');

/** Confere se o Supabase configurado no .env responde. */
async function verificarSupabase() {
  if (!supabase) return { sucesso: false, erro: 'Supabase não configurado no .env do servidor.' };
  try {
    const resposta = await fetch(`${config.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: config.supabaseAnonKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) return { sucesso: false, erro: `Supabase respondeu HTTP ${resposta.status}.` };
    return { sucesso: true, mensagem: 'API e Supabase respondendo normalmente.' };
  } catch (err) {
    return { sucesso: false, erro: 'Supabase inacessível: ' + err.message };
  }
}

module.exports = { verificarSupabase };
