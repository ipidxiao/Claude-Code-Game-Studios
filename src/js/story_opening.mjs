/**

 * Story opening card — 时间/地点/人物 + 往事·当下·目标 narrative triad.

 * Used by local scenarios, online AI KP, and campaign loads.

 */



import { CoCScenarioStore } from './scenario/store.mjs';
import { resolveSelectedActiveChar } from './state/selection.mjs';

const ERA_TIME_DEFAULTS = {

    '1920s': '1920年代',

    '1930s': '1930年代',

    '1940s': '1940年代',

    '1950s': '1950年代',

    '1960s': '1960年代',

    'modern': '现代',

};



/** Curated narrative for built-in scenarios (past / present / future). */

export const SCENARIO_OPENING_BY_ID = {

    tutorial: {

        past: '你接受了调查哈特利老宅怪声的委托。当地人避而不谈这栋雨夜中的空宅，报酬却如期到账。',

        present: '刚推开吱呀作响的木门，门厅里只剩翻倒的衣帽架与褪色肖像。雨声里夹着一下又一下的闷响，像是从井的方向传来。',

        future: '在满月之前走遍老宅，找出血色字迹与井边怪声背后的真相，了结这桩委托。',

    },

    deep_one_shadow: {

        past: '1928年马布尔港满月前后接连有人失踪。报社预付一半酬金，雇你们追查码头17号仓库与教会档案的关联。',

        present: '浓雾贴着水面流动，码头工人刻意别过脸，锚与烛台旅馆招牌在风中吱呀作响——镇民讳莫如深，线索却指向黑礁。',

        future: '查明失踪真相，揭露仓库转运与黑礁献祭的内幕，在下一满月前活着离开马布尔港。',

    },

    abandoned_asylum: {

        past: '1924年石岭疗养院因不明火灾永久关闭。你们受雇清点关闭前的病人档案与财物，合同要求一周内提交清单。',

        present: '铁门半开，空荡走廊深处传来轮椅的吱呀声——这里本不该再有人活动，低语却从病房方向隐隐传来。',

        future: '完成档案清点，查清疗养院关闭与火因，找出「墙中」与17号病人的真相，安全撤离。',

    },

    midnight_museum: {

        past: '「法老之夜」展开幕前夜，核心展品奈布-卡面具被盗。馆长出高薪雇你们在闭馆后潜入，揪出内鬼。',

        present: '你们从屋顶潜入，博物馆内寂静异常——保安巡逻规律不明，失窃面具的下落仍无头绪。',

        future: '寻回奈布-卡面具，查明盗窃链条与幕后黑手，在黎明前离开博物馆。',

    },

    coastal_festival: {

        past: '盐港镇每年秋分举行「海父丰收节」。今年游客接连失踪，你们以记者身份混入庆典调查。',

        present: '码头盐雾弥漫，庆典帐篷已搭起，镇民对失踪案三缄其口——节庆气氛下藏着不愿被写进报道的秘密。',

        future: '查清游客失踪与丰收祭的关联，在祭典高潮前揭露或阻止正在酝酿的仪式。',

    },

    university_occult: {

        past: '密斯卡托尼克大学「星象研究会」成员在图书馆闭馆后接连失踪。校方以客座研究员名义雇你们暗中调查，不得惊动媒体。',

        present: '校园看似平静，研究会却人心惶惶——闭馆后的图书馆与地下书库，是失踪者最后出现的地方。',

        future: '找出失踪者下落，弄清星象研究与地下密室的关联，在校方掩盖真相前提交可验证的结论。',

    },

    lighthouse_signal: {

        past: '风暴角灯塔三周未回应海岸警卫队呼叫。最后一封电报只有摩尔斯码：三长两短，重复七次。你们乘补给船登岛调查。',

        present: '登陆点风浪未歇，灯塔沉默矗立——守塔人下落不明，岛上弥漫着被刻意隐瞒的紧迫感。',

        future: '查明守塔人失踪与异常信号的含义，弄清灯室中「应答」的本质，活着离开风暴角。',

    },

    missing_child: {

        past: '波士顿郊区橡树街，8岁女孩艾米莉黄昏在自家后院消失。警方搜寻无果，父母雇你们继续调查。',

        present: '哈特家后院留有孩童最后玩耍的痕迹，邻居说法互相矛盾——每一分钟都可能决定孩子能否被找回。',

        future: '找到艾米莉·哈特，查清绑架或超自然介入的真相，将她平安送还父母。',

    },

    train_to_nowhere: {

        past: '你购得午夜特快13号卧铺票，本以为是寻常夜行列车——驶出波士顿后，窗外景色却永远停在同一片雾林之中。',

        present: '列车员微笑告知「本趟无终点站」。车厢内其他乘客神情麻木，时间感正在崩解——你必须弄清如何下车。',

        future: '找到列车运行的规则与守车钥匙，在意识被永远困住前逃离这趟无尽列车。',

    },

    carnival_of_masks: {

        past: '「千面嘉年华」巡回至普罗维登斯郊外，当地少年在帐篷区失踪。马戏团老板邀请你「免费观看压轴戏」——条件是不摘面具。',

        present: '嘉年华入口灯火通明，笑声与音乐掩盖了不安——失踪少年的父母仍在门外等候消息。',

        future: '查明少年失踪与马戏团压轴戏的关系，在最后一夜开始前揭穿或打断面具背后的仪式。',

    },

};



/** @returns {boolean} */

export function hasOpeningMessage(chatHistory) {

    return Array.isArray(chatHistory) && chatHistory.some((m) => m && m.isOpening);

}



/** @returns {boolean} */

export function needsOpening(gameState) {

    if (!gameState || hasOpeningMessage(gameState.chatHistory)) return false;

    const h = gameState.chatHistory || [];

    const hasNarrative = h.some((m) =>

        m && m.role === 'assistant' && String(m.content || '').trim() && !m._scenarioCheck

    );

    return !hasNarrative;

}



function rosterCharacterNames(gameState) {

    const roster = gameState?.roster || [];

    const active = roster.filter((c) => c && c.isActive !== false);

    const list = (active.length ? active : roster)

        .map((c) => (c?.name || '').trim())

        .filter(Boolean);

    return list.length ? list.join('、') : '（尚未登记调查员）';

}



function resolveEra(gameState, opts = {}) {

    if (opts.era) return opts.era;

    const selected = resolveSelectedActiveChar(gameState);

    if (selected && selected.era) return selected.era;

    return gameState?.draftChar?.era || '1920s';

}



function resolveTimeLabel(gameState, opts = {}) {

    if (opts.time) return opts.time;

    const era = resolveEra(gameState, opts);

    return ERA_TIME_DEFAULTS[era] || era || '未知时间';

}



function resolveModuleTitle(gameState) {

    try {

        const id = gameState?.activeModuleId || 'default';

        const meta = typeof localStorage !== 'undefined'

            ? JSON.parse(localStorage.getItem('coc_module_' + id + '_meta') || 'null')

            : null;

        if (meta?.name) return meta.name;

    } catch (_) { /* ignore */ }

    return gameState?.activeModuleId === 'default' ? '默认战役' : (gameState?.activeModuleId || '当前模组');

}



function firstSentence(text) {

    const s = String(text || '').trim();

    if (!s) return '';

    const m = s.match(/^[^。！？.!?]+[。！？.!?]?/);

    return m ? m[0].trim() : s.slice(0, 120);

}



function normalizeJournal(journal) {

    return String(journal || '')

        .replace(/^委托[：:]\s*/, '')

        .replace(/^调查[：:]\s*/, '')

        .replace(/^接受委托[：:]\s*/, '')

        .trim();

}



/**

 * Derive 往事/当下/目标 from scenario object when no curated override exists.

 * @param {object} scenario

 * @returns {{ past: string, present: string, future: string }}

 */

export function buildOpeningFromScenario(scenario) {

    if (!scenario) {

        return {

            past: '你们以调查员身份受托介入一桩悬而未决的事件。',

            present: '刚抵达现场，局面尚未明朗，细节仍待拼凑。',

            future: '搜集线索、作出判断，在局势恶化前查明真相并全身而退。',

        };

    }



    const curated = SCENARIO_OPENING_BY_ID[scenario.id] || scenario.opening;

    if (curated?.past && curated?.present && curated?.future) {

        return { past: curated.past, present: curated.present, future: curated.future };

    }



    const journal = normalizeJournal(scenario.setup?.journal);

    const desc = String(scenario.description || '').trim();

    const loc = scenario.initialLocation || scenario.setup?.location || '现场';

    const atm = scenario.setup?.atmosphere?.note;



    const past = curated?.past

        || (journal ? `你们接下委托：${journal.replace(/。$/, '')}。这便是你们卷入此案的来龙去脉。` : '')

        || (desc ? `${firstSentence(desc)} 你们因此受命前来调查。` : `受当地委托雇佣，你们以调查员身份来到${loc}。`);



    const present = curated?.present

        || (atm ? `此刻你们身处${loc}——${atm}。局势紧绷，线索尚未串联成完整图景。` : '')

        || `你们刚抵达${loc}，周遭气氛压抑，关键证人或证据仍待发掘。`;



    const future = curated?.future

        || (journal ? `完成委托目标：${journal.replace(/。$/, '')}，提交可验证的调查结论，并保全队伍性命与理智。` : '')

        || (scenario.subtitle

            ? `查明「${scenario.subtitle}」背后的真相，在理智与性命尚全时扭转局面或安全撤离。`

            : '搜集足够线索作出判断，阻止事态恶化或及时撤离。');



    return { past, present, future };

}



function buildOnlineNarrative(gameState, opts = {}) {

    const moduleTitle = opts.title || resolveModuleTitle(gameState);

    const loc = opts.location || gameState?.currentLocation || '未知地点';

    const names = opts.characters || rosterCharacterNames(gameState);

    return {

        past: opts.past || `你们因委托、利害或偶然，被卷入与「${moduleTitle}」相关的异常事件。此前获得的零碎情报指向${loc}，但完整图景仍不明朗。`,

        present: opts.present || `此刻你们身处${loc}，守秘人（AI）将依你们的行动推进叙事。周遭细节、NPC 态度与隐藏危机，都需通过调查与对话逐步揭开。`,

        future: opts.future || `查明事件核心真相，完成模组既定目标（或你们自行确立的调查方向），在理智与性命耗尽前做出关键抉择。当前小队：${names}。`,

    };

}



function buildCampaignNarrative(gameState, opts = {}) {

    const title = opts.title || resolveModuleTitle(gameState);

    const loc = opts.location || gameState?.currentLocation || '未知地点';

    return {

        past: opts.past || `长期调查让你们追踪至「${title}」的关键节点。此前的牺牲与线索，皆指向眼下这一战。`,

        present: opts.present || `你们身处${loc}，局势已到临界点——拖延或误判，都可能导致无法挽回的后果。`,

        future: opts.future || `完成本阶段战役目标：阻断仪式、拯救队友、夺取关键物品或撤出危险区域，为后续章节保留胜算。`,

    };

}



/**

 * Build opening payload for UI card.

 * @param {object} gameState

 * @param {object} [opts]

 */

export function buildOpeningContext(gameState, opts = {}) {

    const runner = gameState?.scenarioRunner;

    const isLocal = !!(opts.local || runner?.active);

    const isCampaign = !!(opts.campaign || gameState?.activeCampaign);

    const scenarioTitle = opts.title

        || runner?.scenarioTitle

        || (isCampaign && gameState?.activeCampaign)

        || resolveModuleTitle(gameState);

    const location = opts.location

        || gameState?.currentLocation

        || '未知地点';



    let narrative;

    if (opts.past && opts.present && opts.future) {

        narrative = { past: opts.past, present: opts.present, future: opts.future };

    } else if (opts.scenario) {

        narrative = buildOpeningFromScenario(opts.scenario);

    } else if (isLocal && runner?.scenarioId) {

        const scenario = CoCScenarioStore.getScenario?.(runner.scenarioId);

        narrative = buildOpeningFromScenario(scenario);

    } else if (isCampaign) {

        narrative = buildCampaignNarrative(gameState, opts);

    } else {

        narrative = buildOnlineNarrative(gameState, opts);

    }



    return {

        title: scenarioTitle,

        subtitle: opts.subtitle || (isLocal ? '本地剧本' : (isCampaign ? '战役模式' : '在线守秘人')),

        time: resolveTimeLabel(gameState, opts),

        location,

        characters: opts.characters || rosterCharacterNames(gameState),

        mode: isLocal ? 'local' : (isCampaign ? 'campaign' : 'online'),

        past: narrative.past,

        present: narrative.present,

        future: narrative.future,

    };

}



/**

 * Push styled opening card into chat history (idempotent per session).

 * @param {object} gameState

 * @param {object} [opts]

 * @param {() => void} [scrollFn]

 * @returns {boolean}

 */

export function pushStoryOpening(gameState, opts = {}, scrollFn) {

    if (!gameState || !Array.isArray(gameState.chatHistory)) return false;

    if (!opts.force && !needsOpening(gameState)) return false;



    const opening = buildOpeningContext(gameState, opts);

    gameState.chatHistory.push({

        role: 'system',

        isLocalOnly: true,

        isOpening: true,

        opening,

        content: `【开场】${opening.title}｜${opening.time}｜${opening.location}｜${opening.characters}`,

    });

    if (typeof scrollFn === 'function') scrollFn();

    return true;

}


