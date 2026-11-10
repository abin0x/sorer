import { z } from 'zod';

const money = z.coerce.number().finite().min(0).max(1000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use at most two decimal places.');
export const teamFeeSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1500).default(''), amount: money,
  required: z.boolean(),
});
export const duesSchema = z.object({
  base_dues: money,
  included_services: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  team_fees: z.array(teamFeeSchema).max(30).default([]),
}).refine(d => new Set(d.team_fees.map(f => f.id)).size === d.team_fees.length, 'Each fee needs a unique ID.');

export function duesFromPlan(plan) {
  return { base_dues: Number(plan.club_dues || 0), included_services: plan.included_services || [], team_fees: plan.team_fees || [] };
}

export function priceDues(config, selectedIds = []) {
  const dues = duesSchema.parse(config.dues || { base_dues: config.amount || 0 });
  const selected = z.array(z.string().min(1).max(100)).max(30).parse(selectedIds);
  const optional = new Set(dues.team_fees.filter(f => !f.required).map(f => f.id));
  if (new Set(selected).size !== selected.length || selected.some(id => !optional.has(id))) throw new Error('One or more selected fees are not available for this club plan.');
  const fees = dues.team_fees.filter(f => f.required || selected.includes(f.id));
  const cents = Math.round(dues.base_dues * 100) + fees.reduce((n, f) => n + Math.round(f.amount * 100), 0);
  return { base_dues: dues.base_dues, fees, selected_fee_ids: selected, total: cents / 100, included_services: dues.included_services };
}

export function requireSameClub(record, clubId, label = 'Record') {
  if (!record || record.club_id !== clubId) throw new Error(`${label} is not available in the selected club.`);
  return record;
}

export const formatDuesMoney = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);