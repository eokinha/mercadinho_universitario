# Mercadinho Universitário

Marketplace universitário onde estudantes encontram lojas dentro de instituições de ensino.

## Stack

- Next.js com **Page Router** (sem App Router)
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)

---

## Estrutura de pastas

```
src/
├── pages/
│   ├── _app.tsx          # Layout global (Navbar + Footer)
│   ├── index.tsx         # Home (hero + impulsionados)
│   ├── listagem.tsx      # Listagem completa de produtos com filtros
│   ├── lojas/
│   │   └── [id].tsx      # Detalhe da loja (rota dinâmica)
│   └── admin/
│       └── imagens.tsx   # Upload provisório de avatar/capa/imagens (sem auth)
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── HeroSection.tsx
│   ├── CarrosselCategoria.tsx
│   ├── CardProduto.tsx
│   ├── ModalProduto.tsx
│   └── FiltroBarProdutos.tsx
├── lib/
│   ├── supabase.ts       # Instância do cliente Supabase
│   ├── queries.ts        # Funções de fetch
│   └── storage.ts        # Helpers de upload para Supabase Storage
└── types/
    └── index.ts          # Interfaces TypeScript
```

---

## Banco de dados (Supabase)

```
instituicoes   — id, nome, cnpj
usuarios       — id, nome, sobrenome, email, password, telefone, cpf, matricula, matricula_validada (bool), instituicoes_id, status
lojas          — id, usuario_id, nome, descricao, contato, status (varchar: pendente|ativo|pausado|reprovado), criado_em, avatar_url, capa_url
produtos       — id, loja_id, nome, descricao, preco (numeric), imagem_url (varchar), status, criado_em, categoria_id, destaque (bool)
categorias     — id, nome
```

Relações:
- `usuarios.instituicoes_id → instituicoes.id`
- `lojas.usuario_id → usuarios.id`
- `produtos.loja_id → lojas.id`
- `produtos.categoria_id → categorias.id`

Storage (buckets públicos):
- `lojas` — `lojas/{lojaId}/avatar.{ext}` e `lojas/{lojaId}/capa.{ext}`
- `produtos` — `produtos/{produtoId}/imagem.{ext}`

> **Aviso:** as policies de escrita do Storage estão liberadas para a chave
> `anon` enquanto não há autenticação. A página `/admin/imagens` e essas
> policies devem ser restringidas (`auth.uid() = lojas.usuario_id`) quando o
> login for implementado. Em produção, esconda o link "Admin" do `Navbar`
> (já condicionado a `process.env.NODE_ENV !== "production"`).

---

## Regras de negócio

### Atores
- **Visitante** — sem acesso; precisa se cadastrar
- **Estudante** — usuário cadastrado; pode comprar e abrir lojas
- **Vendedor** — estudante com matrícula validada e loja aprovada
- **Administrador** — gerencia instituições, valida matrículas e aprova lojas

### Acesso
- Lojas e produtos visíveis apenas para usuários com login ativo
- Estudante só pode criar loja após `matricula_validada = true`
- Um estudante pode ter várias lojas

### Lojas
- Criada com `status = 'pendente'` — só aparece na listagem com `status = 'ativo'`
- Status possíveis: `pendente | ativo | pausado | reprovado`
- Vendedor pode alternar entre `ativo` e `pausado`
- Admin pode reprovar ou desativar qualquer loja

### Produtos
- Apenas o dono da loja gerencia seus produtos
- Preço obrigatório; imagem via upload (Supabase Storage)
- Produtos só aparecem se a loja estiver `ativo`

### Compra
- Plataforma apenas conecta comprador e vendedor
- Canal único: **WhatsApp** (`https://wa.me/{telefone}`)
- `lojas.contato` armazena apenas dígitos do telefone (DDI + DDD + número);
  use os helpers de `src/lib/contato.ts` para gerar link e formatar
- Sem carrinho, pedido ou pagamento interno

### Fora do escopo desta versão
- Pagamento interno, chat, notificações por email, painel de admin visual

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
- Pages não chamam o Supabase diretamente — usar funções de `src/lib/queries.ts`
- Sempre tratar erros com `if (error) throw error`

### Componentes
- Props sempre tipadas com `interface Props`
- Exportação sempre `export default function NomeComponente`
- Componentes recebem dados via props — não fazem fetch

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