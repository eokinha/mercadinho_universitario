// Conteúdo do /ajuda. Cada pergunta tem um id que vira âncora (/ajuda#nao-chegou), para mandar o link direto.
// Respostas descrevem as regras do CLAUDE.md: ao mudar uma regra de negócio, revisar o texto aqui.
import { DIAS_VALIDADE_ANUNCIO } from "./anuncios.ts";
import { REMETENTE_CIRCULAR } from "./guias-email.ts";

export interface LinkFaq {
  href: string; // sempre caminho interno
  texto: string;
}

export interface PerguntaFaq {
  id: string;
  pergunta: string;
  resposta: string[]; // um parágrafo por item
  links?: LinkFaq[];
  guiaFaculdades?: boolean; // mostra o seletor "Sua faculdade" com o passo a passo do e-mail
}

export interface SecaoFaq {
  id: string;
  titulo: string;
  perguntas: PerguntaFaq[];
}

export const FAQ: SecaoFaq[] = [
  {
    id: "email-da-faculdade",
    titulo: "E-mail da faculdade",
    perguntas: [
      {
        id: "por-que-email-da-faculdade",
        pergunta: "Por que preciso do e-mail da faculdade?",
        resposta: [
          "O Circular é só entre alunos. O e-mail da faculdade mostra que você estuda lá e define o seu campus: você vê e negocia com colegas do mesmo campus.",
          "E-mails pessoais (Gmail, Hotmail etc.) não são aceitos no cadastro.",
        ],
      },
      {
        id: "acessar-email",
        pergunta: "Como descubro e acesso meu e-mail da faculdade?",
        resposta: [
          "Toda faculdade participante dá um e-mail institucional ao aluno. O endereço costuma aparecer no portal do aluno, no app da faculdade ou no e-mail de boas-vindas da matrícula.",
          "Escolha sua faculdade abaixo para ver como entrar.",
        ],
        guiaFaculdades: true,
      },
      {
        id: "primeiro-acesso",
        pergunta: "Nunca entrei no e-mail da faculdade. E agora?",
        resposta: [
          "Na maioria das faculdades, a senha do e-mail é a mesma do portal do aluno. No primeiro acesso, pode ser pedido para trocar a senha e cadastrar um celular para confirmar que é você.",
          "Se a senha não funcionar, peça para a secretaria ou o suporte de TI da faculdade redefinir. O Circular não tem acesso ao seu e-mail institucional.",
        ],
      },
      {
        id: "nao-chegou",
        pergunta: "O e-mail do Circular não chegou. O que eu faço?",
        resposta: [
          "Espere alguns minutos e confira a pasta de spam ou Lixo Eletrônico. No Outlook, veja também a aba Outros; no Gmail, as abas Promoções e Atualizações.",
          `Pesquise por "Circular" ou pelo remetente ${REMETENTE_CIRCULAR}.`,
          "Confira se o e-mail foi digitado certo. Na tela depois do cadastro dá para corrigir o endereço ou reenviar o link; no login, quem ainda não confirmou vê o botão Reenviar link de confirmação.",
          "Algumas faculdades seguram e-mails de fora antes de entregar. Se nada chegar depois de reenviar, peça ao suporte de TI da faculdade para liberar o remetente acima.",
        ],
        links: [{ href: "/login", texto: "Ir para o login" }],
      },
      {
        id: "link-invalido",
        pergunta: "O link de confirmação diz que é inválido ou expirou",
        resposta: [
          "Cada link funciona uma vez e por tempo limitado. Se você pediu mais de um, só o mais recente vale.",
          "Se você já confirmou, é só entrar. Se não, tente entrar com seu e-mail e senha: o login mostra o botão para reenviar o link.",
        ],
        links: [{ href: "/login", texto: "Ir para o login" }],
      },
      {
        id: "faculdade-fora",
        pergunta: "Minha faculdade não está no Circular",
        resposta: [
          "Por enquanto, só alunos das faculdades participantes conseguem se cadastrar. A lista aparece no seletor de faculdades acima e na página inicial.",
          "Estamos abrindo novas faculdades aos poucos.",
        ],
      },
    ],
  },
  {
    id: "conta",
    titulo: "Conta e senha",
    perguntas: [
      {
        id: "esqueci-senha",
        pergunta: "Esqueci minha senha",
        resposta: [
          "Em Esqueci minha senha, informe o e-mail da faculdade usado no cadastro. O link para criar uma nova senha chega nesse e-mail.",
          "Se ele não aparecer, siga as dicas de \"O e-mail do Circular não chegou\".",
        ],
        links: [{ href: "/esqueci-senha", texto: "Recuperar senha" }],
      },
      {
        id: "trocar-email",
        pergunta: "Como troco meu e-mail ou mudo de campus?",
        resposta: [
          "No painel, vá em Perfil e depois em E-mail e campus. Enviamos um link para o novo e-mail; ao confirmar, seu campus passa a ser o da faculdade desse e-mail.",
          "Quando o campus muda, seus anúncios ativos são pausados. Reative-os no painel depois.",
        ],
        links: [{ href: "/painel/perfil#trocar-email", texto: "Abrir meu perfil" }],
      },
      {
        id: "excluir-conta",
        pergunta: "Como excluo minha conta?",
        resposta: [
          "No painel, em Perfil, use Excluir conta. Isso apaga seu perfil, seus anúncios e seus favoritos e não dá para desfazer.",
        ],
        links: [{ href: "/painel/perfil", texto: "Abrir meu perfil" }],
      },
    ],
  },
  {
    id: "verificacao",
    titulo: "Verificação",
    perguntas: [
      {
        id: "verificado",
        pergunta: "O que é o selo de verificado?",
        resposta: [
          "O selo mostra que a matrícula do aluno foi confirmada. Só alunos verificados podem anunciar.",
          "Com o e-mail da faculdade confirmado, informe sua matrícula no painel: na maioria dos casos a verificação é na hora. Quando não for, nossa equipe analisa.",
        ],
        links: [{ href: "/painel/perfil", texto: "Informar matrícula" }],
      },
    ],
  },
  {
    id: "comprar",
    titulo: "Comprar e trocar",
    perguntas: [
      {
        id: "como-comprar",
        pergunta: "Como compro ou troco um item?",
        resposta: [
          "No anúncio, toque em Tenho interesse para abrir uma conversa no WhatsApp com o vendedor. Preço, entrega e pagamento são combinados entre vocês.",
          "O Circular só conecta alunos: não tem carrinho, não recebe pagamentos e não faz entregas.",
        ],
      },
      {
        id: "outro-campus",
        pergunta: "Por que não consigo falar com um aluno de outro campus?",
        resposta: [
          "As negociações acontecem dentro do mesmo campus. Perfis de outro campus abrem só para leitura, sem WhatsApp e sem favoritar.",
        ],
      },
      {
        id: "negociar-com-seguranca",
        pergunta: "Como negociar com segurança?",
        resposta: [
          "Combine a entrega em um lugar movimentado do campus, em horário de aula.",
          "Veja o item funcionando antes de pagar e desconfie de quem pede pagamento adiantado ou tem pressa demais.",
          "Viu algo estranho? Denuncie o anúncio ou o perfil.",
        ],
      },
    ],
  },
  {
    id: "anunciar",
    titulo: "Anunciar",
    perguntas: [
      {
        id: "como-anunciar",
        pergunta: "O que preciso para anunciar?",
        resposta: [
          "Ter a matrícula verificada e um WhatsApp cadastrado no perfil. Depois é só tocar em Anunciar, adicionar foto, descrição e preço.",
        ],
        links: [{ href: "/anunciar", texto: "Anunciar" }],
      },
      {
        id: "anuncio-sumiu",
        pergunta: "Meu anúncio sumiu ou foi pausado",
        resposta: [
          `Anúncios saem do catálogo depois de ${DIAS_VALIDADE_ANUNCIO} dias sem renovação. No painel, use Renovar; editar ou reativar o anúncio também renova.`,
          "Os anúncios também são pausados quando a verificação da matrícula cai ou quando você muda de campus.",
        ],
        links: [{ href: "/painel/anuncios", texto: "Ver meus anúncios" }],
      },
      {
        id: "anunciar-troca",
        pergunta: "Posso anunciar só para troca?",
        resposta: [
          "Pode. Marque que aceita troca: um anúncio só de troca pode ficar com preço zero.",
        ],
      },
      {
        id: "qr-code-loja",
        pergunta: "Como divulgo minha loja com QR code?",
        resposta: [
          "Abra o seu perfil público e toque em \"Compartilhar minha loja\". Dá para baixar o QR code em imagem, copiar o link ou mandar direto pelo WhatsApp.",
          "Viu a loja de um colega e quer indicar? No perfil dele, toque em \"Compartilhar loja\": é o mesmo QR code e o mesmo link.",
          "Quem escanear precisa entrar com o e-mail da faculdade para ver seus anúncios. Colegas do seu campus podem falar com você; alunos de outro campus só veem a loja.",
        ],
        links: [{ href: "/painel", texto: "Ir para o painel" }],
      },
      {
        id: "itens-proibidos",
        pergunta: "O que não pode ser anunciado?",
        resposta: ["A lista de itens proibidos está nos Termos de Uso."],
        links: [{ href: "/termos", texto: "Ler os Termos de Uso" }],
      },
    ],
  },
  {
    id: "seguranca",
    titulo: "Denúncias",
    perguntas: [
      {
        id: "denunciar",
        pergunta: "Como denuncio um anúncio ou perfil?",
        resposta: [
          "Use o botão Denunciar no anúncio ou no perfil do aluno. Nossa equipe analisa cada denúncia e pode remover anúncios e bloquear contas.",
        ],
      },
    ],
  },
];
