import React from "react";
import PostComposer from "./PostComposer";
import CampaignDialog from "./CampaignDialog";

// composer: null | { event, post }   campaign: null | marketing event
export default function MarketingDialogs({ clubId, user, composer, campaign, onCloseComposer, onCloseCampaign }) {
  return (
    <>
      <PostComposer open={!!composer} onOpenChange={(o) => !o && onCloseComposer()} event={composer?.event} post={composer?.post} clubId={clubId} user={user} />
      <CampaignDialog open={!!campaign} onOpenChange={(o) => !o && onCloseCampaign()} event={campaign} clubId={clubId} />
    </>
  );
}