import { useState, useMemo } from "react";
import Link from "next/link";
import {
  solicitarVerificacaoMatricula,
  updateLoja,
  verificarMatriculaInstantanea,
} from "@/lib/queries";
import { normalizarTelefone } from "@/lib/contato";
import { uploadImagemLoja } from "@/lib/storage";
import { validarEmailUniversitario } from "@/lib/validacoes";
import type { Instituicao, Loja, Usuario } from "@/types";

type MatriculaStatus = Usuario["matricula_status"];

interface Props {
  loja: Loja;
  usuario: Usuario | null;
  userEmail: string;
  instituicoes: Instituicao[];
  matriculaStatus: MatriculaStatus;
  onLojaAtualizada: (alteracoes: Partial<Loja>) => void;
  onMatriculaStatus: (status: MatriculaStatus) => void;
}

const LOCAIS_SUGERIDOS = [
  "RU Central",
  "Biblioteca Universitária",
  "Centro de Vivência",
  "Centro Acadêmico (CA)",
  "Entrada Principal do Campus",
  "Bloco de Aulas",
];

export default function SecaoPerfil({
  loja,
  usuario,
  userEmail,
  instituicoes,
  matriculaStatus,
  onLojaAtualizada,
  onMatriculaStatus,
}: Props) {
  const [matriculaInput, setMatriculaInput] = useState(usuario?.matricula || "");
  const [instituicaoSelecionada, setInstituicaoSelecionada] = useState<number | "">(
    usuario?.instituicoes_id || ""
  );
  const [verificandoInstantaneo, setVerificandoInstantaneo] = useState(false);
  const [enviandoMatricula, setEnviandoMatricula] = useState(false);
  const [mensagemVerificacao, setMensagemVerificacao] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const emailEhUniversitario = useMemo(() => {
    return validarEmailUniversitario(userEmail || usuario?.email || "");
  }, [userEmail, usuario?.email]);

  // Estados de edição de perfil
  const [nome, setNome] = useState(loja.nome);
  const [descricao, setDescricao] = useState(loja.descricao || "");
  const [whatsapp, setWhatsapp] = useState(loja.whatsapp || loja.contato || "");
  const [locais, setLocais] = useState<string[]>(loja.locais_entrega || []);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [mensagemPerfil, setMensagemPerfil] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Handlers de Verificação Acadêmica
  async function handleValidacaoInstantanea() {
    if (!usuario) return;
    setVerificandoInstantaneo(true);
    setMensagemVerificacao(null);
    try {
      const res = await verificarMatriculaInstantanea(
        matriculaInput,
        instituicaoSelecionada ? Number(instituicaoSelecionada) : undefined
      );
      if (res.success) {
        onMatriculaStatus("verificado");
        setMensagemVerificacao({ tipo: "sucesso", texto: res.message });
      } else {
        setMensagemVerificacao({ tipo: "erro", texto: res.message });
      }
    } catch (err) {
      setMensagemVerificacao({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao validar matrícula.",
      });
    } finally {
      setVerificandoInstantaneo(false);
    }
  }

  async function handleSubmeterMatricula(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    if (!matriculaInput.trim()) {
      setMensagemVerificacao({ tipo: "erro", texto: "Informe o número da matrícula." });
      return;
    }
    setEnviandoMatricula(true);
    setMensagemVerificacao(null);
    try {
      await solicitarVerificacaoMatricula(usuario.id, {
        matricula: matriculaInput,
        instituicoes_id: instituicaoSelecionada ? Number(instituicaoSelecionada) : undefined,
      });
      onMatriculaStatus("pendente");
      setMensagemVerificacao({
        tipo: "sucesso",
        texto: "Matrícula enviada para análise da moderação! Em breve seu selo Aluno Verificado será ativado.",
      });
    } catch (err) {
      setMensagemVerificacao({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao enviar matrícula.",
      });
    } finally {
      setEnviandoMatricula(false);
    }
  }

  // Upload de avatar
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setAvatarUploading(true);

    try {
      const url = await uploadImagemLoja(loja.id, "avatar", file);
      onLojaAtualizada({ avatar_url: url });
      setMensagemPerfil({ tipo: "sucesso", texto: "Foto de perfil atualizada com sucesso!" });
    } catch (err) {
      setMensagemPerfil({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao enviar imagem.",
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  // Toggle local de entrega no campus
  function toggleLocal(local: string) {
    if (locais.includes(local)) {
      setLocais(locais.filter((l) => l !== local));
    } else {
      setLocais([...locais, local]);
    }
  }

  // Salvar alterações no perfil
  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    setMensagemPerfil(null);

    // lojas.contato guarda só dígitos (DDI + DDD + número)
    const contato = normalizarTelefone(whatsapp);

    try {
      await updateLoja(loja.id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        whatsapp: whatsapp.trim(),
        contato,
        locais_entrega: locais,
      });

      onLojaAtualizada({
        nome: nome.trim(),
        descricao: descricao.trim(),
        whatsapp: whatsapp.trim(),
        contato,
        locais_entrega: locais,
      });

      setMensagemPerfil({ tipo: "sucesso", texto: "Perfil universitário atualizado com sucesso!" });
    } catch (err) {
      setMensagemPerfil({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao salvar alterações.",
      });
    } finally {
      setSalvandoPerfil(false);
    }
  }

  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
      <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-1">
        Editar Perfil Universitário
      </h2>
      <p className="text-xs text-gray-500 mb-6">
        Essas informações aparecem no seu perfil público para os outros alunos do campus.
      </p>

      {mensagemPerfil && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            mensagemPerfil.tipo === "sucesso"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{mensagemPerfil.tipo === "sucesso" ? "✓" : "⚠️"}</span>
          <span>{mensagemPerfil.texto}</span>
        </div>
      )}

      <form onSubmit={handleSalvarPerfil} className="space-y-5">
        {/* Upload Foto de Perfil */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            Foto de Perfil
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
              {loja.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loja.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  {nome.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:border-gray-400 bg-white font-semibold text-xs text-gray-700 cursor-pointer transition shadow-2xs">
                <span>{avatarUploading ? "Enviando..." : "Alterar foto"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={avatarUploading}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-gray-400 mt-1">
                Formatos JPG, PNG ou WebP até 3 MB.
              </p>
            </div>
          </div>
        </div>

        {/* Nome de Exibição */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Nome de Exibição *
          </label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            WhatsApp para Negociação *
          </label>
          <input
            type="tel"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(31) 99999-9999"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Os colegas usam este número para combinar compras e trocas com você.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Bio / Apresentação
          </label>
          <textarea
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Aluno do 4º semestre de Engenharia desapegando de livros do ciclo básico..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white resize-y"
          />
        </div>

        {/* Locais de Encontro */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Locais que você costuma entregar no campus
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {LOCAIS_SUGERIDOS.map((local) => {
              const ativo = locais.includes(local);
              return (
                <button
                  key={local}
                  type="button"
                  onClick={() => toggleLocal(local)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                    ativo
                      ? "bg-[#FF385C] border-[#FF385C] text-white font-bold"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{ativo ? "✓" : "+"}</span>
                  <span>{local}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <Link
            href={`/perfil/${loja.id}`}
            className="text-xs font-bold text-[#FF385C] hover:underline"
          >
            Ver meu perfil público →
          </Link>

          <button
            type="submit"
            disabled={salvandoPerfil}
            className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {salvandoPerfil ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>

      {/* Seção de Verificação Acadêmica */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-base font-black text-gray-900">
              Verificação de Matrícula & Vínculo
            </h3>
          </div>

          {matriculaStatus === "verificado" ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
              <span>✓</span>
              <span>Aluno Verificado</span>
            </span>
          ) : matriculaStatus === "pendente" ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
              <span>⏳</span>
              <span>Em Análise</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold px-3 py-1 rounded-full">
              <span>⚠️</span>
              <span>Não Verificado</span>
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          O selo <strong>Aluno Verificado 🛡️</strong> confirma seu vínculo ativo com a universidade, gerando confiança imediata para outros estudantes comprarem ou trocarem com você no campus.
        </p>

        {mensagemVerificacao && (
          <div
            className={`mb-5 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              mensagemVerificacao.tipo === "sucesso"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <span>{mensagemVerificacao.tipo === "sucesso" ? "🎉" : "⚠️"}</span>
            <span>{mensagemVerificacao.texto}</span>
          </div>
        )}

        {matriculaStatus === "verificado" ? (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 text-emerald-900">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-lg font-bold">
                🛡️
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-950">
                  Sua credencial de estudante está ativa!
                </h4>
                <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                  Todos os seus anúncios, vitrine e perfil contam com o selo oficial de Aluno Verificado.
                </p>
                {usuario?.matricula && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                    Matrícula registrada: {usuario.matricula}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Opção 1: Validação Instantânea por E-mail Institucional */}
            {emailEhUniversitario && (
              <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Recomendado & Instantâneo ⚡
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1">
                      Validar com seu e-mail institucional
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Detectamos que seu e-mail <strong>{userEmail}</strong> pertence a um domínio acadêmico reconhecido.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={verificandoInstantaneo}
                    onClick={handleValidacaoInstantanea}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs shrink-0 disabled:opacity-50"
                  >
                    {verificandoInstantaneo ? "Validando..." : "Validar Agora (1 clique)"}
                  </button>
                </div>
              </div>
            )}

            {/* Opção 2: Validação por Matrícula e Faculdade */}
            <div className="bg-gray-50 border border-gray-200/90 rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-bold text-gray-800 mb-1">
                {emailEhUniversitario ? "Ou informe sua matrícula para o registro:" : "Informe seus dados acadêmicos para validação:"}
              </h4>
              <p className="text-[11px] text-gray-500 mb-4">
                Envie sua matrícula para que nossa moderação valide seu vínculo acadêmico.
              </p>

              <form onSubmit={handleSubmeterMatricula} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Sua Faculdade / Campus
                    </label>
                    <select
                      value={instituicaoSelecionada}
                      onChange={(e) => setInstituicaoSelecionada(e.target.value ? Number(e.target.value) : "")}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none bg-white"
                    >
                      <option value="">Selecione sua instituição...</option>
                      {instituicoes.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Número da Matrícula Acadêmica *
                    </label>
                    <input
                      type="text"
                      required
                      value={matriculaInput}
                      onChange={(e) => setMatriculaInput(e.target.value)}
                      placeholder="Ex: 2024019283"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={enviandoMatricula || !matriculaInput.trim()}
                    className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-xs disabled:opacity-50"
                  >
                    {enviandoMatricula ? "Enviando..." : matriculaStatus === "pendente" ? "Atualizar Dados em Análise" : "Solicitar Verificação de Matrícula"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
