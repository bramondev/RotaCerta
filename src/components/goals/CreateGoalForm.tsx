
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const categoryEnum = ["maintenance", "tax", "savings", "equipment", "other"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Nome da meta é obrigatório"),
  category: z.enum(categoryEnum, {
    required_error: "Categoria é obrigatória",
  }),
  target_amount: z.number().min(0.01, "Valor deve ser maior que zero"),
  deadline: z.string().min(1, "Data limite é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateGoalFormProps {
  onSuccess: () => void;
}

const CreateGoalForm = ({ onSuccess }: CreateGoalFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: undefined,
      target_amount: undefined,
      deadline: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("goals").insert({
        name: values.name,
        category: values.category,
        target_amount: values.target_amount,
        deadline: values.deadline,
        current_amount: 0,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({
        title: "Meta criada com sucesso!",
        variant: "default",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Nome da Meta</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-black text-white border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-black text-white border-primary">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-black text-white border-primary">
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="tax">Impostos</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="equipment">Equipamentos</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Valor Total</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="bg-black text-white border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Data Limite</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  className="bg-black text-white border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Salvar Meta
        </Button>
      </form>
    </Form>
  );
};

export default CreateGoalForm;
