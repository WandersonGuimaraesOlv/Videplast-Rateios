import { baixarPlanilha } from '../../../shared/lib/baixar-planilha.js'
import ResumoFatura from './ResumoFatura.jsx'
import AvisosTelefonia from './AvisosTelefonia.jsx'
import TabelaTelefonia from './TabelaTelefonia.jsx'

export default function RelatorioTelefonia({ rateio }) {
  return (
    <section className="cartao">
      <div className="cabecalho-cartao">
        <h2>Rateio da fatura TIM {rateio.fatura.referencia}</h2>
        {rateio.planilha && (
          <button type="button" className="botao botao-primario" onClick={() => baixarPlanilha(rateio)}>
            Baixar planilha (Excel)
          </button>
        )}
      </div>
      <ResumoFatura rateio={rateio} />
      <AvisosTelefonia avisos={rateio.avisos} />
      <TabelaTelefonia grupos={rateio.grupos} totalRateado={rateio.totalRateado} />
    </section>
  )
}
