import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Target, Users, Car, AreaChart, Wrench, LogOut } from 'lucide-react';

import { NotificationsToggle } from '@/components/NotificationsToggle';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className, ...props }: SidebarProps) {
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema",
      });
    } catch (_error) {
      toast({
        title: "Erro ao realizar logout",
        description: "Ocorreu um erro ao tentar sair do sistema",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={cn("pb-12 h-full flex flex-col", className)} {...props}>
      <div className="space-y-4 py-4 flex-grow">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
          <div className="space-y-1">
            <Button
              asChild
              variant={isActive('/home') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to="/home">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive('/goals') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to="/goals">
                <Target className="mr-2 h-4 w-4" />
                Metas
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive('/community') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to="/community">
                <Users className="mr-2 h-4 w-4" />
                Comunidade
              </Link>
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Veículos
          </h2>
          <div className="space-y-1">
            <Button
              asChild
              variant={isActive('/vehicles') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to="/vehicles">
                <Car className="mr-2 h-4 w-4" />
                Meus Veículos
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive('/maintenance') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to="/maintenance">
                <Wrench className="mr-2 h-4 w-4" />
                Manutenção
              </Link>
            </Button>
            <Button
              asChild
              variant={isActive('/statistics') ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <Link to="/statistics">
                <AreaChart className="mr-2 h-4 w-4" />
                Estatísticas
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 space-y-4 mt-auto">
        <div className="px-4">
          <NotificationsToggle />
        </div>
        <div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
