require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS para permitir requisições do frontend (Vite)
app.use(cors());
app.use(express.json());

// Rota base de verificação do status da API
app.get('/', (req, res) => {
  res.send('API do Sistema de Rateios rodando com sucesso!');
});

// Endpoint de Teste para gravação de Rateio no Supabase
app.post('/api/teste-rateio', async (req, res) => {
  try {
    // Verificar se o cliente do Supabase foi inicializado corretamente
    if (!supabase) {
      throw new Error('O cliente do Supabase não foi inicializado. Verifique seu arquivo .env');
    }

    // 1. Cria ou atualiza um setor/centro de custo de teste
    const { data: ccData, error: ccError } = await supabase
      .from('centros_custo')
      .upsert(
        [{ codigo: '9999', nome: 'SETOR DE TESTE API', ordem: 99 }],
        { onConflict: 'codigo' } // Evita duplicar se o código já existir
      )
      .select();

    if (ccError) throw ccError;

    if (!ccData || ccData.length === 0) {
      throw new Error('Nenhum dado retornado ao inserir/atualizar o centro de custo.');
    }

    const centroCustoId = ccData[0].id;

    // 2. Insere um log de teste vinculado a esse centro de custo
    const { data: logData, error: logError } = await supabase
      .from('log_rateios')
      .insert([{
        tipo_documento: 'TESTE_SISTEMA',
        identificador_unico: 'TESTE-001',
        valor: 150.50,
        competencia: '2026-06-01',
        centro_custo_id: centroCustoId
      }])
      .select();

    if (logError) throw logError;

    res.json({
      sucesso: true,
      mensagem: 'Conexão bem-sucedida! Dados gravados nas tabelas do Supabase com sucesso.',
      centroCusto: ccData[0],
      logRateio: logData ? logData[0] : null
    });

  } catch (error) {
    console.error('Erro no endpoint de teste-rateio:', error.message);
    res.status(500).json({
      sucesso: false,
      erro: error.message || 'Erro interno no servidor ao tentar gravar dados.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Servidor] Ativo e rodando perfeitamente na porta ${PORT}`);
});