import ModuleGate from "@/components/modules/ModuleGate";

/**
 * PluginGate now delegates to ModuleGate, which checks the billing-based
 * TenantModule system first and falls back to the old Plugin entity for
 * modules that haven't been migrated yet.
 */
const KEY_MAP = {
  player_development: "development",
  facility_management: "facilities",
};

export default function PluginGate({ pluginKey, ...props }) {
  return <ModuleGate moduleKey={KEY_MAP[pluginKey] || pluginKey} {...props} />;
}