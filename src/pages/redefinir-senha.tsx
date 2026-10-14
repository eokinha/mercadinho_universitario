import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

// Destino do link de recuperação (resetPasswordForEmail em esqueci-senha.tsx).
// O cliente do browser troca o ?code= da URL por uma sessão de recuperação automaticamente.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [sessaoPronta, setSessaoPronta] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setSessaoPronta(true);
    });

    // Se a troca do código já aconteceu (ou falhou), resolve pelo estado atual
    supabase.auth.getSession().then(({ data }) => {
      setSessaoPronta((atual) => atual ?? Boolean(data.session));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha !== confirmacao) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (updateError) {
      setError(
        updateError.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível alterar a senha. Tente novamente."
      );
      return;
    }

    await supabase.auth.signOut();
    await router.push({ pathname: "/login", query: { msg: "Senha alterada. Entre com a nova senha." } });
  }

  const inputClass = "w-full px-4 py-2 border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo focus:border-transparent outline-none transition";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="flex justify-center mb-4"><Logo variante="simbolo" /></div>
        <h1 className="text-2xl font-bold text-petroleo mb-6 text-center">Nova senha</h1>

        {sessaoPronta === null && (
          <p className="text-center text-sm text-tinta-suave">Validando link...</p>
        )}

        {sessaoPronta === false && (
          <div className="text-center">
            <div className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
              Link inválido ou expirado. Peça um novo e-mail de recuperação.
            </div>
            <Link href="/esqueci-senha" className="text-petroleo font-semibold hover:underline text-sm">
              Recuperar senha
            </Link>
          </div>
        )}

        {sessaoPronta && (
          <>
            {error && (
              <div role="alert" className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-tinta mb-1">Nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-tinta mb-1">Confirme a nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition disabled:opacity-50 mt-4"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
