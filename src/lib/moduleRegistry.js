// Stable entitlement keys shared by navigation, server actions and data guards.
export const CORE_MODULE = 'club_nexus';
export const ADDON_MODULES = ['payments', 'kanban', 'development', 'facilities', 'tournaments', 'branding'];
export const MODULE_KEYS = [CORE_MODULE, ...ADDON_MODULES];
export const MODULE_ALIASES = {
  recruiting: CORE_MODULE, communication: CORE_MODULE, calendar: CORE_MODULE,
  player_dev: 'development', player_development: 'development',
  facility_management: 'facilities', website: 'branding', marketplace: 'payments', analytics: 'kanban',
};
export const normalizeModuleKey = key => MODULE_ALIASES[key] || key;

export const MODULE_PAGES = {
  payments: ['MarketplaceManager', 'StaffExpenses', 'ExpenseApprovals', 'EventManager', 'EventScheduling', 'PromoCodes'],
  kanban: ['Kanban', 'KanbanStaff', 'ProgramsList', 'Roadmap', 'Timeline', 'Dashboard', 'ScheduledReports', 'Analytics'],
  development: ['PlayerRoster', 'CenterOfExcellence', 'SkillTests', 'TestDayManager', 'TestSettings', 'EpicTenet', 'KnowledgeBank', 'VideoLibrary'],
  facilities: ['Facilities', 'FacilityManagerDashboard', 'ScheduleView', 'FieldBoard', 'GridImport', 'FacilityBilling', 'TrainingGridToSchedule', 'TrainingScheduler'],
  tournaments: ['TournamentManager'],
  branding: ['Marketing'],
};

export const MODULE_ENTITIES = {
  payments: ['Expense', 'StaffPay', 'Base44Purchase', 'PromoCode', 'StoreItem', 'Cart', 'CartItem', 'Order', 'OrderItem', 'EventSignup'],
  kanban: ['Program', 'ProgramTemplate', 'ProgramFeedback', 'Task', 'Subtask', 'TimeEntry', 'RoadmapProject', 'RoadmapTask', 'ScheduledReport'],
  development: ['PhysicalAssessment', 'PlayerFeedback', 'PlayerNote', 'SkillTest', 'SkillTestScore', 'TestBenchmark', 'TestSession', 'TrainingSession', 'TrainingVideo', 'CurriculumDocument'],
  facilities: ['Facility', 'Field', 'FacilityBooking', 'FacilityInvoice', 'FieldAllocation', 'TrainingSchedule'],
  tournaments: ['Tournament', 'TournamentDivision', 'TournamentTeam', 'TournamentGame', 'TournamentRegistration', 'RefereeAssignment'],
  branding: ['MarketingCampaign', 'SocialPost', 'SocialAccount', 'PublishQueue', 'WebsitePage'],
};

const ACTIONS = {
  payments: ['create-marketplace-checkout', 'event-signup', 'validate-promo-code', 'expense-digest-flush', 'expense-notify', 'expense-reminders', 'expense-weekly-digest'],
  kanban: ['analyzeProjectProfitability', 'generateTasksWithAI', 'identifyProjectRisks', 'predictProjectBudget', 'suggestResourceAllocation', 'run-report-schedules'],
  development: ['generateProgressSummary'],
  facilities: ['confirm-game-booking', 'detect-schedule-conflicts', 'extractTrainingSchedule', 'facility-billing', 'facility-invoice-portal', 'generate-facility-invoices', 'generate-training-schedule', 'publish-training-schedule', 'send-facility-invoices', 'sync-bookings-to-calendar', 'sync-field-allocations'],
  tournaments: ['generate-tournament-schedule', 'recalculate-standings', 'tournament-checkout', 'tournament-csv-commit'],
  branding: ['generate-campaign-content', 'generatePost', 'publish-queue', 'publishPost'],
};
export const moduleForEntity = name => Object.keys(MODULE_ENTITIES).find(key => MODULE_ENTITIES[key].includes(name)) || null;
export const moduleForAction = name => Object.keys(ACTIONS).find(key => ACTIONS[key].includes(name)) || null;
