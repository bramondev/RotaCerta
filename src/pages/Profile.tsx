import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, Camera, FileText, Phone, Store, AtSign, Loader2, Save, Bike, UploadCloud } from "lucide-react";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    document: "",
    phone: "",
    avatarUrl: ""
  });

  const [isUploading, setIsUploading] = useState(false); 

  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return null;
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return { ...data, user };
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || "",
        username: profile.username || "",
        document: profile.document || "",
        phone: profile.phone || "",
        avatarUrl: profile.avatar_url || ""
      });
    }
  }, [profile]);

  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      setIsUploading(true);
      const file = event.target.files[0];
      
    
      if (!file.type.startsWith('image/')) {
        toast({ title: "Formato inválido", description: "Por favor, escolha uma imagem (JPG, PNG).", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "A imagem deve ter no máximo 5MB.", variant: "destructive" });
        return;
      }

      if (!profile?.user?.id) throw new Error("Usuário não logado");

    
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;


      const { error: uploadError } = await supabase.storage
        .from('rotacerta_images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
          throw uploadError;
      }

     
      const { data: { publicUrl } } = supabase.storage
        .from('rotacerta_images')
        .getPublicUrl(filePath);

     
      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
      
     
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.user.id);
      
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: "Sucesso!", description: "Foto de perfil atualizada." });

    } catch (error: any) {
      toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
     
      if(fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };


  const updateProfileMutation = useMutation({
    mutationFn: async (newData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newData.fullName,
          username: newData.username,
          document: newData.document,
          phone: newData.phone,
        
          avatar_url: newData.avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] }); 
      toast({ title: "Perfil Atualizado! 💾", description: "Seus dados foram salvos com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear(); 
    navigate('/login');
    toast({ title: "Desconectado", description: "Você saiu da sua conta em segurança." });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
      </div>
    );
  }

  const isMotoboy = profile?.user_type === 'motoboy';

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      <div className="bg-zinc-950 p-4 flex justify-between items-center border-b border-yellow-500/20 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="h-6 w-6 text-yellow-500" />
          Meu Perfil
        </h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-bold gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>

      <main className="p-4 space-y-6 max-w-md mx-auto mt-4">
        
       
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />

            <div className="h-28 w-28 rounded-full bg-zinc-900 border-2 border-yellow-500 overflow-hidden flex items-center justify-center shadow-lg shadow-yellow-500/20 group-hover:border-white transition-colors">
              {isUploading ? (
                 <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              ) : formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" className="h-full w-full object-cover group-hover:opacity-70 transition-opacity" />
              ) : (
                <User className="h-12 w-12 text-zinc-600 group-hover:text-white transition-colors" />
              )}
            </div>
            
            <div className="absolute bottom-0 right-0 bg-yellow-500 p-2 rounded-full text-black shadow-lg border-2 border-black group-hover:bg-white group-hover:scale-110 transition-all">
              <Camera className="h-4 w-4" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-black">{formData.fullName || "Sem Nome"}</h2>
            <p className="text-xs text-zinc-500 uppercase font-bold flex items-center justify-center gap-1 mt-1">
              {isMotoboy ? <Bike className="h-3 w-3" /> : <Store className="h-3 w-3" />}
              {profile?.email}
            </p>
          </div>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase font-bold">{isMotoboy ? "Nome Completo" : "Nome da Empresa"}</Label>
                <div className="relative">
                  {isMotoboy ? <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" /> : <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />}
                  <Input 
                    className="bg-black border-zinc-800 pl-10 text-white" 
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>

              {isMotoboy && (
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase font-bold">Nome de Usuário (Comunidade)</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                    <Input 
                      placeholder="Ex: joao_motoca"
                      className="bg-black border-zinc-800 pl-10 text-white" 
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase font-bold">{isMotoboy ? "CPF" : "CNPJ"}</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input 
                    placeholder={isMotoboy ? "000.000.000-00" : "00.000.000/0001-00"}
                    className="bg-black border-zinc-800 pl-10 text-white" 
                    value={formData.document}
                    onChange={(e) => setFormData({...formData, document: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase font-bold">Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  <Input 
                    placeholder="(11) 99999-9999"
                    className="bg-black border-zinc-800 pl-10 text-white" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

             
              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending || isUploading} 
                  className="w-full bg-yellow-500 text-black font-black uppercase tracking-widest h-12 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5 mr-2" /> Salvar Alterações</>}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </main>

      <NavBar />
    </div>
  );
};

export default Profile;