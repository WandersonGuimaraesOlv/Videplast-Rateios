// Cadastro oficial de centros de custo (mesmas colunas da tabela `centro_de_custo` do
// Supabase: centro_custo, setores, unidade). Dá o nome certo de cada CC e confere os
// códigos digitados no Controle de Chips.
const LISTA_PADRAO = require('../data/centros-custo.json');

/** "PCP - Planej. e Controle de Produção" → "PCP PLANEJ E CONTROLE DE PRODUCAO" */
function normalizarNome(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

const normalizarCodigo = (codigo) => String(codigo || '').trim().toUpperCase();

/** 4 dígitos da unidade no começo do código: "1005" em "1005PAUX21". */
const PREFIXO_UNIDADE = /^\d{4}(?=[A-Z])/;

/** "1007PAUX21" → "PAUX21" (o código sem o prefixo numérico da unidade). */
const semUnidade = (codigo) => normalizarCodigo(codigo).replace(/^\d+/, '');

/**
 * @param {{ centro_custo: string, setores: string, unidade?: string }[]} lista
 */
function criarCadastroCentrosCusto(lista = LISTA_PADRAO) {
  const porCodigo = new Map();
  const porNome = new Map();
  const porSufixo = new Map();

  for (const linha of lista) {
    const codigo = normalizarCodigo(linha.centro_custo);
    if (!codigo) continue;
    const item = { codigo, nome: String(linha.setores || '').replace(/\s+/g, ' ').trim(), unidade: String(linha.unidade || '') };
    porCodigo.set(codigo, item);

    const nome = normalizarNome(item.nome);
    if (nome) porNome.set(nome, [...(porNome.get(nome) || []), item]);
    const sufixo = semUnidade(codigo);
    porSufixo.set(sufixo, [...(porSufixo.get(sufixo) || []), item]);
  }

  // Prefixo da unidade quando o cadastro é de uma unidade só (RV: todo CC começa com 1005)
  const prefixos = new Set([...porCodigo.keys()].map((c) => (PREFIXO_UNIDADE.exec(c) || [])[0]).filter(Boolean));
  const unidadePadrao = prefixos.size === 1 ? [...prefixos][0] : null;

  return {
    tamanho: porCodigo.size,
    unidadePadrao,

    /**
     * Troca o prefixo da unidade pelo da unidade do cadastro: "1007PAUX21" → "1005PAUX21".
     * Com cadastro de várias unidades, devolve o código como veio.
     */
    ajustarUnidade(codigo) {
      const c = normalizarCodigo(codigo);
      return unidadePadrao ? c.replace(PREFIXO_UNIDADE, unidadePadrao) : c;
    },

    /** Item do cadastro ou null. */
    buscar: (codigo) => porCodigo.get(normalizarCodigo(codigo)) || null,

    /** CCs cujo nome oficial é exatamente o setor informado (ignora acento/pontuação). */
    buscarPorNome: (setor) => porNome.get(normalizarNome(setor)) || [],

    /** Para um código que não existe: o mesmo código em outra unidade ("1007PAUX21" → 1005PAUX21). */
    sugerirParaCodigo(codigo) {
      const alvo = normalizarCodigo(codigo);
      return (porSufixo.get(semUnidade(alvo)) || []).filter((i) => i.codigo !== alvo);
    },
  };
}

const cadastroPadrao = criarCadastroCentrosCusto();

module.exports = { criarCadastroCentrosCusto, cadastroPadrao, normalizarNome };
