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
      setError(loginError.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none transition";

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
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
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
              <Link href="/esqueci-senha" className="text-xs text-gray-400 hover:text-[#FF385C]">
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
            className="w-full bg-[#FF385C] text-white font-semibold py-3 rounded-lg hover:bg-[#e0314f] transition disabled:opacity-50 mt-4"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-[#FF385C] font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
