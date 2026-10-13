const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { cadastroPadrao, criarCadastroCentrosCusto, normalizarNome } = require('../src/modules/centros-custo');
const lista = require('../src/modules/centros-custo/data/centros-custo.json');

describe('cadastro de centros de custo', () => {
  test('lista embutida: códigos no formato da Videplast e sem repetição', () => {
    assert.equal(cadastroPadrao.tamanho, lista.length);
    const codigos = lista.map((i) => i.centro_custo);
    assert.equal(new Set(codigos).size, codigos.length);
    for (const codigo of codigos) assert.match(codigo, /^\d{4}[A-Z]{4}\d{2}$/);
  });

  test('busca por código ignora maiúsculas e espaços', () => {
    assert.deepEqual(cadastroPadrao.buscar(' 1005paux21 '), { codigo: '1005PAUX21', nome: 'Manutencao', unidade: '1005' });
    assert.equal(cadastroPadrao.buscar('1007PAUX21'), null);
    assert.equal(cadastroPadrao.buscar(''), null);
  });

  test('busca por nome ignora acento e pontuação', () => {
    assert.equal(normalizarNome('PCP - Planej. e Controle de Produção'), 'PCP PLANEJ E CONTROLE DE PRODUCAO');
    assert.deepEqual(cadastroPadrao.buscarPorNome('Manutenção').map((i) => i.codigo), ['1005PAUX21']);
    assert.deepEqual(cadastroPadrao.buscarPorNome('PCP - Planej. e Controle de Produção').map((i) => i.codigo), ['1005PAUX52']);
    assert.deepEqual(cadastroPadrao.buscarPorNome('Adm Industria').map((i) => i.codigo), ['1005PAUX50']);
    assert.deepEqual(cadastroPadrao.buscarPorNome('Setor que não existe'), []);
  });

  test('código de outra unidade sugere o mesmo CC da unidade cadastrada', () => {
    assert.deepEqual(cadastroPadrao.sugerirParaCodigo('1007PAUX21').map((i) => i.codigo), ['1005PAUX21']);
    assert.deepEqual(cadastroPadrao.sugerirParaCodigo('1007ZZZZ99'), []);
    assert.deepEqual(cadastroPadrao.sugerirParaCodigo('1005PAUX21'), [], 'o próprio código não é sugestão');
  });

  test('em RV todo CC começa com 1005: outro prefixo vira 1005', () => {
    assert.equal(cadastroPadrao.unidadePadrao, '1005');
    assert.equal(cadastroPadrao.ajustarUnidade('1007paux21'), '1005PAUX21');
    assert.equal(cadastroPadrao.ajustarUnidade('1005COML04'), '1005COML04');
    assert.equal(cadastroPadrao.ajustarUnidade('100001234'), '100001234', 'código só com números fica como está');

    const duasUnidades = criarCadastroCentrosCusto([
      { centro_custo: '1005PAUX21', setores: 'Manutencao' },
      { centro_custo: '2001PAUX21', setores: 'Manutencao' },
    ]);
    assert.equal(duasUnidades.unidadePadrao, null);
    assert.equal(duasUnidades.ajustarUnidade('1007PAUX21'), '1007PAUX21');
  });

  test('aceita outra lista (ex.: exportada do Supabase)', () => {
    const c = criarCadastroCentrosCusto([{ centro_custo: 'X1', setores: '  Nome   com  espaços ' }, { centro_custo: '' }]);
    assert.equal(c.tamanho, 1);
    assert.equal(c.buscar('x1').nome, 'Nome com espaços');
  });
});
