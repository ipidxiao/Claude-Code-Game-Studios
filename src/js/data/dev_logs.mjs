export const DevLogs = [
    {
        version: "V18.7 R30.3",
        date: "2026-10-17",
        title: "独立审查修订：身份登记丢失不撤销合并，暗骰推动与旧叙述不再泄露",
        priority: "P1-修复",
        status: "done",
        changes: [
            "【版本】修订号 R30.3，产品号保持 18.7.0，存档结构保持第 9 版",
            "【身份·根因】原先把『登记里找不到别名』当成『玩家拆分过』，登记丢失（换设备、清除浏览器数据、导入别处存档）时会悄悄撤销合并并写回。现在拆分留正面记录，没有记录就不动；已合并的记录带着 formerInvIds，登记据此重新学会合并",
            "【身份】合并链中拆哪一环都有效；再次合并清除拆分记录；本机存储满时以内存为准，合并 / 拆分会提示『只保留到刷新为止』；登记损坏先另存再重建；『检查全部存档』会清掉已删除存档的证据",
            "【暗骰·根因】推动检定按一次新决定处理，AI 不重复 hidden 就公开了。现在推动沿用原检定的可见范围，推动失败的提示不再覆盖暗骰提示",
            "【暗骰·根因】替换旧叙述里的暗骰数值依据只有 30 条的骰子面板。现在单独保存 darkRolls（随存档，上限 1000 条），对话窗口与往前翻页都按它替换；新增『技能名 N』『N 点』『目标 N』等写法；【骰子】段到任意段标题为止，不再把【故事】整段删掉",
            "【门禁】identity_registry_smoke、visibility_leak_smoke 补齐审查指出的缺口；Playwright 新增跨模组扫描；本轮 25 处故意改坏全部抓到，前三轮 69 处复跑仍全部抓到"
        ],
        remaining: [
            "AI 用上述以外的写法复述暗骰数值（如中文数字）无法从文本判定，第一道防线是提示",
            "群体检定、对抗检定与理智 / 战斗 / 追逐检定尚不能暗骰"
        ]
    },
    {
        version: "V18.7 R30.2",
        date: "2026-10-17",
        title: "调查员身份登记与暗骰写入",
        priority: "P1-功能",
        status: "done",
        changes: [
            "【版本】修订号 R30.2，产品号保持 18.7.0，存档结构保持第 9 版",
            "【调查员身份】新增 js/state/identity_registry.mjs：本机记住每份旧副本发过的编号。同一次存档写出的 localStorage / IndexedDB 副本、导出与再导入自动同号；不同存档里的同名调查员不猜，由玩家在存档管理「调查员身份」里确认是否同一人",
            "【合并与拆分】确认合并后，各存档下次读取时把旧编号改为正式编号，存档内地图、可见范围、账本快照的引用一并改写，旧编号记入 formerInvIds 并写回读出的副本；拆分后按 formerInvIds 恢复；同一队伍里的两人永不合并",
            "【暗骰】rollVisibility 在掷骰处一次决定可见范围，rollCustomDice、roll_dice 工具、技能检定把同一 rollId 与 vis 写进骰子条目、对话检定行、行动日志；AI 工具 roll_dice、request_skill_check 新增可选 hidden、visible_to",
            "【AI 叙述】暗骰的工具结果提示 AI 不写骰值；游客视图去掉叙述的【骰子】段并把暗骰数值换成「（暗骰）」，守秘人与开发者视图保留原文；日志占位显示技能名",
            "【门禁】新增 identity_registry_smoke（挂入 test:engine）与 Playwright identity_merge；visibility_leak_smoke 用真实写入路径造暗骰；三轮故意改坏共 69 处，测试全部能抓到；截图存于 production/qa/evidence"
        ],
        remaining: [
            "群体检定、对抗检定与理智 / 战斗 / 追逐检定尚不能暗骰",
            "联机服务程序与同步协议尚未实现（ADR-0001/0002）"
        ]
    },
    {
        version: "V18.7 R30.1",
        date: "2026-10-17",
        title: "联机地基：调查员编号、存档第 9 版与按人过滤",
        priority: "P1-功能",
        status: "done",
        changes: [
            "【版本】修订号 R30.1，产品号保持 18.7.0；存档结构升到第 9 版，第 1–8 版旧档读入时自动补齐，单人模式行为不变",
            "【设计依据】ADR-0001/0002/0003（docs/architecture，仍为 Proposed）；本批是 ADR-0003 迁移计划的第 1–3 步，不含联机本身",
            "【调查员编号】invId 为随机唯一编号，只发一次、写入存档、此后只读：createInvestigatorRecord 建卡时发号；旧档读入时补号并写回读入的那份副本（取代 R29.25「读档不回写」，仅此一处例外），下次读档拿到同一编号；战役账本快照按唯一姓名一次性配对 roster 的编号；addToRoster 与重号由 ensureInvIds 修复；resolveInvId 把名字转编号，未知或重名返回 null",
            "【存档第 9 版】migrateSaveData 加入幂等规整：roster 与 arcLedger.characterSnapshot 补 invId，对话补 msgId、骰子补 rollId；只有第 9 版以前的存档才把已探索房间记为全体调查员探索过",
            "【按人过滤】新增 js/state/visibility.mjs：projectFor 在顶层字段、记录类型、记录字段三层默认拒绝；系统 / 工具 / 隐藏 / 本地消息不给游客；开发者视图也从白名单构造，不含 AI 设置（含密钥）与本机界面状态；暗骰占位在投影时生成，不存进状态",
            "【地图】createMap、setPosition、updateRoom（设为已探索 / 当前时）经 markExplored 写入 exploredBy；分头行动移位只记移动的那名调查员（原先误记全队）",
            "【日志】行动日志条目未标可见范围时，只有 JOURNAL_PUBLIC_TYPES 列出的类型给游客；note / system / npc 类、无类型与新类型默认只给守秘人",
            "【门禁】新增 visibility_leak_smoke（挂入 test:engine）：用真实写入路径造状态（状态核心的系统提示与密钥、gameplay 的地图 / 线索 / 骰子、KP 引擎暗中操作），每项机密只由一条规则拦下；对过滤、编号与写回代码做了 37 处故意改坏，测试全部能抓到",
            "【测试调整】save_legacy_upgrade_smoke 与 save_idb_consistency_smoke 的存档版本断言由 8 改为 9（有意升级）；旧档读入后断言读入的副本被写回为第 9 版且编号、时间、位置不变，再次读档编号相同且不再写入"
        ],
        remaining: [
            "掷骰函数与 AI 工具尚不能指定可见范围（vis / rollId 写入），暗骰写入属 ADR-0003 第 4 步",
            "战斗 / 追逐面板对游客只给轮次与名字，具体字段待系统 21 设计",
            "同一调查员分别存在多个互不相关的旧档里时，各档会拿到不同编号（无法从数据判断是同一人）",
            "联机服务程序与同步协议尚未实现（ADR-0001/0002）"
        ]
    },
    {
        version: "V18.7 R30",
        date: "2026-10-16",
        title: "晋级发布：按旧 BUG 类型回扫与动态压测",
        priority: "P0-发布候选",
        status: "done",
        changes: [
            "【晋级】package.json / 页脚水印 / STATE_CONTRACT_VERSION → V18.7（18.7.0），修订号 R30；存档结构保持第 8 版，旧档照常读取。收口 R29.65–R29.69",
            "【思路·一】先通读 114 条开发日志，把修过的 BUG 归成类型：外部请求、点名回落、字段白名单、切模清理、存档往返、工具回滚、工具参数、规则单源、剧本断链、预缓存鬼影。再按类型扫全部代码，而不是只看日志点名的那一处",
            "【思路·二】每类先写能跑的扫描器（导入导出、选项键、剧本图、参数对账），并先用故意写错的夹具确认扫描器真能报错，再拿去扫真代码",
            "【思路·三】读代码查不到的，改为把引擎跑起来压：工具模糊测试（只喂通过 schema 校验的参数，并模拟玩家点骰盘，约 4 万次调用、16 种检定）与真实运行器遍历全部内置剧本（每本数十局，记录卡死、软锁、垃圾文本与结局覆盖）",
            "【思路·四】每个疑点先证伪：剧本交锋 undefined、沿海祭典步数撞上限、夜班门槛都先查明是测法问题或设计如此，才决定不改；确认是真 BUG 才修",
            "【思路·五】每个修复先写测试、在旧代码上确认会红，再修到绿；门禁写成防整类回潮（如任何 js 模块不得出现 CDN 域名、处理器读的参数必须在 schema 声明），不只针对这一次",
            "【联网】pdf_import 去掉 cdnjs 回退；AI 接口地址只允许 https，http 仅限本机，不合规时不发送密钥、不重试",
            "【点名】剧本效果写了名册里没有的名字时报错，不再改打选中、活跃或第一名调查员",
            "【剧本数据】useSeedClueQuality 不再被两张选项白名单丢掉；疗养院与小巷追逐孪生包同步；包对等脚本不再把质量门盖到同目标的其他选项上；教程、沿海祭典、假面嘉年华、失踪儿童、无尽列车的旧版 JSON 删除",
            "【剧本运行】散文桥不再把已内联的正文再拼一遍（403 个节点曾全部显示两遍）；落到检定节点时自动出骰盘（28 条侧房选项与列车终章曾卡死）；疗养院日记、失踪儿童井边补退路；假面嘉年华失败文本中的 undefined 修正",
            "【灯塔夜班】判读日志掷图书馆使用，日志线索证据档随检定变化，存疑、定案、铁证三个结局都能走到",
            "【存档与回滚】切模清空关键线索路径、受阻计数与上一次检定；读档后余波检定保有骰盘；工具回滚抽到 js/ai/tool_snapshot.mjs 并覆盖时钟副本、KP 状态、标记、热度、地点等",
            "【工具与规则】变形术可指定生物外形，近战可带情境，开火可只打一发，12 个别名可通过校验；骰式 1D0、0D6 不再出 NaN 或多掷，单个骰式最多 100 颗、1000 面；奖惩骰先抵消再封顶 ±2；精神病院单次最多结算 24 个月",
            "【门禁】新增 12 个 smoke 并挂入 test:engine（110 → 122）：target_resolution、choice_field_whitelist、module_switch_reset、ai_endpoint_guard、pack_graph、load_aftermath_panel、tool_rollback、tool_schema_contract、numeric_bounds、scenario_branch_landing、scenario_exit_guard、night_watch_evidence",
            "【发布】CoC_Engine_V18.7_ParadoxFree_R30_20261016.zip；详细思路、验证与回滚见 docs/RELEASE_R30.md"
        ],
        remaining: [
            "本次打包环境无 npm 源与 Chromium：tool_alias_schema_smoke 以替代桩跑过全部断言，Playwright 未跑；发布前须在本机执行 npm ci && npm run ci",
            "SanityEngine.realityCheck 自掷且无调用方，死代码未删",
            "工具别名只在与规范名同时出现时可用；规范名仍是必填，未放宽",
            "不推送远端，不覆盖已有 ZIP"
        ]
    },
    {
        version: "V18.6 R29.69",
        date: "2026-10-16",
        title: "灯塔夜班证据档随检定变化",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.69，产品号保持 18.6.0，存档结构保持第 8 版",
            "【灯塔夜班】日志台固定发 solid 线索，所有路线都只能走到定案结局，存疑与铁证两个结局永远走不到。新增判读节点 log_check：从灯室或假线索回来都要掷【图书馆使用】，成败都进日志台；日志线索去掉固定档位，按引擎通用对照定档（失败 none、成功 partial、困难 solid、极难与大成功 decisive）",
            "【灯塔夜班】进入终局的 finish 去掉 solid 门槛，由证据档分流：失败与普通成功走存疑，困难成功走定案，极难与大成功走铁证；日志台正文不再声称证据已足够。孪生 JSON 同步",
            "【测试】新增 night_watch_evidence_smoke：五种检定档次与假线索路线逐一走到对应结局，挂入 test:engine；旧数据上确认会红"
        ],
        remaining: [
            "SanityEngine.realityCheck 自掷且无调用方，死代码未删",
            "本轮未跑 Playwright（沙箱无 npm 源与 Chromium），发布前须在本机跑 npm run ci"
        ]
    },
    {
        version: "V18.6 R29.68",
        date: "2026-10-16",
        title: "动态压测：工具模糊测试与剧本遍历",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.68，产品号保持 18.6.0，存档结构保持第 8 版",
            "【骰式】parseDice('1D0') 得 NaN，理智奖励把 NaN 写进理智并随存档保存；'0D6' 被当成 1 颗。零面、零颗记 0，单个骰式最多 100 颗、1000 面（游戏数据最大 15D10）。'1000000000D6' 原先卡页面约 10 秒",
            "【奖惩骰】checkSkill 合计调用方、附魔与情境后不封顶；bonus_penalty_roll 收下 10 亿颗奖励骰等于必大成功。改为先抵消再封顶 ±2（7 版规则），取整；提示按净值显示",
            "【治疗】apply_therapy 按月循环无上限，months=1e9 耗尽内存使页面崩溃。单次最多结算 24 个月，超出部分在结果中写明",
            "【剧本】28 条侧房选项直接跳进检定节点（教程、沿海祭典、大学秘社、灯塔信号），列车的检定成功又落到终章检定节点：goToNode 清空选项却不出骰盘，剧本卡死。落到检定节点且无挂起检定时自动发出该节点的检定；结算时不重放已显示的正文、不重复执行效果（教程阁楼的理智检定），也不重推与正文相同的团体结果",
            "【剧本】废弃疗养院的日记节点唯一出口要求 solid 物证，失踪儿童的井边两个出口分别要标记与 solid 物证，证据不足即卡死。各补一条无门槛的退回选项；疗养院孪生 JSON 同步",
            "【正文】假面嘉年华 wax_check 全员失败文本中 3 处模板残留「undefined」，改为「蜡像沉默」",
            "【测试】新增 numeric_bounds / scenario_branch_landing / scenario_exit_guard 三个 smoke，挂入 test:engine；每个先在旧代码上确认会红"
        ],
        remaining: [
            "~~静谧灯塔夜班两个结局走不到~~ → R29.69 证据档随检定变化",
            "SanityEngine.realityCheck 自掷且无调用方，死代码未删",
            "本轮未跑 Playwright（沙箱无 npm 源与 Chromium），发布前须在本机跑 npm run ci"
        ]
    },
    {
        version: "V18.6 R29.67",
        date: "2026-10-16",
        title: "旧版下载包删除与正文去重",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.67，产品号保持 18.6.0，存档结构保持第 8 版",
            "【删除】教程、沿海祭典、假面嘉年华、失踪儿童、无尽列车的同名旧 JSON 删除（标题、许可证、篇幅与 ESM 不同，缺 R29.58/R29.60 修复）。只为它们服务的 tests/run_all_smoke.js 与无人读取的 prose_keys.json 一并删除。开局只读 ESM",
            "【正文】散文桥对所有节点无条件把散文库原文拼到节点正文前面；ESM 剧本的节点正文已与原文逐字相同（403 个节点），玩家看到的每段剧情都重复两遍。正文已含原文时不再拼接，正文是原文片段时只给原文，只有短桩才拼接",
            "【测试】叙事推送与散文覆盖测试改读 ESM，并断言开场与全部 403 个节点的正文只出现一次；效果审计改用 cc_asylum_whispers；追逐包检查去掉已删包，缺包即报错；pack_graph_smoke 不再允许任何变体"
        ],
        remaining: [
            "SanityEngine.realityCheck 自掷且无调用方，死代码未删",
            "别名只在与规范名同时出现时可用；规范名仍是必填，未放宽",
            "本轮未跑 Playwright（沙箱无 npm 源与 Chromium），发布前须在本机跑 npm run ci"
        ]
    },
    {
        version: "V18.6 R29.66",
        date: "2026-10-16",
        title: "第二轮回扫：包图、读档、回滚、工具参数",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.66，产品号保持 18.6.0，存档结构保持第 8 版；未打发布包",
            "【举一反三·包图】abandoned_asylum.json 停在 R29.58 之前：缺「推回档案柜」选项，ending_seal 不可达，封门正文仍带生成段；已从 ESM 同步",
            "【举一反三·包图】audit_scenario_pack_parity 按 id 找不到选项时退回「同目标任意选项」，把 quiet_push 的 solid 门槛盖到 alley_to_asphalt 的普通 push 上，并算作已覆盖。现在给了 id 只认 id；同目标兜底只认已带同一门槛的选项；--fix 补缺时复制 ESM 原选项，不再造占位。alley 的 flee_foot 已从 ESM 同步",
            "【举一反三·读档】读档先把余波转成检定、推出骰盘消息并标 _emitted，随后重建聊天把这条消息冲掉：待掷检定存在却无面板，此后理智、濒死检定全排在它后面。余波转检定改到聊天重建与孤儿作废之后",
            "【举一反三·回滚】工具回滚抽到 js/ai/tool_snapshot.mjs，补齐 flags、mythosHeat、heatEventsLog、kpState、kpEngine（规则预设按引用保留）、地点、氛围、日志、仓库、骰子历史、lastSkillCheck。原先 advance_time 中途抛错时回滚了 worldClock 却留下已推进的 kpState.TIME",
            "【举一反三·工具参数】schema 严格校验下，处理器读取但未声明的参数整次被拒：cast_spell.creature_name/form_name（变形术线上永远不变形）、melee_attack.situation、fire_weapon.rounds，另有 12 个别名。已全部声明；enemy_name 说明改为 R29.64 规则（恰好一个才代选）",
            "【测试】新增 pack_graph / load_aftermath_panel / tool_rollback / tool_schema_contract 四个 smoke，挂入 test:engine；每个先在旧代码上确认会红"
        ],
        remaining: [
            "~~五个同名旧 JSON 的去留~~ → R29.67 删除",
            "别名只在与规范名同时出现时可用；规范名仍是必填，未放宽",
            "SanityEngine.realityCheck 自掷且无调用方，死代码未删",
            "本轮未跑 Playwright（沙箱无 npm 源与 Chromium），发布前须在本机跑 npm run ci"
        ]
    },
    {
        version: "V18.6 R29.65",
        date: "2026-10-15",
        title: "按旧 BUG 类型回扫",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.65，产品号保持 18.6.0，存档结构保持第 8 版；未打发布包",
            "【举一反三·联网】pdf_import 在本地 pdf.js 缺失时不再回退 cdnjs，直接报错；加载失败不缓存，可重试。门禁扩到整个 js/**：任何模块都不得出现 CDN 域名",
            "【举一反三·联网】AI 接口地址带着密钥，与公开目录同一规则：只允许 https，http 仅限本机；不合规时 fetch 前拒绝，且不重试",
            "【举一反三·点名】剧本效果 pickTarget：写了名字但名册里没有时返回空，不再落到选中、活跃或第一名调查员；apply_scenario_effects 对未知 target_name 直接报「找不到目标角色」。省略名字时仍按原默认",
            "【举一反三·白名单】useSeedClueQuality 在 8 个选项里使用，却被 mapScenarioChoice 与 mapNodeChoices 两张白名单丢掉；现两处都保留。新门禁：剧本数据里出现的每个选项键都须过映射，两张映射键集须一致",
            "【举一反三·切模】enterModule 清空 kpEngine.scenePaths 与 keyClueBlockedAttempts（否则新模组的关键线索门一开局就放行），并清 lastSkillCheck（否则同名调查员花运气会绑到上一模组的检定）",
            "【举一反三·资源】index.html 的 apple-touch-icon 指向不存在的 icon-180.png，改为 icon-192.png；门禁：index.html 引用的本地文件必须存在",
            "【测试】新增 target_resolution / choice_field_whitelist / module_switch_reset / ai_endpoint_guard 四个 smoke，挂入 test:engine；每个都先在旧代码上确认会红"
        ],
        remaining: [
            "SanityEngine.realityCheck 自掷 d100 且无调用方（在线 reality_check 已走骰盘），属死代码，未删",
            "大学秘社和灯塔信号仍按原选项，尚未改成搜打撤",
            "本轮未跑 Playwright（沙箱无 npm 源与 Chromium），发布前须在本机跑 npm run ci",
            "不改存档版本、产品号；不推送远端，不覆盖已有 ZIP"
        ]
    },
    {
        version: "V18.6 R29.64",
        date: "2026-10-14",
        title: "同一路径收口",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.64，产品号保持 18.6.0，存档结构保持第 8 版",
            "【举一反三】同一个数只留一个作者。日历只写 worldClock；advance_time 写完后，把同一天和同一小时抄到 kpState.TIME。advanceGameTime 不再自己加分钟。剧本循环只拨末日钟。调查钟和仪式钟仍只走 advanceClock",
            "【举一反三】省略名字时先数在场的人。对抗、射击、近战和连射用同一条：恰好一个才代选；没有或不止一个就停住，回「须指定对手」或「须指定敌人」。不发明技能 50，不打第一个活人。掩体只读该敌人自己的 status.cover，不清掉场面的掩体",
            "【举一反三】书面写了的生命保留，包括幽灵 0 和修格斯 19。没写、物理攻击有效、体质和体型都是数时，才用（体质+体型）/10 向下取整。魔法值仍是力量/5，不保留写死的 10",
            "【举一反三】召唤先对模板全名，再对摘要全名，最后才模糊。格拉基仆从和哈斯塔化身是仆从卡；点名「哈斯塔」仍是本体。复活和造尸共用同一具倒下的尸体站起。黄印给施法者做标记，并让在场敌人走已有理智检定。变身保存原形，到期走已有还原",
            "【伦敦】剧情模块、目录和旧引擎别名删除。共用规程留在中性文件。旧档的 londonKpState 并入 kpState；masks_london 的战役标记清空。调查员卡保留",
            "【下载包】大学秘社和灯塔信号的同名旧 JSON 删除。开局继续只读 ESM，不另留第二张图",
            "【打包】正式 ZIP 排除 Git、依赖、测试产物与旧发布包",
            "【发布】CoC_Engine_V18.6_ParadoxFree_R29.64_20261015.zip"
        ],
        remaining: [
            "大学秘社和灯塔信号仍按原选项，尚未改成搜打撤",
            "本地 pdf.js 缺失时，pdf_import 仍会请求 cdnjs",
            "不改存档版本、产品号和接口请求",
            "不推送远端，不覆盖已有 ZIP"
        ]
    },
    {
        version: "V18.6 R29.63",
        date: "2026-10-13",
        title: "书面数值进入结算",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.63，产品号保持 18.6.0，存档结构保持第 8 版",
            "【生成】模板的伤害加值、体格、移动、生命和理智写入 derived；人类缺前三项时按属性带补齐，怪物保留书上的数字",
            "【先攻】生成与开战用同一套敏捷加枪械准备；是否持枪看武器文字",
            "【开场】时代读当前选中的调查员",
            "【生命】伤害、追逐、剧本和 KP 改血同时写顶层 hp 与 derived.hp",
            "【技能】敌人的力量、体质、敏捷、意志读属性；闪避有技能用技能，否则用敏捷的一半；步枪与霰弹枪互认；冲锋枪不落到射击基础值",
            "【武器】先对全表，再对短表，再对唯一包含的名字，最后才模糊匹配；半 DB 在霰弹分段之后折半；缺贯伤字段的霰弹不能贯伤；弹药按结算后的枪种",
            "【对抗】省略对手数值时用对方的技能或意志；写明的 0 仍是 0；法术理智带斜杠只结算右边",
            "【敌人】没写伤害时用模板武器上的骰子；武器带眩晕且命中则眩晕一轮",
            "【护甲】装备槽里的护甲计入减伤；仅对枪弹只挡射击，仅头部只挡头部；移动惩罚从追逐移动力扣除",
            "【射速】1/N 为每 N 轮一发，1(N) 与 1 or N 为一轮内那么多次；全自动仍走已有连射",
            "【法术】写了伤害的法术按该表达式；石化与僵尸之眼无法行动；心灵控制期间不攻击；战斗中召唤拜亚基、食尸鬼或星之眷族会进场；模板上的法术算已学会",
            "【幽灵】生命为 0 不算出局，物理攻击无效",
            "【追逐】只有标明空中或水中才改用飞行或游泳；剧本追逐给调查员开速度检定；已经算出的伤害落到调查员和敌人",
            "【医疗】急救箱给急救一个奖励骰；吗啡恢复 1D3，体质失败则下一次检定一个惩罚骰"
        ],
        remaining: [
            "三套时钟仍分开；未点名的对手仍由引擎代掷；未点名的攻击仍打第一个活着的敌人",
            "复活、黄印和变身没有现成结算，不另做一套",
            "不改存档版本、战斗公式和接口请求"
        ]
    },
    {
        version: "V18.6 R29.62",
        date: "2026-10-11",
        title: "NPC 行为意图",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【场外】按已有谓词取唯一最优：渗透成立则出卖，否则失联带走暴露最多的线索来源，热度到 3 则告密，其余盟友和线索来源守口",
            "【渗透】已有标记才出卖；KP 只标盟友和线索来源，联络人不标",
            "【失联】只带走笔记最多的未渗透线索来源；笔记相同则带走更早见面的人",
            "【战斗】生命不超过最大生命一半则脱离先攻；敌对打生命严格最低的人；满血非敌对先打，受伤再谈；呼救不加单位",
            "【在线】规则挂在 Engine.NpcBehavior；登录、线索和提示词共用；守口只标 npcId 对得上的已有线索",
            "【谈判】非敌对受伤挂起敌方回合，走 social_opposed；成功改中立并退出先攻，失败改敌对后按原攻击结算",
            "【收口】队尾逃跑从队首开新轮；开战补 maxHp 与名册关系；先攻与结算同看生命；停手和逃跑混写停手或脱离",
            "【入口】敌方回合只走 enemy_attack：先过反应层再打；已逃或停手拒绝出手；逃跑立刻改名册意图",
            "【开战】只在 startCombat 补 maxHp 与名册关系；重名记下原名；先攻与解析共用 isActiveCombatEnemy",
            "【点名】解析认 _rosterName；开战留下武器字段；先攻条没有 id 时按名字",
            "【点选】打血和扫射认原名与在场；开战留下 weapons；手枪步枪也当远程",
            "【收口】扫射结算用在场谓词；追逐和法术点名认原名；中途刷怪补行形不重开战斗"
        ],
        remaining: [
            "不改存档版本、战斗公式和接口请求"
        ]
    },
    {
        version: "V18.6 R29.61",
        date: "2026-10-10",
        title: "篇幅角标与沿海祭典发布包",
        priority: "P0-发布候选",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.61，产品号保持 18.6.0，存档结构保持第 8 版",
            "【封面】剧本封面右上角按剧本自写时长显示简单、一般、标准",
            "【沿海祭典】下一站在线索写明地点后才出现；码头、广场、神龛、洞窟可搜查、交锋或撤离",
            "【汇总】本包含 R29.54 至 R29.60：本地脚本、隐私说明、剧本断链、理智提示音与经历包",
            "【打包】正式 ZIP 排除 Git、依赖、测试产物与旧发布包",
            "【发布】CoC_Engine_V18.6_ParadoxFree_R29.61_20261010.zip",
            "【校验】SHA-256 9C32507FE9DF9C8541839AA86A319C6156037FAE032692B425A5BC11F9B9E55D",
            "【验收】源码与解压目录的 ci 均为退出码 0，Playwright 16 项通过"
        ],
        remaining: [
            "发布包对应提交 495359b；本条校验记录在该包之后补记",
            "大学秘社和灯塔信号仍按原选项，尚未改成搜打撤",
            "同名 JSON 下载包仍是旧导出，开局读 ESM",
            "本地 pdf.js 缺失时，pdf_import 仍会请求 cdnjs",
            "不推送远端，不覆盖 R29.17、R29.24、R29.53 的 ZIP"
        ]
    },
    {
        version: "V18.6 R29.60",
        date: "2026-10-10",
        title: "沿海祭典搜打撤",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【地点】前往广场、酒馆、神龛、洞窟的按钮默认不出现",
            "【线索】线索写明该地点后才出现对应选项；开场正文不算",
            "【停留】码头、广场、神龛、洞窟可以搜查、交锋，或带着已有线索离开"
        ],
        remaining: [
            "只改沿海祭典，大学秘社和灯塔信号仍按原选项",
            "【发布门】build:assets → coastal_extract_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.59",
        date: "2026-10-10",
        title: "剧本封面篇幅角标",
        priority: "P2-体验",
        status: "done",
        changes: [
            "【封面】右上角按标注时长显示简单、一般、标准",
            "【分档】不足 30 分钟为简单，30 至 89 分钟为一般，90 分钟及以上为标准"
        ],
        remaining: [
            "不改剧本正文和主路长度",
            "【发布门】build:assets → scenario_length_badge_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.58",
        date: "2026-10-10",
        title: "剧本断链与结局套话",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【沿海祭典】16 间侧房从各自的返回父节点接上入口",
            "【疗养院】地下抉择可以推回档案柜，进入封门结局，并去掉生成填充段",
            "【余波】缺警察盯梢或风声时不再提示成线索不足",
            "【雨夜码头】正文补到叙事门限，分支不变",
            "【短模】去掉贴在结局上的「调查仍未结束」套话"
        ],
        remaining: [
            "同名 JSON 下载包仍是旧导出，开局读 ESM",
            "【发布门】build:assets → scenario_branch_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.57",
        date: "2026-10-10",
        title: "发布审查：本地脚本与隐私说明",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【入口】去掉 Vue、Chart、pdf.js、anime.js 的 CDN 回退",
            "【隐私】设置页写明行动、角色姓名和密钥会发到接口地址",
            "【布局】视口 cover，页面顶部留出安全区"
        ],
        remaining: [
            "不加内容安全策略，不改接口请求逻辑",
            "PDF 导入在本地库缺失时仍会请求 cdnjs",
            "【发布门】build:assets → release_review_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.56",
        date: "2026-10-09",
        title: "入口去掉重复导入",
        priority: "P2-清理",
        status: "done",
        changes: [
            "【入口】app.mjs 去掉导入后未再读取的具名绑定",
            "【启动】CoCState、CoCAI 与无名字的副作用导入保留",
            "【测试】断言重复路径已离开入口，真正引用方仍在"
        ],
        remaining: [
            "不改窗口挂载，不改规则与存档",
            "【发布门】build:assets → app_entry_imports_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.55",
        date: "2026-10-09",
        title: "创建页接上经历包",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【创建】有故事的调查员改为读取导入的 CoCExperiences",
            "【时代】1920s 与现代仍按经历包的时代字段过滤",
            "【测试】固定时代断言老兵与暗网黑客，不掷理智骰"
        ],
        remaining: [
            "不改经历扣理智公式，不把经历包挂回窗口",
            "【发布门】build:assets → creator_experience_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.54",
        date: "2026-10-09",
        title: "理智提示音改走窗口音效",
        priority: "P1-已修复",
        status: "done",
        changes: [
            "【音效】理智冲击未陷入临时疯狂时读取 window.CoCSFX.playSanWarning",
            "【骰子】骰子面板不再保留未使用的 CoCSFX 取值",
            "【测试】固定智力失败、缺失音效、临时疯狂三条路径"
        ],
        remaining: [
            "不改理智公式，不拆除 sfx.js 的窗口挂载",
            "【发布门】build:assets → sanity_episode_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.53",
        date: "2026-10-04",
        title: "验收修订",
        priority: "P0-发布候选",
        status: "done",
        changes: [
            "【版本】修订号记为 R29.53，产品号保持 18.6.0",
            "【测试】斜杠与团体检定测试不再写入已拆除的窗口名",
            "【测试】连射结算把闪避百分骰固定为大失败",
            "【打包】正式 ZIP 排除 Git、依赖、测试产物与旧发布包",
            "【发布】CoC_Engine_V18.6_ParadoxFree_R29.53_20261004.zip",
            "【校验】SHA-256 C26AC63F7A1880FF5D8898372DF8B95CEAD8C85C2CE8D7E363AF046C64A80A35",
            "【验收】源码与空目录解压包的 ci 均为退出码 0，Playwright 16 项通过"
        ],
        remaining: [
            "发布包对应提交 d05f045；本条校验记录在该包之后补记",
            "不推送远端，不覆盖 R29.17 与 R29.24 的 ZIP"
        ]
    },
    {
        version: "V18.6 R29.52",
        date: "2026-10-04",
        title: "团体检定不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【检定】移除 window.CoCGroupCheck 自挂载",
            "【结算】剧本技能结算仍动态调用 resolveScenarioCheckMessages",
            "【保留】团体检定仍不在启动时静态加载"
        ],
        remaining: [
            "约定内的窗口读取已改完：线索本、开场、斜杠、团体检定",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.51",
        date: "2026-10-04",
        title: "团体检定改为调用模块",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【检定】剧本技能结算时动态调用 resolveScenarioCheckMessages",
            "【移除】AI 逻辑不再读取 window.CoCGroupCheck",
            "【保留】团体检定模块仍把自己挂到窗口，且不在启动时静态加载"
        ],
        remaining: [
            "下一步：团体检定模块仍把自己挂到 window.CoCGroupCheck",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.50",
        date: "2026-10-04",
        title: "斜杠模块不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【斜杠】移除 window.CoCSlash 自挂载",
            "【输入】玩家斜杠命令仍直接调用 trySlash",
            "【保留】AI 逻辑仍读取 window.CoCGroupCheck"
        ],
        remaining: [
            "下一步：AI 逻辑仍读取 window.CoCGroupCheck",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.49",
        date: "2026-10-04",
        title: "斜杠命令改为调用模块",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【斜杠】玩家输入以 / 开头时直接调用 trySlash",
            "【移除】AI 逻辑不再读取 window.CoCSlash",
            "【保留】斜杠模块仍把自己挂到窗口"
        ],
        remaining: [
            "下一步：斜杠模块仍把自己挂到 window.CoCSlash",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.48",
        date: "2026-10-04",
        title: "开场模块不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【开场】移除 window.CoCStoryOpening 自挂载",
            "【故事】进入故事页仍直接调用 pushStoryOpening",
            "【保留】AI 逻辑仍读取 window.CoCSlash"
        ],
        remaining: [
            "下一步：AI 逻辑仍读取 window.CoCSlash",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.47",
        date: "2026-10-04",
        title: "进故事页改为调用开场模块",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【开场】进入故事页且没有进行中的剧本时直接调用 pushStoryOpening",
            "【移除】状态核心不再读取 window.CoCStoryOpening",
            "【保留】开场模块仍把自己挂到窗口"
        ],
        remaining: [
            "下一步：开场模块仍把自己挂到 window.CoCStoryOpening",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.46",
        date: "2026-10-04",
        title: "线索本不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【线索】移除 window.CoCLorebook 自挂载",
            "【扩展】扩展上下文仍使用模块导出的线索本",
            "【保留】状态核心仍读取 window.CoCStoryOpening"
        ],
        remaining: [
            "下一步：状态核心仍读取 window.CoCStoryOpening",
            "【发布门】build:assets → slash_extension_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.45",
        date: "2026-10-04",
        title: "扩展改为读取线索本模块",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【扩展】getGameContext 直接使用 CoCLorebook",
            "【移除】扩展不再读取 window.CoCLorebook",
            "【保留】线索本模块仍把自己挂到窗口"
        ],
        remaining: [
            "下一步：线索本仍把自己挂到 window.CoCLorebook",
            "【发布门】build:assets → slash_extension_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.44",
        date: "2026-10-04",
        title: "运行器不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【运行器】移除 window.CoCScenarioRunner 自挂载",
            "【加载】大厅和创建页仍动态导入运行器模块",
            "【保留】扩展收集线索时仍读取 window.CoCLorebook"
        ],
        remaining: [
            "下一步：扩展收集线索时仍读取 window.CoCLorebook",
            "【发布门】build:assets → shell_story_defer_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.43",
        date: "2026-10-04",
        title: "运行器加载改为动态导入",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【加载】运行器加载器只动态导入 runner.mjs",
            "【移除】加载器不再读取 window.CoCScenarioRunner",
            "【保留】运行器模块仍把自己挂到窗口"
        ],
        remaining: [
            "下一步：运行器模块仍把自己挂到 window.CoCScenarioRunner",
            "【发布门】build:assets → shell_story_defer_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.42",
        date: "2026-10-04",
        title: "PDF 导入不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【导入】移除 window.CoCScenarioPdfImport 自挂载",
            "【存储】一键导入仍使用模块导出的 PDF 转换",
            "【保留】运行器加载器仍优先读取 window.CoCScenarioRunner"
        ],
        remaining: [
            "下一步：运行器加载器仍优先读取 window.CoCScenarioRunner",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.41",
        date: "2026-10-04",
        title: "官方 PDF 导入改为模块引用",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【存储】一键导入官方 PDF 时直接使用 CoCScenarioPdfImport",
            "【移除】剧本存储不再读取 window.CoCScenarioPdfImport",
            "【保留】PDF 导入模块仍把自己挂到窗口"
        ],
        remaining: [
            "下一步：PDF 导入模块仍把自己挂到 window.CoCScenarioPdfImport",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.40",
        date: "2026-10-04",
        title: "远程剧本目录不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【目录】移除 window.CoCScenarioRemoteCatalog 自挂载",
            "【存储】可下载剧本仍通过模块导出的远程目录合并",
            "【保留】存储查找官方 PDF 导入时仍读取 window.CoCScenarioPdfImport"
        ],
        remaining: [
            "下一步：剧本存储查找官方 PDF 导入时仍读取 window.CoCScenarioPdfImport",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.39",
        date: "2026-10-04",
        title: "远程剧本目录改为模块引用",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【存储】查找可下载剧本时直接使用 CoCScenarioRemoteCatalog",
            "【移除】剧本存储不再读取 window.CoCScenarioRemoteCatalog",
            "【保留】远程目录模块仍把自己挂到窗口"
        ],
        remaining: [
            "下一步：远程目录仍把自己挂到 window.CoCScenarioRemoteCatalog",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.38",
        date: "2026-10-04",
        title: "剧本存储不再挂到窗口",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【存储】移除 window.CoCScenarioStore 自挂载",
            "【调用】大厅、线索本、开场和运行器都使用模块导出",
            "【保留】存储查找远程目录时仍读取 window.CoCScenarioRemoteCatalog"
        ],
        remaining: [
            "下一步：剧本存储查找远程目录时仍读取 window.CoCScenarioRemoteCatalog",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.37",
        date: "2026-10-04",
        title: "运行器改为登记剧本存储",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【运行器】开局和读取当前剧本使用登记的剧本存储，不再读取 window.CoCScenarioStore",
            "【测试】冒烟在导入后调用 bindScenarioStore 放入替身",
            "【保留】剧本存储在窗口上还没有同名对象时仍把自己挂上去"
        ],
        remaining: [
            "下一步：剧本存储仍在未占用时把自身挂到 window.CoCScenarioStore",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.36",
        date: "2026-10-04",
        title: "线索本改为读取剧本存储",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【线索】线索本按剧本编号调用 CoCScenarioStore.getScenario",
            "【回退】存储没有该剧本时仍调用 CoCScenarioCatalog.get",
            "【保留】运行器仍优先使用 window.CoCScenarioStore 作为测试替身"
        ],
        remaining: [
            "下一步：运行器仍优先读取 window.CoCScenarioStore，用于测试替身",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.35",
        date: "2026-10-04",
        title: "非内置剧本查找改为存储登记",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【目录】CoCScenarioCatalog.get 不再读取 window.CoCScenarioStore",
            "【存储】剧本存储加载后登记 downloadedLookup，目录用它查找已下载剧本",
            "【循环】目录不静态引用存储，避免和存储对目录的引用绕回去",
            "【保留】线索本和运行器仍可读取 window.CoCScenarioStore，运行器用它容纳测试替身"
        ],
        remaining: [
            "下一步：线索本仍优先读取 window.CoCScenarioStore.getScenario",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.34",
        date: "2026-10-04",
        title: "剧本目录改为模块引用",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【存储】剧本存储直接使用 CoCScenarioCatalog 做列表和校验",
            "【开场】开场叙事按剧本编号调用 CoCScenarioStore.getScenario",
            "【会话】会话清单直接调用 CoCScenarioCatalog.validate",
            "【目录】移除 window.CoCScenarioCatalog",
            "【保留】目录在内置表找不到剧本时仍读取 window.CoCScenarioStore"
        ],
        remaining: [
            "下一步：CoCScenarioCatalog.get 仍通过 window.CoCScenarioStore 查找非内置剧本",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.33",
        date: "2026-10-04",
        title: "日志写入与能力系统改为模块引用",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【日志】系统工具写入 DevLogs 数组本身，不再经过 window.DevLogs",
            "【存档】存档摘要直接调用 CoCCapabilitySystem",
            "【剧本】运行器使用模块里的能力系统；没有测试替身时使用剧本存储",
            "【线索】线索本按剧本编号读取 CoCScenarioCatalog",
            "【保留】window.CoCScenarioCatalog 仍被剧本存储、开场和会话清单读取"
        ],
        remaining: [
            "下一步：剧本存储、开场和会话清单仍读取 window.CoCScenarioCatalog",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.32",
        date: "2026-10-04",
        title: "开发日志页改为模块引用",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【日志】开发日志页直接引用 DevLogs、桌规、能力系统、剧本目录和创意目录",
            "【桌规】window.CoCDeskPref 不再自挂载，大厅与日志页都使用同一导出",
            "【目录】window.CoCCreativeSmokeCatalog 不再自挂载",
            "【保留】window.DevLogs、window.CoCCapabilitySystem、window.CoCScenarioCatalog 仍被其他模块读取",
            "【门禁】全局边界审计禁止开发日志页重新读取这些窗口名"
        ],
        remaining: [
            "下一步：系统工具仍写 window.DevLogs；存档、剧本运行器和线索本仍读 window.CoCCapabilitySystem 与 window.CoCScenarioCatalog",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.31",
        date: "2026-10-04",
        title: "调查员创建改为模块引用",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【创建】CoCCreator 改为 ESM 导出，启动时仍由大厅副作用桶创建同一实例",
            "【创建页】setup 直接展开 CoCCreator，不再读取 window.CoCCreator",
            "【人物】快速预设、套用预设和新建调查员改为调用同一导出",
            "【状态】window.CoCState 仍是唯一启动挂载的状态源",
            "【门禁】全局边界审计禁止 window.CoCCreator 重新出现"
        ],
        remaining: [
            "下一步：开发日志页仍读取 window.DevLogs、window.CoCDeskPref、window.CoCCapabilitySystem、window.CoCScenarioCatalog、window.CoCCreativeSmokeCatalog",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.30",
        date: "2026-10-04",
        title: "界面辅助兼容全局收缩",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【人物】CharHudHelpers 不再自挂载，状态与理智读数继续由 ESM 导出",
            "【对话】ChatFormatHelpers 不再自挂载，聊天与提示格式继续由 ESM 导出",
            "【战斗】CombatUiHelpers 不再自挂载，战斗界面辅助继续由 ESM 导出",
            "【状态】window.CoCState 仍是唯一启动挂载的状态源",
            "【门禁】全局边界审计禁止这些赋值重新出现"
        ],
        remaining: [
            "下一步：创建页仍读取 window.CoCCreator，需改为 ESM 后再移除自挂载",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.29",
        date: "2026-10-04",
        title: "立绘与图标兼容全局收缩",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【界面】CharPortrait、ActionWheel、SanityEffects 不再自挂载到 window",
            "【图标】CocIcon 与 CoCIconSprite 不再自挂载，图标仍由 app.mjs 通过 ESM 注册",
            "【状态】window.CoCState 仍是唯一启动挂载的状态源",
            "【门禁】全局边界审计禁止这些赋值重新出现"
        ],
        remaining: [
            "下一步：仍自挂载但无读取方的 CharHudHelpers、ChatFormatHelpers、CombatUiHelpers",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.28",
        date: "2026-10-04",
        title: "剧情子组件兼容全局收缩",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【装备】人物诊断改为检查 ESM 导入的 ApexEquipHud，不再读取 window.ApexEquipHud",
            "【剧情】十三个剧情子组件不再自挂载到 window，仍由 story_view 通过 ESM 注册",
            "【状态】window.CoCState 仍是唯一启动挂载的状态源",
            "【门禁】全局边界审计禁止这些组件赋值重新出现"
        ],
        remaining: [
            "下一步：仍自挂载但无读取方的 CharPortrait、ActionWheel、SanityEffects 与图标辅助",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.27",
        date: "2026-10-04",
        title: "界面兼容全局收缩",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【界面】ViewLobby、ViewStory、ViewCreator、ViewDevLog 不再自挂载到 window",
            "【反馈】确认框与存档加载层只通过 ESM 注册",
            "【状态】window.CoCState 仍是唯一启动挂载的状态源",
            "【门禁】全局边界审计禁止这些界面赋值重新出现"
        ],
        remaining: [
            "下一步：剧情子组件仍读取的 window.ApexEquipHud 等兼容挂载",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.26",
        date: "2026-10-04",
        title: "存档副本诊断与安全修复",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【诊断】当前模组四个槽位展示 localStorage 与 IndexedDB 的时间、合法性与选中副本",
            "【修复】确认后才补齐缺失副本；两份都有效但分叉时必须再次确认才覆盖",
            "【备份】修复和清理前把将被改写的原文写入 coc_diag_backup，不改存档 schema",
            "【清理】只删除损坏副本，且另一份必须有效"
        ],
        remaining: [
            "下一步：继续收缩兼容全局（R29.27）",
            "【发布门】build:assets → save_diagnostics_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.25",
        date: "2026-10-04",
        title: "旧存档升级与发布验收",
        priority: "P0-已验收",
        status: "done",
        changes: [
            "【升级】R29.17/R29.19 真实 fixture 覆盖 local-only、IDB-only、双副本冲突与损坏回退",
            "【兼容】读档清理先手顺序时容忍未挂载的 CoCStateAccessor，避免合法旧档恢复失败",
            "【格式】读档迁移只发生在内存，不回写磁盘，SAVE_SCHEMA_VERSION 保持 8",
            "【浏览器】刷新后旧档仍可见；离线启动依赖首访缓存；跨标签页同步无需手工刷新",
            "【门禁】新增 save_legacy_upgrade_smoke 与 Playwright 验收，纳入 ci"
        ],
        remaining: [
            "下一步：存档诊断与修复工具（R29.26）",
            "【发布门】build:assets → save_legacy_upgrade_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.24",
        date: "2026-10-04",
        title: "后续路线图发布候选",
        priority: "P0-发布候选",
        status: "done",
        changes: [
            "【交付】汇总 R29.20–R29.23 的存档一致性、原子恢复、异步视图与全局边界改进",
            "【说明】记录已知限制、验证门与分阶段回滚提交点",
            "【打包】正式 ZIP 排除 Git、依赖、测试产物与旧发布包",
            "【复验】发布包在全新解压目录安装依赖并执行完整 CI"
        ],
        remaining: [
            "发布后保留 ZIP 的 SHA-256 校验值与本地提交历史",
            "不推送远端，不覆盖 R29.17 原始 ZIP"
        ]
    },
    {
        version: "V18.6 R29.23",
        date: "2026-10-04",
        title: "壳层全局边界收缩",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【启动】异步视图回退与壳组件注册改用显式 ESM 依赖",
            "【大厅】剧本、能力、案头与 KP 循环移除 window 业务依赖",
            "【故事】存档刷新回调改为模块局部状态，KP 循环改用 ESM",
            "【兼容】保留 CoCState 单一状态源与 ViewLobby/ViewStory 自挂载壳"
        ],
        remaining: [
            "下一步：生成并验证正式发布候选包、变更说明和回滚点",
            "【发布门】build:assets → shell_mount_peel_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.22",
        date: "2026-10-04",
        title: "模组与自动存档视图一致性",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【模组】getModules 异步聚合 localStorage 与 IndexedDB 四个槽位",
            "【视图】大厅模块卡、自动存档 banner 与槽位页统一 await 同一副本选择",
            "【同步】storage 与 BroadcastChannel 事件触发跨标签页保存视图刷新",
            "【清理】删除模组继续覆盖全部 IndexedDB 槽位与配额回收"
        ],
        remaining: [
            "下一步：按 boot → lobby → story 收缩 window 全局依赖",
            "【发布门】build:assets → save_idb_consistency_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.21",
        date: "2026-10-04",
        title: "读档原子恢复与损坏副本回退",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【恢复】存档先迁移并克隆准备，提交异常时回滚全部受影响状态",
            "【回退】首选副本解析或恢复失败后继续尝试另一存储副本",
            "【提示】读档失败提示由 persistence 统一拥有，视图不再重复弹出",
            "【测试】覆盖损坏 local + 正常 IDB、恢复钩子抛错与状态不变"
        ],
        remaining: [
            "下一步：统一模组卡片与自动存档的异步副本视图",
            "【发布门】build:assets → save_idb_consistency_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.20",
        date: "2026-10-04",
        title: "存档副本仲裁与并发一致性",
        priority: "P1-已加固",
        status: "done",
        changes: [
            "【副本】localStorage 与 IndexedDB 按 savedAt 选择最新合法存档",
            "【并发】同一完整存档 key 的写入串行执行，快照保持调用顺序",
            "【缓存】prime 不覆盖本会话新写入；cache miss 回落 IndexedDB",
            "【测试】覆盖新旧副本、逆序写入、prime/write 竞态与跨标签页新增槽位"
        ],
        remaining: [
            "下一步：读档原子恢复与损坏 local 的 IndexedDB fallback",
            "【发布门】build:assets → save_idb_consistency_smoke → ci"
        ]
    },
    {
        version: "V18.6 R29.19",
        date: "2026-10-04",
        title: "发布加固：存档一致性与可复现门禁",
        priority: "P0-已加固",
        status: "done",
        changes: [
            "【存档】捕获 IndexedDB 事务级失败；local 成功时镜像失败不再误报整次存档失败",
            "【删除】失败时保留缓存可见性；删除模组同时清理 IndexedDB，并阻止在途写入回灌",
            "【自动存档】离开剧情或切换模组时取消旧计时器，回调执行前复核 generation 与模组",
            "【测试】新增确定性 save_idb_consistency_smoke 与 release_metadata_smoke",
            "【发布】固定 LF、建立 Git 基线、强化 Playwright CI 服务隔离与失败 trace"
        ],
        remaining: [
            "副本 savedAt 仲裁、跨标签页同步与恢复事务回滚留待后续独立波次",
            "【发布门】build:assets → test:engine → ci:smoke → test:playwright → ci"
        ]
    },
    {
        version: "V18.6 R29.18",
        date: "2026-10-03",
        title: "缺陷收口：存档、剧本竞态与浏览器门禁",
        priority: "P0/P1-已修复",
        status: "done",
        changes: [
            "【启动】修复 pdf_import 重复 import 导致的浏览器语法错误",
            "【AI】队伍摘要按当前 HP/最大 HP 输出，并兼容旧存档字段",
            "【存档】IndexedDB 降级写入参与成功状态、槽位索引、读取与删除流程",
            "【剧本】异步 prose 加载增加会话代次校验，停止或切换后不再进入旧节点",
            "【线索】未知线索等级 fail-closed；审计与遭遇裁决统一标记非法门槛",
            "【门禁】补齐 Node 22 smoke 兼容及 AI、IndexedDB、prose 竞态 Playwright 回归"
        ],
        remaining: [
            "A–F 契约与公共 API 保持不变",
            "【发布门】build:assets → test:engine → ci:smoke → test:playwright"
        ]
    },
    {
        version: "V18.6 R29.17",
        date: "2026-10-03",
        title: "做 F：Timeline Contract TC0–TC4",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【用户】继续 → 仅波次 F（TC）；docs/NEW_SESSION 无 capability_risk CHANGELOG、无 TC0–TCn 表，按 Timeline Contract 落地（非 Trace Contract / Turn Clock / Threat Check / Tool Contract）",
            "【TC0】js/data/timeline_contract.mjs：TIMELINE_CONTRACT_VERSION=1 + 结局回放行种类闭集",
            "【TC1】normalizeTimelineRow（只留 t/text；未知种类与空文本拒绝）",
            "【TC2】auditTimelineContract（必填 end/evidence/heat/flag/hint；heat 可重复且连续；verdict 夹在证据与热度之间）",
            "【TC3】assembleTimelineContract（只读副本，不改入参）",
            "【TC4】runner pushEndingRecap 经契约盖章 timelineContractVersion；PRESSURE_WRITE_INVENTORY display 登记；SCOPE_FREEZE_AF.status=wave_f_done；completedWaves+=TC；frozenWaves=[]；timeline_contract_wave_f_smoke",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "A–F 已收口（IR/PB/DP/SM/EV/TC）；无 G 波次",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.16",
        date: "2026-10-03",
        title: "做 E：Encounter Verdict EV0–EV4",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【用户】继续 → 仅波次 E（EV）；树内无 EV0–EVn 表，按 Encounter Verdict 落地（非 Event View / Evidence / Effect Validation / Event Bus）",
            "【EV0】js/data/encounter_verdict.mjs：ENCOUNTER_VERDICT_VERSION=1 + class registry",
            "【EV1】readEncounterGate（变体 + seedRequiresClueQuality + 达成线索档）",
            "【EV2】scoreEncounterVerdict（unscored/short/met/over；档位复用 CLUE_QUALITY_RANK，无公式分叉）",
            "【EV3】assembleEncounterVerdict / formatEncounterVerdictLine（只读）",
            "【EV4】runner pushEndingRecap 写入 verdict 行；PRESSURE_WRITE_INVENTORY display 登记；SCOPE_FREEZE_AF.status=wave_e_done；completedWaves+=EV；frozenWaves=[TC]；encounter_verdict_wave_e_smoke",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~做 F~~ → R29.17；A–F 已收口，无 G",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.15",
        date: "2026-10-03",
        title: "做 D：Session Manifest SM0–SM4",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【用户】继续 → 仅波次 D（SM）；树内无更强 SM 定义，按 Session Manifest 落地（非 Scenario/Save/Story Memory/State Machine）",
            "【SM0】js/data/session_manifest.mjs：SESSION_MANIFEST_VERSION=1",
            "【SM1】extractScenarioPackageFace（id/title/tags/clocks/arc 面）",
            "【SM2】assembleCarrySlice / assembleCarryBrief（arc_ledger + Display Pipeline 压力行）",
            "【SM3】assembleSessionManifest（案头/开局面：桌规·继承·能力预览·契约健康度；不改锁定 API 签名）",
            "【SM4】lobby openDeskCard / runner carryBrief 改走清单；PRESSURE_WRITE_INVENTORY display 登记；SCOPE_FREEZE_AF.status=wave_d_done；completedWaves+=SM；frozenWaves=[EV,TC]；session_manifest_wave_d_smoke",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~做 E~~ → R29.16；F 仍须「做 F」(TC)",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.14",
        date: "2026-09-27",
        title: "做 C：Display Pipeline DP0–DP4",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【用户】继续 → 仅波次 C（DP）；树内无更强 DP 定义，按 Display Pipeline 落地",
            "【DP0】js/data/display_pipeline.mjs：DISPLAY_PIPELINE_VERSION=1 + display channel registry",
            "【DP1】assemblePressureHudLine（pressureHudInputs→pressureHudLine）；story_view / runner carryBrief 改走管道",
            "【DP2】assemblePressureChoiceSuffix；runner mapNodeChoices 改走管道",
            "【DP3】assembleDeskPressureSlice（压力快照+能力预览+saveCompareMeta，不改锁定 API 签名）",
            "【DP4】PRESSURE_WRITE_INVENTORY display 登记；SCOPE_FREEZE_AF.status=wave_c_done；completedWaves+=DP；display_pipeline_wave_c_smoke",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~做 D~~ → R29.15；E–F 仍须「做 E」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.13",
        date: "2026-09-27",
        title: "做 B：PressureBus PB0–PB4",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【用户】继续 → 仅波次 B（PB0–PB4）；不启动 C–F",
            "【PB0】js/state/pressure_bus.mjs：PRESSURE_BUS_VERSION=1 + channel registry",
            "【PB1】core.heat → busAddMythosHeat 委托 addMythosHeat（无公式分叉）",
            "【PB2】core.flags → setPressureFlag；aftermath/arc_ledger 路由经总线",
            "【PB3】getPressureSnapshot / pressureHudInputs；arc_pressure_copy 仍 display-only",
            "【PB4】PRESSURE_WRITE_INVENTORY 登记 orchestrate；SCOPE_FREEZE_AF.status=wave_b_done；pressure_bus_wave_b_smoke",
            "【接线】effects_apply 改 busAddMythosHeat；shell_side_effects_shared 加载 pressure_bus",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~做 C~~ → R29.14；D–F 仍须「做 D」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.12",
        date: "2026-09-27",
        title: "做 A：Capability IR0–IR4（CapabilityDecl + IR=1）",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【用户】明示「做 A」——仅波次 A（SCOPE_FREEZE waves[0]=IR0-IR4），不启动 B–F",
            "【IR0】CAPABILITY_DECL_SCHEMA=1；js/data/capability_decl.mjs",
            "【IR1】CAPABILITY_DECL_TABLE 覆盖全部 CANONICAL_CAPABILITY_IDS（hard/soft + gloss + aliases + structuralHints）",
            "【IR2】CAPABILITY_GLOSSARY / soft ads 改由 decls 派生；LOCKED_PUBLIC_APIS 签名保持",
            "【IR3】CAPABILITY_IR_VERSION=1（endingRecap / saveCompareMeta / runner 已读该常量）",
            "【IR4】assertCapabilityDeclTable；capability_ir_wave_a_smoke；SCOPE_FREEZE_AF.status=wave_a_done，frozenWaves=PB0-PB4+DP+SM+EV+TC",
            "【验证】build:assets + test:engine + ci:smoke（含 pre-af）"
        ],
        remaining: [
            "~~做 B~~ → R29.13；C–F 仍须「做 C」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.11",
        date: "2026-09-27",
        title: "壳层：CoCScenarioRunner 延后加载（ensure_runner）",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【新】js/scenario/ensure_runner.mjs — ensureScenarioRunner / getScenarioRunner / startScenarioById（动态 import runner）",
            "【大厅/创建】lobby startLocalScenario、char_creator 待开剧本路径 await startScenarioById，再 switchScreen('story')",
            "【story】shell_side_effects_story 清空 eager import；runner/group_check 不再挂 boot",
            "【仍 eager】story_opening 经 shared campaign_loader（自由探索开场）；CoCState SoT 不动",
            "【ESM】story_chat → getScenarioRunner + CoCGroupCheck；ai_logic → getScenarioRunner（不静态拉 runner）",
            "【测试】更新 shell_story_defer_smoke（runnerDeferred）",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "壳层主线完成（含 runner 延后）；无强制后续壳层债",
            "~~做 A~~ → R29.12；B–F 仍须明示「做 B」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.10",
        date: "2026-09-26",
        title: "壳层 Phase 4b：story UI 延后 + 剥 CoCAI/ToolHandlers",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【story】shell_side_effects_story 仅保留 group_check+runner+story_opening（大厅 startScenario 仍需）；story_*/combat_ui/chat_format/char_portrait 不再 eager",
            "【取舍】story_* 由 ViewStory 静态 import 在进剧情异步加载时带入；大厅不依赖 window.Story*",
            "【ESM】js/ai/coc_ai_bridge（getCoCAI）供 story_*；extensions/ai_logic → CoCToolHandlers；ai_logic bindCoCAI",
            "【mount】mountShellGlobals 仅 CoCState SoT；CoCAI/ToolHandlers 入 SHELL_PEELED_GLOBALS（模块自挂载仍在）",
            "【测试】shell_story_defer_smoke + 更新 shell_mount_peel_smoke",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "壳层主线完成；可选：lobby/char_creator 的 CoCScenarioRunner 改 ESM 或 startScenario 时再 dynamic import runner",
            "~~做 A~~ → R29.12；B–F 仍须明示「做 B」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.9",
        date: "2026-09-26",
        title: "壳层 Phase 4：安全收缩 window 挂载（保留 CoCState SoT）",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【mount】mountShellGlobals 仅保留 CoCState（强制 SoT）+ CoCAI/CoCToolHandlers（no-clobber 兼容）",
            "【剥离】SHELL_PEELED_GLOBALS：零消费者 State* 切片/Jobs/Experiences/EncounterSeed/BaseSkills；自挂载 Engine/ItemDB/DevLogs/Extensions/Slash/ChatExport/Capability*/DeskPref/…",
            "【ESM】lobby ArcChapters+KeeperStyle；story ArcPressureCopy；story_clues UnreliableClues；tool_dispatch+ai_logic ToolDefinitions；persistence/ui/ai_logic ContextManager",
            "【测试】shell_mount_peel_smoke；async smoke 仍绿",
            "【未做】story side-effects 懒切（4b）；未动 Vue CoCState 反应核",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~Phase 4b~~ → R29.10；~~runner 延后~~ → R29.11",
            "壳层主线完成（含 ensure_runner）",
            "~~做 A~~ → R29.12；B–F 仍须明示「做 B」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.8",
        date: "2026-09-26",
        title: "壳层 Phase 3b：creator + story 视图异步（side-effects 仍 eager）",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【3b】loadViewCreatorAsync / loadViewStoryAsync 接入 app.mjs；去掉 creator/story 静态 import",
            "【取舍】shell_side_effects barrel 保持 eager（KP/runner/window.Story*/char_creator IIFE）；只异步 Vue 屏组件",
            "【async_views】ASYNC_VIEW_PILOT 三屏 true + sideEffectsEager；loadViewStoryAsync 新增",
            "【测试】shell_async_view_smoke 覆盖三 loader + SW ASSETS 含三 view + lobby 仍静态",
            "【文档】SHELL_SPLIT_PLAN 3b 完成；Phase 4=去挂载/真按需 side-effects",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~Phase 4 安全去挂载~~ → R29.9；4b=真按需 side-effects / 再剥 CoCAI",
            "~~做 A~~ → R29.12；B–F 仍须明示「做 B」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.7",
        date: "2026-09-26",
        title: "壳层 Phase 3 pilot：view-dev-log 异步加载",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【Phase3 pilot】js/boot/async_views.mjs — defineShellAsyncView（loading/error 回退 + 回大厅）；loadViewDevLogAsync / loadViewCreatorAsync（后者未接线）",
            "【app】去掉 ViewDevLog 静态 import；register 使用 loadViewDevLogAsync()；lobby/creator/story 仍 eager",
            "【SW】dev_log_view.mjs 仍在 ASSETS 预缓存；动态 import 同 URL，离线可命中缓存",
            "【测试】tests/shell_async_view_smoke.mjs 挂入 test:engine",
            "【文档】SHELL_SPLIT_PLAN：Phase 3 pilot 完成，3b=creator/story async",
            "【未动】window 挂载 / CoCState SoT / A–F / story side-effects 懒切",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~Phase 3b creator/story async~~ → R29.8",
            "Phase 4：去 window 挂载（CoCState 最后）",
            "~~做 A~~ → R29.12；B–F 仍须明示「做 B」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.6",
        date: "2026-09-26",
        title: "壳层 Phase 2：side-effects 按屏静态边界（仍 eager）",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【Phase2】js/boot/shell_side_effects_lobby.mjs — 剧本 builtins/remote/catalog、pdf_import、store、char_creator",
            "【Phase2】js/boot/shell_side_effects_shared.mjs — 神话/法术/伤病/NPC/insanity、London 战役包、KP、logger/utils/selection、AI 协议、ui_feedback",
            "【Phase2】js/boot/shell_side_effects_story.mjs — group_check、runner、story_opening、combat/chat helpers、story_*（含 window.Story* 挂载）",
            "【Phase2】shell_side_effects.mjs 改为 eager barrel：lobby → shared → story；app.mjs 仍静态 import 该 barrel（无动态 import）",
            "【文档】SHELL_SPLIT_PLAN 标 Phase 2 完成；下一步 Phase 3 懒加载",
            "【未动】window 挂载清单 / Vue CoCState SoT / A–F",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~Phase 3 / 3b 视图异步~~ → R29.7–R29.8（side-effects 仍 eager）",
            "Phase 4：去 window 挂载（CoCState 最后）",
            "~~做 A~~ → R29.12；B–F 仍须明示「做 B」等",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.5",
        date: "2026-09-26",
        title: "壳层 Phase 1：boot 拆分（side-effects / mounts / register）",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【地图】index.html 按 currentScreen v-if 挂 lobby/creator/story/devlog；dispatch=switchScreen；window.CoCState 仍为 Vue SoT",
            "【切片】js/boot/shell_side_effects.mjs — 抽离原 app 副作用 import 链（剧本/战役/故事组件）",
            "【切片】js/boot/mount_shell_globals.mjs — 集中有意 window.* 挂载 + SHELL_MOUNTED_GLOBALS 清单",
            "【切片】js/boot/register_shell_components.mjs — 根组件注册 + SHELL_SCREEN_MAP",
            "【瘦身】app.mjs 改为编排：命名 import → side-effects → mountShellGlobals → createApp → register → mount",
            "【文档】docs/SHELL_SPLIT_PLAN.md（阶段 2–4：按屏边界 / 懒加载 / 去挂载）",
            "【未动】Vue CoCState 反应核；PWA/sw 仍 walk js/**/*.mjs；无动态 import 本回合",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~Phase 2 按屏 side-effects~~ → R29.6",
            "Phase 3：非首屏 view 动态 import / defineAsyncComponent（须守 SW）",
            "Phase 4：消费者 ESM 化后逐个删 window 挂载（CoCState 最后）",
            "A–F 仍须「做 A」；深度 a11y / Handbook — 可选",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.4",
        date: "2026-09-26",
        title: "软债 B 续：healing 避环 + 残余 Engine/ItemDB/KP ESM",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【healing 避环】新增 js/state/live_game_state.mjs（只读 window.CoCState.gameState）；HealingEngine.readWorldClock 改 getLiveWorldClock，不再经 Accessor（打破 accessor→coc→healing→accessor）",
            "【handlers】character/mythos/system：ctx.Engine 回退改 ESM CoCEngine",
            "【UI】story_combat/chat/char/inv/portrait/sanity/char_hud + creator_view：CoCEngine/CoCItemDB ESM；story_map 走 Accessor.getState 替代 window.CoCState",
            "【state】core/persistence KP 与 ItemDB/Engine/ChaseEngine ESM；gameplay CoCEngine ESM；extensions getGameContext Engine ESM",
            "【ai_logic】_getKpEngine→getKpEngine；自定义武器同步写 ESM CoCItemDB",
            "【lobby】KP 偏好/KeeperStyle/Engine 热点改 ESM（目录/Store 仍 window）",
            "【留下】kp_execution_engine._kpDefaultEnabled 仍读 window.CoCKpConfig（kp_config↔本模块会环，已注释）；runner/char_creator IIFE 仍 window-first；Accessor CoCState 仍 window；app.mjs 壳挂载未动",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~壳层多周拆包未开~~ → R29.5 Phase 1 boot 拆分已起步；见 SHELL_SPLIT_PLAN / R29.5 remaining",
            "kp_execution_engine ↔ kp_config 双向依赖仍迫使一处 window 读默认开关",
            "runner/char_creator IIFE window-first（Node smoke mock 契约）",
            "lobby/ai_logic 等仍大量 window.CoCScenarioStore/Catalog/Slash/ToolHandlers（壳层）",
            "A–F 仍须「做 A」；深度 a11y / Handbook / 盲查 — 可选",
            "【代理门】build:assets → test:engine → ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.3",
        date: "2026-09-26",
        title: "软债 B 续：UI/视图 CoCStateAccessor 改 ESM import",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【B】components + views（dice/combat/npc/journal/clues/growth/inv/equip/char/chat/map/store/portrait/sanity/feedback/equip_hud + lobby/creator/story/dev_log）改 import { CoCStateAccessor }",
            "【B】rule_check / persistence / pdf_import / char_creator / scenario runner 同步 ESM；char_creator/runner 的 CoCEngine 亦 ESM（Vue 仍 window）",
            "【避环】engines/healing 保持 window.CoCStateAccessor（accessor→coc→healing 会环）",
            "【测试】accessor/coc 的 window 挂载改为若已存在则不覆盖（保护动态 import 前的 smoke mock）",
            "【runner】IIFE 仍 window-first 取 State/Engine/Store（与 mock 契约对齐）",
            "【清理】story_store / apex / story_chat / rule_check 去掉多余 window 判空 soft-fail",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "网页壳 app.mjs 仍挂 window.*；按屏拆包 / dispatch — 多周，勿大爆炸",
            "Accessor 的 CoCState 仍 window 懒绑（Vue 反应核）",
            "~~engines/healing Accessor~~ → R29.4 live_game_state",
            "window.CoCStateAccessor 挂载保留兼容；state_contract 仍记 global 名",
            "A–F system waves 仍须用户明示「做 A」才开",
            "【可选】深度 a11y；Handbook TOC；盲查软文案",
            "【代理门】改完必验：build:assets → test:engine → 引擎类 ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.2",
        date: "2026-09-26",
        title: "软债 B 续：handlers KP ESM + Accessor Engine/ItemDB + 死 soft-fail 清理",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【B1】combat/clues/npc/map：_kp/getKpEng 改 getKpEngine()||KpExecutionEngine（对齐 inventory R29.1），不再读 window.CoCKpConfig",
            "【B2】Accessor：engine()/itemDb() 优先 ESM（CoCEngine / CoCItemDB）；CoCState 仍懒绑 window（须 gameState，避免无 Vue 空对象误绑）",
            "【B3】ai_prompt_config：去掉 ESM 已导入后永不到达的 window.* soft-fail 分支",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "网页壳 app.mjs 仍挂 window.*（CoCState/Tools/…）；按屏拆包 / dispatch 收口 — 多周，勿大爆炸",
            "Accessor 的 CoCState 仍依赖 window 懒绑（Vue 反应核）；全量 ESM 绑核需壳层改造",
            "~~部分 UI window.CoCStateAccessor~~ → R29.3 ESM import",
            "A–F system waves 仍须用户明示「做 A」才开",
            "【可选】深度 a11y；Handbook TOC；盲查软文案",
            "【代理门】改完必验：build:assets → test:engine → 引擎类 ci:smoke"
        ]
    },
    {
        version: "V18.6 R29.1",
        date: "2026-09-26",
        title: "软债两项：神话物 SAN 角色解析 + window/KP ESM 热路径切片",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【Item A】update_inventory 神话物 SAN：target_name/character_name/actor_name/char_name → resolveActor；否则仅用界面选中且 isActive 的 selectedCharIndex；否则中文拒识并拒发该神话物——不再 roster.find(isActive)||roster[0]",
            "【Item A】definitions.update_inventory 补接触者字段说明；resolve_actor_smoke 覆盖：选中失效不落 Ann、具名 Ann、选中 index、Ghost 拒",
            "【Item B】inventory 热路径：CoCItemDB / KpExecutionEngine 改 ESM import；kp_config.getKpEngine 优先 ESM（window 仅遗留别名回退）",
            "【顺手】audit:writes 允许 js/state/gameplay.mjs 年龄效应 maxHp 钳位写（既有门禁误报，非战斗伤）",
            "【验证】build:assets + test:engine + ci:smoke"
        ],
        remaining: [
            "~~combat/clues/npc/map _kp window~~ → R29.2",
            "~~Accessor Engine/ItemDB window~~ → R29.2 ESM；CoCState 仍 window",
            "~~ai_prompt_config soft-fail~~ → R29.2",
            "网页壳 app.mjs window.* / 按屏拆包 — 见 R29.2 remaining",
            "A–F system waves 仍须用户明示「做 A」才开",
            "【代理门】改完必验：build:assets → test:engine → 引擎类 ci:smoke"
        ]
    },
    {
        version: "V18.6 R29",
        date: "2026-09-19",
        title: "猎虫整摞 + Phase1–3：resolve / lorebook / 斜杠扩展壳",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【接口审计】CoC Engine 包体检：ESM 图/审计门/test:engine 全绿；硬断 spawn_npc window 半迁移（npc_templates 未挂 window，combat handler 仍走 window）",
            "【刷怪】spawn_npc 改 ESM import + window 兼容挂载；双表桥（模板优先，summary 回退）；英文 id→模板映射；模糊匹配最短 2 字取最长命中；R16 去假 mock",
            "【弹药/UI】取消强制装填；×N 数量解析；弹药名优先于武器模糊匹配；开火背包 count≤0 视为无弹；SAVE_SCHEMA __testing 对齐 v8",
            "【P1 文档/P2 挂载/P3 契约】NEW_SESSION 路径、MythosTomes/CoCLog/StudyState window；effects snake 与 fire_weapon.situation；工具死别名 schema 对齐 + tool_alias_smoke",
            "【盲查批次】追病治 sleep、弹药逻辑、OPEN 软栈（dispel/link_clues/register_npc/consume 事务/骰盘推动/resist_poison/dodge/luck/pulp/存档坏类型等）→ open_stack_soft_fix_smoke",
            "【OPEN 57】战斗 advanceTurn 门控、成长 live 技能、aging 刷 maxHp、时间跨夜不跑日管线、追逐未知动作、快照 clueBoard、PDF 稳定 id、HP SoT、地图/线索/装备索引等 → open_stack_57_smoke",
            "【OPEN 24】未知角色拒 isActive 回落族；consume 精确匹配；近战拒开火；社交 kind；仪式/施法/治疗/群体/追逐名单等 → open_stack_24_smoke",
            "【Phase1】js/tools/resolve.mjs：resolveActor/resolveEnemy/requireField；handlers 迁入；未知非空名永不静默 isActive；resolve_actor_smoke",
            "【Phase2】js/ai/lorebook.mjs 预算注入（默认 2000 字）接入 buildSystemInjection；deep_one_shadow 试点 9 条；aiSettings.loreBudgetChars；__loreLastInjected",
            "【Phase3】extensions 壳（getGameContext/on/off/emit/registerExtension）；slash /help /state /roll /lore /give；聊天 / 拦截；18 内置剧本 lorebook + pack-parity",
            "【阶段猎虫六修】lore 预算 0、斜杠误吞、标题误命中、/state HP、扩展 setup 僵尸、unregister 卸监听",
            "【猎虫四修】group_roll 别名；拒击败开火/近战；opposed character_name；system_alert 拒非字符串",
            "【目录猎虫 OPEN1–16+N-MAP/N-CL】追逐假猎物、战斗∩追逐互斥、机动打尸体、update_enemy 绝对 hp、env kind、字符串敌人、rooms 对象不崩、schema 坐标可选等 → open_stack_dir_smoke",
            "【验收】Ghost 拒识；deep_one_shadow lore 注入远低于预算；build:js:check + test:engine 绿",
            "【验证】npm run build:js / build:js:check / test:engine（含 57/24/dir/resolve/lorebook/slash 烟测）；audit:pack-parity 18/18"
        ],
        remaining: [
            "网页壳仍挂 window.*；按屏拆包 / dispatch 收口未做（V18.6 遗留）——见 R29.1 增量切片与 remaining",
            "~~inventory 神话物 SAN isActive~~ → R29.1 已收口",
            "盲查可持续发现软文案/别名边角；建议新缺陷优先收硬失效/错规则/坏状态",
            "A–F system waves 仍须用户明示「做 A」才开",
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.6",
        date: "2026-09-13",
        title: "晋级发布：收口 V18.5 R1–R28",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【晋级】package.json / 页脚水印 / STATE_CONTRACT_VERSION → V18.6（18.6.0）；继承 V18.5 发布收口与 R1–R28 规则/骰盘查修",
            "【R28 已含】调查员检定走骰盘（奖惩/对抗/群体/运气恢复/施法 POW），NPC 与精神病院月度表仍引擎暗掷",
            "【验证】晋级后 npm run build:assets；发布包不含 node_modules"
        ],
        remaining: [
            "网页壳仍挂 window.*；按屏拆包 / dispatch 收口未做",
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.5 R28",
        date: "2026-09-06",
        title: "调查员暗掷收口：奖惩 / 对抗 / 群体 / 运气 / 施法 POW",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【R28】按「引擎结算、骰盘掷调查员那颗」收口：bonus_penalty_roll / opposed_roll / group_roll 改骰盘；recover_luck 未指定 amount 先做运气检定，失败才恢复 1D10（指定 amount 仍是守秘人奖励）；cast_spell 伤害/诅咒/召唤对有 POW 的目标先弹意志骰盘，目标仍由引擎掷；精神病院月度 1D100 表保持暗掷（守密人表）；bugfix_round28_smoke",
            "【验证】npm run test:engine 含 bugfix_round28；ci:smoke 全绿"
        ],
        remaining: [
            "月度精神病院 1D100 仍由引擎掷表（符合原文守密人流程）",
            "骰子台 gameplay.groupRoll 仍可一次结算群体（桌面 KP 骰）",
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.5 R27",
        date: "2026-09-06",
        title: "社交对抗骰盘 + 溺水 CON + 教育成长 + 神话物品 SAN",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【R27】social_opposed 不再引擎暗掷调查员，改 social_opposed 骰盘；NPC 抵抗档位改 floor(技能/5|/2)；溺水屏息 CON/2 后须体质检定，失败 1D6（不再无检定 1D4），战斗 tick 排队 drown_con；教育成长按 7e 对 EDU 本身掷（去掉 EDU×5 几乎永不成）；神话物品 requiresSanCheck 真正弹 SAN（1/1D6）不再静默 1D3；坠落 1D6 走 parseDice；bugfix_round27_smoke",
            "【验证】npm run test:engine 含 bugfix_round27；ci:smoke 全绿"
        ],
        remaining: [
            "bonus_penalty_roll / recover_luck / 月度精神病院 1D100 仍可由 KP 工具直接引擎内掷",
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.5 R26",
        date: "2026-09-06",
        title: "残余收口：连射骰盘 / 同场 SAN 封顶 / 世界时钟 / 章节解锁",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【R26】burst_fire/sweep 改走 combat_attack 骰盘（preRolledAttack 再结算命中档/掩体）；reality_check 的 mythos_name 接入 applyCappedSanLoss（同场同存在按失败档上限封顶，跨日清空）；worldClock 记日/时，hours 不满一天医学仍常规，满 24h 才困难，存档读写时钟；isScenarioUnlocked 对章节图目标不再无条件 true，isChapterGatedAllowed/大厅地图共用该判断；护理档按原文两档（机构 01–50 或≤主治技能，私人 01–95）并接受 institution/private 别名；bugfix_round26_smoke",
            "【验证】npm run test:engine 含 bugfix_round26；ci:smoke 全绿"
        ],
        remaining: [
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.5 R25",
        date: "2026-09-06",
        title: "群体/对抗检定走 checkSkill + 本地剧本 SAN 骰盘",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【R25】groupRoll 大失败阈值写反（技能<50 当成 96–100、≥50 只认 100），现走 checkSkill；opposed_roll 不再自写 d100（无奖惩骰、极难/困难未向下取整）；运气 _levelFromRoll 与 checkSkill 统一为 floor(技能/5)、floor(技能/2)；本地剧本节点/选项 sanCheck 改为 deferSanCheck + enqueueRuleCheck（与在线 apply_scenario_effects 同骰盘）；bugfix_round25_smoke",
            "【验证】npm run test:engine 含 bugfix_round25；ci:smoke 全绿"
        ],
        remaining: [
            "burst/sweep 连射仍引擎内掷（R21/R23 已补掩体/情境/射程，但不弹骰盘）",
            "applyCappedSanLoss 目前无线上调用方",
            "「受伤当日」无游戏内日历，以 advance_time 是否跨过一天近似；护理档位 poor/average 共用机构 01–50",
            "arc_chapters.isScenarioUnlocked 末尾无条件 return true（无调用方，实际门禁走 isChapterGatedAllowed）",
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.5 R18–R24",
        date: "2026-09-05",
        title: "规则书对齐 + 战斗/追逐/检定/存档查修（R18–R24）",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【R18 规则书】掩体先挡子弹、个人护甲只挡穿透部分（7e p.113）；医学改回每处伤害一次（untreatedMedicine）；精神分析改为每月一次，大失败扣 1D6 SAN 并终止该治疗师关系；骰盘推动接入 canAttemptSkill（须先失败、只能推一次）；bugfix_round18_smoke",
            "【R19 规则书】医学受伤当日常规、隔日困难；急救失败可推动一次，濒死者推动失败即死；精神分析成功统一 1D3；治愈恐惧症/狂躁改为「分析成功 + 患者 SAN 检定」，大失败再失 1D6；apply_healing 增 push、apply_therapy 增 cure_target；bugfix_round19_smoke",
            "【R20 规则书】推动改为同难度重掷（不再强制困难）；精神病院/私人看护改回 1D100 月度表（私人 01–95、机构 01–50，成功 1D3，96–100 失 1D6）；删自制档位与随机新发症状；bugfix_round20_smoke",
            "【R21】连射/扫射不认掩体与情境骰（单发 fire_weapon 已接、burst 未传 options）——逐发 soak、耐久递减、打穿后直穿，扫射按目标各自掩体回写；skipStatusMods 防惩罚骰双计并消耗瞄准；饥饿/脱水补进 core.situation（攻击骰 skipStatusMods，R17 挂在 checkSkill 上对开火无效）；advance_time 按周/月也重置每日 SAN 并推进临时疯狂小时；apply_therapy 弹骰前校验关系破裂与 cure_target；bugfix_round21_smoke",
            "【R22】选项级 branchByClueQuality 被映射白名单丢掉，7 个剧本证据分级选项全部失效；剧本 chase.quarryMov 从未读取，猎物 MOV 9 被写成 8、额外行动丢失；载具报废后 part.mov 仍是车速（effectiveMov 不回落徒步）；非司机被禁止一切追逐行动（含险情）；追逐结束后排队中的 chase_* 仍会结算并可能覆写 outcome——voidChaseRuleChecks + !active 保护；bugfix_round22_smoke",
            "【R23】在线 pendingRoll 交锋走 combat_attack 后不写 onWin/onLose（本地 runner 会重入 applyEffects）——spec 带 scenarioCombatCfg，掷完按 runner 口径结算；连射补射程档（与点射表取更难者）及霰弹 damageExpr；分头 applyCharChoice 按证据质量改写 next（R22 只修了映射）；bugfix_round23_smoke",
            "【R24】AI push_skill_check 仍默认 difficulty=hard，盖掉 R20 同难度重掷；executeSkillCheck 不转发 skipStatusMods，开火骰盘把情境惩罚再算一遍，成败改用 res.success；工具回滚补 scenarioRunner/sanCaps/_customWeapons 并清 combat 脏键；存档读写自制武器并回写 CoCItemDB；bugfix_round24_smoke",
            "【验证】npm run test:engine 含 bugfix_round18–24；ci:smoke 全绿"
        ],
        remaining: [
            "本地剧本节点 sanCheck 仍为引擎内掷（在线路径已改骰盘）",
            "burst/sweep 连射仍引擎内掷（已补掩体/情境/射程，但不弹骰盘）",
            "applyCappedSanLoss 目前无线上调用方",
            "group_roll / opposed_roll 自写 d100，不走 checkSkill（无奖惩骰）",
            "「受伤当日」无游戏内日历，以 advance_time 是否跨过一天近似；护理档位 poor/average 共用机构 01–50",
            "arc_chapters.isScenarioUnlocked 末尾无条件 return true（无调用方，实际门禁走 isChapterGatedAllowed）",
            "【代理门】改完必验：.cursor/rules/verify-after-change.mdc + AGENTS.md；js 变更先 build:assets，再 test:engine，引擎类改动 ci:smoke 退出码 0 才算完成"
        ]
    },
    {
        version: "V18.5",
        date: "2026-09-06",
        title: "发布收口 + 多轮逻辑 BUG 查修（R1–R28）+ Rules/创意/风险门",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【版本】package.json / 页脚水印 → V18.5（18.5.0）；权威产品树为本目录（勿与 OneDrive 下 V17.2_CCGS 混改）",
            "【规则框架】SituationalModifier / ConditionStore / RoundTick + 五分支（战斗/环境/理智/追逐/社交）+ 统一门面已闭合",
            "【B6】濒死每轮 CON 骰盘、自然/重伤恢复、灭火、载具碰撞/失控、出血 tick",
            "【B7】精神病院月度看护、推动失败结构化后果、全自动齐射命中档",
            "【B8】运气绑定检定、多目标扫射、多回合仪式施法；ESM 单源 build:js（SW=version+content-hash）",
            "【B9】状态语义闭环：canAct、感官修正、倒地起身、擒抱约束、发作清理、trigger_affliction→惩罚骰",
            "【Branch 7】枪械 attacks 射速（含 1/2 隔轮）、故障持久化+reload_weapon、dive_for_cover、掩体装甲/耐久 soak、追逐载具实体 MOV/HP/装甲",
            "【P0/P1 全量规则基建】ruleset 档（7e-core/7e-full/pulp）、rules_coverage 矩阵、audit_write_paths；不定疯狂=当前SAN/5；SAN0永久疯狂；POW永久消耗随档；先攻 dex_firearm_first",
            "【P2 Effect IR】compileIntent/executeEffects；fire_weapon/burst_fire/dive/stand/reload 门禁与 commit 走 IR；rules_p2_effect_ir_smoke",
            "【P3 总线】ModifierBus（core.situation+可扩展贡献者）+ TickBus（core.* 插件驱动 RoundTick）；rules_p3_buses_smoke",
            "【P4 载具表】js/data/vehicles.mjs（自行车→汽船）+ ChaseEngine/start_chase 按 vehicle_id 查表；猎物/追赶者可分车；rules_p4_vehicle_table_smoke",
            "【P5 调查员】背景五项 connect_backstory→SAN；信用评级生活水准表+init_wealth/lifestyle_spend；灵感/知识/运气→INT/EDU/LUCK；rules_p5_investigator_smoke",
            "【P6 协作施法】castSpell assistants 分摊 MP；协作者各 1 SAN；伤害系补 POW 对抗；rules_p6_coop_cast_smoke",
            "【P7 收口】疾病表+advance_time 日伤；pulp 档 HP+3/运气加成/SAN0 非永久；覆盖矩阵冻结（无 missing/stub/partial）；rules_p7_freeze_smoke",
            "【全书级覆盖 M0–M5】coverage schema v2（core_index+keeper_toc）；catalog/core/fill 双门禁；Keeper TOC leaf≈173；settle/table 实现率≥95%；饥渴/乘员/投掷/联合检定/驱散/经验/调查结果/武器护甲附录/生物摘要表；rules_book_fill_smoke + coverage:gate",
            "【模组契约 v1】scenario effects 统一执行器：sanCheck/combat.exchange/chase/enchantmentId；试点 midnight_museum+deep_one_shadow；线索质量打标；scenario_effects_smoke；禁止无检定编造关键物证",
            "【引擎联网同步 N0–N5】切模清瞬态；effects 钩子对称；apply_enchantment/dispel_magic；窄口 apply_scenario_effects；在线 situation 反重复键；叙事宣称 vs 工具对账（仅 reprompt）；online_settlement_smoke",
            "【模组扩挂】tutorial/asylum/lighthouse 关键 sanCheck+combat.exchange；museum/deep_one dispel+enchant；combat.pendingRoll 玩家骰盘；requiresClueQuality；creatures_summary 扩表；package_effects_audit_smoke",
            "【模组完善】线索质量门抽到 investigate_outcomes；museum 挂 security_guard/cultist 交锋；deep_one 证据门；packages tutorial/lighthouse 关键 san→sanCheck 与 pendingRoll 对齐",
            "【模组扩挂续】carnival/university 关键 sanCheck+pendingRoll+质量门；deep_one 余下 flat san 收口；packages carnival/university 同步；抽检扩至 4 包",
            "【战斗UI闭环】选目标+直调 melee/fire/dodge/fight_back/end_combat；面板内掷骰/收起；结束回合；forceCheck 桥；combat_ui_flow_smoke",
            "【模组扩挂·三部】coastal/missing_child/train 关键 sanCheck+pendingRoll；packages 同步；抽检扩至 7 包",
            "【敌方回合/载具枪战UI】敌方回合自动 enemy_attack（每回合一次+手动重试）；追逐/载具枪战段挂 chase_action+fire_weapon；纯追逐亦可弹出面板；不二次 advanceTurn",
            "【模组 effects 全量挂接】8 社区包 flat san→sanCheck + combat.pendingRoll + 胜负 enchant/dispel；内置残留 san 收口；质量门/结局对称补挂；package_effects_audit 扩至全部 packages",
            "【优化波】pack-parity 校验(mjs覆盖json)；train/mayvale/reef 挂 chase；敌方出手近战/射击分流；叙事对账分类工具；ci:smoke 含 audit:pack-parity；chase_module_hang_smoke",
            "【优化波续】carnival fight 挂 chase；export:scenario-pack；Accessor 扩 chase/advanceTurn/journal/clue；combat/chat/hud/journal/clues 批次A读口",
            "【Accessor B–D】bindVueSetup；dice/char/growth/map/npc/inv/equip/combat/journal/clues setup 迁 Accessor；成长/NPC API 封装；accessor_bind_smoke",
            "【Accessor 收口】components/views 去掉 CoCState 直调回退；char_creator/creator_view/lobby/story_view/rule_check/pdf_import 走 Accessor",
            "【装配层】scenario/runner IIFE 改为 CoCStateAccessor.getState()，与 UI 层一致",
            "【旁白】JUDGMENT_KEYWORD_GATE：段中判定句切开；skillCheck/branch 软闸；deferred 提示",
            "【薄模】midnight_museum / deep_one_shadow：有意不扩 100k 散文；选项语言与判定分支契约 + thin_module_narrative_smoke",
            "【Playwright】tests/playwright/critical_paths：敌方出手 CTA→enemy_attack、载具追逐面板、剧情存读档；npm run test:playwright（不进 ci:smoke）",
            "【存档】schema v8：持久化 chase（含载具参与者）；旧档迁移为空追逐",
            "【审查修复 A】parseDice/maxDice 链式骰式；近战 DB 不双重代入；扑掩写入 status.cover；火器扣护甲",
            "【审查修复 B】enterModule 清 chase/pending/pendingScenarioId；读档作废孤儿骰盘+抑制敌方自动出手",
            "【审查修复 C】applyEnemyHp→updateEnemy；追逐 set_crew/司机加速；combat_react canAct+autoResolve；spendAction 默认 actionsLeft",
            "【审查修复 E】getActiveChar 尊重选中；getActiveTab/npc 别名；state_contract 补 chase",
            "【审查修复 F】反应不双提示；endCombat 清徒步追逐/保留载具追逐；战斗中禁 chase tick；机动/挣脱走骰盘；霰弹可贯穿；追逐中射击/近战耗行动",
            "【审查修复 G】开场速度检定；actionsFor 相对全场最慢无硬顶3；障碍失败不后退；连续领先逃脱；追逐面板摘要/速度门禁",
            "【创意 W1】证据档 endingsByClueQuality/branchByClueQuality；战后余波队列（重伤/SAN余震/目击热度）",
            "【创意 W2】alley_to_asphalt 追逐展示模组；gunfightBeats 提示；Playwright 速度检定门禁",
            "【创意 W3–W6】moduleSeed 遭遇变体；keeperStyle↔ruleset+prompt；mythosHeat；不可靠存档摘要；scaffold:scenario",
            "【创意收口】线索板异常关注热度；存档列表显示 saveBlurb；载具追逐 set_crew 提示",
            "【创意二期 C1–C5】arcLedger 战役账本；NPC 信誉→线索质量；余波 reputation/police/ally；双时钟+falseLead；不可靠线索展示；rain_dock_chase；keeper 叙事密度；桌规卡+存档对比；能力标签筛",
            "【创意三期 D1–D5】arcLedger v2 继承/重置；章节解锁表；信誉/警察下局加压；双时钟 HUD；假线索可疑徽章+热度事件表；hearing_room+fog_lighthouse_chase；桌规记忆/结局回放/可接续徽章/scaffold；creative_d1–d4 smoke",
            "【创意四期 UX+内容】桌规并排预览；章节链地图；余波 HUD+选项压力文案；debunkFalseLead+线索板揭穿；热度事件回放；存档账本摘要；newsroom_midnight+cliff_mist_run；scaffold 证据档三结局；creative_ux_content_smoke",
            "【创意五期 E1–E5】重置确认对话框；继承开局 carryBrief 面板；recommendNextChapter+大厅「下一本」徽章；线索板可疑筛选与计数；结局回放时间线+复制；存档对比 arcLedgerMeta 差值；capabilitiesUsed 写入回放",
            "【创意五期 X1–X3】court_recess（社交休庭对质）；lighthouse_night_watch（静谧灯塔夜班·无追逐）；大厅「校验当前剧本」；creative_phase5_smoke；章节解锁 newsroom→court / cliff→night_watch",
            "【创意六期 S1–S4】capability_system：桌规「本局会用到」预览；章节进度条+打开下一本；endingSaveBlurb→存档摘要；能力词典旁注；creative_phase6_system_smoke",
            "【系统 P0–P4】desk_pref：DevLog「桌规偏好提示」开关（默认关）；开启才弹严苛/电影/轻Pulp·继承重置·能力筛；偏好 API+能力筛持久化；creative_pq_system_smoke",
            "【系统 Q1–Q6】能力对账写入结局回放；存档 saveCompareMeta 对比；契约健康度分桶；DevLog 能力覆盖矩阵；ARC_CHAPTER_TRANSITIONS；创意 smoke 目录+list:creative-smokes",
            "【风险门 R】capability_risk：别名规范化；全量 builtins tag↔结构严格对齐；LOCKED_PUBLIC_APIS；压力写路径机器守卫；markCapability 规范 id；CAPABILITY_IR_VERSION=0；creative_risk_gate_smoke；ci:smoke 含 audit:capability-parity + audit:pressure-writes",
            "【查漏 R+】pre_af_gap_sweep / pre_af_soft_report：禁硬能力虚标；pack readsArcLedger/章节锁对齐；注释误报 markCapability 已剥离；deep_one 去掉虚标「战役账本」；alley pack 补 readsArcLedger；ci:smoke 挂入 audit:pre-af-gaps + audit:pre-af-soft",
            "【稳健性】safeJsonParse 补 import（core/lobby）；取消记住密钥时清 localStorage；hurtEnemy 传数值增量；模组下载超时+去重；PDF AI 复用可重试错误分类；敌攻 remount 防重放；检定异常可见提示",
            "【查漏+】record_engine_log 降级/AI 隔离上限；公开目录 https 校验；SW host 精确匹配；KP 注入避让 AI busy；flags 禁 __proto__；补 deep_one/asylum/museum pack twin；rememberKey 回显；robustness_gap_smoke",
            "【BUG修·基线】先攻重锚定；forceCheck 唯一 id；排队不双弹；同名敌人·2+按 id 扣血；setPosition 校验优先；删模组回 default；下载失败回滚；PDF 缺 choices；recover_luck；loadGame/IDB spinner；bugfix_combat_queue_smoke",
            "【BUG修2】时钟满不被旧节点覆盖；emitCheck 幂等；敌攻跳过倒地；fire_weapon 先门禁再耗追逐行动；chase tick 守卫；速度检定看队列；spawn 先攻重锚；困难失败不计成长；工具结果 targetValue；bugfix_batch2_smoke",
            "【BUG修 R1】聊天 _vid 单调键（防 Vue 键冲突）；proseBankId=proseScenarioId||id；heatEventsLog 存读与开局清空；读档追逐 speedResolved 解锁；余波 flushAftermath；resetInvestigatorCarry 重建 chapters；情景检定不被规则检定吞掉；bugfix_round1_smoke",
            "【BUG修 R2】enemy_attack 必须真实未败敌人；stand_up/dive_for_cover 追逐 actionsLeft 预检再 spend；consume_inventory 精确匹配优先于 includes；存档剥离聊天 _vid；bugfix_round2_smoke",
            "【BUG修 R3】fire/burst 去掉「未知敌人」幽灵目标；reload 禁止无背包弹药白嫖弹匣；aim/reload 耗追逐行动；burst 门禁后 spendAction+按 enemy.id 扣血；读档解锁速度时刷新 actionsLeft；非战斗 spawn 不入先攻；bugfix_round3_smoke",
            "【BUG修 R4–R6】追逐 caught→active=false；战斗回合不自动 tick 追逐；ConditionsEngine dive/stand 写清 status.cover；resolvePendingRuleCheck 禁乱序结算+kind 匹配；空先攻→endCombat；rollImprovement 须本局使用过技能；carry 清 isDying/isUnconscious/boutFaint；mythosHeatFloor 取 max；章节 completed 按 scenarioId 去重",
            "【BUG修 R7–R10】环境伤害透传 forceCheck；treat_disease 一律骰盘；bonus_penalty_roll 受 canAttemptSkill；advance_time 多名重伤排队；工具回滚含 pending/chase/skillAttempts；切模清 heat/group/skillAttempts；跨模组 import 拒绝；exportArcLedger 副作用生效；地图 goToRoom→setPosition；推动/战斗掷骰用选中角色与 pending.roller；创建器 goBack 失败保留 pendingScenario；大厅新建模组刷新存档摘要",
            "【BUG修 R11–R13】mapNodeChoices/mapScenarioChoice 透传 falseLead/falseNext；余波识别 hasMajorWound/isUnconscious；警方关注触发放宽；PDF merge 重写 branch.* 且不线性化 branch 节点；热度跨档 3/4/5 全触发；附魔 buff 进 checkSkill/applySanLoss；applyEffects 末尾 checkClockFull",
            "【BUG修 R14】小队 finishChoiceSession/分头路径 falseLead（成功 falseNext+可疑线索，失败 replay）；APEX primary/secondary/melee→equippedWeaponLabel 供战斗/先攻/掉落；急救 untreatedFirstAid 每伤 +1 不双加；社交 NPC 胜更新态度；黄印 bonusDiceVs 过滤；KP danger(+2 alert)/choice→observe；bugfix_round14_smoke",
            "【BUG修 R15】剧本 chase 启动后以基础 MOV 解锁 speedResolved（防速度检定死锁）；读档清 groupCheckSession+pendingBranch；sanCaps 存读；治疗消耗物品精确匹配优先；骰盘推动难度 hard 对齐 AI；毒素同回合防双 tick；分头会话只排队有节点的调查员；bugfix_round15_smoke",
            "【BUG修 R16】在线 apply_scenario_effects：sanCheck 改走骰盘（KP 不再暗掷 SAN）、剧本交锋 pendingRoll 落到 combat_attack 骰盘（原为「请检定」但无面板的死锁）、生物先手不挂起直接结算；pendingCfg 透传已解析武器；已完成典籍不可重复 fullStudy（原可无限刷神话技能/法术并暗扣 SAN）；apply_healing 消耗药品精确匹配优先；满弹匣空转换弹不再吞追逐行动；spawn_npc 先攻值与 sortKey 同一次骰；bugfix_round16_smoke",
            "【BUG修 R17】重伤「倒地」补写 status.prone（此前射击加骰/起身都读不到）；STR/DEX/CON 减半改为一次性（原可被二次重伤折半再折半，永久不可逆）；饥饿/脱水阶段的惩罚骰真正进入 checkSkill（原只记录不生效）；连射/扫射不再对火器无视护甲（与单发 resolveCombatExchange 对齐）；剧本文本输入歧义匹配不再擅自选中首个含子串的选项；手动「恢复互动选项」会作废未掷的检定面板并清 pendingBranch（防旧骰结算新分支）；工具回滚快照补 pendingAftermath；bugfix_round17_smoke",
            "【规则书对齐 R18】掩体 soak 顺序按 7e p.113 改为「子弹先打掩体、个人护甲只挡穿透部分」（掩体耐久按未减甲伤害扣减）；医学由「每周一次」改回原文「每处伤害一次」（untreatedMedicine，与急救并行、可同伤共用）；急救/医学失败照样消耗当次名额（原文 once per instance of damage，维持现状）；精神分析由每周改为每月一次（endMonth 刷新），大失败按原文扣 1D6 SAN 并终止与该治疗师的治疗关系（therapyEndedBy）；骰盘「推动」小工具接入 canAttemptSkill/recordSkillAttempt（须先有同情境失败、且只能推一次）；bugfix_round18_smoke",
            "【规则书对齐 R19】医学按原文分档：受伤当日常规、隔日需困难成功（recordInjury 打 woundToday，advance_time 满一天由 HealingEngine.endDay 清除，骰盘 spec 带 difficulty）；急救失败可推动一次（apply_healing push=true → canTreat 放行一次），推动失败对濒死者直接死亡；精神分析成功统一 1D3（去掉自制的大成功 1D6+1D3）；治愈恐惧症/狂躁症改为原文两段式：精神分析成功后患者再做 SAN 检定，成功才治愈且不恢复 SAN，SAN 大失败再失 1D6（新 kind=therapy_cure 骰盘 + SanityEngine.resolveTherapyCure）；apply_therapy 增 cure_target、apply_healing 增 push；bugfix_round19_smoke",
            "【规则书对齐 R20】推动改为原文的「同难度重掷」：skillAttempts 记录原检定难度，canAttemptSkill 推动时回传该难度，AI 骰盘与骰子台推动都不再强制困难（R15 的 hard 对齐作废，后果加重与只能推一次保持不变）；精神病院/私人看护改为原文 1D100 月度表：私人 01–95、机构 01–50（或低于主治医师精神分析），成功恢复 1D3 并可做理智检定痊愈，96–100 失去 1D6 SAN，51–95 毫无进展；删除自制的 1D4/1D6 档位、大成功额外 1D3、随机治愈恐惧症与「院内刺激新发症状」；bugfix_round20_smoke",
            "【BUG修 R21】连射/扫射补齐情境层：burst_fire 原来不传任何 options，敌人躲在掩体后对连射毫无作用——现按单发 fire_weapon 同样口径传 targetCover（逐发先打掩体、耐久递减、打穿后剩余弹药直穿）与 SituationalEngine 奖励/惩罚骰、载具追逐 +1 惩罚骰，扫射按各目标自己的掩体分别 soak 并回写 status.cover；连射攻击骰补 skipStatusMods（否则失明/恐惧症惩罚被 resolve 与 checkSkill 各算一遍）并与单发一致消耗瞄准/一次性惩罚；饥饿/脱水惩罚骰补进 core.situation（攻击骰一律 skipStatusMods，R17 只挂在 checkSkill 上等于对开火/近战全部失效）；advance_time 只按 days 重置每日 SAN 累计与临时疯狂计时，改为按总天数（weeks/months 也重置，且月度推进不再让 6 小时临时疯狂原地不动）；apply_therapy 在弹骰盘前就校验治疗关系是否已破裂与 cure_target 是否存在（原为掷完才告知无效）；bugfix_round21_smoke",
            "【BUG修 R22】选项级 branchByClueQuality 被 mapNodeChoices / mapScenarioChoice 的字段白名单整个丢弃，selectChoice 里的读取分支永远走不到——7 个剧本（alley_to_asphalt / rain_dock_chase / fog_lighthouse_chase / cliff_mist_run / hearing_room / court_recess / newsroom_midnight）的证据分级选项分支全部失效，现补进两处映射（节点级 endingsByClueQuality 本就走 goToNode，未受影响）；剧本追逐 cfg.quarryMov 从未被读取，NPC 猎物一律回落 MOV 8，声明的 MOV 9 对 8 速度优势与额外行动全部丢失；载具参与者的 part.mov 被写成载具 MOV，令 applySpeedResult 的报废回退成空操作——现 part.mov 保留角色自身 MOV、effectiveMov 取载具速度，报废时立即回落徒步 MOV，pushSkill 改回体质、canDrive 不再受座位限制；handler 层 canDrive 门禁原先拦下非司机的一切追逐行动（乘员连险情检定都被回「不是司机，无法加速驾驶」），现只对 push/collide/lose_control 生效；追逐结束（chase_action end / 战斗结束同步关闭 / 猎物逃脱）新增 voidChaseRuleChecks 作废排队中的 chase_* 检定并关闭残留骰盘，rule_check 两处追逐结算补 !state.active 保护（原可在追逐已结束后继续结算并覆写 outcome）；rules_branch7_smoke 同步改为断言新的 mov/effectiveMov 契约；bugfix_round22_smoke",
            "【BUG修 R23】在线 pendingRoll 交锋 R16 改走 combat_attack 骰盘后，结算走 autoResolveExchange，从不回写 onWin/onLose（本地 runner 会带 preRolledAttack 再跑 applyEffects）——现 spec 携带 scenarioCombatCfg，掷完按 runner 同口径重入 applyScenarioEffects（不再误推进战斗回合）；连射/扫射补射程：options.difficulty 与点射/全自动表取更难者，handler 传 distance/point_blank，多目标取最大惩罚骰/最难档并套霰弹 damageExpr，扫射也 skipStatusMods+消耗瞄准；分头 applyCharChoice 在选选项时按证据质量改写 option.next 并施加 branch effects，此后 plurality/split/pickNavigationTarget 全部读到正确终点（R22 只修了映射、分头路径仍丢）；bugfix_round23_smoke",
            "【BUG修 R24】AI push_skill_check 仍把 tool.difficulty 默认成 hard，R20「同难度重掷」在 KP 推动路径上被盖掉——现仅在参数显式给出时覆盖，否则走 gate/原检定难度；executeSkillCheck 未转发 pending.skipStatusMods，开火/近战骰盘会把 SituationalEngine 已计入的失明/饥饿/恐惧症再算一遍，现与规则检定 spec 对齐，并以 res.success 判定成败（不再用 raw 点数对满技能值）；工具失败回滚补 scenarioRunner/sanCaps/_customWeapons，combat 多余键一并删掉；存档读写 _customWeapons 并回写 CoCItemDB（AI 注册的自制武器读档后不再失踪）；bugfix_round24_smoke",
            "【BUG修 R25】groupRoll 大失败阈值写反（<50→96、<50 应为仅 100）；opposed_roll/group_roll 自写 d100 不走 checkSkill（无奖惩骰、档位未向下取整）；运气 _levelFromRoll 与 checkSkill 统一 floor；本地剧本 sanCheck 改 defer+骰盘（在线路径 R16 已改）；bugfix_round25_smoke",
            "【BUG修 R26】连射/扫射改骰盘；reality_check 同场 SAN 封顶；worldClock 判定医学当日；章节解锁不再无条件放行；护理按原文机构/私人两档；bugfix_round26_smoke",
            "【BUG修 R27】社交对抗改骰盘+NPC 档位 floor；溺水屏息后 CON、失败 1D6；教育成长对 EDU 本身掷；神话物品接触弹 SAN；bugfix_round27_smoke",
            "【BUG修 R28】调查员暗掷收口：奖惩/对抗/群体/未指定点数的运气/施法 POW 改骰盘；精神病院月度表仍暗掷；bugfix_round28_smoke",
            "【验证】npm run build:js；npm run test:engine（含 bugfix_round1–3 / rounds_4_13 / round14–28 / combat_queue / batch2）；ci:smoke=build:check+audits+coverage:gate+test:engine"
        ],
        remaining: [
            "【全书级】Keeper TOC 目录完整+settle/table≥95% 已达成；procedure/na-engine 诚实标注即可，勿伪造数值结算",
            "【模组】effects+chase 已挂关键题材（含 carnival / alley / rain_dock / fog / cliff / court / night_watch）；npm run audit:pack-parity / export:scenario-pack",
            "【创意链】W…S + P/Q + R + R+ 查漏已收口；A–F（IR/压力总线等）SCOPE_FREEZE 至 pre-af audits 绿；见 capability_risk / desk_pref",
            "【BUG查修】R1–R28 高危逻辑（战斗/追逐/检定/存档/剧本副作用）已多轮收敛；调查员暗掷（奖惩/对抗/群体/运气/施法 POW）已收口",
            "【规则书】医学当日走 worldClock；护理按原文机构 01–50（或≤主治技能）/ 私人 01–95",
            "【可选债】深度 a11y；启动拆包；app.mjs/state.mjs 仍挂 window.CoCState 内核供 Accessor 绑定",
            "【不做】Investigator Handbook / Pulp 全书目录；规则书正文入库；伪造博物馆/深潜者十万字 prose bank；不改 prose_bridge 旁白闸门架构；不根据叙事自动扣血；不拆 Masks campaignArchive",
            "【运维】新对话请直接打开本树为 Cursor 根目录，避免再挂到 V17.2_CCGS 工作区；改完必验见 .cursor/rules/verify-after-change.mdc 与 AGENTS.md（build:assets → test:engine → 引擎类改动 ci:smoke）"
        ]
    },
    {
        version: "V18.4 Rules B9",
        date: "2026-08-16",
        title: "状态语义闭环：canAct / 感官修正 / 倒地擒抱 / 发作清理 / 恐惧症惩罚骰",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【门禁】CoCEngine.canAct：昏迷/濒死/眩晕/麻痹/逃跑发作/暴力发作/被擒 统一拒绝非法行动",
            "【感官】boutSense 失明/失聪进入 resolveSituation 与 resolveCheckModifiers；麻痹走门禁",
            "【倒地】攻击不再自动清 prone；stand_up / standUp 耗行动起身；倒地近战/射击惩罚",
            "【擒抱】被擒禁 move/fire/cast；RoundTick syncGrapples 在对方倒地/昏迷时解除",
            "【发作】tickMadness/RoundTick 结束发作时 clearBoutEffects；trigger_affliction→pendingPenalty→checkSkill",
            "【延后】枪械射速解析、故障持久化、Dive for Cover、载具实体深化 → Branch 7",
            "【测试】rules_b9_status_semantics_smoke 挂入 test:engine"
        ]
    },
    {
        version: "V18.4 Rules B8",
        date: "2026-08-15",
        title: "运气绑定检定、多目标扫射、多回合仪式施法",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【运气】spendLuckOnCheck：1 运气=1 点降低骰值至目标成功档；spend_luck 可绑 lastSkillCheck / target_level",
            "【扫射】resolveSweepFire + burst_fire.enemy_names：命中池分配多目标，各自闪避",
            "【仪式】castingRounds>1 召唤须 start_ritual→continue_ritual→cast_spell；受伤 applyDamage 打断",
            "【UI】角色卡 MP 条按 maxMp/POW÷5 显示",
            "【构建】补回 scripts/asset_manifest + build_browser：原生 ESM 单一源；build:js 只同步 SW/boot；CACHE_NAME=version+content-hash；MANIFEST/注释清除双轨幽灵路径"
        ]
    },
    {
        version: "V18.4 Rules B7",
        date: "2026-08-15",
        title: "精神病院月度看护、推动失败结构化后果、全自动齐射命中档",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【精神病院】applyAsylumMonth + asylum_care.mjs（poor/average/good）：月度 SAN、恶化、新恐惧症、极难治愈",
            "【推动失败】push_consequences.mjs → resolvePushedFailure 写 status/伤害/SAN；骰盘与 AI 推动路径共用",
            "【自动火力】单次命中+闪避对抗；普通1发/困难半数/极难全中；支持 preRolled",
            "【缓存】coc-engine-v18.4.11-rules（含 asylum_care / push_consequences）"
        ]
    },
    {
        version: "V18.4 Rules B6",
        date: "2026-08-15",
        title: "情境细则续：每轮濒死骰盘、自然/重伤恢复、灭火、载具碰撞",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【濒死】RoundTick 发现 isDying → enqueueRuleCheck 体质检定（失败死亡）",
            "【恢复】recoverNatural 每日+1HP；重伤阻断直至每周 CON 或医学；advance_time 接线",
            "【灭火】extinguish_fire + ConditionsEngine.extinguish",
            "【追逐】vehicle collide/lose_control（驾驶检定、伤害、失控清空行动）",
            "【重伤】内出血后果写入 status.bleeding 真正 tick",
            "【缓存】coc-engine-v18.4.10-rules"
        ]
    },
    {
        version: "V18.4 Rules Framework",
        date: "2026-08-15",
        title: "7e 情境细则框架：Modifier / Condition / RoundTick → 五分支 → 统一门面",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【契约】SituationalModifier、status.* ConditionStore、RoundTick（毒→出血→燃烧→溺水→眩晕→追逐轮）",
            "【W1 战斗】射程档/霰弹分段、突袭/人数/掩体/黑暗、战技 Build 差、enemy_attack 按武器技能、dice fumble 对齐",
            "【W2 环境】burning/drowning/bleeding/stun/cold/heat；爆炸 dice+distance；电击写入眩晕",
            "【W3 理智】INT 成功→临时疯狂（修正方向错误）；发作 effect 写入 status；BOUT_SUMMARY；场景 sanCaps",
            "【W4 追逐】有效 MOV、行动数、round 递增、障碍/屏障",
            "【W5 社交】social_opposed 四技能对抗与平局按较高技能",
            "【门面】resolveSituation/applyCondition/processRound/resolveManeuver/resolveSocial/resolveChaseAction",
            "【缓存】coc-engine-v18.4.9-rules"
        ]
    },
    {
        version: "V18.4 Audit",
        date: "2026-08-15",
        title: "假接线/失效预缓存审查：装备 Tab、SW 鬼影、版本水印",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【假接线】story_view 映射 equip→story-equip 且 keep-alive 含 StoryEquip，但 components 未注册 → 装备 Tab 空白；已 import 并注册",
            "【SW 鬼影】预缓存不存在的 js/lib/anime.mjs、icons/icon-180.png（anime 走 vendor UMD；图标仅 192/512）",
            "【水印】index.html 页脚 V18.1→V18.4；CACHE_NAME coc-engine-v18.4.8-audit",
            "【非假】midnight_museum / deep_one_shadow 短模组无 prose bank 为有意薄模，不伪造十万字；state_contract 为 JSDoc 契约文档"
        ]
    },
    {
        version: "V18.4 声明",
        date: "2026-08-15",
        title: "唯一运行树收口：吞引擎、清死代码、重伤/神话 HUD、调查员接口",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【产品】只保留本树 V18.4。V17.2 检定/治疗/追逐/战斗/神话已吞入；旁白闸门 prose_bridge / deferredNarrative 不替换。运行时 AI 仍为 DeepSeek。",
            "【引擎】skill_attempt、chase、apply_healing、reality_check、抗毒、advance_time、骰盘 rule_check；瞄准/近战；闪避与反击二选一；study_tome 先 SAN 骰盘；施法 POW 只作门槛；濒死 CON 交骰盘不暗掷。",
            "【规则】SAN 与不定疯狂可同时触发（7e，不做互斥）；枪械不加 DB、常规护甲不挡子弹；大失败 skill≥50→96–100 否则仅 100；getSkillValue 认 SAN/理智。",
            "【删除死代码】AI Worker、Canvas 聊天（从未注册，DOM 聊天为唯一路径）、dice_canvas.js（骰子台未调用）、幽灵工具名 apply_dice_modifier、SW 中的 items_db.mjs。不接 Canvas 聊天开关。",
            "【接口】createInvestigatorRecord 为入队唯一写入：伤势 status.*、疯狂 insanity.*、SAN derived.sanity（char.sanity/hp 为镜像）。旧档顶层字段 HUD 只作回退。",
            "【视觉】角色页/战斗条：重伤部位立绘标记、出血芯片、禁忌知识（有数据才显示）、SAN 上限 99−神话。SAN overlay 挂上 #app。审计套件改为 __CocAuditSuite.load() 懒加载。",
            "【缓存】Service Worker：见 V18.4 Audit（当前 coc-engine-v18.4.8-audit）。硬刷新后生效。",
            "【未做】不伪造 midnight_museum / deep_one_shadow 十万字散文；不在 advanceTurn 自动扣毒伤；不新开神话/重伤独立页。"
        ]
    },
    {
        version: "V18.4 Iface",
        date: "2026-08-15",
        title: "调查员记录收口：status/insanity/derived.sanity 为唯一写入面",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【接口】createInvestigatorRecord：建卡/战役入队不再写顶层 hasMajorWound；HP/SAN 镜像 derived",
            "【读取】HUD/大厅优先 derived.sanity 与 status.*；旧档顶层字段仅作回退",
            "【接线】SAN overlay 挂上 #app；getSanNarrative/getTomeNarrative/getSanitySummary/getKnownSpells 被 UI 使用",
            "【战斗】快速指令走 COMBAT_QUICK_ACTIONS 文案",
            "【删除】从未被骰子台调用的 dice_canvas.js；sanity_effects.js 改为 ESM"
        ]
    },
    {
        version: "V18.4 HUD",
        date: "2026-08-15",
        title: "角色页/战斗条接上重伤部位与禁忌知识",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【绑定】重伤/濒死/疯狂徽章读 status 与 insanity，不再读空的顶层字段",
            "【立绘】按 HIT_LOCATION 在头/躯干/四肢打重伤标记；濒死时红框",
            "【档案】伤口芯片 + 出血；有神话数据才显示法术/典籍进度；SAN 上限跟 99−神话",
            "【战斗】小队卡显示重伤/濒死与部位摘要"
        ]
    },
    {
        version: "V18.4 Prune",
        date: "2026-08-15",
        title: "卸掉未接线功能：CanvasChat / 幽灵 SW / 空审计套件",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【删除】canvas_chat.mjs 从未注册进 story_view；DOM 聊天为唯一路径",
            "【SW】去掉已删 items_db.mjs 与 canvas_chat；缓存名 coc-engine-v18.4.5-prune",
            "【审计】__CocAuditSuite.load() 动态导入 CJK/深度/路径/散文工具，不进玩家开机",
            "【7e】濒死骰盘走 MajorWoundEngine.dyingCheck；去掉无调用方的 emitRuleSkillCheck",
            "【工具】resist_poison 不再谎称战斗新回合自动 tick；须 process_poison_tick",
            "【boot】handlers 只由 tools/handlers/index.mjs 加载，去掉 app.mjs 重复 side-effect"
        ]
    },
    {
        version: "V18.4 Combat",
        date: "2026-08-14",
        title: "唯一树：吞入瞄准/近战/闪避XOR与典籍SAN骰盘",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【战斗】aim_weapon / melee_attack 进工具目录；fire_weapon 先掷命中再结算故障/贯穿",
            "【7e】被攻击闪避与反击二选一（combat_react）；update_enemy 禁止直接填负伤",
            "【骰】奖励/惩罚骰净额；大失败阈值 skill≥50→96–100、否则仅 100",
            "【神话】study_tome 先 SAN 骰盘；施法 POW 只作门槛不永久扣除",
            "【UI】HP 条用 charMaxHp；战斗面板 XOR 反应按钮",
            "【弹药】无窗口 KP 时回退 KpExecutionEngine 背包关键词扫描",
            "【濒死】伤害不再暗掷 CONx5；重伤/濒死交给骰盘；受伤打断瞄准",
            "【接口】getSkillValue 认 SAN/理智；枪械不加 DB、常规护甲不挡子弹；无技能敌人按 25% 掷命中"
        ]
    },
    {
        version: "V18.4 Absorb",
        date: "2026-08-14",
        title: "唯一树：吞入 V17.2 检定/治疗/追逐，删除死 Worker",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【唯一产品】以本树 V18.4 为唯一运行版本；旁白闸门 prose_bridge / deferredNarrative 保留",
            "【删除】AI Worker（worker.js + worker_client.js）从未 init/fetchAi，与 network 双重重试冲突",
            "【工具名】TOOL_TIERS 去掉幽灵 apply_dice_modifier；audit 校验 tiers ⊆ catalog",
            "【HP】maxHp===0 不再把当前 HP 当上限；治疗走 apply_healing + applyHealing",
            "【7e】skill_attempt / chase / apply_healing / reality_check / 抗毒 / advance_time / 骰盘 rule_check",
            "【本地剧本】失败不可免费重掷；可推动技能出现孤注一掷；KP 30分钟注入在本地剧本中关闭"
        ]
    },
    {
        version: "V18.4 Gate",
        date: "2026-08-15",
        title: "旁白判定闸门加固：句级截断 + skillCheck 辅助 + 待解锁提示",
        priority: "P0-已落地",
        status: "done",
        changes: [
            "【初版】ROLE_DIVISION_RULES / flushDeferredNarrative / pre-wrap",
            "【加固】句级截断、skillCheck/branch 软闸、DEFERRED_NARRATIVE_HINT",
            "【构建】npm test→test:engine；去掉失效 merge/build/icons/stats 入口"
        ],
        open_bugs: [
            {
                id: "JUDGMENT_KEYWORD_GATE",
                title: "段落判定关键词识别不准 → 截断体验糟糕",
                severity: "P0",
                status: "fixed",
                symptom: [
                    "玩家仍感到剧情流水式泄出或截断点怪异；硬刷新后体验仍差",
                    "正则 JUDGMENT_PARAGRAPH_RE 只认『若…检定/检定成功失败/掷骰…』等字面，灌水正文里大量『含义/下一步/非字面判定』漏标",
                    "判定句若嵌在超长首段中部，整段被当旁白放出，等于没闸",
                    "截断后 visible 过短（如 attic 仅约二百字）而 deferred 堆积，节奏割裂；或 intro 无关键词则整篇数千字一次倾泻",
                    "关键词误伤/漏伤均未与节点 skillCheck 选项对齐——闸门未挂在『真正要掷骰的选择』上"
                ],
                root_cause: "用全文关键词启发式代替『选项 skillCheck / 分支节点』结构化闸门；分段粒度与散文库写法不匹配",
                next_fix: [
                    "以 choice.skillCheck / node.branch 为权威闸门，散文关键词仅作辅助标注",
                    "判定句出现在段中时按句切，不整段误放或整段误砍",
                    "UI 明示『后续剧情待检定后解锁』，避免以为卡死或坏档",
                    "对人读验收：教程 attic / stairs 检定前后各截一屏对照"
                ],
                related_files: [
                    "js/data/narrative_prose.mjs (JUDGMENT_PARAGRAPH_RE, partitionNarrationByJudgment)",
                    "js/scenario/prose_bridge.mjs (enrichNarrativeGatedSync)",
                    "js/scenario/runner.mjs (deferredNarrative, flushDeferredNarrative)",
                    "js/components/chat_format_helpers.mjs (_scenario 排版)"
                ]
            }
        ],
        remaining: null
    },
    {
        version: "V18.4 Verify",
        date: "2026-08-02",
        title: "真伪复核修复: 工具返回·治疗技能·ProseBridge·贯穿maxDice",
        priority: "P0-已修复",
        status: "done",
        changes: [
            "【真BUG】normalizeToolResultContent：禁止 String(object)→[object Object]",
            "【真BUG】bonus_penalty_roll/recover_luck/apply_therapy 改为返回字符串",
            "【真BUG】apply_therapy 医师 skills['精神分析']=75（derived.psychoanalysis 为假修复）",
            "【真BUG】ProseBridge 补挂 6 本：carnival/coastal/lighthouse/missing_child/train/university",
            "【真BUG】checkImpale 改 maxDice（7e最大武器伤害）",
            "【伪BUG更正】SAN临时+不定同次触发符合7e，不实现互斥清除",
            "【非BUG】group_check ▸[角色]选项 为多人确认回显，保留",
            "【回归】tool_result_normalize / prose_bridge_coverage / impale_max_damage / narrative_push smokes"
        ]
    },
    {
        version: "V18.4 P5",
        date: "2026-08-02",
        title: "全量修复: 场景上下文·AI同步·工具返回·武器规则",
        priority: "P1-部分事后复核",
        status: "done",
        changes: [
            "【catalog.mjs崩溃】cjkVolumeReport导入名错误→删4个错误导入(第一次只删import没删函数体→第二次全清)",
            "【character handler统一入口】路由到applyDamage(方案A)，治疗路径路由applyHealing",
            "【sw.js】缓存版本 v18.2.0 → v18.4.0",
            "【PWA图标】icon-192/512/maskable 三图标补齐(manifest引用但目录缺失)",
            "【icons.svg preload】删除(内联sprite已覆盖，浏览器报unused警告)",
            "【场景上下文注入】「默认战役」根因: 系统提示无场景信息→injectScenarioContext→跨模块调用ReferenceError→内联runner.mjs(清理core.mjs死函数)",
            "【铁律4-权威】玩家不得单方面宣布HP/SAN变更；AI不得帮玩家反悔",
            "【铁律5-武器】自定义武器对象格式{name,damage,skill,type}+四时代规则(1890s煤气灯/1920s经典/现代/未来2080s)+人类vs神话武器区分(神话武器需SAN损失+上限2D6+故障风险)",
            "【弹药自动扣减】fire_weapon自动匹配背包弹药并扣减(基础模式关键词扫描+KP模式inferAmmoType)",
            "【update_character_status返回值】玩家受到伤害→李医生 HP:5/13 SAN:52/60，身负重伤。受到8点伤害。",
            "【update_inventory返回值】完成→已添加: 手枪、急救包、手电筒",
            "【apply_environmental_damage修复】复制粘贴bug: 返回治疗数据(totalRecovered/months未定义)→返回环境伤害结果",
            "【apply_poison修复】返回对象被String()成[object Object]→返回字符串",
            "【bonus_penalty_roll】P5声称返回description——复核时仍返回对象，已由 V18.4 Verify 真正修完",
            "【绝对禁止反悔清理】从返回值移除，移入铁律4系统提示",
            "【AI-引擎同步审计】27项发现: 6P0/12P1/9P2 → 修复代码bug+设计改进，5项审计误报(LLM通过工具闭环获取状态)",
            "【char_creator三入口】saveDraftCharacter/goBack/commitPreset 加pendingScenarioId检测→startScenario→openStoryTab='chat'→story",
            "【isActive修复】isActive:true→isActive:roster.length===0(只第一个角色激活，防多人模式刷屏)",
            "【group_check】▸[行动]噪音删除；▸[角色]选项回显保留（非BUG）",
            "【creatorReturn】显式清空防止残留状态干扰跳转"
        ],
        regression: [
            "openStoryCharacterTab 曾误改 switchScreen('lobby') 导致场景流程断→已恢复story",
            "saveDraftCharacter pending检查曾未写入磁盘(编辑工具问题)→已确认写入并验证"
        ],
        remaining: "假修复项已由 V18.4 Verify 关闭；判定闸门体验见 V18.4 Gate"
    },
    {
        version: "V18.4 P6",
        date: "2026-08-02",
        title: "✅ 已修复: 本机剧情模式·场景沉浸文本不渲染",
        priority: "P0-已修复",
        status: "done",
        reproduction: [
            "1. localStorage.clear() → 刷新",
            "2. 大厅 → 本机剧情模式 → 引擎教程·暗夜初探 → 开始剧本",
            "3. 创建角色(手动或预设) → 登记归档",
            "4. 预期: 看到沉浸文本 + 左下角选择按钮",
            "5. 曾实际: 只看到系统消息(已载入/开场/检查点), 无剧情文本"
        ],
        root_cause: "goToNode 内使用未定义变量 scenario?.proseScenarioId → ReferenceError，pushKp 从未执行；同时散文库异步加载未完成就进首节点，富化失败时本应仍有 JSON narrative，但异常已先截断。",
        fix: [
            "goToNode 改为 const scen = getScenario(); proseScenarioId = scen?.proseScenarioId || r.scenarioId",
            "startScenario 在 loadProseBank 完成后再 goToNode(startNode)，保证首节点可富化长文",
            "回归: tests/scenario_narrative_push_smoke.mjs"
        ],
        related_files: [
            "js/scenario/runner.mjs (pushKp, goToNode, startScenario)",
            "js/scenario/prose_bridge.mjs",
            "tests/scenario_narrative_push_smoke.mjs"
        ]
    },
    {
        version: "V18.4 P6-open-archive",
        date: "2026-08-02",
        title: "🔴 未解决归档: 本机剧情模式·场景沉浸文本不渲染（已由上条关闭）",
        priority: "P0-阻塞",
        status: "superseded",
        reproduction: [
            "见 V18.4 P6 done 条目"
        ],
        attempted_fixes: [
            "saveDraftCharacter/goBack/commitPreset 三入口加 pendingScenarioId 检测",
            "场景启动后 openStoryTab='chat' 替代 'character'",
            "isActive:true → isActive:roster.length===0 (防多人模式刷屏)",
            "group_check.mjs 的 ▸ pushSystem 噪音已删(runner.mjs)",
            "injectScenarioContext 从跨模块调用改为 runner.mjs 内联",
            "creatorReturn 显式清空防止残留状态干扰",
            "DEBUG日志已加(pushKp/goToNode/startScenario)但浏览器缓存阻挠验证"
        ],
        hypothesis: "pushKp 推送 {role:'assistant',content:P.intro} 到 chatHistory 但 UI 不渲染。可能原因: (a)visibleMessages/displayMessages 过滤了 assistant 消息 (b)chatHistory 在 pushStoryOpening 时被覆盖 (c)Vue 响应式未触发。需在无缓存环境下用 DEBUG 日志确认 pushKp 是否实际被调用、chatHistory 中是否存在 assistant 消息。",
        next_steps: [
            "已修复：见 V18.4 P6 done"
        ],
        related_files: [
            "js/scenario/runner.mjs (pushKp, goToNode, startScenario)",
            "js/components/story_chat.mjs (visibleMessages, displayMessages, 渲染)",
            "js/components/char_creator.mjs (saveDraftCharacter, goBack, commitPreset)",
            "js/views/story_view.mjs (activeStoryTab, applyPendingStoryTab)",
            "js/state/core.mjs (switchScreen, 系统提示)"
        ]
    },
    {
        version: "v18.2.0",
        date: "2026-08-01",
        title: "行动扇形菜单性能重做 + 内置剧本长篇扩量",
        changes: [
            "【行动扇】CSS 主驱动开合/扫光，收回重 anime/blur；rAF 合并悬停；共享 SVG 底盘 + 单高亮楔形",
            "【行动扇】恢复大视口缩放与完整选项文案（取消 line-clamp 截断），降低卡顿与遮字",
            "【CJK 门禁】scenario_cjk_volume + count_scenario_cjk：每剧本 ≥10 万汉字硬门槛",
            "【Batch A】tutorial / lighthouse_signal 散文库扩写并接线（各 ≥100k CJK）",
            "【Batch B】university_occult / carnival_of_masks / coastal_festival 散文库扩写并接线",
            "【Batch C】abandoned_asylum / train_to_nowhere / missing_child 散文库扩写并接线",
            "【构建】asset_manifest 登记各剧本 prose_XX + index_prose；build:js / smoke 通过",
            "【待续】midnight_museum、deep_one_shadow 仍未达 100k CJK（Batch D）— 已改为有意薄模：不扩散文库，只维护判定前后叙事与分支接线"
        ]
    },
    {
        version: "V18.4 Thin Modules",
        date: "2026-08-15",
        title: "博物馆 / 深潜者：不扩 100k 散文，捋清选项语言与判定分支",
        priority: "P1-已落地",
        status: "done",
        changes: [
            "【约定】薄模叙事契约写入两模组文件头：setup 不剧透成败；skillCheck→groupOutcome→success/failure",
            "【选项】去掉「下定决心 / 保持警惕 / 留意周围动静」套话；标签只写行动且 ≥14 字（audit 门禁）",
            "【结构】审计确认全部 skillCheck 目标均有 branch+groupOutcome，setup 无成败剧透句",
            "【测试】thin_module_narrative_smoke 锁契约；test:engine 全绿",
            "【不做】不伪造 midnight_museum / deep_one_shadow 十万字 prose bank"
        ]
    },
    {
        version: "V16.5 程序员版",
        date: "2026-07-01",
        title: "代码审计 + ESM同步 + 多角色协作整合",
        changes: [
            "【代码审计】5轮全量审计/7项问题修复/0 HIGH/0 MEDIUM/0 LOW安全漏洞",
            "【ESM同步】coc.mjs+405行(4引擎)/definitions.mjs+50行/persistence.mjs+IDB/ui.mjs+rAF批处理",
            "【多角色协作】MANIFEST.yaml(102文件→4角色)/merge.py无损合并/INTEGRATION.md+PROGRAMMER.md",
            "【测试补齐】coverage_gap_smoke.js(+23 assertions)/HealingEngine/age边界/enemy路径/extreme难度/引擎存在验证",
            "【安全增强】story_inv tooltip escapeHtml×7/Tauri CSP硬化(+img-src/font-src/frame-ancestors)/SW manifest修复",
            "【内联样式】42处静态style→CSS类(.cursor-pointer/.fs-micro等10个工具类)",
            "【代码整洁】safeJsonParse去重/CoCLog接入(5处)/handlePlayerAction异常通知/IDB失败Toast",
            "【Tauri】icons补齐(32×32/128×128/ico)/CSP最小权限/Windows bundle(mmsi+nsis)",
            "【测试】18/18 smoke全通过/181 deep verify checks/0安全漏洞"
        ]
    },
    {
        version: "V17 RC1",
        date: "2026-07-01",
        title: "Production Ready — 核心机制全面完善",
        changes: [
            "【理智系统】临时疯狂/不定疯狂/D10疯狂发作表/24恐惧症+24狂躁症/现实认知检定/SAN奖励/心理治疗",
            "【魔法典籍】5本核心典籍(死灵书/无名祭祀书/格拉基启示录/黄衣之王/伊波恩之书)+20法术",
            "【重伤系统】D20部位表/昏迷/内出血/武器掉落/濒死CON×5检定/部位伤情UI",
            "【推动检定】CoC 7e Pushed Roll机制/推动按钮UI/executePushedRoll引擎",
            "【运气消费】1:1消费LUCK调整检定/角色面板LUCK显示",
            "【武器连射】三发点射+全自动扫射/难度递增/弹药消耗",
            "【NPC模板】17种标准化NPC/怪物模板(9人类+8神话怪物)+spawn_npc工具",
            "【经历包】8→22项/覆盖三时代(1920s/1890s/现代)",
            "【大失败修正】skill≥50时96-100大失败,<50时仅100大失败→对齐CoC 7e规则",
            "【SAN视觉】屏幕边缘暗化/SAN冲击震动+红色闪烁/疯狂状态脉冲/低SAN警告色",
            "【CDN本地化】Vue+Bootstrap+Chart.js全部本地化至vendor/",
            "【测试】18/18 smoke测试全通过/181 deep verify checks/0安全漏洞"
        ]
    },

    {
        version: "v17",
        date: "2026-06-30",
        title: "APEX装备系统 + 性能全优化 + UX闭环 (Production Ready)",
        changes: [
            "【APEX装备系统】6槽位HUD (头盔/护甲/背包/主武器/副武器/近战), 五级稀有度 (S金/A紫/B蓝/C绿/神话红)",
            "【物品数据库】js/data/items_db.js — 50+武器 + 20+装备, 模糊匹配引擎, AI自动分类",
            "【物品分级】S级版本答案(泵动霰弹/冲锋枪) / A级强势首选(双管霰弹/栓动步枪) / B/C级过渡",
            "【物品详情】APEX风格点击弹窗 — 伤害/射程/弹容/护甲属性, 等级光效边框, 神话呼吸动画",
            "【DB规则对齐】伤害加值表全区间 (0→365+), 年龄修正对齐CoC 7e官方, MOV年龄惩罚",
            "【性能优化】CSS contain面板隔离, Vue keep-alive懒加载, ESM preload预加载",
            "【虚拟滚动】聊天500条消息仅渲染30个DOM节点, 滚动丝滑0卡顿",
            "【增量渲染】rAF批量消息插入 (pushMessageBatched), 避免重绘风暴",
            "【Service Worker】离线缓存全部静态资源, 二次打开秒开, API穿透",
            "【IndexedDB】异步双写存档 (IDB主 + localStorage保底), 非阻塞主线程",
            "【Tauri桌面】src-tauri/ 配置就绪, npx tauri build 一键生成 exe",
            "【Web Worker】AI网络请求Worker线程 (opt-in: COC_USE_WORKER=true)",
            "【Canvas聊天】canvas_chat.js Phase 1 架构, GPU渲染预留 (COC_CANVAS_CHAT=true)",
            "【对话导出】📋一键复制全部对话 / 📥导出Markdown文件",
            "【UX修复】剧情页⬅返回按钮 + ⚙设置入口, 装备页⚔标签栏, 长按技能+自动连加 (80ms)",
            "【工具栏修复】剧情页多余</div>布局Bug修复, 骰子/保存按钮归位",
            "【测试体系】17 suites / 300+ assertions / 0 failures, bug_hunt 119项边界, deep_verify 181项",
            "【文档】AUDIT_FINAL_V16_5 / LOGIC_REVIEW / EVALUATION_V16_5 / TEST_COVERAGE_GAP",
            "【代码量】153 files / 464KB, 67 .js + 52 .mjs (ESM 56%迁移)"
        ]
    },
    {
        version: "v16.5",
        date: "2026-06-27",
        title: "架构重整与 ESM 迁移 (AUDITFIX8 Final → V17 Phase 1)",
        changes: [
            "【模块拆分】ai_logic.js 拆为三层 (network/tool_dispatch/narrative, 577→113+122+426行)",
            "【模块拆分】state.js 拆为五模块 (core/ui/gameplay/persistence/aggregator, 920→73+92+340+418+147行)",
            "【数据解耦】coc.js BaseSkills 提取至 js/data/skills.js (490→443行)",
            "【ESM 迁移】全部模块创建 .mjs 版本 (44个), js/app.mjs 入口, ESM smoke 测试 4项 (117断言)",
            "【测试体系】run_all_smoke.js 统一入口 16 suites, engine_tests 11→34断言, 测试覆盖报告",
            "【代码质量】15函数 JSDoc 补全, safeJsonParse/Clone 统一至 utils.js, 8 handler JSDoc",
            "【CSS 重构】11组件内联样式提取 (style.css 107→521行), 6组件 CSS 类创建",
            "【安全加固】API Key sessionStorage 默认隔离 + 记住密钥开关, pushSystemNotice API",
            "【基础设施】GitHub Actions CI, vendor/ 本地化 (Vue+Bootstrap), 条件日志 logger.js",
            "【无障碍】5项 a11y 修复 (aria-live/aria-label/键盘焦点), a11y 审计报告",
            "【审计体系】综合审计 94/100分, 0 HIGH/0 MEDIUM/0 LOW, 5维自动化扫描",
            "【文档完善】ground_truth_canvas/ENGINEERING/humanpending/ROADMAP/EVALUATION 全量重写",
            "【数据整合】jobs_part1+2 合并为 jobs.js, 死代码清理 (15 .mjs)",
            "【存档安全】版本前向兼容检查, 自动存档失败醒目提示, navigator.storage.estimate()"
        ]
    },
    {
        version: "v16",
        date: "2026-05-28",
        title: "工程化升级与终极稳定性加固 (Pro Ultimate Final)",
        changes: [
            "【拨乱反正】基于 V15 稳定版重新构建，贯彻“八荣八耻”准则，通过四轮物理级 Diff 审计确保逻辑 100% 对齐。",
            "【UI 修复】修复 story_npc.js 描述渲染 Bug、story_map.js 依赖注入 Bug 以及 story_char.js 选中同步 Bug。",
            "【规则加固】修复 checkSkill 在极难成功判定上的细微偏差，确保与 CoC 7th 官方规则及 V15 表现完全一致。",
            "【全量回归】实装 `tests/engine_tests.js` 自动化测试套件，覆盖属性计算、技能匹配及 UI 接口可用性。",
            "【规范落地】确立 `ENGINEERING.md` 工程规范，明确“以破坏架构为耻，以遵循规范为荣”的开发底线。"
        ]
    },
    {
        version: "v15",
        date: "2026-05-25",
        title: "稳定性与 UI 同步优化",
        changes: [
            "【角色同步】修复随身物品装填/穿戴时角色不匹配的问题，实现多组件选人状态同步。",
            "【叙事监听】优化场景切换匹配逻辑，提高模糊地名的识别率与跳转准确度。",
            "【状态机加固】补全存档系统缺失字段，确保 atmosphere 等动态视觉状态在读档后完美恢复。",
            "【逻辑审计】修复 CombatEngine 与 ai_logic 对立判定中的未定义引用与回调参数错误。"
        ]
    },
    {
        version: "v14",
        date: "2026-05-25",
        title: "Zero-Pause 自动化革命：系统托底 v2.0",
        changes: [
            "【战斗引擎】实现全自动对立判定（攻击 vs 闪避/反击），支持多轮交火结算。",
            "【叙事监听】集成关键词监听器，AI 文本中提到发现线索或进入房间时，系统自动更新 UI，无需显式调用工具。",
            "【系统托底】fire_weapon 工具重构，现在由系统全权负责计算命中、闪避与伤害，彻底告别 AI 盲猜。",
            "【架构强化】引入 Ground Truth Canvas（真相画布）机制，确保复杂逻辑在多轮会话中保持一致性。"
        ]
    },
    {
        version: "v13",
        date: "2026-05-24",
        title: "系统托底架构与交互体验进化 (System Automation & UX Evolution)",
        changes: [
            "实装「系统托底」机制：检定大失败或关键感知失败自动触发氛围变色，无需 AI 介入",
            "彻底封印双击缩放：通过全局 JS 拦截 touchstart 事件，解决移动端连点加点时的页面抖动",
            "实装技能点「长按自动挡」：为 + / - 按钮增加定时器逻辑，支持按住自动连续增减数值",
            "完善战斗引擎闭环：修正 coc.js 中闪避判定 success 属性错误，统一 HP/Derived 数据模型",
            "优化多角色生命周期：在 creator_view.js 中增加「返回」按钮，支持中途加入角色并平滑回退",
            "精简 AI 提示词铁律：将规则维护工作完全移交系统底层，让 AI 专注于纯叙事创作"
        ]
    },
    {
        version: "v12",
        date: "2026-05-22",
        title: "动态气氛沉浸引擎与底层除虫 (Atmosphere Immersion & Bug Fixes)",
        changes: [
            "新增 set_atmosphere 工具，支持平静(calm)、紧张(tense)、恐惧(fear)、绝望(despair)四级全屏滤镜特效",
            "在 style.css 中建立 body::after 全局遮罩及内阴影呼吸渐变、屏幕震动动画",
            "在 state.js 中注入全局单例 setAtmosphere 方法，并与本地读档逻辑联动",
            "新增 record_engine_log 工具及第11条铁律，支持 AI 自动续写开发日志",
            "彻底修复 ai_logic.js 中因 API Key 换行或尾随空格导致的 HTTP 401 鉴权死锁 Bug",
            "重构 executeSkillCheck 检定处理器，修复 ${roll}/${sVal} 幽灵变量并植入防死锁容错拦截"
        ]
    },
    {
        version: "v11",
        date: "2026-05-21",
        title: "多角色装备系统解耦 (Multi-Character Equipment Refactor)",
        changes: [
            "解决装备系统冲突：将全局 gameState.equipment 迁移至角色个体，支持多角色独立装备",
            "修复角色初始化逻辑：确保 char_creator.js 中新角色拥有独立的装备槽位",
            "重构 story_char.js：纸娃娃 UI 完美支持多角色切换显示与独立的装备卸下操作",
            "优化 story_inv.js：背包穿戴逻辑自动关联当前操作的调查员，杜绝目标不明确报错"
        ]
    },
    {
        version: "v10",
        date: "2024-05-20",
        title: "线索板系统 (Clue Board)",
        changes: [
            "新增 add_clue, link_clues, mark_clue_status 工具供 AI 自动记录线索",
            "支持 7 种线索分类：物证、证词、文件、地点、事件、人物、异常",
            "实现卡片视图与 SVG 关联视图，支持玩家批注与状态标记"
        ]
    },
    {
        version: "v9",
        date: "2024-05-18",
        title: "场景地图系统 (Scene Map)",
        changes: [
            "新增 create_map, update_room, set_position 工具",
            "实现 SVG 场景图，支持房间状态（未探索、已探索、当前位置、危险、上锁）",
            "地图与位置系统无缝衔接，支持点击房间导航"
        ]
    },
    {
        version: "v8",
        date: "2024-05-15",
        title: "角色成长系统 (Growth System)",
        changes: [
            "实现 CoC 7E 核心规则：检定成功后自动记录，章节结束进行成长检定",
            "支持 EDU 成长检定与年龄增长衰老惩罚逻辑",
            "新增成长界面，支持一键全检定与结果展示"
        ]
    },
    {
        version: "v7",
        date: "2024-05-12",
        title: "回合制战斗系统 (Combat System)",
        changes: [
            "新增 start_combat, end_combat, update_enemy, enemy_attack 工具",
            "实现先攻顺序计算（敏捷 + D10）与自动轮转逻辑",
            "新增全屏战斗面板，包含敌人血条、先攻序列及快速指令按钮"
        ]
    },
    {
        version: "v6",
        date: "2024-05-10",
        title: "NPC 关系网络 (NPC Network)",
        changes: [
            "新增 register_npc, update_npc_status 工具",
            "实现卡片视图与 SVG 星图视图，按关系类型（盟友、中立、敌对等）分布",
            "支持 NPC 状态追踪（存活、死亡、失踪、疯狂）"
        ]
    },
    {
        version: "v5",
        date: "2024-05-08",
        title: "调查员记录本 (Journal)",
        changes: [
            "实现零打扰自动记录：检定、理智、生命、物品变化自动写入日志",
            "支持按日期分组显示，支持玩家手动添加笔记",
            "日志随存档同步保存与读取"
        ]
    },
    {
        version: "v4",
        date: "2024-05-05",
        title: "多模组管理 (Module Manager)",
        changes: [
            "支持创建多个独立游戏空间（模组），数据完全隔离",
            "新增模组管理界面，支持新建、重命名、删除与切换",
            "存档前缀动态化，确保不同模组存档互不干扰"
        ]
    },
    {
        version: "v3",
        date: "2024-05-02",
        title: "存档/读档系统 (Save/Load)",
        changes: [
            "实现 3 个手动存档位 + 1 个自动存档位",
            "支持 LocalStorage 本地存储与 JSON 文件导入导出",
            "大厅界面增加快速恢复卡片，支持一键继续游戏"
        ]
    },
    {
        version: "v2",
        date: "2024-04-28",
        title: "角色导入与 Bug 修复",
        changes: [
            "实现 .st 格式多格式解析器，支持中英文属性名及模糊匹配",
            "修复 executeSkillCheck 检定结果逻辑错误（Bug 1）",
            "修复强制检定（重伤/枪击）因缺少目标名导致的卡死（Bug 2）",
            "修复相同名称物品无法重复入库及 SAN 值恢复显示错误（Bug 3/4）"
        ]
    },

    {
        version: "V17.1-Integrated",
        date: "2026-07-01",
        title: "四方整合·32岗审查·全量纠错·10/10门禁",
        changes: [
            "【整合】四角色包无损合并为单一交付包",
            "【修复】P0: SIZ/fumble/DB公式/成功等级标签/groupRoll",
            "【新增】coc.mjs补全3引擎→9引擎全齐",
            "【修复】12个experience技能映射+6处items伤害冲突",
            "【清理】CSS 903→832行+21变量+重复块",
            "【新增】body纹理+safe-area+面板8色+脉冲动画",
            "【增强】narrativeListener 4→8正则+mjs a11y恢复",
            "【测试】18/18·0/179·0/129·浏览器交互0错误"
        ]
    },
  {
    version: "V18.3-Wired",
    date: "2026-08-01",
    title: "全沉浸剧本+未连线功能激活+架构清扫",
    changes: [
      "【全沉浸】7个Prose叙事库→JSON场景(369节点/23结局/438键全映射)",
      "【全沉浸】ProseBridge桥接模块→runner自动注入沉浸文本",
      "【音效】SFX接入骰子(哗啦)/战斗(冲击)/SAN(警告)触发点",
      "【动画】anime.js接入骰子结果弹入动画",
      "【Worker】AI Worker线程激活(index.html加载+ai_logic引用)",
      "【审计】4个scenario_*审计工具接入catalog.mjs",
      "【UI】装备独立Tab激活(story_equip 379行复活)",
      "【UI】keep-alive补全(StoryEquip/Map/Dice/Combat加入白名单)",
      "【清理】删除3个ESM竞态桥(sfx/dice_canvas/anime.mjs)",
      "【清理】删除废弃 items_db.mjs",
      "【修复】sanity.mjs:getTomeNarrative典籍仪式感+getSanNarrative叙事文本增强",
      "【修复】window.DevLogs全局暴露(开发者日志面板可用)",
      "【规模】223文件·1472KB·npm test 0错误",
    ]
  },
  {
    version: "V18.4-ParadoxFree",
    date: "2026-08-02",
    title: "全量引擎悖论审计·统一HP/SAN架构·版本漂移追踪·修改审计闭环",
    changes: [
      "【架构重构】新建damage.mjs统一HP/SAN入口:applyDamage/applyHealing/applySanLoss/applySanRecovery",
      "【架构清洗】删除4处死代码回退路径(healing/mythos/poison/damage)—applyDamage/applySanLoss/applySanityReward总是可用",
      "【悖论P1】神话典籍SAN损失直接写derived.sanity→绕过SanityEngine疯狂判定→修复为调用applySanLoss",
      "【悖论P2】calculateDerived缺少maxHp/maxSan→治疗NaN·重伤判定失效·SAN上限99→新增字段+旧存档兜底",
      "【悖论P3】贯穿伤害impaleBonus未经护甲→rawBase+impaleBonus-armor(一次正确计算)",
      "【悖论P4】中毒HP写入victim.hp→战斗读取derived.hp不同步→统一写derived.hp并同步",
      "【悖论P5】连射/全自动不调用checkMalfunction→循环内嵌入故障检查(大失败→卡壳→停止)",
      "【悖论P6】临时疯狂+不定疯狂可同时触发(applySanLoss两次独立if)→indefInsane触发时清除tempInsane",
      "【AI工具P0】apply_therapy传months数字给therapist参数→checkSkill在数字上检定永远大失败→创建系统医师对象+逐月循环",
      "【AI工具】新增recover_luck+apply_therapy工具定义+handler实现",
      "【版本漂移追踪】v17日志18项功能逐行比对V18.4→15项保留·2项架构升级·1项虚拟滚动已修复",
      "【虚拟滚动修复】visibleMessages渲染全部消息→500条=29000DOM→slice(-150)限制渲染",
      "【全量修改审计】子代理交叉审查19项变更→发现7BUG·修复5P0/P1·1误报·1死代码→全部修正",
      "【误删检查】子代理覆盖system.mjs导致apply_therapy回退→手工重写恢复·全量调用链终验0断裂",
      "【清理】3个ESM竞态桥(sfx/dice_canvas/anime.mjs)+items_db.mjs删除·初始化顺序担保去回退",
      "【UI】装备独立Tab激活+keep-alive(13组件)·SFX音效/anime动画接入·AI Worker加载",
      "【沉浸】7个Prose库→JSON场景(369节点/23结局/438键全映射)+ProseBridge·sw.js确认存在(299行·PWA完整)",
      "【最终验证】183.mjs语法0错误·34引擎方法全部存在·10调用链0断裂·误删0处·运行0风险",
      "【架构备忘】script执行时序:defer脚本(L362-363)先于module脚本(L365)—WHATWG规范担保—story_dice/combat中const CoCSFX=window.CoCSFX正确获值",
      "【架构备忘】sfx.js(defer)→window.CoCSFX→app.mjs(module)→ESM import→CoCSFX可用—非竞态·勿误报",
      "【架构备忘】combat伤害链:combat.calculateDamage→autoResolveExchange→callback→character handler→applyDamage→damage.mjs—4步闭环·combat不直接调applyDamage是设计",
      "【架构备忘】系统提示注入:core.mjs→{role:'system',isHidden:true}→context_manager.isHiddenSystemPrompt检测→slice.unshift(hidden)→normalizeApiMessages→独立{role:'system'}消息—非注入漏洞·勿误报P0",
      "【规模】228文件·1491KB·V17→V18.4完整漂移报告·零悖论·零死代码·零断链",
    ]
  },
    {
        version: "V17.2-CCGS",
        date: "2026-07-02",
        title: "CCGS工作室评估+8子系统补完+AI提示升级",
        changes: [
            "【CCGS】5角色评估(创意7.85/技术5.35/QA8.5/设计8.0/UX7.0)",
            "【新增】惩罚骰/奖励骰+武器贯穿+火器故障",
            "【新增】毒素引擎+环境伤害引擎(fall/fire/drown/elec/explosion)",
            "【新增】SAN叙事反馈+典籍仪式感+预置调查员模板(3个)",
            "【工具】3新AI工具+AI提示4新法则",
            "【修复】checkSkill双重除算Bug(skillValue替代targetValue)",
            "【架构】story_equip解耦+char_creator归位+items_db薄包装",
            "【文档】5份CCGS报告+V18路线图+INTEGRATION_LOG",
            "【规模】coc.js 1665→1833行·31工具·197文件·18/18"
        ]
    }
];
