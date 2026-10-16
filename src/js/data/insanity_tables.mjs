// ===============================================
// 归属：【策划】 游戏数据 / 规则表
// 程序/美术/QA 请勿直接修改此文件
// 修改后放入 roles/designer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC 7th Edition Insanity Tables
 * 
 * Bout of Madness (D10), Phobia list, Mania list.
 * Referenced by SanityEngine at runtime.
 */

/**
 * @role    策划 (Designer)
 * @owner   游戏数据 / 规则表
 * @caution 程序合并时通过 roles/designer/ 目录接收
 */
export const CoCInsanityTables = {
    /**
     * Bout of Madness — 临时疯狂发作表 (D10)
     * CoC 7e Keeper Rulebook p.156-157
     */
    BOUT_REAL_TIME: {
        1: { name: '失忆', summary: '调查员失去对当前场景的记忆（Keeper决定范围），但保留技能和深层记忆。持续1D10轮。', effect: 'amnesia' },
        2: { name: '心因性障碍', summary: '调查员遭受心因性失明/失聪/肢体麻痹（D3决定：1=失明，2=失聪，3=麻痹）。持续1D10轮。', effect: 'psychosomatic' },
        3: { name: '暴力倾向', summary: '调查员陷入暴力狂乱，攻击最近的生物（不论敌友）。持续1D10轮。', effect: 'violence' },
        4: { name: '偏执/幻觉', summary: '调查员体验到可怕的幻觉，或陷入严重的被害妄想。持续1D10轮。', effect: 'hallucination' },
        5: { name: '人际依赖', summary: '调查员将某人（另一调查员或NPC）视为唯一的安全锚，不愿离开其身边。持续1D10轮或更久。', effect: 'attachment' },
        6: { name: '昏厥', summary: '调查员当场晕倒。1D10轮后苏醒。', effect: 'faint' },
        7: { name: '惊恐逃窜', summary: '调查员不顾一切地逃离当前威胁，以全速奔跑。持续1D10轮。', effect: 'flee' },
        8: { name: '歇斯底里/情绪爆发', summary: '调查员无法控制地大笑、哭泣、尖叫等。持续1D10轮。', effect: 'hysteria' },
        9: { name: '恐惧症', summary: '调查员获得一项新的恐惧症（从恐惧症表中随机选取），即使在疯狂发作结束后也永久保留。', effect: 'phobia' },
        10: { name: '狂躁症', summary: '调查员获得一项新的狂躁症（从狂躁症表中随机选取），即使在疯狂发作结束后也永久保留。', effect: 'mania' }
    },

    /**
     * Bout of Madness — Summary (after the scene / next day framing)
     * Same effects; duration framed in hours rather than combat rounds.
     */
    BOUT_SUMMARY: {
        1: { name: '失忆', summary: '调查员失去对近期事件的记忆（Keeper决定范围）。持续1D10小时。', effect: 'amnesia' },
        2: { name: '心因性障碍', summary: '心因性失明/失聪/麻痹，持续1D10小时。', effect: 'psychosomatic' },
        3: { name: '暴力倾向', summary: '暴力狂乱，攻击最近的人，持续1D10小时。', effect: 'violence' },
        4: { name: '偏执/幻觉', summary: '严重幻觉或被害妄想，持续1D10小时。', effect: 'hallucination' },
        5: { name: '人际依赖', summary: '紧抓安全锚不放，持续1D10小时或更久。', effect: 'attachment' },
        6: { name: '昏厥', summary: '昏倒并在1D10小时后醒来（或被唤醒）。', effect: 'faint' },
        7: { name: '惊恐逃窜', summary: '不顾一切逃离，持续1D10小时。', effect: 'flee' },
        8: { name: '歇斯底里/情绪爆发', summary: '无法控制的情绪爆发，持续1D10小时。', effect: 'hysteria' },
        9: { name: '恐惧症', summary: '获得一项新的恐惧症并永久保留。', effect: 'phobia' },
        10: { name: '狂躁症', summary: '获得一项新的狂躁症并永久保留。', effect: 'mania' }
    },

    /**
     * 恐惧症表 — 不定疯狂后获得（24项，CoC 7e Keeper Rulebook p.159-160）
     */
    PHOBIAS: [
        { name: '恐高症 (Acrophobia)', desc: '对高处的病态恐惧' },
        { name: '广场恐惧症 (Agoraphobia)', desc: '对开阔空间的恐惧' },
        { name: '恐水症 (Aquaphobia)', desc: '对水的恐惧' },
        { name: '雷电恐惧症 (Astraphobia)', desc: '对闪电和雷暴的恐惧' },
        { name: '幽闭恐惧症 (Claustrophobia)', desc: '对封闭空间的恐惧' },
        { name: '黑暗恐惧症 (Nyctophobia)', desc: '对黑暗的恐惧' },
        { name: '火焰恐惧症 (Pyrophobia)', desc: '对火的恐惧' },
        { name: '死亡恐惧症 (Thanatophobia)', desc: '对死亡的恐惧' },
        { name: '鲜血恐惧症 (Hemophobia)', desc: '对血液的恐惧' },
        { name: '昆虫恐惧症 (Entomophobia)', desc: '对昆虫的恐惧' },
        { name: '蛇类恐惧症 (Ophidiophobia)', desc: '对蛇的恐惧' },
        { name: '蜘蛛恐惧症 (Arachnophobia)', desc: '对蜘蛛的恐惧' },
        { name: '尸体恐惧症 (Necrophobia)', desc: '对尸体和死亡事物的恐惧' },
        { name: '疾病恐惧症 (Nosophobia)', desc: '对疾病或细菌的恐惧' },
        { name: '人群恐惧症 (Demophobia)', desc: '对人群的恐惧' },
        { name: '陌生人恐惧症 (Xenophobia)', desc: '对陌生人或外国人的恐惧' },
        { name: '深海恐惧症 (Thalassophobia)', desc: '对海洋或深水的恐惧' },
        { name: '孤独恐惧症 (Monophobia)', desc: '对独处的恐惧' },
        { name: '疯狂恐惧症 (Dementophobia)', desc: '对发疯的恐惧' },
        { name: '超自然恐惧症 (Phasmophobia)', desc: '对鬼魂和超自然现象的恐惧' },
        { name: '外神恐惧症', desc: '对不可名状的外神存在的恐惧（克苏鲁神话特有）' },
        { name: '书籍恐惧症', desc: '对禁忌典籍和其中的知识的恐惧' },
        { name: '声音恐惧症', desc: '对特定声音（低语、嗡鸣）的恐惧' },
        { name: '触手恐惧症', desc: '对触手和黏滑生物的病态恐惧' }
    ],

    /**
     * 狂躁症表 — 不定疯狂后获得（24项）
     */
    MANIAS: [
        { name: '清洁狂 (Ablutomania)', desc: '强迫性清洗自己' },
        { name: '计数狂 (Arithmomania)', desc: '强迫性数数' },
        { name: '酗酒狂 (Dipsomania)', desc: '无法控制的饮酒冲动' },
        { name: '偷窃狂 (Kleptomania)', desc: '病态的偷窃冲动' },
        { name: '纵火狂 (Pyromania)', desc: '病态的纵火冲动' },
        { name: '谎言癖 (Mythomania)', desc: '病态地说谎或夸大' },
        { name: '书写狂 (Graphomania)', desc: '强迫性书写' },
        { name: '偏执狂 (Paranoia)', desc: '非理性的不信任和怀疑他人' },
        { name: '自大狂 (Megalomania)', desc: '对自身权力的病态妄想' },
        { name: '受虐狂 (Masochism)', desc: '从痛苦中获得快感' },
        { name: '施虐狂 (Sadism)', desc: '从施加痛苦中获得快感' },
        { name: '嗜食狂 (Sitomania)', desc: '病态的暴食冲动' },
        { name: '宗教狂 (Theomania)', desc: '认为自己是神或神的使者' },
        { name: '流浪狂 (Dromomania)', desc: '无法控制的旅行或离家冲动' },
        { name: '囤积狂 (Disposophobia)', desc: '无法丢弃任何物品' },
        { name: '自残狂', desc: '强迫性自我伤害' },
        { name: '仪式狂', desc: '必须执行特定的重复仪式行为' },
        { name: '低语狂', desc: '不断地自言自语或对不存在的事物说话' },
        { name: '尖叫狂', desc: '无法控制地发出尖叫' },
        { name: '窥视狂 (Scopophilia)', desc: '病态地沉迷于观察他人' },
        { name: '咏唱狂', desc: '反复咏唱听不懂的音节或句子' },
        { name: '献祭狂', desc: '坚信必须通过献祭来安抚某种存在' },
        { name: '挖掘狂', desc: '强迫性挖掘（寻找"底下的东西"）' },
        { name: '绘画狂', desc: '无法控制地画出不可名状的图案和符号' }
    ],

    /**
     * 神话实体 SAN 损失表 (Reality Check)
     * CoC 7e Keeper Rulebook p.169
     */
    MYTHOS_SAN_LOSS: {
        // 格式: { sanLoss: 'NdN/NdN', description: '...' }
        '浅潜者': { sanLoss: '0/1D6', description: '看到人形鱼怪' },
        '深潜者': { sanLoss: '0/1D6', description: '看到深海鱼人' },
        '食尸鬼': { sanLoss: '0/1D6', description: '看到食尸的类人生物' },
        '米·戈': { sanLoss: '0/1D6', description: '看到来自犹格斯的真菌生物' },
        '修格斯': { sanLoss: '1D6/1D20', description: '看到巨大的原生质怪物' },
        '星之眷族': { sanLoss: '1D6/1D20', description: '看到克苏鲁的仆从' },
        '恐怖猎手': { sanLoss: '0/1D10', description: '看到飞行的无形猎手' },
        '拜亚基': { sanLoss: '1/1D6', description: '看到星际飞行的生物' },
        '夜魇': { sanLoss: '0/1D6', description: '看到没有面孔的飞行怪物' },
        '食尸鬼之王': { sanLoss: '1D4/1D10', description: '见到莫尔迪基安' },
        '伟大种族': { sanLoss: '1/1D10', description: '看到伊斯人' },
        '空鬼': { sanLoss: '0/1D8', description: '看到维度间的存在' },
        '克苏鲁的星之眷族': { sanLoss: '1D10/1D100', description: '看到巨型章鱼头巨人' },
        '克苏鲁': { sanLoss: '1D10/1D100', description: '看到伟大的克苏鲁本人' },
        '奈亚拉托提普': { sanLoss: '1D10/1D100', description: '看到蠕动混沌的化身' },
        '莎布·尼古拉丝': { sanLoss: '1D10/1D100', description: '看到黑暗丰穰之母神' },
        '阿撒托斯': { sanLoss: '1D10/1D100', description: '瞥见盲目痴愚之神' },
        '丧尸': { sanLoss: '0/1D8', description: '看到活死人' },
        '鬼魂': { sanLoss: '0/1D6', description: '看到灵体' },
        '不可名状之物': { sanLoss: '1/1D10', description: '看到完全无法理解的实体' }
    }
};
