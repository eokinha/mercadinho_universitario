# Regras de Negócio — Mercadinho Universitário

---

## Atores do sistema

| Ator | Descrição |
|---|---|
| **Visitante** | Não tem acesso — precisa se cadastrar |
| **Estudante** | Usuário cadastrado; pode comprar e abrir lojas |
| **Vendedor** | Estudante que possui pelo menos uma loja aprovada |
| **Administrador** | Gerencia instituições, valida matrículas e aprova lojas |

---

## Autenticação e cadastro

- Qualquer pessoa pode se cadastrar informando matrícula e instituição
- A matrícula **não é validada automaticamente** — fica pendente até o admin confirmar
- Enquanto a matrícula não for validada, o usuário pode navegar mas **não pode criar lojas**
- Somente usuários com login ativo conseguem visualizar lojas e produtos

---

## Instituições

- Instituições são cadastradas **exclusivamente pelo administrador**
- Usuários escolhem sua instituição no momento do cadastro
- Uma instituição pode ter múltiplas lojas de estudantes diferentes

---

## Lojas

- Apenas estudantes com **matrícula validada** pelo admin podem criar lojas
- Um estudante pode ter **várias lojas**
- Ao criar uma loja, ela fica com `status = inativo` até aprovação do admin
- Lojas inativas **não aparecem na listagem** para outros usuários
- Após aprovação, o vendedor pode **pausar ou reativar** a própria loja a qualquer momento
- O admin pode reprovar ou desativar qualquer loja

---

## Produtos

- Apenas o dono da loja pode criar, editar e remover produtos
- Produtos possuem: nome, descrição, preço, imagem e categoria
- Imagens são enviadas pelo vendedor via upload
- O preço é obrigatório e exibido na listagem
- A negociação e o pagamento acontecem **fora da plataforma** — o comprador entra em contato pelo WhatsApp ou email informado na loja
- Produtos só aparecem se a loja estiver ativa

---

## Administrador

O administrador pode:

- **Validar matrículas** de estudantes cadastrados
- **Aprovar ou reprovar** lojas criadas por estudantes
- **Cadastrar e gerenciar instituições**
- **Desativar** lojas ou usuários quando necessário

O sistema começa sem painel de admin dedicado — as ações podem ser feitas diretamente pelo Supabase Dashboard na primeira versão.

---

## Fluxo de cadastro de loja

```
Estudante se cadastra
        ↓
Admin valida a matrícula
        ↓
Estudante cria uma loja
        ↓
Loja fica inativa (pendente)
        ↓
Admin aprova a loja
        ↓
Loja aparece na listagem
        ↓
Vendedor gerencia status (ativo/pausado)
```

---

## Fluxo de compra

```
Usuário navega na listagem
        ↓
Filtra por instituição ou categoria
        ↓
Acessa a página da loja
        ↓
Visualiza produtos e preços
        ↓
Entra em contato com o vendedor
(WhatsApp ou email da loja)
        ↓
Negociação e pagamento fora da plataforma
```

---

## Impacto no banco de dados

### Campos a adicionar/ajustar

**`usuarios`**
- `matricula_validada` — `bool`, default `false` — indica se o admin validou a matrícula

**`lojas`**
- `status` já existe — usar para controlar `pendente | ativo | pausado | reprovado`
- Considerar trocar de `bool` para `varchar` ou criar um `enum`

**`produtos`**
- `preco` — `numeric` — obrigatório
- `imagem_url` — `varchar` — URL da imagem no Supabase Storage

**`categorias`**
- Já planejada — nenhuma alteração necessária

### SQL sugerido

```sql
-- Adicionar validação de matrícula
ALTER TABLE usuarios ADD COLUMN matricula_validada BOOLEAN DEFAULT FALSE;

-- Adicionar preço e imagem aos produtos
ALTER TABLE produtos ADD COLUMN preco NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN imagem_url VARCHAR;

-- Ajustar status da loja para suportar múltiplos estados
ALTER TABLE lojas ALTER COLUMN status TYPE VARCHAR;
-- Valores possíveis: 'pendente' | 'ativo' | 'pausado' | 'reprovado'
-- Atualizar registros existentes
UPDATE lojas SET status = 'ativo' WHERE status = 'true';
UPDATE lojas SET status = 'pausado' WHERE status = 'false';
```

---

## O que está fora do escopo desta versão

- Pagamento dentro da plataforma
- Sistema de avaliações ou reviews
- Chat interno entre comprador e vendedor
- Notificações por email automáticas
- Painel de admin com interface visual
- Validação automática de matrícula via API das instituições
