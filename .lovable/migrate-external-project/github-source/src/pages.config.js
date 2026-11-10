// Pages are code-split: each one is a dynamic import (see src/lazyPages.jsx), so
// its code is fetched only when that route is visited.
import {
  Analytics, EmailLogs, EmailTemplates, FAQ, Features, Kanban, Locations, ProgramsList,
  Registration, RoleDashboard, ScheduledReports, Settings, ClubStaff, KanbanStaff, Timeline,
  TeamDetail, PlayerDetail, RBAC, UserPanel, UserProfileView,
} from './lazyPages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "EmailLogs": EmailLogs,
    "EmailTemplates": EmailTemplates,
    "FAQ": FAQ,
    "Features": Features,
    "Kanban": Kanban,
    "Locations": Locations,
    "ProgramsList": ProgramsList,
    "Registration": Registration,
    "RoleDashboard": RoleDashboard,
    "ScheduledReports": ScheduledReports,
    "Settings": Settings,
    "ClubStaff": ClubStaff,
    "KanbanStaff": KanbanStaff,
    "Timeline": Timeline,
    "TeamDetail": TeamDetail,
    "PlayerDetail": PlayerDetail,
    "RBAC": RBAC,
    "UserPanel": UserPanel,
    "UserProfileView": UserProfileView,
}

export const pagesConfig = {
    mainPage: "RoleDashboard",
    Pages: PAGES,
    Layout: __Layout,
};