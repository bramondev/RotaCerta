import { useState } from "react";
import { 
  Plus, Store, Tag, Trash2, TrendingUp, Users, MessageCircle, Package, Loader2, LogOut
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getDefaultStoreAvatar } from "@/lib/store";

const CATEGORIES = ["Óleo", "Pneus", "Freios", "Serviços", "Acessórios"];

const AdminLoja = () => {
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

 
  const { data: profile } = useQuery({
    queryKey: ['user-profile-shop'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return { ...data, user };
    }
  });

  const myShopName = profile?.full_name || "Motopeças Parceira";
  const userId = profile?.user?.id;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/login");
    toast({ title: "Sessão encerrada", description: "Você saiu com segurança." });
  };

 
  const { data: myOffers = [], isLoading } = useQuery({
    queryKey: ["my_store_offers", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_offers")
        .select("*")
        .eq("user_id", userId) 
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  
  const addOfferMutation = useMutation({
    mutationFn: async (newOffer: any) => {
      const { data, error } = await supabase.from("store_offers").insert([newOffer]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_store_offers"] });
      queryClient.invalidateQueries({ queryKey: ["store_offers"] });
      setIsAddingOffer(false);
      toast({ title: "Oferta no Ar! 🚀", description: "Os motoboys já podem ver seu produto." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

 
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("store_offers")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_store_offers"] });
      queryClient.invalidateQueries({ queryKey: ["store_offers"] });
      toast({ title: "Oferta removida", description: "O produto foi retirado da vitrine." });
    },
  });

  
  const handleAddOffer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;

    const formData = new FormData(e.currentTarget);
    
    addOfferMutation.mutate({
      user_id: userId,
      shop: myShopName,
      name: formData.get("name"),
      category: formData.get("category"),
      price: Number(formData.get("price")),
      old_price: formData.get("old_price") ? Number(formData.get("old_price")) : null,
      discount: formData.get("discount") || null,
      whatsapp: profile?.phone || "",
      image: profile?.avatar_url || getDefaultStoreAvatar(),
      distance: "1.2 km",
      rating: "5.0"
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      
      
      <div className="bg-zinc-950 p-4 flex justify-between items-center border-b border-yellow-500/20 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-yellow-500" />
          <span className="text-white text-lg font-black tracking-tight">PAINEL MOTOPEÇAS</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            onClick={() => toast({ 
              title: "🚀 Rota Certa PRO", 
              description: "Funcionalidade em desenvolvimento. Em breve você terá relatórios detalhados e destaque no topo!",
              variant: "default" 
            })}
            className="bg-yellow-500 text-black font-bold border-none hover:bg-yellow-600 cursor-pointer"
          >
            PLANO PRO
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-red-500 hover:bg-red-500/10 hover:text-red-400 gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>

      <main className="p-4 space-y-6 max-w-4xl mx-auto mt-4">
        
        <div className="mb-2 flex items-center gap-4">
           <div className="h-16 w-16 overflow-hidden rounded-2xl border border-yellow-500/20 bg-zinc-900">
             <img
               src={profile?.avatar_url || getDefaultStoreAvatar()}
               alt={myShopName}
               className="h-full w-full object-cover"
             />
           </div>
           <div>
             <h1 className="text-2xl font-black text-white">{myShopName}</h1>
             <p className="text-zinc-400 text-sm">Gerencie sua vitrine para a comunidade de entregadores.</p>
             <button
               type="button"
               onClick={() => navigate("/profile")}
               className="mt-1 text-xs font-bold text-yellow-500 hover:underline"
             >
               Editar foto e dados da loja
             </button>
           </div>
        </div>

        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-full"><Package className="h-5 w-5 text-yellow-500" /></div>
              <div>
                <p className="text-2xl font-black text-white">{isLoading ? "-" : myOffers.length}</p>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Ofertas Ativas</p>
              </div>
            </CardContent>
          </Card>
          
<Card className="bg-zinc-900 border-zinc-800">
  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
    <div className="p-2 bg-green-500/10 rounded-full"><MessageCircle className="h-5 w-5 text-green-500" /></div>
    <div>
      <p className="text-2xl font-black text-white">
        
        {myOffers.reduce((acc: number, offer: any) => acc + (offer.whatsapp_clicks || 0), 0)}
      </p>
      <p className="text-[10px] text-zinc-400 uppercase font-bold">Cliques WhatsApp</p>
    </div>
  </CardContent>
</Card>


<Card className="bg-zinc-900 border-zinc-800 hidden md:flex">
  <CardContent className="p-4 flex flex-col items-center text-center gap-2 w-full">
    <div className="p-2 bg-blue-500/10 rounded-full"><Users className="h-5 w-5 text-blue-500" /></div>
    <div>
      <p className="text-2xl font-black text-white">
       
        {myOffers.reduce((acc: number, offer: any) => acc + (offer.views || 0), 0)}
      </p>
      <p className="text-[10px] text-zinc-400 uppercase font-bold">Visualizações</p>
    </div>
  </CardContent>
</Card>
          <Card className="bg-zinc-900 border-zinc-800 hidden md:flex">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2 w-full">
              <div className="p-2 bg-purple-500/10 rounded-full"><TrendingUp className="h-5 w-5 text-purple-500" /></div>
              <div>
                <p className="text-2xl font-black text-white">Alto</p>
                <p className="text-[10px] text-zinc-400 uppercase font-bold">Engajamento</p>
              </div>
            </CardContent>
          </Card>
        </div>

        
        <div className="flex justify-between items-center mt-8">
          <div>
            <h2 className="text-xl font-bold">Sua Vitrine</h2>
          </div>
          
          <Sheet open={isAddingOffer} onOpenChange={setIsAddingOffer}>
            <SheetTrigger asChild>
              <Button className="bg-yellow-500 text-black font-bold hover:bg-yellow-600 shadow-lg shadow-yellow-500/20">
                <Plus className="h-4 w-4 mr-2" /> Anunciar Produto
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 text-white border-l border-yellow-500/20 overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="text-yellow-500 flex items-center gap-2">
                  <Tag className="h-5 w-5" /> Nova Oferta
                </SheetTitle>
                <SheetDescription className="text-zinc-400">
                  Preencha os dados. O produto vai aparecer na hora pro motoboy.
                </SheetDescription>
              </SheetHeader>
              
              <form onSubmit={handleAddOffer} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>O que você está vendendo?</Label>
                  <Input name="name" placeholder="Ex: Pneu Michelin City Pro 90/90-18" className="bg-black border-zinc-800 text-white" required />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select name="category" className="w-full bg-black border border-zinc-800 rounded-md h-10 px-3 text-white text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-yellow-500">Preço Atual (R$)</Label>
                    <Input name="price" type="number" step="0.01" placeholder="Ex: 219.90" className="bg-black border-yellow-500/50 text-white font-bold" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500">Preço Antigo (Opcional)</Label>
                    <Input name="old_price" type="number" step="0.01" placeholder="Ex: 260.00" className="bg-black border-zinc-800 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tag de Desconto</Label>
                    <Input name="discount" placeholder="Ex: 15% OFF" className="bg-black border-zinc-800 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp da Loja</Label>
                    <Input value={profile?.phone || ""} className="bg-zinc-900 border-zinc-800 text-zinc-400" disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Imagem da Loja</Label>
                  <Input value={profile?.avatar_url || "Use a foto salva no perfil"} className="bg-zinc-900 border-zinc-800 text-zinc-400 text-xs" disabled />
                </div>

                <Button type="submit" disabled={addOfferMutation.isPending} className="w-full bg-yellow-500 text-black font-black mt-4 h-12 uppercase tracking-widest hover:bg-yellow-400">
                  {addOfferMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publicar Oferta"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        
        <div className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
          ) : myOffers.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-700">
              <Store className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">Sua vitrine está vazia.</p>
              <p className="text-xs text-zinc-500 mt-1">Clique em "Anunciar Produto" para começar a vender.</p>
            </div>
          ) : (
            myOffers.map((offer: any) => (
              <Card key={offer.id} className="bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col sm:flex-row">
                <div className="w-full sm:w-32 h-32 relative">
                  <img src={offer.image} alt={offer.name} className="w-full h-full object-cover" />
                  {offer.discount && (
                    <Badge className="absolute top-2 left-2 bg-red-600 text-white text-[10px] border-none">
                      {offer.discount}
                    </Badge>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 mb-2 text-[10px]">{offer.category}</Badge>
                      <h3 className="font-bold text-white text-sm leading-tight">{offer.name}</h3>
                    </div>
                   
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => {
                        if(window.confirm("Tem certeza que deseja apagar esta oferta?")) {
                          deleteOfferMutation.mutate(offer.id);
                        }
                      }}
                      disabled={deleteOfferMutation.isPending}
                    >
                      {deleteOfferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-lg font-black text-yellow-500">R$ {Number(offer.price).toFixed(2)}</span>
                    {offer.old_price && <span className="text-xs text-zinc-500 line-through mb-1">R$ {Number(offer.old_price).toFixed(2)}</span>}
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

export default AdminLoja;
