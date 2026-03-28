import { createServiceClient } from "../_shared/supabase.ts";
import {
  buildAppRouteUrl,
  corsHeaders,
  getAppIconUrl,
  getOneSignalAppId,
  getOneSignalRestApiKey,
  sendOneSignalToUsers,
} from "../_shared/push.ts";

type CommentPayload = {
  actorId?: string;
  appId?: string;
  content?: string;
  postId?: string;
};

const buildCommentBody = (actorName: string, content?: string) => {
  const normalizedContent = content?.trim();

  if (!normalizedContent) {
    return `${actorName} comentou em um post que voce participa.`;
  }

  return `${actorName} comentou: ${normalizedContent}`.slice(0, 120);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: corsHeaders,
      status: 405,
    });
  }

  try {
    const { actorId, appId, content, postId } = (await request.json()) as CommentPayload;

    if (!actorId || !postId) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const supabase = createServiceClient();

    const [
      { data: post, error: postError },
      { data: actorProfile, error: actorError },
      { data: comments, error: commentsError },
    ] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id, user_id")
        .eq("id", postId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", actorId)
        .maybeSingle(),
      supabase
        .from("comments")
        .select("user_id")
        .eq("post_id", postId),
    ]);

    if (postError) {
      throw postError;
    }

    if (actorError) {
      throw actorError;
    }

    if (commentsError) {
      throw commentsError;
    }

    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        headers: corsHeaders,
        status: 404,
      });
    }

    const recipientIds = [...new Set([
      post.user_id,
      ...(comments ?? []).map((comment) => comment.user_id),
    ])].filter((userId) => Boolean(userId) && userId !== actorId);

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, recipients: 0 }), {
        headers: corsHeaders,
        status: 200,
      });
    }

    const actorName =
      actorProfile?.username?.trim() ||
      actorProfile?.full_name?.trim() ||
      "Alguem";

    const restApiKey = getOneSignalRestApiKey();
    const oneSignalAppId = getOneSignalAppId(appId);
    const iconUrl = getAppIconUrl(request);
    const webUrl = buildAppRouteUrl(request, "/#/community");

    const result = await sendOneSignalToUsers({
      appId: oneSignalAppId,
      contents: {
        en: buildCommentBody(actorName, content),
        pt: buildCommentBody(actorName, content),
      },
      data: {
        communityPostId: postId,
        screen: "community",
        type: "comment",
      },
      headings: {
        en: "Novo comentario na comunidade",
        pt: "Novo comentario na comunidade",
      },
      iconUrl,
      restApiKey,
      userIds: recipientIds,
      webUrl,
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        headers: corsHeaders,
        status: 500,
      },
    );
  }
});
