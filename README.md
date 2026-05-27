# HIGAME 🎮

> Plataforma de Gamificação Corporativa para equipes de atendimento/suporte.

[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](https://render.com)
[![Powered by Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase)](https://supabase.com)

---

## Sobre o Projeto

O **HIGAME** transforma KPIs operacionais em um sistema gamificado competitivo e motivador.

- **XP e Níveis** — colaboradores acumulam XP baseado em desempenho
- **Temporadas mensais** — cada mês é uma nova temporada com rankings próprios
- **KPIs dinâmicos** — configure TME, NPS, Absenteísmo, Atendimentos e muito mais
- **Snapshots imutáveis** — histórico preservado ao encerrar temporadas
- **Painel Admin** — configure KPIs, insira resultados e gerencie colaboradores
- **Mobile-first** — funciona perfeitamente em qualquer dispositivo

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript 6 |
| Estilos | TailwindCSS v3 |
| Banco | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Animações | Framer Motion |
| Gráficos | Recharts |
| Deploy | Render (Static Site) |

---

## Início Rápido

### 1. Clone e instale

```bash
git clone https://github.com/Jeferson-Brito/higame.git
cd higame
npm install
```

### 2. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No **SQL Editor**, execute em ordem:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_rls_policies.sql`
   - `database/migrations/003_gamification.sql`
   - `database/migrations/004_security_and_gamification_rls.sql`
   - `database/seed.sql`

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Rode localmente

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

---

## Criar o Primeiro Usuário Admin

1. No Supabase → **Authentication → Users** → **Add User**
2. Preencha email e senha
3. No **SQL Editor**, execute:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'UUID-DO-USUARIO-AQUI';
```

4. Faça login com as credenciais criadas

---

## Fluxo de Uso

```
1. Admin cria temporada (ex: Junho 2026)
2. Admin configura KPIs e faixas (Ouro/Prata/Bronze)
3. Admin cadastra colaboradores
4. Admin insira resultados mensais
5. Sistema calcula tiers, XP e ranking automaticamente
6. Colaboradores acessam o dashboard e veem seu desempenho
7. Ao encerrar: snapshot imutável é gerado para histórico
```

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── layout/       # Sidebar, Navbar, BottomNav, AppLayout
│   ├── ui/           # GlassCard, TierBadge, Skeleton, Modal...
│   ├── KPICard.tsx
│   └── XPProgressBar.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── supabase.ts
│   ├── ranking.ts
│   └── utils.ts
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Ranking.tsx
│   ├── Seasons.tsx
│   ├── Profile.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── Employees.tsx
│       ├── Seasons.tsx
│       ├── KPIs.tsx
│       ├── Results.tsx
│       └── AdminRanking.tsx
└── types/index.ts
database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_gamification.sql
│   └── 004_security_and_gamification_rls.sql
└── seed.sql
```

---

## Deploy no Render

### Frontend (Static Site)

1. Acesse [render.com](https://render.com) → **New Static Site**
2. Conecte o repositório `Jeferson-Brito/higame`
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em **Deploy**

### Redirect SPA (obrigatório)

O arquivo `public/_redirects` já está incluído no projeto:
```
/*    /index.html   200
```

---

## Sistema de XP

| Tier | XP Base |
|------|---------|
| Ouro | 100 XP |
| Prata | 70 XP |
| Bronze | 40 XP |
| Fora da meta | 0 XP |

**Multiplicadores:**
- Todos os KPIs Ouro: +50%
- Evolução vs. mês anterior: +20%

**Nível:** 1.000 XP por nível

---

## Licença

Propriedade de **HIGAME**. Todos os direitos reservados.
