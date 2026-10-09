export const PAGINAS_PAINEL = {
  "visao-geral": {
    id: "visao-geral",
    href: "/painel",
    label: "Visão geral",
    title: "Meu painel",
    icon: "📊",
  },
  anuncios: {
    id: "anuncios",
    href: "/painel/anuncios",
    label: "Meus anúncios",
    title: "Meus anúncios",
    icon: "📦",
  },
  favoritos: {
    id: "favoritos",
    href: "/painel/favoritos",
    label: "Meus favoritos",
    title: "Meus favoritos",
    icon: "❤️",
  },
  perfil: {
    id: "perfil",
    href: "/painel/perfil",
    label: "Meu perfil",
    title: "Meu perfil",
    icon: "👤",
  },
} as const;

export type AbaPainel = keyof typeof PAGINAS_PAINEL;

export const ABAS_PAINEL = Object.keys(PAGINAS_PAINEL) as AbaPainel[];
