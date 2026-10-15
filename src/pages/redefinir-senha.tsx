import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

// Destino do link de recuperação (template em db/emails/recuperar-senha.html):
// /redefinir-senha?token_hash=...&type=recovery
// O token só é validado no envio do formulário: scanners de link (ex.: Microsoft Safe Links)
// abrem a página mas não submetem, então não consomem o token.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const tokenHash = typeof router.query.token_hash === "string" ? router.query.token_hash : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenHash) return;
    setError(null);

    if (senha !== confirmacao) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
      if (verifyError) {
        setLinkInvalido(true);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
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
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-2 border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo focus:border-transparent outline-none transition";
  const semToken = router.isReady && !tokenHash;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="flex justify-center mb-4"><Logo variante="simbolo" /></div>
        <h1 className="text-2xl font-bold text-petroleo mb-6 text-center">Nova senha</h1>

        {semToken || linkInvalido ? (
          <div className="text-center">
            <div className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
              Link inválido ou expirado. Peça um novo e-mail de recuperação.
            </div>
            <Link href="/esqueci-senha" className="text-petroleo font-semibold hover:underline text-sm">
              Recuperar senha
            </Link>
          </div>
        ) : (
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
                disabled={loading || !tokenHash}
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
