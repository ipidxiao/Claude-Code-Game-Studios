# CoC 7th Engine — 版本变更说明

## V18.8-ParadoxFree (2026-10-18) — R31.3 结局与行动菜单

- 修订号 R31.3，产品号保持 18.8.0，存档结构保持第 9 版
- 结局面板写明是哪个结局（如「结局：封印井口」）和掌握证据的多少，不再显示内部编号与代码；完整记录可点「复制完整记录」
- 结局前若还有没掷的检定（如阁楼的 SAN 检定），结局会等它掷完再出现，不再被理智损失挤到上面
- 存档栏与剧本标签也写明结局名
- 「行动」改为列表式菜单：从按钮向上展开，每个选项完整显示，需要检定的注明技能

## V18.8-ParadoxFree (2026-10-18) — R31.2 剧情去出戏

- 修订号 R31.2，产品号保持 18.8.0，存档结构保持第 9 版
- 剧情正文里不再出现"引擎已就绪""下方会出现可选行动""教程教你的…""写进线索板""回主线"之类谈论游戏本身的句子
- 去掉了为凑字数而反复出现的套话段落（同一句话在一个剧本里出现几十上百次）和误露的内部编号（如 listen_check）
- 原先只有一两句的支线场景改写成完整的小段落；选项不再统一缀着"保持警惕""留意周围动静"
- 教程剧本改名为「哈特利老宅·暗夜初探」，两个结局补上结局标记
- 联机服务：手机锁屏期间漏收的消息，重连后会补发；一键准备脚本会安装 OpenSSL 与 Tailscale

## V18.8-ParadoxFree (2026-10-18) — R31.1 独立审计修订

- 修订号 R31.1，产品号保持 18.8.0，存档结构保持第 9 版
- 暗骰：AI 检定后先结算、再分几段叙述时，每一段都隐去暗骰数值（原先只隐去紧接检定的那一条消息，可能是没有正文的结算轮）
- 调查员身份：两台设备时钟不一致时，你在本机做的合并 / 拆分仍然生效；没能生效时面板会如实提示，不再显示"已拆分"
- 拆分后再并给第三人、再拆分，存档都能恢复；"检查全部存档"期间另一个页面自动存档，已删除的存档不会回到合并建议里
- 骰子段用 `[叙事]`、`STORY_PHASE` 等写法结尾时，游客仍能看到叙述
- R30.3 的旧存档读入时，暗骰记录迁到对应回合的叙述上，不再丢弃

## V18.8-ParadoxFree (2026-10-18) — R31 晋级发布：联机地基与中转服务程序

- 产品号升级为 18.8.0，修订号 R31；存档结构第 9 版，旧档读入时自动升级
- 收口 R30.1–R30.5：调查员唯一编号与身份合并 / 拆分、按人过滤、暗骰与叙述隐去数值
- 新增联机中转服务程序（server/）与手机连接自检页；游戏内的开房间 / 加入房间界面在后续版本
- 说明见 docs/RELEASE_R31.md 与发布包根目录的《手机测试说明.md》

## V18.7-ParadoxFree (2026-10-18) — R30.5 身份登记收尾

- 修订号 R30.5，产品号保持 18.7.0，存档结构保持第 9 版
- "检查全部存档"更快：整次只写一次本机记录
- 已删除的存档、导入后没保存的文件不再出现在"调查员身份"的合并建议里
- 同时开着两个页面操作调查员身份，两边的决定都会保留

## V18.7-ParadoxFree (2026-10-18) — R30.4 独立审计修订

- 修订号 R30.4，产品号保持 18.7.0，存档结构保持第 9 版
- 合并、拆分、"不是同一人"三种决定都随存档保存，换设备或清除浏览器数据后按先后重建，拆分不会再被悄悄改回
- 暗骰只在描述它的那段叙述里隐去数值，其他伤害、理智损失、公开检定的数字照常显示（更正：检定后先结算、再叙述的回合，到 R31.1 才成立）
- 叙述里的骰子段整段隐去，暗骰的成败结果不再露出；暗骰被推动、原检定已滚出骰子面板时仍是暗骰

## V18.7-ParadoxFree (2026-10-17) — R30.3 独立审查修订

- 修订号 R30.3，产品号保持 18.7.0，存档结构保持第 9 版
- 合并过的调查员在换设备、清除浏览器数据或导入存档后不会再被悄悄拆开
- 拆分合并更可靠；本机存储满时会提示决定只保留到刷新为止
- 暗骰被推动后仍然是暗骰；很久以前的暗骰数值也不会在旧叙述里给游客看到

## V18.7-ParadoxFree (2026-10-17) — R30.2 调查员身份登记与暗骰写入

- 修订号 R30.2，产品号保持 18.7.0，存档结构保持第 9 版
- 同一份存档的各个副本（两处浏览器存储、导出文件）里的调查员自动是同一个编号
- 存档管理新增「调查员身份」：不同存档里的同名调查员由你确认是否同一人，合并后各存档读取时统一编号，可随时拆分
- 暗骰：AI 可以要求暗骰或只让指定调查员看到；为以后的联机，游客视图看不到暗骰数值，AI 叙述里的骰子段对游客隐藏
- 新增 identity_registry_smoke 并挂入 test:engine

## V18.7-ParadoxFree (2026-10-17) — R30.1 联机地基：调查员编号、存档第 9 版与按人过滤

- 修订号 R30.1，产品号保持 18.7.0；存档结构升到第 9 版，旧档读入时自动补齐，单人模式行为不变
- 每名调查员有唯一编号：只发一次并写入存档，旧档第一次读入时补号并写回原档，之后每次读档都是同一个编号
- 分头行动时只把移动的那名调查员记为探索过新房间（原先误记全队）
- 新增按人过滤函数（为以后的联机准备）：游客收不到守秘人提示、工具结果、暗骰数值、别人的私有线索和未探索的房间；任何人都收不到 AI 密钥
- 新增 visibility_leak_smoke 并挂入 test:engine

## V18.7-ParadoxFree (2026-10-16) — R30 晋级发布

- 产品号升级为 18.7.0，修订号 R30；存档结构保持第 8 版，旧档照常读取
- 收口 R29.65–R29.69：按旧 BUG 类型回扫、工具模糊测试与剧本遍历发现的问题全部修复
- 联网：PDF 导入不再回退 CDN；AI 接口地址只允许 https（本机除外）
- 剧本：每段剧情不再显示两遍；侧房进入检定节点不再卡死；证据不足时有退路；旧版 JSON 下载包删除
- 灯塔夜班：日志证据档随检定变化，三个结局都能走到
- 存档与回滚：切换模组、读档、工具出错回滚不再留下半新半旧的状态
- 工具与规则：骰式不再出 NaN；奖惩骰封顶两颗；超大数值不再卡死页面
- 新增 12 个 smoke 门禁；思路与验证见 docs/RELEASE_R30.md

## V18.6-ParadoxFree (2026-10-16) — R29.69 灯塔夜班证据档随检定变化

- 修订号记为 R29.69，产品号保持 18.6.0，存档结构保持第 8 版
- 灯塔夜班：判读日志改为图书馆使用检定，日志线索的证据档随检定结果变化
- 存疑、定案、铁证三个结局都能走到；检定失败也能进入日志台和终局
- 新增 night_watch_evidence_smoke 并挂入 test:engine

## V18.6-ParadoxFree (2026-10-16) — R29.68 动态压测

- 修订号记为 R29.68，产品号保持 18.6.0，存档结构保持第 8 版
- 骰式 1D0、0D6 不再算出 NaN 或多掷；超大骰数封顶，不再卡页面
- 奖励骰与惩罚骰先抵消再封顶两颗
- 精神病院治疗单次最多结算 24 个月，不再因超大月数崩溃
- 从侧房直接进入检定节点时会弹出骰盘，不再卡死；不重复正文与理智检定
- 废弃疗养院日记、失踪儿童井边在证据不足时可退回继续搜寻
- 假面嘉年华一段失败文本中的「undefined」已修正
- 新增三个 smoke 并挂入 test:engine

## V18.6-ParadoxFree (2026-10-16) — R29.67 旧版下载包删除与正文去重

- 修订号记为 R29.67，产品号保持 18.6.0，存档结构保持第 8 版
- 教程、沿海祭典、假面嘉年华、失踪儿童、无尽列车的旧版 JSON 下载包删除，只保留最新的内置剧本
- 八本长篇剧本的每段剧情不再重复显示两遍
- 测试改读内置剧本，并检查全部节点的正文只出现一次

## V18.6-ParadoxFree (2026-10-16) — R29.66 第二轮回扫

- 修订号记为 R29.66，产品号保持 18.6.0，存档结构保持第 8 版；未打发布包
- 废弃疗养院与小巷追逐的下载包同步到 ESM；包对等脚本不再把质量门盖到别的选项上
- 读档后待掷的余波检定有骰盘可点，不再卡住后续检定
- 工具出错回滚覆盖时钟、KP 状态、标记、热度、地点等，不再半新半旧
- 变形术可以指定生物外形；近战可带情境；开火可只打一发；12 个别名可通过校验
- 新增四个 smoke 并挂入 test:engine

## V18.6-ParadoxFree (2026-10-15) — R29.65 按旧 BUG 类型回扫

- 修订号记为 R29.65，产品号保持 18.6.0，存档结构保持第 8 版；未打发布包
- PDF 导入不再回退 cdnjs；任何 js 模块不得出现 CDN 域名
- AI 接口地址只允许 https，http 仅限本机；不合规时不发送密钥、不重试
- 剧本效果写了名册里没有的名字时报错，不再改打别的调查员
- 选项字段 useSeedClueQuality 不再被两张映射白名单丢掉
- 切换模组时清空关键线索路径、受阻计数和上一次检定
- 主屏图标改指向已有的 icon-192.png
- 新增四个 smoke 并挂入 test:engine

## V18.6-ParadoxFree (2026-10-14) — R29.64 同一路径收口

- 修订号记为 R29.64，产品号保持 18.6.0，存档结构保持第 8 版
- 日历只写 worldClock，KP 时间抄同一天和同一小时；剧本循环只拨末日钟
- 没点名的对抗和攻击只在恰好一个目标时代选，否则停住；掩体只看该敌人自己的状态
- 书面生命保留；没写时才用（体质+体型）/10。魔法值仍是力量/5
- 格拉基仆从和哈斯塔化身按全名进场；复活、造尸、黄印和变身走已有结算
- 伦敦剧情模块删除。旧档状态并入 kpState，战役标记清空，调查员卡保留
- 大学秘社和灯塔信号的同名旧 JSON 删除，开局只读 ESM
- 正式 ZIP 排除仓库、依赖与测试产物
- 发布包为 CoC_Engine_V18.6_ParadoxFree_R29.64_20261015.zip

## V18.6-ParadoxFree (2026-10-13) — R29.63 书面数值进入结算

- 修订号记为 R29.63，产品号保持 18.6.0，存档结构保持第 8 版
- 生成时把模板的伤害加值、体格、移动、生命和理智写入 derived；人类缺前三项时按属性带补齐
- 先攻与开场时代读当前选中的人和武器文字
- 改血同时写顶层 hp 与 derived.hp
- 敌人属性、闪避、步枪霰弹枪和冲锋枪按已有技能表读取
- 武器按全表、短表、唯一包含再模糊匹配；弹药按结算后的枪种
- 省略的对手数值改读对方；法术理智斜杠只结算右边
- 敌人没写伤害时用模板武器骰子；穿上的护甲和移动惩罚生效
- 射速 1/N、1(N)、1 or N 按字面；写了伤害的法术按该表达式
- 模板法术算已学会；幽灵生命为 0 仍在场，物理攻击无效
- 剧本追逐给调查员开速度检定；急救箱加奖励骰，吗啡做体质检定

## V18.6-ParadoxFree (2026-10-11) — R29.62 NPC 行为意图

- 场外按已有谓词取唯一最优：已有渗透标记才出卖，否则失联带走暴露最多的线索来源
- 权重不到 0.6 不写渗透标记；KP 只标盟友和线索来源；热度到 3 时可疑和中立告密
- 生命不超过最大生命一半则脱离先攻；敌对打生命严格最低的人；满血非敌对先打，受伤再谈
- 同一套规则挂进统一引擎与在线提示词；证词须带 npcId，守口只标已有线索
- 谈判接社交对抗：成功退出先攻，失败改敌对并按原攻击结算
- 队尾逃跑从队首开新轮；开战补 maxHp 与名册关系；停手和逃跑混写停手或脱离
- 敌方回合只走 enemy_attack：先过反应层再打，已逃或停手不能出手
- 开战只在 startCombat 补全；先攻与解析共用同一在场谓词
- 点名认原名；开战留下武器字段；先攻条没有 id 时按名字
- 打血和扫射认原名与在场；开战留下 weapons；手枪步枪也当远程
- 扫射结算用在场谓词；追逐和法术点名认原名；中途刷怪补行形不重开战斗

## V18.6-ParadoxFree (2026-10-10) — R29.61 发布包

- 修订号记为 R29.61，产品号保持 18.6.0，存档结构保持第 8 版
- 剧本封面按自写时长显示简单、一般、标准
- 沿海祭典的下一站在线索写明地点后才出现
- 正式 ZIP 排除仓库、依赖与测试产物
- 发布包为 CoC_Engine_V18.6_ParadoxFree_R29.61_20261010.zip，校验值记在开发日志

## V18.6-ParadoxFree (2026-10-10) — R29.60 沿海祭典搜打撤

- 沿海祭典的下一站按钮默认不出现
- 线索写明庆典广场、盐雾酒馆、神龛或潮间洞窟后，才出现该地点
- 码头、广场、神龛、洞窟可以搜查、交锋，或带着已有线索离开

## V18.6-ParadoxFree (2026-10-10) — R29.59 篇幅角标

- 剧本封面右上角显示篇幅：简单、一般、标准
- 不足 30 分钟为简单，30 至 89 分钟为一般，90 分钟及以上为标准

## V18.6-ParadoxFree (2026-10-10) — R29.58 剧本断链

- 沿海祭典的 16 间侧房可以从父节点进入
- 废弃疗养院可以封门离开，封门正文去掉生成段
- 缺风声或警察盯梢时，提示不再写成线索不足
- 雨夜码头正文补足，短模结局去掉「调查仍未结束」

## V18.6-ParadoxFree (2026-10-10) — R29.57 发布审查

- 入口不再从 CDN 加载 Vue、Chart、pdf.js、anime.js
- 设置页说明联网守秘人会把行动、角色姓名和密钥发到接口地址
- 视口覆盖安全区，页面顶部留出刘海间距

## V18.6-ParadoxFree (2026-10-09) — R29.56 入口重复导入

- 浏览器入口去掉导入后没有再读的名字
- `CoCState`、`CoCAI` 和无名字的启动导入保留
- 各模块仍由原来的引用方加载

## V18.6-ParadoxFree (2026-10-09) — R29.55 创建页经历包

- 创建页「有故事的调查员」改为使用导入的经历包数据
- 时代过滤保持原样
- 不改理智扣除公式

## V18.6-ParadoxFree (2026-10-09) — R29.54 理智提示音

- 理智冲击未陷入临时疯狂时改为调用 `window.CoCSFX.playSanWarning`
- 骰子面板去掉未使用的音效取值
- 不改理智公式

## V18.6-ParadoxFree (2026-10-04) — R29.53 验收修订

- 修订号记为 R29.53，产品号保持 18.6.0
- 斜杠与团体检定测试不再写入已拆除的窗口名
- 连射结算测试把闪避百分骰固定为大失败
- 正式 ZIP 排除仓库、依赖与测试产物

## V18.6-ParadoxFree (2026-10-04) — R29.52 团体检定不再挂到窗口

- 团体检定模块不再把自己挂到 `window.CoCGroupCheck`
- 剧本技能结算仍动态调用 `resolveScenarioCheckMessages`
- 团体检定仍不在启动时静态加载

## V18.6-ParadoxFree (2026-10-04) — R29.51 团体检定调用模块

- 剧本技能结算时动态调用 `resolveScenarioCheckMessages`
- AI 逻辑不再读取 `window.CoCGroupCheck`
- 团体检定模块仍会把自己挂到窗口，且不在启动时静态加载

## V18.6-ParadoxFree (2026-10-04) — R29.50 斜杠模块不再挂到窗口

- 斜杠模块不再把自己挂到 `window.CoCSlash`
- 玩家斜杠命令仍直接调用 `trySlash`
- AI 逻辑仍读取 `window.CoCGroupCheck`

## V18.6-ParadoxFree (2026-10-04) — R29.49 斜杠命令调用模块

- 玩家输入以 `/` 开头时直接调用 `trySlash`
- AI 逻辑不再读取 `window.CoCSlash`
- 斜杠模块仍会把自己挂到窗口

## V18.6-ParadoxFree (2026-10-04) — R29.48 开场模块不再挂到窗口

- 开场模块不再把自己挂到 `window.CoCStoryOpening`
- 进入故事页仍直接调用开场函数
- AI 逻辑仍读取 `window.CoCSlash`

## V18.6-ParadoxFree (2026-10-04) — R29.47 进故事页调用开场模块

- 进入故事页且没有进行中的剧本时直接调用开场函数
- 状态核心不再读取 `window.CoCStoryOpening`
- 开场模块仍会把自己挂到窗口

## V18.6-ParadoxFree (2026-10-04) — R29.46 线索本不再挂到窗口

- 线索本不再把自己挂到 `window.CoCLorebook`
- 扩展上下文仍使用模块导出的线索本
- 状态核心仍读取 `window.CoCStoryOpening`

## V18.6-ParadoxFree (2026-10-04) — R29.45 扩展读取线索本模块

- 扩展上下文直接使用线索本模块
- 扩展不再读取 `window.CoCLorebook`
- 线索本模块仍会把自己挂到窗口

## V18.6-ParadoxFree (2026-10-04) — R29.44 运行器不再挂到窗口

- 运行器不再把自己挂到 `window.CoCScenarioRunner`
- 大厅和创建页仍动态导入运行器模块
- 扩展收集线索时仍读取 `window.CoCLorebook`

## V18.6-ParadoxFree (2026-10-04) — R29.43 运行器加载改为动态导入

- 运行器加载器只动态导入运行器模块，启动时仍不静态加载
- 加载器不再读取 `window.CoCScenarioRunner`
- 运行器模块仍会把自己挂到窗口

## V18.6-ParadoxFree (2026-10-04) — R29.42 PDF 导入不再挂到窗口

- PDF 导入模块不再把自己挂到 `window.CoCScenarioPdfImport`
- 剧本存储仍通过模块导出做官方 PDF 一键导入
- 运行器加载器仍优先读取 `window.CoCScenarioRunner`

## V18.6-ParadoxFree (2026-10-04) — R29.41 官方 PDF 导入模块引用

- 剧本存储一键导入官方 PDF 时直接使用 PDF 导入模块
- 存储不再读取 `window.CoCScenarioPdfImport`
- PDF 导入模块仍会把自己挂到窗口

## V18.6-ParadoxFree (2026-10-04) — R29.40 远程剧本目录不再挂到窗口

- 远程剧本目录不再把自己挂到 `window.CoCScenarioRemoteCatalog`
- 剧本存储仍通过模块导出合并可下载剧本
- 存储查找官方 PDF 导入时仍读取 `window.CoCScenarioPdfImport`

## V18.6-ParadoxFree (2026-10-04) — R29.39 远程剧本目录模块引用

- 剧本存储查找可下载剧本时直接使用远程目录模块
- 存储不再读取 `window.CoCScenarioRemoteCatalog`
- 远程目录模块仍会把自己挂到窗口

## V18.6-ParadoxFree (2026-10-04) — R29.38 剧本存储不再挂到窗口

- 剧本存储不再把自己挂到 `window.CoCScenarioStore`
- 大厅、线索本、开场和运行器都使用模块导出
- 存储查找远程目录时仍读取 `window.CoCScenarioRemoteCatalog`

## V18.6-ParadoxFree (2026-10-04) — R29.37 运行器登记剧本存储

- 运行器开局和读取当前剧本不再读取 `window.CoCScenarioStore`
- 测试在导入后调用 `bindScenarioStore` 放入替身
- 剧本存储在窗口空着时仍会把自己挂上去

## V18.6-ParadoxFree (2026-10-04) — R29.36 线索本读取剧本存储

- 线索本按剧本编号直接调用剧本存储
- 存储没有该剧本时仍回退到剧本目录
- 运行器仍可用 `window.CoCScenarioStore` 作为测试替身

## V18.6-ParadoxFree (2026-10-04) — R29.35 非内置剧本查找

- 剧本目录查找已下载剧本时不再读取 `window.CoCScenarioStore`
- 剧本存储在加载完成后把查找函数登记给目录
- 线索本和运行器仍可读 `window.CoCScenarioStore`

## V18.6-ParadoxFree (2026-10-04) — R29.34 剧本目录模块引用

- 剧本存储、开场和会话清单不再读取 `window.CoCScenarioCatalog`
- 剧本目录不再挂到 `window`
- 目录查找非内置剧本时仍读取 `window.CoCScenarioStore`

## V18.6-ParadoxFree (2026-10-04) — R29.33 日志与能力系统模块引用

- 系统工具直接写入开发日志数组
- 存档摘要和剧本运行器直接调用能力系统
- 运行器使用能力系统，并在没有测试替身时使用剧本存储模块
- 剧本目录的窗口赋值仍留给存储、开场和会话清单

## V18.6-ParadoxFree (2026-10-04) — R29.32 开发日志模块引用

- 开发日志页改为直接引用日志、桌规、能力、剧本目录和创意目录
- 桌规和创意目录不再挂到 `window`
- 日志数组、能力系统和剧本目录仍保留窗口赋值，供尚未迁移的模块使用

## V18.6-ParadoxFree (2026-10-04) — R29.31 调查员创建模块引用

- 创建逻辑改为模块导出，启动时仍只创建一份
- 创建页和人物页不再读取 `window.CoCCreator`
- `window.CoCState` 继续作为唯一状态源

## V18.6-ParadoxFree (2026-10-04) — R29.30 界面辅助兼容全局

- 人物状态、聊天格式和战斗界面辅助不再赋值到 `window`
- 这些函数继续由模块导出，调用方保持原有导入
- `window.CoCState` 继续作为唯一状态源

## V18.6-ParadoxFree (2026-10-04) — R29.29 立绘与图标兼容全局

- 立绘、行动轮和理智特效不再赋值到 `window`
- 图标组件与图标对照表不再自挂载
- `window.CoCState` 继续作为唯一状态源

## V18.6-ParadoxFree (2026-10-04) — R29.28 剧情子组件兼容全局

- 人物诊断改为检查已导入的装备栏组件
- 十三个剧情子组件不再赋值到 `window`
- `window.CoCState` 继续作为唯一状态源

## V18.6-ParadoxFree (2026-10-04) — R29.27 界面兼容全局

- 四个主界面不再把组件赋值到 `window`
- 确认框和存档加载层只保留 ESM 导出
- `window.CoCState` 继续作为唯一状态源

## V18.6-ParadoxFree (2026-10-04) — R29.26 存档诊断与修复

- 大厅存档页可查看每个槽位的 local/IndexedDB 时间、合法性与选中副本
- 修复缺失副本和清理损坏副本都需要确认，并先保存原文备份
- 两份都有效但时间不同的副本不会被静默覆盖

## V18.6-ParadoxFree (2026-10-04) — R29.25 旧存档升级验收

- R29.17/R29.19 真实 fixture 覆盖 local-only、IDB-only、双副本冲突与损坏回退
- 读档在 CoCState 未挂载时不再因 accessor 抛错中止恢复
- 读档只在内存迁移，不改磁盘存档格式，schema 仍为 8
- Playwright 验收刷新可见、离线启动和跨标签页同步

## V18.6-ParadoxFree (2026-10-04) — R29.24 发布候选

- 汇总 R29.20–R29.23 的存档一致性、恢复事务与壳层边界改进
- 发布说明记录已知限制、完整验证门及分阶段回滚点
- 正式 ZIP 排除仓库、依赖与测试产物，并要求在全新解压目录复验

## V18.6-ParadoxFree (2026-10-04) — R29.23 壳层全局边界

- boot 的异步视图回退与壳组件注册改用显式 ESM 依赖
- lobby/story 移除已迁移业务对象及页面局部回调的 `window` 读取
- 保留 `CoCState` 单一状态源与 `ViewLobby`/`ViewStory` 兼容自挂载
- 新增全局边界审计并纳入 `ci:smoke`

## V18.6-ParadoxFree (2026-10-04) — R29.22 模组存档视图

- 模组卡片异步聚合 localStorage 与 IndexedDB 的自动/手动槽位
- 大厅、banner 与槽位页统一使用相同副本选择结果
- storage 与 BroadcastChannel 事件触发跨标签页刷新

## V18.6-ParadoxFree (2026-10-04) — R29.21 原子读档

- 读档提交异常时回滚受影响状态，不再留下半加载游戏
- 首选副本损坏或恢复失败时自动尝试另一存储副本
- 统一 persistence 的失败提示，消除大厅/故事页重复 toast

## V18.6-ParadoxFree (2026-10-04) — R29.20 存档副本一致性

- localStorage 与 IndexedDB 按 `savedAt` 选择最新合法副本
- 同槽位写入串行化，避免自动/手动存档并发后两种存储分叉
- 修复缓存 prime 覆盖新写入及 cache miss 看不到 IDB-only 槽位的问题

## V18.6-ParadoxFree (2026-10-04) — R29.19 发布加固

- IndexedDB 事务失败不再污染 localStorage 成功状态；删除失败保持副本可见且不抛出
- 删除模组同步清理 IndexedDB，并阻止删除后的在途写入回灌
- 自动存档在离开剧情或切换模组时取消，并以 generation 防止旧回调干扰新计时器
- 新增存档一致性与版本元数据 smoke；强化 LF、Playwright CI 和发布文档门禁

## V18.6-ParadoxFree (2026-10-03) — R29.18 缺陷收口

- 修复 `pdf_import` 语法错误及 AI 队伍摘要 HP 当前值/上限混淆
- IndexedDB 降级存档现可正确报告成功，并参与槽位显示、读取与删除
- 异步 prose 加载增加会话代次保护；停止或切换剧本后不再进入旧节点
- 未知线索等级改为 fail-closed，审计与遭遇裁决统一拒绝非法门槛
- 增加 Node 22 smoke 兼容和 AI、IndexedDB、prose 竞态 Playwright 发布门禁

## V18.6-ParadoxFree (2026-10-03) — R29.17 做 F：Timeline Contract TC0–TC4

- 新增 `js/data/timeline_contract.mjs`（只读：结局回放行种类闭集与顺序契约）
- 结局回放行经契约盖章；不写 heat/flags/HP/SAN；不改热度公式与锁定 API
- `SCOPE_FREEZE_AF.status=wave_f_done`；completedWaves 含 TC；frozenWaves 为空。A–F 收口，无 G

## V18.6-ParadoxFree (2026-10-03) — R29.16 做 E：Encounter Verdict EV0–EV4

- 新增 `js/data/encounter_verdict.mjs`（只读：种子遭遇门 vs 线索档 → 未设门/未达标/达标/超额）
- 结局回放多一行裁决；不写 heat/flags/HP/SAN；不改线索档公式与锁定 API
- `SCOPE_FREEZE_AF.status=wave_e_done`；F（TC）仍冻结

## V18.6-ParadoxFree (2026-10-03) — R29.15 做 D：Session Manifest SM0–SM4

- 新增 `js/data/session_manifest.mjs`（只读组装案头/开局面：剧本面·继承·能力预览）
- 不写 heat/flags/HP/SAN；锁定 preview/pressure/DeskPref 签名不变
- `SCOPE_FREEZE_AF.status=wave_d_done`；E–F（EV/TC）仍冻结


## V18.6-ParadoxFree (2026-09-27) — R29.14 做 C：Display Pipeline DP0–DP4

- 新增 `js/data/display_pipeline.mjs`（只读组装 HUD/选项后缀/案头压力切片）
- 锁定 `pressureHudLine` / `pressureChoiceSuffix` 仍为纯格式化；不写 heat/flags/HP/SAN
- `SCOPE_FREEZE_AF.status=wave_c_done`；D–F 仍冻结


## V18.6-ParadoxFree (2026-09-27) — R29.13 做 B：PressureBus PB0–PB4

- 新增 `js/state/pressure_bus.mjs`（heat/flags 编排，无 HP/SAN，无热度公式分叉）
- `SCOPE_FREEZE_AF.status=wave_b_done`；C–F 仍冻结


## V18.6-ParadoxFree (2026-09-27) — R29.12 做 A：Capability IR0–IR4

- 落地 `CapabilityDecl` 表；`CAPABILITY_IR_VERSION=1`
- `SCOPE_FREEZE_AF.status=wave_a_done`；B–F（PressureBus 等）仍冻结，需「做 B」…


## V18.6-ParadoxFree (2026-09-27) — R29.11 runner 延后加载

- `ensure_runner.mjs`：大厅/角色创建 `await startScenarioById` 后再进剧情
- `shell_side_effects_story` 不再 eager import runner/group_check
- `story_opening` 仍经 shared `campaign_loader`；壳层主线完成


## V18.6-ParadoxFree (2026-09-26) — R29.10 壳层 Phase 4b：story UI 延后

- `shell_side_effects_story` 仅 runner 关键；`story_*` 随 ViewStory 异步加载
- `mountShellGlobals` 只保证 `CoCState`；`CoCAI`/`CoCToolHandlers` 改 ESM 后剥离
- 壳层按屏拆包主线完成（见 `docs/SHELL_SPLIT_PLAN.md`）


## V18.6-ParadoxFree (2026-09-26) — R29.9 壳层 Phase 4：收缩 window 挂载

- `mountShellGlobals` 仅保证 `CoCState` SoT，并对 `CoCAI`/`CoCToolHandlers` 做 no-clobber 兼容
- 大厅/故事/工具链多处改 ESM；剥离清单见 `SHELL_PEELED_GLOBALS`
- 下一步可选 4b：真按需 story side-effects（见 `docs/SHELL_SPLIT_PLAN.md`）


## V18.6-ParadoxFree (2026-09-26) — R29.8 壳层 Phase 3b：creator / story 异步视图

- `view-creator` / `view-story` / `view-dev-log` 均 `defineAsyncComponent`；大厅仍 eager
- `shell_side_effects` 仍 eager（KP/runner/Story* 挂载）；见 `docs/SHELL_SPLIT_PLAN.md` 取舍
- 下一步 Phase 4：去 window 挂载 / 可选真按需 side-effects


## V18.6-ParadoxFree (2026-09-26) — R29.7 壳层 Phase 3 pilot：异步开发者日志

- `view-dev-log` 改 `defineAsyncComponent` + 动态 `import()`（loading/error 回退）
- lobby / creator / story 仍 eager；SW 仍预缓存 `dev_log_view.mjs`
- 下一步 Phase 3b：creator / story 异步（见 `docs/SHELL_SPLIT_PLAN.md`）


## V18.6-ParadoxFree (2026-09-26) — R29.6 壳层 Phase 2：按屏 side-effects

- `shell_side_effects_{lobby,shared,story}.mjs` 静态边界；barrel 仍 eager 由 `app.mjs` 引入
- 行为/window 挂载/`CoCState` SoT 不变；下一步 Phase 3 懒加载（见 `docs/SHELL_SPLIT_PLAN.md`）


## V18.6-ParadoxFree (2026-09-26) — R29.5 壳层 Phase 1：boot 拆分

- 新增 `js/boot/`：`shell_side_effects` / `mount_shell_globals` / `register_shell_components`
- `app.mjs` 瘦身为编排入口；有意 `window.*` 挂载保留（含 `CoCState` SoT）
- 计划见 `docs/SHELL_SPLIT_PLAN.md`（下步：按屏 side-effects 边界 → 懒加载）


## V18.6-ParadoxFree (2026-09-26) — R29.4 软债 B：healing 避环 + 残余 ESM

- `live_game_state.mjs`：healing 读世界时钟不再经 Accessor（断环）
- handlers / 故事 UI / gameplay / persistence / ai_logic / extensions：`CoCEngine`·`CoCItemDB`·KP 热点改 ESM
- 壳层 `app.mjs` 挂载与 Vue `CoCState`、剧本 Store/Catalog 仍 window（多周拆包）


## V18.6-ParadoxFree (2026-09-26) — R29.3 软债 B：UI Accessor ESM

- 故事 UI / 大厅 / 创建器 / 开发者日志等改 `import { CoCStateAccessor }`，不再经 `window.CoCStateAccessor`
- `rule_check` / `persistence` / `pdf_import` / `char_creator` / `runner` 同步；`healing` 为避环仍 window
- `CoCState` Vue 核与 `app.mjs` 壳挂载未动


## V18.6-ParadoxFree (2026-09-26) — R29.2 软债 B：KP handlers ESM + Accessor + soft-fail

- `combat` / `clues` / `npc` / `map`：`getKpEng` 直连 ESM `getKpEngine`（不再读 `window.CoCKpConfig`）
- Accessor：`CoCEngine` / `CoCItemDB` 优先 ESM；`CoCState` 仍 window 懒绑（Vue 核）
- `ai_prompt_config`：删除已无用的 `window.*` soft-fail 回退


## V18.6-ParadoxFree (2026-09-26) — R29.1 软债：神话物 SAN + window/KP ESM 切片

- 神话物品 `update_inventory`：接触者经 `resolveActor`（`target_name` 等别名）或界面 `selectedCharIndex`（须该位 isActive）；否则中文拒识且不发放；不再静默 `isActive`/`roster[0]`
- `inventory` / `kp_config.getKpEngine`：热路径改 ESM（`CoCItemDB`、`KpExecutionEngine`）；壳层 `window.*` 大债务仍见 DevLog remaining
- 测试：`resolve_actor_smoke` 扩神话物 SAN 用例


## V18.6-ParadoxFree (2026-09-19) — OPEN 1–16 + 目录猎虫整摞修复

- 追逐：`start_chase` 不再凭空合成猎物；须在 roster / 战斗敌人 / `npcRegistry`（或 `npcs`）中存在；战斗进行中拒开追逐
- 战斗：`start_combat` 与追逐互斥；字符串敌人归一为 `{name,hp:10}`；`end_combat` 非活跃拒假成功；`update_enemy` 接受绝对 `hp`、拒无变化、`maxHp` 缺省显示 `—`
- 战技：`grapple/shove/disarm/knockdown` 同火/近战拒已击败目标；`dive_for_cover`/`stand_up` 清零 `aimBonus`
- `fire_weapon`：在已给 `enemy_name` 时，遗留 `target_name` 可作射手名（不再与敌人混淆）
- 系统：`apply_poison` 强制 `potency`；环境伤害接受 `kind`；`apply_disease` 接受 `disease_name`；`bonus_penalty_roll` 接受 `bonus`/`penalty`/`character_name`；`social_opposed` 接受 `opponent_name` 且必须指定对手
- 骰/神话：`opposed_roll` 接受 `skill`；`start_ritual`/`cast_spell` 接受 `spell`，错误无 `undefined`
- 库存：结构化 `items[{qty≤0}]` 跳过不发放（剧本 effects 路径此前已拦）
- 地图/线索：`update_room`/`set_position` 缺 `room_id` 明确报错；`add_clue` 缺 `type` 拒写；`create_map` 字典形 rooms 归一为数组且不崩溃；schema 房间不再强制 `x`/`y`
- 测试：`tests/open_stack_dir_smoke.mjs`；同步修正 chase/update_enemy 旧烟测期望


## V18.6-ParadoxFree (2026-09-19) — 猎虫四修（group/击败/opposed/alert）

- `group_roll`：接受 `names` / `character_names` / `targets` 等别名；有非空名单时不再静默回落全体 isActive
- `fire_weapon` / `melee_attack`：拒已击败（isDefeated 或 hp≤0）目标，检定前返回中文错误
- `opposed_roll`：`character_name`（及 `name`）作 `char_name` 别名
- `system_alert`：须非空 string；拒 `0` / `false` 等非字符串


## V18.6-ParadoxFree (2026-09-19) — Phase 1–3 猎虫六修

- lore：`budgetChars`/`loreBudgetChars: 0` 不再被 `|| DEFAULT` 吞掉；`buildLoreTextBlob` 去掉 scenarioTitle 防神话键误触发
- slash：仅已知命令（help/state/roll/lore/give 及中文别名）拦截；`/1920年…` 等叙事放行；`/state` HP 缺省显示 `—`
- extensions：setup 抛错不留僵尸；unregister 自动 off 掉 setup 内 `ctx.on` 监听


## V18.6-ParadoxFree (2026-09-19) — Phase 3 扩展壳 + 斜杠调试 + Lorebook 扩面

- 新增 `js/core/extensions.mjs`：`getGameContext` / `on|off|emit` / `registerExtension`；`window.CoCExtensions`
- 新增 `js/tools/slash.mjs`：`/help` `/state` `/roll` `/lore` `/give`；聊天输入 `/` 拦截；`window.CoCSlash`
- 热点 emit：`combat:start`（gameplay）、`save:load`（persistence）、`chapter:change`（runner）、`lore:injected`（lorebook）
- Lorebook：除 `deep_one_shadow` 外，其余内置剧本均补 5–12 条（mjs + packages 孪生）；`tests/slash_extension_smoke.mjs` + lore smoke 扩面


## V18.6-ParadoxFree (2026-09-19) — Phase 2 Lorebook 预算注入

- 新增 `js/ai/lorebook.mjs`：按关键词/地点/章节/剧本筛选条目，默认预算 2000 汉字，写入 `## 相关设定`
- 接入 `CoCAIPromptConfig.buildSystemInjection`；`aiSettings.loreBudgetChars` 可覆写；调试字段 `gameState.__loreLastInjected`
- 试点：`deep_one_shadow` 内置 9 条 lore（mjs + packages 孪生）

## V18.6-ParadoxFree (2026-09-19) — Phase 1 统一角色/字段解析

- 新增 `js/tools/resolve.mjs`：`resolveActor` / `resolveActorFromArgs` / `resolveEnemy` / `requireField`
- 未知非空姓名不再静默回落到 isActive；省略名仅在 `allowActiveFallback` 或 `fallbackActor`（如治疗自疗）时回退
- 战斗/系统/角色/神话/骰/追逐/NPC handlers 迁入该层；`tests/resolve_actor_smoke.mjs` 覆盖 Ghost 拒识与 omit-healer

## V18.6-ParadoxFree (2026-09-19) — OPEN 1–24 挂账修复

- 战斗：aim/reload/stand/dive/melee 未知角色拒落 isActive；fire_weapon 近战装备改指 melee_attack；update_enemy 接受 enemy_name 别名；enemy_attack 须 target_name
- 神话/治疗：start_ritual 须 caster_name；continue_ritual 未知施法者不推进他人仪式；apply_enchantment/study_tome/connect_backstory 缺参无 undefined；apply_healing 未知施治者报错
- 社交/骰/追逐：social_opposed 未知 kind 报错；group_roll 报告未知姓名；start_chase 未知追赶者报错；chase_action 须 actor_name；schema 补 set_crew
- 物品/NPC：consume 仅精确匹配；register_npc 关系默认「未知」；update_npc_status 须名称；extinguish 未知目标报错

## V18.6-ParadoxFree (2026-09-19) — OPEN 1–57 整摞修复

- 战斗：aim/enemy_attack/burst KP 的 advanceTurn 仅在 combat.active；start_combat 拒空敌人；update_enemy 优先活体同名；point-blank 火器用射击技能；break_free 须已擒抱；set_combat_situation 校验 distance 且部分更新不抹掉 outnumbered/surprise
- 角色/成长：rollImprovement 取 live 技能；applyAging 刷新 derived.maxHp；UCS 拒空更新；recoverLuck 先 sync 且封顶；spendLuck 英→中档；connect_backstory 每 key 一次；canTreat 拒死者；EDU 提示改为 >EDU
- 工具守卫：system_alert/group_roll/opposed/bonus_penalty/add_clue/roll_dice/social_opposed/trigger_affliction/fire·burst·maneuver 未知行动者报错
- 时间/追逐：advance_time 跨夜小时只拨钟不跑日管线；chase_action 未知动作报错、end 须进行中；未知载具 id 不再静默汽车
- 剧本/存档：atmosphere 字符串安全写入；items qty≤0 不发放；PDF 稳定 id；audit 悬挂 choice.next；快照含 clueBoard；load 清 lastSkillCheck/skillsUsedThisSession；仪式进行中拒重启
- UI：HP SoT（derived.hp）；story_map svg 护栏；NPC/线索 id-less 选择；mark_clue 备注文案；selectedCharIndex 按完整 roster；装备/仓库索引校验
- 神话：study_tome 认 object.name、已浏览不重复 SAN；cast_spell 容忍 combat=null；reality 未知神话回落不可名状之物；learnSpell 拒空名


## V18.6-ParadoxFree (2026-09-13) — 晋级发布

- OPEN 软缺陷整摞：dispel 空驱散不扣 MP；link_clues 校验线索存在；register_npc 拒空名；mark_clue_status 接受 clue_id；consume_inventory 事务化；骰盘推动写入 skillsUsedThisSession；resist_poison 无毒早退；dodge 与 fight_back 同需 combat_react；derived.luck 与 attrs.LUCK 同步；pulp→pulp_lite 别名
- 存档迁移：scenarioRunner / atmosphere / clueBoard / sceneMap 非法类型强制归一，防跨档泄漏与 TypeError

- apply_deprivation：sleep/未知 kind 明确报错（仅 hunger/thirst），不再静默折成饥饿
- treat_disease：未染病早退，不再空掷医学检定
- start_chase：进行中拒绝重入（须先 chase_action end），避免脏 chase_speed 队列
- fire_weapon：背包 count≤0 明确视为无弹（不回落到弹匣上膛）
- parseItemData：弹药名优先于武器模糊匹配，避免误判为枪械
- 弹药数量：识别 `×N` / `xN` / `*N`（如 `.38左轮弹药×12`）
- UI 取消强制弹药装填：背包弹药直接供开火，移除行囊「装填」按钮
- `spawn_npc`：npc_templates 优先，未命中则回退 creatures_summary（双表桥，不合并数值）
- 版本号 18.5.0 → **18.6.0**（页脚水印、存档契约、SW CACHE_NAME）
- 冻结 V18.5 R1–R28：规则书对齐、骰盘收口（调查员掷、引擎结算）、神话物品 SAN、溺水 CON、教育成长等
- 发布包：源码 + vendor + 已构建 SW，不含 node_modules

## V18.4-ParadoxFree Gate (2026-08-03) — 旁白闸门初版 · 开放 P0

### Shipped
- 旁白 / 引擎 / KP 职能分工写入 `ROLE_DIVISION_RULES`
- `partitionNarrationByJudgment` + `deferredNarrative` / `flushDeferredNarrative`
- 场景旁白保留换行；SW `coc-engine-v18.4.1-judgment-gate`

### Open P0 — JUDGMENT_KEYWORD_GATE（已加固）
- **已处理**：句级截断、节点 `skillCheck`/`branch` 软闸、deferred UI 提示
- 详见开发日志 **V18.4 Gate**（2026-08-15）

---

## V18.4-ParadoxFree verification hotfix (2026-08-02) — 真 BUG 复核修复

对照开发日志后核实：若干「已修复」条目未真正落地或属规则误判。本批只修真 BUG。

### Role division（旁白 / 引擎 / KP）
- **旁白**：场景与故事（**保留氛围灌水与原文换行**）；含判定句的段落标记后截断，检定完成再释放后续
- **引擎**：检定提示与数值结果（如「请进行【××】检定」）
- **KP**：引擎结果之后宣布叙事后果，并 `flushDeferredNarrative`
- 规则源：`js/data/narrative_prose.mjs` → `ROLE_DIVISION_RULES` / `partitionNarrationByJudgment`

### Fixed (confirmed true bugs)
- **工具返回 `[object Object]`**: `ai_logic.normalizeToolResultContent` + `bonus_penalty_roll` / `recover_luck` / `apply_therapy` 改为返回字符串
- **apply_therapy 假 75%**: 医师改为 `skills: { '精神分析': 75 }`（`getSkillValue` 不读 `derived.psychoanalysis`）
- **ProseBridge 漏挂**: 补登记 carnival / coastal / lighthouse / missing_child / train / university（共 8 本）
- **贯穿伤害**: `checkImpale` 改用 `maxDice`（7e 最大武器伤害），非随机 `parseDice`
- **P6**（既有）: `goToNode` 使用 `getScenario()`；首节点等 prose 加载

### Clarified (not bugs / do not "fix")
- **SAN 临时+不定可同次触发**: 符合 CoC 7e，**不应**在 `indefInsane` 时清除 `tempInsane`；旧 CHANGELOG「互斥已修」为审计误判
- **group_check `▸ [角色] 选项`**: 多人行动确认回显，非刷屏噪音

### Regression
- `tests/tool_result_normalize_smoke.mjs`
- `tests/prose_bridge_coverage_smoke.mjs`
- `tests/impale_max_damage_smoke.mjs`
- `tests/scenario_narrative_push_smoke.mjs`

---

## V18.4-ParadoxFree hotfix (2026-08-02) — P6 沉浸文本

### Fixed
- **P6 本机剧情无沉浸文**: `runner.goToNode` 误用未定义的 `scenario` → `ReferenceError`，`pushKp` 从未执行；改为 `getScenario()`。
- **首节点散文时序**: `startScenario` 等待 `loadProseBank` 后再进入 `startNode`，首段可富化为长文。
- **回归**: `tests/scenario_narrative_push_smoke.mjs`（assistant 叙事 ≥1、choices>0）

---

## V18.4-ParadoxFree (2026-08-02) — 全量引擎审计·统一架构·版本漂移追踪·修改闭环

### 审计方法论
- **引擎悖论审计**: 11引擎交叉验证CoC 7e规则一致性, 发现6项悖论(2项误报, 4项真BUG)
- **运行时悖论审计**: 状态/引擎/AI调度交叉验证；「SAN双触发互斥」后经规则复核为**误判**（见 verification hotfix）
- **AI-引擎对齐审计**: 35个AI工具 vs 52个引擎方法覆盖检查, 发现2个缺口(recoverLuck/applyTherapy)
- **版本漂移追踪**: v17日志18项功能逐行比对V18.4代码, 发现3项丢失(虚拟滚动/rAF批处理/物品弹窗), 最终确认1项真实丢失已修复
- **修改审计闭环**: 子代理审查19项变更→发现7BUG→修复5项→监督修正→全量调用链终验0断裂

### 架构重构
- **统一HP/SAN入口**: 新建 `damage.mjs`(129行), 提供 `applyDamage/applyHealing/applySanLoss/applySanRecovery` 四个权威方法
- **死代码清洗**: 删除healing/mythos/poison/damage中4处永不到达的回退路径(初始化顺序担保SanityEngine先于DamageEngine)
- **调用链**: combat→callback→character handler→applyDamage→damage.mjs→MajorWound/Dying (完整4步闭环)

### 引擎悖论修复 (经核查)
- **P1 神话SAN绕过**: mythos.mjs 3处直接写derived.sanity→绕过SanityEngine疯狂判定→改为调用applySanLoss
- **P2 calculateDerived缺字段**: 缺少maxHp/maxSan→治疗NaN·重伤判定失效→新增字段+旧存档兜底(maxHp||hp||10)
- **P3 贯穿护甲**: impaleBonus未经护甲→改为rawBase+impaleBonus-armor(一次计算)；贯穿骰值后改 `maxDice`（verification hotfix）
- **P4 中毒HP不同步**: 写victim.hp而战斗读derived.hp→统一写derived.hp
- **P5 连射无故障**: resolveBurstFire不调用checkMalfunction→循环内嵌入(大失败→卡壳→break)
- **P6 SAN「互斥」**: ~~indefInsane时清除tempInsane~~ → **撤销为误判**；CoC 7e 允许同次大损同时触发临时与不定疯狂

### AI工具修复
- **apply_therapy**: 系统医师须为 `skills:{'精神分析':75}`（早期 `derived.psychoanalysis` 为假修复，见 verification hotfix）
- **recover_luck** / **bonus_penalty_roll** / **apply_therapy**: 须返回字符串；边界另有 `normalizeToolResultContent`

### 版本漂移追踪 (V17→V18.4)
- sw.js: 存在(299行,PWA完整) — 前报缺失为工具路径误判
- set_atmosphere: V18 KP引擎内部接管(升级)
- modulepreload: ESM原生82模块导入替代(升级)
- 虚拟滚动: visibleMessages渲染全部→slice(-150)修复 (+3行)
- rAF批处理: pushMessageBatched存在但零调用(死代码, 虚拟滚动修复后不再需要)
- 物品详情: 已实现为APEX-style tooltip(非弹窗), 功能等同

### 全量修改审计闭环
- 子代理交叉审查19项变更→发现7BUG→部分条目后经复核为未落地或误判（见 verification hotfix）
- 终验目标: 真 BUG 有回归；伪 BUG 不引入错误互斥

### 数据
- 内置 prose 银行经 ProseBridge 登记 8 本（曾漏挂 6 本，已补）
- npm / 专项 smoke：tool normalize · prose coverage · impale max · narrative push

---

## V18.3-Wired (2026-08-01)

### 全沉浸剧本
- **7个Prose叙事库→JSON场景**: tutorial(62节点), carnival_of_masks(52), coastal_festival(79), lighthouse_signal(49), missing_child(37), train_to_nowhere(39), university_occult(51) — 共369节点·23结局·438个Prose键全映射
- **ProseBridge桥接模块**: runner自动注入Prose沉浸文本, 异步懒加载+同步缓存, 多键回退匹配
- JSON场景8→15个(8原版+7新生成), 全沉浸场景从1个增至8个

### 音效·动画·Worker
- SFX接入骰子(playDiceClatter)/战斗命中(playDanger)/SAN冲击(playSanWarning)触发点
- anime.js接入骰子结果弹入动画(scale+opacity 300ms easeOutCubic)
- AI Worker线程激活(index.html加载worker_client.js+ai_logic引用)

### UI增强
- 装备独立Tab激活(story_equip 379行复活)
- keep-alive补全: StoryEquip/Map/Dice/Combat加入白名单(13组件)
- 切Tab时战斗/骰子/地图/装备状态不再丢失

### 审计·清理
- 4个scenario_*审计工具接入catalog.mjs, window.__CocAuditSuite暴露
- 删除3个ESM竞态桥(sfx/dice_canvas/anime.mjs) — 零消费者+竞态风险
- 删除废弃items_db.mjs — 已合并到items.mjs
- sanity.mjs: getTomeNarrative典籍仪式感+getSanNarrative叙事文本增强
- window.DevLogs全局暴露修复

### 数据
- 223文件·1472KB·npm test 0错误

---

## V17.2-CCGS (2026-07-02)
- CCGS工作室5角色评估(加权7.08/10)
- 新增: 惩罚骰/奖励骰 + 武器贯穿 + 火器故障 + 毒素引擎 + 环境伤害引擎
- 新增: SAN叙事反馈 + 典籍仪式感 + 预置调查员模板(3个)
- AI提示升级(4条新法则)
- checkSkill双重除算Bug修复

## V17.1-Integrated (2026-07-01)
- 四方包(PROG/ART/QA/DESIGN)无损合并
- 32岗并行审计 → 10/10门禁
- 44项修复: fumble规则/DB公式/XSS安全/面板颜色/CSS变量/SW缓存
- 18/18测试 · deep_verify 0/179 · bug_hunt 0/129

## V18.0-Modular (2026-06)
- 完全ESM迁移: 186个.mjs模块, 11个独立引擎文件
- coc.js从1833行拆分为21行组装层
- 窗口全局变量全面替代为显式依赖
- KP执行引擎 + 场景运行器 + 10个内置剧本

## V16.5 (2026-05)
- IIFE架构 · 5个核心引擎 · 58个script标签
- Vue 3 + Bootstrap 5 · localStorage持久化
