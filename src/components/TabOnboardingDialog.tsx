import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { navItemMap } from "@/components/nav-items";

const STORAGE_PREFIX = "tab_onboarding_seen:";

const TabOnboardingDialog = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const currentItem = useMemo(() => navItemMap[pathname], [pathname]);

  useEffect(() => {
    if (!currentItem) {
      setOpen(false);
      return;
    }

    const storageKey = `${STORAGE_PREFIX}${currentItem.path}`;
    const hasSeenDialog = localStorage.getItem(storageKey) === "true";
    setOpen(!hasSeenDialog);
  }, [currentItem]);

  const handleClose = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen && currentItem) {
      localStorage.setItem(`${STORAGE_PREFIX}${currentItem.path}`, "true");
    }
  };

  if (!currentItem) {
    return null;
  }

  const Icon = currentItem.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[92vw] rounded-2xl border border-yellow-500/20 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader className="space-y-4 text-left">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
            <Icon className="h-7 w-7 text-yellow-500" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-500/80">
              Tutorial
            </p>
            <DialogTitle className="text-2xl font-black text-white">
              {currentItem.onboardingTitle}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-zinc-400">
              {currentItem.onboardingDescription}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
            Dica rápida
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {currentItem.onboardingTip}
          </p>
        </div>

        <Button
          className="h-11 w-full bg-yellow-500 font-bold text-black hover:bg-yellow-400"
          onClick={() => handleClose(false)}
        >
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TabOnboardingDialog;
