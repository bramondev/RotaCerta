
import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FuelEntry } from "@/types/fuel";

interface FuelListProps {
  isLoading: boolean;
  fuelData: FuelEntry[];
  onEdit: (entry: FuelEntry) => void;
}

const fuelTypeMap = {
  gas: "GNV",
  gasoline: "Gasolina",
  ethanol: "Álcool",
  diesel: "Diesel"
};

export function FuelList({ isLoading, fuelData, onEdit }: FuelListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('fuel_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Abastecimento excluído com sucesso!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['fuel-stats'] });
    } catch (error) {
      console.error('Error deleting fuel entry:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir abastecimento",
        description: "Tente novamente mais tarde",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (fuelData.length === 0) {
    return (
      <Card className="p-4 bg-secondary text-center text-foreground/70">
        Nenhum abastecimento registrado
      </Card>
    );
  }

  return (
    <Card className="bg-secondary">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Combustível</TableHead>
            <TableHead>Litros</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Consumo</TableHead>
            <TableHead>Km/Litro</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fuelData.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>{fuelTypeMap[entry.fuel_type]}</TableCell>
              <TableCell>{entry.liters.toFixed(1)} L</TableCell>
              <TableCell>R$ {entry.total_cost.toFixed(2)}</TableCell>
              <TableCell>
                {entry.fuel_type === 'gas' 
                  ? `${entry.consumption.toFixed(1)} km/m³`
                  : `${entry.consumption.toFixed(1)} km/L`}
              </TableCell>
              <TableCell>{entry.price_per_liter.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(entry)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
