import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { updateLoja } from "@/lib/queries";
import { createServerClient as createSupabaseClient } from "@/lib/supabase";
import { uploadImagemLoja, uploadImagemProduto } from "@/lib/storage";
import type { Loja, Produto } from "@/types";
import { getLojaByAuthId, getProdutosPrivados } from "@/lib/queries";

interface Props {
  loja: Loja | null;
  produtos: Produto[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = createSupabaseClient(ctx);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const loja = await getLojaByAuthId(user.id, supabase);
  const produtos = loja ? await getProdutosPrivados(loja.id, supabase) : [];

  return {
    props: {
      loja,
      produtos,
    },
  };
};

type Section = "visao-geral" | "personalizar" | "produtos" | "perfil" | "favoritos" | "configuracoes";

export default function MinhaLojaPage({ loja: initialLoja, produtos: initialProdutos }: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("visao-geral");
  const [loja, setLoja] = useState<Loja | null>(initialLoja);
  const [produtos, setProdutos] = useState<Produto[]>(initialProdutos);

  async function refreshData() {
    const supabase = (await import("@/lib/supabase")).supabase;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const updatedLoja = await getLojaByAuthId(user.id);
      if (updatedLoja) {
        setLoja(updatedLoja);
        const updatedProdutos = await getProdutosPrivados(updatedLoja.id);
        setProdutos(updatedProdutos);
      }
    }
  }

  if (!loja) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Você ainda não tem uma loja</h1>
        <p className="text-gray-500 mb-8">Para começar a vender, você precisa solicitar a criação de uma loja.</p>
        <Link href="/contato" className="bg-[#9A2FD6] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#821bbd] transition">
          Falar com administrador
        </Link>
      </div>
    );
  }

  const navItems = [
    { id: "visao-geral", label: "Visão Geral", icon: <IconHome /> },
    { id: "personalizar", label: "Personalizar Loja", icon: <IconPalette /> },
    { id: "produtos", label: "Meus Anúncios", icon: <IconBox /> },
    { id: "favoritos", label: "Meus Favoritos", icon: <IconHeart /> },
    { id: "perfil", label: "Meu Perfil", icon: <IconUser /> },
    { id: "configuracoes", label: "Configurações", icon: <IconSettings /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Painel do Vendedor</h2>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as Section)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeSection === item.id
                    ? "bg-[#9A2FD6]/10 text-[#9A2FD6]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-gray-100">
           <Link href={`/lojas/${loja.id}`} target="_blank" className="text-sm text-[#9A2FD6] font-medium hover:underline flex items-center gap-2">
             <IconExternalLink />
             Ver página pública
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {activeSection === "visao-geral" && <SectionVisaoGeral loja={loja} produtos={produtos} />}
          {activeSection === "personalizar" && <SectionPersonalizar loja={loja} onUpdate={refreshData} />}
          {activeSection === "produtos" && <SectionProdutos produtos={produtos} onUpdate={refreshData} />}
          {activeSection === "favoritos" && <SectionFavoritos />}
          {activeSection === "perfil" && <SectionPerfil />}
          {activeSection === "configuracoes" && <SectionConfiguracoes loja={loja} />}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id as Section)}
            className={`flex flex-col items-center gap-1 p-2 ${
              activeSection === item.id ? "text-[#9A2FD6]" : "text-gray-400"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
      <div className="h-16 md:hidden" /> {/* Spacer for mobile nav */}
    </div>
  );
}

// Icons
function IconHome() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>; }
function IconPalette() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.172-1.172a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>; }
function IconBox() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>; }
function IconHeart() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>; }
function IconUser() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
function IconSettings() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function IconExternalLink() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>; }

// Section Components
function SectionVisaoGeral({ loja, produtos }: { loja: Loja; produtos: Produto[] }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Olá, {loja.nome}! 👋</h1>
        <p className="text-gray-500">Aqui está um resumo da sua Kitanda.</p>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 font-medium">Produtos Ativos</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{produtos.filter(p => p.status === 'ativo').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 font-medium">Visualizações (Mês)</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">--</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 font-medium">Contatos Recebidos</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">--</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-4">Dicas para vender mais</h2>
        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-2">✨ Use fotos claras e bem iluminadas.</li>
          <li className="flex gap-2">📝 Descreva bem o estado do seu produto.</li>
          <li className="flex gap-2">💬 Responda rápido no WhatsApp para não perder a venda.</li>
        </ul>
      </div>
    </div>
  );
}

function SectionPersonalizar({ loja, onUpdate }: { loja: Loja; onUpdate: () => void }) {
  const [formData, setFormData] = useState<Partial<Loja>>({
    nome: loja.nome,
    descricao: loja.descricao,
    slug: loja.slug || "",
    whatsapp: loja.whatsapp || "",
    instagram_url: loja.instagram_url || "",
    tiktok_url: loja.tiktok_url || "",
    cor_tema: loja.cor_tema || "#9A2FD6",
    locais_entrega: loja.locais_entrega || [],
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateLoja(loja.id, formData);
      onUpdate();
      alert("Loja atualizada com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar loja");
    } finally {
      setLoading(false);
    }
  }

  const colorOptions = ["#9A2FD6", "#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#000000"];
  const localOptions = ["Cantina", "Biblioteca", "Entrada Principal", "Bloco A", "Bloco B", "Bloco C", "Correios"];

  function toggleLocal(local: string) {
    const current = formData.locais_entrega || [];
    if (current.includes(local)) {
      setFormData({ ...formData, locais_entrega: current.filter(l => l !== local) });
    } else {
      setFormData({ ...formData, locais_entrega: [...current, local] });
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Personalizar Loja</h1>
        <p className="text-gray-500">Deixe sua kitanda com a sua cara.</p>
      </header>

      {/* Preview Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 relative" style={{ backgroundColor: formData.cor_tema + "20" }}>
           {loja.capa_url && <img src={loja.capa_url} className="w-full h-full object-cover" />}
           <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition">
             <UploadButton id="capa" label="Alterar Capa" onUpload={async (f) => { await uploadImagemLoja(loja.id, "capa", f); onUpdate(); }} />
           </div>
        </div>
        <div className="px-6 pb-6 relative">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-white border-4 shadow-sm overflow-hidden relative group" style={{ borderColor: formData.cor_tema }}>
              {loja.avatar_url ? <img src={loja.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                <UploadButton id="avatar" label="Foto" onUpload={async (f) => { await uploadImagemLoja(loja.id, "avatar", f); onUpdate(); }} />
              </div>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-gray-800">{formData.nome || "Minha Loja"}</h2>
              <p className="text-xs text-gray-400">kitanda.com/lojas/{formData.slug || "..."}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800">Informações Básicas</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja</label>
              <input 
                type="text" 
                value={formData.nome || ""} 
                onChange={e => setFormData({...formData, nome: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A2FD6] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Personalizada</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">kitanda.com/</span>
                <input 
                  type="text" 
                  value={formData.slug || ""} 
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                  className="flex-1 min-w-0 block w-full px-4 py-2 border border-gray-300 rounded-none rounded-r-lg focus:ring-2 focus:ring-[#9A2FD6] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea 
                rows={3}
                value={formData.descricao || ""} 
                onChange={e => setFormData({...formData, descricao: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A2FD6] outline-none resize-none"
                placeholder="Conte um pouco sobre sua loja..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-800">Canais de Contato</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (DDD + Número)</label>
              <input 
                type="text" 
                value={formData.whatsapp || ""} 
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A2FD6] outline-none"
                placeholder="31999999999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (@usuario)</label>
              <input 
                type="text" 
                value={formData.instagram_url || ""} 
                onChange={e => setFormData({...formData, instagram_url: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A2FD6] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TikTok (@usuario)</label>
              <input 
                type="text" 
                value={formData.tiktok_url || ""} 
                onChange={e => setFormData({...formData, tiktok_url: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A2FD6] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-800">Identidade e Entrega</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Tema</label>
            <div className="flex gap-3">
              {colorOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({...formData, cor_tema: c})}
                  className={`w-10 h-10 rounded-full border-4 transition ${formData.cor_tema === c ? "border-gray-300" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Locais de Entrega</label>
            <div className="flex flex-wrap gap-2">
              {localOptions.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLocal(l)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    formData.locais_entrega?.includes(l)
                      ? "bg-[#9A2FD6] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-12 py-3 bg-[#9A2FD6] text-white font-bold rounded-xl hover:bg-[#821bbd] transition shadow-md disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionProdutos({ produtos, onUpdate }: { produtos: Produto[]; onUpdate: () => void }) {
  const router = useRouter();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Anúncios</h1>
          <p className="text-gray-500">Gerencie seus produtos à venda.</p>
        </div>
        <Link href="/minha-loja/produtos/novo" className="bg-[#9A2FD6] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#821bbd] transition">
          + Novo Produto
        </Link>
      </div>

      {produtos.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
          <p className="text-gray-400 mb-4">Você ainda não tem produtos cadastrados.</p>
          <Link href="/minha-loja/produtos/novo" className="text-[#9A2FD6] font-bold hover:underline">Cadastrar meu primeiro produto</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {produtos.map((produto) => (
            <div key={produto.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-center group">
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 relative">
                {produto.imagem_url && <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                   <UploadButton id={`prod-${produto.id}`} label="Trocar" onUpload={async (f) => { await uploadImagemProduto(produto.id, f); onUpdate(); }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{produto.nome}</h3>
                <p className="text-[#9A2FD6] font-semibold">R$ {Number(produto.preco).toFixed(2)}</p>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Status: {produto.status}</span>
              </div>
              <div className="flex gap-2">
                 <button className="p-2 text-gray-400 hover:text-gray-600 transition"><IconEdit /></button>
                 <button className="p-2 text-gray-400 hover:text-red-500 transition"><IconTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionFavoritos() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Meus Favoritos</h1>
        <p className="text-gray-500">Produtos que você salvou para ver depois.</p>
      </header>
      <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-gray-200">
        <p className="text-gray-400">Você ainda não salvou nenhum produto.</p>
      </div>
    </div>
  );
}

function SectionPerfil() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <p className="text-gray-500">Gerencie seus dados pessoais.</p>
      </header>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-500 text-sm">Funcionalidade em desenvolvimento: Alteração de nome, e-mail e foto de perfil.</p>
      </div>
    </div>
  );
}

function SectionConfiguracoes({ loja }: { loja: Loja }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-500">Dados da conta e segurança.</p>
      </header>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-500 text-sm">Em breve: Alteração de senha, notificações e encerramento de conta.</p>
      </div>
    </div>
  );
}

// Helpers
function UploadButton({ label, onUpload, id }: { label: string; onUpload: (file: File) => Promise<void>; id: string }) {
  const [loading, setLoading] = useState(false);
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try { await onUpload(file); } catch (err) { alert("Erro no upload"); } finally { setLoading(false); }
  }
  return (
    <label htmlFor={id} className="cursor-pointer bg-white/90 backdrop-blur-sm border border-gray-200 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-gray-700 hover:bg-white transition inline-block">
      {loading ? "..." : label}
      <input id={id} type="file" className="hidden" onChange={handleChange} accept="image/*" disabled={loading} />
    </label>
  );
}

function IconEdit() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>; }
function IconTrash() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>; }
