1. Visão Geral do Projeto
O objetivo é construir uma plataforma web modular, composta por vários "sistemas" independentes, cada um acessível através de uma página dedicada. A plataforma será protegida por um sistema de autenticação central. O desenvolvimento será focado em construir, testar e finalizar um sistema de cada vez.
Sistemas Planejados:
Sistema de Autenticação e Acesso
Sistema de Gestão de Gastos
Sistema "Cofre" de Segredos (para Ferramentas e APIs)
Sistema de Painel de Analytics
Sistema de E-mail (a ser desenvolvido por último, dada a complexidade)
2. Stack de Tecnologia (Inalterada)
A stack escolhida é ideal para esta abordagem modular.
Camada	Tecnologia	Provedor / Hospedagem	Motivo para a Escolha Modular
Frontend	React (com Vite)	Vercel (ou similar)	O roteamento baseado em componentes do React Router permite que cada "sistema" seja uma rota separada, criando uma página distinta.
UI/Estilo	Shadcn/ui + Tailwind CSS	-	Permite criar componentes reutilizáveis que podem ser usados em todos os sistemas, mantendo a consistência visual.
Backend & DB	Supabase (PostgreSQL, Auth, etc.)	Supabase Cloud	Centraliza todos os dados e a lógica de backend, permitindo que cada sistema frontend se conecte a uma única fonte de verdade.
3. Estrutura de Pastas e Roteamento
Sua estrutura de pastas em `src/pages/` refletirá diretamente os sistemas que você quer construir, utilizando `react-router-dom` para o roteamento:
```
Code
src/
├── pages/
│   ├── Index.tsx           # Página inicial do dashboard
│   ├── Analytics.tsx       # <-- Sistema de Painel de Analytics
│   ├── Cofre.tsx           # <-- Sistema "Cofre" (Ferramentas e APIs)
│   ├── Email.tsx           # <-- Sistema de E-mail
│   ├── Gastos.tsx          # <-- Sistema de Gestão de Gastos
│   └── NotFound.tsx        # Página para rotas não encontradas
├── components/
│   └── layout/
│       └── AppLayout.tsx   # Layout principal com menu lateral
└── App.tsx                 # Configuração das rotas principais
```
4. Desenvolvimento Guiado por "Sistemas" (Plano de Ação)
Este é o plano para você seguir, focando em um sistema de cada vez.
Sistema 1: Autenticação e Estrutura Global (A Base de Tudo)
Objetivo: Garantir que apenas usuários autorizados possam acessar a plataforma. Criar a "casca" da aplicação.
Ações no Supabase:
Configurar a Autenticação por E-mail/Senha.
Ações no React (com Vite):
Criar a página de login (ex: `src/pages/Login.tsx`).
Criar o layout principal do dashboard: `src/components/layout/AppLayout.tsx`. Este layout terá o menu de navegação lateral que levará aos outros sistemas.
Proteger as rotas: Implementar a lógica de proteção de rotas usando `react-router-dom` (ex: usando um componente `ProtectedRoute` ou hooks de autenticação).
Critério de Conclusão: O usuário consegue se cadastrar, fazer login, ser redirecionado para o dashboard e ver o layout principal com o menu. O logout funciona.
Sistema 2: Gestão de Gastos (O Primeiro Módulo Funcional)
Objetivo: Construir a funcionalidade completa de CRUD (Criar, Ler, Atualizar, Deletar) para as despesas.
Ações no Supabase:
Criar a tabela `gastos` com as colunas necessárias e a chave estrangeira `user_id`.
Ativar e configurar a Row Level Security (RLS) para garantir que um usuário só veja e manipule seus próprios gastos.
Ações no React (com Vite):
A página do sistema já existe: `src/pages/Gastos.tsx`.
Dentro desta página, montar a interface completa: um formulário para adicionar novos gastos e uma tabela para listar os existentes.
Implementar as chamadas ao Supabase (select, insert, update, delete) para interagir com a tabela `gastos`.
Critério de Conclusão: O usuário consegue adicionar, visualizar, editar e remover suas próprias despesas. Ele não consegue ver as despesas de outros usuários.
Sistema 3: Cofre de Segredos (Ferramentas e APIs)
Objetivo: Construir um local seguro para armazenar credenciais, combinando os requisitos de "Ferramentas" e "APIs".
Ações no Supabase:
Criar a tabela `segredos` com colunas para nome, tipo (SENHA ou API_KEY), valor_criptografado, etc.
Configurar a RLS rigorosa.
Desenvolver e implantar as Edge Functions `encrypt-secret` e `decrypt-secret` para lidar com a criptografia.
Ações no React (com Vite):
A página do sistema já existe: `src/pages/Cofre.tsx`.
Desenvolver a interface para adicionar, listar e revelar segredos.
Garantir que as chamadas da interface usem as Edge Functions para criptografar/descriptografar, nunca manipulando dados sensíveis em texto plano no frontend.
Critério de Conclusão: O usuário pode salvar uma nova senha ou chave de API. O valor é armazenado de forma criptografada e só pode ser revelado através de uma ação explícita (clique no botão "Revelar").
Sistema 4: Painel de Analytics (A Integração Externa)
Objetivo: Integrar-se com APIs do Google e exibir os dados de forma eficiente.
Ações no Supabase:
Criar as tabelas para armazenar os dados de analytics (ex: `analytics_diario`).
Criar e agendar a Edge Function (Cron Job) `fetch-google-analytics-data` para buscar os dados periodicamente.
Ações no React (com Vite):
A página do sistema já existe: `src/pages/Analytics.tsx`.
Construir os componentes de visualização (gráficos, cards de KPIs).
A página deve apenas ler os dados já processados e armazenados nas tabelas do Supabase, garantindo um carregamento rápido.
Critério de Conclusão: O usuário acessa a página de analytics e vê os dados mais recentes do Google Analytics e Search Console sem um tempo de carregamento longo.
5. Como Usar Este Guia com uma IA
Seja explícito sobre o sistema em que está trabalhando.
Exemplo de Prompt Ruim: "Crie a parte de gastos."
Exemplo de Prompt Bom: "Estou construindo o 'Sistema de Gestão de Gastos' da minha plataforma. O frontend é em React com Vite e `react-router-dom`. Crie o código para a página localizada em `src/pages/Gastos.tsx`. Esta página deve buscar dados da tabela 'gastos' do Supabase e exibi-los em uma tabela feita com componentes Shadcn/ui. Lembre-se que a RLS já está ativa."
Essa abordagem modular e focada ("um sistema de cada vez") é extremamente eficaz para evitar sobrecarga e garantir que cada parte da sua plataforma seja robusta e bem testada antes de você passar para a próxima.