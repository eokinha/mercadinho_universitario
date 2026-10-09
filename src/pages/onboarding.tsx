import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import {
  getInstituicoes,
  getMeuUsuario,
  salvarOnboarding,
  verificarMatriculaInstantanea,
} from "@/lib/queries";
import { validarEmailUniversitario } from "@/lib/validacoes";
import type { Instituicao } from "@/types";

interface Props {
  instituicoes: Instituicao[];
  usuarioId: number;
  email: string;
  instituicaoAtual: number | null;
  matriculaAtual: string;
}

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

  return {
    props: {
      instituicoes,
      usuarioId: usuario.id,
      email: user.email ?? "",
      instituicaoAtual: usuario.instituicoes_id ?? null,
      matriculaAtual: usuario.matricula ?? "",
    },
  };
};

export default function OnboardingPage({ instituicoes, usuarioId, email, instituicaoAtual, matriculaAtual }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [instituicaoId, setInstituicaoId] = useState(instituicaoAtual ? String(instituicaoAtual) : "");
  const [matricula, setMatricula] = useState(matriculaAtual);
  const [error, setError] = useState<string | null>(null);

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const instituicoes_id = parseInt(instituicaoId);
      // Matrícula só volta para "pendente" se foi alterada
      const matriculaNova = matricula.trim() !== matriculaAtual.trim() ? matricula : undefined;
      await salvarOnboarding(usuarioId, { instituicoes_id, matricula: matriculaNova });

      // Se o e-mail for universitário, a validação acontece no banco (RPC)
      if (validarEmailUniversitario(email)) {
        await verificarMatriculaInstantanea(matricula, instituicoes_id);
      }

      router.push("/");
    } catch (err) {
      console.error("Erro no onboarding:", err);
      setError("Não foi possível salvar sua instituição. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="w-16 h-16 bg-petroleo-50 text-petroleo rounded-pill flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={32} strokeWidth={1.75} aria-hidden="true" />
        </div>
        
        <h1 className="text-2xl font-bold text-petroleo mb-1">Boas-vindas à Circular</h1>
        <p className="text-xs text-tinta-suave mb-6">Para começar, precisamos saber onde você estuda e verificar seu vínculo universitário.</p>

        {error && (
          <div className="mb-4 p-3 bg-perigo-50 text-perigo text-xs rounded-controle border border-perigo">
            {error}
          </div>
        )}

        <form onSubmit={handleOnboarding} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-tinta mb-1.5">Sua Faculdade / Campus *</label>
            <select
              required
              className="w-full px-4 py-2.5 text-xs sm:text-sm border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo outline-none transition appearance-none bg-superficie font-semibold"
              value={instituicaoId}
              onChange={(e) => setInstituicaoId(e.target.value)}
            >
              <option value="">Selecione sua instituição...</option>
              {instituicoes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-tinta">Matrícula Universitária</label>
              <span className="text-xs text-petroleo font-semibold bg-petroleo-50 px-2.5 py-1 rounded-pill">
                Selo Verificado
              </span>
            </div>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex: 2024019283 (opcional agora)"
              className="w-full px-4 py-2.5 text-xs sm:text-sm border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo outline-none transition bg-superficie"
            />
            <p className="text-xs text-tinta-sutil mt-1">
              Você também pode validar depois no seu painel.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !instituicaoId}
            className="w-full bg-acao text-white font-bold py-3 rounded-controle hover:bg-acao-hover transition disabled:opacity-50 shadow-flutuante text-sm mt-2"
          >
            {loading ? "Salvando..." : "Começar a usar a Circular"}
          </button>
        </form>
      </div>
    </div>
  );
}
