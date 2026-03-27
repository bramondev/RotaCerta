import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Star, MessageCircle, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildStoreWhatsappUrl, getDefaultStoreAvatar } from "@/lib/store";

const StoreProfile = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();

 
  const { data: storeData, isLoading } = useQuery({
    queryKey: ["store-details", id],
    queryFn: async () => {
      
      const { data: offers, error: offersError } = await supabase
        .from("store_offers")
        .select("*")
        .eq("user_id", id);
      
      if (offersError) throw offersError;

      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone")
        .eq("id", id)
        .single();

      return {
        name: profile?.full_name || "Loja Parceira",
        avatar: profile?.avatar_url,
        phone: profile?.phone || "",
        offers: offers || []
      };
    }
  });

  const handleZap = async (offer: any) => {
    await supabase.rpc('increment_offer_clicks', { offer_id: offer.id });
    const text = `Olá! Vi o produto ${offer.name} no Rota Certa. Ainda tem?`;
    const whatsappUrl = buildStoreWhatsappUrl(storeData?.phone, text);
    if (!whatsappUrl) return;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-yellow-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white pb-10">
     
      <div className="relative h-48 bg-zinc-900">
        <Button 
          variant="ghost" 
          className="absolute top-4 left-4 z-10 bg-black/50 rounded-full"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="absolute -bottom-10 left-6 flex items-end gap-4">
          <div className="w-24 h-24 rounded-2xl bg-zinc-800 border-4 border-black overflow-hidden shadow-xl">
             <img src={storeData?.avatar || getDefaultStoreAvatar()} className="w-full h-full object-cover" />
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-black">{storeData?.name}</h1>
            <p className="text-yellow-500 text-xs font-bold flex items-center gap-1">
              <Star size={12} fill="currentColor" /> 5.0 • Loja Verificada
            </p>
          </div>
        </div>
      </div>

      
      <main className="mt-16 p-6 space-y-6">
        <h2 className="text-lg font-bold border-b border-zinc-800 pb-2">Produtos em Destaque</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {storeData?.offers.map((offer: any) => (
            <Card key={offer.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="flex p-4 gap-4">
                <img src={offer.image} className="w-24 h-24 rounded-lg object-cover" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm leading-tight">{offer.name}</h3>
                    <p className="text-yellow-500 font-black mt-1">R$ {Number(offer.price).toFixed(2)}</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 h-8 gap-2"
                    onClick={() => handleZap(offer)}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StoreProfile;
