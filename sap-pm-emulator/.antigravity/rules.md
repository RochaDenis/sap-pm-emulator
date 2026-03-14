# SAP PM Emulator — Agent Rules

## Stack
- Node.js + Express
- SQLite (better-sqlite3)
- Swagger UI
- Frontend: HTML + vanilla JS (single page, sem framework)

## Padrões obrigatórios
- Endpoints seguem estrutura SAP OData real
- Responses sempre no formato `{ d: { results: [] } }`
- HTTP status codes fiéis ao SAP
- Sempre criar testes antes de implementar features
- Seed data mínimo 50 registros por tabela
- Comentários em inglês no código
- Terminologia SAP original sempre presente no response (ex: AUFNR, QMNUM, EQUNR)

## Frontend /dashboard
- Single page simples
- Log em tempo real das requisições recebidas
- Mostra: método HTTP, endpoint, status, terminologia SAP + descrição PT-BR
- Visual limpo tipo terminal/log
- Sem frameworks CSS pesados

## Tabelas e Seed Data
- QMEL → Nota de Manutenção (IW21) — 100 registros
- AUFK → Ordem de Manutenção Master (IW31) — 100 registros
- AFKO → Ordem de Manutenção Header (IW31) — 100 registros
- EQUI → Equipamento (IE01) — 80 registros
- IFLOT → Local de Instalação (IL01) — 50 registros
- MARA → Material (MM01) — 80 registros
- RESB → Reserva de Materiais (MB21) — 60 registros
- MMPT → Plano de Manutenção (IP41) — 40 registros
- PLPO → Roteiro de Tarefas (IA05) — 40 registros
- IMPTT → Ponto de Medição (IK01) — 50 registros
- MSEG → Movimentação de Material (MB51) — 80 registros

## Seed data deve conter
- Equipamentos reais de indústria: compressores, bombas, motores, transportadores
- Notas com tipos M1, M2, M3 e status: ABER (aberta), INEX (em execução), CONC (concluída)
- Ordens com prioridades: 1-Muito Alta, 2-Alta, 3-Média, 4-Baixa
- Planos de manutenção preventiva com periodicidade: diária, semanal, mensal, anual
- Materiais com unidades SAP: EA, KG, L, M, PC
- Histórico de medições (horas, km, ciclos)
- Custos reais por ordem (mão de obra + material)
- Locais de instalação em hierarquia (Planta > Área > Setor > Equipamento)

## Fluxos implementados
### Corretiva
QMEL (Nota) → AUFK/AFKO (Ordem) → RESB (Reserva Material) → MSEG (Movimento) → Encerramento

### Preventiva
MMPT (Plano) → PLPO (Roteiro) → IMPTT (Medição) → AUFK/AFKO (Ordem gerada) → Execução

### Consultas
- Histórico completo por equipamento (EQUNR)
- Notas em aberto por local de instalação
- Backlog de ordens por prioridade
- Custo acumulado por equipamento
- MTBF e MTTR por equipamento
- Equipamentos críticos por número de falhas
- Materiais consumidos por ordem

## Terminologia SAP nos responses
Sempre retornar campos com nomenclatura SAP original:
- AUFNR = Número da Ordem
- QMNUM = Número da Nota
- EQUNR = Número do Equipamento
- TPLNR = Local de Instalação
- MATNR = Número do Material
- PRIOK = Prioridade
- QMART = Tipo de Nota
- ARBPL = Centro de Trabalho
- KOSTL = Centro de Custo
- IWERK = Setor de Manutenção

## Testes
- Sempre criar testes antes de implementar qualquer feature (TDD)
- Testes unitários: Jest
- Testes de integração: Supertest
- Cobertura mínima: 80% por módulo
- Todo endpoint deve ter teste de:
  - Sucesso (200/201)
  - Erro de validação (400)
  - Não encontrado (404)
  - Erro interno (500)
- Seed data de teste separado do seed de desenvolvimento
- Rodar testes antes de qualquer commit