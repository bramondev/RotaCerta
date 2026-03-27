import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  type: "cnh" | "crlv" | "ipva" | "seguro" | "outros";
  document_number?: string;
  expiration_date: string;
}

interface DocumentListProps {
  isLoading: boolean;
  documents: Document[];
  onEdit: (document: Document) => void;
}

const documentTypeMap: Record<string, string> = {
  'cnh': 'CNH',
  'crlv': 'CRLV',
  'ipva': 'IPVA',
  'seguro': 'Seguro',
  'outros': 'Outros'
};

export function DocumentList({ isLoading, documents, onEdit }: DocumentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Documento excluído com sucesso!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir documento",
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

  if (documents.length === 0) {
    return (
      <Card className="p-4 bg-secondary text-center text-foreground/70">
        Nenhum documento registrado
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4 bg-secondary">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{documentTypeMap[doc.type]}</h3>
              {doc.document_number && (
                <p className="text-sm text-foreground/70">Nº {doc.document_number}</p>
              )}
            </div>
            <div className="flex items-start gap-4">
              <div className="text-right">
                <p className="text-sm text-foreground/70">Vencimento</p>
                <p className="font-medium">
                  {format(new Date(doc.expiration_date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(doc)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}