import { useEffect, useRef, useState } from "react";
import {
  Heart,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import NavBar from "@/components/NavBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ONE_SIGNAL_APP_ID } from "@/lib/onesignal";
import { cn } from "@/lib/utils";

const COMMUNITY_IMAGE_BUCKET = "rotacerta_images";
const COMMUNITY_CLEANUP_STORAGE_KEY = "community_cleanup_last_run_v1";
const COMMUNITY_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const MAX_COMMUNITY_IMAGE_SIZE = 5 * 1024 * 1024;
const PHOTO_ONLY_PLACEHOLDER = "Foto compartilhada na comunidade.";

const categoriasFeed = ["Todos", "Informacoes", "Reclamacoes", "Trocas", "Melhorias"];

const alertTypeLabels: Record<string, string> = {
  blitz: "Blitz",
  danger: "Transito / Acidente",
  restaurante: "Restaurante",
};

const isVisibleCommunityPost = (post: any) => {
  if (!post || post.removed_at) {
    return false;
  }

  if (!post.expires_at) {
    return true;
  }

  const expirationTime = new Date(post.expires_at).getTime();

  if (Number.isNaN(expirationTime)) {
    return true;
  }

  return expirationTime > Date.now();
};

const buildCommunityImagePath = (userId: string, fileName: string) => {
  const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `community/${userId}/${crypto.randomUUID()}.${fileExt}`;
};

const Community = () => {
  const [newPost, setNewPost] = useState("");
  const [postCategory, setPostCategory] = useState("Informacoes");
  const [activeFeedTab, setActiveFeedTab] = useState("Todos");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [alertContent, setAlertContent] = useState("");
  const [alertLocation, setAlertLocation] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [alertType, setAlertType] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    let isMounted = true;

    const maybeCleanupExpiredPosts = async () => {
      try {
        const lastCleanup = Number(localStorage.getItem(COMMUNITY_CLEANUP_STORAGE_KEY) || 0);
        const now = Date.now();

        if (lastCleanup && now - lastCleanup < COMMUNITY_CLEANUP_INTERVAL_MS) {
          return;
        }

        localStorage.setItem(COMMUNITY_CLEANUP_STORAGE_KEY, String(now));

        const { data, error } = await supabase.functions.invoke("cleanup-community-posts");

        if (error) {
          throw error;
        }

        if (!isMounted || !data?.deleted) {
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["community_feed"] });
        queryClient.invalidateQueries({ queryKey: ["community_alerts"] });
      } catch (error) {
        console.warn("Nao foi possivel limpar posts expirados da comunidade:", error);
      }
    };

    void maybeCleanupExpiredPosts();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
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

  const userName = profile?.username || profile?.full_name || "Motoca Anonimo";
  const userId = profile?.user?.id;
  const userPoints = profile?.reputation_points || 0;
  const userAvatar = profile?.avatar_url;

  const { data: myReports = [] } = useQuery({
    queryKey: ["community_my_reports", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_post_reports")
        .select("post_id")
        .eq("reporter_id", userId);

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const reportedPostIds = new Set(myReports.map((report: any) => report.post_id));

  const fetchCurrentAuthor = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Faca login para continuar.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return {
      authorName: data?.username || data?.full_name || "Motoca Anonimo",
      userId: user.id,
    };
  };

  const clearSelectedPhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setSelectedPhoto(null);
    setPhotoPreviewUrl("");

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  const { data: rawFeedPosts = [], isLoading: loadingFeed } = useQuery({
    queryKey: ["community_feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles:user_id ( avatar_url, full_name, username ),
          likes ( id, user_id ),
          comments ( id, content, created_at, profiles:user_id ( full_name, username, avatar_url ) )
        `)
        .eq("type", "post")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    },
    refetchInterval: 5000,
  });

  const { data: rawAlerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ["community_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*, profiles:user_id ( avatar_url )")
        .neq("type", "post")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return data;
    },
    refetchInterval: 5000,
  });

  const { data: ranking = [], isLoading: loadingRanking } = useQuery({
    queryKey: ["community_ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, reputation_points, avatar_url")
        .order("reputation_points", { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const filteredAndSortedPosts = [...rawFeedPosts]
    .filter((post: any) => isVisibleCommunityPost(post))
    .filter((post: any) => activeFeedTab === "Todos" || post.category === activeFeedTab)
    .sort((a: any, b: any) => {
      const scoreA = (a.likes?.length || 0) + (a.comments?.length || 0);
      const scoreB = (b.likes?.length || 0) + (b.comments?.length || 0);

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const alerts = rawAlerts.filter((alert: any) => isVisibleCommunityPost(alert));

  const updatePoints = async (pointsChange: number) => {
    if (!userId) {
      return;
    }

    const { error } = await supabase.rpc("increment_reputation", {
      amount: pointsChange,
      row_id: userId,
    });

    if (error) {
      await supabase
        .from("profiles")
        .update({ reputation_points: userPoints + pointsChange })
        .eq("id", userId);
    }

    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    queryClient.invalidateQueries({ queryKey: ["community_ranking"] });
  };

  const deletePostMutation = useMutation({
    mutationFn: async (post: any) => {
      if (!userId) {
        throw new Error("Acesso negado.");
      }

      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", post.id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      if (post.image_path) {
        await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).remove([post.image_path]);
      }

      await updatePoints(-10);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
      queryClient.invalidateQueries({ queryKey: ["community_alerts"] });
      toast({
        title: "Post removido!",
        description: "Seus pontos foram atualizados.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendPostMutation = useMutation({
    mutationFn: async ({
      content,
      imageFile,
    }: {
      content: string;
      imageFile: File | null;
    }) => {
      const { authorName, userId: currentUserId } = await fetchCurrentAuthor();

      let imagePath: string | null = null;
      let imageUrl: string | null = null;

      if (imageFile) {
        imagePath = buildCommunityImagePath(currentUserId, imageFile.name);

        const { error: uploadError } = await supabase.storage
          .from(COMMUNITY_IMAGE_BUCKET)
          .upload(imagePath, imageFile, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(COMMUNITY_IMAGE_BUCKET).getPublicUrl(imagePath);

        imageUrl = publicUrl;
      }

      const normalizedContent = content.trim() || (imageFile ? PHOTO_ONLY_PLACEHOLDER : "");

      if (!normalizedContent) {
        throw new Error("Escreva algo ou selecione uma foto para postar.");
      }

      const { error } = await supabase.from("community_posts").insert([
        {
          author_name: authorName,
          category: postCategory,
          description: normalizedContent,
          image_path: imagePath,
          image_url: imageUrl,
          location: "Geral",
          type: "post",
          user_id: currentUserId,
          zone: "Geral",
        },
      ]);

      if (error) {
        if (imagePath) {
          await supabase.storage.from(COMMUNITY_IMAGE_BUCKET).remove([imagePath]);
        }

        throw error;
      }

      await updatePoints(10);
      return { hasPhoto: Boolean(imageUrl) };
    },
    onSuccess: ({ hasPhoto }: { hasPhoto: boolean }) => {
      setNewPost("");
      clearSelectedPhoto();
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
      toast({
        title: "Postado!",
        description: hasPhoto
          ? "Sua foto ja esta no feed. Ela some sozinha em 72h e voce ganhou +10 pontos."
          : "Sua mensagem esta no feed e voce ganhou +10 pontos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (post: any) => {
      if (!userId) {
        throw new Error("Faca login para curtir.");
      }

      const hasLiked = post.likes?.some((like: any) => like.user_id === userId);

      if (hasLiked) {
        const like = post.likes.find((item: any) => item.user_id === userId);
        await supabase.from("likes").delete().eq("id", like.id);
        return;
      }

      await supabase.from("likes").insert([{ post_id: post.id, user_id: userId }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao curtir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendCommentMutation = useMutation({
    mutationFn: async ({
      content,
      postId,
    }: {
      content: string;
      postId: string;
    }) => {
      if (!userId) {
        throw new Error("Faca login para comentar.");
      }

      const normalizedContent = content.trim();

      if (!normalizedContent) {
        throw new Error("Escreva um comentario antes de enviar.");
      }

      const { error } = await supabase.from("comments").insert([
        {
          content: normalizedContent,
          post_id: postId,
          user_id: userId,
        },
      ]);

      if (error) {
        throw error;
      }

      try {
        const { error: notificationError } = await supabase.functions.invoke(
          "notify-community-comment",
          {
            body: {
              actorId: userId,
              appId: ONE_SIGNAL_APP_ID,
              content: normalizedContent,
              postId,
            },
          },
        );

        if (notificationError) {
          throw notificationError;
        }
      } catch (notificationError) {
        console.warn("Comentario salvo, mas o push nao foi enviado:", notificationError);
      }

      await updatePoints(2);
    },
    onSuccess: () => {
      setCommentText("");
      setCommentingOn(null);
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
      toast({
        title: "Comentario enviado!",
        description: "+2 pontos pela interacao!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao comentar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reportPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) {
        throw new Error("Faca login para denunciar.");
      }

      const { error } = await supabase.from("community_post_reports").insert([
        {
          post_id: postId,
          reporter_id: userId,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          return {
            alreadyReported: true,
            removed: false,
            reportCount: null,
          };
        }

        throw error;
      }

      const [
        { count, error: countError },
        { data: postState, error: postStateError },
      ] = await Promise.all([
        supabase
          .from("community_post_reports")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId),
        supabase
          .from("community_posts")
          .select("removed_at")
          .eq("id", postId)
          .single(),
      ]);

      if (countError) {
        throw countError;
      }

      if (postStateError && postStateError.code !== "PGRST116") {
        throw postStateError;
      }

      return {
        alreadyReported: false,
        removed: Boolean(postState?.removed_at),
        reportCount: count || 1,
      };
    },
    onSuccess: ({
      alreadyReported,
      removed,
      reportCount,
    }: {
      alreadyReported: boolean;
      removed: boolean;
      reportCount: number | null;
    }) => {
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
      queryClient.invalidateQueries({ queryKey: ["community_my_reports", userId] });

      if (alreadyReported) {
        toast({
          title: "Denuncia ja enviada",
          description: "Cada pessoa pode denunciar o mesmo post uma vez.",
        });
        return;
      }

      if (removed) {
        toast({
          title: "Post removido",
          description: "A postagem bateu 3 denuncias diferentes e saiu do feed.",
        });
        return;
      }

      toast({
        title: "Denuncia enviada!",
        description: `Recebemos sua denuncia. Total atual: ${reportCount}/3.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao denunciar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const { authorName, userId: currentUserId } = await fetchCurrentAuthor();

      const { data: createdAlert, error } = await supabase
        .from("community_posts")
        .insert([
          {
            ...alertData,
            author_name: authorName,
            user_id: currentUserId,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      let pushSent = false;

      try {
        const { error: functionError } = await supabase.functions.invoke(
          "notify-community-alert",
          {
            body: {
              appId: ONE_SIGNAL_APP_ID,
              authorId: currentUserId,
              post: {
                description: createdAlert.description,
                id: createdAlert.id,
                location: createdAlert.location,
                type: createdAlert.type,
                zone: createdAlert.zone,
              },
            },
          },
        );

        if (functionError) {
          throw functionError;
        }

        pushSent = true;
      } catch (pushError) {
        console.warn("Alerta salvo, mas o push nao foi enviado:", pushError);
      }

      await updatePoints(10);
      return { pushSent };
    },
    onSuccess: ({ pushSent }: { pushSent: boolean }) => {
      setAlertContent("");
      setAlertLocation("");
      setSelectedZone("");
      setAlertType("");
      queryClient.invalidateQueries({ queryKey: ["community_alerts"] });
      toast({
        title: "Alerta enviado!",
        description: pushSent
          ? "Os motoboys com push ativo foram avisados. O alerta sai sozinho em 24h. +10 pontos."
          : "O alerta foi salvo e sai sozinho em 24h. +10 pontos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const AvatarUI = ({
    name,
    size = "md",
    url,
  }: {
    name?: string;
    size?: "sm" | "md" | "lg";
    url?: string;
  }) => {
    const sizes = {
      lg: "h-12 w-12 text-sm",
      md: "h-10 w-10 text-xs",
      sm: "h-6 w-6 text-[8px]",
    };

    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 font-bold uppercase text-zinc-400",
          sizes[size],
        )}
      >
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          (name || "AN").substring(0, 2)
        )}
      </div>
    );
  };

  const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato invalido",
        description: "Escolha uma imagem JPG, PNG ou WEBP.",
        variant: "destructive",
      });
      clearSelectedPhoto();
      return;
    }

    if (file.size > MAX_COMMUNITY_IMAGE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "A foto precisa ter no maximo 5MB.",
        variant: "destructive",
      });
      clearSelectedPhoto();
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setSelectedPhoto(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const canSendAlert =
    Boolean(alertType) &&
    Boolean(selectedZone) &&
    alertLocation.trim().length > 0 &&
    alertContent.trim().length > 0;

  const canPublishPost = newPost.trim().length > 0 || Boolean(selectedPhoto);

  return (
    <div className="min-h-screen bg-black pb-24 text-foreground">
      <div className="sticky top-0 z-10 border-b border-yellow-500/20 bg-black p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <MessageSquare className="h-6 w-6 text-yellow-500" /> Comunidade
          </h1>
          <div className="flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-500">
              {userPoints.toFixed(1)} pts
            </span>
          </div>
        </div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-3 border border-zinc-800 bg-zinc-900">
            <TabsTrigger
              value="feed"
              className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            >
              Feed
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="text-red-500 data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              Alertas
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="text-amber-500 data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4 space-y-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {categoriasFeed.map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className={cn(
                    "cursor-pointer whitespace-nowrap border-zinc-800 px-4 py-1.5 transition-all",
                    activeFeedTab === category
                      ? "border-yellow-500 bg-yellow-500 font-bold text-black"
                      : "text-zinc-400 hover:bg-zinc-800",
                  )}
                  onClick={() => setActiveFeedTab(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>

            <Card className="border-yellow-500/30 bg-zinc-900">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <AvatarUI url={userAvatar} name={userName} size="md" />
                  <div className="flex-1">
                    <Select onValueChange={setPostCategory} value={postCategory}>
                      <SelectTrigger className="h-8 border-zinc-800 bg-black text-xs font-bold text-yellow-500">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                        <SelectItem value="Informacoes">Informacoes</SelectItem>
                        <SelectItem value="Reclamacoes">Reclamacoes</SelectItem>
                        <SelectItem value="Trocas">Trocas</SelectItem>
                        <SelectItem value="Melhorias">Melhorias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-yellow-500/10 bg-black/40 p-3 text-[11px] text-zinc-400">
                  Posts com foto saem automaticamente em 72h. Alertas da aba vermelha saem em
                  24h para economizar espaco no Supabase.
                </div>

                {photoPreviewUrl && (
                  <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                    <img
                      src={photoPreviewUrl}
                      alt="Preview da postagem"
                      className="max-h-72 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearSelectedPhoto}
                      className="absolute right-3 top-3 rounded-full bg-black/80 p-2 text-white transition-colors hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-500">
                      Some em 72h
                    </div>
                  </div>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelection}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-800"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Foto
                  </Button>
                  {selectedPhoto && (
                    <span className="truncate text-xs text-zinc-500">{selectedPhoto.name}</span>
                  )}
                </div>

                <div className="flex overflow-hidden rounded-xl border border-zinc-800 bg-black pr-1">
                  <Input
                    placeholder="Manda a visao pra rapaziada..."
                    className="h-12 border-0 bg-transparent text-white focus-visible:ring-0"
                    value={newPost}
                    onChange={(event) => setNewPost(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && canPublishPost) {
                        sendPostMutation.mutate({
                          content: newPost,
                          imageFile: selectedPhoto,
                        });
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="self-center text-yellow-500"
                    disabled={sendPostMutation.isPending || !canPublishPost}
                    onClick={() =>
                      sendPostMutation.mutate({
                        content: newPost,
                        imageFile: selectedPhoto,
                      })
                    }
                  >
                    {sendPostMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loadingAlerts ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center text-zinc-500">
                Nenhum alerta ativo no momento.
              </div>
            ) : (
              alerts.map((alert: any) => (
                <Card key={alert.id} className="border-l-4 border-zinc-800 bg-zinc-900/40">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-[9px]",
                            alert.type === "blitz" ? "bg-red-600" : "bg-amber-600",
                          )}
                        >
                          {alert.type === "blitz"
                            ? "BLITZ"
                            : alertTypeLabels[alert.type] || "ALERTA"}
                        </Badge>
                        <Badge className="bg-red-500/10 text-[9px] text-red-300">24h</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500">
                          {alert.zone} •{" "}
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {alert.user_id === userId && (
                          <button
                            onClick={() =>
                              confirm("Apagar alerta?") && deletePostMutation.mutate(alert)
                            }
                            className="text-zinc-600 hover:text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="mb-1 text-sm font-bold text-white">
                      <MapPin className="mr-1 inline h-3 w-3 text-red-500" />
                      {alert.location}
                    </h3>
                    <p className="text-sm text-zinc-300">{alert.description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="ranking" className="mt-4 space-y-4">
            <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-b from-yellow-500/10 to-transparent py-6 text-center">
              <Trophy className="mx-auto mb-2 h-10 w-10 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">Elite da Pista</h2>
            </div>

            <div className="space-y-2">
              {loadingRanking ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                </div>
              ) : (
                ranking.map((user: any, index: number) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between rounded-xl border p-3 ${
                      user.id === userId
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center text-sm font-bold">{index + 1}o</div>
                      <AvatarUI
                        url={user.avatar_url}
                        name={user.username || user.full_name}
                        size="md"
                      />
                      <span className="text-sm font-bold text-white">
                        {user.id === userId ? "Voce" : user.username || user.full_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-right">
                      <span className="font-bold text-yellow-500">
                        {Number(user.reputation_points || 0).toFixed(1)}
                      </span>
                      <span className="mt-1 text-[9px] uppercase text-zinc-500">pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <NavBar />
    </div>
  );
};

export default Community;
