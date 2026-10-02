const inteiro = new Intl.NumberFormat('pt-BR')
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Páginas como inteiro com milhar; telefonia como R$. */
export const formatarTotal = (valor, tipo) =>
  tipo === 'telefonia' ? moeda.format(Number(valor) || 0) : inteiro.format(Number(valor) || 0)
