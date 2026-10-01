const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let supabase = null;

// Sem as variáveis o servidor continua de pé; só o diagnóstico acusa a falta.
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.warn('[Supabase] SUPABASE_URL/SUPABASE_ANON_KEY não configurados.');
} else {
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    console.log('[Supabase] Cliente inicializado.');
  } catch (err) {
    console.error('[Supabase] Erro ao instanciar o cliente:', err.message);
  }
}

module.exports = supabase;
