const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const app = require('../src/app');
const { brlParaCentavos, extrairTextoPdf } = require('../src/modules/shared');
const { criarPdf, linhasFaturaTim, criarXlsx, CABECALHO_CONTROLE, linhaControle } = require('./support/arquivos');

let servidor;
let base;

test.before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => servidor.close());

const pdfFatura = criarPdf(
  linhasFaturaTim({
    porAcesso: [
      ['Mensalidades e Franquias', '64999990001', '25,90'],
      ['Uso do', '64999990001', '6,09'],
      ['Mensalidades e Franquias', '64999990002', '25,90'],
    ],
    total: '57,89',
  })
);
const xlsxControle = criarXlsx([
  CABECALHO_CONTROLE,
  linhaControle(['64-999990001', 'Ana', 'Transporte', '1005COML04']),
  linhaControle(['64-999990002', 'Caio', 'RH', '1007ADMI09']),
]);

const enviar = (arquivos) => {
  const form = new FormData();
  for (const [campo, nome, conteudo] of arquivos) form.append(campo, new Blob([conteudo]), nome);
  return fetch(`${base}/api/rateio/telefonia`, { method: 'POST', body: form });
};

test('POST /api/rateio/telefonia devolve o rateio por CC e a planilha em base64', async () => {
  const resposta = await enviar([
    ['fatura', 'fatura.pdf', pdfFatura],
    ['controle', 'controle.xlsx', xlsxControle],
  ]);
  const corpo = await resposta.json();
  assert.equal(resposta.status, 200, JSON.stringify(corpo));
  assert.equal(corpo.sucesso, true);
  assert.equal(corpo.conferido, true);
  assert.equal(corpo.fatura.total, 57.89);
  assert.equal(corpo.fatura.referencia, 'OUT/26');
  // 1007ADMI09 vale como 1005ADMI09 (em RV todo CC começa com 1005) e leva o nome oficial
  assert.deepEqual(
    corpo.grupos.map((g) => [g.centroCusto, g.setor, g.total]),
    [
      ['1005ADMI09', 'Departamento Pessoal', 25.9],
      ['1005COML04', 'Transportes', 31.99],
    ]
  );
  assert.equal(corpo.nomePlanilha, 'Rateio_TIM_OUT-26.xlsx');
  const wb = XLSX.read(Buffer.from(corpo.planilha, 'base64'), { type: 'buffer' });
  assert.deepEqual(wb.SheetNames, ['TIM OUT-26']);
});

test('POST /api/rateio/telefonia exige os dois arquivos', async () => {
  const resposta = await enviar([['fatura', 'fatura.pdf', pdfFatura]]);
  assert.equal(resposta.status, 400);
  assert.match((await resposta.json()).erro, /Controle de Chips/);
});

test('POST /api/rateio/telefonia recusa fatura que não é PDF', async () => {
  const resposta = await enviar([
    ['fatura', 'fatura.xlsx', xlsxControle],
    ['controle', 'controle.xlsx', xlsxControle],
  ]);
  assert.equal(resposta.status, 400);
  assert.match((await resposta.json()).erro, /\.pdf/);
});

test('POST /api/rateio/telefonia com PDF que não é fatura TIM → 422 explicando', async () => {
  const resposta = await enviar([
    ['fatura', 'outro.pdf', criarPdf(['Outro documento qualquer'])],
    ['controle', 'controle.xlsx', xlsxControle],
  ]);
  assert.equal(resposta.status, 422);
  const corpo = await resposta.json();
  assert.equal(corpo.sucesso, false);
  assert.match(corpo.erro, /Resumo do Detalhamento/);
});

test('reais em centavos sem erro de ponto flutuante', () => {
  assert.equal(brlParaCentavos('1.390,67'), 139067);
  assert.equal(brlParaCentavos('-12,20'), -1220);
  assert.equal(brlParaCentavos('0,05'), 5);
  assert.throws(() => brlParaCentavos('abc'), /inválido/);
});

test('PDF pequeno vindo de Buffer do pool do Node é lido (antes: "bad XRef entry")', async () => {
  const buffer = criarPdf(['primeira linha', 'Créditos e Débitos']);
  assert.ok(buffer.byteOffset > 0, 'o Buffer de teste está dentro do pool compartilhado');
  const texto = await extrairTextoPdf(buffer);
  assert.match(texto, /primeira linha/);
  assert.match(texto, /Créditos e Débitos/);
});
