import { Fragment, useState } from 'react'
import { formatarMoeda, formatarPercentual } from '../../../shared/lib/formatos.js'

const chaveGrupo = (g) => g.centroCusto || g.tipo
const categoria = (linha, chave) => linha.categorias[chave] || 0

/** Linhas (chips) de um centro de custo, com o valor de cada categoria da fatura. */
function DetalheGrupo({ grupo }) {
  return (
    <table className="tabela tabela-detalhe">
      <thead>
        <tr>
          <th>Número</th>
          <th>Responsável</th>
          <th>Setor (controle)</th>
          <th>Plano</th>
          <th className="numero">Mensalidades</th>
          <th className="numero">Uso</th>
          <th className="numero">Outros créd./déb.</th>
          <th className="numero">Outras operadoras</th>
          <th className="numero">Valor</th>
          <th className="numero">% no setor</th>
        </tr>
      </thead>
      <tbody>
        {grupo.linhas.map((l) => (
          <tr key={l.numero}>
            <td className="sem-quebra">{l.numeroFormatado}</td>
            <td>{l.responsavel || '—'}</td>
            <td>{l.setor || '—'}</td>
            <td>{l.plano || '—'}</td>
            <td className="numero">{formatarMoeda(categoria(l, 'mensalidades'))}</td>
            <td className="numero">{formatarMoeda(categoria(l, 'uso'))}</td>
            <td className="numero">{formatarMoeda(categoria(l, 'outros') + categoria(l, 'outrosServicos'))}</td>
            <td className="numero">{formatarMoeda(categoria(l, 'outrasOperadoras'))}</td>
            <td className="numero">
              <strong>{formatarMoeda(l.total)}</strong>
            </td>
            <td className="numero">{formatarPercentual(l.percentualNoGrupo)}</td>
          </tr>
        ))}
        {grupo.ajusteGeral !== 0 && (
          <tr>
            <td colSpan="8" className="numero">
              <em>Parte das cobranças gerais da fatura (rateio proporcional):</em>
            </td>
            <td className="numero">{formatarMoeda(grupo.ajusteGeral)}</td>
            <td />
          </tr>
        )}
      </tbody>
    </table>
  )
}

/** "Tabela de rateio TIM": um total por centro de custo; clique na linha para ver os chips. */
export default function TabelaTelefonia({ grupos, totalRateado }) {
  const [abertos, setAbertos] = useState(() => new Set())
  const todosAbertos = abertos.size === grupos.length
  const totalLinhas = grupos.reduce((soma, g) => soma + g.quantidadeLinhas, 0)
  const totalPercentual = grupos.reduce((soma, g) => soma + g.percentual, 0)

  function alternar(chave) {
    setAbertos((atual) => {
      const novo = new Set(atual)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
  }

  return (
    <>
      <div className="cabecalho-cartao">
        <h3>Tabela de rateio TIM</h3>
        <button
          type="button"
          className="botao botao-discreto"
          onClick={() => setAbertos(todosAbertos ? new Set() : new Set(grupos.map(chaveGrupo)))}
        >
          {todosAbertos ? 'Recolher linhas' : 'Ver todas as linhas'}
        </button>
      </div>
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Setor</th>
              <th>Centro de custo</th>
              <th className="numero">Linhas</th>
              <th className="numero">Valor</th>
              <th className="numero">%</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const chave = chaveGrupo(g)
              const aberto = abertos.has(chave)
              const pendente = g.tipo !== 'centro_custo' || g.cadastrado === false
              return (
                <Fragment key={chave}>
                  <tr
                    className={`linha-grupo${pendente ? ' linha-pendente' : ''}`}
                    onClick={() => alternar(chave)}
                    title={aberto ? 'Recolher' : 'Ver as linhas deste centro de custo'}
                  >
                    <td>
                      <span className="seta" aria-hidden="true">
                        {aberto ? '▾' : '▸'}
                      </span>
                      {g.setor}
                    </td>
                    <td className="codigo">
                      {g.centroCusto || '—'}
                      {g.cadastrado === false && <span className="selo-erro">não existe no cadastro</span>}
                    </td>
                    <td className="numero">{g.quantidadeLinhas}</td>
                    <td className="numero">{formatarMoeda(g.total)}</td>
                    <td className="numero">{formatarPercentual(g.percentual)}</td>
                  </tr>
                  {aberto && (
                    <tr className="linha-detalhe">
                      <td colSpan="5">
                        <DetalheGrupo grupo={g} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2">TOTAL GERAL</td>
              <td className="numero">{totalLinhas}</td>
              <td className="numero">{formatarMoeda(totalRateado)}</td>
              <td className="numero">{formatarPercentual(totalPercentual)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
