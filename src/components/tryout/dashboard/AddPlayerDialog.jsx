import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { addPlayerOnBehalf, sessionOptionLabel } from "@/lib/tryoutDashboard";
import { money } from "@/lib/tryoutRegisterApi";
import { searchTryoutPlayers } from "@/lib/tryoutPlayerSearch";

/** Desk registration: a walk-up or late signup the club enters on the
 *  family's behalf, with the fee taken by link, at the desk, or left to pay. */
export default function AddPlayerDialog({ clubId, plans, events, defaultPlanId, onClose, onDone }) {
  const today = new Date().toISOString().slice(0, 10);
  const [planId, setPlanId] = useState(defaultPlanId || plans[0]?.id || "");
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(null);
  const [child, setChild] = useState({ first_name: "", last_name: "", date_of_birth: "", gender: "" });
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [accepted, setAccepted] = useState({});
  const [paper, setPaper] = useState(false);
  const [signature, setSignature] = useState("");
  const [payment, setPayment] = useState("link");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  const plan = plans.find((p) => p.id === planId) || null;
  const sessions = useMemo(
    () => events.filter((e) => e.tryout_plan_id === planId && e.date >= today).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [events, planId, today],
  );

  const { data: found = [], error: searchError } = useQuery({
    queryKey: ["tryoutDashPlayerSearch", clubId, search],
    queryFn: () => searchTryoutPlayers(base44.entities.Player, clubId, search),
    enabled: !!clubId && search.trim().length > 1,
  });

  const pickPlayer = async (p) => {
    setPicked(p);
    setChild({
      first_name: p.first_name || "", last_name: p.last_name || "",
      date_of_birth: p.date_of_birth || "", gender: p.gender || "",
    });
    const guardianId = p.guardian_id || (p.guardian_ids || [])[0];
    if (guardianId) {
      const g = await base44.entities.Guardian.get(guardianId).catch(() => null);
      if (g) setForm({ first_name: g.first_name || "", last_name: g.last_name || "", email: g.email || "", phone: g.phone || "" });
    } else if (p.guardian_name) {
      const parts = String(p.guardian_name).trim().split(" ");
      setForm((f) => ({ ...f, first_name: parts[0] || "", last_name: parts.slice(1).join(" ") }));
    }
    setSearch("");
  };

  const submit = async () => {
    if (!planId || !eventId) { toast.error("Pick the tryout and the session."); return; }
    if (!child.first_name || !child.last_name) { toast.error("The player's name is required."); return; }
    if (!form.first_name || !form.last_name || !form.email) { toast.error("The parent's name and email are required."); return; }
    setBusy(true);
    try {
      const res = await addPlayerOnBehalf({
        club_id: clubId, plan_id: planId, event_id: eventId,
        player: picked ? { id: picked.id, ...child } : child,
        guardian: form,
        waiver: {
          accepted_documents: Object.keys(accepted).filter((k) => accepted[k]),
          paper,
          signature: signature || `${form.first_name} ${form.last_name}`,
        },
        payment, method, reference, note,
      });
      toast.success(`${res.registration?.player_name || "Player"} added${res.waitlisted ? " to the waitlist" : ""}`);
      if (res.warning) toast.info(res.warning);
      if (res.payment_link) setLink(res.payment_link);
      else onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const docs = plan?.required_documents || [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Register a player on the family's behalf</DialogTitle></DialogHeader>

        {link ? (
          <div className="space-y-3 py-2">
            <p className="text-sm">The player is registered and the fee is waiting on payment. Send this link to the family:</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => { navigator.clipboard?.writeText(link); toast.success("Link copied"); }}
              >
                <Copy className="w-4 h-4" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The spot is held as awaiting payment until the payment processor confirms it, and the family's registration page shows the same link.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Tryout</Label>
                <Select value={planId} onValueChange={(v) => { setPlanId(v); setEventId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Pick the tryout" /></SelectTrigger>
                  <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger><SelectValue placeholder={sessions.length ? "Pick the session" : "No upcoming sessions"} /></SelectTrigger>
                  <SelectContent>{sessions.map((e) => <SelectItem key={e.id} value={e.id}>{sessionOptionLabel(e)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Player</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search an existing club player by name…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPicked(null); }}
                />
              </div>
              {searchError && <p role="alert" className="text-sm text-destructive">Could not search club players. {searchError.message}</p>}
              {found.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                  {found.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left p-2.5 hover:bg-muted/50"
                      onClick={() => pickPlayer(p)}
                    >
                      <p className="text-sm font-medium">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-muted-foreground">{p.date_of_birth || "No date of birth"} · {p.age_group || "No age group"}{p.team_name ? ` · ${p.team_name}` : ""}</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-4 gap-3 pt-1">
                <Input placeholder="First name" value={child.first_name} onChange={(e) => setChild({ ...child, first_name: e.target.value })} />
                <Input placeholder="Last name" value={child.last_name} onChange={(e) => setChild({ ...child, last_name: e.target.value })} />
                <Input type="date" value={child.date_of_birth} onChange={(e) => setChild({ ...child, date_of_birth: e.target.value })} />
                <Select value={child.gender || ""} onValueChange={(v) => setChild({ ...child, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Boys">Boys</SelectItem>
                    <SelectItem value="Girls">Girls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parent or guardian</Label>
              <div className="grid sm:grid-cols-4 gap-3">
                <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Paperwork</Label>
              {docs.length === 0 && <p className="text-xs text-muted-foreground">This tryout has no required documents.</p>}
              {docs.map((d) => (
                <label key={d.name} className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={!!accepted[d.name]}
                    onCheckedChange={(v) => setAccepted({ ...accepted, [d.name]: !!v })}
                    className="mt-0.5"
                  />
                  <span>{d.name}{d.required === false ? " (optional)" : ""}{d.notes ? ` — ${d.notes}` : ""}</span>
                </label>
              ))}
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={paper} onCheckedChange={(v) => setPaper(!!v)} className="mt-0.5" />
                <span>Paperwork collected on paper at the desk</span>
              </label>
              <Input
                placeholder="Signature — the name the guardian signed (defaults to their full name)"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tryout fee {plan?.tryout_fee ? `— ${money(plan.tryout_fee)}` : "— free"}</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Send a payment link</SelectItem>
                  <SelectItem value="now">Collected now (cash or card at the desk)</SelectItem>
                  <SelectItem value="later">Leave unpaid — collect later</SelectItem>
                  <SelectItem value="waive">Waive the fee</SelectItem>
                </SelectContent>
              </Select>
              {payment === "now" && (
                <div className="flex flex-wrap gap-2">
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="ach">ACH</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1 min-w-[160px]"
                    placeholder="Reference (check number, receipt…)"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              )}
              <Input placeholder="Note for the club (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          {link ? (
            <Button onClick={onDone}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={busy} onClick={submit}>{busy ? "Adding…" : "Add player"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}