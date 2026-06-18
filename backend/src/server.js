require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configuração do Multer para guardar arquivos temporariamente na memória ram
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ordem estrita e obrigatória definida para o relatório consolidado da Videplast
const ORDEM_SETORES = [
  "ACABAMENTO", "EXPEDIÇÃO", "SALA DE TINTAS", "LABORATORIO",
  "CONTROLE DE QUALIDADE", "PCM", "CADASTRO", "IMPRESSÃO",
  "EXTRUSÃO", "FATURAMENTO", "GUARITA", "RECURSOS HUMANOS",
  "ALMOXARIFADO", "PCP", "ARTES", "ARTES - COLORIDA"
];

// Rota base de verificação do status da API
app.get('/', (req, res) => {
  res.send('API do Sistema de Rateios rodando com sucesso!');
});

// Endpoint Original de Teste Rápido
app.post('/api/teste-rateio', async (req, res) => {
  try {
    if (!supabase) throw new Error('O cliente do Supabase não foi inicializado.');
    const { data: ccData, error: ccError } = await supabase
      .from('centros_custo')
      .upsert([{ codigo: '9999', nome: 'SETOR DE TESTE API', ordem: 99 }], { onConflict: 'codigo' })
      .select();

    if (ccError) throw ccError;
    const { data: logData, error: logError } = await supabase
      .from('log_rateios')
      .insert([{
        tipo_documento: 'TESTE_SISTEMA',
        identificador_unico: 'TESTE-001',
        valor: 150.50,
        competencia: '2026-06-01',
        centro_custo_id: ccData[0].id
      }]).select();

    if (logError) throw logError;
    res.json({ sucesso: true, mensagem: 'Conexão bem-sucedida com o Supabase!', centroCusto: ccData[0] });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

// ==========================================
// MOTOR DE RATEIO E CONSOLIDAÇÃO DE IMPRESSÃO
// ==========================================
app.post('/api/rateio/impressoras', upload.fields([
  { name: 'medicao', maxCount: 1 },
  { name: 'setores', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files['medicao'] || !req.files['setores']) {
      return res.status(400).json({ sucesso: false, erro: 'Ambos os arquivos (medicao e setores) são obrigatórios.' });
    }

    // 1. Ler o arquivo de Medição / Faturamento da memória
    const medicaoFile = req.files['medicao'][0];
    const workbookMed = XLSX.read(medicaoFile.buffer, { type: 'buffer' });
    const sheetMedName = workbookMed.SheetNames[0];
    const dadosMedicao = XLSX.utils.sheet_to_json(workbookMed.Sheets[sheetMedName]);

    // 2. Ler o arquivo de Setores / IPs de Origem da memória
    const setoresFile = req.files['setores'][0];
    const workbookSet = XLSX.read(setoresFile.buffer, { type: 'buffer' });
    const sheetSetName = workbookSet.SheetNames[0];
    const dadosSetores = XLSX.utils.sheet_to_json(workbookSet.Sheets[sheetSetName]);

    // Mapeamento dinâmico para facilitar a busca do setor usando o Número de Série (S/N)
    // Chave: S/N (Tratado sem espaços) -> Valor: Setor correspondente
    const mapaSetoresPorSN = {};

    dadosSetores.forEach(linha => {
      // Tenta achar colunas comuns para Número de Série e Setor
      const sn = (linha['S/N'] || linha['SerialNumber'] || linha['Série'] || '').toString().trim();
      const setor = (linha['Setor'] || linha['Departamento'] || '').toString().trim();

      if (sn && setor) {
        mapaSetoresPorSN[sn.toUpperCase()] = setor.toUpperCase();
      }
    });

    // Inicializa o somatório estruturado para cada setor da lista estrita da Videplast
    const totalizadorSetores = {};
    ORDEM_SETORES.forEach(setor => {
      totalizadorSetores[setor] = 0;
    });

    let totalGeralAcumulado = 0;

    // 3. Cruzamento de dados e soma das Páginas / Cópias
    dadosMedicao.forEach(linha => {
      const snLinha = (linha['S/N'] || linha['SerialNumber'] || linha['Série'] || '').toString().trim().toUpperCase();
      // Lê o volume de páginas (aceita variações comuns de cabeçalhos como NoCópias, Páginas ou Total)
      const paginas = parseInt(linha['Páginas/Mês'] || linha['NoCópias'] || linha['Páginas'] || linha['Total'] || 0, 10);

      if (snLinha && !isNaN(paginas)) {
        // Encontra a qual setor esse Número de Série (S/N) pertence no cruzamento
        const setorIdentificado = mapaSetoresPorSN[snLinha];

        if (setorIdentificado && totalizadorSetores[setorIdentificado] !== undefined) {
          totalizadorSetores[setorIdentificado] += paginas;
          totalGeralAcumulado += paginas;
        }
      }
    });

    // Formata o resultado no padrão final exigido para a tabela
    const dadosFormatados = ORDEM_SETORES.map((setor, index) => ({
      ordem: index + 1,
      setor: setor,
      totalPaginas: totalizadorSetores[setor]
    }));

    res.json({
      sucesso: true,
      dados: dadosFormatados,
      totalGeral: totalGeralAcumulado
    });

  } catch (error) {
    console.error('Erro no processamento das impressoras:', error);
    res.status(500).json({ sucesso: false, erro: 'Falha interna ao cruzar as planilhas: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Servidor] Ativo e rodando perfeitamente na porta ${PORT}`);
});