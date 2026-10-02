// Regras do rateio por setor: funções puras, testadas em tests/calculo.test.js.
const { ORDEM_SETORES } = require('../setores');
const { valorDaColuna } = require('../colunas');
const { paraNumero, arredondar2, normalizar, normalizarCodigo } = require('../../shared');
const { lerDemonstrativo } = require('./demonstrativo-service');

// Uma célula pode trazer vários S/N: "45146PHH38N9R/451445HH23PWX"
const codigosDaCelula = (valor) =>
  String(valor ?? '')
    .split(/[\/;,\n]+/)
    .map(normalizarCodigo)
    .filter(Boolean);

/** Telefonia é detectada pela coluna "Número do Chip" na lista de setores. */
const detectarTelefonia = (setores) => setores.length > 0 && valorDaColuna(setores[0], 'chip') !== '';

/**
 * Mapa S/N (ou chip) → setor. Setores fora de ORDEM_SETORES ficam em `setoresDesconhecidos`
 * para o usuário corrigir a planilha, em vez de sumirem do total sem aviso.
 */
function montarMapaSetores(setores, isTelefonia) {
  const mapa = {};
  const setoresDesconhecidos = new Set();
  setores.forEach((linha) => {
    const setor = normalizar(valorDaColuna(linha, 'setor'));
    const codigos = codigosDaCelula(valorDaColuna(linha, isTelefonia ? 'chip' : 'serie'));
    if (!setor || codigos.length === 0) return;
    codigos.forEach((codigo) => (mapa[codigo] = setor));
    if (!ORDEM_SETORES.includes(setor)) setoresDesconhecidos.add(setor);
  });
  return { mapa, setoresDesconhecidos: [...setoresDesconhecidos] };
}

/**
 * Setor de um S/N. Aceita diferença de prefixo entre a fatura e a planilha
 * (a Lexmark aparece como "514.45H.H22.5MD" na fatura e "451445HH225MD" na planilha),
 * desde que só um setor combine e o trecho comum tenha 8 caracteres ou mais.
 */
function buscarSetor(mapa, codigo) {
  if (mapa[codigo]) return mapa[codigo];
  if (codigo.length < 8) return null;
  const setores = new Set(
    Object.entries(mapa)
      .filter(([chave]) => chave.length >= 8 && (chave.endsWith(codigo) || codigo.endsWith(chave)))
      .map(([, setor]) => setor)
  );
  return setores.size === 1 ? [...setores][0] : null;
}

const novoAcumulador = () => ({
  totais: Object.fromEntries(ORDEM_SETORES.map((s) => [s, 0])),
  totalGeral: 0,
  itensSemSetor: new Set(),
  valorForaDoRelatorio: 0,
  arquivos: [],
});

function acumular(acc, setor, valor) {
  if (acc.totais[setor] === undefined) {
    acc.valorForaDoRelatorio += valor;
    return;
  }
  acc.totais[setor] += valor;
  acc.totalGeral += valor;
}

// Impressão colorida vai para a variante "- COLORIDA" do setor, quando existir (ARTES → ARTES - COLORIDA)
const setorColorido = (setor) =>
  ORDEM_SETORES.includes(`${setor} - COLORIDA`) ? `${setor} - COLORIDA` : setor;

/** Soma leituras { codigo, valor } já extraídas, avisando as que não têm setor. */
function somarLeituras(leituras, mapaSetores, { colorido = false, acc = novoAcumulador() } = {}) {
  leituras.forEach(({ codigo, valor }) => {
    const setor = buscarSetor(mapaSetores, codigo);
    if (!setor) {
      if (valor > 0) acc.itensSemSetor.add(codigo);
      return;
    }
    acumular(acc, colorido ? setorColorido(setor) : setor, valor);
  });
  return acc;
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
 * Medição em PDF. O "Demonstrativo de Faturamento" tem leitor próprio; nos demais PDFs procura
 * cada S/N/chip nas linhas do texto, testando as chaves mais longas primeiro para "ABC12" não
 * capturar a linha de "ABC123".
 */
function somarMedicaoTexto(texto, mapaSetores, isTelefonia, opcoes = {}) {
  const demonstrativo = isTelefonia ? [] : lerDemonstrativo(texto);
  if (demonstrativo.length > 0) {
    const leituras = demonstrativo.map(({ serie, copias }) => ({ codigo: serie, valor: copias }));
    return somarLeituras(leituras, mapaSetores, opcoes);
  }

  const acc = opcoes.acc || novoAcumulador();
  const chaves = Object.keys(mapaSetores).sort((a, b) => b.length - a.length);
  for (const linha of texto.split('\n')) {
    const linhaUpper = linha.toUpperCase();
    const linhaCodigo = normalizarCodigo(linha);
    const chave = chaves.find((c) => linhaUpper.includes(c) || linhaCodigo.includes(c));
    if (chave) acumular(acc, mapaSetores[chave], valorDaLinhaPdf(linhaUpper, isTelefonia));
  }
  return acc;
}

/** Medição em planilha (CSV/Excel). */
function somarMedicaoTabela(linhas, mapaSetores, isTelefonia, opcoes = {}) {
  const leituras = linhas
    .map((linha) => ({
      codigo: normalizarCodigo(valorDaColuna(linha, isTelefonia ? 'chip' : 'serie')),
      valor: paraNumero(valorDaColuna(linha, 'valor')),
    }))
    .filter((l) => l.codigo);
  // Na planilha, item sem setor é avisado mesmo com valor zero
  const acc = opcoes.acc || novoAcumulador();
  leituras.forEach((l) => {
    if (!buscarSetor(mapaSetores, l.codigo)) acc.itensSemSetor.add(l.codigo);
  });
  return somarLeituras(leituras, mapaSetores, { ...opcoes, acc });
}

/** Resposta da API: valores numéricos (telefonia arredondada em centavos) e avisos. */
function montarRelatorio(acc, isTelefonia, setoresDesconhecidos = []) {
  const ajustar = isTelefonia ? arredondar2 : (n) => n;
  return {
    tipo: isTelefonia ? 'telefonia' : 'impressoras',
    dados: ORDEM_SETORES.map((setor, i) => ({ ordem: i + 1, setor, total: ajustar(acc.totais[setor]) })),
    totalGeral: ajustar(acc.totalGeral),
    arquivos: acc.arquivos,
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
  buscarSetor,
  novoAcumulador,
  somarMedicaoTexto,
  somarMedicaoTabela,
  montarRelatorio,
};
