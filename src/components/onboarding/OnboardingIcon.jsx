import { BarChart3, TrendingUp, ClipboardList, Users, Wallet, CalendarDays, ListChecks, MessageSquare, Settings, ShieldCheck, Target, BookOpen, Star, CircleCheck, Sparkles, Trophy, CreditCard, Building2, Heart, Video } from "lucide-react";

const icons = {
  dashboard: BarChart3, chart: BarChart3, reporting: ClipboardList,
  tracking: TrendingUp, analytics: TrendingUp, collaboration: Users,
  users: Users, team: Users, membership: Users, budget: Wallet,
  payments: CreditCard, finance: Wallet, timeline: CalendarDays,
  calendar: CalendarDays, schedule: CalendarDays, tasks: ListChecks,
  messaging: MessageSquare, messages: MessageSquare, settings: Settings,
  shield: ShieldCheck, security: ShieldCheck, target: Target,
  goals: Target, training: Target, development: TrendingUp,
  book: BookOpen, learning: BookOpen, star: Star, check: CircleCheck,
  trophy: Trophy, building: Building2, heart: Heart, video: Video,
};

/** Content may supply an icon name or a component; unknown names stay graphical. */
export default function OnboardingIcon({ icon, ...props }) {
  const Icon = typeof icon === "string"
    ? icons[icon.trim().toLowerCase().replace(/[-_\s]/g, "")] || Sparkles
    : icon || Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}