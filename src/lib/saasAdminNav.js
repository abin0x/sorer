import { LayoutDashboard, Building2, Users, CreditCard, Settings, LifeBuoy, Target, Play, ArrowLeftRight, Zap, Layers, Megaphone } from "lucide-react";

export function getSaasAdminNavGroups(isSystemOwner = false) {
  return [
    {
      label: "Operations",
      items: [
        { title: "Overview", url: "/SaaSAdmin?tab=overview", saasTab: "overview", icon: LayoutDashboard, showFor: "all" },
        { title: "Tenants", url: "/SaaSAdmin?tab=tenants", saasTab: "tenants", icon: Building2, showFor: "all" },
        { title: "Signups", url: "/SaaSAdmin?tab=signups", saasTab: "signups", icon: Play, showFor: "all" },
        { title: "Migrations", url: "/SaaSAdmin?tab=migrations", saasTab: "migrations", icon: ArrowLeftRight, showFor: "all" },
      ],
    },
    {
      label: "People & Access",
      items: [
        { title: "Users", url: "/SaaSAdmin?tab=users", saasTab: "users", icon: Users, showFor: "all" },
        { title: "Modules", url: "/SaaSAdmin?tab=modules", saasTab: "modules", icon: Layers, showFor: "all" },
      ],
    },
    {
      label: "Revenue",
      items: [
        { title: "Billing", url: "/SaaSAdmin?tab=billing", saasTab: "billing", icon: CreditCard, showFor: "all" },
      ],
    },
    {
      label: "Support",
      items: [
        { title: "Tickets", url: "/SaaSAdmin?tab=tickets", saasTab: "tickets", icon: LifeBuoy, showFor: "all" },
        { title: "Support", url: "/SaaSAdmin?tab=support", saasTab: "support", icon: LifeBuoy, showFor: "all" },
      ],
    },
    ...(isSystemOwner ? [{
      label: "Growth",
      items: [
        { title: "Outreach", url: "/SaaSAdmin?tab=outreach", saasTab: "outreach", icon: Megaphone, showFor: "all" },
        { title: "Demo", url: "/SaaSAdmin?tab=demo", saasTab: "demo", icon: Zap, showFor: "all" },
      ],
    }] : []),
    {
      label: "Platform",
      items: [
        { title: "Config", url: "/SaaSAdmin?tab=config", saasTab: "config", icon: Settings, showFor: "all" },
        { title: "Tests", url: "/SaaSAdmin?tab=tests", saasTab: "tests", icon: Target, showFor: "all" },
      ],
    },
  ];
}