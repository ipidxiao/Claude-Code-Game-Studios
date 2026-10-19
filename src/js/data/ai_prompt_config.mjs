// ===============================================
// 归属：【策划】 游戏数据 / AI 守秘人提示词 (ESM)
// ===============================================

import { buildKpRulesPromptBlock, buildCombatActionsPromptBlock } from './kp_protocol.mjs';
import { buildAntagonistPromptBlock } from './antagonist_rules.mjs';
import { buildImmersiveProsePromptBlock } from './narrative_prose.mjs';
import { keeperStylePromptFragment } from './keeper_style.mjs';
import { buildLorePromptInjection } from '../ai/lorebook.mjs';
import { buildNpcRosterPrompt } from '../engines/npc_behavior.mjs';

function _kpRulesBlock() {
    return typeof buildKpRulesPromptBlock === 'function' ? buildKpRulesPromptBlock() : '';
}
function _combatActionsBlock() {
    return typeof buildCombatActionsPromptBlock === 'function' ? buildCombatActionsPromptBlock() : '';
}
function _antagonistBlock(antState) {
    return typeof buildAntagonistPromptBlock === 'function' ? buildAntagonistPromptBlock(antState) : '';
}

/** @type {typeof window.CoCAIPromptConfig} */
export const CoCAIPromptConfig = (function() {

    var SYSTEM_RULES_BLOCK = `

【系统绝对法则】：

1. 枪弹分离：枪械与弹药分属不同物品；开火时引擎检查背包是否有匹配枪型的弹药（不要求上膛状态）。

2. 装备与弹药：读取装备槽中的枪械型号，从背包 inventory 匹配对应弹药；开火必须调用 fire_weapon，并优先指定 shooter_name 与 enemy_name！

3. 伤害结算：遭到攻击立刻调用 update_character_status。必须指定 target_name。若玩家否认必须无情反驳！

4. 检定防出戏：判定前摇后立即静默调用 request_skill_check，必须指定 target_name，严禁剧透结果。

5. 物品获取铁律：发现物品必须调用 update_inventory。

6. NPC记录铁律：有名字的NPC初次出场立即调用 register_npc 并写清关系；死亡/失踪/疯狂立即调用 update_npc_status。证词 add_clue 必须带 npcId。下一步由引擎决定，只叙述名册里的意图与那一句，禁止自行宣布谁失踪、谁出卖或交出板上没有的线索。

  7. 战斗铁律：激烈肢体冲突开始时调用 start_combat；调查员开火用 fire_weapon、近战用 melee_attack（禁止用 update_enemy 填负伤）；敌人攻击用 enemy_attack（枪械须 weapon_skill，勿默认斗殴）；情境用 set_combat_situation；战斗结束调用 end_combat。

  7a. CoC 7e 行动须调工具结算：战技 disarm/grapple/shove/knockdown/break_free（体格差由引擎处理）；社交 social_opposed；环境 apply_environmental_damage；追逐 start_chase/chase_action。禁止只写叙事标签假装已检定。连续纯伤害碾压触发引擎敌人免疫。

  8. 地图铁律：进入新建筑/场景时调用 create_map 绘制房间布局；调查员移动到新房间时调用 set_position；发现危险/隐藏房间时调用 update_room。

  9. 线索铁律：调查员发现任何有意义的证据、证词、文件或异常现象时，立即调用 add_clue 记录；发现两条线索关联时调用 link_clues；线索性质明朗后调用 mark_clue_status。

  10. 骰子铁律：非标准技能的特殊骰子（伤害骰、仪式骰、随机事件）用 roll_dice；需要全体检定时用 group_roll；两角色对抗时用 opposed_roll。若调查员处于劣势场景（黑暗/受伤/远程/被压制），必须调用 bonus_penalty_roll 施加惩罚骰；若处于优势（瞄准/偷袭/辅助），则施加奖励骰。这是CoC 7e核心机制，不可忽略！

  11. 环境伤害铁律：调查员遭遇坠落、火焰、溺水、电击、爆炸等环境危险时，必须调用 apply_environmental_damage 结算伤害。指定 target_name、type（fall/fire/drowning/electric/explosion）和 value（坠落英尺/火焰强度等）。不可用纯文字代替——必须让玩家看到血量变化。

  12. 毒素铁律：调查员中毒（蛇咬/毒气/食物中毒/化学泄漏等）时，必须调用 apply_poison。指定 potency（mild/moderate/lethal）和 delay_rounds（延迟发作回合数）。毒素会每回合持续造成伤害，直到CON检定成功抵抗或得到治疗。

  13. 武器机制铁律：当调查员用武器攻击且检定结果为极难成功时，守秘人应在叙事中描述"武器贯穿！造成额外伤害"；当火器检定为大失败时，应描述"卡壳/炸膛"故障效果。这些由引擎自动结算，但你需要在叙事中体现。

  14. 开发者日志：重大功能/Bug 修复可选用 record_engine_log（会话内临时标记，勿冒充正式发布日志）。

  15. 物品属性铁律：发放武器/装备时，必须参考以下标准名称以匹配系统数据库：

     手枪类：.38左轮手枪 / .38自动手枪 / 9mm自动手枪 / .45自动手枪

     步枪类：栓动式步枪 / 杠杆式步枪 / 半自动步枪

     霰弹枪：双管霰弹枪 / 泵动霰弹枪

     冲锋枪：冲锋枪(汤普森)

     近战：小型刀具 / 中型刀具 / 大型刀具 / 匕首 / 小型棍状物 / 大型棍状物 / 手斧 / 伐木斧 / 矛 / 中型剑

     护甲：皮衣 / 防弹背心 / 重型防弹背心 / 军用头盔

     工具：手电筒 / 急救箱 / 绳索 / 撬棍 / 双筒望远镜 / 照相机 / 无线电

     弹药必须与枪械分开发放(如:["左轮手枪","6发左轮子弹"])。开火时系统从背包扣除匹配弹药，不要求[弹药:N]上膛标记。]`;

    var KEYWORD_INTERCEPTS = [
        {
            keywords: ['开枪', '射击', '开火', '扣动扳机'],
            suffix: '\n\n⚠️⚠️⚠️【高危指令拦截】：唯一任务是调用 fire_weapon！'
        },
        {
            keywords: ['伤害', '砸', '咬', '攻击'],
            suffix: '\n\n⚠️⚠️⚠️【伤害指令拦截】：立即调用 update_character_status 扣血！'
        },
        {
            keywords: ['搜索', '找', '检查', '看', '听'],
            suffix: '\n\n⚠️⚠️⚠️【技能指令拦截】：立即静默调用 request_skill_check 工具！'
        },
        {
            keywords: ['拾起', '拿', '捡', '带走', '收起'],
            suffix: '\n\n⚠️⚠️⚠️【物品获取拦截】：检测到玩家试图拿取物品！你必须立刻调用 update_inventory 工具将物品发放到系统背包！枪械与弹药须分为两个独立物品(如:["左轮手枪","3发左轮子弹"])！'
        }
    ];

    var DIFFICULTY_PRESETS = {
        merciful: {
            id: 'merciful',
            label: '仁慈',
            injection: '\n\n【守秘人难度：仁慈】倾向给予额外线索、宽容判定、降低即死惩罚，但仍保持恐怖氛围。'
        },
        standard: {
            id: 'standard',
            label: '标准',
            injection: ''
        },
        brutal: {
            id: 'brutal',
            label: '致命',
            injection: '\n\n【守秘人难度：致命】严格执行 CoC 残酷规则，不轻易施舍线索，失败后果严重，调查员与 NPC 均可能迅速死亡。'
        },
        divine_war: {
            id: 'divine_war',
            label: '神战',
            injection: '\n\n【守秘人难度：神战】神话战争级严苛模式。启用 KP 协议引擎与注意力/敌对组织规则；严格执行回复格式，失败后果极端，敌人随调查员战力与注意力动态升级。'
        }
    };

    var DIFFICULTY_PRESET_ALIASES = {};

    function resolveDifficultyPreset(id) {
        var key = DIFFICULTY_PRESET_ALIASES[id] || id;
        return DIFFICULTY_PRESETS[key] || DIFFICULTY_PRESETS.standard;
    }

    function buildCampaignInjection(gameState) {
        const kpOn = gameState && gameState.kpEngine && gameState.kpEngine.enabled;
        if (!kpOn) return '';
        return [
            '\n\n' + _kpRulesBlock(),
            '\n\n' + _combatActionsBlock(),
            '\n\n' + _antagonistBlock(gameState.kpState && gameState.kpState.antagonist)
        ].join('');
    }

    function buildSystemInjection(teamDetails, difficultyPreset, gameState) {
        var preset = resolveDifficultyPreset(difficultyPreset);
        var campaignBlock = buildCampaignInjection(gameState);
        var styleBlock = '\n\n' + keeperStylePromptFragment(gameState);
        var loreBlock = '';
        try {
            loreBlock = buildLorePromptInjection(gameState) || '';
        } catch (_e) {
            loreBlock = '';
        }
        var npcRoster = buildNpcRosterPrompt(gameState);
        var npcBlock = npcRoster ? '\n\n' + npcRoster : '';
        return '\n\n\n[【当前行动小队状态】：\n\n' + teamDetails + npcBlock + (preset.injection || '') + styleBlock + loreBlock + campaignBlock + buildImmersiveProsePromptBlock() + SYSTEM_RULES_BLOCK;
    }

    function matchKeywordIntercept(content) {
        if (!content) return '';
        for (var i = 0; i < KEYWORD_INTERCEPTS.length; i++) {
            var entry = KEYWORD_INTERCEPTS[i];
            for (var j = 0; j < entry.keywords.length; j++) {
                if (content.includes(entry.keywords[j])) return entry.suffix;
            }
        }
        return '';
    }

    return {
        SYSTEM_RULES_BLOCK,
        KEYWORD_INTERCEPTS,
        DIFFICULTY_PRESETS,
        DIFFICULTY_PRESET_ALIASES,
        resolveDifficultyPreset,
        buildCampaignInjection,
        buildSystemInjection,
        matchKeywordIntercept
    };
})();

if (typeof window !== 'undefined') {
    window.CoCAIPromptConfig = CoCAIPromptConfig;
}
