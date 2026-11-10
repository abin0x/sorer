import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import EmailLogs from './pages/EmailLogs';
import EmailTemplates from './pages/EmailTemplates';
import FAQ from './pages/FAQ';
import Features from './pages/Features';
import Home from './pages/Home';
import Kanban from './pages/Kanban';
import Locations from './pages/Locations';
import ProgramsList from './pages/ProgramsList';
import Registration from './pages/Registration';
import RoleDashboard from './pages/RoleDashboard';
import Reports from './pages/Reports';
import ScheduledReports from './pages/ScheduledReports';
import Settings from './pages/Settings';
import ClubStaff from './pages/ClubStaff';
import KanbanStaff from './pages/KanbanStaff';
import Timeline from './pages/Timeline';
import TeamDetail from './pages/TeamDetail';
import PlayerDetail from './pages/PlayerDetail';
import RBAC from './pages/RBAC';
import UserPanel from './pages/UserPanel';
import UserProfileView from './pages/UserProfileView';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Dashboard": Dashboard,
    "EmailLogs": EmailLogs,
    "EmailTemplates": EmailTemplates,
    "FAQ": FAQ,
    "Features": Features,
    "Home": Home,
    "Kanban": Kanban,
    "Locations": Locations,
    "ProgramsList": ProgramsList,
    "Registration": Registration,
    "RoleDashboard": RoleDashboard,
    "Reports": Reports,
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
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};