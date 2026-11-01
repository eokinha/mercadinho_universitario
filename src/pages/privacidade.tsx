import Head from "next/head";

export default function PrivacidadePage() {
  return (
    <>
      <Head>
        <title>Política de Privacidade • Circular</title>
      </Head>

      <article className="max-w-3xl mx-auto px-4 py-10 text-tinta">
        <h1 className="text-3xl font-bold text-petroleo tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-tinta-suave mt-2">Última atualização: outubro de 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">1. Quais dados coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cadastro: nome, sobrenome, e-mail e senha (guardada de forma criptografada).</li>
              <li>Verificação: instituição e número de matrícula.</li>
              <li>Perfil: WhatsApp, descrição, fotos, redes sociais e locais de encontro que você informar.</li>
              <li>Anúncios, favoritos e denúncias que você criar.</li>
              <li>
                Registro de interesse: quando você toca em &ldquo;Tenho interesse&rdquo;, guardamos qual anúncio e quando, para
                medir o uso da plataforma.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">2. Para que usamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar que você é aluno de uma instituição atendida.</li>
              <li>Mostrar seus anúncios e seu perfil para outros alunos.</li>
              <li>Permitir que alunos logados falem com você pelo WhatsApp.</li>
              <li>Moderar denúncias, perguntas e avaliações e manter a comunidade segura.</li>
              <li>Medir o uso do serviço de forma agregada.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">3. O que fica público</h2>
            <p>
              Seu nome, instituição, selo de verificado, fotos, descrição e anúncios aparecem para quem visita o
              catálogo, assim como as perguntas e avaliações que você publicar (com seu nome público). Seu WhatsApp só é mostrado para alunos com conta, quando eles pedem para falar com você.
              E-mail, matrícula, CPF e telefone de cadastro nunca ficam públicos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">4. Com quem compartilhamos</h2>
            <p>
              Não vendemos seus dados. Usamos fornecedores para hospedar o site, o banco de dados e o envio de e-mails,
              que tratam os dados só para prestar esse serviço. O texto de perguntas, respostas e comentários de
              avaliação é enviado a um serviço de moderação automática (Vettly), sem seu nome, e-mail ou telefone,
              só para checar se segue as regras antes de publicar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">5. Seus direitos (LGPD)</h2>
            <p>
              Você pode acessar e corrigir seus dados no painel e excluir sua conta a qualquer momento em Painel →
              Perfil → Excluir conta. A exclusão apaga seu perfil, anúncios, fotos e favoritos. Denúncias feitas sobre
              você podem ser mantidas, sem vínculo com sua conta, para segurança da comunidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-petroleo mb-2">6. Contato</h2>
            <p>Dúvidas sobre seus dados podem ser enviadas para a equipe da Circular pelos canais oficiais.</p>
          </section>
        </div>
      </article>
    </>
  );
}
