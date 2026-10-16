/**
 * Scaffold a minimal scenario package (Wave 6 / Creative D5).
 * Usage: node scripts/scaffold_scenario.mjs --id=foo_bar [--title=标题]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (k) => {
    const hit = args.find((a) => a.startsWith('--' + k + '='));
    return hit ? hit.slice(k.length + 3) : null;
};
const id = get('id') || 'sample_scenario';
if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    console.error('id must be snake_case latin');
    process.exit(1);
}
const title = get('title') || id;
const exportName = 'CoCScenario' + id.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

const mjs = `/**
 * Scaffolded scenario — edit nodes; keep effects on Kernel paths only.
 */
export const ${exportName} = {
    id: '${id}',
    title: ${JSON.stringify(title)},
    subtitle: '脚手架短模组',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['脚手架', '证据分叉', '追逐', '战役账本', '双时钟'],
    description: '由 scaffold:scenario 生成的最小可玩包。',
    era: '1920s',
    estimatedMinutes: 20,
    readsArcLedger: true,
    startNode: 'intro',
    initialLocation: '起始地点',
    clocks: { investigation: 0, ritual: 0, maxInvestigation: 5, maxRitual: 3 },
    setup: {
        location: '起始地点',
        journal: '脚手架任务开始。'
    },
    nodes: {
        intro: {
            narrative: '你站在起始地点。空气潮湿，远处有脚步声。夜色把街灯压成模糊的光圈，笔记本空白页在等第一行可用的记录，而你们必须在传闻与物证之间尽快做出选择。',
            checkpoint: '起始：整理立场',
            effects: { sanCheck: '0/1' },
            choices: [
                { id: 'look', label: '仔细搜查现场并记录物证', next: 'clue_node', skillCheck: { skill: '侦查' } },
                {
                    id: 'rumor',
                    label: '相信巷口传言去追假线索',
                    next: 'clue_node',
                    falseLead: true,
                    falseNext: 'clue_node',
                    skillCheck: { skill: '聆听' }
                },
                { id: 'fight', label: '迎击逼近的敌人并准备交锋', next: 'fight_node' }
            ]
        },
        clue_node: {
            narrative: '你找到一份半干的笔记。墨迹被潮气晕开，却仍能辨认名字与时间；旁边还有一张带证人签名的纸条，信誉高低将影响这条线索最终能抬到哪一档。',
            checkpoint: '物证：湿笔记入手',
            effects: {
                clues: [{
                    id: '${id}_note',
                    title: '湿笔记',
                    content: '潦草的名字与时间。',
                    type: 'document',
                    quality: 'solid',
                    npcId: 'scaffold_witness'
                }],
                advanceClock: { track: 'investigation', by: 1 }
            },
            choices: [
                { id: 'gate', label: '凭物证进入证据档终局宣读', next: 'ending_by_evidence', requiresClueQuality: 'solid' },
                { id: 'chase', label: '追向巷口并打开追逐面板', next: 'chase_node' }
            ]
        },
        fight_node: {
            narrative: '敌人扑来。巷口空箱被踢翻，靴底打滑——你们只能先打响一场短促交锋，再决定是否把追逐继续推进到雨幕深处。',
            effects: {
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'fight_win',
                    onLose: 'fight_lose'
                }
            },
            choices: [{ id: 'after', label: '交锋结束后进入证据档终局', next: 'ending_by_evidence' }]
        },
        chase_node: {
            narrative: '目标窜入雨巷。积水溅起白沫，远处引擎或雾笛隐约作响——用追逐面板拉近距离，或在证据不足时选择收队。',
            effects: {
                chase: { quarry: '逃犯', pursuer: 'pc', lead: 2 }
            },
            choices: [{ id: 'done', label: '结束追逐并进入证据档终局', next: 'ending_by_evidence' }]
        },
        ending_by_evidence: {
            narrative: '你们摊开手头证据。终局将按证据档坚实程度落下——弱证只能存疑，实据足以定案，铁证则彻底钉死谎言。脚手架默认带出三结局分叉，作者只需改写旁白。',
            endingsByClueQuality: {
                weak: 'ending_weak',
                solid: 'ending_win',
                decisive: 'ending_decisive'
            },
            choices: [
                { id: 'read', label: '根据证据档宣读并进入终局', next: 'ending_win' }
            ]
        },
        ending_weak: {
            narrative: '证据只够写成存疑笔录。目标脱身，但你们留下可继承的余波标记与下一剧本的桌规选择。请按审计清单补全节点与能力标签后注册 builtins。\\n\\n【结局：存疑】证据不足。',
            effects: { journal: '脚手架：存疑。', sanCheck: '0/1' },
            end: true
        },
        ending_win: {
            narrative: '实据足以定案。目标落网，物品与热度可写入战役账本快照，供下一短模在桌规卡选择继承或重置。请补全 prose 与标签后跑 test:engine。\\n\\n【结局：定案】证据成立。',
            effects: { journal: '脚手架：定案。', sanCheck: '0/1', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_decisive: {
            narrative: '铁证当众钉死谎言。这是干净的社交或调查胜利，足以示范 endingsByClueQuality 三选一模板——作者替换旁白即可交付。\\n\\n【结局：铁证】伪证链被钉死。',
            effects: { journal: '脚手架：铁证。', sanCheck: '0/1', enchantmentId: 'elder_sign' },
            end: true
        }
    }
};
`;

const mjsPath = path.join(root, 'js', 'data', 'scenarios', id + '.mjs');
const jsonPath = path.join(root, 'js', 'data', 'scenarios', 'packages', id + '.json');
const checklistPath = path.join(root, 'docs', 'SCENARIO_PACKAGE_CHECKLIST.md');

if (fs.existsSync(mjsPath) && !args.includes('--force')) {
    console.error('exists: ' + mjsPath + ' (pass --force to overwrite)');
    process.exit(1);
}

fs.writeFileSync(mjsPath, mjs, 'utf8');

const pack = {
    id,
    title,
    subtitle: '脚手架短模组',
    author: 'CoC Engine Team',
    license: 'Original - CoC Engine',
    tags: ['脚手架', '证据分叉', '追逐', '战役账本', '双时钟'],
    description: '由 scaffold:scenario 生成的最小可玩包。',
    era: '1920s',
    estimatedMinutes: 20,
    readsArcLedger: true,
    clocks: { investigation: 0, ritual: 0, maxInvestigation: 5, maxRitual: 3 },
    startNode: 'intro',
    initialLocation: '起始地点',
    setup: { location: '起始地点', journal: '脚手架任务开始。' },
    nodes: {
        intro: {
            narrative: '你站在起始地点。空气潮湿，远处有脚步声。夜色把街灯压成模糊的光圈，笔记本空白页在等第一行可用的记录，而你们必须在传闻与物证之间尽快做出选择。',
            checkpoint: '起始：整理立场',
            effects: { sanCheck: '0/1' },
            choices: [
                { id: 'look', label: '仔细搜查现场并记录物证', next: 'clue_node', skillCheck: { skill: '侦查' } },
                {
                    id: 'rumor',
                    label: '相信巷口传言去追假线索',
                    next: 'clue_node',
                    falseLead: true,
                    falseNext: 'clue_node',
                    skillCheck: { skill: '聆听' }
                },
                { id: 'fight', label: '迎击逼近的敌人并准备交锋', next: 'fight_node' }
            ]
        },
        clue_node: {
            narrative: '你找到一份半干的笔记。墨迹被潮气晕开，却仍能辨认名字与时间；旁边还有一张带证人签名的纸条，信誉高低将影响这条线索最终能抬到哪一档。',
            checkpoint: '物证：湿笔记入手',
            effects: {
                clues: [{
                    id: id + '_note',
                    title: '湿笔记',
                    content: '潦草的名字与时间。',
                    type: 'document',
                    quality: 'solid',
                    npcId: 'scaffold_witness'
                }],
                advanceClock: { track: 'investigation', by: 1 }
            },
            choices: [
                { id: 'gate', label: '凭物证进入证据档终局宣读', next: 'ending_by_evidence', requiresClueQuality: 'solid' },
                { id: 'chase', label: '追向巷口并打开追逐面板', next: 'chase_node' }
            ]
        },
        fight_node: {
            narrative: '敌人扑来。巷口空箱被踢翻，靴底打滑——你们只能先打响一场短促交锋，再决定是否把追逐继续推进到雨幕深处。',
            effects: {
                combat: {
                    creatureId: 'cultist',
                    mode: 'exchange',
                    pendingRoll: true,
                    attacker: 'pc',
                    weaponId: 'knife',
                    onWin: 'fight_win',
                    onLose: 'fight_lose'
                }
            },
            choices: [{ id: 'after', label: '交锋结束后进入证据档终局', next: 'ending_by_evidence' }]
        },
        chase_node: {
            narrative: '目标窜入雨巷。积水溅起白沫，远处引擎或雾笛隐约作响——用追逐面板拉近距离，或在证据不足时选择收队。',
            effects: { chase: { quarry: '逃犯', pursuer: 'pc', lead: 2 } },
            choices: [{ id: 'done', label: '结束追逐并进入证据档终局', next: 'ending_by_evidence' }]
        },
        ending_by_evidence: {
            narrative: '你们摊开手头证据。终局将按证据档坚实程度落下——弱证只能存疑，实据足以定案，铁证则彻底钉死谎言。脚手架默认带出三结局分叉，作者只需改写旁白。',
            endingsByClueQuality: {
                weak: 'ending_weak',
                solid: 'ending_win',
                decisive: 'ending_decisive'
            },
            choices: [
                { id: 'read', label: '根据证据档宣读并进入终局', next: 'ending_win' }
            ]
        },
        ending_weak: {
            narrative: '证据只够写成存疑笔录。目标脱身，但你们留下可继承的余波标记与下一剧本的桌规选择。请按审计清单补全节点与能力标签后注册 builtins。\n\n【结局：存疑】证据不足。',
            effects: { journal: '脚手架：存疑。', sanCheck: '0/1' },
            end: true
        },
        ending_win: {
            narrative: '实据足以定案。目标落网，物品与热度可写入战役账本快照，供下一短模在桌规卡选择继承或重置。请补全 prose 与标签后跑 test:engine。\n\n【结局：定案】证据成立。',
            effects: { journal: '脚手架：定案。', sanCheck: '0/1', enchantmentId: 'elder_sign' },
            end: true
        },
        ending_decisive: {
            narrative: '铁证当众钉死谎言。这是干净的社交或调查胜利，足以示范 endingsByClueQuality 三选一模板——作者替换旁白即可交付。\n\n【结局：铁证】伪证链被钉死。',
            effects: { journal: '脚手架：铁证。', sanCheck: '0/1', enchantmentId: 'elder_sign' },
            end: true
        }
    }
};
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');

const checklist = `# Scenario package checklist

After scaffolding or hand-authoring a pack:

1. Register in \`js/data/scenarios/builtins.mjs\` (import + BUILTIN_SCENARIOS).
2. Effects only via known keys (\`sanCheck\`, \`combat\`+pendingRoll, \`chase\`, \`enchantmentId\`, \`dispel\`, \`flags\`, clues, \`advanceClock\`…).
3. No flat \`san\` number; use \`sanCheck\`.
4. Combat exchanges use \`pendingRoll: true\` for player dice.
5. Theme chase when fitting (\`effects.chase\`); chase twins: \`alley_to_asphalt\`, \`rain_dock_chase\`, \`fog_lighthouse_chase\`.
6. Run \`npm run audit:pack-parity\` if mjs+json twins share nodes.
7. Run \`npm run test:engine\` (\`package_effects_audit\` covers packages/).
8. Optional: \`branchByClueQuality\` / \`endingsByClueQuality\` for evidence endings.
9. Capability tags: \`证据分叉\` / \`追逐\` / \`神话热度\` / \`战后余波\` / \`战役账本\` / \`双时钟\`.
10. Optional: \`readsArcLedger\`, \`requiresChapterUnlock\`, \`clocks\` + \`onClockFull\`, \`falseLead\`, clue \`npcId\`.
11. Never add a second HP/SAN write path in the scenario file.

Scaffold: \`npm run scaffold:scenario -- --id=foo_bar --title=标题\`
`;
if (!fs.existsSync(checklistPath)) {
    fs.writeFileSync(checklistPath, checklist, 'utf8');
}

console.log('scaffold_scenario: wrote', path.relative(root, mjsPath), 'and', path.relative(root, jsonPath));
console.log('Remember: add to builtins.mjs, then npm run audit:pack-parity');
console.log('Checklist:', path.relative(root, checklistPath));
