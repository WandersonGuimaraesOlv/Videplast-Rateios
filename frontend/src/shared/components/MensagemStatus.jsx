export default function MensagemStatus({ tipo = 'info', children }) {
  if (!children) return null
  return (
    <div className={`mensagem mensagem-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
