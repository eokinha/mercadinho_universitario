# Circular

**Circular** — marketplace universitário onde alunos compram e trocam itens com colegas do próprio campus.
(Nome anterior: Mercadinho Universitário.)

## Stack

- Next.js com **Page Router** (sem App Router)
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)

### Deploy (Vercel)

No painel do projeto: **Settings → Environment Variables** defina, para cada ambiente
em que a build roda (Production, Preview, Development):

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto (ex.: `https://xxxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — ou, na ausência, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

E-mails do Supabase Auth (recuperação de senha, confirmação) saem pelo SMTP do Resend,
configurado no painel do Supabase (Authentication → SMTP), não pelo código.
Remetente `nao-responda@eokinha.com.br`; templates versionados em `db/emails/` (colar no painel ao alterar).

O cliente em `src/lib/supabase.ts` só valida e cria o cliente no **primeiro uso**;
assim a build não quebra na importação do módulo, mas a aplicação exige as variáveis
acima em runtime e, se a build executar `getServerSideProps` com essas chaves, também
no ambiente de build. Sem isso, páginas que consultam o Supabase falham ao acessar.

---

## Estrutura de pastas

```
src/
├── middleware.ts         # Sessão Supabase + proteção de /minha-loja e /admin (admin exige is_admin)
├── pages/
│   ├── _app.tsx          # Layout global (Navbar + Footer)
│   ├── index.tsx         # Home (hero + impulsionados)
│   ├── listagem.tsx      # Listagem completa de produtos com filtros
│   ├── login.tsx, cadastro.tsx, esqueci-senha.tsx, redefinir-senha.tsx, confirmar-email.tsx, onboarding.tsx
│   ├── anunciar.tsx      # Criação de anúncio; ?editar=<id> edita um anúncio próprio
│   ├── termos.tsx, privacidade.tsx  # Termos de Uso (itens proibidos) e Política de Privacidade
│   ├── lojas/[slug].tsx  # Perfil público da loja
│   ├── perfil/[id].tsx   # Perfil público do estudante
│   ├── painel/           # Painel do estudante (index, anuncios, favoritos, perfil)
│   ├── minha-loja/       # Rotas antigas: só redirecionam para /painel e /anunciar
│   └── admin/
│       ├── verificacoes.tsx  # Moderação de matrículas (somente admin)
│       ├── lojas.tsx         # Status das lojas e produtos impulsionados (somente admin)
│       ├── imagens.tsx       # Upload de avatar/capa/imagens (somente admin)
│       └── denuncias.tsx     # Fila de denúncias (somente admin)
├── components/           # Navbar, Footer, HeroSection, CardProduto, ModalProduto,
│                         # BotaoContato (WhatsApp via RPC), BotaoDenunciar
│   └── painel/           # PainelEstudante (cabeçalho/visão geral) + SecaoAnuncios, SecaoFavoritos, SecaoPerfil
├── lib/
│   ├── supabase.ts       # Clientes Supabase (browser e servidor via @supabase/ssr)
│   ├── queries.ts        # Funções de fetch e RPCs
│   ├── painel-data.ts    # getServerSideProps compartilhado do painel
│   ├── painel-routes.ts  # Rotas/abas do painel
│   ├── storage.ts        # Helpers de upload para Supabase Storage
│   ├── contato.ts        # Link/formatação do WhatsApp
│   ├── anuncios.ts       # Validade (60 dias), modalidade e descrição de troca do anúncio
│   └── validacoes.ts     # CPF, telefone, e-mail acadêmico
└── types/
    └── index.ts          # Interfaces TypeScript
db/
├── setup_completo.sql    # Setup histórico (rodar antes das migrações; não editar)
└── migrations/           # Migrações numeradas
```

---

## Banco de dados (Supabase)

```
instituicoes   — id, nome, cnpj (opcional), dominios (text[] — domínios de e-mail da instituição, ex.: {ufmg.br})
usuarios       — id, auth_id (uuid → auth.users), nome, sobrenome, email, password (legado, não usar), telefone, cpf, matricula,
                 matricula_validada (bool), matricula_status (pendente|verificado|rejeitado), instituicoes_id,
                 status (ativo|bloqueado), is_admin (bool), criado_em, termos_aceitos_em
lojas          — id, usuario_id (UNIQUE), nome, descricao, contato, status (pendente|ativo|pausado|reprovado), criado_em, avatar_url, capa_url,
                 slug, instagram_url, tiktok_url, whatsapp, locais_entrega (text[])
produtos       — id, loja_id, nome, descricao, preco (numeric), imagem_url, status (ativo|pausado|vendido), criado_em, categoria_id,
                 destaque (bool — impulsionado na home, só admin), aceita_troca (bool), renovado_em, vendido_em
categorias     — id, nome, parent_id (2 níveis), icone
favoritos      — id (uuid), usuario_id, produto_id, criado_em
interesses     — id, loja_id, produto_id, usuario_id, criado_em (clique em "Tenho interesse"; só via RPC)
denuncias      — id, denunciante_id, loja_id, produto_id, alvo_descricao, motivo, detalhes, status (aberta|resolvida|descartada),
                 criado_em (só via RPC)
```

Relações:
- `usuarios.instituicoes_id → instituicoes.id`
- `lojas.usuario_id → usuarios.id` (1:1)
- `produtos.loja_id → lojas.id`
- `produtos.categoria_id → categorias.id`

Storage (buckets públicos; caminho relativo ao bucket):
- `lojas` — `{lojaId}/avatar.{ext}` e `{lojaId}/capa.{ext}`
- `produtos` — `{produtoId}/imagem.{ext}`
- Escrita: dono da loja/produto ou admin; só JPG/PNG/WebP de até 3 MB (limite no bucket)
- Apagar produto: remover a imagem antes (`removerImagensProduto`), pois a política exige que o produto exista

### Migrações

Aplicadas no projeto de dev, nesta ordem: `setup_completo.sql` (histórico), `00` (alinha banco legado),
`01`, `009`, `02`, `04`, `05` … `17`. Toda mudança de schema vira um arquivo novo em `db/migrations/`.
A `16` (regras do MVP) está documentada em `docs/auditoria-mvp.md`.

### Segurança (RLS e triggers)

- **Colunas pessoais** (`email`, `cpf`, `telefone`, `matricula`, `password`) não são
  legíveis via `select` pela API. Logado lê de `usuarios` só colunas públicas
  (`id, auth_id, nome, sobrenome, instituicoes_id, matricula_status, matricula_validada, status, is_admin, criado_em`);
  visitante (`anon`) não lê `auth_id`, `status` nem `is_admin`. Linhas: a própria ou de quem tem anúncio ativo (`usuario_publico()`).
- **Telefone da loja** (`lojas.contato`, `lojas.whatsapp`) não é legível por `select` (nem pelo dono).
  Dono lê pela RPC `minha_loja()`; comprador logado pela RPC `contato_vendedor()`. Não incluir essas colunas em selects.
- Para filtrar o próprio usuário use `auth_id` (nunca `email`).
- Políticas usam os helpers `meu_usuario_id()`, `usuario_publico()` e `is_admin()`
  (SECURITY DEFINER) — não referenciar `usuarios` ↔ `lojas` direto em políticas (causa recursão).
  Políticas que usam `meu_usuario_id()`/`is_admin()` são `TO authenticated` (`anon` não executa esses helpers).
- Dono da loja só tem `SELECT`/`UPDATE` na própria loja; a loja nasce só no trigger de signup.
- Catálogo (RLS): produto `ativo`, loja `ativo` e `renovado_em` nos últimos 60 dias
  (espelho: `DIAS_VALIDADE_ANUNCIO` em `src/lib/anuncios.ts` — mudar os dois juntos). Queries de catálogo filtram isso explicitamente.
- Triggers:
  - `handle_new_user` (signup): cria `usuarios` + loja `ativo` (slug `aluno-{id}`) e grava `termos_aceitos_em`;
    se já existe linha com o e-mail, só vincula `auth_id`
  - `proteger_colunas_usuarios`: usuário não altera `is_admin`, `auth_id`, `email`, `status`, `termos_aceitos_em`,
    nem se marca como verificado (só pode voltar `matricula_status` para `pendente`); verificado não muda `instituicoes_id` nem `matricula`
  - `pausar_anuncios_sem_verificacao`: perder `matricula_validada` pausa os anúncios ativos
  - `proteger_status_loja`: dono só alterna `ativo ↔ pausado`, não muda `slug`/`usuario_id`, não apaga o WhatsApp com anúncio ativo
  - `exigir_vendedor_verificado`: publicar/reativar exige verificado, conta `ativo` e WhatsApp na loja; vendedor não altera `destaque`;
    grava `renovado_em` (insert, reativação ou renovação) e `vendido_em`
- RPCs (SECURITY DEFINER), expostas em `queries.ts`:
  - `meu_usuario()` → `getMeuUsuario` (dados completos do usuário logado); `minha_loja()` → `getMinhaLoja`
  - `verificar_matricula_por_email(p_matricula)` → `verificarMatriculaInstantanea`
    (usa o e-mail confirmado do Auth; a instituição vem de `instituicao_por_email()`, que casa o domínio com `instituicoes.dominios`.
    `validarEmailUniversitario` no cliente filtra o cadastro: ao cadastrar instituição com domínio fora de `.edu`/`.edu.br`,
    incluir o domínio em `DOMINIOS_ACADEMICOS`, senão o aluno não consegue nem criar a conta)
  - `contato_vendedor(p_loja_id, p_produto_id)` → `getContatoVendedor` (exige login; registra em `interesses`)
  - `denunciar(...)` → `denunciar` (exige login; máx. 10 por dia) · `excluir_minha_conta()` → `excluirMinhaConta`
  - `admin_listar_usuarios()` / `admin_moderar_matricula(p_usuario_id, p_status)` / `admin_definir_status_usuario(p_usuario_id, p_status)`
  - `admin_listar_lojas()` / `admin_moderar_loja(p_loja_id, p_status)` / `admin_definir_destaque(p_produto_id, p_destaque)`
  - `admin_listar_denuncias()` / `admin_resolver_denuncia(p_denuncia_id, p_status)` — todas as `admin_*` exigem `is_admin()`
- Mudanças de verificação/admin sempre via RPC no banco, nunca por `update` no cliente.
- Admin é definido manualmente: `UPDATE usuarios SET is_admin = true WHERE email = '…';`
- Modos `?preview=1` / `?demo=1` (dados de exemplo) só funcionam com `NODE_ENV=development`.
- Cookies de sessão: clientes de servidor usam `getAll`/`setAll` do `@supabase/ssr`
  (não reescrever com `get`/`set`/`remove`).

### Ambiente de dev

- Carga fria: `db/seed/carga_fria.sql` (5 alunos de teste com anúncios realistas). Fotos dos anúncios são CC0/domínio público do Openverse, enviadas ao Storage; créditos em `db/seed/creditos_imagens.json`.

- Contas de tester: `*@example.com` (5 vendedores com loja), senha comum definida no seed — só dev.
- Nunca reutilizar essas contas ou senha em produção.

---

## Regras de negócio

### Atores
- **Visitante** — navega pelo catálogo; precisa de login para contatar, favoritar, denunciar ou anunciar
- **Estudante** — usuário cadastrado; ganha uma loja (perfil vendedor) no cadastro
- **Vendedor** — estudante com `matricula_validada = true`, conta `ativo` e WhatsApp no perfil; pode publicar anúncios
- **Administrador** — valida matrículas, bloqueia alunos, modera lojas e denúncias, define impulsionados e gerencia imagens

### Acesso
- Catálogo (`/listagem`, `/lojas/*`, `/perfil/*`) é público
- `/minha-loja`, `/painel`, `/anunciar` exigem login; `/admin` exige `is_admin`
- Anunciar exige matrícula validada (checado na página e no banco)
- Cadastro exige aceitar Termos de Uso e Política de Privacidade; o aluno pode excluir a conta no painel (Perfil)
- Matrícula verificada automaticamente só se o domínio do e-mail confirmado estiver em `instituicoes.dominios`
  (a instituição vem do domínio); senão, verificação manual pelo admin
- Listagem abre filtrada no campus do aluno logado (`?instituicao=todas` mostra todos)

### Lojas
- **Uma loja por estudante** (`lojas.usuario_id` UNIQUE) — funciona como perfil de vendedor
- Criada automaticamente no cadastro com `status = 'ativo'`; o aluno não cria nem apaga loja
- Status possíveis: `pendente | ativo | pausado | reprovado`; só `ativo` aparece no catálogo
- Vendedor alterna entre `ativo` e `pausado`; reprovar/reativar é do admin
- Bloquear aluno (admin) reprova a loja e pausa os anúncios; desbloquear deixa a loja `pausado`

### Produtos
- Apenas o dono da loja (ou admin) gerencia seus produtos
- Status: `ativo | pausado | vendido`; aparece no catálogo só se produto **e** loja estiverem `ativo`
  e o anúncio foi renovado nos últimos 60 dias (reativar ou editar também renova)
- Preço > 0 para venda; anúncio só de troca pode ter preço 0 (`aceita_troca = true`) — `CHECK` no banco
- Perder a verificação ou ser bloqueado pausa os anúncios ativos
- Qualquer aluno logado pode denunciar anúncio ou perfil; o admin trata em `/admin/denuncias`
- `destaque` = impulsionado na home, definido só pelo admin
- Imagem via upload (Supabase Storage)

### Compra
- Plataforma apenas conecta comprador e vendedor
- Canal único: **WhatsApp** (`https://wa.me/{telefone}`), só para logados, via `BotaoContato`
  (cada clique vira um registro em `interesses`, a métrica de interesse do MVP)
- `lojas.contato` armazena apenas dígitos do telefone (DDI + DDD + número);
  use os helpers de `src/lib/contato.ts` para gerar link e formatar
- Sem carrinho, pedido ou pagamento interno

### Fora do escopo desta versão
- Pagamento interno, chat, notificações por email

---

## Regras de desenvolvimento

### Geral
- Não instalar novas dependências sem perguntar
- Não criar abstrações desnecessárias — código simples e direto
- Não usar Context API, Zustand, Redux ou qualquer gerenciador de estado global
- Não usar axios — cliente Supabase ou fetch nativo
- Não usar bibliotecas de componentes (shadcn, radix, MUI, etc.); ícones só de `lucide-react`
- Sempre tipar com as interfaces de `src/types/index.ts`

### Fetch de dados
- Dados iniciais sempre via `getServerSideProps` nas pages — nunca `useEffect` para isso
- Pages não chamam o Supabase diretamente para dados — usar funções de `src/lib/queries.ts`
  (exceção: `supabase.auth.*` em login, cadastro e recuperação de senha)
- Sempre tratar erros com `if (error) throw error`

### Testes
- `npm test` roda `node --test` em `src/lib/__tests__/*.test.ts` (sem dependências extras)
- Funções puras de `src/lib` (validações, formatação) devem ter teste; imports nos testes usam extensão `.ts`

### Componentes
- Props sempre tipadas com `interface Props`
- Exportação sempre `export default function NomeComponente`
- Componentes recebem dados via props — não fazem fetch
  (exceção: `Navbar`, layout global que reage a login/logout; usa `getResumoUsuarioNavbar` no cliente)
- Mutações disparadas por eventos (salvar, pausar, favoritar) chamam funções de `queries.ts`/`storage.ts`

---

## Design system — Circular

Antes de criar ou alterar qualquer UI, leia `DESIGN_SYSTEM.md`. Use apenas os tokens do `@theme`
em `src/styles/globals.css`; não use hex soltos nem as cores padrão do Tailwind.

- Marca: **Circular** · slogan "Deixa Circular." · logo via `src/components/Logo.tsx`
- Ícones: `lucide-react` (stroke 1.75, 16–20px); **sem emojis na interface**
- Uma ação principal por tela em `bg-acao`; demais botões no padrão secundário
- Selo de verificado: `src/components/SeloVerificado.tsx`
- Ícone de categoria: `iconeParaCategoria` em `src/lib/icones-categoria.ts` (a coluna `categorias.icone` guarda emoji e não é exibida)
- Todas as lojas seguem a identidade do site (não há cor por loja)
