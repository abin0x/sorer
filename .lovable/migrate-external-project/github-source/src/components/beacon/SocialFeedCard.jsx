import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Heart, MessageCircle, Clock3 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SocialFeedCard({ post, onLike, liked, commentCount }) {
  const [signedUrl, setSignedUrl] = useState("");
  const likeCount = post.reactions?.["❤️"]?.length || 0;
  const pending = post.moderation_status === "pending";

  useEffect(() => {
    if (!post.image_uri) return;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: post.image_uri }).then((r) => setSignedUrl(r.signed_url));
  }, [post.image_uri]);

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      {post.image_uri && (
        <div className="aspect-square bg-muted overflow-hidden">
          {signedUrl && <img src={signedUrl} alt="" className="w-full h-full object-cover" />}
        </div>
      )}
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {post.author_name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-sm font-semibold text-foreground truncate">{post.author_name}</span>
          {pending && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              <Clock3 className="w-3 h-3" /> Pending
            </span>
          )}
        </div>
        {post.content && <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">{post.content}</p>}
        <div className="flex items-center gap-4 text-muted-foreground">
          <button onClick={() => onLike(post)} className={`flex items-center gap-1 text-xs ${liked ? "text-rose-500" : "hover:text-rose-500"}`}>
            <Heart className={`w-4 h-4 ${liked ? "fill-rose-500" : ""}`} /> {likeCount}
          </button>
          <span className="flex items-center gap-1 text-xs"><MessageCircle className="w-4 h-4" /> {commentCount}</span>
          <span className="text-[11px] ml-auto">{format(new Date(post.created_date), "MMM d")}</span>
        </div>
      </div>
    </div>
  );
}