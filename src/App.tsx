/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Send, Phone, Mail, User, Instagram, BookOpen, BarChart3, TrendingUp, Target, ShieldCheck, LogIn, LogOut, LayoutDashboard, X, Trash2 } from 'lucide-react';
import React, { useState, FormEvent, useEffect, Component, ReactNode } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Removed throw to prevent crashing the entire application UI
}

class ErrorBoundary extends React.Component<any, any> {
  public state: any;
  public props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0F14] text-white flex items-center justify-center p-8 font-sans">
          <div className="max-w-md w-full bg-red-900/20 border border-red-500/50 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4 tracking-tight">Falha ao carregar</h1>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">Pode haver um problema técnico impedindo o carregamento. Tente atualizar a página ou entrar em contato com o suporte.</p>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-bold">Log de Erro:</p>
              <pre className="text-red-400/80 text-[11px] font-mono overflow-auto max-h-32">
                {this.state.error?.message || "Erro desconhecido"}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] border border-red-500/50 transition-all"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    mensagem: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setShowDashboard(false);
        setLeads([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && showDashboard) {
      setIsLoadingLeads(true);
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLeads(leadsData);
        setIsLoadingLeads(false);
      }, (error) => {
        setIsLoadingLeads(false);
        handleFirestoreError(error, OperationType.LIST, 'leads');
      });
      return () => unsubscribe();
    }
  }, [user, showDashboard]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const email = (e.target as any).email.value;
    const password = (e.target as any).password.value;

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        await deleteDoc(doc(db, 'leads', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `leads/${id}`);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const leadsPath = 'leads';
      await addDoc(collection(db, leadsPath), {
        ...formData,
        createdAt: serverTimestamp()
      });
      
      setFormData({ nome: '', telefone: '', email: '', mensagem: '' });
      alert('✅ Dados enviados com sucesso! Entraremos em contato em breve.');
    } catch (error: any) {
      console.error('Erro ao enviar lead:', error);
      handleFirestoreError(error, OperationType.CREATE, 'leads');
      alert(`❌ Erro ao enviar: ${error.message || 'Verifique as configurações do Firebase'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 selection:bg-brand selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 card-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold tracking-tighter text-brand-gradient uppercase">Consultoria Vendas</div>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <button 
                  onClick={() => setShowDashboard(!showDashboard)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand hover:text-white transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" /> {showDashboard ? 'Voltar Site' : 'Minha Área'}
                </button>
                <button 
                  onClick={() => signOut(auth)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-brand transition-colors"
              >
                <LogIn className="w-4 h-4" /> Area do Cliente
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md card-blur p-8 rounded-2xl border border-white/10 shadow-2xl"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold mb-6">{authMode === 'login' ? 'Login Area do Cliente' : 'Criar Nova Conta'}</h2>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                  <input name="email" type="email" required className="input-field" placeholder="seu@email.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Senha</label>
                  <input name="password" type="password" required className="input-field" placeholder="******" />
                </div>
                {authError && <p className="text-red-500 text-xs">{authError}</p>}
                <button type="submit" className="w-full brand-gradient py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg">
                  {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
                </button>
              </form>
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="w-full text-center mt-4 text-xs text-gray-500 hover:text-brand underline"
              >
                {authMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dashboard View */}
      {user && showDashboard ? (
        <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-white uppercase tracking-tighter">Dashboard de <span className="text-brand">Leads</span></h1>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{leads.length} Leads Ativos</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <div key={lead.id} className="card-blur p-6 rounded-xl border border-white/5 relative group hover:border-brand/30 transition-all duration-300">
                    <button 
                      onClick={() => handleDeleteLead(lead.id)}
                      className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold uppercase border border-brand/20">
                        {lead.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{lead.nome}</h3>
                        <p className="text-xs text-brand font-medium uppercase tracking-wider">{lead.mensagem || 'Sem Instagram'}</p>
                      </div>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                        <Phone className="w-4 h-4 text-brand" /> {lead.telefone}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                        <Mail className="w-4 h-4 text-brand" /> {lead.email}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest border-t border-white/5 pt-4 flex justify-between items-center">
                      <span>Recebido em:</span>
                      <span className="text-gray-500">{lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString() : 'Hoje'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-500 italic border-2 border-dashed border-white/5 rounded-2xl">
                  Nenhum lead capturado ainda.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Background Subtle Pattern */}
          <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Hero Section - Headline + Form Immediately */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column: Aggressive Headline */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 border border-brand/20 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
              <span className="text-brand text-xs font-bold uppercase tracking-widest">Consultoria Estratégica</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl xl:text-6xl font-bold leading-[1.1] uppercase">
              Para de jogar seu <span className="text-brand-gradient">dinheiro no lixo</span> com anúncios,
              sua empresa precisa de uma <span className="underline decoration-brand/50">gestão comercial</span>.
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed">
              Tráfego pago sem processo de vendas é apenas gasto. Eu ajudo você a estruturar seu time, processos e tecnologia para converter leads em faturamento real.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="flex flex-col gap-2">
                <BarChart3 className="text-brand w-8 h-8" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Métricas</span>
              </div>
              <div className="flex flex-col gap-2">
                <Target className="text-brand w-8 h-8" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversão</span>
              </div>
              <div className="flex flex-col gap-2">
                <TrendingUp className="text-brand w-8 h-8" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Escala</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: High Conversion Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="card-blur p-8 rounded-2xl shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 brand-gradient"></div>
            
            <h2 className="text-2xl font-bold mb-2">Consultoria Gratuita</h2>
            <p className="text-gray-400 mb-8 text-sm">Preencha os dados abaixo e agende uma reunião individual para analisarmos seu processo comercial.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Seu Nome Completo" 
                  className="input-field pl-4"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div className="relative group">
                <input 
                  type="tel" 
                  placeholder="Seu melhor Celular/WhatsApp" 
                  className="input-field pl-4"
                  required
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>
              <div className="relative group">
                <input 
                  type="email" 
                  placeholder="Seu melhor E-mail" 
                  className="input-field pl-4"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Qual é o Instagram da sua empresa?" 
                  className="input-field pl-4"
                  required
                  value={formData.mensagem}
                  onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                className={`w-full brand-gradient text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-lg shadow-[0_10px_20px_rgba(0,209,255,0.2)] transition-all hover:shadow-[0_10px_25px_rgba(0,209,255,0.4)] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Enviando...' : 'Solicitar Consultoria'} <Send className="w-5 h-5" />
              </motion.button>
              
              <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                <ShieldCheck className="w-3 h-3 text-brand" /> Seus dados estão 100% seguros conosco
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Presentation Section (Moved Down and Updated) */}
      <section className="py-24 bg-surface border-y border-white/5 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex-1 text-left"
            >
              <h2 className="text-sm font-bold text-brand uppercase tracking-[0.3em] mb-4">Especialista em Performance</h2>
              <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 uppercase leading-tight">
                Sua Empresa por uma <br />
                <span className="italic font-serif text-gray-400 text-3xl md:text-5xl">Gestão de Vendas</span>
              </h3>

              <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                <p>
                  Ajudo empresários a saírem da <strong className="text-white font-bold">dependência da sorte</strong> e construírem um processo de vendas previsível.
                </p>
                <p>
                  O tráfego pago até traz clientes, mas a maioria das empresas perde dinheiro porque não sabe atender, não qualifica e não faz follow-up.
                </p>
                <div className="py-4">
                  <p className="text-xl md:text-2xl font-bold text-brand leading-tight italic">
                    "O problema não é falta de leads — é falta de processo."
                  </p>
                </div>
                <p>
                  Na minha consultoria, eu estruturo o seu comercial com CRM organizado, roteiro de atendimento e um processo claro para não deixar nenhuma oportunidade escapar.
                </p>
              </div>

              <div className="mt-12 flex flex-wrap gap-4">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 tracking-widest uppercase">ESTRUTURAÇÃO DE CRM</div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 tracking-widest uppercase">TREINAMENTO DE VENDAS</div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 tracking-widest uppercase">AUDITORIA DE PROCESSOS</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="flex-1 relative group"
            >
              <div className="absolute -inset-4 bg-brand/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                <img 
                  src="/profile.png?v=6" 
                  alt="Especialista em Performance" 
                  className="w-full h-full object-cover transition-all duration-1000 scale-105 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="inline-flex flex-col p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                    <span className="text-3xl font-bold text-brand mb-0">10+</span>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Anos de Experiência</span>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/10 blur-2xl rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand/5 blur-3xl rounded-full"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ebook Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto brand-gradient p-1 rounded-3xl">
          <div className="bg-dark-bg rounded-[calc(1.5rem-1px)] p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 uppercase">
                Manual da Previsibilidade <span className="text-brand">Vendas</span>
              </h2>
              <p className="text-gray-400 mb-8 text-lg">
                Baixe gratuitamente o guia prático para estruturar o comercial da sua empresa e parar de depender da sorte.
              </p>
              <a 
                href={`/manual.pdf?v=6`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand text-white font-bold py-4 px-8 rounded-sm flex items-center justify-center gap-3 text-lg shadow-xl uppercase tracking-widest hover:bg-brand/90 transition-colors animate-pulse hover:animate-none"
              >
                <BookOpen className="w-6 h-6" /> BAIXAR E-BOOK AGORA
              </a>
            </div>

            <div className="w-48 md:w-64 relative z-10">
              <div className="aspect-[3/4] bg-surface border-2 border-brand/30 rounded-lg shadow-2xl flex flex-col p-4 relative overflow-hidden group hover:rotate-2 transition-transform duration-500">
                <div className="h-1 w-full bg-brand mb-4"></div>
                <div className="text-xs font-bold text-brand uppercase tracking-tighter mb-2">E-book Gratuito</div>
                <div className="text-lg font-bold leading-tight mb-4 uppercase">GESTÃO DE VENDAS PARA <span className="text-brand">SUA EMPRESA</span></div>
                <div className="mt-auto h-4 w-12 bg-white/10 rounded-sm"></div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-brand/20 blur-xl rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      <footer className="py-12 px-6 border-t border-white/5 text-center flex flex-col items-center gap-6">
        <div className="text-2xl font-bold tracking-tighter text-brand-gradient uppercase">Consultoria Comercial</div>
        <p className="text-gray-600 text-xs font-medium uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Especialista em Vendas. Sua empresa em outro nível.</p>
      </footer>
    </div>
  );
}
