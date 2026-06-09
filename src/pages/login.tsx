import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { msg } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { email, password } = formData;

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error("Erro de login:", loginError);
      
      // Tradução de erros comuns para o usuário
      let errorMessage = "Ocorreu um erro ao entrar. Tente novamente.";
      
      if (loginError.message === "Invalid login credentials") {
        errorMessage = "E-mail ou senha incorretos. Verifique seus dados.";
      } else if (loginError.status === 429) {
        errorMessage = "Muitas tentativas seguidas. Tente novamente em alguns minutos.";
      }

      setError(errorMessage);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A2FD6] focus:border-transparent outline-none transition";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Entrar</h1>

        {msg && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-600 text-sm rounded-lg border border-blue-100 text-center">
            {msg}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Atenção
            </div>
            <p>{error}</p>
            {error.includes("incorretos") && (
              <Link href="/esqueci-senha" className="text-red-800 font-bold hover:underline">
                Esqueci minha senha →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              className={inputClass}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <Link href="/esqueci-senha" className="text-xs text-gray-400 hover:text-[#9A2FD6]">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              required
              className={inputClass}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#9A2FD6] text-white font-semibold py-3 rounded-lg hover:bg-[#821bbd] transition disabled:opacity-50 mt-4"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-[#9A2FD6] font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
