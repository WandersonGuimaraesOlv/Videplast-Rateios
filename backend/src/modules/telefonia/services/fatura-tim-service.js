// Leitura da fatura TIM (texto extraído do PDF).
//
// A fonte dos valores é o quadro "RESUMO DO DETALHAMENTO", no fim da fatura, que traz para
// cada acesso (linha) o total de cada categoria, por exemplo:
//   "04Total de Mensalidades e Franquias Acesso 6499903955325,90"
//   "01Total de Uso do Acesso 649994730096,09"
//   "64Total de Outros Créditos e Débitos Gerais do Cliente187,00"
//   "02Total FATURA1.390,67"
// No texto do PDF o número do acesso e o valor saem colados (6499903955325,90).
const { brlParaCentavos } = require('../../shared');

// Número do acesso (10-11 dígitos) + valor colados; um crédito aparece com o sinal entre os
// dois: "64999039553-12,20".
const RE_POR_ACESSO = /^\d{2}Total de (.+?) Acesso (\d{10,}-?[\d.]*\d,\d{2})$/;
const RE_GERAL_CLIENTE = /^\d{2}Total de (.+?) Gerais do Cliente(-?\d[\d.]*,\d{2})$/;
const RE_TOTAL_FATURA = /^\d{2}Total FATURA(-?\d[\d.]*,\d{2})$/;

/** Nomes curtos das categorias do resumo (chave usada no restante do sistema). */
const CATEGORIAS = [
  { chave: 'mensalidades', rotulo: 'Mensalidades e franquias', padrao: /mensalidades/i },
  { chave: 'uso', rotulo: 'Uso (avulso)', padrao: /^uso/i },
  { chave: 'outros', rotulo: 'Outros créditos e débitos', padrao: /outros cr/i },
  { chave: 'outrasOperadoras', rotulo: 'Cobranças de outras operadoras', padrao: /outras operadoras/i },
];

function categoriaDe(nome) {
  const cat = CATEGORIAS.find((c) => c.padrao.test(nome));
  return cat ? cat.chave : 'outrosServicos';
}

/**
 * Separa "número do acesso + valor" colados. Celular com DDD tem 11 dígitos e o 3º dígito é
 * 9 (64 9xxxx-xxxx); fixo com DDD tem 10 dígitos.
 * @param {string} blob ex.: "6499903955325,90" ou "64999039553-12,20"
 * @returns {{ numero: string, centavos: number }}
 */
function separarNumeroEValor(blob) {
  const tamanho = blob[2] === '9' ? 11 : 10;
  const numero = blob.slice(0, tamanho);
  const valor = blob.slice(tamanho);
  if (!/^\d+$/.test(numero) || !/^-?\d[\d.]*,\d{2}$/.test(valor)) {
    throw new Error(`Não consegui separar o número e o valor do acesso em "${blob}".`);
  }
  return { numero, centavos: brlParaCentavos(valor) };
}

function extrairCabecalho(texto) {
  const pegar = (re) => (re.exec(texto) || [])[1] || '';
  return {
    referencia: pegar(/REF:\s*([A-Z]{3}\/\d{2})/),
    periodo: pegar(/PER[IÍ]ODO\s+(\d{2}\/\d{2}\/\d{2}\s+a\s+\d{2}\/\d{2}\/\d{2})/),
    vencimento: pegar(/(\d{2}\/\d{2}\/\d{4})\s*\r?\nVENCIMENTO/),
    emissao: pegar(/EMISS[AÃ]O:\s*(\d{2}\/\d{2}\/\d{4})/),
    numeroFatura: pegar(/FATURA DE PAGAMENTO:\s*(\d+)/),
    cliente: pegar(/CLIENTE:\s*([\d.]+)/),
    quantidadeAcessos: Number(pegar(/Quantidade de Acessos:\s*(\d+)/)) || null,
  };
}

/**
 * @param {string} texto texto do PDF da fatura
 * @returns {{
 *   cabecalho: object,
 *   totalCentavos: number,
 *   linhas: Map<string, { totalCentavos: number, categorias: Record<string, number> }>,
 *   geraisCliente: { categoria: string, centavos: number }[],
 * }}
 */
function lerFaturaTim(texto) {
  const linhas = new Map();
  const geraisCliente = [];
  let totalCentavos = null;

  for (const bruta of String(texto).split(/\r?\n/)) {
    const linha = bruta.trim();
    let m = RE_POR_ACESSO.exec(linha);
    if (m) {
      const { numero, centavos } = separarNumeroEValor(m[2]);
      const categoria = categoriaDe(m[1]);
      const atual = linhas.get(numero) || { totalCentavos: 0, categorias: {} };
      atual.categorias[categoria] = (atual.categorias[categoria] || 0) + centavos;
      atual.totalCentavos += centavos;
      linhas.set(numero, atual);
      continue;
    }
    if ((m = RE_GERAL_CLIENTE.exec(linha))) {
      geraisCliente.push({ categoria: m[1], centavos: brlParaCentavos(m[2]) });
      continue;
    }
    if ((m = RE_TOTAL_FATURA.exec(linha))) totalCentavos = brlParaCentavos(m[1]);
  }

  if (linhas.size === 0) {
    throw new Error(
      'Não encontrei o "Resumo do Detalhamento" na fatura. Envie a fatura completa da TIM em PDF (com o detalhamento por acesso).'
    );
  }
  if (totalCentavos === null) {
    throw new Error('Não encontrei o "Total FATURA" no resumo do detalhamento da fatura.');
  }

  return { cabecalho: extrairCabecalho(texto), totalCentavos, linhas, geraisCliente };
}

module.exports = { lerFaturaTim, separarNumeroEValor, CATEGORIAS };
