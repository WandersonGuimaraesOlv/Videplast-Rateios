require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Validação estrita para evitar crash fatal do servidor Node
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("\n=========================================================");
    console.error("❌ ERRO CRÍTICO: Variáveis do Supabase não encontradas!");
    console.error("Verifique se o arquivo .env existe na raiz da pasta backend");
    console.error("e se possui os campos SUPABASE_URL e SUPABASE_ANON_KEY.");
    console.error("=========================================================\n");
} else {
    // Só tenta inicializar se as variáveis existirem de fato
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("[Supabase] Cliente inicializado com sucesso.");
    } catch (err) {
        console.error("❌ Erro ao instanciar o cliente do Supabase:", err.message);
    }
}

module.exports = supabase;