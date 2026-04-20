

# Nexus Poker House — Plano Final Consolidado

Plano completo com todas as referências visuais + 4 alterações solicitadas pelo usuário. Implementação em 4 fases.

---

## Design System

- Fundo: gradient vertical `#0a0a0a → #0f0f0f → #1a1a1a`
- Cards: `#1a1a1a` com borda `rgba(212,175,55,0.15)`
- Dourado: `#d4af37` (principal), `#f4d03f` (claro)
- Semânticas: verde lucro, vermelho prejuízo, azul stats, roxo Cash Game, laranja Torneio
- Tipografia: Inter
- Classes: `.nexus-card`, `.nexus-text-gold`, `.glass-effect`, `.nexus-hover-gold`, `.nexus-gold-gradient`

**Header:** logo 48x48 com borda dourada + "Nexus Poker House" / subtítulo. Links: Dashboard, Partidas, Ranking, Perfil (só logado), Estatísticas (só admin), Login/Sair. Mobile = scroll horizontal.

---

## Regras das 4 alterações do usuário

### 1. Sistema dual por temporada
- `season_year < 2026`: ranking por **lucro total em R$** (cash + torneio somados)
- `season_year >= 2026`: sistema de pontos (PBT × FM + KO / PBC × FP + 5 + KO)
- `scoring.ts` decide automaticamente pela `season_year`

### 2. Buy-in e Rebuy editáveis
- Campo novo `rebuy_value` em `games` (default = igual ao buy_in)
- `CreateGameModal` e `EditGameModal` com 2 campos: **Buy-in (R$)** e **Valor do Rebuy (R$)**
- Fórmula: `total_invested = (entries × buy_in) + (rebuys × rebuy_value)`

### 3. Acesso
- **Público**: Dashboard, Partidas, Ranking (SELECT público via RLS)
- **Logado**: Perfil
- **Admin**: Estatísticas, criar/editar partidas, gerenciar vínculos, atualizar ranking, reset

### 4. Jogadores temporários + vínculo
- Nova tabela `temporary_players` (nickname obrigatório, nome real opcional, avatar)
- `game_participations.player_ref` aceita `user_id` OU `temp_player_id` (um dos dois)
- Jogadores temporários aparecem no ranking normalmente
- Nova tabela `link_requests` (temp_player_id, user_id, status: pending/approved/rejected)
- Usuário logado vê botão **"Solicitar Vínculo"** ao lado de cada jogador temporário no ranking
- Admin vê aba **"Vínculos Pendentes"** (badge com contagem no header)
- Ao aprovar: edge function migra todas as `game_participations` do temp para o user_id real, apaga o `temporary_player`, recalcula ranking
- Admin também pode vincular direto sem solicitação (dropdown no jogador temporário → "Vincular a conta existente")

### Outras decisões confirmadas
- Temporada **sempre editável pelo admin** (encerramento = apenas flag visual para público)
- Admin cria temporário com nickname + nome real opcional

---

## FASE 1 — Design System + Layout + Páginas Stub

- Tokens HSL + classes custom em `index.css` e `tailwind.config.ts`
- `Layout.tsx` com header fixo conforme refs
- Rotas: `/`, `/partidas`, `/ranking`, `/perfil`, `/estatisticas`, `/complete-profile`, `/auth`
- Todas as páginas com estrutura visual completa e dados mockados para validação

---

## FASE 2 — Backend (Lovable Cloud) + Auth

**Tabelas:**
- `profiles` (id FK auth.users, nickname, full_name, phone, avatar_url, gender, level, xp, profile_completed, current_rank, achievements[])
- `user_roles` (id, user_id, role: admin/user) — tabela separada
- `games` (id, name, type, date, season_year, **buy_in**, **rebuy_value**, status, total_pot, house_fee, description, created_by)
- `temporary_players` (id, nickname, full_name, avatar_url, gender, created_by, created_at)
- `game_participations` (id, game_id, **user_id** nullable, **temp_player_id** nullable, player_name, player_nickname, entries, rebuys, total_invested, final_amount, profit_loss, profit_percentage, position, is_winner, ko_points, ranking_points) — constraint: exatamente 1 dos 2 IDs preenchido
- `link_requests` (id, temp_player_id, user_id, status: pending/approved/rejected, requested_at, resolved_at, resolved_by)
- `public_rankings` (todas as colunas do prompt + **player_type: 'user'|'temp'**, player_ref_id)

**Segurança:**
- Function `has_role(_user_id, _role)` SECURITY DEFINER
- RLS: games/participations/rankings/temp_players → SELECT público; INSERT/UPDATE/DELETE → só admin
- profiles → cada user lê/edita o próprio; admin lê tudo
- link_requests → user cria/lê as próprias; admin lê/atualiza todas
- Trigger `handle_new_user` cria profile + role `user` padrão

**Auth:**
- Email/senha em `/auth`
- `onAuthStateChange` antes de `getSession`
- Redirect `/complete-profile` se `profile_completed = false`
- Zod em todos os forms

---

## FASE 3 — Partidas + Pontuação + Ranking

### Página Partidas
- Tabs temporada detectadas automaticamente dos jogos existentes
- Busca + filtros (Todas/Cash Game/Torneios)
- Cards horizontais conforme ref
- Admin: botão "Nova Partida"

### CreateGameModal
- Nome, Tipo, Data + Hora, **Buy-in (R$)**, **Valor do Rebuy (R$)**, Temporada (auto-preenchido com ano da data mas editável — permite adicionar partidas antigas de 2025)
- Seleção múltipla de jogadores: chips removíveis + lista com checkboxes de **users + temporary_players** (separados visualmente por seção)
- Botão "+ Criar Jogador Temporário" abre sub-dialog (nickname + nome real opcional + gerar avatar)
- Descrição

### GameDetailsModal
- Header + 4 stat cards (Buy-in, Pote, Jogadores, Taxa Casa)
- Barra admin: Adicionar Jogador, Editar Partida, Finalizar Partida, Exportar CSV, Relatório
- Tabela com avatar + nickname + nome, badges para "Temporário" (cinza pequeno)
- Ao finalizar: calcula `profit_loss = final - invested`, `profit_percentage`, `position` (por stack desc), `is_winner`, `total_pot`

### Sistema de Pontuação (`src/lib/scoring.ts`)
- Tabela PBT constante (6–16+ jogadores)
- `calcTournamentPoints`, `calcCashGamePoints`
- `getRankingMetric(seasonYear)` → retorna 'points' ou 'profit'

### Página Ranking
- Cards admin no topo: "Atualização do Ranking" + "Zona de Perigo" + **"Solicitações de Vínculo Pendentes"** (com lista)
- Tabs temporada + filtros (Geral/Cash Game/Torneios) + botão Relatório
- Pódio top 3 (centro elevado dourado)
- Lista completa com RankMovementBadge
- **Para cada jogador temporário**: badge "Temporário" + botão **"Solicitar Vínculo"** (se logado) ou **"Vincular"** (se admin, abre dialog com busca de users)

### Edge function `update-ranking`
- Valida admin
- Salva prev_rank → apaga → recalcula agrupando por player_ref (user_id ou temp_player_id) → recria → atualiza current_rank em profiles

### Edge function `approve-link-request`
- Valida admin
- Migra todas `game_participations` do temp_player_id para user_id real
- Apaga `temporary_player`
- Atualiza `link_request` para approved
- Chama recálculo de ranking

---

## FASE 4 — Dashboard + Perfil + Estatísticas + Relatórios

### Dashboard (vertical mobile-first, conforme ref)
1. Card boas-vindas (avatar + nome + nível/XP · ranking direita)
2. Grid 2x2 stats
3. Card Top 5 (pódio horizontal + lista 4º-5º)
4. Card Partidas Recentes
5. Card Sprints (navegação prev/next + lista numerada)
6. Card Progresso de Nível (círculo grande + barra)
7. Card Conquistas X/6

Deslogado: top 5 + welcome com CTA de login

### Página Perfil
- Card cabeçalho + 4 stat cards coloridos + Histórico de Partidas
- Modo edição: nickname/telefone/gênero + Gerar Avatar IA

### Página Estatísticas (só admin)
- Seletor temporada + tabela ordenável
- Colunas: #, Jogador, Partidas, KOs, Entradas, Lucro Total (verde/vermelho), Média Pts/Etapa (só 2026+)

### Relatórios Canvas (`src/lib/reports.ts`)
- `GameReportGenerator` + `RankingReportGenerator` → JPEG dark/dourado
- Para 2026+ mostra pts, para legado mostra R$

### Edge function `generate-avatar`
- Lovable AI (`google/gemini-2.5-flash-image`) por gênero

---

## Detalhes técnicos

- **Conquistas fixas (6)**: Primeira Vitória, 5 Partidas, 10 Partidas, Lucrativo, Grande Vencedor (R$100+), Veterano (25 partidas)
- **Sprints**: blocos de 5 partidas ordenadas por data `Math.floor(index/5)`
- **Validação Zod** em todos os forms
- **Constraint crítica** em `game_participations`: CHECK `(user_id IS NOT NULL) <> (temp_player_id IS NOT NULL)` (XOR)

---

## Próximo passo

Começo pela **Fase 1** (design + layout + stubs mockados) para você validar o visual antes de ativar o backend. Confirma que posso iniciar?

