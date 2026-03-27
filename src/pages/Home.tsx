import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { 
  Plus, DollarSign, ArrowUp, ArrowDown, Wallet, Car, Globe,
  Users, Settings, Trophy, Wrench, ChevronRight, Bot,
  Fuel, User, Loader2, AlertCircle, Lightbulb, BarChart3, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import NavBar from "@/components/NavBar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import ReceiptScanner from "@/components/ReceiptScanner";

const dailyTips = [
  "O que você ganha na pista, não perca no jogo de aposta! Guarde seu suor.",
  "Lembre de lubrificar a corrente hoje! Peça cuidada dura o dobro.",
  "Pneu calibrado economiza gasolina e salva vidas na chuva.",
  "A pressa é inimiga da perfeição (e da sua vida). Pilote com segurança!",
  "Dinheiro no bolso é dinheiro investido, não gasto à toa. Foca na meta!",
  "Trocou o óleo no prazo? O motor agradece e seu bolso também."
];

const onboardingSteps = [
  {
    title: "Monte seu perfil",
    description: "Ajuste sua foto, nome, telefone e dados principais para deixar o app pronto para uso.",
    detail: "Toque no ícone de perfil no topo para editar sua conta.",
    icon: User,
  },
  {
    title: "Controle seu dinheiro",
    description: "Na Home você acompanha saldo, receitas, despesas e a meta diária em tempo real.",
    detail: "Use o botão amarelo para lançar manualmente ou a IA para agilizar.",
    icon: Wallet,
  },
  {
    title: "Use a IA",
    description: "A IA lê comprovantes e ajuda a salvar receita, manutenção e abastecimento.",
    detail: "Se for oficina ou posto, o app já pode atualizar KM e histórico da moto.",
    icon: Bot,
  },
  {
    title: "Cuide da garagem",
    description: "Na Garagem você registra peças trocadas, abastecimentos e acompanha o histórico.",
    detail: "Sempre salve peça, KM e valor para saber quanto tempo cada item durou.",
    icon: Car,
  },
  {
    title: "Explore o ecossistema",
    description: "Você também pode ver entregas, lojas parceiras, WhatsApp da loja e comunidade.",
    detail: "O app foi pensado para ajudar no ganho, na moto e na rotina da pista.",
    icon: Globe,
  },
];

const Home = () => {
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [manualType, setManualType] = useState("receita"); 
  const [welcomeMessage, setWelcomeMessage] = useState("");
  
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showHabitPopup, setShowHabitPopup] = useState(false);
  const [showAIScanner, setShowAIScanner] = useState(false); 
  const [currentTip, setCurrentTip] = useState("");
  
  const [aiStep, setAiStep] = useState(0); 
  const [scannedData, setScannedData] = useState({
    value: 0,
    type: "receita", 
    category: "",
    bikePart: "",
    bikeKm: "",
    pricePerLiter: "" 
  });

  const [currentOdometer, setCurrentOdometer] = useState("");
  const [dailyIncome, setDailyIncome] = useState("");
  const [dailyExpense, setDailyExpense] = useState("");
  const [isSavingHabit, setIsSavingHabit] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const buildScannedData = (overrides: Partial<typeof scannedData> = {}) => ({
    ...scannedData,
    ...overrides,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setWelcomeMessage("Bom dia, campeão! Seus sonhos são possiveis com dedicação.");
    else if (hour >= 12 && hour < 18) setWelcomeMessage("Boa tarde, motorista! A recompensa é certa.");
    else setWelcomeMessage("Boa noite, guerreiro da estrada! Última rota do dia!");

    const checkPopups = () => {
      const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
        localStorage.setItem('habit_popup_count', '0');
      } else {
        const countStr = localStorage.getItem('habit_popup_count') || '0';
        let count = parseInt(countStr, 10);
        count += 1;
        localStorage.setItem('habit_popup_count', count.toString());
        if (count % 2 === 1) {
          setCurrentTip(dailyTips[Math.floor(Math.random() * dailyTips.length)]);
          setShowHabitPopup(true);
        }
      }
    };
    checkPopups();
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setOnboardingStep(0);
    setShowOnboarding(false);
  };

  const handleNextOnboarding = () => {
    if (onboardingStep === onboardingSteps.length - 1) {
      handleCloseOnboarding();
      return;
    }

    setOnboardingStep((prev) => prev + 1);
  };

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id) 
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return { ...data, user };
    }
  });

  const metaDoDia = profile?.meta_diaria ? Number(profile.meta_diaria) : 200.00;
  const currentBikeKm = profile?.bike_km ? Number(profile.bike_km) : 0; 

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', profile?.user?.id],
    enabled: !!profile?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000
  });

  const { data: maintenanceHistory = [] } = useQuery({
    queryKey: ['maintenance-parts', profile?.user?.id],
    enabled: !!profile?.user?.id,
    queryFn: async () => {
        const { data, error } = await supabase.from('maintenance_logs').select('service_type').eq('user_id', profile.user.id);
        if (error) return [];
        const uniqueParts = Array.from(new Set(data.map(item => item.service_type)));
        return uniqueParts.length > 0 ? uniqueParts : ["Óleo do Motor", "Kit Relação", "Pastilha de Freio", "Pneu Traseiro"];
    }
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTransactions = transactions.filter(t => t.date === todayStr || (t.created_at && t.created_at.startsWith(todayStr)));

  const totals = todayTransactions.reduce((acc, transaction) => {
    const amount = Number(transaction.amount);
    if (transaction.type === 'income' || transaction.type === 'receita') acc.income += amount;
    else acc.expenses += amount;
    acc.balance = acc.income - acc.expenses;
    return acc;
  }, { income: 0, expenses: 0, balance: 0 });

  const progressoMeta = Math.max(0, Math.min(100, (totals.balance / metaDoDia) * 100));
  const valorFaltante = Math.max(0, metaDoDia - totals.balance);

  const handleSaveHabit = async () => {
    if (!currentOdometer && !dailyIncome && !dailyExpense) {
      toast({ title: "Ops!", description: "Preencha pelo menos um campo.", variant: "destructive" });
      return;
    }

    if (currentOdometer && Number(currentOdometer) < currentBikeKm) {
      toast({ title: "KM Inválido!", description: `Sua moto já está com ${currentBikeKm} km. O valor não pode ser menor.`, variant: "destructive" });
      return;
    }
    
    setIsSavingHabit(true);
    try {
      if (!profile?.user?.id) throw new Error("Usuário não logado");
      
      if (dailyIncome) {
        await supabase.from('transactions').insert([{ type: 'income', amount: Number(dailyIncome), title: 'Fechamento do Dia', date: todayStr, user_id: profile.user.id }]);
      }
      if (dailyExpense) {
        await supabase.from('transactions').insert([{ type: 'expense', amount: Number(dailyExpense), title: 'Gastos do Dia', date: todayStr, user_id: profile.user.id }]);
      }
      
      if (currentOdometer || profile?.reputation_points !== undefined) {
        const updateData: Record<string, number> = {};
        if (currentOdometer) updateData.bike_km = Number(currentOdometer); 
        if (profile?.reputation_points !== undefined) updateData.reputation_points = profile.reputation_points + 5;
        await supabase.from('profiles').update(updateData).eq('id', profile.user.id);
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      toast({ title: "Fechamento registrado! 🏆", description: "Dados salvos e +5 pts de moral!" });
      setShowHabitPopup(false);
      setCurrentOdometer(""); setDailyIncome(""); setDailyExpense("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingHabit(false);
    }
  };

  const addTransactionMutation = useMutation({
    mutationFn: async (newTransaction: any) => {
      const { data, error } = await supabase.from('transactions').insert([newTransaction]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsAddingTransaction(false);
      toast({ title: "Dinheiro na conta!", description: "Movimentação registrada." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  });

  const finalizeAITransaction = async (transactionData = scannedData) => {
    try {
      if (!profile?.user?.id) return;

      if (!transactionData.value || Number(transactionData.value) <= 0) {
        toast({ title: "Valor inválido", description: "A IA precisa de um valor maior que zero para salvar.", variant: "destructive" });
        return;
      }

      if (transactionData.category === "fuel" || transactionData.category === "maintenance") {
         const newKm = Number(transactionData.bikeKm);
         if (!newKm || newKm < currentBikeKm) {
             toast({ title: "KM Inválido!", description: `Sua moto está com ${currentBikeKm} km. Insira um valor maior.`, variant: "destructive" });
             return;
         }
      }

      let finalDescription = "Registro Automático";
      if (transactionData.category === "personal") finalDescription = "Gasto Pessoal (Retirada)";
      if (transactionData.category === "maintenance") finalDescription = `Manutenção: ${transactionData.bikePart} (Km: ${transactionData.bikeKm})`;
      
      if (transactionData.category === "maintenance" && !transactionData.bikePart.trim()) {
        toast({ title: "Peça obrigatória", description: "Informe a peça ou serviço para salvar a manutenção.", variant: "destructive" });
        return;
      }

      if (transactionData.category === "fuel") {
        const pricePerLiter = Number(transactionData.pricePerLiter);
        if (!pricePerLiter || pricePerLiter <= 0) {
          toast({ title: "Preço do litro inválido", description: "Informe um valor maior que zero para salvar o abastecimento.", variant: "destructive" });
          return;
        }
      }

      const litros = (transactionData.pricePerLiter && transactionData.pricePerLiter !== "0") 
          ? (transactionData.value / parseFloat(transactionData.pricePerLiter)).toFixed(2) 
          : "0.00";

      if (transactionData.category === "fuel") {
        finalDescription = `Abastecimento: ${litros}L (Km: ${transactionData.bikeKm})`;
      }
      
      const { error: transactionError } = await supabase.from('transactions').insert([{
        type: transactionData.type === 'receita' ? 'income' : 'expense',
        amount: transactionData.value,
        description: finalDescription,
        date: todayStr,
        user_id: profile.user.id,
        title: transactionData.category === 'fuel' ? 'Gasolina' : transactionData.category === 'maintenance' ? 'Peças/Serviço' : 'Automático IA'
      }]);
      if (transactionError) throw transactionError;

      if (transactionData.category === "fuel") {
        const { error: fuelError } = await supabase.from('fuel_entries').insert([{
            user_id: profile.user.id,
            date: todayStr,
            amount: transactionData.value,
            total_cost: transactionData.value,
            liters: Number(litros),
            price_per_liter: Number(transactionData.pricePerLiter),
            odometer: Number(transactionData.bikeKm),
            fuel_type: "gasoline",
            consumption: 0
        }]);
        if (fuelError) throw fuelError;
      }

      if (transactionData.category === "maintenance") {
        const { error: maintenanceError } = await supabase.from('maintenance_logs').insert([{
            user_id: profile.user.id,
            date: todayStr,
            service_type: transactionData.bikePart, 
            cost: transactionData.value,
            odometer: Number(transactionData.bikeKm)
        }]);
        if (maintenanceError) throw maintenanceError;
      }

      if (transactionData.category === "fuel" || transactionData.category === "maintenance") {
          const { error: kmError } = await supabase.from('profiles').update({ bike_km: Number(transactionData.bikeKm) }).eq('id', profile.user.id);
          if (kmError) throw new Error("Supabase bloqueou o KM: " + kmError.message);
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile-bike'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-parts'] }); 

      setAiStep(0);
      setShowAIScanner(false);
      setScannedData({ value: 0, type: "receita", category: "", bikePart: "", bikeKm: "", pricePerLiter: "" });
      toast({ title: "Mágica feita! 🤖", description: "Registrado nas Finanças e veículo atualizado!" });
    } catch (error: any) {
      toast({ title: "Erro na IA", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      
      <div className="bg-black p-4 flex justify-between items-center border-b border-yellow-500/20 sticky top-0 z-20">
        <span className="text-primary text-xl font-bold tracking-wide">ROTA CERTA</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-primary hover:bg-yellow-500/10" onClick={() => navigate('/profile')}>
            <User className="w-6 h-6" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-yellow-500/10">
                <Settings className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-secondary border-primary/20 text-white">
              <DropdownMenuItem className="flex items-center gap-2 py-3 cursor-pointer" onClick={() => window.open('https://site-rotacerta.netlify.app/', '_blank')}>
                <Users className="w-4 h-4 text-primary" /> <span>Quem somos</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 py-3 cursor-pointer" onClick={() => window.open('https://site-rotacerta.netlify.app/', '_blank')}>
                <Globe className="w-4 h-4 text-primary" /> <span>Explore ferramentas!</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <AlertDialogContent className="bg-zinc-950 border border-yellow-500/30 max-w-[90vw] sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto text-white shadow-2xl shadow-yellow-500/10">
          <AlertDialogHeader>
            <div className="mx-auto bg-yellow-500/10 p-4 rounded-full mb-2 w-fit border border-yellow-500/20">
              {(() => {
                const StepIcon = onboardingSteps[onboardingStep].icon;
                return <StepIcon className="h-8 w-8 text-yellow-500" />;
              })()}
            </div>
            <AlertDialogTitle className="text-center text-2xl font-black italic text-yellow-500 tracking-tight">
              {onboardingSteps[onboardingStep].title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-zinc-400 font-medium text-sm">
              Você está com o melhor painel de controle da rua nas mãos. Veja o que preparamos para você:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-2">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === onboardingStep ? "w-8 bg-yellow-500" : "w-2 bg-zinc-700"
                  )}
                />
              ))}
            </div>
            <div className="bg-zinc-900/70 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20 shrink-0">
                  {(() => {
                    const StepIcon = onboardingSteps[onboardingStep].icon;
                    return <StepIcon className="w-5 h-5 text-yellow-500" />;
                  })()}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-yellow-500/80 font-bold">
                    Passo {onboardingStep + 1} de {onboardingSteps.length}
                  </p>
                  <h4 className="font-bold text-white text-base mt-1">
                    {onboardingSteps[onboardingStep].title}
                  </h4>
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {onboardingSteps[onboardingStep].detail}
              </p>
            </div>
          </div>
          <AlertDialogFooter className="mt-2 flex-col sm:flex-col gap-2">
            <Button onClick={handleNextOnboarding} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase tracking-widest text-xs h-12 rounded-xl shadow-lg shadow-yellow-500/20">
              TUDO CERTO, BORA VOAR! 🚀
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseOnboarding}
              className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900 h-11 rounded-xl"
            >
              Pular tutorial
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showHabitPopup} onOpenChange={setShowHabitPopup}>
         <AlertDialogContent className="bg-zinc-900 border border-yellow-500/30 max-w-[90vw] rounded-xl text-white overflow-hidden p-0">
            <div className="p-6">
              <AlertDialogHeader>
                <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <AlertDialogTitle className="text-center text-xl">Fechamento do Dia</AlertDialogTitle>
              </AlertDialogHeader>
              
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg flex items-start gap-3 mt-4 mb-2 shadow-inner">
                 <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 animate-pulse" />
                 <p className="text-xs text-blue-100 italic leading-relaxed font-medium">"{currentTip}"</p>
              </div>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-green-500 text-xs">Quanto fez hoje?</Label>
                    <Input type="number" placeholder="R$ 0,00" value={dailyIncome} onChange={(e) => setDailyIncome(e.target.value)} className="bg-black border-green-900 text-green-400 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-red-500 text-xs">Quanto gastou hoje?</Label>
                    <Input type="number" placeholder="R$ 0,00" value={dailyExpense} onChange={(e) => setDailyExpense(e.target.value)} className="bg-black border-red-900 text-red-400 font-bold" />
                  </div>
                </div>
              </div>

              <div className="w-full mt-2 mb-6 h-20 border-2 border-dashed border-zinc-700 bg-black/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group">
                 <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest group-hover:text-yellow-500 transition-colors">Espaço Publicitário</p>
                 <p className="text-[9px] text-zinc-600 mt-1">Anuncie sua Oficina / Motopeças aqui!</p>
              </div>

              <AlertDialogFooter className="flex flex-col gap-2">
                <Button onClick={handleSaveHabit} disabled={isSavingHabit} className="w-full bg-yellow-500 text-black font-bold hover:bg-yellow-400 h-12 shadow-lg shadow-yellow-500/20">
                  {isSavingHabit ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar e Ganhar Pontos"}
                </Button>
                <AlertDialogCancel className="bg-transparent border-none text-zinc-500 hover:bg-zinc-800 hover:text-white mt-1 h-10">Pular Hoje</AlertDialogCancel>
              </AlertDialogFooter>
            </div>
         </AlertDialogContent>
      </AlertDialog>

      <div className="p-4">
        
        <Card className="w-full bg-zinc-900 p-4 rounded-xl mb-4 border border-zinc-800">
          <div className="flex items-center">
            <Car className="text-yellow-500 w-5 h-5 mr-3" />
            <p className="text-zinc-300 font-medium text-sm leading-snug">{welcomeMessage}</p>
          </div>
        </Card>

        <Card className="w-full bg-black p-5 rounded-xl mb-6 border border-yellow-500/20 shadow-lg shadow-yellow-500/5 text-white">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Saldo Atual Líquido (Hoje)</h2>
          <div className={`text-4xl font-bold mb-4 ${totals.balance >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>
            R$ {totals.balance.toFixed(2)}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full mb-6 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs py-2 rounded-lg flex items-center justify-center gap-2 hover:text-yellow-500 hover:border-yellow-500/50 transition-colors">
                <BarChart3 size={14} /> Ver Relatório do Mês
              </button>
            </DialogTrigger>
            
            <DialogContent className="bg-zinc-950 border-yellow-500/20 text-white max-w-[90vw] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-yellow-500 italic">
                  <TrendingUp size={20} /> RAIO-X DO MÊS
                </DialogTitle>
              </DialogHeader>
              
              <div className="h-40 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-xs p-4 text-center space-y-2">
                 <BarChart3 size={32} className="text-zinc-700" />
                 <p>Os seus gráficos detalhados de despesas x receitas ficarão visíveis aqui em breve!</p>
              </div>

              <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mt-4">
                <h4 className="text-yellow-500 font-bold text-sm flex items-center gap-2 mb-2">
                  <Lightbulb size={16} /> Conselho da Rota Certa
                </h4>
                <p className="text-xs text-zinc-300 italic">
                  "Você tem focado bastante na pista! Para economizar mais este mês, tente manter a aceleração mais suave e confira a calibragem dos pneus toda segunda-feira."
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-green-500">
              <p className="text-zinc-500 text-[10px] uppercase">Receitas</p>
              <div className="flex items-center gap-1 font-bold"><ArrowUp size={14}/> R$ {totals.income.toFixed(2)}</div>
            </div>
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-red-500">
              <p className="text-zinc-500 text-[10px] uppercase">Despesas</p>
              <div className="flex items-center gap-1 font-bold"><ArrowDown size={14}/> R$ {totals.expenses.toFixed(2)}</div>
            </div>
          </div>
        </Card>

        <Card onClick={() => navigate('/goals')} className="w-full bg-zinc-900 p-5 rounded-xl mb-6 border border-blue-500/20 shadow-lg text-white cursor-pointer hover:border-blue-500/50 hover:bg-zinc-800/80 transition-all group">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              Meta do Dia 
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </h2>
            <span className={cn("text-xs font-bold", totals.balance < 0 ? "text-red-500" : "text-zinc-500")}>
              {progressoMeta.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-black rounded-full h-4 border border-zinc-800 p-0.5 mb-2">
            <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${Math.max(5, progressoMeta)}%` }}></div>
          </div>
          <div className="flex justify-between text-[11px] items-center">
            <span className="text-zinc-400">
              {totals.balance < 0 ? <span className="text-red-400 font-bold">Operando no Prejuízo!</span> : totals.balance >= metaDoDia ? <span className="text-green-500 font-bold">🎯 Meta Batida!</span> : <>Faltam: <span className="text-white">R$ {valorFaltante.toFixed(2)}</span></>}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold">Alvo: R$ {metaDoDia.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <h2 className="text-xl font-bold mb-4 text-white">Últimas Movimentações</h2>
        <div className="space-y-3">
            {todayTransactions.length === 0 ? (
               <p className="text-zinc-500 text-sm text-center py-4 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">Nenhuma movimentação hoje.</p>
            ) : (
              todayTransactions.slice(0, 5).map((t) => (
                  <Card key={t.id} className="bg-zinc-900 border-zinc-800 p-4 flex justify-between items-center text-white">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${t.type === 'expense' || t.type === 'despesa' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            <DollarSign size={20}/>
                          </div>
                          <div>
                              <p className="font-bold text-sm">{t.title || 'Registro'}</p>
                              <p className="text-[10px] text-zinc-500 line-clamp-1">{t.description || format(new Date(t.created_at), 'dd/MM/yyyy')}</p>
                          </div>
                      </div>
                      <p className={cn("font-bold", t.type === 'expense' || t.type === 'despesa' ? "text-red-500" : "text-green-500")}>
                        {t.type === 'expense' || t.type === 'despesa' ? '-' : '+'} R$ {Number(t.amount).toFixed(2)}
                      </p>
                  </Card>
              ))
            )}
        </div>
      </div>

      <div className="fixed right-4 bottom-24 z-10 flex flex-col gap-4">
        
        <Sheet open={showAIScanner} onOpenChange={(open) => { setShowAIScanner(open); if(!open) setAiStep(0); }}>
          <SheetTrigger asChild>
            <Button size="icon" className="bg-zinc-900 text-yellow-500 border border-yellow-500/20 hover:bg-zinc-800 rounded-full w-14 h-14 shadow-xl">
              <Bot className="w-7 h-7 animate-pulse" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-zinc-950 border-t border-yellow-500/20 min-h-[400px] text-white rounded-t-3xl">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-yellow-500 text-center flex items-center justify-center gap-2">
                <Bot className="w-6 h-6" /> IA Rota Certa
              </SheetTitle>
            </SheetHeader>
            
            <div className="px-4 overflow-y-auto pb-8">
              {aiStep === 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <ReceiptScanner onScanComplete={(res) => {
                     const val = typeof res === 'number' ? res : res.value;
                     setScannedData((prev) => ({ ...prev, value: val }));
                     setAiStep(1); 
                  }} />
                  <p className="text-[11px] text-zinc-500 text-center mt-4">Tire foto de uma nota fiscal, comprovante de gasolina ou frete.</p>
                </div>
              )}

              {aiStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="text-center">
                    <div className="text-yellow-500 text-4xl font-black mb-2">R$ {scannedData.value.toFixed(2)}</div>
                    <p className="text-zinc-400 text-sm">Entrou na conta ou saiu do bolso?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="h-16 bg-green-500/10 border-green-500/30 text-green-500 flex flex-col gap-1 hover:bg-green-500 hover:text-white" onClick={() => {
                      const nextData = buildScannedData({ type: "receita" });
                      setScannedData(nextData);
                      finalizeAITransaction(nextData);
                    }}>
                      <ArrowUp size={20} /> Recebi
                    </Button>
                    <Button className="h-16 bg-red-500/10 border-red-500/30 text-red-500 flex flex-col gap-1 hover:bg-red-500 hover:text-white" onClick={() => {
                      setScannedData((prev) => ({ ...prev, type: "despesa" }));
                      setAiStep(2);
                    }}>
                      <ArrowDown size={20} /> Gastei
                    </Button>
                  </div>
                </div>
              )}

              {aiStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="text-center mb-4">
                    <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                    <p className="font-bold text-sm">Aonde foi esse gasto?</p>
                  </div>
                  <Button variant="outline" className="w-full h-12 justify-start gap-3 bg-zinc-900 border-zinc-800 text-white" onClick={() => { setScannedData((prev) => ({...prev, category: "maintenance"})); setAiStep(3); }}>
                    <Wrench className="text-yellow-500 w-4 h-4" /> Manutenção/Peça
                  </Button>
                  <Button variant="outline" className="w-full h-12 justify-start gap-3 bg-zinc-900 border-zinc-800 text-white" onClick={() => { setScannedData((prev) => ({...prev, category: "fuel"})); setAiStep(4); }}>
                    <Fuel className="text-blue-500 w-4 h-4" /> Abastecimento
                  </Button>
                  <Button variant="outline" className="w-full h-14 justify-start gap-3 bg-zinc-900 border-red-500/20 hover:bg-red-500/20" onClick={() => {
                    const nextData = buildScannedData({ category: "personal" });
                    setScannedData(nextData);
                    finalizeAITransaction(nextData);
                  }}>
                    <Users className="text-red-500 w-4 h-4" /> 
                    <div className="text-left flex flex-col">
                      <span className="text-white">Gasto Pessoal</span>
                      <span className="text-red-400 text-[9px]">Atenção: Diminui sua meta.</span>
                    </div>
                  </Button>
                </div>
              )}

              {aiStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <p className="text-center font-bold text-sm">Detalhes da Manutenção</p>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300">Peça / Serviço (Escolha ou Digite)</Label>
                    <Input 
                      list="parts-list" 
                      placeholder="Ex: Óleo, Pneu..." 
                      className="bg-black border-zinc-800 text-white" 
                      value={scannedData.bikePart}
                      onChange={(e) => setScannedData((prev) => ({...prev, bikePart: e.target.value}))} 
                    />
                    <datalist id="parts-list">
                       {maintenanceHistory.map((part: any, idx: number) => (
                           <option key={idx} value={part} />
                       ))}
                    </datalist>
                  </div>
                  <div className="space-y-2 mb-4">
                    <Label className="text-xs text-zinc-300">Odômetro (KM da Moto Atual: {currentBikeKm})</Label>
                    <Input type="number" placeholder={`Mínimo: ${currentBikeKm}`} className="bg-black border-zinc-800 text-white" onChange={(e) => setScannedData((prev) => ({...prev, bikeKm: e.target.value}))} />
                  </div>
                  <Button className="w-full bg-yellow-500 text-black font-bold" onClick={() => finalizeAITransaction()}>
                    Salvar Manutenção
                  </Button>
                </div>
              )}

              {aiStep === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <p className="text-center font-bold text-sm">Detalhes do Abastecimento</p>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-300">Preço do Litro na Bomba (R$)</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 5.89" className="bg-black border-zinc-800 text-white" onChange={(e) => setScannedData((prev) => ({...prev, pricePerLiter: e.target.value}))} />
                  </div>
                  <div className="space-y-2 mb-2">
                    <Label className="text-xs text-zinc-300">Odômetro (KM da Moto Atual: {currentBikeKm})</Label>
                    <Input type="number" placeholder={`Mínimo: ${currentBikeKm}`} className="bg-black border-zinc-800 text-white" onChange={(e) => setScannedData((prev) => ({...prev, bikeKm: e.target.value}))} />
                  </div>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center mt-2">
                    <p className="text-xs text-blue-400 font-bold">
                      Total Calculado: {(scannedData.pricePerLiter && scannedData.pricePerLiter !== "0") ? (scannedData.value / parseFloat(scannedData.pricePerLiter)).toFixed(2) : "0.00"} Litros
                    </p>
                  </div>
                  <Button className="w-full bg-yellow-500 text-black font-bold mt-2" onClick={() => finalizeAITransaction()}>
                    Salvar Abastecimento
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
          <SheetTrigger asChild>
            <Button size="icon" className="bg-yellow-500 text-black hover:bg-yellow-600 rounded-full w-14 h-14 shadow-lg shadow-yellow-500/30">
              <Plus className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-zinc-950 text-white border-l border-yellow-500/20 overflow-y-auto">
             <SheetHeader>
               <SheetTitle className="text-yellow-500 italic">Adicionar Transação</SheetTitle>
             </SheetHeader>
             <form className="space-y-6 mt-6" onSubmit={async (e) => {
                 e.preventDefault();
                 try {
                     const formData = new FormData(e.currentTarget);
                     const amount = Number(formData.get('amount'));
                     
                     if (amount <= 0) {
                        toast({ title: "Valor inválido", description: "Digite um valor maior que zero.", variant: "destructive" });
                        return;
                     }

                     const { data: { user } } = await supabase.auth.getUser();
                     if(!user) return;
                     
                     addTransactionMutation.mutate({
                         type: manualType === 'receita' ? 'income' : 'expense',
                         amount: amount,
                         description: formData.get('description') || '',
                         date: formData.get('date') || todayStr,
                         user_id: user.id,
                         title: manualType === 'receita' ? 'Entrada Manual' : 'Gasto Manual'
                     });
                 } catch (err: any) {
                     toast({ title: "Erro", description: err.message, variant: "destructive" });
                 }
             }}>
                <div className="space-y-2">
                    <Label>Tipo</Label>
                    <RadioGroup value={manualType} onValueChange={setManualType} className="flex gap-4">
                        <div className="flex items-center gap-2 bg-black p-3 rounded-lg border border-zinc-800 flex-1 cursor-pointer" onClick={() => setManualType("receita")}>
                            <RadioGroupItem value="receita" id="receita" />
                            <Label htmlFor="receita" className="text-green-500 cursor-pointer">Receita</Label>
                        </div>
                        <div className="flex items-center gap-2 bg-black p-3 rounded-lg border border-zinc-800 flex-1 cursor-pointer" onClick={() => setManualType("despesa")}>
                            <RadioGroupItem value="despesa" id="despesa" />
                            <Label htmlFor="despesa" className="text-red-500 cursor-pointer">Despesa</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input name="amount" type="number" step="0.01" className="bg-black border-zinc-800 h-12 text-xl text-white" required />
                </div>
                <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input name="description" placeholder="Ex: Almoço, Pneu..." className="bg-black border-zinc-800 text-white" />
                </div>
                <div className="space-y-2">
                    <Label>Data</Label>
                    <Input name="date" type="date" className="bg-black border-zinc-800 text-white" defaultValue={todayStr} />
                </div>
                <Button type="submit" disabled={addTransactionMutation.isPending} className="w-full bg-yellow-500 text-black font-bold h-12 text-lg hover:bg-yellow-400">
                  {addTransactionMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar na Carteira"}
                </Button>
             </form>
          </SheetContent>
        </Sheet>
      </div>

      <NavBar />
    </div>
  );
};

export default Home;
