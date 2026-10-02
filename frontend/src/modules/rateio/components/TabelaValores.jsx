import { formatarTotal } from '../../../shared/lib/formatos.js'

const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

export default function TabelaValores({ valores }) {
  if (!valores) return null
  return (
    <section className="cartao">
      <h2>Valores a serem descontados</h2>
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th>Centro de custo</th>
              <th>Setor</th>
              <th className="numero">Páginas</th>
              <th className="numero">Valor (R$)</th>
              <th className="numero">Rateio</th>
            </tr>
          </thead>
          <tbody>
            {valores.linhas.map((l) => (
              <tr key={`${l.contrato}-${l.centroCusto}`}>
                <td>{l.centroCusto}</td>
                <td>{l.setor}</td>
                <td className="numero">{formatarTotal(l.paginas)}</td>
                <td className="numero">{formatarTotal(l.valor, 'telefonia')}</td>
                <td className="numero">{percentual.format(l.rateio)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3">TOTAL</td>
              <td className="numero">{formatarTotal(valores.total, 'telefonia')}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
