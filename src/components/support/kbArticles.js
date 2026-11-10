// Built-in knowledge base articles for ticket submission suggestions.
// Filtered client-side by matching keywords in the subject text.
// Each article has a title, excerpt, category, and a help page link.

export const KB_ARTICLES = [
  {
    id: 'kb-billing-1',
    title: 'How to connect your payment processor (Stripe, Square, PayPal, Echelon and more)',
    excerpt: 'Step-by-step guide to connecting your club\'s payment processor and configuring checkout for dues, events, and marketplace.',
    category: 'billing',
    keywords: ['stripe', 'payment', 'checkout', 'credit card', 'charge', 'dues', 'pay'],
    link: '/Connections',
  },
  {
    id: 'kb-billing-2',
    title: 'Understanding payment plans and installments',
    excerpt: 'How to set up installment plans for seasonal dues and track outstanding balances.',
    category: 'billing',
    keywords: ['installment', 'plan', 'balance', 'outstanding', 'payment plan', 'dues'],
    link: '/PaymentSettings',
  },
  {
    id: 'kb-billing-3',
    title: 'Refunds and disputed charges',
    excerpt: 'How to process refunds and handle disputed charges with your processor.',
    category: 'billing',
    keywords: ['refund', 'dispute', 'chargeback', 'reverse'],
    link: '/PaymentSettings',
  },
  {
    id: 'kb-tech-1',
    title: 'CSV import troubleshooting guide',
    excerpt: 'Common issues with CSV imports — column mapping, date formats, and how to fix validation errors.',
    category: 'technical',
    keywords: ['csv', 'import', 'upload', 'mapping', 'validation', 'column', 'date format'],
    link: '/MigrationWizard',
  },
  {
    id: 'kb-tech-2',
    title: 'Google Calendar sync setup and troubleshooting',
    excerpt: 'How to connect Google Calendar, sync field bookings and team events, and resolve sync errors.',
    category: 'technical',
    keywords: ['google', 'calendar', 'sync', 'booking', 'event sync'],
    link: '/Connections',
  },
  {
    id: 'kb-tech-3',
    title: 'Field board and scheduling conflicts',
    excerpt: 'Understanding the field board, resolving double-booking conflicts, and managing weekly schedules.',
    category: 'technical',
    keywords: ['field', 'board', 'booking', 'conflict', 'schedule', 'double book', 'grid'],
    link: '/FieldBoard',
  },
  {
    id: 'kb-account-1',
    title: 'Inviting staff and assigning roles',
    excerpt: 'How to invite coaches, branch directors, and bookkeepers, and manage their permissions.',
    category: 'account',
    keywords: ['invite', 'staff', 'user', 'role', 'permission', 'access', 'coach', 'director'],
    link: '/ClubStaff',
  },
  {
    id: 'kb-account-2',
    title: 'Switching between clubs (system users)',
    excerpt: 'How system owners and support agents switch between tenant clubs from the sidebar.',
    category: 'account',
    keywords: ['switch', 'club', 'tenant', 'system', 'admin', 'multiple'],
    link: '/SaaSAdmin',
  },
  {
    id: 'kb-account-3',
    title: 'Onboarding a new staff member',
    excerpt: 'What happens after a staff member accepts their invite and how to complete role-specific onboarding.',
    category: 'account',
    keywords: ['onboard', 'onboarding', 'setup', 'new user', 'welcome'],
    link: '/features',
  },
  {
    id: 'kb-data-1',
    title: 'Data migration from your previous system',
    excerpt: 'How the migration wizard works, what to expect during import, and how to review staged data.',
    category: 'data_migration',
    keywords: ['migration', 'import', 'data', 'previous', 'transfer', 'convert'],
    link: '/MigrationWizard',
  },
  {
    id: 'kb-data-2',
    title: 'QuickBooks integration setup',
    excerpt: 'Connecting QuickBooks Online, mapping classes, and syncing payments and expenses.',
    category: 'data_migration',
    keywords: ['quickbooks', 'qbo', 'accounting', 'sync', 'class', 'mapping'],
    link: '/Connections',
  },
  {
    id: 'kb-feature-1',
    title: 'Tryout planner and roster pipeline',
    excerpt: 'How to create tryout plans, schedule events, evaluate players, and build rosters.',
    category: 'feature_request',
    keywords: ['tryout', 'evaluation', 'roster', 'offer', 'kanban', 'pipeline'],
    link: '/TryoutDashboard',
  },
  {
    id: 'kb-feature-2',
    title: 'Tournament manager and scheduling',
    excerpt: 'Creating tournaments, registering teams, generating schedules, and tracking standings.',
    category: 'feature_request',
    keywords: ['tournament', 'schedule', 'bracket', 'standings', 'game', 'match'],
    link: '/TournamentManager',
  },
  {
    id: 'kb-feature-3',
    title: 'Marketing and social media posts',
    excerpt: 'Creating campaigns, generating posts with AI, and publishing to social media accounts.',
    category: 'feature_request',
    keywords: ['marketing', 'social', 'post', 'campaign', 'instagram', 'facebook', 'ayrshare'],
    link: '/Marketing',
  },
];

/** Returns up to 3 KB articles matching the given subject text. */
export function suggestKbArticles(subject) {
  if (!subject || subject.trim().length < 3) return [];
  const text = subject.toLowerCase();
  const scored = KB_ARTICLES.map(article => {
    let score = 0;
    for (const kw of article.keywords) {
      if (text.includes(kw)) score += kw.length;
    }
    return { ...article, score };
  });
  return scored
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}