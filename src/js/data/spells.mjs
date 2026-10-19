// ===============================================
// 归属：【策划】 游戏数据 / 规则表
// 程序/美术/QA 请勿直接修改此文件
// 修改后放入 roles/designer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC 7th Edition Spells — 法术数据
 * 
 * 每个法术定义消耗(POW/SAN/MP)、效果类型和描述。
 * 效果分为: damage(伤害), summon(召唤), curse(诅咒), protect(防护), utility(通用)
 */

/**
 * @role    策划 (Designer)
 * @owner   游戏数据 / 规则表
 * @caution 程序合并时通过 roles/designer/ 目录接收
 */
export const CoCSpells = {
    // ─── 召唤系 ───
    '召唤/控制拜亚基': {
        type: 'summon',
        powCost: 10,
        sanCost: '1D6',
        mpCost: 5,
        castingRounds: 2,
        description: '召唤一只拜亚基作为坐骑或战斗仆从。拜亚基可以穿越星际空间。被召唤的拜亚基必须通过POW对抗检定才能被控制。',
        effect: 'summon_byakhee',
        mythosRequired: 5
    },
    '召唤/控制黑山羊幼崽': {
        type: 'summon',
        powCost: 15,
        sanCost: '1D10',
        mpCost: 10,
        castingRounds: 3,
        description: '召唤一只莎布·尼古拉丝的黑暗子嗣。这需要在一片森林或暗处举行仪式。黑山羊幼崽极为危险，失控将带来灾难。',
        effect: 'summon_dark_young',
        mythosRequired: 10
    },
    '召唤/控制食尸鬼': {
        type: 'summon',
        powCost: 8,
        sanCost: '1D6',
        mpCost: 5,
        castingRounds: 2,
        description: '从地下墓穴召唤一只食尸鬼。食尸鬼可能提供信息或帮助战斗，但它们对鲜肉的渴望永无止境。',
        effect: 'summon_ghoul',
        mythosRequired: 0
    },
    '召唤格拉基的仆从': {
        type: 'summon',
        powCost: 12,
        sanCost: '1D10',
        mpCost: 8,
        castingRounds: 2,
        description: '召唤格拉基的不死仆从。这些僵尸般的仆从会无条件服从召唤者，但每次命令都会消耗额外的MP。',
        effect: 'summon_glaaki_servant',
        mythosRequired: 8
    },
    '召唤哈斯塔的化身': {
        type: 'summon',
        powCost: 20,
        sanCost: '1D20',
        castingRounds: 4,
        mpCost: 15,
        description: '召唤黄衣之王的化身。这是极其危险的行为，失败可能意味着召唤者自身被哈斯塔吞噬。',
        effect: 'summon_hastur_avatar',
        mythosRequired: 15
    },
    '召唤/控制克苏鲁的星之眷族': {
        type: 'summon',
        powCost: 25,
        sanCost: '1D10/1D100',
        mpCost: 20,
        castingRounds: 4,
        description: '在海洋或大型水体附近召唤克苏鲁的星之眷族。这是最危险的召唤法术之一，失败可能导致召唤者被直接拖入深海。',
        effect: 'summon_star_spawn',
        mythosRequired: 15
    },
    // ─── 接触系 (Contact) ───
    '接触奈亚拉托提普': {
        type: 'utility',
        powCost: 5,
        sanCost: '1D6/1D10',
        mpCost: 3,
        description: '进行仪式以接触奈亚拉托提普的某个化身。此仪式必须在特定地点（如古老祭坛）举行，且可能吸引奈亚拉托提普的注意。',
        effect: 'contact_nyarlathotep',
        mythosRequired: 8
    },
    '接触食尸鬼之王': {
        type: 'utility',
        powCost: 4,
        sanCost: '1D4',
        mpCost: 2,
        description: '接触食尸鬼之王莫尔迪基安。他可能提供关于地下世界和死亡的知识，但索要的报酬往往是活人血肉。',
        effect: 'contact_mordiggian',
        mythosRequired: 5
    },
    '接触伊波恩': {
        type: 'utility',
        powCost: 10,
        sanCost: '1D8',
        mpCost: 5,
        description: '尝试接触古代大巫师伊波恩的意识。伊波恩可能透露Hyperborea的秘密，但他的意识已经与某些不可名状的存在融合。',
        effect: 'contact_eibon',
        mythosRequired: 10
    },
    // ─── 伤害/诅咒系 ───
    '枯萎术': {
        type: 'damage',
        powCost: 8,
        sanCost: '1D4',
        mpCost: 6,
        description: '使目标的四肢或器官枯萎坏死。施法者需与目标进行POW对抗检定。成功则目标遭受1D8伤害并可能永久失去肢体功能。',
        effect: 'wither',
        damage: '1D8',
        mythosRequired: 5
    },
    '石化咒': {
        type: 'curse',
        powCost: 12,
        sanCost: '1D6',
        mpCost: 8,
        description: '将目标暂时转化为石像。需要POW对抗检定。成功则目标被石化1D6轮。',
        effect: 'petrify',
        mythosRequired: 8
    },
    '僵尸之眼': {
        type: 'curse',
        powCost: 6,
        sanCost: '1D4',
        mpCost: 4,
        description: '使目标陷入恐惧性的僵直状态，无法移动和行动。持续1D3轮。POW对抗。',
        effect: 'eye_of_zombie',
        mythosRequired: 3
    },
    '心灵控制': {
        type: 'curse',
        powCost: 10,
        sanCost: '1D6',
        mpCost: 8,
        description: '尝试控制目标的心灵。需要POW对抗检定，成功可简单控制目标行动1D6轮。注意：控制人类而非神话生物。',
        effect: 'mind_control',
        mythosRequired: 5
    },
    // ─── 防护系 ───
    '黄印印记': {
        type: 'protect',
        powCost: 5,
        sanCost: '1D3',
        mpCost: 3,
        description: '在身上画下黄印，对哈斯塔的仆从提供一定的防护。任何看到印记的生物需要进行SAN检定。',
        effect: 'yellow_sign',
        sightSan: '0/1D6',
        mythosRequired: 3
    },
    // ─── 通用系 ───
    '复活术': {
        type: 'utility',
        powCost: 20,
        sanCost: '1D10+2',
        mpCost: 15,
        description: '将死去的生物复活为不死的仆从。复活后的生物不具有原本的人格，而是成为施法者的奴隶。注意：这种"复活"不是真正的复生。',
        effect: 'resurrection',
        mythosRequired: 10
    },
    '创造僵尸': {
        type: 'utility',
        powCost: 8,
        sanCost: '1D6',
        mpCost: 5,
        description: '将一具尸体变成僵尸仆从。僵尸会服从简单的命令，但缓慢而笨拙。',
        effect: 'create_zombie',
        mythosRequired: 5
    },
    '水晶占卜': {
        type: 'utility',
        powCost: 3,
        sanCost: '1D2',
        mpCost: 2,
        description: '通过水晶球看到远处发生的事或未来的片段。需要专注冥想。GM决定看到的内容和清晰度。',
        effect: 'crystal_gazing',
        mythosRequired: 3
    },
    '疯狂之舞': {
        type: 'curse',
        powCost: 8,
        sanCost: '1D6',
        mpCost: 6,
        description: '通过舞蹈使观看者陷入临时疯狂。观看者必须进行SAN检定，失败则陷入疯狂发作（掷Bout of Madness表）。',
        effect: 'dance_of_madness',
        mythosRequired: 5
    },
    '时间旅行': {
        type: 'utility',
        powCost: 15,
        sanCost: '1D10',
        mpCost: 12,
        description: '短暂地穿越时间，窥视过去或未来的片刻。GM决定旅行者能看到什么——以及什么能看到旅行者。',
        effect: 'time_travel',
        mythosRequired: 12
    },
    '变形术': {
        type: 'utility',
        powCost: 12,
        sanCost: '1D6',
        mpCost: 8,
        description: '将自身变形成某种神话生物的外形。变形持续1D6小时。在变形期间，使用该生物的部分能力，但可能逐渐失去人类的思维。',
        effect: 'transformation',
        mythosRequired: 10
    }
};
