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

const ORDEM_SETORES = [
  "ACABAMENTO", "EXPEDIÇÃO", "SALA DE TINTAS", "LABORATORIO",
  "CONTROLE DE QUALIDADE", "PCM", "CADASTRO", "IMPRESSÃO",
  "EXTRUSÃO", "FATURAMENTO", "GUARITA", "RECURSOS HUMANOS",
  "ALMOXARIFADO", "PCP", "ARTES", "ARTES - COLORIDA"
];

// Função de extração de texto ultra-segura
const extrairTextoPdf = async (buffer) => {
  try {
    // Tenta todas as formas possíveis de exportação da biblioteca
    let parser;
    if (typeof pdfParse === 'function') {
      parser = pdfParse;
    } else if (pdfParse && typeof pdfParse.default === 'function') {
      parser = pdfParse.default;
    } else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
      // Suporte para versões mais recentes (2.x) que usam classes
      const instance = new pdfParse.PDFParse();
      const data = await instance.parse(buffer);
      return data.text;
    } else {
      console.error('Estrutura do pdf-parse recebida:', typeof pdfParse, Object.keys(pdfParse || {}));
      throw new Error("A biblioteca pdf-parse não foi carregada como uma função válida.");
    }

    const data = await parser(buffer);
    return data.text;
  } catch (err) {
    throw new Error("Erro ao processar PDF: " + err.message);
  }
};

app.post('/api/rateio/impressoras', upload.fields([
  { name: 'medicao', maxCount: 1 },
  { name: 'setores', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files?.medicao || !req.files?.setores) {
      return res.status(400).json({ sucesso: false, erro: 'Ambos os arquivos são obrigatórios.' });
    }

    // 1. PROCESSAMENTO DOS SETORES (Inventário)
    const setoresFile = req.files['setores'][0];
    let dadosSetoresIniciais = [];

    if (setoresFile.originalname.toLowerCase().endsWith('.csv')) {
      const csvString = setoresFile.buffer.toString('utf-8');
      const linhas = csvString.split('\n');
      const headers = linhas[0].split(';');
      for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;
        const colunas = linhas[i].split(';');
        let obj = {};
        headers.forEach((h, index) => obj[h.trim()] = (colunas[index] || '').trim());
        dadosSetoresIniciais.push(obj);
      }
    } else {
      const workbookSet = XLSX.read(setoresFile.buffer, { type: 'buffer' });
      dadosSetoresIniciais = XLSX.utils.sheet_to_json(workbookSet.Sheets[workbookSet.SheetNames[0]]);
    }

    const isTelefonia = dadosSetoresIniciais.length > 0 && !!dadosSetoresIniciais[0]['Número do Chip'];
    const mapaSetores = {};
    dadosSetoresIniciais.forEach(linha => {
      const idChave = isTelefonia ? linha['Número do Chip'] : (linha['S/N'] || linha['SerialNumber'] || linha['Série'] || '');
      if (idChave && linha['Setor']) {
        mapaSetores[idChave.toString().trim().toUpperCase()] = linha['Setor'].toString().trim().toUpperCase();
      }
    });

    // 2. PROCESSAMENTO DA MEDIÇÃO
    const medicaoFile = req.files['medicao'][0];
    const totalizadorSetores = {};
    ORDEM_SETORES.forEach(s => totalizadorSetores[s] = 0);
    let totalGeral = 0;

    if (medicaoFile.mimetype === 'application/pdf' || medicaoFile.originalname.toLowerCase().endsWith('.pdf')) {
      const textoPdf = await extrairTextoPdf(medicaoFile.buffer);
      const linhasPdf = textoPdf.split('\n');

      for (let linha of linhasPdf) {
        const linhaUpper = linha.toUpperCase();
        for (const [chave, setor] of Object.entries(mapaSetores)) {
          if (linhaUpper.includes(chave)) {
            let valor = 0;
            if (isTelefonia) {
              const match = linhaUpper.match(/(\d{1,4},\d{2})/);
              if (match) valor = parseFloat(match[1].replace(',', '.'));
            } else {
              const linhaLimpa = linhaUpper.replace(/\./g, '');
              const num = linhaLimpa.match(/\d+/g);
              if (num) valor = parseInt(num[num.length - 1], 10);
            }
            if (totalizadorSetores[setor] !== undefined) {
              totalizadorSetores[setor] += valor;
              totalGeral += valor;
            }
            break;
          }
        }
      }
    } else {
      const workbookMed = XLSX.read(medicaoFile.buffer, { type: 'buffer' });
      const dadosMedicao = XLSX.utils.sheet_to_json(workbookMed.Sheets[workbookMed.SheetNames[0]]);
      
      dadosMedicao.forEach(linha => {
        const idChave = isTelefonia ? linha['Número do Chip'] : (linha['S/N'] || linha['SerialNumber'] || linha['Série'] || '');
        const valor = parseFloat(linha['Páginas/Mês'] || linha['NoCópias'] || linha['Páginas'] || linha['Total'] || linha['Valor'] || 0);
        
        if (idChave) {
          const chaveStr = idChave.toString().trim().toUpperCase();
          const setor = mapaSetores[chaveStr];
          if (setor && totalizadorSetores[setor] !== undefined) {
            totalizadorSetores[setor] += valor;
            totalGeral += valor;
          }
        }
      });
    }

    res.json({
      sucesso: true,
      dados: ORDEM_SETORES.map((s, i) => ({ 
        ordem: i + 1, 
        setor: s, 
        totalPaginas: isTelefonia ? totalizadorSetores[s].toFixed(2) : totalizadorSetores[s] 
      })),
      totalGeral: isTelefonia ? totalGeral.toFixed(2) : totalGeral
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

app.listen(PORT, () => console.log(`[Servidor] Ativo na porta ${PORT}`));
