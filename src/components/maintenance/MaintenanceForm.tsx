import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Gauge, Receipt, Wrench } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  serviceType: z.string().min(2, "Informe a peça ou serviço"),
  odometer: z.string().min(1, "Informe o odômetro"),
  cost: z.string().min(1, "Informe o valor gasto"),
  date: z.string().min(1, "Informe a data"),
});

export function MaintenanceForm({
  onClose,
  currentKm,
}: {
  onClose: () => void;
  currentKm: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceType: "",
      odometer: currentKm > 0 ? String(currentKm) : "",
      cost: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuário não autenticado");

      const odometer = Number(values.odometer);
      const cost = Number(values.cost);

      if (!odometer || odometer < currentKm) {
        throw new Error(`O odômetro deve ser maior ou igual a ${currentKm} km`);
      }

      if (!cost || cost <= 0) {
        throw new Error("Informe um valor maior que zero");
      }

      const description = `Manutenção: ${values.serviceType} (Km: ${odometer})`;

      const { error: maintenanceError } = await supabase
        .from("maintenance_logs")
        .insert([{
          user_id: user.id,
          date: values.date,
          service_type: values.serviceType,
          cost,
          odometer,
        }]);

      if (maintenanceError) throw maintenanceError;

      const { error: transactionError } = await supabase
        .from("transactions")
        .insert([{
          user_id: user.id,
          type: "expense",
          amount: cost,
          title: "Peças/Serviço",
          description,
          date: values.date,
        }]);

      if (transactionError) throw transactionError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ bike_km: odometer })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast({
        title: "Manutenção registrada!",
        description: "O histórico, o KM da moto e as finanças foram atualizados.",
      });

      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-bike"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-parts"] });

      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar manutenção",
        description: error.message || "Tente novamente mais tarde",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-black p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              KM atual
            </p>
            <p className="mt-1 text-lg font-black text-yellow-500">
              {currentKm.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Finanças
            </p>
            <p className="mt-1 text-sm font-bold text-red-400">
              Lança despesa
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-300">Peça / Serviço</FormLabel>
              <FormControl>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-500" />
                  <Input
                    placeholder="Ex: Óleo do motor, pastilha, pneu..."
                    className="border-zinc-800 bg-black pl-10 text-white"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    className="border-zinc-800 bg-black pl-10 text-white"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-300">Valor gasto</FormLabel>
              <FormControl>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="border-zinc-800 bg-black pl-10 text-lg font-bold text-white"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
          <p className="text-xs font-bold text-red-300">
            Ao salvar, o valor entra automaticamente nas finanças como despesa.
          </p>
        </div>

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
                    className="border-zinc-800 bg-black pl-10 text-white"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" className="w-full bg-yellow-500 font-bold text-black hover:bg-yellow-400">
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  );
}
