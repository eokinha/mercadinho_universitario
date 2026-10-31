import { useState } from "react";
import Link from "next/link";
import { GraduationCap, TriangleAlert } from "lucide-react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import {
  getInstituicoes,
  getMeuUsuario,
  solicitarVerificacaoMatricula,
  verificarMatriculaInstantanea,
} from "@/lib/queries";
import { LIMITES_TEXTO } from "@/lib/validacoes";

interface Props {
  usuarioId: number;
  email: string;
  campusNome: string | null;
  matriculaAtual: string;
}

// O campus vem do domínio do e-mail (migração 19); aqui o aluno só confirma e informa a matrícula.
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const [usuario, instituicoes] = await Promise.all([
    getMeuUsuario(serverSupabase),
    getInstituicoes(serverSupabase),
  ]);

  if (!usuario) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const campus = instituicoes.find((i) => i.id === usuario.instituicoes_id);

  return {
    props: {
      usuarioId: usuario.id,
      email: user.email ?? "",
      campusNome: campus?.nome ?? null,
      matriculaAtual: usuario.matricula ?? "",
    },
  };
};

export default function OnboardingPage({ usuarioId, email, campusNome, matriculaAtual }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [matricula, setMatricula] = useState(matriculaAtual);
  const [error, setError] = useState<string | null>(null);

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // E-mail confirmado de faculdade participante: o banco verifica na hora
      const { success } = await verificarMatriculaInstantanea(matricula);
      if (!success && matricula.trim() && matricula.trim() !== matriculaAtual.trim()) {
        await solicitarVerificacaoMatricula(usuarioId, matricula);
      }
      router.push("/");
    } catch (err) {
      console.error("Erro no onboarding:", err);
      setError("Não foi possível concluir. Tente novamente.");
      setLoading(false);
    }
  }

  if (!campusNome) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-superficie p-8 rounded-card border border-borda">
          <div className="w-16 h-16 bg-perigo-50 text-perigo rounded-pill flex items-center justify-center mx-auto mb-6">
            <TriangleAlert size={32} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-petroleo mb-2">Sua faculdade ainda não está no Circular</h1>
          <p className="text-sm text-tinta-suave mb-6">
            O e-mail <strong className="text-tinta">{email}</strong> não pertence a uma faculdade participante.
            Cada aluno entra no campus do próprio e-mail institucional.
          </p>
          <Link
            href="/painel/perfil#trocar-email"
            className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition inline-flex items-center justify-center min-h-[44px] text-sm focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            Trocar para o e-mail da faculdade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="w-16 h-16 bg-petroleo-50 text-petroleo rounded-pill flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={32} strokeWidth={1.75} aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-petroleo mb-1">Boas-vindas à Circular</h1>
        <p className="text-sm text-tinta-suave mb-6">
          Pelo seu e-mail, você faz parte do campus <strong className="text-petroleo">{campusNome}</strong>.
          Você vai ver e negociar com os colegas de lá.
        </p>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
            {error}
          </div>
        )}

        <form onSubmit={handleOnboarding} className="space-y-4 text-left">
          <div>
            <label htmlFor="matricula" className="block text-sm font-semibold text-tinta mb-1.5">
              Matrícula universitária
            </label>
            <input
              id="matricula"
              type="text"
              value={matricula}
              maxLength={LIMITES_TEXTO.matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex: 2024019283 (opcional agora)"
              className="w-full px-4 py-2.5 text-sm border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo outline-none transition bg-superficie"
            />
            <p className="text-xs text-tinta-sutil mt-1">Você também pode informar depois no seu painel.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition disabled:opacity-50 text-sm mt-2 min-h-[44px]"
          >
            {loading ? "Salvando..." : "Começar a usar a Circular"}
          </button>
        </form>
      </div>
    </div>
  );
}
