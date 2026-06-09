import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { getInstituicoes } from "@/lib/queries";
import type { Instituicao } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [instituicaoId, setInstituicaoId] = useState("");
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

    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ instituicoes_id: parseInt(instituicaoId) })
      .eq("auth_id", user.id);

    if (updateError) {
      console.error("Erro no onboarding:", updateError);
      setError("Não foi possível salvar sua instituição. Tente novamente.");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-[#9A2FD6]/10 text-[#9A2FD6] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindo(a)!</h1>
        <p className="text-gray-500 mb-8">Para começar, precisamos saber onde você estuda.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleOnboarding} className="space-y-6 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sua Instituição</label>
            <select
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#9A2FD6] outline-none transition appearance-none bg-white"
              value={instituicaoId}
              onChange={(e) => setInstituicaoId(e.target.value)}
            >
              <option value="">Selecione sua faculdade...</option>
              {instituicoes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.nome}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !instituicaoId}
            className="w-full bg-[#9A2FD6] text-white font-bold py-3 rounded-xl hover:bg-[#821bbd] transition disabled:opacity-50 shadow-md"
          >
            {loading ? "Salvando..." : "Começar a usar"}
          </button>
        </form>
      </div>
    </div>
  );
}
