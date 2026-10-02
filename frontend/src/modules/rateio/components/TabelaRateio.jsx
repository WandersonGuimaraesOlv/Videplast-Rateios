import { formatarTotal } from '../../../shared/lib/formatos.js'
import { baixarPlanilha } from '../services/baixar-planilha.js'

function Avisos({ avisos, tipo }) {
  const { setoresDesconhecidos = [], itensSemSetor = [], valorForaDoRelatorio = 0 } = avisos || {}
  if (!setoresDesconhecidos.length && !itensSemSetor.length) return null
  return (
    <div className="mensagem mensagem-alerta">
      {setoresDesconhecidos.length > 0 && (
        <p>
          Setores fora do relatório na lista de setores: <strong>{setoresDesconhecidos.join(', ')}</strong>
          {valorForaDoRelatorio > 0 && <> ({formatarTotal(valorForaDoRelatorio, tipo)} não entraram no total)</>}.
        </p>
      )}
      {itensSemSetor.length > 0 && (
        <p>
          {itensSemSetor.length} item(ns) da medição sem setor cadastrado: {itensSemSetor.slice(0, 10).join(', ')}
          {itensSemSetor.length > 10 && '...'}
        </p>
      )}
    </div>
  )
}

export default function TabelaRateio({ relatorio }) {
  const { tipo, dados, totalGeral, avisos, arquivos = [] } = relatorio
  const titulo = tipo === 'telefonia' ? 'Valor (R$)' : 'Total de páginas (mês)'

  return (
    <section className="cartao">
      <div className="cabecalho-cartao">
        <h2>Relatório consolidado de {tipo === 'telefonia' ? 'telefonia' : 'impressão'}</h2>
        {relatorio.planilha && (
          <button type="button" className="botao botao-primario" onClick={() => baixarPlanilha(relatorio)}>
            Baixar planilha (Excel)
          </button>
        )}
      </div>
      {arquivos.length > 0 && (
        <ul className="arquivos-lidos">
          {arquivos.map((a) => (
            <li key={a.nome}>
              {a.nome}
              {a.contrato ? ` (${a.contrato})` : a.colorido && ' (colorida)'}: <strong>{formatarTotal(a.total, tipo)}</strong>
              {a.valorFatura != null && <> · fatura {formatarTotal(a.valorFatura, 'telefonia')}</>}
            </li>
          ))}
        </ul>
      )}
      <Avisos avisos={avisos} tipo={tipo} />
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Setor</th>
              <th className="numero">{titulo}</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.setor}>
                <td>{d.ordem}</td>
                <td>{d.setor}</td>
                <td className="numero">{formatarTotal(d.total, tipo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2">TOTAL GERAL</td>
              <td className="numero">{formatarTotal(totalGeral, tipo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
