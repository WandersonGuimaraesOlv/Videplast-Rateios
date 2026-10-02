// Atualiza a planilha histórica do usuário ("Rateio impressão.xlsx") com o mês novo:
// - copia a aba do último mês (ex.: "08.2026") para "09.2026", com a mesma formatação e fórmulas,
//   e preenche páginas, custo por página e locação de cada setor;
// - acrescenta a coluna do mês no "Resumo", antes de "Quantidade autorizada";
// - acrescenta ao lado do quadro "VALOR A SER DESCONTADO" o valor em R$ e a auditoria por equipamento.
// Usa exceljs porque ele preserva estilos, mesclagens e fórmulas da planilha original.
const ExcelJS = require('exceljs');
const { normalizar, normalizarCabecalho, arredondar2 } = require('../../shared');

const mesDaAba = (nome) => {
  const m = String(nome).match(/^\s*(\d{2})\.(\d{4})\s*$/);
  return m ? Number(m[2]) * 100 + Number(m[1]) : 0;
};

const letraParaNumero = (letras) => [...letras].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0);
const numeroParaLetra = (n) => {
  let letras = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) letras = String.fromCharCode(65 + ((n - 1) % 26)) + letras;
  return letras;
};

/** Desloca uma coluna as referências da própria aba a partir de `aPartirDe` (refs de outras abas ficam). */
const deslocarFormula = (formula, aPartirDe) =>
  formula.replace(/(^|[^A-Za-z0-9_!'.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(])/g, (m, antes, s1, col, s2, linha) => {
    const n = letraParaNumero(col);
    return n >= aPartirDe ? `${antes}${s1}${numeroParaLetra(n + 1)}${s2}${linha}` : m;
  });

const deslocarIntervalo = (intervalo, aPartirDe) =>
  intervalo.replace(/([A-Z]{1,3})(\d+)/g, (m, col, linha) => {
    const n = letraParaNumero(col);
    return n >= aPartirDe ? `${numeroParaLetra(n + 1)}${linha}` : m;
  });

/** Troca fórmulas compartilhadas por fórmulas próprias, para poder mover células com segurança. */
function soltarFormulasCompartilhadas(aba) {
  const formulas = [];
  aba.eachRow({ includeEmpty: false }, (linha) =>
    linha.eachCell({ includeEmpty: false }, (celula) => {
      if (celula.type === ExcelJS.ValueType.Formula) {
        formulas.push([celula, celula.formula, celula.result]);
      }
    })
  );
  formulas.forEach(([celula, formula, result]) => (celula.value = { formula: formula.trim(), result }));
}

/** Copia uma aba inteira (valores, estilos, larguras, mesclagens) para uma aba nova. */
function copiarAba(workbook, origem, nome) {
  const nova = workbook.addWorksheet(nome);
  const modelo = { ...origem.model, name: nome, id: nova.id, orderNo: nova.orderNo };
  // Filtros e nomes definidos ficam só na aba original
  delete modelo.autoFilter;
  nova.model = modelo;
  return nova;
}

/** Coloca `aba` logo depois da primeira aba (Resumo), como o usuário organiza os meses. */
function moverParaSegundaPosicao(workbook, aba) {
  const ordem = workbook.worksheets.filter((w) => w !== aba);
  ordem.splice(1, 0, aba);
  ordem.forEach((w, i) => (w.orderNo = i));
}

/** Linha → setor na aba do mês (coluna A, até a linha de total). */
function linhasDosSetores(aba) {
  const linhas = [];
  for (let r = 2; r <= aba.rowCount; r++) {
    const setor = normalizar(aba.getCell(r, 1).text);
    if (!setor || /^TOTAL/.test(setor)) break;
    linhas.push({ r, setor });
  }
  return linhas;
}

/** Coluna de cada cabeçalho da linha 1 ("Paginas", "Custo pagina", "Custo Locação", "Total", "Rateio"). */
function colunasDaAba(aba) {
  const colunas = {};
  aba.getRow(1).eachCell((celula, c) => (colunas[normalizarCabecalho(celula.text)] ??= c));
  return colunas;
}

function preencherMes(aba, relatorio, faturas) {
  const col = colunasDaAba(aba);
  const cPaginas = col.paginas;
  const cPreco = col.custopagina;
  const cLocacao = col.custolocacao;
  const cTotal = col.total;
  const cRateio = col.rateio;
  if (!cPaginas) throw new Error(`A aba ${aba.name} não tem a coluna "Paginas".`);

  const pb = faturas.filter((f) => !f.colorido);
  const cor = faturas.filter((f) => f.colorido);
  const preco = (lista) => lista.find((f) => f.precoPagina)?.precoPagina ?? null;
  const locacao = (lista) => arredondar2(lista.reduce((s, f) => s + (f.locacao || 0), 0));

  const porSetor = Object.fromEntries(relatorio.dados.map((d) => [d.setor, d.total]));
  const linhas = linhasDosSetores(aba);
  const naoEncontrados = Object.keys(porSetor).filter((s) => porSetor[s] > 0 && !linhas.some((l) => l.setor === s));

  // Valores e resultados em cache (o Excel recalcula ao abrir)
  const totais = {};
  linhas.forEach(({ r, setor }) => {
    const colorido = / - COLORIDA$/.test(setor);
    const paginas = porSetor[setor] ?? 0;
    aba.getCell(r, cPaginas).value = paginas;
    const p = preco(colorido ? cor : pb);
    if (cPreco && p !== null) aba.getCell(r, cPreco).value = p;
    if (cLocacao) aba.getCell(r, cLocacao).value = colorido ? locacao(cor) : 0;
    const precoFinal = Number(aba.getCell(r, cPreco).value) || 0;
    const locacaoFinal = Number(aba.getCell(r, cLocacao).value) || 0;
    totais[r] = paginas * precoFinal + locacaoFinal;
  });
  return { linhas, totais, cTotal, cRateio, cPaginas, naoEncontrados };
}

/** Atualiza os resultados em cache das fórmulas mais comuns da aba do mês, para quem abre sem recalcular. */
function atualizarCache(aba, { linhas, totais, cTotal, cRateio, cPaginas }) {
  const ultima = linhas[linhas.length - 1];
  const linhaTotal = ultima ? ultima.r + 1 : null;
  const somaTotais = Object.values(totais).reduce((s, v) => s + v, 0);
  const baseRateio = somaTotais - (ultima ? totais[ultima.r] : 0);
  const definirResultado = (celula, result) => {
    if (celula.type === ExcelJS.ValueType.Formula) celula.value = { formula: celula.formula, result };
  };
  linhas.forEach(({ r }) => {
    if (cTotal) definirResultado(aba.getCell(r, cTotal), totais[r]);
    if (cRateio && r !== ultima.r) definirResultado(aba.getCell(r, cRateio), baseRateio ? totais[r] / baseRateio : 0);
  });
  if (linhaTotal) {
    definirResultado(aba.getCell(linhaTotal, cPaginas), linhas.reduce((s, { r }) => s + (Number(aba.getCell(r, cPaginas).value) || 0), 0));
    if (cTotal) definirResultado(aba.getCell(linhaTotal, cTotal), somaTotais);
  }
}

/** Valor em R$ ao lado do quadro "VALOR A SER DESCONTADO" e a auditoria por equipamento mais à direita. */
function anexarValoresEAuditoria(aba, relatorio, faturas) {
  let linhaCab = null;
  let colCentro = null;
  aba.eachRow((linha, r) =>
    linha.eachCell((celula, c) => {
      if (!linhaCab && normalizarCabecalho(celula.text) === 'centrodecusto') {
        linhaCab = r;
        colCentro = c;
      }
    })
  );
  const estiloCab = linhaCab ? aba.getCell(linhaCab, colCentro).style : {};
  const estiloCorpo = linhaCab ? aba.getCell(linhaCab + 1, colCentro).style : {};
  const moeda = '"R$" #,##0.00';

  let colLivre = (aba.columnCount || 14) + 2;
  if (linhaCab && relatorio.valores) {
    // Coluna "Valor (R$)" logo depois de "Rateio", com o total de cada fatura dividido pelas páginas
    const colValor = colCentro + 3;
    const cab = aba.getCell(linhaCab, colValor);
    cab.value = 'Valor (R$)';
    cab.style = estiloCab;
    const porCentro = new Map(relatorio.valores.linhas.filter((l) => l.contrato === 'P&B').map((l) => [l.centroCusto, l.valor]));
    for (let r = linhaCab + 1; r <= aba.rowCount; r++) {
      const centro = normalizar(aba.getCell(r, colCentro).text);
      if (!centro) break;
      const celula = aba.getCell(r, colValor);
      celula.style = estiloCorpo;
      celula.numFmt = moeda;
      if (/^TOTAL/.test(centro)) {
        celula.value = arredondar2([...porCentro.values()].reduce((s, v) => s + v, 0));
        celula.font = { ...(celula.font || {}), bold: true };
        // Faturas do mês, logo abaixo do quadro
        let rf = r + 2;
        const totalPb = faturas.filter((f) => !f.colorido).reduce((s, f) => s + (f.total || 0), 0);
        const totalCor = faturas.filter((f) => f.colorido).reduce((s, f) => s + (f.total || 0), 0);
        const coloridas = relatorio.valores.linhas.filter((l) => l.contrato === 'Colorido');
        [
          ['Fatura P&B', totalPb],
          ...coloridas.map((l) => [`Fatura colorida → ${l.centroCusto} ${l.setor}`, l.valor]),
          ['Total das faturas', arredondar2(totalPb + totalCor)],
        ].forEach(([rotulo, valor]) => {
          aba.getCell(rf, colCentro).value = rotulo;
          aba.getCell(rf, colCentro).font = { bold: true, size: 10 };
          const v = aba.getCell(rf, colValor);
          v.value = valor;
          v.numFmt = moeda;
          rf++;
        });
        break;
      }
      celula.value = porCentro.get(centro) ?? 0;
    }
    colLivre = colValor + 2;
  }

  // Auditoria por equipamento
  if (relatorio.equipamentos?.length) {
    const titulo = aba.getCell(1, colLivre);
    titulo.value = 'AUDITORIA DE EQUIPAMENTOS (fatura)';
    titulo.font = { bold: true, size: 10 };
    const cabecalhos = ['Número de Série', 'Contrato', 'Setor', 'Volume Páginas', 'Arquivo de Origem'];
    cabecalhos.forEach((texto, i) => {
      const c = aba.getCell(3, colLivre + i);
      c.value = texto;
      c.style = estiloCab;
    });
    relatorio.equipamentos.forEach((e, k) => {
      [e.serie, e.contrato, e.setor || 'SEM SETOR', e.valor, e.arquivo].forEach((valor, i) => {
        const c = aba.getCell(4 + k, colLivre + i);
        c.value = valor;
        c.style = estiloCorpo;
        if (i === 3) c.numFmt = '#,##0';
      });
    });
    [18, 16, 24, 14, 44].forEach((w, i) => (aba.getColumn(colLivre + i).width = w));
  }
}

/** Coluna do mês novo no Resumo, antes de "Quantidade autorizada". */
function atualizarResumo(resumo, nomeAba, data, linhasSetor) {
  const cabecalhos = [];
  resumo.getRow(1).eachCell((c, col) => cabecalhos.push([col, c]));
  const jaTem = cabecalhos.some(([, c]) => c.value instanceof Date && c.value.getTime() === data.getTime());
  if (jaTem) return false;
  const datas = cabecalhos.filter(([, c]) => c.value instanceof Date);
  if (datas.length === 0) return false;
  const colUltimoMes = datas[datas.length - 1][0];
  const colNova = colUltimoMes + 1;

  // "Diferença entre realizado e autorizado" passa a comparar o mês novo
  const letraUltimo = numeroParaLetra(colUltimoMes);
  const apontarParaMesNovo = (formula) =>
    formula.replace(new RegExp(`(^|[^A-Z$!'])(\\$?)${letraUltimo}(\\$?)(\\d+)`, 'g'), `$1$2${numeroParaLetra(colNova)}$3$4`);

  soltarFormulasCompartilhadas(resumo);
  const ultimaColuna = resumo.columnCount;
  // Empurra uma coluna para a direita tudo que está de colNova em diante
  for (let r = 1; r <= resumo.rowCount; r++) {
    for (let c = ultimaColuna; c >= colNova; c--) {
      const origem = resumo.getCell(r, c);
      const destino = resumo.getCell(r, c + 1);
      const valor = origem.value;
      destino.value =
        valor && typeof valor === 'object' && 'formula' in valor
          ? { formula: apontarParaMesNovo(deslocarFormula(valor.formula, colNova)), result: valor.result }
          : valor;
      destino.style = origem.style;
    }
  }
  for (let c = ultimaColuna; c >= colNova; c--) resumo.getColumn(c + 1).width = resumo.getColumn(c).width;
  resumo.getColumn(colNova).width = resumo.getColumn(colUltimoMes).width;

  // Fórmulas em colunas anteriores que apontam para as colunas deslocadas (ex.: totais compartilhados)
  for (let r = 1; r <= resumo.rowCount; r++) {
    for (let c = 1; c < colNova; c++) {
      const celula = resumo.getCell(r, c);
      if (celula.type === ExcelJS.ValueType.Formula) {
        celula.value = { formula: deslocarFormula(celula.formula, colNova), result: celula.result };
      }
    }
  }

  // Mesclagens, formatação condicional e filtro também andam uma coluna
  const merges = Object.keys(resumo._merges || {});
  merges.forEach((m) => {
    const intervalo = resumo._merges[m].range;
    const novo = deslocarIntervalo(intervalo, colNova);
    if (novo !== intervalo) {
      resumo.unMergeCells(intervalo);
      resumo.mergeCells(novo);
    }
  });
  (resumo.conditionalFormattings || []).forEach((cf) => (cf.ref = deslocarIntervalo(cf.ref, colNova)));
  if (typeof resumo.autoFilter === 'string') resumo.autoFilter = deslocarIntervalo(resumo.autoFilter, colNova);

  // Coluna nova: mesmo formato da coluna do último mês, buscando o setor na aba nova
  const letra = numeroParaLetra(colNova);
  for (let r = 1; r <= resumo.rowCount; r++) {
    const celula = resumo.getCell(r, colNova);
    celula.style = resumo.getCell(r, colUltimoMes).style;
    if (r === 1) celula.value = data;
    else if (normalizar(resumo.getCell(r, 1).text)) {
      const setor = normalizar(resumo.getCell(r, 1).text);
      celula.value = {
        formula: `IFERROR(VLOOKUP(A${r},'${nomeAba}'!$A$1:$F$30,5,),0)`,
        result: linhasSetor[setor] ?? 0,
      };
    } else if (resumo.getCell(r, colUltimoMes).type === ExcelJS.ValueType.Formula) {
      celula.value = {
        formula: `SUM(${letra}2:${letra}${r - 1})`,
        result: Object.values(linhasSetor).reduce((s, v) => s + v, 0),
      };
    }
  }
  return true;
}

/**
 * @param {Buffer} buffer  planilha histórica enviada como lista de setores
 * @param {object} relatorio  resultado do rateio (dados, valores, equipamentos)
 * @param {{ colorido, precoPagina, locacao, total, mes }[]} faturas
 * @returns {Promise<{ buffer: Buffer, aba: string, avisos: string[] } | null>} null se não for planilha com abas mensais
 */
async function atualizarHistorico(buffer, relatorio, faturas) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const meses = workbook.worksheets.filter((w) => mesDaAba(w.name)).sort((a, b) => mesDaAba(b.name) - mesDaAba(a.name));
  const mes = faturas.find((f) => f.mes)?.mes;
  if (meses.length === 0 || !mes) return null;

  const [mm, aaaa] = mes.split('.');
  const nomeAba = mes;
  let aba = workbook.getWorksheet(nomeAba);
  if (!aba) {
    const modelo = meses.find((w) => mesDaAba(w.name) < mesDaAba(nomeAba)) || meses[0];
    aba = copiarAba(workbook, modelo, nomeAba);
    moverParaSegundaPosicao(workbook, aba);
  }

  const preenchimento = preencherMes(aba, relatorio, faturas);
  atualizarCache(aba, preenchimento);
  anexarValoresEAuditoria(aba, relatorio, faturas);

  const resumo = workbook.getWorksheet('Resumo');
  const porSetor = Object.fromEntries(relatorio.dados.map((d) => [d.setor, d.total]));
  if (resumo && atualizarResumo(resumo, nomeAba, new Date(Date.UTC(Number(aaaa), Number(mm) - 1, 1)), porSetor)) {
    // Filtro do Resumo guardado como nome definido também cresce uma coluna
    const nomes = workbook.definedNames.model.map((n) =>
      n.name === '_xlnm._FilterDatabase'
        ? { ...n, ranges: n.ranges.map((r) => (r.startsWith('Resumo!') ? r.replace(/\$([A-Z]{1,3})\$(\d+)$/, (m, c, l) => `$${numeroParaLetra(letraParaNumero(c) + 1)}$${l}`) : r)) }
        : n
    );
    workbook.definedNames.model = nomes;
  }

  // O Excel recalcula todas as fórmulas ao abrir
  workbook.calcProperties.fullCalcOnLoad = true;
  const avisos = preenchimento.naoEncontrados.map((s) => `O setor ${s} não tem linha na aba ${nomeAba}.`);
  return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), aba: nomeAba, avisos };
}

module.exports = { atualizarHistorico, deslocarFormula };
