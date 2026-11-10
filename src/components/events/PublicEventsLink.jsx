import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from '@/lib/router-compat';
import { ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
export default function PublicEventsLink({ clubId }) {
  const { data: club } = useQuery({ queryKey: ["events-public-club", clubId], enabled: !!clubId, queryFn: () => base44.entities.Club.get(clubId) });
  return club?.slug ? <Button variant="outline" asChild className="min-h-11"><Link to={`/EventSignup?club=${encodeURIComponent(club.slug)}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Public Events</Link></Button> : null;
}