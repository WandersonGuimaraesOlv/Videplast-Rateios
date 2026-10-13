// Avisos que pedem correção no Controle de Chips ficam abertos e em amarelo; os informativos, fechados.
const ATENCAO = new Set([
  'sem_centro_custo',
  'nao_cadastrado',
  'cc_inexistente',
  'setor_cc_divergente',
  'setor_em_varios_cc',
  'duplicado',
])

export default function AvisosTelefonia({ avisos }) {
  if (!avisos?.length) return null
  return (
    <div className="avisos">
      {avisos.map((aviso) => {
        const atencao = ATENCAO.has(aviso.tipo)
        return (
          <details key={aviso.tipo} open={atencao} className={`aviso ${atencao ? 'aviso-atencao' : 'aviso-info'}`}>
            <summary>
              {atencao ? '⚠' : 'ℹ'} {aviso.mensagem}
            </summary>
            {aviso.itens?.length > 0 && (
              <ul>
                {aviso.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </details>
        )
      })}
    </div>
  )
}
