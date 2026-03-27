import { useState } from "react";
import { Pencil, Droplet, Wrench, Car, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MaintenanceDialog } from "@/components/maintenance/MaintenanceDialog";
import { FuelList } from "@/components/statistics/FuelList";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Maintenance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openMaintenance, setOpenMaintenance] = useState(false);
  const [isEditingBike, setIsEditingBike] = useState(false);
  const [fuelTab, setFuelTab] = useState("all");


  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile-bike'],
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

  const bikeModel = profile?.bike_model || "Minha Moto";
  const bikePlate = profile?.bike_plate || "ABC-1234";
  const currentKm = profile?.bike_km || profile?.current_km || 0; 


  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenance-logs', profile?.user?.id],
    enabled: !!profile?.user?.id,
    queryFn: async () => {
        const { data, error } = await supabase.from('maintenance_logs').select('*').eq('user_id', profile.user.id).order('odometer', { ascending: false });
        if (error) return [];
        return data;
    }
  });

  const findLastServiceKm = (serviceNames: string[], defaultKm: number) => {
      const lastService = maintenanceLogs.find((log: any) => 
          serviceNames.some(name => log.service_type?.toLowerCase().includes(name.toLowerCase()))
      );
      return lastService ? lastService.odometer : defaultKm;
  };

  const lastOilKm = findLastServiceKm(["óleo", "oleo", "motor"], profile?.last_oil_change_km || 0);
  const lastChainKm = findLastServiceKm(["relação", "relacao", "corrente", "kit"], profile?.last_chain_change_km || 0);


  const updateBikeMutation = useMutation({
    mutationFn: async (newBikeData: any) => {
      if (!profile?.user?.id) throw new Error("Usuário não logado");
      const { error } = await supabase
        .from('profiles')
        .update({
          bike_model: newBikeData.model,
          bike_plate: newBikeData.plate,
          bike_km: newBikeData.currentKm 
        })
        .eq('id', profile.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-bike'] });
      setIsEditingBike(false);
      toast({ title: "🏍️ Garagem Atualizada!", description: "Dados salvos com sucesso." });
    }
  });

  const handleSaveBike = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newKm = Number(formData.get("currentKm"));

    if (newKm < currentKm) {
      toast({
        title: "KM inválido",
        description: `A quilometragem não pode ser menor que ${currentKm} km.`,
        variant: "destructive",
      });
      return;
    }

    updateBikeMutation.mutate({
      model: formData.get("model"),
      plate: formData.get("plate"),
      currentKm: newKm,
    });
  };

  const { data: rawFuelData = [], isLoading: isLoadingFuel } = useQuery({
    queryKey: ['fuel-stats', profile?.user?.id],
    enabled: !!profile?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_entries')
        .select('*')
        .eq('user_id', profile.user.id)
        .order('date', { ascending: false });
      if (error) return []; 
      return data;
    },
  });

 
  const sanitizedFuelData = rawFuelData.map((item: any) => {
    const consumption = Number(item.consumption);
    return {
      ...item,
      total_cost: Number(item.total_cost || item.amount || 0),
      liters: Number(item.liters || 0),
     
      consumption: isNaN(consumption) || !isFinite(consumption) ? 0 : consumption,
      odometer: Number(item.odometer || 0),
      fuel_type: item.fuel_type || "gasoline",
      date: item.date || new Date().toISOString() 
    };
  });

  const getFilteredFuelData = (fuelType?: string) => {
    if (!fuelType || fuelType === "all") return sanitizedFuelData;
    return sanitizedFuelData.filter(item => item.fuel_type === fuelType);
  };

  const calculateFuelStats = (data: any[]) => {
    return {
      totalCost: data.reduce((acc, item) => acc + item.total_cost, 0),
      totalLiters: data.reduce((acc, item) => acc + item.liters, 0),
      averageConsumption: data.length > 0 ? data.reduce((acc, item) => acc + item.consumption, 0) / data.length : 0,
    };
  };

  const allFuelStats = calculateFuelStats(sanitizedFuelData);
  const gasolineStats = calculateFuelStats(getFilteredFuelData("gasoline"));
  const ethanolStats = calculateFuelStats(getFilteredFuelData("ethanol"));

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="bg-black p-4 border-b border-primary/20 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-foreground">Meu Veículo</h1>
      </div>

      <main className="p-4 space-y-8">
        
       
        <section className="grid grid-cols-2 gap-4">
          <Button 
            className="h-24 flex flex-col items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg"
            onClick={() => setOpenMaintenance(true)}
          >
            <Wrench className="h-8 w-8 mb-2" />
            <span className="font-semibold text-sm">Nova Manutenção</span>
          </Button>
          <Button 
            className="h-24 flex flex-col items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl shadow-lg border border-primary/20"
            onClick={() => navigate('/fuel/add')}
          >
            <Droplet className="h-8 w-8 mb-2 text-primary" />
            <span className="font-semibold text-sm">Novo Abastecimento</span>
          </Button>
        </section>

        <div className="w-full h-[1px] bg-primary/20 my-4"></div>

       
        
        <section className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Car className="h-5 w-5 text-yellow-500" /> Garagem
            </h2>
            
            <Dialog open={isEditingBike} onOpenChange={setIsEditingBike}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 text-white border border-yellow-500/20 max-w-[90vw] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-yellow-500 flex items-center gap-2">
                    <Car className="h-5 w-5" /> Atualizar Garagem
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Edite o modelo ou corrija o odômetro. (Atenção: Não é possível reduzir a quilometragem).
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveBike} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Modelo da Moto</Label>
                      <Input name="model" defaultValue={bikeModel} className="bg-black border-zinc-800 text-white" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Placa</Label>
                      <Input name="plate" defaultValue={bikePlate} className="bg-black border-zinc-800 text-white" required />
                    </div>
                  </div>
                  <div className="w-full h-[1px] bg-zinc-800 my-2"></div>
                  <div className="space-y-2">
                    <Label className="text-yellow-500 font-bold">Odômetro Atual (KM)</Label>
                    <Input name="currentKm" type="number" defaultValue={currentKm} className="bg-black border-yellow-500/50 text-white text-lg h-12" required />
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={updateBikeMutation.isPending} className="w-full bg-yellow-500 text-black font-bold h-12 uppercase">
                      {updateBikeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Veículo"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-zinc-900 border-yellow-500/20 shadow-lg shadow-yellow-500/5">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="font-bold text-white text-lg leading-none">{bikeModel}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="border-zinc-700 text-yellow-500/80 bg-black text-[10px] uppercase tracking-widest">{bikePlate}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Odômetro Atual</p>
                <p className="text-2xl font-black text-yellow-500">
                  {isLoadingProfile ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : currentKm.toLocaleString()} <span className="text-xs">km</span>
                </p>
              </div>
            </CardContent>
          </Card>

         
         
          
        </section>

        <div className="w-full h-[1px] bg-primary/20 my-6"></div>

       
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">Histórico de Serviços</h2>
          </div>
          
          <div className="mt-4">
            {maintenanceLogs.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-4 bg-zinc-900 rounded-lg">Nenhum serviço registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {maintenanceLogs.map((log: any) => (
                  <div key={log.id} className="bg-secondary p-3 rounded-lg border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-white capitalize">{log.service_type || "Manutenção"}</h4>
                        <p className="text-[10px] text-zinc-500">Realizado com: {log.odometer || 0} km</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-2 text-foreground/80">
                     
                      <span>{log.date ? format(new Date(log.date), "dd/MM/yyyy") : "--/--/----"}</span>
                      <span className="font-bold text-red-400">R$ {log.cost?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        
        <section className="space-y-4 mt-8">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Abastecimentos</h2>
          </div>

          <Tabs defaultValue="all" onValueChange={setFuelTab}>
            <TabsList className="mb-4 w-full bg-secondary">
              <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
              <TabsTrigger value="gasoline" className="flex-1">Gasolina</TabsTrigger>
              <TabsTrigger value="ethanol" className="flex-1">Álcool</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-secondary border border-primary/10">
                  <h3 className="text-xs text-foreground/70 mb-1">Gasto Total</h3>
                  <p className="text-lg font-bold text-primary">R$ {allFuelStats.totalCost.toFixed(2)}</p>
                </Card>
                <Card className="p-4 bg-secondary border border-primary/10">
                  <h3 className="text-xs text-foreground/70 mb-1">Média Geral</h3>
                  <p className="text-lg font-bold text-primary">{allFuelStats.averageConsumption.toFixed(1)} km/L</p>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="gasoline" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-secondary border border-primary/10">
                  <h3 className="text-xs text-foreground/70 mb-1">Gasto (Gasolina)</h3>
                  <p className="text-lg font-bold text-primary">R$ {gasolineStats.totalCost.toFixed(2)}</p>
                </Card>
                <Card className="p-4 bg-secondary border border-primary/10">
                  <h3 className="text-xs text-foreground/70 mb-1">Média</h3>
                  <p className="text-lg font-bold text-primary">{gasolineStats.averageConsumption.toFixed(1)} km/L</p>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ethanol" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-secondary border border-primary/10">
                  <h3 className="text-xs text-foreground/70 mb-1">Gasto (Álcool)</h3>
                  <p className="text-lg font-bold text-primary">R$ {ethanolStats.totalCost.toFixed(2)}</p>
                </Card>
                <Card className="p-4 bg-secondary border border-primary/10">
                  <h3 className="text-xs text-foreground/70 mb-1">Média</h3>
                  <p className="text-lg font-bold text-primary">{ethanolStats.averageConsumption.toFixed(1)} km/L</p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4">
            <FuelList isLoading={isLoadingFuel} fuelData={getFilteredFuelData(fuelTab)} onEdit={(entry) => navigate(`/fuel/edit/${entry.id}`)} />
          </div>
        </section>

      </main>

      <MaintenanceDialog
        open={openMaintenance}
        onOpenChange={setOpenMaintenance}
        currentKm={currentKm}
      />

      <NavBar />
    </div>
  );
};

export default Maintenance;
