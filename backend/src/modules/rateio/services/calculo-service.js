// Regras do rateio por setor: funções puras, testadas em tests/calculo.test.js.
const { ORDEM_SETORES } = require('../setores');
const { paraNumero, arredondar2, normalizar } = require('../../shared');

const COLUNAS_SERIE = ['S/N', 'SerialNumber', 'Série'];
const COLUNAS_VALOR = ['Páginas/Mês', 'NoCópias', 'Páginas', 'Total', 'Valor'];

const primeiroPreenchido = (linha, colunas) => {
  for (const coluna of colunas) {
    const valor = linha[coluna];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
  }
  return '';
};

const chaveDoItem = (linha, isTelefonia) =>
  isTelefonia ? linha['Número do Chip'] || '' : primeiroPreenchido(linha, COLUNAS_SERIE);

/** Telefonia é detectada pela coluna "Número do Chip" na lista de setores. */
const detectarTelefonia = (setores) =>
  setores.length > 0 && Object.prototype.hasOwnProperty.call(setores[0], 'Número do Chip');

/**
 * Mapa S/N (ou chip) → setor. Setores fora de ORDEM_SETORES ficam em `setoresDesconhecidos`
 * para o usuário corrigir a planilha, em vez de sumirem do total sem aviso.
 */
function montarMapaSetores(setores, isTelefonia) {
  const mapa = {};
  const setoresDesconhecidos = new Set();
  setores.forEach((linha) => {
    const chave = normalizar(chaveDoItem(linha, isTelefonia));
    const setor = normalizar(linha['Setor']);
    if (!chave || !setor) return;
    mapa[chave] = setor;
    if (!ORDEM_SETORES.includes(setor)) setoresDesconhecidos.add(setor);
  });
  return { mapa, setoresDesconhecidos: [...setoresDesconhecidos] };
}

const novoAcumulador = () => ({
  totais: Object.fromEntries(ORDEM_SETORES.map((s) => [s, 0])),
  totalGeral: 0,
  itensSemSetor: new Set(),
  valorForaDoRelatorio: 0,
});

function acumular(acc, setor, valor) {
  if (acc.totais[setor] === undefined) {
    acc.valorForaDoRelatorio += valor;
    return;
  }
  acc.totais[setor] += valor;
  acc.totalGeral += valor;
}

/** Valor de uma linha de texto do PDF: telefonia em R$ (12,50), impressoras pelo último número. */
function valorDaLinhaPdf(linhaUpper, isTelefonia) {
  if (isTelefonia) {
    const match = linhaUpper.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    return match ? paraNumero(match[1]) : 0;
  }
  const numeros = linhaUpper.replace(/\./g, '').match(/\d+/g);
  return numeros ? parseInt(numeros[numeros.length - 1], 10) : 0;
}

/**
 * Medição em PDF: procura cada S/N/chip nas linhas do texto. Chaves mais longas são testadas
 * primeiro para "ABC12" não capturar a linha de "ABC123".
 */
function somarMedicaoTexto(texto, mapaSetores, isTelefonia) {
  const acc = novoAcumulador();
  const chaves = Object.keys(mapaSetores).sort((a, b) => b.length - a.length);
  for (const linha of texto.split('\n')) {
    const linhaUpper = linha.toUpperCase();
    const chave = chaves.find((c) => linhaUpper.includes(c));
    if (chave) acumular(acc, mapaSetores[chave], valorDaLinhaPdf(linhaUpper, isTelefonia));
  }
  return acc;
}

/** Medição em planilha (CSV/Excel). */
function somarMedicaoTabela(linhas, mapaSetores, isTelefonia) {
  const acc = novoAcumulador();
  linhas.forEach((linha) => {
    const chave = normalizar(chaveDoItem(linha, isTelefonia));
    if (!chave) return;
    const setor = mapaSetores[chave];
    if (!setor) {
      acc.itensSemSetor.add(chave);
      return;
    }
    acumular(acc, setor, paraNumero(primeiroPreenchido(linha, COLUNAS_VALOR)));
  });
  return acc;
}

/** Resposta da API: valores numéricos (telefonia arredondada em centavos) e avisos. */
function montarRelatorio(acc, isTelefonia, setoresDesconhecidos = []) {
  const ajustar = isTelefonia ? arredondar2 : (n) => n;
  return {
    tipo: isTelefonia ? 'telefonia' : 'impressoras',
    dados: ORDEM_SETORES.map((setor, i) => ({ ordem: i + 1, setor, total: ajustar(acc.totais[setor]) })),
    totalGeral: ajustar(acc.totalGeral),
    avisos: {
      setoresDesconhecidos,
      itensSemSetor: [...acc.itensSemSetor],
      valorForaDoRelatorio: ajustar(acc.valorForaDoRelatorio),
    },
  };
}

module.exports = {
  detectarTelefonia,
  montarMapaSetores,
  somarMedicaoTexto,
  somarMedicaoTabela,
  montarRelatorio,
};
