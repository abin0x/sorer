// Separate name queries preserve the club filter without depending on legacy $or support.
export async function searchTryoutPlayers(playerEntity, clubId, search) {
  const term = search.trim();
  if (!clubId || term.length < 2) return [];
  const results = await Promise.all(["first_name", "last_name"].map((field) =>
    playerEntity.filter({ club_id: clubId, [field]: { $regex: term } }, null, 20)
  ));
  return [...new Map(results.flat().map((player) => [player.id, player])).values()].slice(0, 20);
}