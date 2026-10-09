import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { validarEmail, validarEmailUniversitario } from "@/lib/validacoes";

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    sobrenome: "",
  });

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações básicas
    if (!validarEmail(formData.email)) {
      setError("Por favor, insira um e-mail válido.");
      setLoading(false);
      return;
    }

    if (!validarEmailUniversitario(formData.email)) {
      setError("Por favor, use seu e-mail universitário (.edu.br) para garantir a segurança da comunidade.");
      setLoading(false);
      return;
    }

    const { email, password, nome, sobrenome } = formData;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          sobrenome,
          // Outros campos serão preenchidos no onboarding
        },
      },
    });

    if (signUpError) {
      console.error("Erro no cadastro:", signUpError);
      
      let errorMessage = "Ocorreu um erro ao realizar o cadastro.";
      
      if (signUpError.message.includes("already registered")) {
        errorMessage = "Este e-mail já está cadastrado. Tente entrar na sua conta.";
      } else if (signUpError.message.includes("weak")) {
        errorMessage = "A senha escolhida é muito fraca.";
      } else if (signUpError.message.toLowerCase().includes("email address") && signUpError.message.toLowerCase().includes("invalid")) {
        errorMessage = "O e-mail informado parece ser inválido ou não é aceito pelo sistema.";
      }

      setError(errorMessage);
      setLoading(false);
    } else {
      router.push("/login?msg=Cadastro realizado com sucesso! Você já pode entrar agora mesmo.");
    }
  }

  const inputClass = "w-full px-4 py-2 border border-borda-controle rounded-controle focus:ring-2 focus:ring-petroleo focus:border-transparent outline-none transition";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-superficie p-8 rounded-card border border-borda">
        <div className="flex justify-center mb-4"><Logo variante="simbolo" /></div>
        <h1 className="text-2xl font-bold text-petroleo mb-6 text-center">Criar conta</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-perigo-50 text-perigo text-sm rounded-controle border border-perigo flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Atenção
            </div>
            <p>{error}</p>
            {error.includes("cadastrado") && (
              <Link href="/login" className="text-perigo font-bold hover:underline">
                Ir para o Login
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleCadastro} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-tinta mb-1">Nome</label>
              <input
                type="text"
                required
                className={inputClass}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-tinta mb-1">Sobrenome</label>
              <input
                type="text"
                required
                className={inputClass}
                value={formData.sobrenome}
                onChange={(e) => setFormData({ ...formData, sobrenome: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-tinta mb-1">E-mail</label>
            <input
              type="email"
              required
              placeholder="exemplo@email.com"
              className={inputClass}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-tinta mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
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
            {loading ? "Processando..." : "Finalizar Cadastro"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-tinta-suave">
          Já possui conta?{" "}
          <Link href="/login" className="text-petroleo font-semibold hover:underline transition">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
