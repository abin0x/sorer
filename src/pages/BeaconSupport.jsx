import React, { useEffect } from "react";
import { Link } from "@/lib/router-compat";
import { LifeBuoy, Mail, ShieldCheck, Trash2, Bell } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

const SUPPORT_EMAIL = "support@clubrudder.com";

const FAQS = [
  ["How do I sign in?", "Use the email address your club has on file. If you have not received an invitation, ask your club administrator to invite you, then open the link in the email on your phone."],
  ["I don't see my team or my child.", "Your club links you to teams and players. Contact your club administrator so they can add you as a guardian, coach or team manager."],
  ["How do I turn notifications on or off?", "Open Beacon, go to Home, then Notification settings. You can also switch notifications off for Beacon in your phone's Settings app at any time."],
  ["How do I pay club dues?", "Open the Pay tab. Payments are handled by your club's payment processor; Club Rudder never stores card numbers."],
  ["Who can see my messages?", "Only members of the channel your club set up — for example a team's coaches and families. Clubs cannot see other clubs' data."],
  ["How do I report an inappropriate message?", "Press and hold the message and choose Report. Your club's safety contacts are alerted. For emergencies, contact local authorities."],
  ["How do I delete my account?", "In Beacon, open Home → Account settings → Delete account and type DELETE to confirm. Your personal information is removed within 30 days, except records your club must keep by law (such as payment receipts). You can also email us to request deletion."],
];

export default function BeaconSupport() {
  useEffect(() => { document.title = "Beacon Support | Club Rudder"; }, []);
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-4 py-12 lg:py-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <LifeBuoy className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Beacon app support</h1>
            <p className="text-sm text-muted-foreground">Help for parents, players and coaches using the Beacon app.</p>
          </div>
        </div>

        <section className="grid sm:grid-cols-3 gap-3 my-8">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Beacon%20support`} className="rounded-xl border border-border p-4 hover:bg-muted">
            <Mail className="w-5 h-5 text-primary mb-2" />
            <p className="font-semibold text-foreground">Email us</p>
            <p className="text-sm text-muted-foreground break-all">{SUPPORT_EMAIL}</p>
            <p className="text-xs text-muted-foreground mt-1">Reply within 1 business day</p>
          </a>
          <Link to="/privacy-policy" className="rounded-xl border border-border p-4 hover:bg-muted">
            <ShieldCheck className="w-5 h-5 text-primary mb-2" />
            <p className="font-semibold text-foreground">Privacy policy</p>
            <p className="text-sm text-muted-foreground">Children's privacy, notifications and your data</p>
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20Beacon%20account`} className="rounded-xl border border-border p-4 hover:bg-muted">
            <Trash2 className="w-5 h-5 text-primary mb-2" />
            <p className="font-semibold text-foreground">Delete my account</p>
            <p className="text-sm text-muted-foreground">Request removal by email or in the app</p>
          </a>
        </section>

        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"><Bell className="w-5 h-5" /> Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-border p-4">
              <summary className="font-medium text-foreground cursor-pointer">{q}</summary>
              <p className="text-muted-foreground mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-10">Beacon is made by Club Rudder. See also our <Link to="/terms-of-service" className="underline">Terms of Service</Link>.</p>
      </main>
      <PublicFooter />
    </div>
  );
}
