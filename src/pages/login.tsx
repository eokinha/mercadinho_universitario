import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Logo from "@/components/Logo";
import { type AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function mensagemErroLogin(erro: AuthError | Error): string {
  const code = "code" in erro ? String(erro.code ?? "") : "";
  const status = "status" in erro ? Number(erro.status) : undefined;
  const message = (erro.message ?? "").toLowerCase();

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "E-mail ou senha incorretos. Confira os dados ou cadastre-se se ainda não tiver conta.";
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Veja a caixa de entrada e o spam.";
  }

  if (code === "user_banned" || message.includes("banned")) {
    return "Esta conta está desativada. Entre em contato com o suporte.";
  }

  if (code === "over_request_rate_limit" || status === 429) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  }

  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível entrar. Tente novamente em instantes.";
}

export default function LoginPage() {
  const router = useRouter();
  const { msg } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const credenciaisInvalidas = Boolean(error?.includes("incorretos"));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (loginError) {
        setError(mensagemErroLogin(loginError));
        return;
      }

      await router.push("/");
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error("Erro inesperado no login");
      setError(mensagemErroLogin(fallback));
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-2 border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo focus:border-transparent outline-none transition";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="flex justify-center mb-4"><Logo variante="simbolo" /></div>
        <h1 className="text-2xl font-bold text-petroleo mb-6 text-center">Entrar</h1>

        {msg && (
          <div className="mb-4 p-3 bg-petroleo-50 text-petroleo text-sm rounded-controle border border-petroleo text-center">
            {msg}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 p-4 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Não foi possível entrar
            </div>
            <p>{error}</p>
            {credenciaisInvalidas && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/esqueci-senha" className="text-perigo font-semibold hover:underline">
                  Esqueci minha senha
                </Link>
                <Link href="/cadastro" className="text-perigo font-semibold hover:underline">
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-tinta mb-1">E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              aria-invalid={credenciaisInvalidas}
              className={inputClass}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-semibold text-tinta">Senha</label>
              <Link href="/esqueci-senha" className="text-xs text-tinta-sutil hover:text-petroleo">
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              aria-invalid={credenciaisInvalidas}
              className={inputClass}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition disabled:opacity-50 mt-4"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-tinta-suave">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-petroleo font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
