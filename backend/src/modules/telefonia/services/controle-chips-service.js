// Leitura do Controle de Chips (quem usa cada linha e em qual centro de custo).
// As colunas são achadas pelo nome do cabeçalho, então a ordem pode mudar.
const XLSX = require('xlsx');
const { decodificarTexto, normalizarCabecalho } = require('../../shared');

/** Telefone → só dígitos, sem o 55 do país: "64-912345678" → "64912345678". */
function normalizarTelefone(valor) {
  let digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length >= 12 && digitos.startsWith('55')) digitos = digitos.slice(2);
  return digitos.length === 10 || digitos.length === 11 ? digitos : '';
}

/** "1005COML06 (FATURAMENTO)" → "1005COML06"; vazio → "". */
function extrairCentroCusto(valor) {
  const texto = String(valor ?? '').trim().toUpperCase();
  if (!texto) return '';
  const m = /^([0-9A-Z]{6,})/.exec(texto.replace(/\s+/g, ''));
  return m ? m[1] : texto;
}

const texto = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Primeira aba (ou a "Inventario", se existir) como lista de objetos; aceita .xlsx, .xls e .csv. */
function lerLinhas(buffer, nomeArquivo) {
  let workbook;
  if (/\.csv$/i.test(nomeArquivo || '')) {
    const conteudo = decodificarTexto(buffer);
    const primeira = conteudo.split(/\r?\n/, 1)[0] || '';
    const separador = primeira.split(';').length >= primeira.split(',').length ? ';' : ',';
    workbook = XLSX.read(conteudo, { type: 'string', FS: separador, raw: true });
  } else {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  }
  const aba = workbook.SheetNames.includes('Inventario') ? 'Inventario' : workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[aba], { defval: '' });
}

/** Coluna cujo cabeçalho normalizado contém algum dos termos (na ordem de preferência). */
function acharColuna(cabecalhos, termos) {
  for (const termo of termos) {
    const achado = cabecalhos.find((c) => normalizarCabecalho(c).includes(termo));
    if (achado) return achado;
  }
  return undefined;
}

/**
 * @param {Buffer} buffer
 * @param {string} nomeArquivo
 * @returns {{ chips: Map<string, { numero: string, responsavel: string, setor: string, centroCusto: string, centroCustoAntigo: string, plano: string }>, duplicados: string[] }}
 */
function lerControleChips(buffer, nomeArquivo) {
  const linhas = lerLinhas(buffer, nomeArquivo);
  const cabecalhos = Object.keys(linhas[0] || {});

  const col = {
    numero: acharColuna(cabecalhos, ['numerodochip', 'chip', 'numero', 'linha', 'telefone']),
    centroCusto: acharColuna(cabecalhos, ['centrodecustoatualizado', 'centrodecustoatual', 'centrodecusto']),
    centroCustoAntigo: acharColuna(cabecalhos, ['centrodecustoantigo']),
    responsavel: acharColuna(cabecalhos, ['colaboradorresponsavelatual', 'responsavelatual', 'colaborador', 'responsavel', 'nome']),
    setor: acharColuna(cabecalhos, ['setoratual', 'setor', 'departamento']),
    plano: acharColuna(cabecalhos, ['planos', 'plano']),
  };

  if (!col.numero || !col.centroCusto) {
    throw new Error('O Controle de Chips precisa ter as colunas "Número do Chip" e "Centro de Custo ATUALIZADO".');
  }
  // "centrodecusto" casaria também com "Centro de Custo Antigo": garante colunas diferentes.
  if (col.centroCusto === col.centroCustoAntigo) {
    throw new Error('Não encontrei a coluna "Centro de Custo ATUALIZADO" no Controle de Chips.');
  }

  const chips = new Map();
  const duplicados = new Set();
  for (const linha of linhas) {
    const numero = normalizarTelefone(linha[col.numero]);
    if (!numero) continue;
    // Número repetido: vale a última linha, mas o rateio avisa para corrigir o controle.
    if (chips.has(numero)) duplicados.add(numero);
    chips.set(numero, {
      numero,
      responsavel: col.responsavel ? texto(linha[col.responsavel]) : '',
      setor: col.setor ? texto(linha[col.setor]) : '',
      centroCusto: extrairCentroCusto(linha[col.centroCusto]),
      centroCustoAntigo: col.centroCustoAntigo ? extrairCentroCusto(linha[col.centroCustoAntigo]) : '',
      plano: col.plano ? texto(linha[col.plano]) : '',
    });
  }

  if (chips.size === 0) {
    throw new Error('Nenhum número de chip válido foi encontrado no Controle de Chips.');
  }
  return { chips, duplicados: [...duplicados] };
}

module.exports = { lerControleChips, normalizarTelefone, extrairCentroCusto };
