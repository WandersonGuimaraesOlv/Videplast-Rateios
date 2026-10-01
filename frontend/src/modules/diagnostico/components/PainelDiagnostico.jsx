import { useState } from 'react'
import MensagemStatus from '../../../shared/components/MensagemStatus.jsx'
import { testarConexao } from '../services/diagnostico-api.js'

export default function PainelDiagnostico() {
  const [testando, setTestando] = useState(false)
  const [resultado, setResultado] = useState(null)

  async function testar() {
    setTestando(true)
    setResultado(await testarConexao())
    setTestando(false)
  }

  return (
    <section className="cartao cartao-discreto">
      <h3>Diagnóstico</h3>
      <p>Confere se o servidor e o Supabase estão respondendo.</p>
      <button type="button" className="botao" onClick={testar} disabled={testando}>
        {testando ? 'Testando...' : 'Validar conexão API/Supabase'}
      </button>
      {resultado && (
        <MensagemStatus tipo={resultado.sucesso ? 'sucesso' : 'erro'}>
          {resultado.sucesso ? resultado.mensagem : resultado.erro}
        </MensagemStatus>
      )}
    </section>
  )
}
