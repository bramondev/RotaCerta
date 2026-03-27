import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Package,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ONE_SIGNAL_APP_ID } from "@/lib/onesignal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const CATEGORIES = [
  "Documentos / Malote",
  "Caixa Pequena",
  "Roupas / Sacola",
  "Pecas Automotivas",
  "Outros",
];

const AdminFretes = () => {
  const [isAddingFrete, setIsAddingFrete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["store-profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const myCompanyName = profile?.full_name || "Sua Loja";

  const { data: activeFretes = [], isLoading } = useQuery({
    queryKey: ["admin-fretes"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const addFreteMutation = useMutation({
    mutationFn: async (newFrete: any) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuario nao autenticado");
      }

      const finalCompanyName = myCompanyName || "Loja Parceira";
      const finalPhone = profile?.phone || "00000000000";

      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          user_id: user.id,
          company_name: finalCompanyName,
          store_phone: finalPhone,
          title: String(newFrete.title || ""),
          category: String(newFrete.category || "Outros"),
          pickup_address: String(newFrete.pickup || ""),
          dropoff_address: String(newFrete.dropoff || ""),
          price: Number(newFrete.price || 0),
          status: "buscando_motoboy",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      let pushSent = false;

      try {
        const { error: notificationError } = await supabase.functions.invoke(
          "notify-delivery-available",
          {
            body: {
              appId: ONE_SIGNAL_APP_ID,
              delivery: {
                category: data.category,
                companyName: data.company_name,
                dropoffAddress: data.dropoff_address,
                id: data.id,
                pickupAddress: data.pickup_address,
                price: data.price,
                title: data.title,
              },
            },
          },
        );

        if (notificationError) {
          throw notificationError;
        }

        pushSent = true;
      } catch (notificationError) {
        console.warn("Entrega salva, mas o push nao foi enviado:", notificationError);
      }

      return { delivery: data, pushSent };
    },
    onSuccess: ({ pushSent }: { delivery: any; pushSent: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fretes"] });
      setIsAddingFrete(false);
      toast({
        title: "Novo frete lancado!",
        description: pushSent
          ? "Os motoboys com push ativo ja foram notificados."
          : "A entrega entrou no radar. O push nao foi enviado desta vez.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar frete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/");
    toast({ title: "Sessao encerrada", description: "Voce saiu com seguranca." });
  };

  const handleAddFrete = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const priceString = formData.get("price") as string;

    if (!priceString) {
      return;
    }

    const formattedPrice = parseFloat(priceString.replace(",", "."));

    addFreteMutation.mutate({
      title: formData.get("title") as string,
      category: formData.get("category") as string,
      pickup: formData.get("pickup") as string,
      dropoff: formData.get("dropoff") as string,
      price: formattedPrice,
    });
  };

  const aguardandoColeta = activeFretes.filter((f: any) => f.status === "buscando_motoboy").length;
  const emRota = activeFretes.filter((f: any) => f.status === "em_rota").length;

  return (
    <div className="min-h-screen bg-black pb-24 font-sans text-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-yellow-500/20 bg-zinc-950 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500">
            <Package className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-black uppercase tracking-tight text-white">Envios</span>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="hidden border-yellow-500/20 bg-yellow-500/10 text-yellow-500 sm:flex">
            Empresa
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </div>

      <main className="mx-auto mt-4 max-w-4xl space-y-6 p-4">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-500/20 bg-zinc-800 text-xl font-bold text-yellow-500">
            {myCompanyName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{myCompanyName}</h1>
            <p className="text-xs text-zinc-500">{profile?.phone || "Telefone nao cadastrado"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-zinc-800 bg-zinc-900 shadow-xl">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{isLoading ? "-" : aguardandoColeta}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Aguardando
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900 shadow-xl">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-full bg-green-500/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{isLoading ? "-" : emRota}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Em Rota
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-tighter text-zinc-400">
            Minhas Coletas
          </h2>
          <Sheet open={isAddingFrete} onOpenChange={setIsAddingFrete}>
            <SheetTrigger asChild>
              <Button className="rounded-full bg-yellow-500 px-6 font-black text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-600">
                <Plus className="mr-1 h-5 w-4" /> NOVO ENVIO
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[90vh] overflow-y-auto rounded-t-[32px] border-t border-yellow-500/20 bg-zinc-950 p-6 text-white"
            >
              <SheetHeader>
                <SheetTitle className="text-xl font-black uppercase italic text-yellow-500">
                  Solicitar Entregador
                </SheetTitle>
              </SheetHeader>

              <form onSubmit={handleAddFrete} className="mt-6 space-y-5 pb-10">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-zinc-500">O que e?</Label>
                  <Input
                    name="title"
                    placeholder="Ex: Pecas, Malote..."
                    className="h-12 border-zinc-800 bg-zinc-900"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-zinc-500">Categoria</Label>
                  <select
                    name="category"
                    className="h-12 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <Input
                    name="pickup"
                    placeholder="Endereco de Retirada"
                    className="border-zinc-800 bg-black"
                    required
                  />
                  <Input
                    name="dropoff"
                    placeholder="Endereco de Entrega"
                    className="border-zinc-800 bg-black"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="block text-center text-xs font-bold uppercase text-yellow-500">
                    Valor (R$)
                  </Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="h-16 border-yellow-500/50 bg-zinc-900 text-center text-2xl font-black text-white"
                    required
                  />
                </div>

                <div className="mb-6 space-y-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-black uppercase text-yellow-500">
                    <AlertTriangle size={16} /> Regras do Frete
                  </h4>
                  <ul className="space-y-2 text-xs font-medium text-zinc-400">
                    <li>
                      <strong className="text-white">Horario:</strong> Entregas padrao em horario
                      comercial. Caso seja fora, combine os detalhes no local ou chat.
                    </li>
                    <li>
                      <strong className="text-white">Valor Total:</strong> Digite o valor TOTAL do
                      frete. (Ex: 5 pacotes a R$10 = coloque R$50).
                    </li>
                    <li className="mt-2 flex items-start gap-1 rounded bg-black/20 p-2 text-yellow-500">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                      <span>
                        Seguranca: sempre confira o documento do motoboy e a placa da moto antes
                        de entregar as mercadorias.
                      </span>
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={addFreteMutation.isPending}
                  className="mt-4 h-14 w-full rounded-2xl bg-yellow-500 text-lg font-black text-black shadow-xl shadow-yellow-500/20 hover:bg-yellow-400"
                >
                  {addFreteMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "CHAMAR MOTOBOY AGORA"
                  )}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-500" />
            </div>
          ) : activeFretes.length === 0 ? (
            <div className="rounded-[32px] border-2 border-dashed border-zinc-800 bg-zinc-900/20 py-20 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-zinc-700" />
              <p className="font-bold text-zinc-500">Nenhum frete ativo.</p>
            </div>
          ) : (
            activeFretes.map((frete: any) => (
              <Card
                key={frete.id}
                className="overflow-hidden rounded-2xl border-zinc-800 bg-zinc-900 shadow-lg"
              >
                <div className="p-4">
                  <div className="mb-4 flex items-start justify-between">
                    <Badge className="border-zinc-700 bg-black text-[10px] uppercase text-zinc-400">
                      {frete.category}
                    </Badge>
                    <span className="text-xl font-black text-yellow-500">
                      R$ {Number(frete.price).toFixed(2)}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{frete.title}</h3>
                  <div className="mb-4 space-y-1 text-xs text-zinc-500">
                    <p>Retirada: {frete.pickup_address}</p>
                    <p>Entrega: {frete.dropoff_address}</p>
                  </div>
                  <div
                    className={`rounded-lg p-1 text-center text-[10px] font-black uppercase ${
                      frete.status === "buscando_motoboy"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-green-500/10 text-green-500"
                    }`}
                  >
                    {frete.status === "buscando_motoboy"
                      ? "Aguardando Entregador"
                      : "Em Transporte"}
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
