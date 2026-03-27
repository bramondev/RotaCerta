import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Mail, Lock, Eye, EyeOff, Bike, Store, Package, Palette, Gauge, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";

const Register = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "motoboy",
    bikeModel: "",
    bikeColor: "",
    bikePlate: "",
    bikeKm: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasUpperCase) return "A senha deve conter pelo menos uma letra maiúscula";
    if (!hasSpecialChar) return "A senha deve conter pelo menos um caractere especial";
    if (password.length < 4) return "A senha deve ter pelo menos 4 caracteres";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.userType === "motoboy" && step === 1) {
      setStep(2);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast({ title: "Senha inválida", description: passwordError, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
     
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            user_type: formData.userType,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: formData.name,
            user_type: formData.userType,
            bike_model: formData.bikeModel,
            bike_color: formData.bikeColor,
            bike_plate: formData.bikePlate,
            bike_km: Number(formData.bikeKm) || 0,
            current_km: Number(formData.bikeKm) || 0
          })
          .select()
          .single();

        if (profileError) throw profileError;
      }
      
      queryClient.clear();
      toast({ title: "Cadastro realizado!", description: "Bem-vindo à Rota Certa!" });
      
      
      if (formData.userType === 'frete') {
          navigate("/admin-fretes");
      } else if (formData.userType === 'motopecas') {
          navigate("/admin-loja"); 
      } else {
          navigate("/home");
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nao foi possivel concluir o cadastro.";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 pb-12 justify-center text-white font-sans">
      <div className="w-full max-w-md">
        <BrandLogo
          className="mx-auto mb-5 h-32 w-32 border border-yellow-500/20 shadow-lg shadow-yellow-500/10"
        />
        <h1 className="text-2xl font-black mb-2 text-center italic text-yellow-500">
          {step === 1 ? "CRIE SUA CONTA" : "SUA MÁQUINA"}
        </h1>
        <p className="text-zinc-400 text-center mb-8 text-xs font-bold uppercase tracking-widest">
          {step === 1 ? "Defina seu perfil no app" : "Para controle de manutenção da garagem"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {step === 1 ? (
            <>
             
              <div className="grid grid-cols-3 gap-2 mb-8">
                <button type="button" onClick={() => setFormData({...formData, userType: "motoboy"})} className={cn("flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all", formData.userType === "motoboy" ? "border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-lg shadow-yellow-500/20" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600")}>
                  <Bike size={28} className="mb-2" />
                  <span className="text-[10px] font-black uppercase text-center">Motoboy</span>
                </button>

                <button type="button" onClick={() => setFormData({...formData, userType: "frete"})} className={cn("flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all", formData.userType === "frete" ? "border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-lg shadow-yellow-500/20" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600")}>
                  <Package size={28} className="mb-2" />
                  <span className="text-[10px] font-black uppercase text-center">Lojista<br/><span className="text-[8px] text-zinc-500">(Pede Frete)</span></span>
                </button>

                <button type="button" onClick={() => setFormData({...formData, userType: "motopecas"})} className={cn("flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all", formData.userType === "motopecas" ? "border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-lg shadow-yellow-500/20" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600")}>
                  <Store size={28} className="mb-2" />
                  <span className="text-[10px] font-black uppercase text-center">Motopeças<br/><span className="text-[8px] text-zinc-500">(Vende Peça)</span></span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input type="text" placeholder="Nome completo ou da Empresa" className="w-full bg-zinc-900 text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input type="email" placeholder="E-mail" className="w-full bg-zinc-900 text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input type={showPassword ? "text" : "password"} placeholder="Senha (Letra Maiúscula e Símbolo)" className="w-full bg-zinc-900 text-white pl-12 pr-12 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-yellow-500">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirmar senha" className="w-full bg-zinc-900 text-white pl-12 pr-12 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                </div>
              </div>
            </>
          ) : (
            <>
             
              <div className="space-y-4">
                <div className="relative">
                  <Bike className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input type="text" placeholder="Modelo (Ex: Titan 160)" className="w-full bg-zinc-900 text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.bikeModel} onChange={(e) => setFormData({...formData, bikeModel: e.target.value})} required />
                </div>
                <div className="relative">
                  <Palette className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input type="text" placeholder="Cor (Ex: Vermelha)" className="w-full bg-zinc-900 text-white pl-12 pr-4 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.bikeColor} onChange={(e) => setFormData({...formData, bikeColor: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-[10px]">PLACA</span>
                    <input type="text" placeholder="ABC1D23" className="w-full bg-zinc-900 text-white pl-14 pr-2 py-4 rounded-xl border border-zinc-800 uppercase focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.bikePlate} onChange={(e) => setFormData({...formData, bikePlate: e.target.value})} required />
                  </div>
                  <div className="relative">
                    <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                    <input type="number" placeholder="Km Atual" className="w-full bg-zinc-900 text-white pl-12 pr-2 py-4 rounded-xl border border-zinc-800 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={formData.bikeKm} onChange={(e) => setFormData({...formData, bikeKm: e.target.value})} required />
                  </div>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest py-4 rounded-xl mt-8 disabled:opacity-50 shadow-lg shadow-yellow-500/20" disabled={loading}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (step === 1 && formData.userType === "motoboy" ? "Próximo Passo (Moto)" : "Finalizar Cadastro")}
          </button>
          
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="w-full text-zinc-500 text-xs font-bold uppercase mt-4 hover:text-white transition-colors">Voltar</button>
          )}
        </form>

        <p className="text-zinc-500 text-center mt-8 text-sm">
          Já é cadastrado? <Link to="/login" className="text-yellow-500 font-bold hover:underline">Acessar Conta</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
