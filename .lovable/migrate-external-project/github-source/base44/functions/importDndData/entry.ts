import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GITHUB_BASE = 'https://raw.githubusercontent.com/nick-aschenbach/dnd-data/master/src';

async function fetchFromGithub(path) {
  const response = await fetch(`${GITHUB_BASE}${path}`);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  return response.json();
}

async function importMonsters(base44) {
  console.log('Starting monster import...');
  const data = await fetchFromGithub('/monster/index.json');
  
  if (!Array.isArray(data)) {
    console.error('Monster data is not an array');
    return 0;
  }

  const monsters = data.slice(0, 100).map(m => ({
    name: m.name || 'Unknown',
    size: m.size || '',
    type: m.type || '',
    alignment: m.alignment || '',
    armor_class: m.ac || 10,
    hit_points: m.hp || 1,
    speed: m.speed || '',
    strength: m.str || 10,
    dexterity: m.dex || 10,
    constitution: m.con || 10,
    intelligence: m.int || 10,
    wisdom: m.wis || 10,
    charisma: m.cha || 10,
    challenge: m.cr || 0,
    description: m.description || '',
    actions: m.actions || []
  }));

  await base44.asServiceRole.entities.Monster.bulkCreate(monsters);
  console.log(`Imported ${monsters.length} monsters`);
  return monsters.length;
}

async function importWeapons(base44) {
  console.log('Starting weapon import...');
  const data = await fetchFromGithub('/equipment/index.json');
  
  if (!Array.isArray(data)) {
    console.error('Equipment data is not an array');
    return 0;
  }

  const weapons = data
    .filter(e => e.equipment_category?.index === 'melee-melee-weapons' || e.equipment_category?.index === 'melee-ranged-weapons')
    .slice(0, 100)
    .map(w => ({
      name: w.name || 'Unknown',
      weapon_type: w.equipment_category?.name || '',
      weapon_category: w.rarity || 'Simple',
      damage_dice: w.damage?.damage_dice || '1d4',
      damage_type: w.damage?.damage_type?.name || 'Bludgeoning',
      range: w.range?.normal?.range_ft || '',
      properties: (w.properties || []).map(p => p.name),
      description: w.description || ''
    }));

  await base44.asServiceRole.entities.Weapon.bulkCreate(weapons);
  console.log(`Imported ${weapons.length} weapons`);
  return weapons.length;
}

async function importSpells(base44) {
  console.log('Starting spell import...');
  const data = await fetchFromGithub('/spells/index.json');
  
  if (!Array.isArray(data)) {
    console.error('Spell data is not an array');
    return 0;
  }

  const spells = data.slice(0, 100).map(s => ({
    name: s.name || 'Unknown',
    level: s.level || 0,
    school: s.school?.name || '',
    casting_time: s.casting_time?.[0]?.action || 'Action',
    range: s.range?.range_ft || 'Self',
    duration: s.duration?.[0]?.duration_unit || 'Instantaneous',
    components: s.components || [],
    description: (s.desc || []).join('\n'),
    classes: (s.classes || []).map(c => c.name)
  }));

  await base44.asServiceRole.entities.Spell.bulkCreate(spells);
  console.log(`Imported ${spells.length} spells`);
  return spells.length;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const monsterCount = await importMonsters(base44);
    const weaponCount = await importWeapons(base44);
    const spellCount = await importSpells(base44);

    return Response.json({
      success: true,
      imported: {
        monsters: monsterCount,
        weapons: weaponCount,
        spells: spellCount
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});