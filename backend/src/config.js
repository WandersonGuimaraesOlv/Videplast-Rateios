// Única leitura de variáveis de ambiente do backend.
require('dotenv').config();

module.exports = {
  porta: Number(process.env.PORT) || 5000,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  limiteUploadMb: Number(process.env.LIMITE_UPLOAD_MB) || 50,
};
