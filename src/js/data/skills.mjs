/**
 * CoC 7th Edition Base Skill Catalog
 *
 * Single source of truth for all skill definitions used by the rules engine.
 * Referenced by CoCEngine.BaseSkills at runtime.
 */
export const CoCBaseSkills = {
    "会计": { base: 5, aliases: ["会计学"] },
    "人类学": { base: 1 },
    "估价": { base: 5 },
    "考古学": { base: 1, aliases: ["考古"] },
    "技艺": { base: 5, isParent: true, requiresSpecialization: true, children: ["绘画", "雕塑", "写作", "摄影", "烹饪", "歌唱", "乐器", "表演", "舞蹈", "锻造", "木工", "裁缝", "制革", "制陶", "玻璃工艺", "珠宝工艺", "书法", "园艺", "其他技艺"], aliases: ["技艺①", "技艺②", "技艺③"] },
    "汽车驾驶": { base: 20, aliases: ["驾驶：汽车"] },
    "电气维修": { base: 10 },
    "斗殴": { base: 25, isParent: true, children: ["拳击", "摔跤", "踢腿", "柔道", "空手道", "其他格斗"], aliases: ["格斗：斗殴", "格斗①", "格斗②", "格斗③"] },
    "手枪": { base: 20, aliases: ["射击：手枪"] },
    "急救": { base: 30 },
    "历史": { base: 5 },
    "跳跃": { base: 20 },
    "外语": { base: 1, isParent: true, requiresSpecialization: true, children: ["英语", "法语", "德语", "日语", "西班牙语", "俄语", "拉丁语", "希腊语", "其他外语"], aliases: ["外语①", "外语②", "外语③"] },
    "母语": { base: 0, isDynamic: true, dynamicCalc: (char) => char.attrs.EDU, isParent: true, requiresSpecialization: true, children: ["中文", "英文", "法文", "德文", "日文", "西班牙文", "俄文", "拉丁文", "希腊文", "其他母语"] },
    "法律": { base: 5 },
    "图书馆使用": { base: 20, aliases: ["图书馆"] },
    "聆听": { base: 20 },
    "锁匠": { base: 1 },
    "机械维修": { base: 10 },
    "医学": { base: 1 },
    "博物学": { base: 10, aliases: ["自然"] },
    "神秘学": { base: 5 },
    "操作重型机械": { base: 1 },
    "精神分析": { base: 1 },
    "心理学": { base: 10 },
    "骑术": { base: 5, aliases: ["骑乘"] },
    "科学": { base: 1, isParent: true, requiresSpecialization: true, children: ["生物学", "化学", "物理学", "天文学", "地质学", "药学", "植物学", "动物学", "密码学", "工程学", "法医学", "数学", "其他科学"], aliases: ["科学①", "科学②", "科学③"] },
    "潜行": { base: 20 },
    "侦查": { base: 25 },
    "生存": { base: 10, requiresSpecialization: true, aliases: ["生存："] },
    "游泳": { base: 20 },
    "投掷": { base: 20 },
    "攀爬": { base: 20 },
    "话术": { base: 5 },
    "炮术": { base: 1 },
    "重型武器": { base: 1 },
    "爆破": { base: 1 },
    "计算机使用": { base: 5, aliases: ["计算机", "计算机使用 Ω"] },
    "电子学": { base: 1, aliases: ["电子学 Ω"] },
    "驾驶": { base: 1, isParent: true, requiresSpecialization: true, children: ["驾驶：汽车", "驾驶：摩托车", "驾驶：船只", "驾驶：飞机", "驾驶：马车", "其他驾驶"], aliases: ["驾驶："] },
    "射击": { base: 20, isParent: true, requiresSpecialization: true, children: ["手枪", "步枪", "霰弹枪", "冲锋枪", "弓箭", "弩", "其他射击"], aliases: ["射击：", "射击①", "射击②", "射击③"] },
    "潜水": { base: 1 },
    "驯兽": { base: 5 },
    "学识": { base: 1, isParent: true, requiresSpecialization: true, children: ["历史学识", "地理学识", "生物学识", "物理学识", "天文学识", "地质学识", "医学学识", "其他学识"] },
    "闪避": { base: 0, isDynamic: true, dynamicCalc: (char) => Math.floor(char.attrs.DEX / 2) || 0 },
    "信用评级": { base: 0, isSpecial: true, aliases: ["信用评级"] },
    "克苏鲁神话": { base: 0, isSpecial: true, aliases: ["克苏鲁神话"] },
    "自定义技能": { base: 0, isSpecial: true },
    "恐吓": { base: 15 },
    "说服": { base: 10 },

    "妙手": { base: 10, aliases: ["手上功夫"] },
    "乔装": { base: 5, aliases: ["伪装", "化妆"] },
    "追踪": { base: 10 },
    "导航": { base: 10, aliases: ["方向感"] },

    "步枪/霰弹枪": { base: 25, aliases: ["步枪", "霰弹枪"], isConcreteSpecialization: true },

    "取悦": { base: 15, aliases: ["魅惑", "吸引"] },

    // 扩展技能 (由经历包引用)
    "催眠": { base: 1, isExtended: true },
    "黑市交易": { base: 1, isExtended: true },
    "读唇": { base: 1, isExtended: true },
    "战术": { base: 1, isExtended: true },

};
