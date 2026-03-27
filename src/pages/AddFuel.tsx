import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Droplet, Fuel, Gauge, Receipt } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  totalValue: z.number().min(0.01, "Informe o valor total"),
  pricePerLiter: z.number().min(0.01, "Informe o preço por litro"),
  odometer: z.number().min(0, "Informe o odômetro"),
  date: z.string().min(1, "Informe a data"),
  fuelType: z.enum(["gasoline", "ethanol"], {
    required_error: "Selecione o combustível",
  }),
});

export default function AddFuel() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["user-profile-bike"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return { ...data, user };
    },
  });

  const currentKm = Number(profile?.bike_km || profile?.current_km || 0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalValue: 0,
      pricePerLiter: 0,
      odometer: 0,
      date: new Date().toISOString().split("T")[0],
      fuelType: "gasoline",
    },
  });

  useEffect(() => {
    if (currentKm > 0 && !form.formState.isDirty) {
      form.reset({
        totalValue: 0,
        pricePerLiter: 0,
        odometer: currentKm,
        date: new Date().toISOString().split("T")[0],
        fuelType: "gasoline",
      });
    }
  }, [currentKm, form]);

  const totalValue = form.watch("totalValue");
  const pricePerLiter = form.watch("pricePerLiter");
  const liters =
    totalValue > 0 && pricePerLiter > 0 ? totalValue / pricePerLiter : 0;

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (values.odometer < currentKm) {
        throw new Error(`O odômetro deve ser maior ou igual a ${currentKm} km`);
      }

      const litersFilled =
        values.totalValue > 0 && values.pricePerLiter > 0
          ? values.totalValue / values.pricePerLiter
          : 0;

      const description = `Abastecimento: ${litersFilled.toFixed(2)}L (Km: ${values.odometer})`;
      const title = values.fuelType === "ethanol" ? "Álcool" : "Gasolina";

      const { error: fuelError } = await supabase.from("fuel_entries").insert([{
        user_id: user.id,
        date: values.date,
        amount: values.totalValue,
        total_cost: values.totalValue,
        liters: litersFilled,
        price_per_liter: values.pricePerLiter,
        odometer: values.odometer,
        fuel_type: values.fuelType,
        consumption: 0,
      }]);

      if (fuelError) throw fuelError;

      const { error: transactionError } = await supabase.from("transactions").insert([{
        user_id: user.id,
        type: "expense",
        amount: values.totalValue,
        title,
        description,
        date: values.date,
      }]);

      if (transactionError) throw transactionError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ bike_km: values.odometer })
        .eq("id", user.id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-stats"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-bike"] });
      toast({
        title: "Abastecimento registrado!",
        description: "O gasto já entrou nas finanças e o KM da moto foi atualizado.",
      });
      navigate("/maintenance");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar abastecimento",
        description: error.message,
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-2 border-b border-yellow-500/20 bg-zinc-950 p-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-zinc-900"
          onClick={() => navigate("/maintenance")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-white">Novo Abastecimento</h1>
      </div>

      <div className="mx-auto max-w-md p-4">
        <div className="mb-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 shadow-lg shadow-blue-500/5">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
            <Droplet className="h-7 w-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-black text-white">Abastecimento rápido</h2>
          <p className="mt-2 text-xs text-zinc-400">
            Informe quanto gastou, o preço na bomba e o KM atual. O app calcula os litros e lança a despesa automaticamente.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Combustível</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950 text-white">
                        <SelectValue placeholder="Selecione o combustível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-zinc-800 bg-zinc-950 text-white">
                      <SelectItem value="gasoline">Gasolina</SelectItem>
                      <SelectItem value="ethanol">Álcool</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Valor total pago</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Receipt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-500" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="border-zinc-800 bg-zinc-950 pl-10 text-lg font-bold text-white"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerLiter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Preço por litro</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Fuel className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-400" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="border-zinc-800 bg-zinc-950 pl-10 text-white"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                  Litros calculados
                </p>
                <p className="mt-1 text-2xl font-black text-blue-400">
                  {liters.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  KM atual
                </p>
                <p className="mt-1 text-2xl font-black text-yellow-500">
                  {currentKm.toLocaleString()}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="odometer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Odômetro atual</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                      <Input
                        type="number"
                        min={currentKm}
                        placeholder={`Mínimo: ${currentKm}`}
                        className="border-zinc-800 bg-zinc-950 pl-10 text-white"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Data</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        type="date"
                        className="border-zinc-800 bg-zinc-950 pl-10 text-white"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-center">
              <p className="text-xs font-bold text-green-300">
                Ao salvar, o valor entra automaticamente nas finanças como despesa.
              </p>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-yellow-500 font-bold text-black hover:bg-yellow-400"
            >
              {mutation.isPending ? "Salvando..." : "Salvar Abastecimento"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
