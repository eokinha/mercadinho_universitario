# Circular — Design System 2.0

Fonte da verdade visual do projeto. Siga estas regras em toda tela nova ou alterada.

## Marca
- Nome: **Circular** (só o C maiúsculo). Slogan: "Deixa Circular." Mote: "Circular. Economia comunitária."
- Logo em `public/brand/` (`circular-logo.svg`, `circular-simbolo.svg`, `circular-simbolo-branco.svg`). Nas telas use o componente `src/components/Logo.tsx` (símbolo inline + nome na fonte carregada).
- Voz: colega de curso confiável. "Você"; botões no imperativo; **sem emojis na interface**; erros dizem o próximo passo.

## Tokens (Tailwind v4, definidos em `src/styles/globals.css` no bloco `@theme`)
**Nunca use hex solto nem classes de cor padrão do Tailwind (`gray-*`, `red-*`, `emerald-*`). Use só os tokens abaixo.** A paleta padrão está desligada no `@theme` (`--color-*: initial`): uma classe fora dos tokens não gera CSS.

| Classe | Uso |
| --- | --- |
| `bg-pagina` | Fundo da página |
| `bg-superficie` | Cards, navbar, modais, inputs |
| `text-tinta` / `text-tinta-suave` / `text-tinta-sutil` | Texto principal / secundário / placeholder |
| `text-petroleo`, `bg-petroleo`, `bg-petroleo-50`, `bg-petroleo-900` | Marca: logo, navbar, títulos, links, foco, hero |
| `bg-acao` + `hover:bg-acao-hover` + `text-white` | **Só a ação principal da tela (uma por tela)** |
| `bg-troca-50 text-troca-texto`, `bg-troca` | Modo Trocar |
| `bg-doacao-50 text-doacao`, `bg-doacao` | Modo Doar |
| `bg-acao-50 text-acao-hover` | Giros e anúncio impulsionado |
| `border-borda` | Bordas decorativas (cards, divisórias) |
| `border-borda-controle` | Bordas de inputs, pills, botão secundário (3:1) |
| `text-perigo`, `bg-perigo-50` | Erros e denúncia |

- Raios: `rounded-controle` (8px: botões, inputs) · `rounded-card` (16px: cards, modais) · `rounded-pill` (tags, filtros, abas, avatares). Não use outros.
- Sombras: cards parados sem sombra; `hover:shadow-hover`; elementos flutuantes `shadow-flutuante`.
- Fonte: Plus Jakarta Sans 400/600/700, carregada em `src/pages/_app.tsx` via `next/font/google` (variável `--font-jakarta`). Sem `font-black`/`font-extrabold`.
- Foco: `focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2`.
- Ícones: `lucide-react`, stroke 1.75, 16–20px. Modos: ShoppingBag (Comprar), Repeat (Trocar), HandHeart (Doar), ShieldCheck (Verificado).

## Componentes-padrão
- **Botão ação:** `bg-acao hover:bg-acao-hover text-white font-semibold rounded-controle px-4 py-2.5`
- **Botão secundário:** `bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle`
- **Abas de modo:** Comprar · Trocar · Doar, mesmo peso; ativa = cor do modo + texto branco; sempre ícone + texto; `role="tablist"`.
- **Tag de modo:** `rounded-pill text-xs font-semibold px-2.5 py-1` com o par `-50`/texto escuro do modo.
- **Selo verificado:** ShieldCheck + "Verificado" em `text-petroleo`, sempre ao lado do nome. Use `src/components/SeloVerificado.tsx`.
- **Card de anúncio:** `bg-superficie border border-borda rounded-card hover:shadow-hover`; foto, tag, nome, preço, aluno (curso · semestre · selo).
- **Anunciar:** começa por "O que você quer fazer com este item?" (Vender / Trocar / Doar); formulário se adapta.

## Acessibilidade
Texto ≥ 4,5:1 (todos os pares acima já passam). Alvos de toque ≥ 44px. Cor nunca é o único sinal.

## Regras de produto refletidas na UI

> **Ainda não implementadas.** Modo Doar, giros, confirmação de troca, limites de doação e chat
> são planos futuros. Hoje o produto segue as regras de negócio do `CLAUDE.md` (Comprar e Trocar,
> contato pelo WhatsApp, impulsionamento definido pelo admin).

- Só alunos com matrícula verificada anunciam e conversam; uma conta por matrícula.
- Troca confirmada pelos dois = 1 giro; doação confirmada = 2 giros para quem doa. Giros só impulsionam anúncios, não viram dinheiro nem são transferidos.
- Máx. 3 doações recebidas por mês; mesma dupla pontua 1x por mês; confirmação só 24h após o anúncio ir ao ar; anúncio exige foto.
- Diferença em dinheiro na troca é combinada entre alunos; o dinheiro não passa pelo site.
