import { useState } from "react";
import Tesseract from "tesseract.js";
import { Loader2, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export interface ScanResult {
  value: number;
  category: 'fuel' | 'maintenance' | 'income' | 'unknown';
  description: string;
}

interface ReceiptScannerProps {
  onScanComplete: (result: ScanResult) => void;
}

const ReceiptScanner = ({ onScanComplete }: ReceiptScannerProps) => {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const { toast } = useToast();

  const processImage = async (file: File) => {
    setLoading(true);
    setStatusText("Aquecendo motores da IA...");
    
    try {
      setStatusText("Lendo texto da imagem...");
      
     
      const { data: { text } } = await Tesseract.recognize(file, 'por', {
        logger: m => {
          if (m.status === "recognizing text") {
            setStatusText(`Analisando: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      
      const upperText = text.toUpperCase();
      console.log("Texto extraído da imagem:", upperText);

     
      let detectedCategory: ScanResult['category'] = 'unknown';
      let detectedDescription = "Registro Automático";

      const fuelWords = ["GASOLINA", "ETANOL", "DIESEL", "BOMBA", "LITROS", "POSTO", "COMBUSTIVEL"];
      const maintenanceWords = ["MÃO DE OBRA", "ÓLEO", "PASTILHA", "PNEU", "OFICINA", "MECÂNICA", "PEÇA", "SERVIÇO", "TROCA"];
      const incomeWords = ["ENTREGA", "FRETE", "CORRIDA", "PEDIDO", "TAXA", "IFOOD", "LALAMOVE", "LOGGI", "RECEBIDO"];

      if (fuelWords.some(word => upperText.includes(word))) {
        detectedCategory = 'fuel';
        detectedDescription = "Abastecimento Detectado (IA)";
      } else if (maintenanceWords.some(word => upperText.includes(word))) {
        detectedCategory = 'maintenance';
        detectedDescription = "Manutenção Detectada (IA)";
      } else if (incomeWords.some(word => upperText.includes(word))) {
        detectedCategory = 'income';
        detectedDescription = "Receita/Frete Detectado (IA)";
      }

    
     
      const valueRegex = /(?:R\$|TOTAL|VALOR|PAGO|LIQUIDO)\s*[:$]?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:\.\d{2}))/i;
      const match = text.match(valueRegex);

      let finalValue = 0;
      if (match && match[1]) {
        
        const cleanValue = match[1].replace(/\./g, '').replace(',', '.');
        finalValue = parseFloat(cleanValue);
      }

     
      if (finalValue > 0) {
        onScanComplete({ value: finalValue, category: detectedCategory, description: detectedDescription });
        toast({
          title: "Leitura Concluída! 🧠",
          description: `Identifiquei R$ ${finalValue.toFixed(2)} (${detectedCategory.toUpperCase()})`,
        });
      } else {
         toast({
          title: "Atenção da IA",
          description: "Consegui ler o papel, mas não achei o valor exato. Digite o número manualmente.",
          variant: "destructive"
        });
       
        onScanComplete({ value: 0, category: detectedCategory, description: detectedDescription });
      }

    } catch (error) {
      toast({
        title: "Erro na Leitura",
        description: "A imagem está embaçada ou muito escura. Tente tirar outra foto.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-yellow-500/30 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors w-full">
      <input
        type="file"
        accept="image/*"
        capture="environment" 
        className="hidden"
        id="receipt-upload"
        onChange={handleFileChange}
      />
      <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center w-full text-center">
        {loading ? (
          <>
            <Loader2 className="h-12 w-12 text-yellow-500 animate-spin mb-3" />
            <span className="text-sm font-bold text-yellow-500 animate-pulse">{statusText}</span>
          </>
        ) : (
          <>
            <div className="h-16 w-16 bg-yellow-500/10 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20 mb-3 border border-yellow-500/30">
              <BrainCircuit className="text-yellow-500 h-8 w-8" />
            </div>
            <span className="text-sm font-black text-white uppercase tracking-widest">
              Acionar Câmera IA
            </span>
            <p className="text-[10px] text-zinc-500 mt-2 italic max-w-[200px]">
              Tire foto do recibo do Posto, Oficina ou Comprovante de Entrega.
            </p>
          </>
        )}
      </label>
    </div>
  );
};

export default ReceiptScanner;