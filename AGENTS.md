# Sistema de Rateios Videplast — regras do projeto

- Respostas, documentação e mensagens de commit/PR em **português do Brasil**.
- O que o sistema faz: cruza a fatura/medição mensal (PDF, CSV ou Excel) com a lista de setores (S/N ou chip → setor) e soma impressão (páginas) ou telefonia (R$) por setor, na ordem oficial de `ORDEM_SETORES`.

## Estrutura (padrão do Imobilizados)

```
backend/src/
├── app.js                  # liga as rotas (exportado para os testes)
├── server.js               # sobe o servidor
├── config.js               # única leitura de variáveis de ambiente
├── lib/supabase.js
├── routes/*.routes.js      # rotas finas: validam com o schema e chamam o service
└── modules/<domínio>/      # index.js (barril), schemas/ (zod), services/ (regras)
    ├── rateio/
    ├── diagnostico/
    └── shared/             # utilidades (números pt-BR, texto, zod)
frontend/src/
├── app/                    # App.jsx, config.js (URL da API), estilos.css
├── modules/<domínio>/      # components/, hooks/, services/ e index.js público
└── shared/                 # lib/ (api, formatos) e components/
```

- Um módulo só é importado pelo `index.js` dele.
- Regras de cálculo ficam em funções puras com teste em `backend/tests/` (`npm test`).
- A URL da API é sempre relativa ao app (`/rateios/api/...` em produção); nada de `localhost` no código.

## Agentes (`.claude/agents/`)

| Agente | Quando usar |
| :-- | :-- |
| `auditor-rateio` | Depois de mexer em cálculo ou leitura de arquivos |
| `mapeador-layout` | Fatura, medição ou lista de setores em formato novo |
| `revisor-seguranca` | Antes de PR/implantação ou ao mexer em upload, rotas, Docker |
| `implantacao-servidor` | Publicar, atualizar ou desfazer no servidor Linux |
