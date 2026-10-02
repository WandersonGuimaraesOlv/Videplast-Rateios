// "Valores a serem descontados": divide o total de cada fatura entre os centros de custo,
// na proporção das páginas de cada setor. P&B e colorida são rateadas separadamente
// (a colorida vai inteira para o centro de custo de "<setor> - COLORIDA").
const { valorDaColuna } = require('../colunas');
const { normalizar, arredondar2 } = require('../../shared');

const ehSetorColorido = (setor) => / - COLORIDA$/.test(setor);

// "ARTES - COLORIDA" → "Artes - Colorida"
const capitalizar = (texto) => texto.toLowerCase().replace(/(^|[\s/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/** Setor → centro de custo, pela coluna "Centro de Custo" (ou "Contro de Custo") da lista de setores. */
function montarCentrosCusto(linhasSetores) {
  const centros = {};
  linhasSetores.forEach((linha) => {
    const setor = normalizar(valorDaColuna(linha, 'setor'));
    const centro = normalizar(valorDaColuna(linha, 'centroCusto'));
    if (setor && centro && !centros[setor]) centros[setor] = centro;
  });
  return centros;
}

/**
 * @param {{ setor: string, total: number }[]} dados  páginas por setor
 * @param {{ colorido: boolean, total: number|null }[]} faturas  uma por arquivo de medição
 * @param {Record<string,string>} centros  setor → centro de custo
 * @param {{ centroCusto: string, rotulo: string }[]} rotulos  nomes e ordem do quadro da planilha
 * @returns {{ linhas: object[], total: number } | null} null quando falta o total de alguma fatura
 */
function calcularValores(dados, faturas, centros, rotulos = []) {
  if (faturas.length === 0 || faturas.some((f) => f.total === null || f.total === undefined)) return null;

  const linhas = [];
  for (const colorido of [false, true]) {
    const totalFaturas = faturas.filter((f) => f.colorido === colorido).reduce((s, f) => s + f.total, 0);
    if (totalFaturas === 0) continue;

    const setores = dados.filter((d) => ehSetorColorido(d.setor) === colorido);
    const totalPaginas = setores.reduce((s, d) => s + d.total, 0);
    if (totalPaginas === 0) continue;

    // Páginas por centro de custo, mantendo a ordem do quadro da planilha (só P&B) e depois a do relatório
    const grupos = new Map();
    if (!colorido) rotulos.forEach((r) => grupos.set(r.centroCusto, { rotulo: r.rotulo, paginas: 0 }));
    setores.forEach((d) => {
      const centro = centros[d.setor] || d.setor;
      if (!grupos.has(centro)) {
        if (d.total === 0) return;
        grupos.set(centro, { rotulo: colorido ? capitalizar(d.setor) : d.setor, paginas: 0 });
      }
      grupos.get(centro).paginas += d.total;
    });

    const doGrupo = [];
    grupos.forEach(({ rotulo, paginas }, centroCusto) => {
      const proporcao = paginas / totalPaginas;
      doGrupo.push({
        centroCusto,
        setor: rotulo,
        contrato: colorido ? 'Colorido' : 'P&B',
        paginas,
        valor: arredondar2(totalFaturas * proporcao),
        rateio: proporcao,
      });
    });
    // Centavos do arredondamento ficam na maior linha, para a soma bater com a fatura
    const diferenca = arredondar2(totalFaturas - doGrupo.reduce((s, l) => s + l.valor, 0));
    if (diferenca !== 0) {
      const maior = doGrupo.reduce((a, b) => (b.valor > a.valor ? b : a));
      maior.valor = arredondar2(maior.valor + diferenca);
    }
    linhas.push(...doGrupo);
  }
  return { linhas, total: arredondar2(linhas.reduce((s, l) => s + l.valor, 0)) };
}

module.exports = { montarCentrosCusto, calcularValores };
