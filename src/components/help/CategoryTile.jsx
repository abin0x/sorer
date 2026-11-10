import React from 'react';
import { Link } from '@/lib/router-compat';
import { Rocket, KeyRound, Users, Shield, Trophy, CreditCard, CalendarDays, ShoppingBag, MessageSquare, BarChart3, MapPin, ArrowLeftRight, Wrench, BookOpen } from 'lucide-react';

const ICONS = { rocket: Rocket, key: KeyRound, users: Users, shield: Shield, trophy: Trophy, card: CreditCard, calendar: CalendarDays, bag: ShoppingBag, message: MessageSquare, chart: BarChart3, map: MapPin, import: ArrowLeftRight, wrench: Wrench };

export default function CategoryTile({ category }) {
  const Icon = ICONS[category.icon] || BookOpen;
  return (
    <Link
      to={`/help/category/${category.slug}`}
      className="group rounded-2xl border border-border bg-card p-4 min-h-[92px] flex items-start gap-3 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground group-hover:text-primary">{category.name}</p>
        <p className="text-xs text-muted-foreground">{category.count} {category.count === 1 ? 'article' : 'articles'}</p>
      </div>
    </Link>
  );
}