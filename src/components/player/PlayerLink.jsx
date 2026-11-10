import React from "react";
import { Link } from '@/lib/router-compat';
import { createPageUrl } from "@/utils";

/**
 * Renders a clickable player name that navigates to the PlayerDetail dashboard.
 * If no playerId is provided, renders a plain span (e.g. for tryout signups not yet enrolled).
 */
export default function PlayerLink({ playerId, name, className = "", onClick }) {
  if (!playerId) return <span className={className}>{name}</span>;
  return (
    <Link
      to={`${createPageUrl("PlayerDetail")}?id=${playerId}`}
      className={`text-blue-600 dark:text-blue-400 hover:underline ${className}`}
      onClick={onClick}
    >
      {name}
    </Link>
  );
}