# Onda Sertaneja — Diretrizes do Projeto (CLAUDE.md)

Este documento orienta o **Claude Code** e agentes de desenvolvimento para atuar no projeto **Onda Sertaneja** com consistência e segurança.

---

## 1. Visão Geral do Projeto
- **Portal:** Onda Sertaneja ("A batida que move o Brasil")
- **URL de Produção:** [https://www.ondasertaneja.com.br](https://www.ondasertaneja.com.br)
- **Hospedagem:** Hostinger (deploy automático da branch `main` com Node.js)
- **Stack:** Next.js 14 (App Router), TypeScript, Prisma ORM, SQLite (`prisma/dev.db` e `./dev.db`)

---

## 2. Comandos Principais
- **Desenvolvimento local:** `npm run dev` (roda em `http://localhost:3000`)
- **Build de produção:** `npm run build` (executa `prisma generate && next build`)
- **Iniciar produção:** `npm run start` (escuta na porta padrão `process.env.PORT || 3000`)
- **Banco de dados (Prisma):**
  - Atualizar schema: `npm run db:push`
  - Gerar Prisma Client: `npx prisma generate`
  - Popular banco de dados a partir dos JSONs: `npm run seed`

---

## 3. Estrutura do Código
- `app/`: Rotas do Next.js App Router (páginas e API routes)
  - `app/api/`: Endpoints de API REST (`/api/artists`, `/api/news`, `/api/events`, etc.)
  - `app/artistas/`, `app/agenda/`, `app/lancamentos/`, etc.: Páginas do portal
- `lib/prisma.ts`: Conexão singleton do Prisma com resolução automática e robusta de caminho para o SQLite no ambiente Hostinger/Linux
- `prisma/`:
  - `schema.prisma`: Definição de modelos (Artist, Event, News, ChartEntry, etc.)
  - `dev.db`: Banco SQLite com dados já populados
- `scripts/`: Utilitários de seed e migração (`seed-from-json.ts`)
- `components/`: Componentes React compartilhados

---

## 4. Regras e Boas Práticas de Desenvolvimento
1. **Preservação de Layout e Identidade:** Manter a paleta de cores (laranja e escuro), tipografia e responsividade (mobile-first).
2. **Compatibilidade com Hostinger:**
   - Nunca forçar porta fixa no `next start` (a Hostinger injeta a porta via `process.env.PORT`).
   - Manter `lib/prisma.ts` utilizando a resolução resiliente de caminhos para SQLite.
3. **Deploy Contínuo:** Todo commit enviado para a branch `main` no GitHub (`origin/main`) dispara automaticamente a compilação e deploy na Hostinger.
4. **Commits Semânticos:** Usar mensagens claras (`feat:`, `fix:`, `style:`, `chore:`).
