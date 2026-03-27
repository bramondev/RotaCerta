import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BrandLogo from "@/components/BrandLogo";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      
      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', authData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error("Erro ao buscar perfil:", profileError);
        }

        const userType = profileData?.user_type || 'motoboy'; 

        toast({ title: "Bem-vindo de volta! 🚀" });

        
        if (userType === 'frete') {
          navigate("/admin-fretes");
        } else if (userType === 'motopecas') {
          
          navigate("/admin-loja"); 
        } else {
          
          navigate("/home");
        }
      }
    } catch {
      toast({ title: "Erro de acesso", description: "Verifique o seu e-mail e senha.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
      setShowResetDialog(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nao foi possivel enviar o e-mail de recuperacao.";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleBiometrics = () => {
    toast({ title: "Biometria", description: "A leitura de FaceID/Digital será ativada na próxima atualização!" });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
            <BrandLogo
              className="mx-auto mb-5 h-32 w-32 border border-yellow-500/20 shadow-lg shadow-yellow-500/10"
            />
            <h1 className="text-yellow-500 text-3xl font-black italic tracking-widest uppercase">Rota Certa</h1>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-[0.2em]">Painel de Acesso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              className="w-full bg-zinc-900 text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              className="w-full bg-zinc-900 text-white pl-12 pr-12 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-yellow-500 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="flex justify-end mt-2">
            <button type="button" onClick={() => setShowResetDialog(true)} className="text-xs font-bold text-zinc-400 hover:text-yellow-500 transition-colors">
              Esqueceu a senha?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest py-4 rounded-xl mt-6 disabled:opacity-50 transition-colors shadow-lg shadow-yellow-500/20"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Entrar no Sistema"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-black px-4 text-zinc-500">Acesso Rápido</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBiometrics}
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-800 hover:border-yellow-500/50 transition-all"
        >
          <Fingerprint size={20} className="text-yellow-500" />
          Usar Face ID / Biometria
        </button>

        <p className="text-zinc-400 text-center mt-8 text-sm">
          Ainda não é cadastrado?{" "}
          <Link to="/register" className="text-yellow-500 font-bold hover:underline">
            Criar minha conta
          </Link>
        </p>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md border border-yellow-500/20 bg-zinc-950 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 italic">Recuperar acesso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="email"
                placeholder="Digite o e-mail cadastrado"
                className="w-full bg-black text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest py-4 rounded-xl disabled:opacity-50"
              disabled={resetLoading}
            >
              {resetLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Enviar link de recuperação"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
