const groups = {
  club_nexus: ['Locations','Registration','ClubStaff','PlatformDashboard','TryoutDashboard','TryoutPlanDetail','Seasons','FamilyAccount','TeamDetail','Team','PlayerDetail','MigrationWizard','ClubSetupWizard','PaymentSettings','Connections'],
  communication: ['CommunicationPortal','Messenger','TeamCalendar'],
  payments: ['MarketplaceManager','StaffExpenses','ExpenseApprovals','EventManager','EventScheduling','PromoCodes'],
  kanban: ['Kanban','KanbanStaff','ProgramsList','Roadmap','Timeline','Dashboard','CEODashboard','ScheduledReports','Analytics'],
  development: ['PlayerRoster','CenterOfExcellence','SkillTests','TestDayManager','EpicTenet','KnowledgeBank','VideoLibrary'],
  facilities: ['Facilities','FacilityManagerDashboard','ScheduleView','FieldBoard','GridImport','FacilityBilling'],
  branding: ['EmailTemplates','EmailLogs'],
  tournaments: ['TournamentManager'],
  branding: ['Marketing'],
};

export function moduleForRoute(url) {
  const page = url.split('?')[0].split('/').filter(Boolean)[0]?.toLowerCase();
  return Object.keys(groups).find(key => groups[key].some(name => name.toLowerCase() === page)) || null;
}