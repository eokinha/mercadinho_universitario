import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

export default function EsqueciSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-2 border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo focus:border-transparent outline-none transition";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="flex justify-center mb-4"><Logo variante="simbolo" /></div>
        <h1 className="text-2xl font-bold text-petroleo mb-6 text-center">Recuperar senha</h1>

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-3 bg-petroleo-50 text-petroleo text-sm rounded-controle border border-petroleo">
              E-mail enviado! Verifique sua caixa de entrada.
            </div>
            <Link href="/login" className="text-petroleo font-semibold hover:underline text-sm">
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tinta mb-1">Seu e-mail de cadastro</label>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition disabled:opacity-50 mt-4"
              >
                {loading ? "Enviando..." : "Enviar instruções"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-tinta-suave">
              <Link href="/login" className="text-tinta-sutil hover:text-petroleo hover:underline">
                Voltar para o Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
