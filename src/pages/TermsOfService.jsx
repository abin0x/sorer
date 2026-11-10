import React from "react";
import { Link } from '@/lib/router-compat';
import { FileText } from "lucide-react";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import PublicFooter from "@/components/public/PublicFooter";
import PublicNav from "@/components/layout/PublicNav";

export default function TermsOfService() {
  const { branding } = useTenantBranding();

  const sections = [
    {
      heading: "Acceptance of Terms",
      body: [
        `By creating an account or using the ${branding.appName} platform ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Service.`,
        "These terms apply to all users including club administrators, coaches, staff, players, and guardians.",
      ],
    },
    {
      heading: "Account Registration",
      body: [
        "You must provide accurate and complete information when registering for an account. You are responsible for maintaining the security of your account credentials and for all activities under your account.",
        "Club administrators are responsible for inviting and managing user access within their club. Each club is responsible for ensuring its users have appropriate roles and permissions.",
      ],
    },
    {
      heading: "Acceptable Use",
      body: [
        "You agree to use the Service only for lawful purposes and in accordance with these Terms. You will not use the platform to harass, harm, or discriminate against any individual.",
        "You will not attempt to access data belonging to other clubs, circumvent security measures, or interfere with the platform's operation.",
      ],
    },
    {
      heading: "Club and Player Data",
      body: [
        "Each club retains ownership of its data, including player information, schedules, and financial records. The platform processes this data on behalf of the club to provide the Service.",
        "Guardians provide consent for their player's information to be collected and used for club operations when completing registration.",
      ],
    },
    {
      heading: "Payments and Subscriptions",
      body: [
        "Club subscriptions are billed on a recurring basis (monthly or annually) through our payment provider. You authorize us to charge the selected payment method for the duration of your subscription.",
        "Registration fees and player payments are processed per your club's policies. Refunds are subject to your club's refund policy and applicable laws.",
      ],
    },
    {
      heading: "Intellectual Property",
      body: [
        "The Service, including its design, features, and underlying technology, is owned by us and protected by intellectual property laws. Club names, logos, and content remain the property of the respective clubs.",
        "You may not copy, modify, or distribute any part of the Service without our written permission.",
      ],
    },
    {
      heading: "Termination",
      body: [
        "You may cancel your account at any time. Clubs may cancel their subscription, which will suspend access at the end of the current billing period.",
        "We reserve the right to suspend or terminate accounts that violate these Terms or pose a security risk to the platform or other users.",
      ],
    },
    {
      heading: "Disclaimer of Warranties",
      body: [
        "The Service is provided 'as is' without warranties of any kind. We do not guarantee uninterrupted or error-free operation.",
        "We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.",
      ],
    },
    {
      heading: "Limitation of Liability",
      body: [
        "Our total liability for any claim arising from the Service is limited to the amount you paid us in the twelve months preceding the claim.",
        "We are not liable for any loss of data caused by circumstances beyond our reasonable control.",
      ],
    },
    {
      heading: "Governing Law",
      body: [
        "These Terms are governed by the laws of the jurisdiction in which the platform operates. Any disputes will be resolved in the courts of that jurisdiction.",
      ],
    },
    {
      heading: "Contact",
      body: [
        `If you have questions about these Terms of Service, contact your club administrator or ${branding.appName} support.`,
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 py-12 lg:py-16">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: September 2026</p>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mb-10">
          Welcome to {branding.appName}. These Terms of Service govern your use of our club
          management platform. By using the Service, you agree to these terms.
        </p>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {i + 1}. {section.heading}
              </h2>
              <div className="space-y-3">
                {section.body.map((para, j) => (
                  <p key={j} className="text-muted-foreground leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            We may update these Terms from time to time. Continued use of the Service after
            changes are posted constitutes acceptance of the updated Terms.
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}