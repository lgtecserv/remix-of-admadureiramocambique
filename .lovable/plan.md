## Ajustes solicitados

- O cadastro de secretários é feito **pelo super admin**, não pelo pastor.
- O super admin atual passa a ter perfil de **observador**: visualiza, acompanha, mas **não apaga nem aprova**.
- O secretário passa a ser o **gestor total** do sistema: pode apagar membros, aprovar solicitações e executar as demais ações administrativas.
- Os e-mails abaixo serão promovidos a secretário assim que existirem no sistema (o usuário vai criá-los):
  - `presbiterodino@gmail.com`
  - `diaconojorge@gmail.com`
  - `diaconoedmilson@gmail.com`

---

## Plano revisado

### 1. Corrigir o cadastro de pastores pelo super admin
- Ajustar a função `create-pastor` para validar corretamente o token da sessão e retornar erros claros.
- Garantir vínculo do pastor à congregação selecionada (papel, vínculo de pastor da congregação e atualização do pastor titular quando marcado).
- Limpar formulário de criação de pastor.

### 2. Revisar permissões em telas críticas para evitar o mesmo erro
- Padronizar a validação de papel em funções e telas sensíveis: criação de líderes, atualização de status de membros e gestão de congregações.

### 3. Novo papel: Secretário (criado pelo super admin)
- Adicionar o papel `secretary` no sistema.
- Tela de gestão de secretários disponível **somente para super admin** (no painel atual de administração):
  - listar secretários
  - cadastrar novo secretário (e-mail, senha, nome, congregação opcional)
  - desativar / remover secretário
- Os três e-mails informados serão promovidos a secretário automaticamente assim que existirem como usuários do sistema. Se ainda não existirem, ficam na lista para serem promovidos depois.
- Secretário entra no menu lateral com acesso completo às mesmas áreas do super admin atual.

### 4. Redefinir poderes
- **Super admin (perfil atual)**: somente **visualização e acompanhamento**.
  - Vê tudo (congregações, pastores, membros, finanças, patrimônio, relatórios).
  - **Não** apaga membros.
  - **Não** aprova solicitações.
  - **Não** edita finanças, patrimônio etc.
  - Continua podendo cadastrar congregações, pastores e secretários (gestão estrutural do sistema).
- **Secretário**: gestão total do sistema.
  - Pode apagar membros.
  - Pode aprovar/recusar solicitações (patrimônio, tesouraria etc.).
  - Pode editar e gerir todos os módulos.
  - Atua em todas as congregações.
- **Pastor**: sem alteração nos poderes atuais (gestão dentro da sua congregação, sem apagar membros, sem cadastrar secretário).
- **Líder de departamento**: cadastra e edita membros do próprio departamento. **Não apaga.**

### 5. Novos campos no cadastro de membros
- Adicionar ao formulário de cadastro e edição de membros:
  - **Função na igreja**: campo de texto livre.
  - **Cargo na igreja**: seleção com as opções:
    - Cooperador
    - Diácono
    - Presbítero
    - Pastor
    - Evangelista
    - Missionária/o
- Mostrar os campos onde o membro é visualizado/editado, mantendo layout mobile-first.

### 6. Banco de dados e segurança
- Migração para:
  - adicionar o papel `secretary`
  - adicionar os campos `função na igreja` e `cargo na igreja` em membros
  - reescrever as políticas de acesso para refletir os novos poderes:
    - super admin: somente leitura nos módulos de dados (membros, finanças, patrimônio, solicitações). Mantém criação/gestão de congregações, pastores e secretários.
    - secretário: gestão total (ler, criar, editar, apagar, aprovar) em todos os módulos.
    - pastor: mantém regras atuais.
    - líder: mantém regras atuais, sem apagar membros.
- Garantir isolamento por congregação onde já existia, sem afetar o acesso global do secretário e do super admin.

### 7. Promoção dos três e-mails informados
- Após o usuário criar as contas no sistema, promover esses três usuários para `secretary`.
- Se algum ainda não existir no momento da execução, deixar instrução clara para promover assim que existirem (sem quebrar a migração).

### 8. Validação final
- Testar criação de pastor pelo super admin (resolução do erro 403).
- Testar criação de secretário pelo super admin.
- Testar que super admin **não** consegue apagar membros nem aprovar solicitações.
- Testar que secretário consegue apagar membros e aprovar solicitações em qualquer congregação.
- Testar que líder não consegue apagar membros.
- Testar cadastro/edição de membros com os novos campos.
- Revisar responsividade mobile.