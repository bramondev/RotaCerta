import { useState } from "react";
import { Search, MapPin, Tag, Star, ShoppingBag, Percent, Loader2, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import NavBar from "@/components/NavBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { buildStoreWhatsappUrl, fetchOffersWithStoreProfiles, getStoreAvatar, getStoreName, getStorePhone } from "@/lib/store";

const CATEGORIES = ["Todos", "Óleo", "Pneus", "Freios", "Serviços", "Acessórios"];

const Statistics = () => {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["store_offers"],
    queryFn: fetchOffersWithStoreProfiles,
  });

  
  const filteredOffers = offers.filter((offer) => {
    const matchesSearch = offer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          getStoreName(offer).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || offer.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

const handleBuyClick = async (offer: any) => {
  const phone = getStorePhone(offer);
  if (!phone) {
    toast({ title: "Contacto indisponível", variant: "destructive" });
    return;
  }

  await supabase.rpc('increment_offer_clicks', { offer_id: offer.id });

  const text = `Olá, vim pelo app Rota Certa! Vi a oferta do *${offer.name}* por R$ ${Number(offer.price).toFixed(2)}. Ainda está disponível?`;
  const whatsappUrl = buildStoreWhatsappUrl(phone, text);
  if (!whatsappUrl) return;

  window.open(whatsappUrl, '_blank');
};
const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-foreground pb-24">
      
      <div className="bg-black p-4 border-b border-yellow-500/20 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="text-yellow-500 h-6 w-6" />
            Lojas Parceiras
          </h1>
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            Ofertas em SP
          </Badge>
        </div>

        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Procurar peças, óleo, serviços..." 
            className="pl-9 bg-zinc-900 border-yellow-500/20 text-white w-full placeholder:text-zinc-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <main className="p-4 space-y-6">
        
       
        <section>
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-2 px-1">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? "default" : "secondary"}
                  className={`rounded-full px-5 ${
                    activeCategory === category 
                      ? 'bg-yellow-500 text-black hover:bg-yellow-600 shadow-md shadow-yellow-500/20' 
                      : 'bg-zinc-900 text-zinc-300 border border-yellow-500/10 hover:bg-zinc-800'
                  }`}
                  onClick={() => setActiveCategory(category)}
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </section>

        
        {activeCategory === "Todos" && searchQuery === "" && (
          <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 shadow-lg border border-yellow-400">
            <div className="relative z-10 w-2/3">
              <Badge className="bg-black text-yellow-500 hover:bg-black mb-2 font-bold flex w-fit items-center gap-1 border-none">
                <Percent className="h-3 w-3" /> Especial Mês do Motociclista
              </Badge>
              <h2 className="text-xl font-bold text-black mb-1">Preço de Custo</h2>
              <p className="text-black/80 text-xs mb-4 font-medium">As melhores ofertas das principais motopeças da Grande SP estão aqui.</p>
            </div>
            
            <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 mix-blend-multiply bg-[url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=300')] bg-cover bg-center"></div>
          </section>
        )}

       
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Ofertas para si</h2>
            <span className="text-xs text-zinc-400">{filteredOffers.length} resultados</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin mb-4" />
              <p className="text-zinc-400 font-medium">A carregar prateleiras...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredOffers.length > 0 ? (
                filteredOffers.map((offer) => (
                  <Card key={offer.id} className="overflow-hidden bg-zinc-900 border-yellow-500/10 shadow-sm flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/3 h-32 sm:h-auto relative">
                      <img src={offer.image || getStoreAvatar(offer)} alt={offer.name} className="w-full h-full object-cover opacity-90" />
                      {offer.discount && (
                        <Badge className="absolute top-2 left-2 bg-red-600 text-white border-none font-bold">
                          -{offer.discount}
                        </Badge>
                      )}
                    </div>
                    
                    
                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <p 
  className="text-xs text-zinc-400 flex items-center gap-1 mb-1 font-medium cursor-pointer hover:text-yellow-500 transition-all hover:underline"
  onClick={() => navigate(`/loja/${offer.user_id}`)}
>
  <MapPin className="h-3 w-3 text-yellow-500" /> 
                          <span className="font-bold">{getStoreName(offer)}</span> ({offer.distance})
</p>
                          <p className="text-xs text-yellow-500 flex items-center gap-1 font-bold">
                            <Star className="h-3 w-3 fill-yellow-500" /> {offer.rating}
                          </p>
                        </div>
                        <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2 text-white">{offer.name}</h3>
                      </div>
                      
                      <div className="flex items-end justify-between mt-2">
                        <div>
                          {offer.old_price && (
                            <p className="text-xs text-zinc-500 line-through">R$ {Number(offer.old_price).toFixed(2)}</p>
                          )}
                          <p className="text-lg font-bold text-yellow-500">R$ {Number(offer.price).toFixed(2)}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleBuyClick(offer)} 
                          className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-900/20 gap-1"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 bg-zinc-900/50 rounded-xl border border-dashed border-yellow-500/20">
                  <ShoppingBag className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
                  <p className="text-zinc-400 font-medium">Nenhuma oferta encontrada.</p>
                  <p className="text-xs text-zinc-500 mt-1">Tente procurar por outro termo.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <NavBar />
    </div>
  );
};

export default Statistics;
