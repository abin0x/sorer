import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import PositionGuide from "@/components/knowledge/PositionGuide";
import { resolvePositionKey } from "@/components/knowledge/positionGuideData";

// Embeds the club's Position Guide (from the Player Development reference doc),
// pre-selected to this player's position, on the player profile page.
export default function PositionKnowledge({ position }) {
  const key = resolvePositionKey(position);

  if (!key) {
    return (
      <Card className="adisal-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {position ? `No position guide entry for "${position}" yet.` : "No position assigned to this player."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <PositionGuide initialPositionKey={key} compact />;
}