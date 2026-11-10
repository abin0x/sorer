import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Receipt, FileBarChart, BarChart3 } from "lucide-react";
import OnboardingCardFlow from "@/components/onboarding/OnboardingCardFlow";
import { useOnboardingSubmit } from "@/lib/useOnboardingSubmit";

const HIGHLIGHTS = [
  { icon: Wallet, title: "Track Payments & Expenses", description: "See every registration payment and club expense" },
  { icon: Receipt, title: "Manage Invoices", description: "Record and reconcile club financial transactions" },
  { icon: FileBarChart, title: "Generate Financial Reports", description: "Pull financial reports for the club anytime" },
];

export default function OnboardBookkeeper() {
  const [phone, setPhone] = useState("");
  const [reportFrequency, setReportFrequency] = useState("weekly");
  const [connectQuickBooks, setConnectQuickBooks] = useState(false);
  const [connectStripe, setConnectStripe] = useState(false);
  const { submit, submitting } = useOnboardingSubmit("bookkeeper");

  return (
    <OnboardingCardFlow
      icon={Wallet}
      roleLabel="Bookkeeper"
      welcomeMessage="As Bookkeeper, you'll track payments, expenses, and financial reports for the club."
      highlights={HIGHLIGHTS}
      renderContact={() => (
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      )}
      actionsTitle="Financial Preferences"
      actionsDescription="Tell us how you'd like to manage the club's finances."
      renderActions={() => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Report Frequency</Label>
            <Select value={reportFrequency} onValueChange={setReportFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="connect-stripe" checked={connectStripe} onCheckedChange={setConnectStripe} />
              <Label htmlFor="connect-stripe" className="text-sm font-normal">I'd like to connect Stripe for payment processing</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="connect-qb" checked={connectQuickBooks} onCheckedChange={setConnectQuickBooks} />
              <Label htmlFor="connect-qb" className="text-sm font-normal">I'd like to connect QuickBooks for accounting</Label>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            You can set up these connections anytime from the Connections page after onboarding.
          </p>
        </div>
      )}
      summarySections={[
        {
          title: "Contact",
          stepIndex: 2,
          items: [{ label: "Phone", value: phone }],
        },
        {
          title: "Financial Preferences",
          stepIndex: 3,
          items: [
            { label: "Report Frequency", value: reportFrequency.charAt(0).toUpperCase() + reportFrequency.slice(1) },
            { label: "Stripe", value: connectStripe ? "Connect" : "Skip for now" },
            { label: "QuickBooks", value: connectQuickBooks ? "Connect" : "Skip for now" },
          ],
        },
      ]}
      onSubmit={() => submit({ phone, preferences: { report_frequency: reportFrequency, connect_stripe: connectStripe, connect_quickbooks: connectQuickBooks } })}
      submitting={submitting}
    />
  );
}