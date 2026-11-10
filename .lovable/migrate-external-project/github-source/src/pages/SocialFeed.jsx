import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Loader2, ImageIcon, Hash, Filter, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/lib/TenantContext";
import { Link } from "react-router-dom";

export default function SocialFeed() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState("all");

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    setLoading(true);
    base44.functions.invoke("list-feed-posts", { club_id: clubId, branch_id: branch === "all" ? "" : branch })
      .then((res) => setData(res?.data || res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clubId, branch]);

  if (!clubId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-muted-foreground">Social feed is available on a club's subdomain.</p>
          <Link to="/" className="text-primary underline mt-2 inline-block">Go home</Link>
        </div>
      </div>
    );
  }

  const club = data?.club || {};
  const posts = data?.posts || [];
  const branches = data?.branches || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Club header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          {club.logo_url ? <img src={club.logo_url} alt={club.name} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: club.primary_color || "#5048e5" }}>{(club.name || "C")[0]}</div>}
          <div className="flex-1 min-w-0"><h1 className="font-bold text-sm truncate">{club.name || "Club"} Feed</h1><p className="text-xs text-muted-foreground">Latest updates</p></div>
          {branches.length > 0 && (
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-28 h-8 text-xs"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">No posts yet. Check back soon for club updates.</p>
          </div>
        ) : (
          posts.map((p) => (
            <article key={p.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {p.media_urls?.[0] && <img src={p.media_urls[0]} alt={p.alt_text || p.title} className="w-full max-h-96 object-cover" />}
              <div className="p-4 space-y-2">
                {p.event_title && <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{p.event_type?.replace("_", " ")}</p>}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.body}</p>
                {p.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.hashtags.map((h) => <span key={h} className="text-xs text-primary font-medium">#{h}</span>)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1">{p.published_at ? format(parseISO(p.published_at), "MMM d, h:mm a") : ""}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}