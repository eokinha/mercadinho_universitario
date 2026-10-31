import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";

// Destino dos links de confirmação (templates em db/emails/):
// cadastro → /confirmar-email?token_hash=...&type=email (confirmar-cadastro.html)
// troca de e-mail/campus → /confirmar-email?token_hash=...&type=email_change (trocar-email.html)
// Mesmo padrão de /redefinir-senha: o token só é validado no clique do botão, para que
// scanners de link (ex.: Microsoft Safe Links) não o consumam ao abrir a página.
export default function ConfirmarEmailPage() {
  const router = useRouter();
  const tokenHash = typeof router.query.token_hash === "string" ? router.query.token_hash : null;
  const trocaEmail = router.query.type === "email_change";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);

  async function handleConfirmar() {
    if (!tokenHash) return;
    setError(null);
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: trocaEmail ? "email_change" : "email",
        token_hash: tokenHash,
      });
      if (verifyError) {
        setLinkInvalido(true);
        return;
      }

      // verifyOtp já abre a sessão. Na troca de e-mail o banco já recalculou o campus.
      await router.push(trocaEmail ? "/painel/perfil#trocar-email" : "/onboarding");
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const semToken = router.isReady && !tokenHash;

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="flex justify-center mb-4"><Logo variante="simbolo" /></div>
        <h1 className="text-2xl font-bold text-petroleo mb-6 text-center">Confirmar e-mail</h1>

        {semToken || linkInvalido ? (
          <div className="text-center">
            <div className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
              Link inválido ou expirado. Se você já confirmou, é só entrar na sua conta.
            </div>
            <Link href="/login" className="text-petroleo font-semibold hover:underline text-sm">
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="mb-4 p-3 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo">
                {error}
              </div>
            )}

            <p className="text-sm text-tinta-suave text-center mb-6">
              {trocaEmail
                ? "Confirme o novo e-mail. Seu campus passa a ser o da faculdade desse e-mail."
                : "Falta só um clique para ativar sua conta no Circular."}
            </p>

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={loading || !tokenHash}
              className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition disabled:opacity-50"
            >
              {loading ? "Confirmando..." : trocaEmail ? "Confirmar novo e-mail" : "Confirmar e-mail"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
