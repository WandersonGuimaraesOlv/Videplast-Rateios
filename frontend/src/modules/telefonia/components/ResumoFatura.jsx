import { formatarMoeda } from '../../../shared/lib/formatos.js'

function Item({ titulo, valor, destaque }) {
  return (
    <div className={`resumo-item${destaque ? ` resumo-${destaque}` : ''}`}>
      <span>{titulo}</span>
      <strong>{valor || '—'}</strong>
    </div>
  )
}

/** Cabeçalho da fatura + conferência (total rateado = total da fatura). */
export default function ResumoFatura({ rateio }) {
  const { fatura, totalRateado, conferido } = rateio
  const diferenca = Math.round((fatura.total - totalRateado) * 100) / 100
  const situacao = conferido ? 'ok' : 'erro'

  return (
    <div className="resumo-fatura">
      <Item titulo="Referência" valor={fatura.referencia} />
      <Item titulo="Período" valor={fatura.periodo} />
      <Item titulo="Vencimento" valor={fatura.vencimento} />
      <Item titulo="Linhas cobradas" valor={fatura.linhasCobradas} />
      <Item titulo="Total da fatura (PDF)" valor={formatarMoeda(fatura.total)} destaque="info" />
      <Item titulo="Total rateado" valor={formatarMoeda(totalRateado)} destaque={situacao} />
      <Item
        titulo="Conferência"
        valor={conferido ? '✔ Fecha com a fatura' : `✖ Diferença de ${formatarMoeda(diferenca)}`}
        destaque={situacao}
      />
    </div>
  )
}
