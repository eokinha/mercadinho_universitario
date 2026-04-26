import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getInstituicoes } from "@/lib/queries";
import { formatarCPF, formatarTelefone, validarCPF, validarEmail } from "@/lib/validacoes";
import type { Instituicao } from "@/types";

export default function CadastroPage() {
  const router = useRouter();
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    sobrenome: "",
    telefone: "",
    cpf: "",
    matricula: "",
    instituicoes_id: "",
  });

  useEffect(() => {
    getInstituicoes().then(setInstituicoes).catch(console.error);
  }, []);

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações antes de enviar
    if (!validarEmail(formData.email)) {
      setError("Por favor, insira um e-mail válido.");
      setLoading(false);
      return;
    }

    if (!validarCPF(formData.cpf)) {
      setError("CPF inválido. Verifique os números digitados.");
      setLoading(false);
      return;
    }

    if (formData.telefone.replace(/\D/g, "").length < 10) {
      setError("Telefone inválido. Insira o DDD e o número.");
      setLoading(false);
      return;
    }

    const { email, password, nome, sobrenome, telefone, cpf, matricula, instituicoes_id } = formData;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          sobrenome,
          telefone: telefone.replace(/\D/g, ""), // Salva apenas números
          cpf: cpf.replace(/\D/g, ""),           // Salva apenas números
          matricula,
          instituicoes_id: parseInt(instituicoes_id),
        },
      },
    });

    if (signUpError) {
      console.error("Erro no cadastro:", signUpError);
      setError(signUpError.message);
      setLoading(false);
    } else {
      router.push("/login?msg=Cadastro realizado com sucesso! Você já pode entrar.");
    }
  }

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none transition";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Criar conta</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleCadastro} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                required
                className={inputClass}
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                required
                placeholder="(00) 00000-0000"
                className={inputClass}
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                className={inputClass}
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatarCPF(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
              <input
                type="text"
                required
                className={inputClass}
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instituição</label>
              <select
                required
                className={inputClass}
                value={formData.instituicoes_id}
                onChange={(e) => setFormData({ ...formData, instituicoes_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {instituicoes.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF385C] text-white font-semibold py-3 rounded-lg hover:bg-[#e0314f] transition disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? "Processando..." : "Finalizar Cadastro"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já possui conta?{" "}
          <Link href="/login" className="text-[#FF385C] font-semibold hover:underline transition">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
