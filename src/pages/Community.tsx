import { useState } from "react";
import {
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  Trash2,
  Trophy,
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

const categoriasFeed = ["Todos", "Informações", "Reclamações", "Trocas", "Melhorias"];

const alertTypeLabels: Record<string, string> = {
  blitz: "Blitz",
  danger: "Trânsito / Acidente",
  restaurante: "Restaurante",
};

const Community = () => {
  const [newPost, setNewPost] = useState("");
  const [postCategory, setPostCategory] = useState("Informações");
  const [activeFeedTab, setActiveFeedTab] = useState("Todos");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [alertContent, setAlertContent] = useState("");
  const [alertLocation, setAlertLocation] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [alertType, setAlertType] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const userName = profile?.username || profile?.full_name || "Motoca Anônimo";
  const userId = profile?.user?.id;
  const userPoints = profile?.reputation_points || 0;
  const userAvatar = profile?.avatar_url;

  const fetchCurrentAuthor = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Faça login para continuar.");
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
      authorName: data?.username || data?.full_name || "Motoca Anônimo",
      userId: user.id,
    };
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

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
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
    .filter((post: any) => activeFeedTab === "Todos" || post.category === activeFeedTab)
    .sort((a: any, b: any) => {
      const scoreA = (a.likes?.length || 0) + (a.comments?.length || 0);
      const scoreB = (b.likes?.length || 0) + (b.comments?.length || 0);

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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
    mutationFn: async (postId: string) => {
      if (!userId) {
        throw new Error("Acesso negado.");
      }

      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId);

      if (error) {
        throw error;
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
    mutationFn: async (content: string) => {
      const { authorName, userId: currentUserId } = await fetchCurrentAuthor();

      const { error } = await supabase.from("community_posts").insert([
        {
          author_name: authorName,
          category: postCategory,
          description: content,
          location: "Geral",
          type: "post",
          user_id: currentUserId,
          zone: "Geral",
        },
      ]);

      if (error) {
        throw error;
      }

      await updatePoints(10);
    },
    onSuccess: () => {
      setNewPost("");
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
      toast({
        title: "Postado!",
        description: "Sua mensagem está no feed e você ganhou +10 pontos.",
      });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (post: any) => {
      if (!userId) {
        throw new Error("Faça login para curtir.");
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
  });

  const sendCommentMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) {
        throw new Error("Faça login para comentar.");
      }

      const { error } = await supabase.from("comments").insert([
        {
          content: commentText,
          post_id: postId,
          user_id: userId,
        },
      ]);

      if (error) {
        throw error;
      }

      await updatePoints(2);
    },
    onSuccess: () => {
      setCommentText("");
      setCommentingOn(null);
      queryClient.invalidateQueries({ queryKey: ["community_feed"] });
      toast({
        title: "Comentário enviado!",
        description: "+2 pontos pela interação!",
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
          ? "Os motoboys com push ativo foram avisados. +10 pontos."
          : "O alerta foi salvo na comunidade. +10 pontos.",
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

  const canSendAlert =
    Boolean(alertType) &&
    Boolean(selectedZone) &&
    alertLocation.trim().length > 0 &&
    alertContent.trim().length > 0;

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
                        <SelectItem value="Informações">Informações</SelectItem>
                        <SelectItem value="Reclamações">Reclamações</SelectItem>
                        <SelectItem value="Trocas">Trocas</SelectItem>
                        <SelectItem value="Melhorias">Melhorias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex overflow-hidden rounded-xl border border-zinc-800 bg-black pr-1">
                  <Input
                    placeholder="Manda a visão pra rapaziada..."
                    className="h-12 border-0 bg-transparent text-white focus-visible:ring-0"
                    value={newPost}
                    onChange={(event) => setNewPost(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newPost.trim()) {
                        sendPostMutation.mutate(newPost.trim());
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="self-center text-yellow-500"
                    disabled={sendPostMutation.isPending || !newPost.trim()}
                    onClick={() => sendPostMutation.mutate(newPost.trim())}
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

            {loadingFeed ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : (
              filteredAndSortedPosts.map((post: any) => {
                const hasLiked = post.likes?.some((like: any) => like.user_id === userId);
                const isMyPost = post.user_id === userId;
                const postAuthorName =
                  post.profiles?.username || post.profiles?.full_name || post.author_name;

                return (
                  <Card key={post.id} className="overflow-hidden border-zinc-800 bg-zinc-900">
                    <div className="flex flex-row items-center gap-3 p-4 pb-2">
                      <AvatarUI
                        url={post.profiles?.avatar_url}
                        name={postAuthorName}
                        size="md"
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-bold text-white">
                            {postAuthorName}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-zinc-800 bg-black text-[9px] text-zinc-400"
                            >
                              {post.category}
                            </Badge>
                            {isMyPost && (
                              <button
                                onClick={() =>
                                  confirm("Deseja apagar sua postagem? (-10 pontos)") &&
                                  deletePostMutation.mutate(post.id)
                                }
                                className="text-zinc-600 transition-colors hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] uppercase text-zinc-500">
                          {post.created_at
                            ? formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })
                            : "Agora"}
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 pt-2 text-sm leading-relaxed text-zinc-200">
                      {post.description}
                    </CardContent>

                    <div className="flex items-center justify-between border-t border-zinc-800 p-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "gap-2",
                          hasLiked ? "text-red-500" : "text-zinc-500 hover:text-red-400",
                        )}
                        onClick={() => toggleLikeMutation.mutate(post)}
                      >
                        <Heart className={cn("h-4 w-4", hasLiked && "fill-current")} />
                        {post.likes?.length || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-zinc-500 hover:text-yellow-500"
                        onClick={() =>
                          setCommentingOn(commentingOn === post.id ? null : post.id)
                        }
                      >
                        <MessageSquare className="h-4 w-4" />
                        {post.comments?.length || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-zinc-600 hover:text-red-400"
                        onClick={() =>
                          toast({
                            title: "Denúncia enviada!",
                            description: "Analisaremos o conteúdo.",
                          })
                        }
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </Button>
                    </div>

                    {commentingOn === post.id && (
                      <div className="space-y-3 border-t border-zinc-800/50 bg-black p-3">
                        {post.comments?.map((comment: any) => (
                          <div key={comment.id} className="flex gap-2">
                            <AvatarUI
                              url={comment.profiles?.avatar_url}
                              name={comment.profiles?.username || comment.profiles?.full_name}
                              size="sm"
                            />
                            <div className="flex-1 rounded-xl rounded-tl-none bg-zinc-900 p-2 px-3">
                              <p className="text-xs font-bold text-zinc-300">
                                {comment.profiles?.username || comment.profiles?.full_name}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-400">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-2">
                          <Input
                            placeholder="Comentar..."
                            className="h-8 flex-1 border-zinc-800 bg-zinc-900 text-xs text-white"
                            value={commentText}
                            onChange={(event) => setCommentText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && commentText.trim()) {
                                sendCommentMutation.mutate(post.id);
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-yellow-500"
                            onClick={() => commentText.trim() && sendCommentMutation.mutate(post.id)}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4 space-y-4">
            <Card className="border-red-500/20 bg-zinc-900">
              <CardContent className="space-y-3 p-4">
                <div className="flex gap-2">
                  <Select onValueChange={setSelectedZone} value={selectedZone}>
                    <SelectTrigger className="w-[120px] border-zinc-800 bg-black text-xs">
                      <SelectValue placeholder="Zona?" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                      <SelectItem value="Norte">Z. Norte</SelectItem>
                      <SelectItem value="Leste">Z. Leste</SelectItem>
                      <SelectItem value="Oeste">Z. Oeste</SelectItem>
                      <SelectItem value="Sul">Z. Sul</SelectItem>
                      <SelectItem value="Centro">Centro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={setAlertType} value={alertType}>
                    <SelectTrigger className="flex-1 border-zinc-800 bg-black text-xs">
                      <SelectValue placeholder="Tipo de Alerta?" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900 text-white">
                      <SelectItem value="blitz">Blitz</SelectItem>
                      <SelectItem value="danger">Trânsito/Acidente</SelectItem>
                      <SelectItem value="restaurante">Restaurante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  placeholder="Localização (Ex: Av. Paulista)"
                  className="h-10 border-zinc-800 bg-black text-white"
                  value={alertLocation}
                  onChange={(event) => setAlertLocation(event.target.value)}
                />

                <div className="flex overflow-hidden rounded-lg border border-zinc-800 bg-black pr-2">
                  <Input
                    placeholder="O que está rolando?"
                    className="border-0 bg-transparent text-white focus-visible:ring-0"
                    value={alertContent}
                    onChange={(event) => setAlertContent(event.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500"
                    disabled={sendAlertMutation.isPending || !canSendAlert}
                    onClick={() =>
                      sendAlertMutation.mutate({
                        author_name: userName,
                        description: alertContent.trim(),
                        location: alertLocation.trim(),
                        type: alertType,
                        user_id: userId,
                        zone: selectedZone,
                      })
                    }
                  >
                    {sendAlertMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loadingAlerts ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              </div>
            ) : (
              alerts.map((alert: any) => (
                <Card key={alert.id} className="border-l-4 border-zinc-800 bg-zinc-900/40">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
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
                              confirm("Apagar alerta?") &&
                              deletePostMutation.mutate(alert.id)
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
                      <div className="w-6 text-center text-sm font-bold">
                        {index + 1}º
                      </div>
                      <AvatarUI
                        url={user.avatar_url}
                        name={user.username || user.full_name}
                        size="md"
                      />
                      <span className="text-sm font-bold text-white">
                        {user.id === userId ? "Você" : user.username || user.full_name}
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
