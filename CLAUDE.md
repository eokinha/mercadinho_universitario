# Mercadinho Universitário

Marketplace universitário onde estudantes encontram lojas dentro de instituições de ensino.

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
│   ├── login.tsx, cadastro.tsx, esqueci-senha.tsx, onboarding.tsx
│   ├── anunciar.tsx      # Criação de anúncio
│   ├── lojas/[slug].tsx  # Perfil público da loja
│   ├── perfil/[id].tsx   # Perfil público do estudante
│   ├── painel/           # Painel do estudante (index, anuncios, favoritos, perfil)
│   ├── minha-loja/       # Rotas antigas: só redirecionam para /painel e /anunciar
│   └── admin/
│       ├── verificacoes.tsx  # Moderação de matrículas (somente admin)
│       ├── lojas.tsx         # Status das lojas e produtos impulsionados (somente admin)
│       └── imagens.tsx       # Upload de avatar/capa/imagens (somente admin)
├── components/           # Navbar, Footer, HeroSection, CardProduto, ModalProduto
│   └── painel/           # PainelEstudante (cabeçalho/visão geral) + SecaoAnuncios, SecaoFavoritos, SecaoPerfil
├── lib/
│   ├── supabase.ts       # Clientes Supabase (browser e servidor via @supabase/ssr)
│   ├── queries.ts        # Funções de fetch e RPCs
│   ├── painel-data.ts    # getServerSideProps compartilhado do painel
│   ├── painel-routes.ts  # Rotas/abas do painel
│   ├── storage.ts        # Helpers de upload para Supabase Storage
│   ├── contato.ts        # Link/formatação do WhatsApp
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
instituicoes   — id, nome, cnpj
usuarios       — id, auth_id (uuid → auth.users), nome, sobrenome, email, password (legado, não usar), telefone, cpf, matricula,
                 matricula_validada (bool), matricula_status (pendente|verificado|rejeitado), instituicoes_id, status, is_admin (bool), criado_em
lojas          — id, usuario_id (UNIQUE), nome, descricao, contato, status (pendente|ativo|pausado|reprovado), criado_em, avatar_url, capa_url,
                 slug, instagram_url, tiktok_url, whatsapp, locais_entrega (text[]), cor_tema (padrão #FF385C)
produtos       — id, loja_id, nome, descricao, preco (numeric), imagem_url, status (ativo|pausado), criado_em, categoria_id,
                 destaque (bool — impulsionado na home, só admin), aceita_troca (bool)
categorias     — id, nome, parent_id (2 níveis), icone
favoritos      — id (uuid), usuario_id, produto_id, criado_em
```

Relações:
- `usuarios.instituicoes_id → instituicoes.id`
- `lojas.usuario_id → usuarios.id` (1:1)
- `produtos.loja_id → lojas.id`
- `produtos.categoria_id → categorias.id`

Storage (buckets públicos; caminho relativo ao bucket):
- `lojas` — `{lojaId}/avatar.{ext}` e `{lojaId}/capa.{ext}`
- `produtos` — `{produtoId}/imagem.{ext}`
- Escrita: dono da loja/produto ou admin

### Migrações

Aplicadas no projeto de dev, nesta ordem: `setup_completo.sql` (histórico), `00` (alinha banco legado),
`01`, `009`, `02`, `04`, `05` … `13`. Toda mudança de schema vira um arquivo novo em `db/migrations/`.

### Segurança (RLS e triggers)

- **Colunas pessoais** (`email`, `cpf`, `telefone`, `matricula`, `password`) não são
  legíveis via `select` pela API. Leitura direta de `usuarios` só retorna colunas públicas
  (`id, auth_id, nome, sobrenome, instituicoes_id, matricula_status, matricula_validada, status, is_admin, criado_em`),
  e apenas da própria linha ou de donos de loja ativa.
- Para filtrar o próprio usuário use `auth_id` (nunca `email`).
- Políticas usam os helpers `meu_usuario_id()`, `usuario_tem_loja_ativa()` e `is_admin()`
  (SECURITY DEFINER) — não referenciar `usuarios` ↔ `lojas` direto em políticas (causa recursão).
- Triggers:
  - `handle_new_user` (signup): cria `usuarios` + loja `ativo`; se já existe linha com o e-mail, só vincula `auth_id`
  - `proteger_colunas_usuarios`: usuário não altera `is_admin`, `auth_id`, `email`,
    nem se marca como verificado (só pode voltar `matricula_status` para `pendente`)
  - `proteger_status_loja`: dono só alterna `ativo ↔ pausado`; o resto é do admin
  - `exigir_vendedor_verificado`: publicar/reativar produto exige `matricula_validada`; vendedor não altera `destaque`
- RPCs (SECURITY DEFINER), expostas em `queries.ts`:
  - `meu_usuario()` → `getMeuUsuario` (dados completos do usuário logado)
  - `verificar_matricula_por_email(p_matricula, p_instituicoes_id)` → `verificarMatriculaInstantanea`
    (usa o e-mail confirmado do Auth; regra em `email_academico()`, espelho de `validarEmailUniversitario` — mudar os dois juntos)
  - `admin_listar_usuarios()` / `admin_moderar_matricula(p_usuario_id, p_status)` — exigem `is_admin()`
  - `admin_listar_lojas()` / `admin_moderar_loja(p_loja_id, p_status)` / `admin_definir_destaque(p_produto_id, p_destaque)`
    → `getLojasParaModeracao`, `moderarLoja`, `definirDestaque` — exigem `is_admin()`
- Mudanças de verificação/admin sempre via RPC no banco, nunca por `update` no cliente.
- Admin é definido manualmente: `UPDATE usuarios SET is_admin = true WHERE email = '…';`
- Modos `?preview=1` / `?demo=1` (dados de exemplo) só funcionam com `NODE_ENV=development`.
- Cookies de sessão: clientes de servidor usam `getAll`/`setAll` do `@supabase/ssr`
  (não reescrever com `get`/`set`/`remove`).

### Ambiente de dev

- Contas de tester: `*@example.com` (5 vendedores com loja), senha comum definida no seed — só dev.
- Nunca reutilizar essas contas ou senha em produção.

---

## Regras de negócio

### Atores
- **Visitante** — navega pelo catálogo; precisa de login para contatar, favoritar ou anunciar
- **Estudante** — usuário cadastrado; ganha uma loja (perfil vendedor) no cadastro
- **Vendedor** — estudante com `matricula_validada = true`; pode publicar anúncios
- **Administrador** — valida matrículas, modera lojas, define impulsionados e gerencia imagens

### Acesso
- Catálogo (`/listagem`, `/lojas/*`, `/perfil/*`) é público
- `/minha-loja`, `/painel`, `/anunciar` exigem login; `/admin` exige `is_admin`
- Anunciar exige matrícula validada (checado na página e no banco)

### Lojas
- **Uma loja por estudante** (`lojas.usuario_id` UNIQUE) — funciona como perfil de vendedor
- Criada automaticamente no cadastro com `status = 'ativo'`
- Status possíveis: `pendente | ativo | pausado | reprovado`; só `ativo` aparece no catálogo
- Vendedor alterna entre `ativo` e `pausado`; reprovar/reativar é do admin

### Produtos
- Apenas o dono da loja (ou admin) gerencia seus produtos
- Status: `ativo | pausado`; aparece no catálogo só se produto **e** loja estiverem `ativo`
- Preço obrigatório para venda; anúncio só de troca pode ter preço 0 (`aceita_troca = true`)
- `destaque` = impulsionado na home, definido só pelo admin
- Imagem via upload (Supabase Storage)

### Compra
- Plataforma apenas conecta comprador e vendedor
- Canal único: **WhatsApp** (`https://wa.me/{telefone}`)
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
- Não usar bibliotecas de componentes (shadcn, radix, MUI, etc.)
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

## Estilo visual — tema Airbnb

| Elemento         | Valor                       |
|------------------|-----------------------------|
| Fundo da página  | `bg-[#F7F7F7]`              |
| Acento principal | `#FF385C`                   |
| Acento hover     | `#e0314f`                   |
| Texto principal  | `text-gray-800`             |
| Texto secundário | `text-gray-500`             |
| Bordas           | `border-gray-200`           |
| Cards            | `bg-white rounded-xl`       |

- Sem cores dark (`bg-black`, `text-white`, `bg-gray-900`)
- Sombras apenas no hover: `hover:shadow-md transition`
- Inputs de busca: `rounded-full`
- Botões primários: `bg-[#FF385C] text-white rounded-lg`
- Filtros/pills: `rounded-full border border-gray-300`