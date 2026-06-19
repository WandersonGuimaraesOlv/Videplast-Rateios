require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Correção à prova de falhas para a biblioteca do PDF
const extrairTextoPdf = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;

const ORDEM_SETORES = [
  "ACABAMENTO", "EXPEDIÇÃO", "SALA DE TINTAS", "LABORATORIO",
  "CONTROLE DE QUALIDADE", "PCM", "CADASTRO", "IMPRESSÃO",
  "EXTRUSÃO", "FATURAMENTO", "GUARITA", "RECURSOS HUMANOS",
  "ALMOXARIFADO", "PCP", "ARTES", "ARTES - COLORIDA"
];

// ==========================================
// ROTA DE DIAGNÓSTICO (Para o botão do Frontend)
// ==========================================
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
      return res.status(400).json({ sucesso: false, erro: 'Ambos os ficheiros são obrigatórios.' });
    }

    // 1. Ler PRIMEIRO o ficheiro de Setores / IPs
    const setoresFile = req.files['setores'][0];
    const workbookSet = XLSX.read(setoresFile.buffer, { type: 'buffer' });
    const sheetSetName = workbookSet.SheetNames[0];
    const dadosSetoresIniciais = XLSX.utils.sheet_to_json(workbookSet.Sheets[sheetSetName]);

    const mapaSetoresPorSN = {};
    dadosSetoresIniciais.forEach(linha => {
      const sn = (linha['S/N'] || linha['SerialNumber'] || linha['Série'] || '').toString().trim().toUpperCase();
      const setor = (linha['Setor'] || linha['Departamento'] || '').toString().trim().toUpperCase();
      if (sn && setor) {
        mapaSetoresPorSN[sn] = setor;
      }
    });

    // 2. Lógica para processar a Medição
    const medicaoFile = req.files['medicao'][0];
    let dadosMedicao = [];

    // Se for um PDF:
    if (medicaoFile.originalname.toLowerCase().endsWith('.pdf') || medicaoFile.mimetype === 'application/pdf') {

      // Utilização da função de extração corrigida
      if (!extrairTextoPdf) {
        throw new Error("A biblioteca pdf-parse não foi carregada corretamente. Tente reinstalar com 'npm install pdf-parse'.");
      }

      const pdfData = await extrairTextoPdf(medicaoFile.buffer);
      const linhasPdf = pdfData.text.split('\n');

      linhasPdf.forEach(linha => {
        const linhaUpper = linha.toUpperCase();

        for (const sn in mapaSetoresPorSN) {
          if (linhaUpper.includes(sn)) {
            const linhaLimpa = linhaUpper.replace(/\./g, '');
            const numerosEncontrados = linhaLimpa.match(/\d+/g);

            if (numerosEncontrados) {
              const paginas = parseInt(numerosEncontrados[numerosEncontrados.length - 1], 10);
              dadosMedicao.push({ 'S/N': sn, 'Páginas/Mês': paginas });
            }
            break;
          }
        }
      });
    }
    // Se for Excel/CSV:
    else {
      const workbookMed = XLSX.read(medicaoFile.buffer, { type: 'buffer' });
      const sheetMedName = workbookMed.SheetNames[0];
      dadosMedicao = XLSX.utils.sheet_to_json(workbookMed.Sheets[sheetMedName]);
    }

    // 3. Inicializa o somatório estrito
    const totalizadorSetores = {};
    ORDEM_SETORES.forEach(setor => { totalizadorSetores[setor] = 0; });
    let totalGeralAcumulado = 0;

    // 4. Cruzamento e soma final
    dadosMedicao.forEach(linha => {
      const snLinha = (linha['S/N'] || linha['SerialNumber'] || linha['Série'] || '').toString().trim().toUpperCase();
      const paginas = parseInt(linha['Páginas/Mês'] || linha['NoCópias'] || linha['Páginas'] || linha['Total'] || 0, 10);

      if (snLinha && !isNaN(paginas)) {
        const setorIdentificado = mapaSetoresPorSN[snLinha];
        if (setorIdentificado && totalizadorSetores[setorIdentificado] !== undefined) {
          totalizadorSetores[setorIdentificado] += paginas;
          totalGeralAcumulado += paginas;
        }
      }
    });

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
    res.status(500).json({ sucesso: false, erro: 'Falha interna ao cruzar os ficheiros: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Servidor] Ativo e a correr perfeitamente na porta ${PORT}`);
});