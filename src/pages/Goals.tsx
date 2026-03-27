import { useState, useEffect } from "react";
import { 
  Target, Trophy, AlertCircle, TrendingUp, Calendar, ArrowUp, ArrowDown, ChevronLeft, Pencil, Save, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import NavBar from "@/components/NavBar";
import { useToast } from "@/hooks/use-toast";

const Goals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [tempMetaValue, setTempMetaValue] = useState("200");

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('meta_diaria')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; 
      return data;
    }
  });

  const metaDiaria = profile?.meta_diaria ? Number(profile.meta_diaria) : 200.00;

  useEffect(() => {
    setTempMetaValue(metaDiaria.toString());
  }, [metaDiaria]);

  const { data: historicoReal = [], isLoading: isLoadingHistorico } = useQuery({
    queryKey: ['historico-semana-real'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const hoje = new Date();
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 6);
      const dataInicialBusca = seteDiasAtras.toISOString().split('T')[0];

      const { data: transacoes, error } = await supabase
        .from('transactions') 
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', dataInicialBusca);

      if (error) {
        console.error("Erro ao buscar transações:", error);
        return [];
      }

      const diasSemana = [];
      const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(seteDiasAtras);
        d.setDate(d.getDate() + i);
        
        diasSemana.push({
          dataFiltro: d.toISOString().split('T')[0],
          dia: nomesDias[d.getDay()],
          data: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          receitas: 0,
          despesas: 0,
          saldo: 0
        });
      }

      transacoes?.forEach(t => {
        const diaCerto = diasSemana.find(d => t.date.startsWith(d.dataFiltro));
        if (diaCerto) {
          if (t.type === 'income') diaCerto.receitas += Number(t.amount);
          if (t.type === 'expense') diaCerto.despesas += Number(t.amount);
          diaCerto.saldo = diaCerto.receitas - diaCerto.despesas;
        }
      });

      return diasSemana;
    }
  });

  const updateMetaMutation = useMutation({
    mutationFn: async (newVal: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não está logado");

      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

      if (existingProfile) {
        const { error } = await supabase.from('profiles').update({ meta_diaria: newVal }).eq('id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({ id: user.id, meta_diaria: newVal });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditingMeta(false);
      toast({ title: "🎯 Meta Atualizada!", description: "Seu novo alvo foi salvo no banco de dados." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveMeta = () => {
    const newVal = Number(tempMetaValue);
    if (newVal <= 0) {
      toast({ title: "Valor inválido!", variant: "destructive" });
      return;
    }
    updateMetaMutation.mutate(newVal);
  };

  const diasTrabalhados = historicoReal.filter(d => d.receitas > 0).length;
  const metasBatidas = historicoReal.filter(d => d.saldo >= metaDiaria).length;
  const saldoTotalSemana = historicoReal.reduce((acc, curr) => acc + curr.saldo, 0);

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      <div className="bg-zinc-950 p-4 flex items-center justify-between border-b border-yellow-500/20 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-yellow-500" />
            <span className="text-white text-lg font-black tracking-tight uppercase">Raio-X de Metas</span>
          </div>
        </div>

        <Dialog open={isEditingMeta} onOpenChange={setIsEditingMeta}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black">
              {isLoadingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <><Pencil className="h-4 w-4 mr-2" /> R$ {metaDiaria.toFixed(0)}</>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-yellow-500/20 text-white max-w-[90vw] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-yellow-500 italic">Definir Nova Meta Diária</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Ajuste seu alvo de lucro líquido para os próximos dias.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label>Qual é o alvo diário de lucro? (R$)</Label>
              <Input 
                type="number" 
                value={tempMetaValue} 
                onChange={(e) => setTempMetaValue(e.target.value)}
                className="bg-black border-zinc-800 text-2xl font-black text-yellow-500 h-14"
              />
            </div>
            <DialogFooter>
              <Button 
                onClick={handleSaveMeta} 
                className="w-full bg-yellow-500 text-black font-bold h-12"
                disabled={updateMetaMutation.isPending}
              >
                {updateMetaMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <><Save className="w-4 h-4 mr-2" /> SALVAR META NO BANCO</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <main className="p-4 space-y-6 max-w-4xl mx-auto mt-2">
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Taxa de Sucesso</p>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <p className="text-3xl font-black text-white">{metasBatidas}/{diasTrabalhados}</p>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Dias com meta batida</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Lucro da Semana</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-500" />
                <p className="text-2xl font-black text-green-500">R$ {saldoTotalSemana.toFixed(0)}</p>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Líquido na conta</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-900 border-yellow-500/20 shadow-lg shadow-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-500" /> 
              Desempenho Diário vs. Meta (R$ {metaDiaria})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistorico ? (
              <div className="h-[200px] w-full mt-4 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              </div>
            ) : (
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicoReal} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#27272a' }}
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#3f3f46', borderRadius: '8px' }}
                      itemStyle={{ color: '#eab308', fontWeight: 'bold' }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
                    />
                    
                    <ReferenceLine y={metaDiaria} stroke="#eab308" strokeDasharray="3 3" />
                    <Bar dataKey="saldo" radius={[4, 4, 0, 0]}>
                      {historicoReal.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.saldo >= metaDiaria ? "#22c55e" : entry.saldo > 0 ? "#ef4444" : "#27272a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Detalhes da Semana</h3>
          
          {historicoReal.length === 0 && !isLoadingHistorico && (
             <p className="text-zinc-500 text-center text-sm py-4">Nenhuma transação lançada nos últimos 7 dias.</p>
          )}

          {historicoReal.filter(d => d.receitas > 0 || d.despesas > 0).map((dia, index) => {
            const bateuMeta = dia.saldo >= metaDiaria;
            const porcentagem = Math.min(100, (dia.saldo / metaDiaria) * 100);

            return (
              <Card key={index} className="bg-zinc-950 border-zinc-900 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${bateuMeta ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {bateuMeta ? <Trophy className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{dia.dia}, {dia.data}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1"><ArrowUp className="h-3 w-3 text-green-500"/> R$ {dia.receitas.toFixed(2)}</span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1"><ArrowDown className="h-3 w-3 text-red-500"/> R$ {dia.despesas.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-black ${bateuMeta ? 'text-green-500' : 'text-red-500'}`}>
                      R$ {dia.saldo.toFixed(2)}
                    </p>
                    <Badge variant="outline" className={`text-[9px] border-none uppercase ${bateuMeta ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {porcentagem.toFixed(0)}% da meta
                    </Badge>
                  </div>
                </div>
                
                <div className="w-full bg-zinc-900 h-1">
                  <div 
                    className={`h-full ${bateuMeta ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.max(5, porcentagem)}%` }}
                  ></div>
                </div>
              </Card>
            )
          })}
        </div>
      </main>
      <NavBar />
    </div>
  );
};

export default Goals;
