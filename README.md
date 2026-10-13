# Sistema de Rateios Videplast

Cruza a fatura/medição mensal (PDF, CSV ou Excel) com a lista de setores e soma o consumo por setor, na ordem oficial do relatório:

- **Impressoras:** lista de setores com `S/N` (ou `SerialNumber`/`Série`) e `Setor`; medição com páginas (`Páginas/Mês`, `NoCópias`, `Páginas`, `Total` ou `Valor`).
- **Telefonia:** lista de setores com `Número do Chip` e `Setor`; medição com o valor em R$.

O relatório mostra os 16 setores, o total geral, avisa setores e itens que ficaram de fora e exporta CSV para o Excel.

### Aba Telefonia (TIM)

Envie a **fatura TIM em PDF** e o **Controle de Chips** (Excel). Cada linha entra com o valor que a TIM cobrou dela (mensalidades, uso, outros créditos/débitos e outras operadoras) e vai para o centro de custo da coluna **"Centro de Custo ATUALIZADO"**. A tela mostra a conferência com o total da fatura, os avisos do que corrigir no controle e a tabela de rateio por CC; a planilha Excel sai no formato da planilha manual (um bloco por CC, com fórmulas, e a tabela de rateio no final).

## Rodar em desenvolvimento

```bash
cd backend && npm install && npm run dev      # API em http://localhost:5000
cd frontend && npm install && npm run dev     # app em http://localhost:5173 (repassa /api ao backend)
cd backend && npm test                        # testes das regras de rateio
```

## Produção (Docker)

```bash
cp .env.example .env    # ajuste porta e subcaminho
docker compose up -d --build
```

Passo a passo no servidor Linux: [docs/DEPLOY-LINUX.md](docs/DEPLOY-LINUX.md). Estrutura e agentes: [AGENTS.md](AGENTS.md).
