import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDefaultStoreAvatar } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const CATEGORIES = ["Oleo", "Pneus", "Freios", "Servicos", "Acessorios"];
const STORE_IMAGE_BUCKET = "rotacerta_images";
const MAX_STORE_IMAGE_SIZE = 5 * 1024 * 1024;
const OFFER_PHOTO_INPUT_ID = "store-offer-photo-upload";

const buildOfferImagePath = (userId: string, fileName: string) => {
  const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `stores/${userId}/offers-${crypto.randomUUID()}.${fileExt}`;
};

const AdminLoja = () => {
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [selectedOfferImage, setSelectedOfferImage] = useState<File | null>(null);
  const [offerImagePreviewUrl, setOfferImagePreviewUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const offerPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (offerImagePreviewUrl) {
        URL.revokeObjectURL(offerImagePreviewUrl);
      }
    };
  }, [offerImagePreviewUrl]);

  const { data: profile } = useQuery({
    queryKey: ["user-profile-shop"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return { ...data, user };
    },
  });

  const myShopName = profile?.full_name || "Motopecas Parceira";
  const userId = profile?.user?.id;
  const storeWhatsapp = (profile?.phone || "").trim();

  const clearSelectedOfferImage = () => {
    if (offerImagePreviewUrl) {
      URL.revokeObjectURL(offerImagePreviewUrl);
    }

    setSelectedOfferImage(null);
    setOfferImagePreviewUrl("");

    if (offerPhotoInputRef.current) {
      offerPhotoInputRef.current.value = "";
    }
  };

  const validateImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
    }

    if (file.size > MAX_STORE_IMAGE_SIZE) {
      throw new Error("A foto precisa ter no maximo 5MB.");
    }
  };

  const handleOfferPhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      validateImageFile(file);

      if (offerImagePreviewUrl) {
        URL.revokeObjectURL(offerImagePreviewUrl);
      }

      setSelectedOfferImage(file);
      setOfferImagePreviewUrl(URL.createObjectURL(file));
    } catch (error: any) {
      toast({
        title: "Erro ao selecionar foto",
        description: error.message,
        variant: "destructive",
      });
      clearSelectedOfferImage();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/login");
    toast({
      title: "Sessao encerrada",
      description: "Voce saiu com seguranca.",
    });
  };

  const { data: myOffers = [], isLoading } = useQuery({
    queryKey: ["my_store_offers", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_offers")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const addOfferMutation = useMutation({
    mutationFn: async ({ imageFile, ...newOffer }: any) => {
      let imageUrl = profile?.avatar_url || getDefaultStoreAvatar();

      if (imageFile) {
        const imagePath = buildOfferImagePath(newOffer.user_id, imageFile.name);
        const { error: uploadError } = await supabase.storage
          .from(STORE_IMAGE_BUCKET)
          .upload(imagePath, imageFile, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(STORE_IMAGE_BUCKET).getPublicUrl(imagePath);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from("store_offers")
        .insert([{ ...newOffer, image: imageUrl }]);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_store_offers"] });
      queryClient.invalidateQueries({ queryKey: ["store_offers"] });
      clearSelectedOfferImage();
      setIsAddingOffer(false);
      toast({
        title: "Oferta no ar",
        description: "Os motoboys ja podem ver seu produto.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) {
        throw new Error("Usuario nao autenticado.");
      }

      const { error } = await supabase
        .from("store_offers")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_store_offers"] });
      queryClient.invalidateQueries({ queryKey: ["store_offers"] });
      toast({
        title: "Oferta removida",
        description: "O produto foi retirado da vitrine.",
      });
    },
  });

  const handleAddOffer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    if (!storeWhatsapp) {
      toast({
        title: "Cadastre o WhatsApp da loja",
        description: "Preencha o numero em Editar perfil da loja antes de publicar.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    addOfferMutation.mutate({
      user_id: userId,
      shop: myShopName,
      name: formData.get("name"),
      category: formData.get("category"),
      price: Number(formData.get("price")),
      old_price: formData.get("old_price") ? Number(formData.get("old_price")) : null,
      discount: formData.get("discount") || null,
      whatsapp: storeWhatsapp,
      imageFile: selectedOfferImage,
      distance: "1.2 km",
      rating: "5.0",
    });
  };

  return (
    <div className="min-h-screen bg-black pb-24 font-sans text-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-yellow-500/20 bg-zinc-950 p-4">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-yellow-500" />
          <span className="text-lg font-black tracking-tight text-white">PAINEL MOTOPECAS</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            onClick={() =>
              toast({
                title: "Rota Certa PRO",
                description:
                  "Funcionalidade em desenvolvimento. Em breve voce tera relatorios e destaque no topo.",
              })
            }
            className="cursor-pointer border-none bg-yellow-500 font-bold text-black hover:bg-yellow-600"
          >
            PLANO PRO
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 text-red-500 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>

      <main className="mx-auto mt-4 max-w-4xl space-y-6 p-4">
        <div className="mb-2 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-yellow-500/20 bg-zinc-900">
            <img
              src={profile?.avatar_url || getDefaultStoreAvatar()}
              alt={myShopName}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{myShopName}</h1>
            <p className="text-sm text-zinc-400">
              Gerencie sua vitrine para a comunidade de entregadores.
            </p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-1 text-xs font-bold text-yellow-500 hover:underline"
            >
              Editar perfil da loja
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <Package className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{isLoading ? "-" : myOffers.length}</p>
                <p className="text-[10px] font-bold uppercase text-zinc-400">Ofertas Ativas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-full bg-green-500/10 p-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {myOffers.reduce((acc: number, offer: any) => acc + (offer.whatsapp_clicks || 0), 0)}
                </p>
                <p className="text-[10px] font-bold uppercase text-zinc-400">Cliques WhatsApp</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden border-zinc-800 bg-zinc-900 md:flex">
            <CardContent className="flex w-full flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {myOffers.reduce((acc: number, offer: any) => acc + (offer.views || 0), 0)}
                </p>
                <p className="text-[10px] font-bold uppercase text-zinc-400">Visualizacoes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden border-zinc-800 bg-zinc-900 md:flex">
            <CardContent className="flex w-full flex-col items-center gap-2 p-4 text-center">
              <div className="rounded-full bg-purple-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">Alto</p>
                <p className="text-[10px] font-bold uppercase text-zinc-400">Engajamento</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Sua Vitrine</h2>
          </div>

          <Sheet
            open={isAddingOffer}
            onOpenChange={(open) => {
              setIsAddingOffer(open);

              if (!open) {
                clearSelectedOfferImage();
              }
            }}
          >
            <SheetTrigger asChild>
              <Button className="bg-yellow-500 font-bold text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-600">
                <Plus className="mr-2 h-4 w-4" /> Anunciar Produto
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto border-l border-yellow-500/20 bg-zinc-950 text-white sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-yellow-500">
                  <Tag className="h-5 w-5" /> Nova Oferta
                </SheetTitle>
                <SheetDescription className="text-zinc-400">
                  Preencha os dados. O produto vai aparecer na hora pro motoboy.
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleAddOffer} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>O que voce esta vendendo?</Label>
                  <Input
                    name="name"
                    placeholder="Ex: Pneu Michelin City Pro 90/90-18"
                    className="border-zinc-800 bg-black text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select
                    name="category"
                    className="h-10 w-full rounded-md border border-zinc-800 bg-black px-3 text-sm text-white"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-yellow-500">Preco Atual (R$)</Label>
                    <Input
                      name="price"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 219.90"
                      className="border-yellow-500/50 bg-black font-bold text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500">Preco Antigo (Opcional)</Label>
                    <Input
                      name="old_price"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 260.00"
                      className="border-zinc-800 bg-black text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tag de Desconto</Label>
                    <Input
                      name="discount"
                      placeholder="Ex: 15% OFF"
                      className="border-zinc-800 bg-black text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp da Loja</Label>
                    <Input
                      value={storeWhatsapp || "Cadastre em Editar perfil da loja"}
                      className="border-zinc-800 bg-zinc-900 text-zinc-400"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Foto do Produto</Label>

                  {offerImagePreviewUrl && (
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                      <img
                        src={offerImagePreviewUrl}
                        alt="Preview do produto"
                        className="h-48 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearSelectedOfferImage}
                        className="absolute right-3 top-3 rounded-full bg-black/80 p-2 text-white transition-colors hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <input
                    id={OFFER_PHOTO_INPUT_ID}
                    ref={offerPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleOfferPhotoSelection}
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-800"
                    >
                      <label htmlFor={OFFER_PHOTO_INPUT_ID}>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Foto do Produto
                      </label>
                    </Button>
                    {selectedOfferImage && (
                      <span className="truncate text-xs text-zinc-500">{selectedOfferImage.name}</span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500">
                    Se nao enviar uma foto, a oferta usa a foto atual da loja.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={addOfferMutation.isPending}
                  className="mt-4 h-12 w-full bg-yellow-500 font-black uppercase tracking-widest text-black hover:bg-yellow-400"
                >
                  {addOfferMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Publicar Oferta"
                  )}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            </div>
          ) : myOffers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 py-12 text-center">
              <Store className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
              <p className="font-medium text-zinc-400">Sua vitrine esta vazia.</p>
              <p className="mt-1 text-xs text-zinc-500">
                Clique em "Anunciar Produto" para comecar a vender.
              </p>
            </div>
          ) : (
            myOffers.map((offer: any) => (
              <Card
                key={offer.id}
                className="flex flex-col overflow-hidden border-zinc-800 bg-zinc-900 sm:flex-row"
              >
                <div className="relative h-32 w-full sm:w-32">
                  <img src={offer.image} alt={offer.name} className="h-full w-full object-cover" />
                  {offer.discount && (
                    <Badge className="absolute left-2 top-2 border-none bg-red-600 text-[10px] text-white">
                      {offer.discount}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge
                        variant="outline"
                        className="mb-2 border-zinc-700 text-[10px] text-zinc-400"
                      >
                        {offer.category}
                      </Badge>
                      <h3 className="text-sm font-bold leading-tight text-white">{offer.name}</h3>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => {
                        if (window.confirm("Tem certeza que deseja apagar esta oferta?")) {
                          deleteOfferMutation.mutate(offer.id);
                        }
                      }}
                      disabled={deleteOfferMutation.isPending}
                    >
                      {deleteOfferMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-lg font-black text-yellow-500">
                      R$ {Number(offer.price).toFixed(2)}
                    </span>
                    {offer.old_price && (
                      <span className="mb-1 text-xs text-zinc-500 line-through">
                        R$ {Number(offer.old_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLoja;
