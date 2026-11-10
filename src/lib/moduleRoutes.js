import { CORE_MODULE, MODULE_PAGES } from './moduleRegistry';

// Public and platform administration screens are not tenant add-on screens.
const EXEMPT = new Set(['saasadmin', 'features', 'faq', 'userprofile', 'userprofileview', 'mytickets', 'helpadmin', 'supportconsole', 'systemhealth', 'platformsettings', 'clubsignup', 'clubsetupwizard', 'planpicker', 'thankyou', 'setupjourney', 'createyourclub']);
const normalizePage = value => value.toLowerCase().replace(/-/g, '');
export function moduleForRoute(url) {
  const path = url.split(/[?#]/)[0];
  const page = normalizePage(path.split('/').filter(Boolean)[0] || 'home');
  if (EXEMPT.has(page) || page === 'onboard' || path === '/settings/integrations') return null;
  return Object.keys(MODULE_PAGES).find(key => MODULE_PAGES[key].some(name => normalizePage(name) === page)) || CORE_MODULE;
}
