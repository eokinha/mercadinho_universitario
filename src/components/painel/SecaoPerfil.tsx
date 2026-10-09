import { useState, useMemo } from "react";
import Link from "next/link";
import {
  solicitarVerificacaoMatricula,
  updateLoja,
  verificarMatriculaInstantanea,
} from "@/lib/queries";
import { normalizarTelefone } from "@/lib/contato";
import { uploadImagemLoja } from "@/lib/storage";
import SeloVerificado from "@/components/SeloVerificado";
import { validarEmailUniversitario } from "@/lib/validacoes";
import type { Instituicao, Loja, Usuario } from "@/types";
import {
  Check,
  CircleCheck,
  Clock,
  Plus,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

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

      setMensagemPerfil({ tipo: "sucesso", texto: "Perfil atualizado." });
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
    <div className="w-full bg-superficie border border-borda rounded-card p-6 sm:p-8">
      <h2 className="text-lg sm:text-xl font-bold text-petroleo mb-1">
        Editar perfil
      </h2>
      <p className="text-sm text-tinta-suave mb-6">
        Essas informações aparecem no seu perfil público para os outros alunos do campus.
      </p>

      {mensagemPerfil && (
        <div
          className={`mb-6 p-4 rounded-card text-xs font-semibold flex items-center gap-2 ${
            mensagemPerfil.tipo === "sucesso"
              ? "bg-troca-50 text-troca-texto"
              : "bg-perigo-50 text-perigo"
          }`}
        >
          <span aria-hidden="true">{mensagemPerfil.tipo === "sucesso" ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />}</span>
          <span>{mensagemPerfil.texto}</span>
        </div>
      )}

      <form onSubmit={handleSalvarPerfil} className="space-y-5">
        {/* Upload Foto de Perfil */}
        <div>
          <label className="block text-sm font-semibold text-tinta mb-2">
            Foto de Perfil
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-card bg-pagina border border-borda overflow-hidden shrink-0 flex items-center justify-center">
              {loja.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loja.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-tinta-sutil">
                  {nome.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-controle border border-borda-controle hover:border-borda-controle bg-superficie font-semibold text-xs text-tinta cursor-pointer transition">
                <span>{avatarUploading ? "Enviando..." : "Alterar foto"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={avatarUploading}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-tinta-sutil mt-1">
                Formatos JPG, PNG ou WebP até 3 MB.
              </p>
            </div>
          </div>
        </div>

        {/* Nome de Exibição */}
        <div>
          <label className="block text-sm font-semibold text-tinta mb-1">
            Nome de Exibição *
          </label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-2.5 min-h-[44px] rounded-controle border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 text-sm bg-superficie"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-semibold text-tinta mb-1">
            WhatsApp para Negociação *
          </label>
          <input
            type="tel"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(31) 99999-9999"
            className="w-full px-4 py-2.5 min-h-[44px] rounded-controle border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 text-sm bg-superficie"
          />
          <p className="text-xs text-tinta-sutil mt-1">
            Os colegas usam este número para combinar compras e trocas com você.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-tinta mb-1">
            Bio / Apresentação
          </label>
          <textarea
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Aluno do 4º semestre de Engenharia desapegando de livros do ciclo básico..."
            className="w-full px-4 py-2.5 min-h-[44px] rounded-controle border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 text-sm bg-superficie resize-y"
          />
        </div>

        {/* Locais de Encontro */}
        <div>
          <label className="block text-sm font-semibold text-tinta mb-1">
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
                  aria-pressed={ativo}
                  className={`text-sm px-4 min-h-[44px] rounded-pill border transition flex items-center gap-1.5 ${
                    ativo
                      ? "bg-petroleo border-petroleo text-white font-semibold"
                      : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                  }`}
                >
                  {ativo ? (
                    <Check size={14} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {local}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="pt-4 border-t border-borda flex items-center justify-between">
          <Link
            href={`/perfil/${loja.id}`}
            className="text-sm font-semibold text-petroleo hover:underline"
          >
            Ver meu perfil público
          </Link>

          <button
            type="submit"
            disabled={salvandoPerfil}
            className="bg-acao hover:bg-acao-hover text-white text-sm font-semibold px-4 py-2.5 min-h-[44px] rounded-controle transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            {salvandoPerfil ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>

      {/* Seção de Verificação Acadêmica */}
      <div className="mt-8 pt-8 border-t border-borda">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} strokeWidth={1.75} className="text-petroleo" aria-hidden="true" />
            <h3 className="text-base font-bold text-petroleo">Verificação de matrícula</h3>
          </div>

          {matriculaStatus === "verificado" ? (
            <SeloVerificado tamanho="md" />
          ) : matriculaStatus === "pendente" ? (
            <span className="inline-flex items-center gap-1.5 bg-doacao-50 text-doacao text-xs font-bold px-3 py-1 rounded-pill">
              <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>Em análise</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-pagina text-tinta border border-borda-controle text-xs font-bold px-3 py-1 rounded-pill">
              <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>Não verificado</span>
            </span>
          )}
        </div>

        <p className="text-sm text-tinta-suave mb-5 leading-relaxed">
          O selo <strong>Verificado</strong> mostra que você tem vínculo ativo com a universidade. Só alunos verificados podem anunciar.
        </p>

        {mensagemVerificacao && (
          <div
            className={`mb-5 p-4 rounded-card text-xs font-semibold flex items-center gap-2 ${
              mensagemVerificacao.tipo === "sucesso"
                ? "bg-troca-50 text-troca-texto"
                : "bg-perigo-50 text-perigo"
            }`}
          >
            <span aria-hidden="true">{mensagemVerificacao.tipo === "sucesso" ? <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" /> : <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />}</span>
            <span>{mensagemVerificacao.texto}</span>
          </div>
        )}

        {matriculaStatus === "verificado" ? (
          <div className="bg-petroleo-50 rounded-card p-5 text-petroleo">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-pill bg-superficie flex items-center justify-center shrink-0">
                <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Sua matrícula está verificada</h4>
                <p className="text-sm mt-1 leading-relaxed">Seus anúncios e seu perfil mostram o selo Verificado.</p>
                {usuario?.matricula && (
                  <p className="text-xs font-semibold mt-2">
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
              <div className="bg-troca-50 rounded-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-troca-texto bg-superficie px-2.5 py-1 rounded-pill">
                      Recomendado
                    </span>
                    <h4 className="text-sm font-bold text-tinta mt-1">
                      Validar com seu e-mail institucional
                    </h4>
                    <p className="text-xs text-tinta-suave mt-0.5">
                      Detectamos que seu e-mail <strong>{userEmail}</strong> pertence a um domínio acadêmico reconhecido.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={verificandoInstantaneo}
                    onClick={handleValidacaoInstantanea}
                    className="bg-acao hover:bg-acao-hover text-white text-sm font-semibold px-4 py-2.5 min-h-[44px] rounded-controle transition shrink-0 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
                  >
                    {verificandoInstantaneo ? "Validando..." : "Validar agora"}
                  </button>
                </div>
              </div>
            )}

            {/* Opção 2: Validação por Matrícula e Faculdade */}
            <div className="bg-pagina border border-borda rounded-card p-4 sm:p-5">
              <h4 className="text-sm font-semibold text-tinta mb-1">
                {emailEhUniversitario ? "Ou informe sua matrícula para o registro:" : "Informe seus dados acadêmicos para validação:"}
              </h4>
              <p className="text-sm text-tinta-suave mb-4">
                A moderação confere sua matrícula e libera o selo.
              </p>

              <form onSubmit={handleSubmeterMatricula} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-tinta mb-1">
                      Sua faculdade ou campus
                    </label>
                    <select
                      value={instituicaoSelecionada}
                      onChange={(e) => setInstituicaoSelecionada(e.target.value ? Number(e.target.value) : "")}
                      className="w-full text-sm px-3 py-2 min-h-[44px] rounded-controle border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 bg-superficie"
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
                    <label className="block text-sm font-semibold text-tinta mb-1">
                      Número da matrícula *
                    </label>
                    <input
                      type="text"
                      required
                      value={matriculaInput}
                      onChange={(e) => setMatriculaInput(e.target.value)}
                      placeholder="Ex: 2024019283"
                      className="w-full text-sm px-3 py-2 min-h-[44px] rounded-controle border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 bg-superficie"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={enviandoMatricula || !matriculaInput.trim()}
                    className="bg-superficie text-petroleo border border-borda-controle hover:border-petroleo text-sm font-semibold px-4 py-2.5 min-h-[44px] rounded-controle transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
                  >
                    {enviandoMatricula ? "Enviando..." : matriculaStatus === "pendente" ? "Atualizar dados enviados" : "Enviar matrícula"}
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
