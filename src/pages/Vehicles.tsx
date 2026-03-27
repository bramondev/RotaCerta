import { useState } from "react";
import { 
  Plus, Gauge, Wrench, Fuel, BarChart3, 
  AlertTriangle, CheckCircle2, Bike, History, Save
} from "lucide-react";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Vehicles = () => {
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  
  
  const [myBike] = useState({
    model: "Honda Titan 160",
    color: "Vermelha",
    plate: "RAM-2026",
    currentKm: 45200,
    averageConsum: "42 km/L",
  });

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Veículo Cadastrado! 🏍️",
      description: "Sua nova máquina já está pronta para rodar na Apollo.",
    });
    setIsRegistering(false);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      
      
      <div className="p-6 bg-zinc-900 border-b border-yellow-500/20 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bike className="text-yellow-500" /> Garagem
          </h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Frota Ativa</p>
        </div>
        
        <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-yellow-500 text-black hover:bg-yellow-600 font-bold shadow-lg shadow-yellow-500/10"
            >
              <Plus className="w-4 h-4 mr-1" /> NOVO VEÍCULO
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-yellow-500/20 text-white max-w-[90vw] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-yellow-500 italic flex items-center gap-2">
                <Bike className="h-5 w-5" /> Cadastrar Nova Máquina
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Preencha os dados para a Apollo monitorar sua manutenção.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSaveVehicle} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modelo da Moto</Label>
                <Input id="model" placeholder="Ex: Titan 160, XRE 300..." className="bg-black border-zinc-800" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input id="plate" placeholder="ABC-1234" className="bg-black border-zinc-800 font-mono uppercase" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="km">Km Atual</Label>
                  <Input id="km" type="number" placeholder="45000" className="bg-black border-zinc-800" required />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full bg-yellow-500 text-black font-bold h-12">
                  <Save className="w-4 h-4 mr-2" /> SALVAR NA GARAGEM
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 space-y-6">
        
       
        <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 border-l-4 border-l-red-600 shadow-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <Badge className="bg-red-600 text-white mb-2 text-[10px] uppercase font-black italic">Operacional</Badge>
                <h2 className="text-2xl font-black italic tracking-tighter">{myBike.model}</h2>
                <p className="text-zinc-500 text-xs font-mono">{myBike.plate}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Odômetro Total</p>
                <p className="text-2xl font-black text-yellow-500">{myBike.currentKm.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 flex gap-2 h-12 uppercase font-black text-[10px]">
                <Fuel className="text-yellow-500 h-5 w-5" /> Abastecer
              </Button>
              <Button className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 flex gap-2 h-12 uppercase font-black text-[10px]">
                <Wrench className="text-yellow-500 h-5 w-5" /> Manutenção
              </Button>
            </div>
          </CardContent>
        </Card>

       
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <BarChart3 className="text-blue-500 h-5 w-5 mb-1" />
              <p className="text-[9px] text-zinc-500 uppercase font-bold">Consumo Médio</p>
              <p className="text-lg font-black text-white">{myBike.averageConsum}</p>
            </div>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 p-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <Gauge className="text-green-500 h-5 w-5 mb-1" />
              <p className="text-[9px] text-zinc-500 uppercase font-bold">Custo p/ KM</p>
              <p className="text-lg font-black text-white">R$ 0,14</p>
            </div>
          </Card>
        </div>

        
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Saúde das Peças</h3>
          <Card className="bg-zinc-900 border-red-500/20 border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-red-500">Kit Relação</p>
                  <p className="text-[10px] text-zinc-500 italic font-medium tracking-tighter">Manutenção Urgente detectada</p>
                </div>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold h-7 text-[10px]">LOJAS</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <NavBar />
    </div>
  );
};

export default Vehicles;