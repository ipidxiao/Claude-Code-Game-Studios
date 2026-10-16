// ===============================================
// 归属：【策划】 游戏数据 / 规则表
// 程序/美术/QA 请勿直接修改此文件
// 修改后放入 roles/designer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC 7th Edition 重伤部位表 (Major Wound Location Table)
 * D20 决定受重伤的部位及其后果
 */

/**
 * @role    策划 (Designer)
 * @owner   游戏数据 / 规则表
 * @caution 程序合并时通过 roles/designer/ 目录接收
 */
export const CoCInjuryTables = {
    /**
     * 重伤部位 D20 表 — CoC 7e Keeper Rulebook
     */
    HIT_LOCATION: {
        1:  { location: '头部',    area: 'head',    consequences: ['昏迷风险', '智力/外貌损伤'],     conCheck: true,   desc: '颅骨遭受重击，必须进行CON检定保持清醒。失败则昏迷1D6小时。' },
        2:  { location: '头部',    area: 'head',    consequences: ['昏迷风险', '感官损伤'],           conCheck: true,   desc: '头部受到严重冲击，可能造成脑震荡或感官损失。' },
        3:  { location: '右臂',    area: 'right_arm',  consequences: ['武器掉落', '力量减半'],       conCheck: false,  desc: '右臂遭受重创，手中的武器掉落，该手臂力量减半。' },
        4:  { location: '左臂',    area: 'left_arm',   consequences: ['副手失灵', '力量减半'],       conCheck: false,  desc: '左臂严重受伤，无法使用该手臂进行任何精细操作。' },
        5:  { location: '右臂',    area: 'right_arm',  consequences: ['功能受限', '技能检定惩罚'],     conCheck: false,  desc: '右臂肌腱断裂，所有需要手臂的技能检定获得一颗惩罚骰。' },
        6:  { location: '左臂',    area: 'left_arm',   consequences: ['功能受限', '技能检定惩罚'],     conCheck: false,  desc: '左臂骨折，所有需要双臂的技能检定获得一颗惩罚骰。' },
        7:  { location: '右腿',    area: 'right_leg',  consequences: ['移动减半', '倒地'],           conCheck: false,  desc: '右腿重伤，移动力减半。DEX检定失败则倒地。' },
        8:  { location: '左腿',    area: 'left_leg',   consequences: ['移动减半', '倒地'],           conCheck: false,  desc: '左腿重伤，移动力减半。DEX检定失败则倒地。' },
        9:  { location: '右腿',    area: 'right_leg',  consequences: ['跛行', '敏捷减半'],           conCheck: false,  desc: '右腿膝盖粉碎，永久跛行，敏捷减半。' },
        10: { location: '左腿',    area: 'left_leg',   consequences: ['跛行', '敏捷减半'],           conCheck: false,  desc: '左腿小腿骨折，永久跛行，敏捷减半。' },
        11: { location: '躯干',    area: 'torso',      consequences: ['内出血', '每轮1HP'],          conCheck: true,   desc: '躯干被贯穿，造成严重内出血。每轮失去1HP直到接受急救(D6轮内)。' },
        12: { location: '躯干',    area: 'torso',      consequences: ['肋骨骨折', '体质减半'],        conCheck: true,   desc: '肋骨断裂，每次剧烈行动需要进行CON检定否则剧痛导致行动失败。' },
        13: { location: '躯干',    area: 'torso',      consequences: ['内脏损伤', '濒死风险'],        conCheck: true,   desc: '内脏受损，必须立即进行急救否则1D6小时内死亡。' },
        14: { location: '腹部',    area: 'abdomen',    consequences: ['内出血', '体质减半'],          conCheck: true,   desc: '腹部重击导致内出血，体质减半直到接受医学治疗。' },
        15: { location: '右手',    area: 'right_hand', consequences: ['手指断裂', '武器不可用'],       conCheck: false,  desc: '多根手指断裂，无法有效握持武器或进行精细操作。' },
        16: { location: '左手',    area: 'left_hand',  consequences: ['手指断裂', '副手不可用'],       conCheck: false,  desc: '左手手指重创，无法使用副手物品。' },
        17: { location: '右脚',    area: 'right_foot', consequences: ['移动减半', '倒地'],           conCheck: false,  desc: '右脚被毁，移动力减半且所有移动需要DEX检定。' },
        18: { location: '左脚',    area: 'left_foot',  consequences: ['移动减半', '倒地'],           conCheck: false,  desc: '左脚重伤，移动力大幅下降。' },
        19: { location: '面部',    area: 'face',       consequences: ['外貌损伤', 'APP归零'],         conCheck: true,   desc: '面部被毁容，外貌降至0。必须CON检定保持清醒。' },
        20: { location: '颈部',    area: 'neck',       consequences: ['气管受损', '濒死'],           conCheck: true,   desc: '颈部受到致命创伤。立即开始窒息，每轮失去1D3 HP直到接受急救。' }
    },

    /**
     * 濒死检定规则
     */
    DYING_CHECK: {
        description: '当HP降至0或以下时，必须每轮进行CON×5检定。失败则死亡。',
        conMultiplier: 5,
        firstAidStabilization: '急救成功可稳定伤势，停止濒死倒计时。',
        medicineStabilization: '医学成功可完全止血并开始恢复。'
    }
};
