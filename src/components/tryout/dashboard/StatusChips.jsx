import React from "react";
import { Badge } from "@/components/ui/badge";
import { REG_STATUS, PAYMENT_STATUS, WAIVER_STATUS, statusMeta } from "@/lib/tryoutRegisterApi";

export function RegBadge({ status }) {
  const m = statusMeta(REG_STATUS, status);
  return <Badge className={m.className}>{m.label}</Badge>;
}

export function PaymentBadge({ status }) {
  const m = statusMeta(PAYMENT_STATUS, status);
  return <Badge className={m.className}>{m.label}</Badge>;
}

export function WaiverBadge({ status }) {
  const m = statusMeta(WAIVER_STATUS, status);
  return <Badge className={m.className}>{m.label}</Badge>;
}

export function CheckInBadge({ reg }) {
  if (reg.checked_in) return <Badge className="bg-emerald-100 text-emerald-700">Checked in</Badge>;
  if (reg.status === "waitlist") return <Badge className="bg-amber-100 text-amber-700">Waitlist</Badge>;
  if (reg.status === "pooled") return <Badge className="bg-slate-100 text-slate-700">In the pool</Badge>;
  if (reg.status === "cancelled") return <Badge className="bg-rose-100 text-rose-700">Cancelled</Badge>;
  return <Badge variant="outline">Not yet</Badge>;
}

const POOL_LABEL = {
  in_pool: "In pool",
  registered: "Signed up",
  offered: "Offered",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export function PoolBadge({ status }) {
  if (!status) return null;
  return <Badge variant="outline">{POOL_LABEL[status] || status}</Badge>;
}