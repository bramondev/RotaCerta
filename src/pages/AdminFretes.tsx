import { useState } from "react";
import { 
  Plus, Package, CheckCircle2, Clock, Loader2, LogOut, AlertTriangle, ShieldCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom"; 

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const CATEGORIES = ["Documentos / Malote", "Caixa Pequena", "Roupas / Sacola", "Peças Automotivas", "Outros"];

const AdminFretes = () => {
  const [isAddingFrete, setIsAddingFrete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['store-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    }
  });

  const myCompanyName = profile?.full_name || "Sua Loja";

  const { data: activeFretes = [], isLoading } = useQuery({
    queryKey: ['admin-fretes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('user_id', user.id) 
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const addFreteMutation = useMutation({
    mutationFn: async (newFrete: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const finalCompanyName = myCompanyName || "Loja Parceira";
      const finalPhone = profile?.phone || "00000000000";

      const { data, error } = await supabase.from('deliveries').insert({
        user_id: user.id,
        company_name: finalCompanyName,
        store_phone: finalPhone,
        title: String(newFrete.title || ""),
        category: String(newFrete.category || "Outros"),
        pickup_address: String(newFrete.pickup || ""),
        dropoff_address: String(newFrete.dropoff || ""),
        price: Number(newFrete.price || 0),
        status: "buscando_motoboy"
      }).select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fretes'] });
      setIsAddingFrete(false);
      toast({ title: "📦 Frete Lançado!", description: "Os motoboys já foram notificados." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar frete", description: error.message, variant: "destructive" });
    }
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/"); 
    toast({ title: "Sessão encerrada", description: "Você saiu com segurança." });
  };

  const handleAddFrete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const priceString = formData.get("price") as string;

    if (!priceString) return;

    const formattedPrice = parseFloat(priceString.replace(',', '.'));
    
    addFreteMutation.mutate({
      title: formData.get("title") as string,
      category: formData.get("category") as string,
      pickup: formData.get("pickup") as string,
      dropoff: formData.get("dropoff") as string,
      price: formattedPrice,
    });
  };

  const aguardandoColeta = activeFretes.filter(f => f.status === "buscando_motoboy").length;
  const emRota = activeFretes.filter(f => f.status === "em_rota").length;

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      
      <div className="bg-zinc-950 p-4 flex justify-between items-center border-b border-yellow-500/20 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-black" />
          </div>
          <span className="text-white text-lg font-black tracking-tight uppercase">Envios</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hidden sm:flex">
            Empresa
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-red-500 hover:bg-red-500/10 hover:text-red-400 gap-2"
          >
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </div>

      <main className="p-4 space-y-6 max-w-4xl mx-auto mt-4">
        
        <div className="flex items-center gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
          <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-yellow-500 font-bold text-xl border-2 border-yellow-500/20">
            {myCompanyName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{myCompanyName}</h1>
            <p className="text-zinc-500 text-xs">{profile?.phone || "Telefone não cadastrado"}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-full"><Clock className="h-5 w-5 text-yellow-500" /></div>
              <div>
                <p className="text-2xl font-black text-white">{isLoading ? "-" : aguardandoColeta}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Aguardando</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-full"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-black text-white">{isLoading ? "-" : emRota}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Em Rota</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mt-8">
          <h2 className="text-lg font-bold text-zinc-400 uppercase tracking-tighter">Minhas Coletas</h2>
          <Sheet open={isAddingFrete} onOpenChange={setIsAddingFrete}>
            <SheetTrigger asChild>
              <Button className="bg-yellow-500 text-black font-black hover:bg-yellow-600 rounded-full px-6 shadow-lg shadow-yellow-500/20">
                <Plus className="h-5 w-4 mr-1" /> NOVO ENVIO
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-zinc-950 text-white border-t border-yellow-500/20 rounded-t-[32px] h-[90vh] p-6 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-yellow-500 text-xl font-black italic uppercase">Solicitar Entregador</SheetTitle>
              </SheetHeader>
              
              <form onSubmit={handleAddFrete} className="space-y-5 mt-6 pb-10">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-500">O que é?</Label>
                  <Input name="title" placeholder="Ex: Peças, Malote..." className="bg-zinc-900 border-zinc-800 h-12" required />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-zinc-500">Categoria</Label>
                  <select name="category" className="w-full bg-zinc-900 border border-zinc-800 rounded-md h-12 px-3 text-white text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <Input name="pickup" placeholder="Endereço de Retirada" className="bg-black border-zinc-800" required />
                  <Input name="dropoff" placeholder="Endereço de Entrega" className="bg-black border-zinc-800" required />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-yellow-500 text-center block">Valor (R$)</Label>
                  <Input name="price" type="number" step="0.01" placeholder="0,00" className="bg-zinc-900 border-yellow-500/50 text-white font-black text-2xl h-16 text-center" required />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-6 space-y-3">
                  <h4 className="text-yellow-500 font-black text-sm uppercase flex items-center gap-2">
                    <AlertTriangle size={16} /> Regras do Frete
                  </h4>
                  <ul className="text-zinc-400 text-xs space-y-2 font-medium">
                    <li><strong className="text-white">Horário:</strong> Entregas padrão em horário comercial. Caso seja fora, combine os detalhes no local ou chat.</li>
                    <li><strong className="text-white">Valor Total:</strong> Digite o valor TOTAL do frete. (Ex: 5 pacotes a R$10 = Coloque R$50). Informe a quantidade na descrição.</li>
                    <li className="flex items-start gap-1 text-yellow-500 mt-2 bg-black/20 p-2 rounded">
                      <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                      <span>Segurança: Sempre confira o documento do motoboy e a placa da moto antes de entregar as mercadorias!</span>
                    </li>
                  </ul>
                </div>

                <Button type="submit" disabled={addFreteMutation.isPending} className="w-full bg-yellow-500 text-black font-black h-14 rounded-2xl text-lg shadow-xl shadow-yellow-500/20 mt-4">
                  {addFreteMutation.isPending ? <Loader2 className="animate-spin" /> : "CHAMAR MOTOBOY AGORA"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="space-y-4 mt-6">
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 text-yellow-500 animate-spin mx-auto" /></div>
          ) : activeFretes.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/20 rounded-[32px] border-2 border-dashed border-zinc-800">
              <Package className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 font-bold">Nenhum frete ativo.</p>
            </div>
          ) : (
            activeFretes.map((frete: any) => (
              <Card key={frete.id} className="bg-zinc-900 border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-black text-zinc-400 border-zinc-700 text-[10px] uppercase">{frete.category}</Badge>
                    <span className="text-xl font-black text-yellow-500">R$ {Number(frete.price).toFixed(2)}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{frete.title}</h3>
                  <div className="text-xs text-zinc-500 space-y-1 mb-4">
                    <p>📍 {frete.pickup_address}</p>
                    <p>🏁 {frete.dropoff_address}</p>
                  </div>
                  <div className={`text-[10px] font-black uppercase text-center p-1 rounded-lg ${frete.status === 'buscando_motoboy' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                    {frete.status === 'buscando_motoboy' ? 'Aguardando Entregador' : 'Em Transporte'}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminFretes;
