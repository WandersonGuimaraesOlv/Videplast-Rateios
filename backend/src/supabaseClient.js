require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// No Backend (Node.js), usamos process.env para ler o arquivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Validação para evitar o crash fatal do servidor
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("\n=========================================================");
    console.error("❌ ERRO CRÍTICO: Variáveis do Supabase não encontradas!");
    console.error("Verifique se o arquivo .env existe na raiz da pasta backend");
    console.error("e se possui os campos SUPABASE_URL e SUPABASE_ANON_KEY.");
    console.error("=========================================================\n");
} else {
    try {
        // Inicializa o cliente usando as variáveis do backend
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log("[Supabase] Cliente inicializado com sucesso no Backend.");
    } catch (err) {
        console.error("❌ Erro ao instanciar o cliente do Supabase:", err.message);
    }
}

// Exportação padrão para o Node.js usar com require()
module.exports = supabase;