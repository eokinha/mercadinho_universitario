import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { getInstituicoes } from "@/lib/queries";
import { validarEmailUniversitario } from "@/lib/validacoes";
import type { Instituicao } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [instituicaoId, setInstituicaoId] = useState("");
  const [matricula, setMatricula] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInstituicoes().then(setInstituicoes).catch(console.error);
  }, []);

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const updates: Record<string, any> = {
      instituicoes_id: parseInt(instituicaoId),
    };

    if (matricula.trim()) {
      updates.matricula = matricula.trim();
    }

    // Se o e-mail for universitário, auto-valida a matrícula
    if (validarEmailUniversitario(user.email || "")) {
      updates.matricula_status = "verificado";
      updates.matricula_validada = true;
    } else if (matricula.trim()) {
      updates.matricula_status = "pendente";
    }

    const { error: updateError } = await supabase
      .from("usuarios")
      .update(updates)
      .eq("email", user.email);

    if (updateError) {
      console.error("Erro no onboarding:", updateError);
      setError("Não foi possível salvar sua instituição. Tente novamente.");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-[#FF385C]/10 text-[#FF385C] rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
          🎓
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo(a)!</h1>
        <p className="text-xs text-gray-500 mb-6">Para começar, precisamos saber onde você estuda e verificar seu vínculo universitário.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleOnboarding} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Sua Faculdade / Campus *</label>
            <select
              required
              className="w-full px-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF385C] outline-none transition appearance-none bg-white font-medium"
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
              <label className="block text-xs font-bold text-gray-700">Matrícula Universitária</label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                Selo Aluno Verificado 🛡️
              </span>
            </div>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex: 2024019283 (opcional agora)"
              className="w-full px-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF385C] outline-none transition bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Você também pode validar depois no seu painel.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !instituicaoId}
            className="w-full bg-[#FF385C] text-white font-bold py-3 rounded-xl hover:bg-[#e0314f] transition disabled:opacity-50 shadow-md text-sm mt-2"
          >
            {loading ? "Salvando..." : "Começar a usar o Mercadinho"}
          </button>
        </form>
      </div>
    </div>
  );
}
