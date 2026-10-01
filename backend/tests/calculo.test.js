const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectarTelefonia,
  montarMapaSetores,
  somarMedicaoTexto,
  somarMedicaoTabela,
  montarRelatorio,
  lerCsv,
} = require('../src/modules/rateio');
const { paraNumero } = require('../src/modules/shared');

const totalDe = (relatorio, setor) => relatorio.dados.find((d) => d.setor === setor).total;

test('paraNumero entende formatos brasileiros', () => {
  assert.equal(paraNumero('12,50'), 12.5);
  assert.equal(paraNumero('1.234,56'), 1234.56);
  assert.equal(paraNumero('R$ 1.234,56'), 1234.56);
  assert.equal(paraNumero('1.234'), 1234);
  assert.equal(paraNumero('12.5'), 12.5);
  assert.equal(paraNumero(300), 300);
  assert.equal(paraNumero(''), 0);
  assert.equal(paraNumero(undefined), 0);
});

test('lerCsv aceita ; e quebras de linha do Windows', () => {
  const linhas = lerCsv('S/N;Setor\r\nabc1 ;pcp\r\n\r\nXYZ;Guarita\r\n');
  assert.deepEqual(linhas, [
    { 'S/N': 'abc1', Setor: 'pcp' },
    { 'S/N': 'XYZ', Setor: 'Guarita' },
  ]);
});

test('impressoras: soma páginas da planilha por setor e avisa itens sem setor', () => {
  const setores = [
    { 'S/N': 'abc1', Setor: 'pcp' },
    { SerialNumber: 'XYZ9', Setor: 'Guarita' },
    { 'S/N': 'Q1', Setor: 'Diretoria' },
  ];
  assert.equal(detectarTelefonia(setores), false);
  const { mapa, setoresDesconhecidos } = montarMapaSetores(setores, false);
  assert.deepEqual(setoresDesconhecidos, ['DIRETORIA']);

  const medicao = [
    { 'S/N': 'ABC1', 'Páginas/Mês': '1.200' },
    { 'S/N': 'abc1', Páginas: 300 },
    { 'S/N': 'XYZ9', Total: '50' },
    { 'S/N': 'Q1', Total: '10' },
    { 'S/N': 'SEM-CADASTRO', Total: '999' },
  ];
  const relatorio = montarRelatorio(somarMedicaoTabela(medicao, mapa, false), false, setoresDesconhecidos);

  assert.equal(relatorio.tipo, 'impressoras');
  assert.equal(totalDe(relatorio, 'PCP'), 1500);
  assert.equal(totalDe(relatorio, 'GUARITA'), 50);
  assert.equal(relatorio.totalGeral, 1550);
  assert.equal(relatorio.dados.length, 16);
  assert.deepEqual(relatorio.avisos.itensSemSetor, ['SEM-CADASTRO']);
  assert.equal(relatorio.avisos.valorForaDoRelatorio, 10);
});

test('telefonia: valores com vírgula decimal são somados corretamente', () => {
  const setores = [
    { 'Número do Chip': '62999990001', Setor: 'Expedição' },
    { 'Número do Chip': '62999990002', Setor: 'Expedição' },
  ];
  assert.equal(detectarTelefonia(setores), true);
  const { mapa } = montarMapaSetores(setores, true);
  const medicao = [
    { 'Número do Chip': '62999990001', Valor: '12,50' },
    { 'Número do Chip': '62999990002', Valor: '1.000,25' },
  ];
  const relatorio = montarRelatorio(somarMedicaoTabela(medicao, mapa, true), true);
  assert.equal(relatorio.tipo, 'telefonia');
  assert.equal(totalDe(relatorio, 'EXPEDIÇÃO'), 1012.75);
  assert.equal(relatorio.totalGeral, 1012.75);
});

test('PDF: chave mais longa vence e pega o último número da linha', () => {
  const { mapa } = montarMapaSetores(
    [
      { 'S/N': 'ABC12', Setor: 'PCP' },
      { 'S/N': 'ABC123', Setor: 'PCM' },
    ],
    false
  );
  const texto = ['Equipamento ABC123 Contador 1.250', 'Equipamento ABC12 Contador 300', 'Rodapé 99'].join('\n');
  const relatorio = montarRelatorio(somarMedicaoTexto(texto, mapa, false), false);
  assert.equal(totalDe(relatorio, 'PCM'), 1250);
  assert.equal(totalDe(relatorio, 'PCP'), 300);
  assert.equal(relatorio.totalGeral, 1550);
});

test('PDF de telefonia: pega o valor em reais da linha', () => {
  const { mapa } = montarMapaSetores([{ 'Número do Chip': '62999990001', Setor: 'PCP' }], true);
  const texto = 'Linha 62999990001 Plano Empresa R$ 1.049,90';
  const relatorio = montarRelatorio(somarMedicaoTexto(texto, mapa, true), true);
  assert.equal(totalDe(relatorio, 'PCP'), 1049.9);
});
