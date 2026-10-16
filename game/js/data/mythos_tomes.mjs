// ===============================================
// 归属：【策划】 游戏数据 / 规则表
// 程序/美术/QA 请勿直接修改此文件
// 修改后放入 roles/designer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC 7th Edition Mythos Tomes — 神话典籍数据
 * 
 * 每本典籍定义阅读时间、SAN 损失、神话技能增长及所含法术。
 * 数据来源：CoC 7e Keeper Rulebook + 扩展
 */

/**
 * @role    策划 (Designer)
 * @owner   游戏数据 / 规则表
 * @caution 程序合并时通过 roles/designer/ 目录接收
 */
export const CoCMythosTomes = {
    /**
     * 《死灵书》 (Necronomicon)
     * 阿拉伯疯狂诗人阿卜杜拉·阿尔哈萨德著，约公元730年
     */
    '死灵书': {
        name: '死灵书',
        author: '阿卜杜拉·阿尔哈萨德',
        era: ['1920s', '现代', '1890s'],
        readingTime: '32周',           // 完整阅读时间
        sanLossInitial: '1D10/2D10',  // 初次浏览 SAN 损失
        sanLossFull: '1D20/3D10',     // 完整阅读 SAN 损失
        mythosGainInitial: '1D10',    // 初次浏览神话技能增长
        mythosGainFull: '2D10',       // 完整阅读神话技能增长
        mythosRequired: 0,            // 所需神话技能门槛
        languages: ['阿拉伯语', '拉丁语', '英语'],
        spells: ['召唤/控制拜亚基', '召唤/控制黑山羊幼崽', '接触奈亚拉托提普', '复活术', '石化咒'],
        description: '阿拉伯疯狂诗人阿卜杜拉·阿尔哈萨德于公元730年著成的禁忌之书。原版阿拉伯语已失传，现存多为拉丁语和英语译本。书中记载了关于旧日支配者和外神的知识，以及众多危险的召唤法术。',
        rarity: '极稀有'
    },

    /**
     * 《无名祭祀书》 (Unaussprechlichen Kulten)
     * 弗里德里希·冯·容兹特著
     */
    '无名祭祀书': {
        name: '无名祭祀书',
        author: '弗里德里希·冯·容兹特',
        era: ['1920s', '现代', '1890s'],
        readingTime: '18周',
        sanLossInitial: '1D6/1D10',
        sanLossFull: '1D10/2D10',
        mythosGainInitial: '1D8',
        mythosGainFull: '1D10+2',
        mythosRequired: 0,
        languages: ['德语', '英语'],
        spells: ['召唤/控制食尸鬼', '接触食尸鬼之王', '僵尸之眼', '枯萎术'],
        description: '又名《无名祭祀》，是德国神秘学家冯·容兹特于19世纪著成的黑暗典籍。书中详述了全球各地的邪恶祭祀和食尸鬼崇拜。',
        rarity: '稀有'
    },

    /**
     * 《格拉基启示录》 (Revelations of Glaaki)
     * 格拉基的启示，共12卷
     */
    '格拉基启示录': {
        name: '格拉基启示录',
        author: '格拉基的仆从',
        era: ['1920s', '现代'],
        readingTime: '24周',
        sanLossInitial: '1D8/1D10',
        sanLossFull: '1D10/2D6',
        mythosGainInitial: '1D8',
        mythosGainFull: '1D10+4',
        mythosRequired: 0,
        languages: ['英语'],
        spells: ['召唤格拉基的仆从', '水晶占卜', '创造僵尸', '心灵控制'],
        description: '由格拉基的仆从所著，共12卷。书中记录了格拉基的梦境魔法和不死生物的秘密。阅读者可能获得巨大的力量，但代价是成为格拉基的奴隶。',
        rarity: '稀有'
    },

    /**
     * 《黄衣之王》 (The King in Yellow)
     * 一部剧本，作者不详
     */
    '黄衣之王': {
        name: '黄衣之王',
        author: '不详（据传为哈斯塔的化身所著）',
        era: ['1890s', '1920s', '现代'],
        readingTime: '2周',             // 剧本较短
        sanLossInitial: '1D6/1D10+2',
        sanLossFull: '1D10/2D10',
        mythosGainInitial: '1D6',
        mythosGainFull: '1D10',
        mythosRequired: 0,
        languages: ['法语', '英语'],
        spells: ['召唤哈斯塔的化身', '疯狂之舞', '黄印印记'],
        description: '一部神秘的剧本，共两幕。据说任何读完此剧本的人都会被其中蕴含的疯狂美学所吞噬。剧本内容会自行变化，每次阅读都不同。',
        rarity: '极稀有'
    },

    /**
     * 《伊波恩之书》 (Book of Eibon)
     * 古代Hyperborea大陆的巫师伊波恩著
     */
    '伊波恩之书': {
        name: '伊波恩之书',
        author: '伊波恩',
        era: ['1920s', '现代', '1890s'],
        readingTime: '28周',
        sanLossInitial: '1D8/1D10',
        sanLossFull: '1D10/2D10',
        mythosGainInitial: '1D8',
        mythosGainFull: '1D10+5',
        mythosRequired: 5,
        languages: ['拉丁语', '法语', '英语'],
        spells: ['召唤/控制克苏鲁的星之眷族', '接触伊波恩', '时间旅行', '变形术'],
        description: '古代Hyperborea大陆的伟大巫师伊波恩著。原著已失传，现存为中世纪拉丁语译本。记载了Hyperborea的黑暗魔法和禁忌知识。比《死灵书》更古老，更危险。',
        rarity: '唯一'
    }
};

/**
 * 典籍阅读状态追踪（独立导出；引擎经 ESM 使用 CoCStudyState）
 * 使用方式: CoCStudyState.getProgress(char, tomeKey) / window.CoCStudyState
 */
export const CoCStudyState = {
    /**
     * 初始化角色典籍阅读状态
     */
    initForChar: function(char) {
        if (!char.mythosStudy) {
            char.mythosStudy = { studiedTomes: {}, knownSpells: [] };
        }
    },

    /**
     * 获取某本典籍的阅读进度
     */
    getProgress: function(char, tomeKey) {
        this.initForChar(char);
        return char.mythosStudy.studiedTomes[tomeKey] || { phase: '未阅读', weeks: 0, totalWeeks: 0 };
    },

    /**
     * 记录法术学习
     */
    learnSpell: function(char, spellName) {
        if (spellName == null || !String(spellName).trim()) {
            return { ok: false, learned: false, desc: '法术名称不能为空' };
        }
        spellName = String(spellName).trim();
        this.initForChar(char);
        if (!char.mythosStudy.knownSpells.includes(spellName)) {
            char.mythosStudy.knownSpells.push(spellName);
        }
    },

    /**
     * 检查是否已知某法术
     */
    knowsSpell: function(char, spellName) {
        if (!char || spellName == null) return false;
        const name = String(spellName).trim();
        if (char.mythosStudy && Array.isArray(char.mythosStudy.knownSpells)
            && char.mythosStudy.knownSpells.includes(name)) return true;
        return Array.isArray(char.spells) && char.spells.includes(name);
    },

    /**
     * 更新阅读进度
     */
    updateProgress: function(char, tomeKey, phase, weeks, totalWeeks) {
        this.initForChar(char);
        char.mythosStudy.studiedTomes[tomeKey] = { phase: phase, weeks: weeks || 0, totalWeeks: totalWeeks || 0 };
    }
};


if (typeof window !== 'undefined') {
    window.CoCMythosTomes = CoCMythosTomes;
    window.CoCStudyState = CoCStudyState;
}
