import ModuleGate from "@/components/modules/ModuleGate";

/**
 * Legacy plugin wrappers use the same tenant grants as every other page.
 * Global plugin flags never authorize a tenant.
 */
const KEY_MAP = {
  player_development: "development",
  facility_management: "facilities",
};

export default function PluginGate({ pluginKey, ...props }) {
  return <ModuleGate moduleKey={KEY_MAP[pluginKey] || pluginKey} {...props} />;
}