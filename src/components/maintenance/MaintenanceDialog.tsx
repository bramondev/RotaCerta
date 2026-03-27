import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench } from "lucide-react";
import { MaintenanceForm } from "./MaintenanceForm";

export function MaintenanceDialog({
  open,
  onOpenChange,
  currentKm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKm: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto border border-yellow-500/20 bg-zinc-950 p-0 text-white">
        <DialogHeader>
          <div className="px-6 pt-6 pb-2 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/10">
              <Wrench className="h-7 w-7 text-yellow-500" />
            </div>
            <DialogTitle className="text-xl font-black text-yellow-500">
              Nova Manutenção
            </DialogTitle>
            <p className="mt-2 text-xs text-zinc-400">
              Salve a peça trocada, o odômetro atual e o valor gasto.
            </p>
          </div>
        </DialogHeader>
        <MaintenanceForm
          onClose={() => onOpenChange(false)}
          currentKm={currentKm}
        />
      </DialogContent>
    </Dialog>
  );
}
