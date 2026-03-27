import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/push.ts";

const dedupePosts = (posts: Array<{ id: string; image_path?: string | null }>) => {
  const postMap = new Map<string, { id: string; image_path?: string | null }>();

  for (const post of posts) {
    postMap.set(post.id, post);
  }

  return [...postMap.values()];
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
    const supabase = createServiceClient();
    const nowIso = new Date().toISOString();

    const [
      { data: removedPosts, error: removedPostsError },
      { data: expiredPosts, error: expiredPostsError },
    ] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id, image_path")
        .not("removed_at", "is", null)
        .limit(100),
      supabase
        .from("community_posts")
        .select("id, image_path")
        .is("removed_at", null)
        .not("expires_at", "is", null)
        .lte("expires_at", nowIso)
        .limit(100),
    ]);

    if (removedPostsError) {
      throw removedPostsError;
    }

    if (expiredPostsError) {
      throw expiredPostsError;
    }

    const postsToDelete = dedupePosts([...(removedPosts ?? []), ...(expiredPosts ?? [])]);

    if (postsToDelete.length === 0) {
      return new Response(JSON.stringify({ success: true, deleted: 0 }), {
        headers: corsHeaders,
        status: 200,
      });
    }

    const postIds = postsToDelete.map((post) => post.id);
    const imagePaths = postsToDelete
      .map((post) => post.image_path?.trim())
      .filter((path): path is string => Boolean(path));

    const cleanupTasks = [
      supabase.from("community_post_reports").delete().in("post_id", postIds),
      supabase.from("comments").delete().in("post_id", postIds),
      supabase.from("likes").delete().in("post_id", postIds),
    ];

    if (imagePaths.length > 0) {
      cleanupTasks.push(supabase.storage.from("rotacerta_images").remove(imagePaths));
    }

    const cleanupResults = await Promise.all(cleanupTasks);
    const cleanupError = cleanupResults.find((result) => result.error);

    if (cleanupError?.error) {
      throw cleanupError.error;
    }

    const { error: deletePostsError } = await supabase
      .from("community_posts")
      .delete()
      .in("id", postIds);

    if (deletePostsError) {
      throw deletePostsError;
    }

    return new Response(
      JSON.stringify({
        deleted: postIds.length,
        success: true,
      }),
      {
        headers: corsHeaders,
        status: 200,
      },
    );
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
