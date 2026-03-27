import { useState } from "react";
import { MapPin, DollarSign, Package, Loader2, Navigation, CheckCircle2, Bike } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/NavBar";

const DeliveryPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  
  const { data: availableDeliveries = [], isLoading: isLoadingRadar } = useQuery({
    queryKey: ['available-deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'buscando_motoboy')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, 
  });

 
  const { data: myActiveDeliveries = [], isLoading: isLoadingActive } = useQuery({
    queryKey: ['my-active-deliveries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'em_rota')
        .eq('motoboy_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

 
  const acceptDeliveryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'em_rota', motoboy_id: user.id })
        .eq('id', deliveryId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
      toast({ title: "🏍️ Corrida Aceita!", description: "Bora pra coleta!" });
    }
  });

  
  const finishDeliveryMutation = useMutation({
    mutationFn: async (delivery: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

     
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({ status: 'entregue' })
        .eq('id', delivery.id);
        
      if (updateError) throw updateError;

      
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          title: `Frete: ${delivery.company_name}`,
          amount: delivery.price,
          type: 'income'
        });

      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active-deliveries'] });
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ 
        title: "💰 Entrega Finalizada!", 
        description: "O valor do frete já caiu no seu saldo do dia.",
        variant: "default",
      });
    }
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      
      <div className="bg-zinc-950 p-4 flex justify-between items-center border-b border-yellow-500/20 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Navigation className="h-6 w-6 text-yellow-500" />
          <span className="text-white text-lg font-black tracking-tight uppercase">Radar Rota Certa</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Online</span>
        </div>
      </div>

      <main className="p-4 max-w-md mx-auto space-y-8 mt-2">
        
        
        {myActiveDeliveries.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-green-500 uppercase flex items-center gap-2 tracking-widest border-b border-green-500/20 pb-2">
              <Bike className="h-4 w-4" /> Em Rota Agora
            </h2>
            
            {myActiveDeliveries.map((delivery: any) => (
              <Card key={delivery.id} className="bg-zinc-900 border-green-500/30 shadow-lg shadow-green-500/5 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                
                <CardContent className="p-4 space-y-4 pl-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="border-green-500/50 text-green-500 mb-2 text-[10px] uppercase font-bold bg-green-500/10">
                        Levando: {delivery.category}
                      </Badge>
                      <h3 className="font-black text-white text-lg leading-tight">{delivery.title}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-green-500 flex items-center gap-1 justify-end">
                        <DollarSign className="h-4 w-4" />
                        {Number(delivery.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  
                  <div className="bg-black p-3 rounded-lg border border-zinc-800 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Entregar em:</p>
                      <p className="text-sm text-zinc-200 font-medium">{delivery.dropoff_address}</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => finishDeliveryMutation.mutate(delivery)}
                    disabled={finishDeliveryMutation.isPending}
                    className="w-full bg-green-500 text-black font-black h-12 uppercase tracking-widest shadow-xl shadow-green-500/20 hover:bg-green-400"
                  >
                    {finishDeliveryMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <><CheckCircle2 className="h-5 w-5 mr-2"/> Finalizar e Receber</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

       
        <div className="space-y-4">
          <h2 className="text-sm font-black text-yellow-500 uppercase flex items-center gap-2 tracking-widest border-b border-yellow-500/20 pb-2">
            <Navigation className="h-4 w-4" /> Radar Aberto
          </h2>

          {isLoadingRadar ? (
             <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 text-yellow-500 animate-spin" /></div>
          ) : availableDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
              <Package className="h-10 w-10 text-zinc-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Radar Limpo</h3>
              <p className="text-zinc-500 text-sm">Aguardando novas solicitações das empresas...</p>
            </div>
          ) : (
            availableDeliveries.map((delivery: any) => (
              <Card key={delivery.id} className="bg-zinc-900 border-yellow-500/30 shadow-lg shadow-yellow-500/5 overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                
                <CardContent className="p-4 space-y-4 pl-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 mb-2 text-[10px] uppercase font-bold bg-yellow-500/10">
                        {delivery.category}
                      </Badge>
                      <h3 className="font-black text-white text-lg leading-tight">{delivery.company_name}</h3>
                      <p className="text-zinc-400 text-sm">{delivery.title}</p>
                    </div>
                    <div className="text-right bg-black px-3 py-1.5 rounded-lg border border-yellow-500/20">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Valor Limpo</p>
                      <span className="text-xl font-black text-green-500 flex items-center gap-1 justify-end">
                        <DollarSign className="h-4 w-4" />
                        {Number(delivery.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-black p-3 rounded-lg border border-zinc-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-yellow-500 border-2 border-black ring-1 ring-yellow-500"></div>
                        <div className="w-0.5 h-6 bg-zinc-800 my-1"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-black ring-1 ring-green-500"></div>
                      </div>
                      <div className="space-y-3 w-full">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Coleta</p>
                          <p className="text-sm text-zinc-200 font-medium line-clamp-1">{delivery.pickup_address}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Entrega</p>
                          <p className="text-sm text-zinc-200 font-medium line-clamp-1">{delivery.dropoff_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => acceptDeliveryMutation.mutate(delivery.id)}
                    disabled={acceptDeliveryMutation.isPending}
                    className="w-full bg-yellow-500 text-black font-black h-12 uppercase tracking-widest text-base shadow-xl shadow-yellow-500/20 hover:bg-yellow-400"
                  >
                    {acceptDeliveryMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Aceitar Corrida"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </main>
      
      <NavBar />
    </div>
  );
};

export default DeliveryPanel;
