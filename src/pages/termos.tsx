import Head from "next/head";
import Link from "next/link";

const ITENS_PROIBIDOS = [
  "Medicamentos, drogas, substâncias controladas e bebidas alcoólicas",
  "Armas, munições, simulacros e itens que possam ferir alguém",
  "Produtos falsificados, piratas ou de origem ilícita",
  "Animais",
  "Documentos, contas, carteirinhas, provas, trabalhos acadêmicos prontos ou cola",
  "Conteúdo adulto",
  "Dados pessoais de terceiros",
  "Serviços ou itens que violem as regras da sua instituição",
];

export default function TermosPage() {
  return (
    <>
      <Head>
        <title>Termos de Uso • Circular</title>
      </Head>

      <article className="max-w-3xl mx-auto px-4 py-10 text-tinta">
        <h1 className="text-3xl font-bold text-petroleo tracking-tight">Termos de Uso</h1>
        <p className="text-sm text-tinta-suave mt-2">Última atualização: outubro de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">1. O que é a Circular</h2>
            <p>
              A Circular conecta alunos do mesmo campus para vender e trocar itens. Nós não vendemos, não compramos,
              não intermediamos pagamentos e não entregamos nada: a negociação acontece direto entre os alunos, pelo
              chat do Circular ou pelo WhatsApp (quando o vendedor cadastra o número), e o encontro é combinado entre
              vocês.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">2. Quem pode usar</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                A conta é criada com o e-mail institucional de uma faculdade participante. O domínio desse e-mail
                define o seu campus, e você vê e negocia com alunos do seu campus.
              </li>
              <li>
                Anúncios de outro campus podem ser vistos por link, mas o contato é só entre alunos da mesma faculdade.
                Para mudar de campus, troque o e-mail da conta pelo da nova faculdade.
              </li>
              <li>
                Para anunciar, é preciso ter a matrícula verificada (pelo e-mail institucional ou por análise da
                equipe). O WhatsApp no perfil é opcional; sem ele, o contato é só pelo chat.
              </li>
              <li>Cada pessoa pode ter uma única conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">3. Seus anúncios</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Anuncie só o que é seu e descreva o estado real do item, com fotos do próprio item.</li>
              <li>Anúncios de venda precisam ter preço. Anúncios só de troca podem ficar sem preço.</li>
              <li>Marque o anúncio como vendido quando fechar negócio.</li>
              <li>Anúncios sem renovação por 60 dias saem do catálogo até você renovar.</li>
              <li>Você é responsável pelo que anuncia e pelo que combina com outros alunos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">4. Itens proibidos</h2>
            <ul className="list-disc pl-5 space-y-1">
              {ITENS_PROIBIDOS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">5. Denúncias e moderação</h2>
            <p>
              Qualquer aluno com conta pode denunciar um anúncio ou perfil. A equipe pode retirar anúncios, reprovar
              perfis e bloquear contas que descumpram estes termos, sem aviso prévio quando houver risco para outros
              alunos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">6. Segurança na negociação</h2>
            <p>
              Combine o encontro em locais movimentados do campus, confira o item antes de pagar e nunca envie
              dinheiro adiantado para quem você não conhece. A Circular não se responsabiliza pela qualidade, pela
              entrega ou pelo pagamento dos itens negociados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">7. Sua conta</h2>
            <p>
              Você pode excluir sua conta a qualquer momento no painel, em Meus dados. Seus dados são tratados conforme a{" "}
              <Link href="/privacidade" className="text-petroleo font-semibold hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">8. Mudanças</h2>
            <p>
              Podemos atualizar estes termos. Mudanças importantes serão avisadas no site antes de valer.
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
