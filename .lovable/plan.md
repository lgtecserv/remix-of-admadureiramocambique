
# Expansão: Sistema Multi-Congregação

Hierarquia: **Super Admin → Congregação (com Pastores) → Departamentos → Líderes → Membros**.

---

## 1. Promover super admins
- Remover o e-mail fixo (`lgtecserv@gmail.com`) das funções `is_super_admin` — passa a ser baseado **somente** na tabela `user_roles`.
- Inserir role `super_admin` para:
  - `lgtecserv@gmail.com`
  - `pastorrobertobueno@gmail.com`
- Super admin **não pertence a nenhuma congregação** (vê tudo).

## 2. Nova tabela `congregations`
Campos: `name`, `address`, `city`, `phone`, `pastor_responsavel_id` (pastor titular), `active`, timestamps.

Tabela de vínculo `congregation_pastors` (N pastores por congregação):
- `congregation_id`, `pastor_id`, `is_titular`, `assigned_at`.

## 3. Adicionar `congregation_id` em todas as tabelas de domínio
`members`, `visitors`, `visitor_followups`, `attendances`, `tithes`, `offerings`, `expenses`, `balance_adjustments`, `church_assets`, `asset_requests`, `user_roles` (para líderes), `conversations`.

### Migração de dados existentes
- Criar congregação **"Sede"** automaticamente.
- Atualizar todos os registros existentes com `congregation_id = Sede`.
- Tornar a coluna `NOT NULL` após o backfill.

## 4. Segurança (RLS)
Nova função `get_user_congregation(uid)` (SECURITY DEFINER) retorna a congregação do usuário (pastor/líder).

Reescrever políticas RLS de todas as tabelas acima:
- **super_admin**: acesso total.
- **pastor**: acesso somente onde `congregation_id` ∈ congregações vinculadas em `congregation_pastors`.
- **leader**: acesso somente da sua congregação + seu departamento.

`user_roles` ganha `congregation_id` (obrigatório para pastor e leader).

Chat:
- `general` vira **por congregação** (uma conversa geral por congregação).
- Trigger `add_leader_to_general_chat` adiciona o usuário só ao geral da sua congregação.
- Super admin entra em todos os gerais.

## 5. Painel Super Admin (`/super-admin`)
Novas seções:
- **Congregações**: lista + criar/editar/desativar. Form com nome, endereço, telefone e seleção de pastor titular.
- **Pastores**: criar pastor já vinculado a uma congregação (edge function `create-pastor` recebe `congregation_id`); transferir pastor entre congregações; adicionar pastores auxiliares.
- **Visão centralizada**: cards por congregação mostrando totais (membros, líderes, departamentos ativos).

## 6. Painel Pastor
- Seletor de congregação no topo (se tiver mais de uma vinculada).
- Todas as queries do dashboard/membros/finanças/patrimônio passam a filtrar pela congregação ativa.

## 7. Painel Líder
- Sem alteração visual; passa a herdar automaticamente a `congregation_id` do seu vínculo em `user_roles`.

## 8. Edge functions
- `create-pastor`: aceita `congregation_id`, valida que solicitante é `super_admin`, insere vínculo em `congregation_pastors`.
- `create-leader`: valida que solicitante é `pastor` da congregação alvo e injeta `congregation_id` no `user_roles`.

## 9. Frontend — pontos de mudança
- `CreateMemberForm`, `CreateVisitorForm`, dialogs de Tesouraria/Patrimônio: injetar `congregation_id` automaticamente a partir do contexto do usuário.
- Novo hook `useCurrentCongregation()` (carrega 1x, cache em contexto).
- Sidebar do super admin ganha item "Congregações".
- Sidebar do pastor mostra o nome da congregação ativa.

---

## Notas técnicas
- A coluna `congregation_id` será adicionada **nullable**, com backfill da "Sede", depois `SET NOT NULL` na mesma migração.
- Todas as políticas RLS antigas serão **dropadas e recriadas** para incluir o filtro de congregação — necessário para o isolamento exigido.
- A função `is_super_admin(email)` é removida; só sobra `is_super_admin(uuid)` baseada em `user_roles`.
- Realtime/`REPLICA IDENTITY FULL` mantidos.
- Index em `congregation_id` em todas as tabelas grandes (members, tithes, offerings, expenses, attendances) para performance.

## Fora de escopo (confirmar se quer depois)
- Relatórios consolidados cross-congregação para super admin (PDF).
- Transferência de membros entre congregações.
- Convite por e-mail para pastor recém-criado.
