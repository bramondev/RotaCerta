
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useParams } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { FuelEntry } from "@/types/fuel";

const formSchema = z.object({
  liters: z.number().min(0.01, "Quantidade deve ser maior que zero"),
  price_per_liter: z.number().min(0.01, "Preço por litro deve ser maior que zero"),
  kilometers_driven: z.number().min(0, "Quilometragem não pode ser negativa"),
  date: z.string().min(1, "Data é obrigatória"),
  fuel_type: z.enum(["gas", "gasoline", "ethanol", "diesel"], {
    required_error: "Selecione o tipo de combustível",
  }),
});

export default function EditFuel() {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fuelEntry, isLoading } = useQuery({
    queryKey: ['fuel-entry', id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('fuel_entries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as FuelEntry;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      liters: fuelEntry?.liters,
      price_per_liter: fuelEntry?.price_per_liter,
      kilometers_driven: fuelEntry?.kilometers_driven,
      date: fuelEntry?.date,
      fuel_type: fuelEntry?.fuel_type ?? 'gasoline',
    },
    values: {
      liters: fuelEntry?.liters ?? 0,
      price_per_liter: fuelEntry?.price_per_liter ?? 0,
      kilometers_driven: fuelEntry?.kilometers_driven ?? 0,
      date: fuelEntry?.date ?? new Date().toISOString().split('T')[0],
      fuel_type: fuelEntry?.fuel_type ?? 'gasoline',
    },
  });

  const calculateConsumption = (kilometers: number, liters: number, fuelType: string) => {
    if (fuelType === 'gas') {
      return kilometers / liters; 
    }
    
    return kilometers / liters;
  };

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const total_cost = values.liters * values.price_per_liter;
      const consumption = calculateConsumption(
        values.kilometers_driven,
        values.liters,
        values.fuel_type
      );

      const { error } = await supabase
        .from("fuel_entries")
        .update({
          liters: values.liters,
          price_per_liter: values.price_per_liter,
          total_cost,
          kilometers_driven: values.kilometers_driven,
          consumption,
          date: values.date,
          fuel_type: values.fuel_type,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-stats"] });
      toast({
        title: "Abastecimento atualizado com sucesso!",
      });
      navigate("/statistics");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar abastecimento",
        description: error.message,
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-black p-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/statistics")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-foreground text-lg font-semibold">
          Editar Abastecimento
        </h1>
      </div>

      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fuel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Combustível</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de combustível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gas">GNV</SelectItem>
                      <SelectItem value="gasoline">Gasolina</SelectItem>
                      <SelectItem value="ethanol">Álcool</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="liters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('fuel_type') === 'gas' ? 'Metros Cúbicos (m³)' : 'Litros'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_per_liter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('fuel_type') === 'gas' ? 'Preço por m³' : 'Preço por Litro'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kilometers_driven"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quilômetros Rodados</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
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
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Salvar
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
