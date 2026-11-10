export function resolveConsoleClub(clubs, selectedId) {
  return clubs.find((club) => club.id === selectedId) || clubs[0] || null;
}