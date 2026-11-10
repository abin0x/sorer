import React from "react";
import { Link } from "@/lib/router-compat";
import { Shield } from "lucide-react";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import PublicFooter from "@/components/public/PublicFooter";
import PublicNav from "@/components/layout/PublicNav";

export default function PrivacyPolicy() {
  const { branding } = useTenantBranding();

  const sections = [
    {
      heading: "Information We Collect",
      body: [
        "We collect information you provide directly to us when you register for an account, including your name, email address, and club affiliation. For players and families, we collect information provided during registration including player names, dates of birth, guardian contacts, and medical notes.",
        "We also automatically collect certain information when you use the platform, such as your device type, browser, and usage data, to improve our services and ensure security.",
      ],
    },
    {
      heading: "How We Use Your Information",
      body: [
        "We use the information we collect to provide and manage club operations including registration, scheduling, team management, communication, and payment processing.",
        "We may use your email address to send you important notifications about registrations, schedules, payments, and platform updates. You can opt out of non-essential communications at any time.",
      ],
    },
    {
      heading: "Information Sharing",
      body: [
        "We do not sell or rent your personal information to third parties. We share information only with your club's authorized staff, coaches, and administrators who need it to manage club operations.",
        "We may share information with service providers who help us operate the platform (such as payment processors and email providers) under strict data protection agreements.",
      ],
    },
    {
      heading: "Data Security",
      body: [
        "We implement industry-standard security measures to protect your personal information, including encryption in transit and at rest, role-based access controls, and regular security reviews.",
        "Each club's data is isolated and accessible only to authorized users within that club or platform administrators.",
      ],
    },
    {
      heading: "Your Rights",
      body: [
        "You have the right to access, correct, or delete your personal information. You can update your profile information directly in the platform or contact your club administrator for assistance.",
        "You may request a copy of your data or ask us to restrict or stop processing your information, subject to applicable laws.",
      ],
    },
    {
      heading: "Children's Privacy (COPPA)",
      body: [
        "Our platform, including the Beacon mobile app, is used by youth sports clubs and collects information about minors only through their clubs and their parents or legal guardians. Children under 13 cannot create their own accounts; a guardian creates or approves any child profile.",
        "Information we may hold about a child: name, date of birth, team and position, guardian contacts, medical notes the guardian provides, attendance, tryout and development evaluations, and photos the club shares. It is used only to run club activities and is never used for advertising or sold.",
        "Before collecting a child's information we obtain verifiable consent from the parent or guardian through their club's registration. Parents may review their child's information, ask us to correct or delete it, and refuse further collection at any time by contacting their club or support@clubrudder.com. Refusing may mean the child cannot take part in club activities that need it.",
        "Children's information is shared only with their own club's authorized staff and coaches, and with service providers (hosting, email, payment processors) bound to protect it.",
      ],
    },
    {
      heading: "Push Notifications and Device Information",
      body: [
        "If you allow notifications in the Beacon app, we store a device token issued by Apple (APNs) or Google (Firebase Cloud Messaging) linked to your account so we can send alerts about messages, schedule changes, tryouts and payments. We do not collect your location, contacts or advertising identifiers.",
        "You can turn notifications off at any time in your phone's Settings app or in Beacon's notification settings. Signing out removes the token from your account.",
      ],
    },
    {
      heading: "Deleting Your Account",
      body: [
        "You can delete your account inside the Beacon app: open Home, then Account settings, then Delete account, and confirm. You can also email support@clubrudder.com from your account email or ask your club administrator.",
        "Deletion removes your profile, device tokens and personal information within 30 days. Some records, such as payment receipts your club must keep by law, may be retained in a limited form.",
      ],
    },
    {
      heading: "Data Retention",
      body: [
        "We retain your information for as long as your account is active or as needed to provide services. Registration and payment records are retained per legal and accounting requirements.",
        "When you request account deletion, we remove personally identifiable information within 30 days, subject to legal retention obligations.",
      ],
    },
    {
      heading: "Contact Us",
      body: [
        `If you have questions about this Privacy Policy or your personal data, contact your club administrator or ${branding.appName} support.`,
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 py-12 lg:py-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: November 2026</p>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mb-10">
          {branding.appName} is committed to protecting the privacy of our users. This Privacy Policy explains how we
          collect, use, and safeguard your personal information when you use our club management platform.
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
            This Privacy Policy may be updated from time to time. We will notify you of significant changes by posting a
            notice on the platform.
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
