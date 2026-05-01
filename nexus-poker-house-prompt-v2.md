# PROMPT MASTER — Plataforma de Torneios de Poker (estilo "Nexus Poker House")

> Construa um aplicativo web **completo, responsivo e production-ready** para gerenciar uma liga de **torneios de poker** (sem cash games), com ranking por pontuação oficial, perfis de jogadores, sistema de XP/conquistas, vínculo de jogadores temporários e relatórios visuais. Use **React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui** no frontend e **Lovable Cloud (Supabase)** no backend (Postgres + Auth + Storage + Edge Functions + Lovable AI Gateway).

---

## 1. IDENTIDADE VISUAL

### 1.1 Marca
- Nome: **Nexus Poker House** (use placeholder editável)
- Logo: círculo dourado com a letra **N** estilizada (gere via IA ou use SVG simples) — **48x48px** com borda dourada `#d4af37` e leve glow.
- Subtítulo no header: *"Liga de Torneios"*

### 1.2 Tema (luxo dark + dourado)
Defina TODOS os tokens em `src/index.css` (HSL puro, sem `hsl()` no valor) e mapeie em `tailwind.config.ts`:

```css
:root {
  --background: 0 0% 4%;            /* #0a0a0a */
  --background-mid: 0 0% 6%;         /* #0f0f0f */
  --background-soft: 0 0% 10%;       /* #1a1a1a */
  --foreground: 0 0% 98%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 98%;
  --primary: 46 65% 52%;             /* dourado #d4af37 */
  --primary-glow: 46 87% 60%;        /* dourado claro #f4d03f */
  --primary-foreground: 0 0% 8%;
  --secondary: 0 0% 14%;
  --muted: 0 0% 18%;
  --muted-foreground: 0 0% 65%;
  --accent: 46 65% 52%;
  --border: 46 50% 25% / 0.15;       /* dourado translúcido */
  --success: 142 70% 45%;
  --danger: 0 75% 55%;
  --info: 210 80% 55%;
  --tournament: 25 90% 55%;          /* laranja torneio */
  --gradient-bg: linear-gradient(180deg, hsl(0 0% 4%) 0%, hsl(0 0% 6%) 50%, hsl(0 0% 10%) 100%);
  --gradient-gold: linear-gradient(135deg, hsl(46 65% 52%), hsl(46 87% 60%));
  --shadow-gold: 0 8px 24px -8px hsl(46 65% 52% / 0.35);
  --shadow-card: 0 4px 20px -4px hsl(0 0% 0% / 0.6);
  --radius: 0.75rem;
}
```

Classes utilitárias custom (em `@layer components`):
- `.nexus-card` → fundo `--card`, borda `--border`, `rounded-xl`, `shadow-card`, `backdrop-blur-sm`
- `.nexus-text-gold` → `bg-gradient-gold` + `bg-clip-text text-transparent font-bold`
- `.nexus-gold-gradient` → `background: var(--gradient-gold)`
- `.glass-effect` → `backdrop-blur-md bg-card/60 border border-border`
- `.nexus-hover-gold` → transição 200ms; on hover: borda dourada + leve translateY(-2px) + shadow-gold
- `.nexus-chip` → pill compacto (px-2 py-0.5 text-xs rounded-full font-medium)

### 1.3 Tipografia
- Fonte: **Inter** (Google Fonts) em todo o app, pesos 400/500/600/700/800.

---

## 2. LAYOUT GERAL

### 2.1 Desktop (≥768px)
- **Header fixo** no topo (sticky, `glass-effect`, h-16):
  - Esquerda: logo dourado 48x48 + "Nexus Poker House" / *Liga de Torneios* (texto pequeno cinza abaixo)
  - Centro/direita: links — **Dashboard, Partidas, Ranking, Perfil** (logado), **Estatísticas** + **Vínculos Pendentes** (admin), **Login/Sair**
  - Link ativo: texto dourado + sublinhado dourado animado
  - Avatar do usuário ao lado do botão Sair
- Container principal: `max-w-6xl mx-auto px-4 py-6`

### 2.2 Mobile (<768px)
- **Header escondível ao rolar para baixo**, reaparece ao rolar para cima (transform translateY).
- Conteúdo do header mobile: apenas logo + nome compacto.
- **FAB dourado fixo** no canto inferior direito (`bottom-6 right-4`, círculo 56px, gradient gold, ícone Menu) → abre **Drawer/Sheet** lateral com toda a navegação + avatar/email + botão Sair.
- Padding inferior do conteúdo: `pb-24` para não ficar atrás do FAB.

---

## 3. ROTAS

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | Público | Dashboard |
| `/partidas` | Público (CRUD: admin) | Lista de torneios |
| `/ranking` | Público | Ranking da temporada |
| `/perfil` | Logado | Perfil próprio |
| `/estatisticas` | Admin | Tabela analítica |
| `/vinculos` | Admin | Solicitações de vínculo pendentes |
| `/auth` | Público | Login/cadastro (email+senha + Google) |
| `/complete-profile` | Logado, perfil incompleto | Wizard pós-cadastro |
| `*` | — | NotFound |

---

## 4. BACKEND (Lovable Cloud)

### 4.1 Tabelas (todas com RLS habilitada)

**`profiles`** (1:1 com `auth.users`)
- `id` UUID PK FK auth.users, `nickname` TEXT UNIQUE, `full_name` TEXT, `phone` TEXT, `gender` TEXT ('male'|'female'|'other'), `avatar_url` TEXT, `level` INT default 1, `xp` INT default 0, `current_rank` INT, `profile_completed` BOOL default false, `achievements` TEXT[], `created_at`, `updated_at`

**`user_roles`** (separada — nunca em profiles!)
- `id`, `user_id` FK auth.users, `role` app_role ('admin'|'user'), UNIQUE(user_id, role)
- Enum: `CREATE TYPE app_role AS ENUM ('admin','user');`

**`temporary_players`**
- `id`, `nickname` TEXT NOT NULL, `full_name` TEXT, `gender` TEXT, `avatar_url` TEXT, `created_by` UUID, `created_at`

**`games`** (somente torneios)
- `id`, `name` TEXT, `date` TIMESTAMPTZ, `season_year` INT, `buy_in` NUMERIC, `rebuy_value` NUMERIC, `status` TEXT ('scheduled'|'finished'), `total_pot` NUMERIC default 0, `house_fee` NUMERIC default 0, `description` TEXT, `created_by` UUID, `created_at`, `updated_at`
- **Não há campo `type`** — todo jogo é torneio.

**`game_participations`**
- `id`, `game_id` FK games ON DELETE CASCADE
- `user_id` UUID nullable, `temp_player_id` UUID nullable
- **CHECK constraint XOR**: `((user_id IS NOT NULL)::int + (temp_player_id IS NOT NULL)::int) = 1`
- `player_name` TEXT, `player_nickname` TEXT (snapshot na hora da partida)
- `entries` INT default 1, `rebuys` INT default 0
- `total_invested` NUMERIC, `final_amount` NUMERIC default 0, `profit_loss` NUMERIC, `profit_percentage` NUMERIC
- `position` INT, `is_winner` BOOL, `ko_points` INT default 0
- `ranking_points` NUMERIC default 0 (calculado pelo regulamento oficial)

**`link_requests`**
- `id`, `temp_player_id` FK, `user_id` FK, `status` TEXT ('pending'|'approved'|'rejected'), `requested_at`, `resolved_at`, `resolved_by`

**`public_rankings`** (cache materializado, regerado a cada cálculo)
- `id`, `season_year` INT, `player_type` TEXT ('user'|'temp'), `player_ref_id` UUID, `nickname`, `full_name`, `avatar_url`, `position` INT, `prev_position` INT, `total_points` NUMERIC, `total_profit` NUMERIC, `games_played` INT, `wins` INT, `kos` INT, `avg_points` NUMERIC

### 4.2 Function `has_role` (SECURITY DEFINER)
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
```

### 4.3 Trigger `handle_new_user` cria profile + role 'user' automaticamente.

### 4.4 Políticas RLS (resumo)
- `games`, `game_participations`, `public_rankings`, `temporary_players` → **SELECT público**; INSERT/UPDATE/DELETE só admin (`has_role(auth.uid(),'admin')`).
- `profiles` → cada user lê/edita o seu; admin lê todos.
- `user_roles` → SELECT pelo próprio user; INSERT/DELETE só admin.
- `link_requests` → user cria/lê as suas; admin lê/atualiza todas.

### 4.5 Storage
- Bucket `avatars` público.

### 4.6 Auth
- Email/senha + Google OAuth.
- Auto-confirm **desativado** (usuário verifica email).
- `onAuthStateChange` ANTES de `getSession`.
- Redirecionamento para `/complete-profile` se `profile_completed=false`.

---

## 5. SISTEMA DE PONTUAÇÃO OFICIAL — TEMPORADA 2026

> **Toda a liga é por pontos. Não existe modo "lucro".** O ranking ordena por `total_points` desc, desempate por `wins` desc, depois `kos` desc.

### 5.1 Tabela Base de Pontuação (PB)
Linhas = colocação (1º a 20º), Colunas = total de jogadores no torneio (6 a 20). Valores ausentes = 0.

```ts
// src/lib/scoring.ts — TABELA OFICIAL
const PB: Record<number, Record<number, number>> = {
  20: {1:100,2:70,3:60,4:50,5:45,6:40,7:35,8:30,9:25,10:22,11:20,12:18,13:16,14:14,15:12,16:10,17:8,18:6,19:4,20:2},
  19: {1:95,2:65,3:55,4:45,5:40,6:35,7:30,8:25,9:20,10:17,11:15,12:13,13:11,14:9,15:7,16:5,17:4,18:3,19:2},
  18: {1:90,2:60,3:50,4:40,5:35,6:30,7:25,8:20,9:17,10:15,11:13,12:11,13:9,14:7,15:5,16:4,17:3,18:2},
  17: {1:85,2:60,3:50,4:40,5:35,6:30,7:25,8:20,9:17,10:15,11:13,12:11,13:9,14:7,15:5,16:4,17:2},
  16: {1:80,2:55,3:45,4:35,5:30,6:25,7:20,8:17,9:15,10:13,11:11,12:9,13:7,14:5,15:4,16:2},
  15: {1:75,2:50,3:40,4:35,5:30,6:25,7:20,8:17,9:15,10:13,11:11,12:9,13:7,14:4,15:2},
  14: {1:70,2:40,3:35,4:30,5:25,6:20,7:17,8:15,9:13,10:11,11:9,12:7,13:4,14:2},
  13: {1:65,2:40,3:30,4:25,5:20,6:17,7:15,8:13,9:11,10:9,11:7,12:4,13:2},
  12: {1:60,2:40,3:30,4:25,5:20,6:17,7:15,8:13,9:11,10:7,11:4,12:2},
  11: {1:55,2:35,3:25,4:20,5:17,6:15,7:13,8:11,9:7,10:4,11:2},
  10: {1:50,2:30,3:25,4:20,5:15,6:13,7:11,8:7,9:4,10:2},
  9:  {1:45,2:25,3:20,4:15,5:13,6:11,7:7,8:4,9:2},
  8:  {1:40,2:25,3:20,4:13,5:11,6:7,7:4,8:2},
  7:  {1:35,2:25,3:20,4:15,5:10,6:8,7:4},
  6:  {1:30,2:20,3:15,4:10,5:8,6:4},
};

export function getBasePoints(totalPlayers:number, position:number):number {
  if (position <= 0) return 0;
  const t = Math.max(6, Math.min(20, totalPlayers));
  return PB[t]?.[position] ?? 0;
}
```

### 5.2 Definição de Ações
**Ações = soma de (entries + rebuys) de TODOS os jogadores do torneio.**

### 5.3 Multiplicador por Faixa de Ações (FM)
```ts
export function getActionMultiplier(totalActions:number):number {
  if (totalActions <= 25) return 1.0;
  if (totalActions <= 35) return 1.2;
  if (totalActions <= 45) return 1.4;
  if (totalActions <= 55) return 1.5;
  if (totalActions <= 69) return 1.6;
  return 2.0; // 70+
}
```

### 5.4 Cálculo final
```ts
export function calcTournamentPoints(totalPlayers:number, position:number, totalActions:number):number {
  const base = getBasePoints(totalPlayers, position);
  const fm = getActionMultiplier(totalActions);
  const raw = base * fm;
  // Arredondamento "para o inteiro mais próximo" descrito no regulamento:
  // 0.1–0.5 → para baixo; 0.6–0.9 → para cima
  const dec = raw - Math.floor(raw);
  return dec >= 0.6 ? Math.ceil(raw) : Math.floor(raw);
}
```

### 5.5 KOs
KOs **não entram na pontuação base** (regulamento atual). Mantenha a coluna `ko_points` no banco para histórico/relatórios e desempate, mas **NÃO some** em `ranking_points`. (Caso o admin queira ativar no futuro, deixe um TODO claro no `scoring.ts`.)

---

## 6. PÁGINAS — DESCRIÇÃO DETALHADA

### 6.1 Dashboard (`/`)
Layout vertical mobile-first. Cards na ordem:

1. **Card de Boas-vindas** (logado): avatar grande + "Olá, {nickname}" + nível/XP à esquerda; ranking atual à direita ("#3 / Temporada 2026"). Deslogado: CTA dourado "Entrar / Cadastrar".
2. **Grid 2x2 de Stats**: Partidas (azul), Vitórias (verde), Pontos Totais (dourado), Posição (roxo).
3. **Card "Top 5 Jogadores"** — pódio horizontal (2º-1º-3º com avatares e medalhas), seguido de lista 4º e 5º. Mobile: avatares menores + nomes em **2 linhas** com `line-clamp-2 break-words` para nunca cortar.
4. **Card "Partidas Recentes"** — últimas 5 com nome, data, badge de status.
5. **Card "Sprints"** — agrupa partidas em blocos de 5 (`Math.floor(idx/5)`); navegação prev/next com setas; mostra rank do usuário no sprint.
6. **Card "Progresso de Nível"** — círculo grande (SVG) mostrando % até próximo nível + barra horizontal.
7. **Card "Conquistas"** — grid 6 ícones com `X/6` no cabeçalho.

### 6.2 Partidas (`/partidas`)
- Tabs de temporada (detectadas dos jogos existentes; default = mais recente).
- Busca por nome + **sem filtros de tipo** (já que tudo é torneio).
- Botão "Nova Partida" (admin) → `CreateGameModal`.
- Cards horizontais clicáveis: nome + badge "Torneio" laranja + status (Agendada/Finalizada) + data + buy-in + rebuy + #jogadores + pote.
- Click → `GameDetailsModal`.

### 6.3 Ranking (`/ranking`)
- **Barra admin no topo** (3 cards lado a lado em desktop, stack em mobile):
  - "Atualização do Ranking" → botão "Recalcular agora" (chama edge function).
  - "Solicitações de Vínculo" → contador + link para `/vinculos`.
  - "Zona de Perigo" → botão vermelho "Resetar Temporada" com dialog de confirmação.
- Tabs de temporada + botão "Gerar Relatório" (JPEG canvas).
- **Pódio top 3** (centro elevado com brilho dourado e medalha).
  - Mobile: avatares 44–48px, nomes em 2 linhas, badge de nível em segunda linha.
- **Lista completa**:
  - Desktop: linha única (posição, avatar, nome, partidas, pontos, vitórias, ações).
  - **Mobile (2 linhas verticais)**:
    - Linha 1: posição + avatar + nome (line-clamp-2)
    - Linha 2 (recuada `pl-12`): "X partidas" à esquerda; à direita: para temporários sem vínculo → **botão "Solicitar Vínculo" ANTES dos pontos**; para users → pontos + chip de movimento (▲/▼).
  - Badge cinza "Temporário" ao lado do nome de jogadores temporários.
  - Admin vê dropdown "Vincular a usuário existente" no temporário.

### 6.4 Perfil (`/perfil`)
- Card cabeçalho: avatar grande + nickname + nome real + nível/XP + botão "Editar".
- 4 stat cards coloridos: Partidas, Vitórias, Pontos Totais, Melhor Posição.
- Histórico de Partidas (lista com pontos ganhos por jogo).
- Modo edição: nickname, telefone, gênero + botão **"Gerar Avatar IA"** (chama edge function `generate-avatar`).

### 6.5 Estatísticas (`/estatisticas`, admin)
- Seletor de temporada.
- Tabela ordenável com colunas: #, Jogador, Partidas, Vitórias, KOs, Total Entradas, **Total Rebuys**, **Total Ações**, **Pontos Totais**, **Média de Pontos/Etapa**.
- (Removidas colunas de R$ lucro do projeto anterior — foco em pontos.)

### 6.6 Vínculos (`/vinculos`, admin)
- Lista de `link_requests` pending com avatares dos dois lados (temp → user) + botões Aprovar/Rejeitar.
- Aprovar chama edge function `approve-link-request`.

---

## 7. MODAIS

### 7.1 `CreateGameModal`
- Campos: Nome, Data+Hora, **Buy-in (R$)**, **Valor do Rebuy (R$)** (default = buy-in), Temporada (default = ano da data, editável), Descrição.
- **Sem seleção de tipo** (sempre torneio).
- **Seleção de Jogadores**: chips removíveis no topo + lista com checkboxes dividida em duas seções: **Usuários** (com avatar e nickname) e **Jogadores Temporários** (com badge cinza). Botão **"+ Criar Jogador Temporário"** abre sub-dialog (nickname obrigatório, nome real opcional, gênero, "Gerar Avatar IA").

### 7.2 `GameDetailsModal`
- Header: nome + status + data.
- 4 stat cards: Buy-in, Pote Total, # Jogadores, Total de Ações (com multiplicador exibido — ex: "32 ações · 1.2x").
- Barra de ações (admin): Adicionar Jogador, Editar Partida, Finalizar Partida, Exportar CSV, **Gerar Relatório** (JPEG).
- Tabela de participantes:
  - Avatar + nickname + nome real + badge "Temporário" se aplicável
  - Inputs editáveis (admin, partida não finalizada): Entradas, Rebuys, Posição final, KOs
  - Colunas calculadas: Investido (R$), Pontos (preview ao vivo conforme regulamento)
- Ao **finalizar**: calcula `total_invested = entries*buy_in + rebuys*rebuy_value` por jogador; `total_pot = soma`; `position` informada; `is_winner = position===1`; `ranking_points = calcTournamentPoints(...)` usando o `totalActions` agregado do torneio. Persiste tudo. Após finalizar, chama edge function `update-ranking`.

### 7.3 `EditProfileDialog`, `TempPlayerDialog`, `AiAvatarDialog`, `PlayerSummaryModal` — análogos.

---

## 8. EDGE FUNCTIONS (Deno, em `supabase/functions/`)

Todas com CORS headers padrão e validação de admin via `has_role`.

### 8.1 `update-ranking`
1. Valida que o caller é admin.
2. Para a temporada solicitada (ou todas):
   - Salva `position` atual em `prev_position` antes de regenerar.
   - DELETE de `public_rankings` da temporada.
   - SELECT agrupado em `game_participations` JOIN `games` por `(user_id OR temp_player_id, season_year)`:
     - SUM(`ranking_points`), SUM(`is_winner::int`) AS wins, SUM(`ko_points`), COUNT(*) AS games_played, AVG(`ranking_points`) AS avg_points.
   - Ordena por `total_points DESC, wins DESC, kos DESC`.
   - Atribui `position` 1..N.
   - INSERT em `public_rankings` com `prev_position` preservado.
3. Atualiza `profiles.current_rank` para users.

### 8.2 `approve-link-request`
1. Valida admin.
2. UPDATE `game_participations` SET `user_id = X, temp_player_id = NULL` WHERE `temp_player_id = Y`.
3. DELETE da `temporary_player`.
4. UPDATE `link_request` para 'approved' + resolved_at/resolved_by.
5. Invoca `update-ranking`.

### 8.3 `generate-avatar`
- Usa **Lovable AI Gateway** (`LOVABLE_API_KEY` já configurado).
- Modelo: `google/gemini-2.5-flash-image-preview` (geração de imagem).
- Prompt baseado em gênero: estilo cartoon/neon dourado, fundo escuro, busto de jogador de poker.
- Salva no bucket `avatars` e retorna URL pública.

### 8.4 `auto-avatar` (opcional)
Trigger pós-cadastro para gerar avatar default se o user não enviar.

---

## 9. SISTEMA DE XP E CONQUISTAS

### 9.1 XP / Nível
- 1 ponto de ranking ganho = 10 XP.
- 1 vitória = +50 XP bônus.
- `level = floor(xp / 1000) + 1`.
- Card de progresso: % até próximo nível.

### 9.2 Conquistas (6 fixas)
1. **Primeira Vitória** — vencer 1 torneio.
2. **5 Partidas** — participar de 5 torneios.
3. **10 Partidas** — participar de 10.
4. **Veterano** — participar de 25.
5. **Pontuador** — atingir 500 pts em uma temporada.
6. **Lendário** — terminar uma temporada em #1.

Trigger: ao finalizar partida ou recalcular ranking, recalcula achievements do user e atualiza `profiles.achievements`.

---

## 10. RELATÓRIOS (Canvas → JPEG)

`src/lib/reports.ts` exporta:
- `GameReportGenerator(game, participations)` → JPEG dark/dourado com cabeçalho do torneio (nome, data, total ações, multiplicador, pote) + tabela de jogadores (#, avatar, nickname, entradas/rebuys, posição, pontos).
- `RankingReportGenerator(season, rows)` → JPEG com pódio + lista numerada + nivel; mostra apenas **vitórias em torneios** e **pontos** (sem KOs no card, conforme decisão anterior).

Ambos usam paleta dourada do tema, fonte Inter via canvas, e disparam download automático.

---

## 11. PADRÕES DE CÓDIGO

- **TypeScript estrito**, sem `any` desnecessário.
- **Zod** para todos os forms (`react-hook-form` + `zodResolver`).
- **Tokens semânticos** em todos os componentes (proibido `text-white`, `bg-black` etc. — usar `text-foreground`, `bg-background`).
- shadcn/ui customizado com variantes próprias (botão `premium` com gradient gold).
- Componentes pequenos e focados em `src/components/`.
- Hooks customizados em `src/hooks/`.
- Helpers em `src/lib/` (`format.ts` com `formatBRL`, `formatDateTime`, `formatPoints`).
- `AuthContext` provê `user`, `profile`, `isAdmin`, `loading`, `signOut`.
- `onAuthStateChange` SEMPRE antes de `getSession` para evitar deadlock.

---

## 12. RESPONSIVIDADE — REGRAS CRÍTICAS

- Breakpoint divisor: `md` (768px) — abaixo é mobile, acima desktop.
- **Nomes de jogadores nunca podem ser truncados com `...`** — usar `line-clamp-2 break-words` em qualquer lugar onde nome aparece (Top 5, pódio, ranking, partidas, modais).
- Pódio mobile: avatares 44–48px; nomes em 2 linhas; badges em segunda linha abaixo do nome.
- Lista de ranking mobile: layout em 2 linhas verticais (descrito em 6.3).
- Header desktop sticky; header mobile esconde-no-scroll-down.
- FAB dourado mobile sempre visível.

---

## 13. ENTREGAS POR FASES (sugestão de execução)

**Fase 1 — Design system + Layout + Stubs**
- Tokens, Tailwind, classes utilitárias.
- Header desktop + Header mobile + FAB Drawer.
- Todas as rotas com páginas stub (dados mockados) para validar visual.

**Fase 2 — Backend + Auth**
- Migrations completas (todas as tabelas + RLS + trigger handle_new_user + função has_role).
- Páginas `/auth` e `/complete-profile`.
- AuthContext + ProtectedRoute / AdminRoute.

**Fase 3 — Partidas + Pontuação + Ranking**
- `scoring.ts` com tabela oficial 2026 + multiplicadores + arredondamento.
- `CreateGameModal`, `GameDetailsModal`, `TempPlayerDialog`, `PlayerSelector`.
- Edge function `update-ranking` + página `/ranking` + página `/vinculos`.

**Fase 4 — Dashboard + Perfil + Estatísticas + Conquistas + Relatórios**
- Cards do dashboard + sprints + progresso de nível.
- Página perfil + edge function `generate-avatar`.
- Página estatísticas (admin).
- `reports.ts` com geração de JPEG.
- Sistema de XP + conquistas.

---

## 14. CHECKLIST DE QUALIDADE FINAL

- [ ] Pontuação calculada exatamente conforme tabela e multiplicadores oficiais
- [ ] Arredondamento: 0.1–0.5 ↓ / 0.6–0.9 ↑
- [ ] Nenhum nome de jogador truncado em mobile (Top 5, pódio, ranking)
- [ ] Header mobile esconde ao rolar para baixo, reaparece ao subir
- [ ] FAB dourado abre drawer com toda a navegação
- [ ] RLS em todas as tabelas; públicas só SELECT
- [ ] `user_roles` em tabela separada com `has_role` SECURITY DEFINER
- [ ] Auth: email/senha + Google; perfil incompleto força `/complete-profile`
- [ ] Jogadores temporários funcionam no ranking com badge cinza
- [ ] Solicitação de vínculo: user solicita, admin aprova/rejeita, migra histórico
- [ ] Edge functions com CORS + verificação de admin
- [ ] Relatórios JPEG com paleta dourada
- [ ] Zero uso de `text-white`/`bg-black` direto — só tokens semânticos
- [ ] Zod em todos os forms

---

**Construa tudo isso de uma vez, em fases, validando o visual com o usuário ao final da Fase 1 antes de ativar o backend.**
