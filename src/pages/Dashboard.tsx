import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Car, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  type: z.enum(["car", "motorcycle"]),
  model: z.string().min(2, "O modelo deve ter pelo menos 2 caracteres"),
  year: z.string().refine(
    (val) => {
      const year = parseInt(val);
      const currentYear = new Date().getFullYear();
      return year >= 1900 && year <= currentYear + 1;
    },
    {
      message: "Ano inválido",
    }
  ),
  plate: z
    .string()
    .min(7, "A placa deve ter 7 caracteres")
    .max(7, "A placa deve ter 7 caracteres"),
  mileage: z.string().refine(
    (val) => {
      const mileage = parseInt(val);
      return mileage >= 0;
    },
    {
      message: "Quilometragem inválida",
    }
  ),
  status: z.enum(["regular", "irregular"]),
});

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "car",
      model: "",
      year: "",
      plate: "",
      mileage: "",
      status: "regular",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("Starting vehicle submission with values:", values);
      
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuário não autenticado",
          className: "bg-black text-white border-0",
        });
        navigate("/login");
        return;
      }

      console.log("Attempting to insert vehicle with type:", values.type);
      const { error } = await supabase.from("vehicles").insert({
        user_id: user.id,
        type: values.type, 
        model: values.model,
        year: parseInt(values.year),
        plate: values.plate.toUpperCase(),
        mileage: parseInt(values.mileage),
        status: values.status,
      });

      if (error) {
        console.error("Database error details:", error);
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Veículo cadastrado com sucesso!",
        className: "bg-black text-white border-0",
      });

      navigate("/home");
    } catch (error) {
      console.error("Full error object:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao cadastrar veículo",
        className: "bg-black text-white border-0",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Cadastro de Veículo</h1>
          <p className="text-muted-foreground">
            Preencha os dados do seu veículo abaixo
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Veículo</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="car" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          Carro
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="motorcycle" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          Moto
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Gol" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 2020"
                      {...field}
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: ABC1234"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        field.onChange(value);
                      }}
                      maxLength={7}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quilometragem</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 50000"
                      {...field}
                      type="number"
                      min="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Situação</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="regular" />
                        </FormControl>
                        <FormLabel className="font-normal">Regular</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="irregular" />
                        </FormControl>
                        <FormLabel className="font-normal">Irregular</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Cadastrar Veículo
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Dashboard;