// ===============================================
// CoC 7e 物品数据库 — 单一权威数据源
// 合并自: items_db.js + items.js (架构优化)
// ===============================================

export const CoCItemDB = {};

// ═══════════════════════════════════════════════════════
// TIERS — APEX风格五级稀有度
// ═══════════════════════════════════════════════════════
CoCItemDB.TIERS = {
    'S':  { label:'S级 · 版本答案', color:'#ffd700', glow:'#ff8c00', border:'#ffd700', bg:'linear-gradient(135deg, #3d2b00 0%, #5a3d00 100%)', icon:'👑' },
    'A':  { label:'A级 · 强势首选', color:'#c864ff', glow:'#8b00ff', border:'#c864ff', bg:'linear-gradient(135deg, #1a0a2e 0%, #2d1045 100%)', icon:'💎' },
    'B':  { label:'B级 · 实用装备', color:'#4da6ff', glow:'#0066cc', border:'#4da6ff', bg:'linear-gradient(135deg, #0a1a2e 0%, #102540 100%)', icon:'🔷' },
    'C':  { label:'C级 · 基础装备', color:'#5cb85c', glow:'#2d7d2d', border:'#5cb85c', bg:'linear-gradient(135deg, #0a1e0a 0%, #103010 100%)', icon:'🔹' },
    'MYTHIC': { label:'神话级 · 专属', color:'#ff4444', glow:'#cc0000', border:'#ff4444', bg:'linear-gradient(135deg, #2e0a0a 0%, #451010 100%)', icon:'🔮' },
};

// ═══════════════════════════════════════════════════════
// EQUIP_SLOTS — APEX风格装备槽定义
// ═══════════════════════════════════════════════════════
CoCItemDB.EQUIP_SLOTS = {
    HELMET:  { id:'helmet',  label:'头盔', icon:'🪖', desc:'头部防护', acceptTypes:['头盔','护甲'] },
    ARMOR:   { id:'armor',   label:'护甲', icon:'🛡️', desc:'身体防护', acceptTypes:['护甲','防具'] },
    BACKPACK:{ id:'backpack',label:'背包', icon:'🎒', desc:'携带容量', acceptTypes:['背包','工具'] },
    PRIMARY: { id:'primary', label:'主武器', icon:'🔫', desc:'步枪/霰弹/冲锋', acceptTypes:['步枪','霰弹枪','冲锋枪','弓','弩'] },
    SECONDARY:{ id:'secondary',label:'副武器', icon:'🔧', desc:'手枪/投掷', acceptTypes:['手枪','投掷','特殊'] },
    MELEE:   { id:'melee',   label:'近战', icon:'⚔️', desc:'近身武器', acceptTypes:['徒手','刀具','剑','斧','棍棒','长柄','鞭','指虎','电锯','电棍','锤'] },
};

// ═══════════════════════════════════════════════════════
// Slot/Replace helpers
// ═══════════════════════════════════════════════════════
CoCItemDB.getSlotForItem = function(item) {
    const r = typeof item === 'object' ? item : CoCItemDB.resolve(item);
    if (!r) return null;
    const cat = (r.category || '').toLowerCase();
    if (['步枪','霰弹枪','冲锋枪','弓','弩'].includes(r.category)) return 'PRIMARY';
    if (['手枪','投掷'].includes(r.category)) return 'SECONDARY';
    if (['徒手','刀具','剑','斧','棍棒','长柄','鞭','指虎','电锯','电棍','锤','特殊'].includes(r.category) && r.type === 'melee') return 'MELEE';
    if (['武器'].includes(r.category) || r.damage) {
        if (r.type === 'ranged') return r.range > 20 ? 'PRIMARY' : 'SECONDARY';
        return 'MELEE';
    }
    if (r.armor) return 'ARMOR';
    if (cat.includes('头盔') || cat.includes('头')) return 'HELMET';
    if (cat.includes('背包') || cat.includes('工具')) return 'BACKPACK';
    return null;
};

/** Label for combat/fire/melee — prefers APEX slots over legacy equipment.weapon. */
CoCItemDB.equippedWeaponLabel = function(char) {
    const eq = char && char.equipment;
    if (!eq || typeof eq !== 'object') return '';
    const labelOf = (v) => {
        if (v == null || v === '') return '';
        if (typeof v === 'string') return v;
        return String(v.name || v.label || '').trim();
    };
    return labelOf(eq.primary) || labelOf(eq.secondary) || labelOf(eq.melee) || labelOf(eq.weapon) || '';
};

CoCItemDB.canReplace = function(existing, newcomer) {
    const tiers = { 'S':5, 'A':4, 'B':3, 'C':2, 'MYTHIC':6 };
    const existTier = tiers[existing?.tier] || 0;
    const newTier = tiers[newcomer?.tier] || 0;
    return newTier >= existTier;
};

// ═══════════════════════════════════════════════════════
// WEAPONS — with tier assignments (from items_db.js)
// ═══════════════════════════════════════════════════════
CoCItemDB.weapons = {
    // ── Melee ──
    '拳击/徒手':        { damage:'1D3+DB', type:'melee', category:'徒手', tier:'C' },
    '踢':               { damage:'1D6+DB', type:'melee', category:'徒手', tier:'C' },
    '头槌':             { damage:'1D4+DB', type:'melee', category:'徒手', tier:'C' },
    '黄铜指虎':         { damage:'1D3+DB', type:'melee', category:'指虎', tier:'C' },
    '小型棍状物':       { damage:'1D6+DB', type:'melee', category:'棍棒', tier:'C', aliases:['警棍','短棍'] },
    '大型棍状物':       { damage:'1D8+DB', type:'melee', category:'棍棒', tier:'B', aliases:['棒球棍','板球棒','拨火棍','球棒','木棍'] },
    '包皮金属棍':       { damage:'1D8+DB', type:'melee', category:'棍棒', tier:'B', aliases:['甩棍','大头棍','护身棒','金属棍'] },
    '小型刀具':         { damage:'1D4+DB', type:'melee', category:'刀具', tier:'C', aliases:['弹簧折叠刀','折叠刀','小刀','折刀'] },
    '中型刀具':         { damage:'1D4+2+DB', type:'melee', category:'刀具', tier:'C', aliases:['切肉菜刀','菜刀','猎刀'] },
    '大型刀具':         { damage:'1D6+1+DB', type:'melee', category:'刀具', tier:'B', aliases:['甘蔗刀','砍刀','大砍刀','开山刀'] },
    '匕首':             { damage:'1D4+DB', type:'melee', category:'刀具', tier:'C' },
    '手斧/镰刀':        { damage:'1D6+DB', type:'melee', category:'斧', tier:'C' },
    '伐木斧':           { damage:'1D8+2+DB', type:'melee', category:'斧', tier:'A', aliases:['大斧','长柄斧'] },
    '矛':               { damage:'1D8+1+DB', type:'melee', category:'长柄', tier:'B', aliases:['长矛','骑士长枪','长枪'] },
    '投矛':             { damage:'1D8+1', type:'melee', category:'长柄', tier:'C' },
    '小型剑':           { damage:'1D6+DB', type:'melee', category:'剑', tier:'C', aliases:['短剑'] },
    '中型剑':           { damage:'1D8+1+DB', type:'melee', category:'剑', tier:'C', aliases:['佩剑','重剑','长剑'] },
    '大型剑':           { damage:'1D10+DB', type:'melee', category:'剑', tier:'B', aliases:['马刀','大剑','双手剑'] },
    '长鞭':             { damage:'1D3+1+DB', type:'melee', category:'鞭', tier:'C', notes:'可缴械' },
    '绞索':             { damage:'1D6/轮', type:'melee', category:'特殊', tier:'B', notes:'目标需战技挣脱' },
    '电锯':             { damage:'2D8', type:'melee', category:'电锯', tier:'A', notes:'大失败概率加倍' },
    '燃烧火把':         { damage:'1D3+DB/2+燃烧', type:'melee', category:'特殊', tier:'C' },
    '电棍':             { damage:'1D3+眩晕', type:'melee', category:'特殊', tier:'C', aliases:['电击枪(接触)'] },

    // ── Ranged — Handguns ──
    '.22 左轮手枪':      { damage:'1D6', type:'ranged', category:'手枪', range:10, ammo:6, malf:100, tier:'C' },
    '.32 左轮手枪':      { damage:'1D8', type:'ranged', category:'手枪', range:15, ammo:6, malf:100, tier:'C' },
    '.38 左轮手枪':      { damage:'1D10', type:'ranged', category:'手枪', range:15, ammo:6, malf:100, tier:'B', aliases:['左轮手枪','点38左轮'] },
    '.45 左轮手枪':      { damage:'1D10+2', type:'ranged', category:'手枪', range:15, ammo:6, malf:100, tier:'B' },
    '.22 自动手枪':      { damage:'1D6', type:'ranged', category:'手枪', range:10, ammo:6, malf:100, tier:'C' },
    '.25 自动手枪':      { damage:'1D6', type:'ranged', category:'手枪', range:10, ammo:6, malf:100, tier:'C' },
    '.32 自动手枪':      { damage:'1D8', type:'ranged', category:'手枪', range:15, ammo:7, malf:100, tier:'C' },
    '.38 自动手枪':      { damage:'1D10', type:'ranged', category:'手枪', range:15, ammo:8, malf:100, tier:'B', aliases:['手枪'] },
    '9mm 自动手枪':      { damage:'1D10', type:'ranged', category:'手枪', range:20, ammo:15, malf:100, tier:'A' },
    '.45 自动手枪':      { damage:'1D10+2', type:'ranged', category:'手枪', range:15, ammo:7, malf:100, tier:'A' },

    // ── Ranged — Rifles/Shotguns ──
    '杠杆式步枪':       { damage:'2D6', type:'ranged', category:'步枪', range:50, ammo:6, malf:99, tier:'B', aliases:['温彻斯特','来复枪'] },
    '栓动式步枪':       { damage:'2D6+4', type:'ranged', category:'步枪', range:110, ammo:5, malf:100, tier:'A', aliases:['步枪'] },
    '半自动步枪':       { damage:'2D6+2', type:'ranged', category:'步枪', range:110, ammo:5, malf:100, tier:'A' },
    '双管霰弹枪':       { damage:'4D6/2D6/1D6', type:'ranged', category:'霰弹枪', range:'10/20/50', ammo:2, malf:100, tier:'A', aliases:['霰弹枪','双管猎枪'] },
    '泵动霰弹枪':       { damage:'4D6/2D6/1D6', type:'ranged', category:'霰弹枪', range:'10/20/50', ammo:5, malf:100, tier:'S' },
    '半自动霰弹枪':     { damage:'4D6/2D6/1D6', type:'ranged', category:'霰弹枪', range:'10/20/50', ammo:5, malf:100, tier:'S' },

    // ── Ranged — SMG / Automatic ──
    '冲锋枪':           { damage:'1D10', type:'ranged', category:'冲锋枪', range:20, ammo:30, malf:96, tier:'S', aliases:['汤普森','汤姆逊','汤姆森'] },
    '9mm 冲锋枪':       { damage:'1D10', type:'ranged', category:'冲锋枪', range:20, ammo:30, malf:97, tier:'S' },

    // ── Ranged — Other ──
    '弓箭':             { damage:'1D6+半DB', type:'ranged', category:'弓', range:30, ammo:1, tier:'C' },
    '弩':               { damage:'1D6+DB', type:'ranged', category:'弩', range:30, ammo:1, tier:'B', notes:'每轮装填' },
    '投石':             { damage:'1D4+半DB', type:'ranged', category:'投掷', range:'STR/5', tier:'C' },
    '手里剑':           { damage:'1D4+DB/2', type:'ranged', category:'投掷', range:'STR/5', tier:'C' },
    '投矛':             { damage:'1D8+1', type:'ranged', category:'投掷', range:'STR/5', tier:'C' },
    '催泪瓦斯':         { damage:'特殊', type:'ranged', category:'特殊', tier:'B', notes:'极难CON检定否则目盲' },
    '电击枪(远程)':     { damage:'1D3+眩晕', type:'ranged', category:'特殊', range:3, tier:'C', notes:'体格≤2有效' },
};

// ═══════════════════════════════════════════════════════
// EQUIPMENT — with tier assignments (from items_db.js)
// ═══════════════════════════════════════════════════════
CoCItemDB.equipment = {
    // ── Armor ──
    '皮衣':             { type:'护甲', armor:1, tier:'C' },
    '重型皮衣':         { type:'护甲', armor:2, tier:'C' },
    '锁子甲':           { type:'护甲', armor:5, movPenalty:1, tier:'B' },
    '防弹背心':         { type:'护甲', armor:8, tier:'A', notes:'仅对枪弹' },
    '重型防弹背心':     { type:'护甲', armor:12, movPenalty:1, tier:'S', notes:'仅对枪弹' },
    '现代军用头盔':     { type:'护甲', armor:5, tier:'B', notes:'仅头部' },
    '橄榄球头盔':       { type:'护甲', armor:3, tier:'C', notes:'仅头部' },
    '镇暴盾':           { type:'护甲', armor:12, tier:'A', notes:'需手持' },
    '防弹钢盾':         { type:'护甲', armor:15, tier:'S', notes:'需手持，仅对枪弹' },
    '格斗盾':           { type:'护甲', armor:5, tier:'B', notes:'可格挡近战' },

    // ── Tools ──
    '手电筒':           { type:'工具', tier:'C' },
    '急救箱':           { type:'医疗', tier:'B', effects:'急救+1奖励骰' },
    '绳索':             { type:'工具', tier:'C' },
    '撬棍':             { type:'工具', damage:'1D6+DB', tier:'C' },
    '双筒望远镜':       { type:'工具', tier:'C' },
    '照相机':           { type:'工具', tier:'C' },
    '无线电':           { type:'工具', tier:'B' },

    // ── Medical ──
    '绷带':             { type:'医疗', tier:'C' },
    '吗啡':             { type:'医疗', tier:'B', effects:'恢复1D3 HP，CON检定避免副作用' },
    '急救包':           { type:'医疗', tier:'C' },

    // ── Documents ──
    '笔记本':           { type:'文件', tier:'C' },
    '地图':             { type:'文件', tier:'C' },
    '钥匙':             { type:'关键物品', tier:'C' },
};

// ═══════════════════════════════════════════════════════
// Tier helper functions
// ═══════════════════════════════════════════════════════
CoCItemDB.getTier = function(item) {
    if (!item) return null;
    if (typeof item === 'object' && item.tier) return item.tier;
    const resolved = CoCItemDB.resolve(item);
    return resolved ? resolved.tier : null;
};

CoCItemDB.getTierInfo = function(item) {
    const tier = CoCItemDB.getTier(item);
    return tier ? CoCItemDB.TIERS[tier] : null;
};

CoCItemDB.getCategoryColor = function(item) {
    const info = CoCItemDB.getTierInfo(item);
    return info ? info.color : '#6c757d';
};

CoCItemDB.getCategoryBg = function(item) {
    const info = CoCItemDB.getTierInfo(item);
    return info ? info.bg : '#1a1a1a';
};

// ═══════════════════════════════════════════════════════
// MATCHING ENGINE — resolve
// ═══════════════════════════════════════════════════════
function isFlatWeaponRecord(val) {
    return !!val && typeof val === 'object' && !Array.isArray(val) && typeof val.damage === 'string';
}

function flatWeaponResult(val, fallbackName) {
    return Object.assign({}, val, {
        name: val.name || fallbackName,
        category: val.category || val.type || '武器'
    });
}

CoCItemDB.resolve = function(itemName) {
    if (!itemName || typeof itemName !== 'string') return null;
    const name = itemName.trim();

    // 1. Exact full-table key (book rows live on CoCItemDB itself).
    const bookExact = CoCItemDB[name];
    if (isFlatWeaponRecord(bookExact)) return flatWeaponResult(bookExact, name);

    // 2. Exact short-table key or alias
    for (const [key, val] of Object.entries(CoCItemDB.weapons)) {
        if (name === key) return { ...val, name: key, category: val.category || '武器' };
        if (val.aliases && val.aliases.includes(name)) return { ...val, name: key, category: val.category || '武器' };
    }
    for (const [key, val] of Object.entries(CoCItemDB.equipment)) {
        if (name === key) return { ...val, name: key, category: val.type || '装备' };
    }

    // 3. Unique shorter name contained in one catalog key (".45 左轮" → ".45 左轮手枪").
    const holders = [];
    const pushHolder = (key, val) => {
        if (!key || key.length <= name.length) return;
        if (key.includes(name)) holders.push({ key, val });
    };
    Object.keys(CoCItemDB).forEach((key) => {
        const val = CoCItemDB[key];
        if (isFlatWeaponRecord(val)) pushHolder(key, val);
    });
    Object.entries(CoCItemDB.weapons).forEach(([key, val]) => {
        pushHolder(key, val);
        if (val && Array.isArray(val.aliases)) val.aliases.forEach((alias) => pushHolder(alias, val));
    });
    if (holders.length === 1 && isFlatWeaponRecord(holders[0].val)) {
        return flatWeaponResult(holders[0].val, holders[0].val.name || holders[0].key);
    }

    // 4. Fuzzy match — generic tokens only. Specific names already returned above.
    const lower = name.toLowerCase();
    const fuzzy = (pattern, target) => {
        if (lower.includes(pattern)) return { ...target, name: name, category: target.category || target.type || '装备' };
        return null;
    };

    // Weapon patterns (ordered by specificity)
    const checks = [
        ['霰弹', '双管霰弹枪'], ['shotgun', '双管霰弹枪'],
        ['冲锋', '冲锋枪'], ['smg', '冲锋枪'], ['汤姆', '冲锋枪'], ['汤普森', '冲锋枪'],
        ['步枪', '栓动式步枪'], ['rifle', '栓动式步枪'], ['来复', '杠杆式步枪'],
        ['左轮', '.38 左轮手枪'], ['revolver', '.38 左轮手枪'],
        ['手枪', '.38 自动手枪'], ['pistol', '.38 自动手枪'],
        ['刀', '中型刀具'], ['匕首', '匕首'], ['knife', '匕首'], ['blade', '匕首'],
        ['剑', '中型剑'], ['sword', '中型剑'],
        ['斧', '手斧/镰刀'], ['axe', '手斧/镰刀'],
        ['棍', '小型棍状物'], ['棒', '大型棍状物'], ['bat', '大型棍状物'],
        ['矛', '矛'], ['spear', '矛'], ['lance', '矛'],
        ['弓', '弓箭'], ['bow', '弓箭'],
        ['弩', '弩'], ['crossbow', '弩'],
        ['电锯', '电锯'], ['chainsaw', '电锯'],
        ['电棍', '电棍'], ['电击', '电棍'],
        ['鞭', '长鞭'], ['whip', '长鞭'],
        ['锤', '大型棍状物'],
    ];

    for (const [pattern, targetKey] of checks) {
        const target = CoCItemDB.weapons[targetKey];
        if (target && lower.includes(pattern)) {
            return { ...target, name: name, category: target.category || '武器' };
        }
    }

    // Equipment patterns
    if (lower.includes('护甲') || lower.includes('armor') || lower.includes('防弹') || lower.includes('防具')) {
        return { type:'护甲', armor:4, name:name, category:'装备', tier:'B' };
    }
    if (lower.includes('头盔') || lower.includes('helmet')) {
        return { ...CoCItemDB.equipment['橄榄球头盔'], name:name, category:'装备' };
    }
    if (lower.includes('医疗') || lower.includes('急救') || lower.includes('药') || lower.includes('绷带') || lower.includes('first aid') || lower.includes('medical')) {
        return { type:'医疗', name:name, category:'装备', tier:'C' };
    }
    if (lower.includes('手电') || lower.includes('flashlight') || lower.includes('torch')) {
        return { ...CoCItemDB.equipment['手电筒'], name:name, category:'装备' };
    }
    if (lower.includes('绳') || lower.includes('rope')) {
        return { ...CoCItemDB.equipment['绳索'], name:name, category:'装备' };
    }
    if (lower.includes('撬棍') || lower.includes('crowbar')) {
        return { ...CoCItemDB.equipment['撬棍'], name:name, category:'装备' };
    }
    if (lower.includes('相机') || lower.includes('camera') || lower.includes('照相')) {
        return { ...CoCItemDB.equipment['照相机'], name:name, category:'装备' };
    }
    if (lower.includes('无线电') || lower.includes('radio')) {
        return { ...CoCItemDB.equipment['无线电'], name:name, category:'装备' };
    }
    if (lower.includes('钥匙') || lower.includes('key')) {
        return { ...CoCItemDB.equipment['钥匙'], name:name, category:'装备' };
    }
    if (lower.includes('地图') || lower.includes('map')) {
        return { ...CoCItemDB.equipment['地图'], name:name, category:'装备' };
    }

    // 3. Description-based heuristic
    const dmgMatch = name.match(/(\d+D\d+)/i);
    if (dmgMatch || lower.includes('伤害') || lower.includes('damage') || lower.includes('攻击')) {
        const extracted = { name:name, category:'武器', type:'melee', damage:dmgMatch ? dmgMatch[1] : '1D6', tier:'C' };
        if (lower.includes('枪') || lower.includes('gun') || lower.includes('rifle')) extracted.type = 'ranged';
        return extracted;
    }

    // 4. Default
    return { name:name, category:'杂物', tier:'C' };
};

// ═══════════════════════════════════════════════════════
// AI SYSTEM PROMPT AUGMENTATION
// ═══════════════════════════════════════════════════════
CoCItemDB.getWeaponListForAI = function() {
    const lines = [];
    for (const [name, info] of Object.entries(CoCItemDB.weapons)) {
        const tierInfo = CoCItemDB.TIERS[info.tier] || {};
        lines.push(`${tierInfo.label || ''} ${name}: 伤害${info.damage}, ${info.type === 'ranged' ? `射程${info.range}码, 弹容${info.ammo}` : '近战'}`);
    }
    return lines.join('\n');
};

// ═══════════════════════════════════════════════════════
// FLAT ITEM DICTIONARY — Object.assign merge (from original items.js)
// ═══════════════════════════════════════════════════════
Object.assign(CoCItemDB, {
  // ⚔️ 武器 
  "无": { type: "melee", name: "无", skill: "斗殴", damage: "1D3+DB", range: "接触", impale: false, attacks: 1, capacity: "—", malfunction: "—" },
  "左轮": { type: "firearm", name: "左轮手枪", skill: "手枪", damage: "1D10", range: "15码", impale: true, attacks: 1, capacity: 6, malfunction: 98 },
  "手枪": { type: "firearm", name: "手枪", skill: "手枪", damage: "1D10", range: "15码", impale: true, attacks: 1, capacity: 7, malfunction: 98 },
  "霰弹枪": { type: "firearm", name: "霰弹枪", skill: "霰弹枪", damage: "4D6", range: "10/20/50码", impale: false, attacks: 1, capacity: 2, malfunction: 100 },
  "匕首": { type: "melee", name: "匕首", skill: "斗殴", damage: "1D4+DB", range: "接触", impale: true, attacks: 1, capacity: "—", malfunction: "—" },
  "短刀": { type: "melee", name: "短刀", skill: "斗殴", damage: "1D4+DB", range: "接触", impale: true, attacks: 1, capacity: "—", malfunction: "—" },
  "棍棒": { type: "melee", name: "棍棒", skill: "斗殴", damage: "1D8+DB", range: "接触", impale: false, attacks: 1, capacity: "—", malfunction: "—" },
  
  "弓箭": { type: "firearm", name: "弓箭", skill: "射击：弓箭", damage: "1D6+DB/2", range: "30码", impale: false, attacks: "1", capacity: 1, malfunction: 97 },
  "黄铜指虎": { type: "melee", name: "黄铜指虎", skill: "斗殴", damage: "1D3+1+DB", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "长鞭": { type: "melee", name: "长鞭", skill: "斗殴", damage: "1D3+DB/2", range: "10英尺", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "燃烧的火把": { type: "melee", name: "燃烧的火把", skill: "斗殴", damage: "1D6+燃烧", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "电锯": { type: "melee", name: "电锯", skill: "斗殴", damage: "2D8", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: 95 },
  "包皮金属棍(甩棍、大头棍、护身棒)": { type: "melee", name: "包皮金属棍(甩棍、大头棍、护身棒)", skill: "斗殴", damage: "1D8+DB", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "大型棍状物(棒球棍、板球棒、拨火棍等)": { type: "melee", name: "大型棍状物(棒球棍、板球棒、拨火棍等)", skill: "斗殴", damage: "1D8+DB", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "小型棍状物(警棍等)": { type: "melee", name: "小型棍状物(警棍等)", skill: "斗殴", damage: "1D6+DB", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "弩": { type: "firearm", name: "弩", skill: "射击：弓箭", damage: "1D8+2", range: "50码", impale: true, attacks: "1/2", capacity: 1, malfunction: 96 },
  "绞具": { type: "melee", name: "绞具", skill: "斗殴", damage: "1D6+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "手斧/镰刀": { type: "melee", name: "手斧/镰刀", skill: "斗殴", damage: "1D6+1+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "大型刀具(甘蔗刀等)": { type: "melee", name: "大型刀具(甘蔗刀等)", skill: "斗殴", damage: "1D8+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "中型刀具(切肉菜刀等)": { type: "melee", name: "中型刀具(切肉菜刀等)", skill: "斗殴", damage: "1D4+2+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "小型刀具(弹簧折叠刀等)": { type: "melee", name: "小型刀具(弹簧折叠刀等)", skill: "斗殴", damage: "1D4+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "220v通电导线": { type: "melee", name: "220v通电导线", skill: "斗殴", damage: "2D8+眩晕", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: 95 },
  "催泪瓦斯": { type: "firearm", name: "催泪瓦斯", skill: "斗殴", damage: "眩晕", range: "6英尺", impale: false, attacks: "1", capacity: "25次", malfunction: "——" },
  "双节棍": { type: "melee", name: "双节棍", skill: "斗殴", damage: "1D8+DB", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "投石": { type: "firearm", name: "投石", skill: "投掷", damage: "1D4+DB/2", range: "STR/5码", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "手里剑": { type: "firearm", name: "手里剑", skill: "投掷", damage: "1D3+DB/2", range: "STR/5码", impale: true, attacks: "2", capacity: "一次性", malfunction: 100 },
  "矛、骑士长枪": { type: "melee", name: "矛、骑士长枪", skill: "斗殴", damage: "1D8+1", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "投矛": { type: "firearm", name: "投矛", skill: "投掷", damage: "1D8+DB/2", range: "STR/5码", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "大型剑（马刀）": { type: "melee", name: "大型剑（马刀）", skill: "斗殴", damage: "1D8+1+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "中型剑（佩剑、重剑）": { type: "melee", name: "中型剑（佩剑、重剑）", skill: "斗殴", damage: "1D6+1+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "轻型剑（花剑、剑杖）": { type: "melee", name: "轻型剑（花剑、剑杖）", skill: "斗殴", damage: "1D6+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  "电棍、电击枪(接触)": { type: "melee", name: "电棍、电击枪(接触)", skill: "斗殴", damage: "1D3+眩晕", range: "接触", impale: false, attacks: "1", capacity: "——", malfunction: 97 },
  "电击枪(远程)": { type: "firearm", name: "电击枪(远程)", skill: "手枪", damage: "1D3+眩晕", range: "15英尺", impale: false, attacks: "1", capacity: 3, malfunction: 95 },
  "战斗回力镖": { type: "firearm", name: "战斗回力镖", skill: "投掷", damage: "1D8+DB/2", range: "STR/5码", impale: false, attacks: "1", capacity: "——", malfunction: "——" },
  "伐木斧": { type: "melee", name: "伐木斧", skill: "斗殴", damage: "1D8+2+DB", range: "接触", impale: true, attacks: "1", capacity: "——", malfunction: "——" },
  ".22(5.6mm)小型自动手枪": { type: "firearm", name: ".22(5.6mm)小型自动手枪", skill: "手枪", damage: "1D6", range: "10", impale: true, attacks: "1(3)", capacity: 6, malfunction: 100 },
  ".25(6.35mm)短口手枪(单管)": { type: "firearm", name: ".25(6.35mm)短口手枪(单管)", skill: "手枪", damage: "1D6", range: "3", impale: true, attacks: "1", capacity: 1, malfunction: 100 },
  ".32(7.65mm)左轮手枪": { type: "firearm", name: ".32(7.65mm)左轮手枪", skill: "手枪", damage: "1D8", range: "15", impale: true, attacks: "1(3)", capacity: 6, malfunction: 100 },
  ".32(7.65mm)自动手枪": { type: "firearm", name: ".32(7.65mm)自动手枪", skill: "手枪", damage: "1D8", range: "15", impale: true, attacks: "1(3)", capacity: 8, malfunction: 99 },
  ".357 马格南左轮": { type: "firearm", name: ".357 马格南左轮", skill: "手枪", damage: "1D8+1D4", range: "15", impale: true, attacks: "1(3)", capacity: 6, malfunction: 100 },
  ".38(9mm)左轮手枪": { type: "firearm", name: ".38(9mm)左轮手枪", skill: "手枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)", capacity: 6, malfunction: 100 },
  ".38(9mm)自动手枪": { type: "firearm", name: ".38(9mm)自动手枪", skill: "手枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)", capacity: 8, malfunction: 99 },
  "贝瑞塔 M9": { type: "firearm", name: "贝瑞塔 M9", skill: "手枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)", capacity: 15, malfunction: 98 },
  "9mm 格洛克 17": { type: "firearm", name: "9mm 格洛克 17", skill: "手枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)", capacity: 17, malfunction: 98 },
  "9mm 鲁格 P08": { type: "firearm", name: "9mm 鲁格 P08", skill: "手枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)", capacity: 8, malfunction: 99 },
  ".41(10.4mm) 左轮手枪": { type: "firearm", name: ".41(10.4mm) 左轮手枪", skill: "手枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)", capacity: 8, malfunction: 100 },
  ".44(11.2mm) 马格南左轮手枪": { type: "firearm", name: ".44(11.2mm) 马格南左轮手枪", skill: "手枪", damage: "1D10+1D4+2", range: "15", impale: true, attacks: "1(3)", capacity: 6, malfunction: 100 },
  ".45(11.43mm) 左轮手枪": { type: "firearm", name: ".45(11.43mm) 左轮手枪", skill: "手枪", damage: "1D10+2", range: "15", impale: true, attacks: "1(3)", capacity: 6, malfunction: 100 },
  ".45(11.43mm) 自动手枪": { type: "firearm", name: ".45(11.43mm) 自动手枪", skill: "手枪", damage: "1D10+2", range: "15", impale: true, attacks: "1(3)", capacity: 7, malfunction: 100 },
  "IMI 沙漠之鹰": { type: "firearm", name: "IMI 沙漠之鹰", skill: "手枪", damage: "1D10+1D6+3", range: "15", impale: true, attacks: "1(3)", capacity: 7, malfunction: 94 },
  ".58 (14.7mm)1855 年式春田步枪": { type: "firearm", name: ".58 (14.7mm)1855 年式春田步枪", skill: "射击：步枪/霰弹枪", damage: "1D10+4", range: "60", impale: true, attacks: "1/4", capacity: 1, malfunction: 95 },
  ".22 (5.6mm)栓式枪机步枪": { type: "firearm", name: ".22 (5.6mm)栓式枪机步枪", skill: "射击：步枪/霰弹枪", damage: "1D6+1", range: "30", impale: true, attacks: "1", capacity: 6, malfunction: 99 },
  ".30 (7.62mm)杠杆式枪机步枪": { type: "firearm", name: ".30 (7.62mm)杠杆式枪机步枪", skill: "射击：步枪/霰弹枪", damage: "2D6", range: "50", impale: true, attacks: "1", capacity: 6, malfunction: 98 },
  ".45 马提尼·亨利步枪": { type: "firearm", name: ".45 马提尼·亨利步枪", skill: "射击：步枪/霰弹枪", damage: "1D8+1D6+3", range: "80", impale: true, attacks: "1/3", capacity: 1, malfunction: 100 },
  "莫兰上校的气动步枪": { type: "firearm", name: "莫兰上校的气动步枪", skill: "射击：步枪/霰弹枪", damage: "2D6+1", range: "20", impale: true, attacks: "1/3", capacity: 1, malfunction: 88 },
  "加兰德M1、M2步枪": { type: "firearm", name: "加兰德M1、M2步枪", skill: "射击：步枪/霰弹枪", damage: "2D6+4", range: "110", impale: true, attacks: "1", capacity: 8, malfunction: 100 },
  "SKS 半自动步枪(56 半)": { type: "firearm", name: "SKS 半自动步枪(56 半)", skill: "射击：步枪/霰弹枪", damage: "2D6+1", range: "90", impale: true, attacks: "1(2)", capacity: 10, malfunction: 97 },
  ".303 (7.7mm) 李·恩菲尔德": { type: "firearm", name: ".303 (7.7mm) 李·恩菲尔德", skill: "射击：步枪/霰弹枪", damage: "2D6+4", range: "110", impale: true, attacks: "1", capacity: 5, malfunction: 100 },
  ".30——06 (7.62mm) 栓式枪机步枪": { type: "firearm", name: ".30——06 (7.62mm) 栓式枪机步枪", skill: "射击：步枪/霰弹枪", damage: "2D6+4", range: "110", impale: true, attacks: "1", capacity: 5, malfunction: 100 },
  ".30——06 (7.62mm) 半自动步枪": { type: "firearm", name: ".30——06 (7.62mm) 半自动步枪", skill: "射击：步枪/霰弹枪", damage: "2D6+4", range: "110", impale: true, attacks: "1", capacity: 5, malfunction: 100 },
  ".444 (11.28mm) 马林步枪": { type: "firearm", name: ".444 (11.28mm) 马林步枪", skill: "射击：步枪/霰弹枪", damage: "2D8+4", range: "110", impale: true, attacks: "1", capacity: 5, malfunction: 98 },
  "猎象枪(双管)": { type: "firearm", name: "猎象枪(双管)", skill: "射击：步枪/霰弹枪", damage: "3D6+4", range: "100", impale: true, attacks: "1 or 2", capacity: 2, malfunction: 100 },
  "20 号霰弹枪(双管)": { type: "firearm", name: "20 号霰弹枪(双管)", skill: "射击：步枪/霰弹枪", damage: "2D6/1D6/1D3", range: "10/20/50", impale: false, attacks: "1 or 2", capacity: 2, malfunction: 100 },
  "16 号霰弹枪(双管)": { type: "firearm", name: "16 号霰弹枪(双管)", skill: "射击：步枪/霰弹枪", damage: "2D6+2/1D6+1/1D4", range: "10/20/50", impale: false, attacks: "1 or 2", capacity: 2, malfunction: 100 },
  "12 号霰弹枪(双管)": { type: "firearm", name: "12 号霰弹枪(双管)", skill: "射击：步枪/霰弹枪", damage: "4D6/2D6/1D6", range: "10/20/50", impale: false, attacks: "1 or 2", capacity: 2, malfunction: 100 },
  "12 号霰弹枪(泵动)": { type: "firearm", name: "12 号霰弹枪(泵动)", skill: "射击：步枪/霰弹枪", damage: "4D6/2D6/1D6", range: "10/20/50", impale: false, attacks: "1", capacity: 5, malfunction: 100 },
  "12 号霰弹枪(半自动)": { type: "firearm", name: "12 号霰弹枪(半自动)", skill: "射击：步枪/霰弹枪", damage: "4D6/2D6/1D6", range: "10/20/50", impale: false, attacks: "1(2)", capacity: 5, malfunction: 100 },
  "12 号霰弹枪(双管,锯短)": { type: "firearm", name: "12 号霰弹枪(双管,锯短)", skill: "射击：步枪/霰弹枪", damage: "4D6/1D6", range: "5/10", impale: false, attacks: "1 or 2", capacity: 2, malfunction: 100 },
  "10 号霰弹枪(双管)": { type: "firearm", name: "10 号霰弹枪(双管)", skill: "射击：步枪/霰弹枪", damage: "4D6+2/2D6+1/1D4", range: "10/20/50", impale: false, attacks: "1 or 2", capacity: 2, malfunction: 100 },
  "12 号贝里尼 M3(折叠式枪托)": { type: "firearm", name: "12 号贝里尼 M3(折叠式枪托)", skill: "射击：步枪/霰弹枪", damage: "4D6/2D6/1D6", range: "10/20/50", impale: false, attacks: "1(2)", capacity: 7, malfunction: 100 },
  "12 号 SPAS (折叠式枪托)": { type: "firearm", name: "12 号 SPAS (折叠式枪托)", skill: "射击：步枪/霰弹枪", damage: "4D6/2D6/1D6", range: "10/20/50", impale: false, attacks: "1", capacity: 8, malfunction: 98 },
  "AK-47 或 AKM": { type: "firearm", name: "AK-47 或 AKM", skill: "射击：步枪/霰弹枪", damage: "2D6+1", range: "100", impale: true, attacks: "1(2)or全自动", capacity: 30, malfunction: 100 },
  "AK-74": { type: "firearm", name: "AK-74", skill: "射击：步枪/霰弹枪", damage: "2D6+1", range: "110", impale: true, attacks: "1(2)or全自动", capacity: 30, malfunction: 97 },
  "巴雷特M82": { type: "firearm", name: "巴雷特M82", skill: "射击：步枪/霰弹枪", damage: "2D10+1D8+6", range: "250", impale: true, attacks: "1", capacity: 11, malfunction: 96 },
  "FN FAL": { type: "firearm", name: "FN FAL", skill: "射击：步枪/霰弹枪", damage: "2D6+4", range: "110", impale: true, attacks: "1(2)or3连射", capacity: 20, malfunction: 97 },
  "加利尔突击步枪": { type: "firearm", name: "加利尔突击步枪", skill: "射击：步枪/霰弹枪", damage: "2D6", range: "110", impale: true, attacks: "1(2)or连射", capacity: 20, malfunction: 98 },
  "M16A2": { type: "firearm", name: "M16A2", skill: "射击：步枪/霰弹枪", damage: "2D6", range: "110", impale: true, attacks: "1(2)or3连射", capacity: 30, malfunction: 97 },
  "M4": { type: "firearm", name: "M4", skill: "射击：步枪/霰弹枪", damage: "2D6", range: "90", impale: true, attacks: "1or3连射", capacity: 30, malfunction: 97 },
  "斯泰尔 AUG": { type: "firearm", name: "斯泰尔 AUG", skill: "射击：步枪/霰弹枪", damage: "2D6", range: "110", impale: true, attacks: "1(2)or全自动", capacity: 30, malfunction: 99 },
  "贝雷塔 M70/90": { type: "firearm", name: "贝雷塔 M70/90", skill: "射击：步枪/霰弹枪", damage: "2D6", range: "110", impale: true, attacks: "1or全自动", capacity: 30, malfunction: 99 },
  "MP18I/MP28II": { type: "firearm", name: "MP18I/MP28II", skill: "射击：冲锋枪", damage: "1D10", range: "20", impale: true, attacks: "1(2)or全自动", capacity: "20/30/32", malfunction: 96 },
  "MP5": { type: "firearm", name: "MP5", skill: "射击：冲锋枪", damage: "1D10", range: "20", impale: true, attacks: "1(2)or全自动", capacity: "15/30", malfunction: 97 },
  "MAC-11": { type: "firearm", name: "MAC-11", skill: "射击：冲锋枪", damage: "1D10", range: "15", impale: true, attacks: "1(3)or全自动", capacity: 32, malfunction: 96 },
  "蝎式冲锋枪": { type: "firearm", name: "蝎式冲锋枪", skill: "射击：冲锋枪", damage: "1D8", range: "15", impale: true, attacks: "1(3)or全自动", capacity: 20, malfunction: 96 },
  "汤普森冲锋枪": { type: "firearm", name: "汤普森冲锋枪", skill: "射击：冲锋枪", damage: "1D10+2", range: "20", impale: true, attacks: "1or全自动", capacity: "20/30/50", malfunction: 96 },
  "乌兹微型冲锋枪": { type: "firearm", name: "乌兹微型冲锋枪", skill: "射击：冲锋枪", damage: "1D10", range: "20", impale: true, attacks: "1(2)or全自动", capacity: 32, malfunction: 98 },
  "1882 年式加特林": { type: "firearm", name: "1882 年式加特林", skill: "重型武器", damage: "2D6+4", range: "100", impale: true, attacks: "全自动", capacity: 200, malfunction: 96 },
  "M1918 式勃朗宁自动步枪": { type: "firearm", name: "M1918 式勃朗宁自动步枪", skill: "重型武器", damage: "2D6+4", range: "90", impale: true, attacks: "1(2)or全自动", capacity: 20, malfunction: 100 },
  "勃朗宁 M1917A1(7.62mm)": { type: "firearm", name: "勃朗宁 M1917A1(7.62mm)", skill: "重型武器", damage: "2D6+4", range: "150", impale: true, attacks: "全自动", capacity: 250, malfunction: 96 },
  "布伦轻机枪": { type: "firearm", name: "布伦轻机枪", skill: "重型武器", damage: "2D6+4", range: "110", impale: true, attacks: "1or全自动", capacity: "30/100", malfunction: 96 },
  "路易斯Ⅰ型机枪": { type: "firearm", name: "路易斯Ⅰ型机枪", skill: "重型武器", damage: "2D6+4", range: "110", impale: true, attacks: "全自动", capacity: "27/97", malfunction: 96 },
  "GE M134 式 7.62mm 速射机枪": { type: "firearm", name: "GE M134 式 7.62mm 速射机枪", skill: "重型武器", damage: "2D6+4", range: "200", impale: true, attacks: "全自动", capacity: 4000, malfunction: 98 },
  "FN 米尼米(5.56mm)，弹夹/弹带": { type: "firearm", name: "FN 米尼米(5.56mm)，弹夹/弹带", skill: "重型武器", damage: "2D6", range: "110", impale: true, attacks: "全自动", capacity: "30/200", malfunction: 99 },
  "维克斯.303 机枪": { type: "firearm", name: "维克斯.303 机枪", skill: "重型武器", damage: "2D6+4", range: "110", impale: true, attacks: "全自动", capacity: 250, malfunction: 99 },
  "莫洛托夫燃烧瓶": { type: "firearm", name: "莫洛托夫燃烧瓶", skill: "投掷", damage: "2D6+燃烧", range: "STR码", impale: true, attacks: "1/2", capacity: "一次性", malfunction: 95 },
  "信号枪(信号弹枪)": { type: "firearm", name: "信号枪(信号弹枪)", skill: "手枪", damage: "1D10+1D3+燃烧", range: "10", impale: true, attacks: "1/2", capacity: 1, malfunction: 100 },
  "M79 40mm 榴弹发射器": { type: "firearm", name: "M79 40mm 榴弹发射器", skill: "重型武器", damage: "3D10/2码", range: "20", impale: true, attacks: "1/3", capacity: 1, malfunction: 99 },
  "炸药棒": { type: "firearm", name: "炸药棒", skill: "投掷", damage: "4D10/3码", range: "STR英尺", impale: true, attacks: "1/2", capacity: "一次性", malfunction: 99 },
  "雷管": { type: "firearm", name: "雷管", skill: "电气维修", damage: "2D10/1码", range: "N/A", impale: true, attacks: "N/A", capacity: "一次性", malfunction: 100 },
  "爆破筒": { type: "firearm", name: "爆破筒", skill: "爆破", damage: "1D10/3码", range: "就地", impale: true, attacks: "一次使用", capacity: "一次性", malfunction: 95 },
  "塑胶炸弹(C4) 100克": { type: "firearm", name: "塑胶炸弹(C4) 100克", skill: "爆破", damage: "6D10/3码", range: "就地", impale: true, attacks: "一次使用", capacity: "一次性", malfunction: 99 },
  "手榴弹": { type: "firearm", name: "手榴弹", skill: "投掷", damage: "4D10/3码", range: "STR英尺", impale: true, attacks: "1/2", capacity: "一次性", malfunction: 99 },
  "81mm迫击炮": { type: "firearm", name: "81mm迫击炮", skill: "炮术", damage: "6D10/6码", range: "500码", impale: true, attacks: "2", capacity: "独立装弹", malfunction: 100 },
  "75mm野战火炮": { type: "firearm", name: "75mm野战火炮", skill: "炮术", damage: "10D10/2码", range: "500码", impale: true, attacks: "1/4", capacity: "独立装弹", malfunction: 99 },
  "120mm坦克炮(稳定)": { type: "firearm", name: "120mm坦克炮(稳定)", skill: "炮术", damage: "10D10/2码", range: "2000码", impale: true, attacks: "1", capacity: "独立装弹", malfunction: 100 },
  "5英寸舰载炮(稳定)": { type: "firearm", name: "5英寸舰载炮(稳定)", skill: "炮术", damage: "15D10/4码", range: "3000码", impale: true, attacks: "1", capacity: "自动上弹", malfunction: 98 },
  "反步兵地雷": { type: "firearm", name: "反步兵地雷", skill: "爆破", damage: "4D10/5码", range: "就地", impale: true, attacks: "布置", capacity: "一次性", malfunction: 99 },
  "阔剑地雷": { type: "firearm", name: "阔剑地雷", skill: "爆破", damage: "6D6/20码", range: "就地", impale: true, attacks: "布置", capacity: "一次性", malfunction: 99 },
  "火焰喷射器": { type: "firearm", name: "火焰喷射器", skill: "重型武器", damage: "2D6+燃烧", range: "25码", impale: true, attacks: "1", capacity: "至少10", malfunction: 93 },
  "M72 式单发轻型反坦克炮": { type: "firearm", name: "M72 式单发轻型反坦克炮", skill: "重型武器", damage: "8D10/1码", range: "150码", impale: true, attacks: "1", capacity: 1, malfunction: 98 },

  // 🛡️ 护具与穿戴物
  "防弹衣": { type: "armor", name: "防弹衣", armor: 8, coverage: "躯干" },
  "钢盔": { type: "armor", name: "钢盔", armor: 2, coverage: "头部" },
  
  // 🎯 弹药专属分类 (Ammo — 留在背包；开火由 fire_weapon 按枪型匹配消耗，无需 UI 装填)
  "子弹": { type: "ammo", name: "子弹" },
  "箭": { type: "ammo", name: "箭" },
  "弩箭": { type: "ammo", name: "弩箭" },
  "弹药": { type: "ammo", name: "弹药" },
  "弹匣": { type: "ammo", name: "弹匣" },
  "弹夹": { type: "ammo", name: "弹夹" },
  
  // 🧪 消耗品
  "急救包": { type: "consumable", name: "急救包", heal: "1D3", target: "HP", skill: "急救" },
  "医药箱": { type: "consumable", name: "医药箱", heal: "1D4", target: "HP", skill: "医学" },
  "止痛药": { type: "consumable", name: "止痛药", heal: "1", target: "HP" },
  
  // 🔦 杂物 
  "火柴": { type: "misc", name: "火柴" },
  "手电筒": { type: "misc", name: "手电筒" },
  "钥匙": { type: "misc", name: "钥匙" }
});

// ═══════════════════════════════════════════════════════
// parseItemData — item string resolver (from original items.js)
// ═══════════════════════════════════════════════════════
export function parseItemData(itemString) {
  if (!itemString) return { type: 'misc', name: '未知物品' };
  
  // 优先匹配精确名称
  if (CoCItemDB[itemString]) {
    return Object.assign({}, CoCItemDB[itemString], { rawName: itemString });
  }

  // Quantity: trailing ×N / xN / *N, leading `N发…`, or leading digits + space
  let count = 1;
  let itemName = itemString;
  const mul = itemString.match(/^(.*?)[×xX*]\s*(\d+)\s*$/);
  const faLead = itemString.match(/^(\d+)\s*发\s*(.+)$/);
  const lead = itemString.match(/^(\d+)\s+(.+)$/);
  if (mul && String(mul[1] || '').trim()) {
    count = parseInt(mul[2], 10);
    itemName = mul[1].trim();
  } else if (faLead) {
    count = parseInt(faLead[1], 10);
    itemName = faLead[2].trim();
  } else if (lead) {
    count = parseInt(lead[1], 10);
    itemName = lead[2].trim();
  } else {
    const faAny = itemString.match(/(\d+)\s*发/);
    if (faAny) count = parseInt(faAny[1], 10);
  }

  // Ammo-like names before weapon fuzzy match (avoid ".38左轮弹药×12" → firearm)
  const isAmmoLike = /子弹|弹药|弹匣|弹夹|ammo/i.test(itemString) && !itemString.includes('无弹药');
  if (isAmmoLike) {
    for (const key in CoCItemDB) {
      const itemDef = CoCItemDB[key];
      if (typeof itemDef !== 'object' || itemDef === null || !itemDef.name) continue;
      if (itemDef.type !== 'ammo') continue;
      if (itemName.includes(key) || itemString.includes(key)) {
        return Object.assign({}, itemDef, { rawName: itemString, count, category: itemDef.category || '弹药' });
      }
    }
    return { type: 'ammo', name: itemName || itemString, rawName: itemString, count, category: '弹药' };
  }

  for (const key in CoCItemDB) {
    if (itemName.includes(key)) {
      const itemDef = CoCItemDB[key]; if (typeof itemDef !== "object" || itemDef === null || !itemDef.name) continue;
      return Object.assign({}, itemDef, { rawName: itemString, count: count });
    }
  }

  return { type: 'misc', name: itemString, rawName: itemString, count: count };
};

if (typeof window !== 'undefined') {
    window.CoCItemDB = CoCItemDB;
    window.parseItemData = parseItemData;
}
