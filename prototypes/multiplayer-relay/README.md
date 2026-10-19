# 原型：联机中转服务程序（ADR-0001）

> PROTOTYPE — NOT FOR PRODUCTION. 正式实现按 ADR-0001 在 `server/` 重写，不得从这里复制或引用。

## 状态

**Concluded（2026-10-16）**：服务程序一侧的规则全部成立；三档连接都能打开游戏并建立联机连接。
守秘人浏览器一侧（过滤出口、快照生成、玩家视图）不在本原型范围，留给系统 17、18。

## 要验证的假设

1. 一个**不读消息内容**的中转程序，仍能执行 ADR-0001 的全部规则：以连接身份覆盖 `from`、校验 `kind` / `to`、
   `to: 'all'` 只许系统消息、按收件人连续编号 `dseq` 并补发、守秘人刷新（新 `epoch`）后请求快照、邀请码重置与踢人。
2. 暗骰在守秘人浏览器按人过滤后，游客设备收到的原始字节里没有数值。
3. 证书"保证能玩、不限制游玩"：守秘人本机地址、自签 https、普通 http 三档都能打开游戏大厅并连上联机。

## 如何运行

```bash
cd prototypes/multiplayer-relay
npm install
npm test                      # 11 项服务程序规则检查（Node，无需浏览器）
npm start                     # 手动试玩：守秘人 http://localhost:8080，玩家 https://<局域网IP>:8443 或 http://<局域网IP>:8081

# 三档浏览器检查（需要 src/ 的依赖与 Chromium）
cd ../../src && npm ci && cd -
LAN_IP=<本机非回环地址> CHROMIUM_PATH=<可选，chromium 路径> node tier_check.mjs
LAN_IP=<本机非回环地址> CHROMIUM_PATH=<可选，chromium 路径> node browser_play.mjs   # 三窗口联机试玩

# 手动在电脑浏览器里试玩：npm start 后
#   守秘人：http://localhost:8080/__proto/play.html?role=keeper   （页面会显示玩家链接与开发者链接）
#   玩家：  把链接里的 localhost:8080 换成 <局域网IP>:8081（http）或 <局域网IP>:8443（https）后在其他窗口 / 设备打开
```

需要 `openssl` 命令（首次启动时生成自签证书到 `.cert/`，已加入 `.gitignore`）。

## 结果

### 服务程序规则（`npm test`，11/11 通过）

| 检查 | 结果 |
|---|---|
| A 走自签 https、B 走普通 http 都能加入，角色为 guest；D 凭房间密钥为 developer | PASS |
| 新成员加入时，服务程序请守秘人浏览器为其生成快照 | PASS |
| 暗骰：开发者收到数值，游客只收到占位，原始字节里也没有数值 | PASS |
| 游客伪造 `from: 'keeper'` 发 `state`：被拒绝，其他人收不到 | PASS |
| 游客的请求送达守秘人，`from` 被改写为游客自己的 memberId | PASS |
| 玩家不能直接发消息给其他玩家 | PASS |
| 守秘人用 `to: 'all'` 发叙述被拒绝 | PASS |
| 断线重连：补发错过的 2 条，`dseq` 连续 | PASS |
| 守秘人刷新（新 `epoch`）：为所有成员请求新快照 | PASS |
| 重新生成邀请码后旧码失效；被踢成员的令牌失效 | PASS |
| 游客不能使用管理操作 | PASS |

### 三档连接（`tier_check.mjs`，Chromium，截图在 `evidence/`）

| 档位 | 安全上下文 | 离线缓存（Service Worker） | 剪贴板 | 大厅显示 | 联机连接 |
|---|---|---|---|---|---|
| 守秘人 `http://localhost` | 是 | 已注册 | 可用 | 是 | 成功 |
| C. 局域网普通 http | 否 | 不可用 | 不可用 | 是 | 成功 |
| B. 自签 https（用户点"继续访问"） | 是 | **未注册**（"SSL certificate error"） | 可用 | 是 | 成功 |

### 网页端三窗口试玩（`browser_play.mjs`，7/7 通过，截图 `evidence/play-*.png`）

测试页 `play.html` 是一个只为原型做的极简联机页面（游戏本身还没有联机界面），由服务程序在 `/__proto/play.html` 提供。
三个 Chromium 窗口同时打开：守秘人（`http://localhost`）、游客（局域网普通 http）、开发者账号（自签 https）。

| 检查 | 结果 |
|---|---|
| 三个窗口都加入了同一房间 | PASS |
| 玩家加入后收到守秘人发来的当前场景 | PASS |
| 游客的请求出现在守秘人窗口 | PASS |
| 开发者账号窗口看到暗骰数值 | PASS |
| 游客窗口只显示"守秘人进行了一次暗骰"，没有数值 | PASS |
| 公开检定三方看到同一个数值 | PASS |
| 游客伪造守秘人广播被拒绝，开发者窗口没收到 | PASS |

## 发现（写入正式设计）

1. **规则可以在不读内容的前提下执行。** 中转程序只看 `room` / `kind` / `to` 与连接身份，就能拦住冒充与越权；ADR-0001 的拓扑成立。
2. **静态服务必须带正确的 MIME 类型。** 第一次运行时页面完全打不开：浏览器拒绝加载没有 JavaScript MIME 类型的 ES 模块
   （`.mjs` 必须是 `text/javascript`）。正式服务程序必须为 `.mjs` / `.js` / `.css` / `.json` / `.svg` 等设置 `Content-Type`。
3. **自签档确实没有离线缓存，但能玩。** 与审查 F8 的判断一致；按作者"兼容优先"的决定，这一档保留。
4. **http 档下剪贴板不可用。** 对应 ADR-0001 风险中记录的"复制结局回放静默失败"，正式实现需改为检测 + 降级。
5. **补发需要客户端记住自己的最后 `dseq`**，不能从当前收件箱推算（测试脚本第一次就在这里出错）。系统 17 的客户端设计要把它作为持久状态。
6. **分享给玩家的链接必须用局域网 / Tailscale 地址。** 测试页从守秘人页面的地址生成邀请链接，结果是 `localhost`，
   玩家拿到也打不开。正式实现应由服务程序告诉守秘人页面"玩家可用的地址"（局域网 IP、Tailscale 名），并按三档分别给出链接。
7. **未验证：** 真实手机（iOS / Android）上的三档表现、mkcert 根证书安装流程、Tailscale 地址、热点下 IP 变化。这些需要在实机上试。

## 对 ADR-0001 的意义

服务程序一侧的"Validation Criteria"中可在本机验证的项已通过（伪造 `from` 被拒、断线补发、守秘人刷新后快照、三档可加入）。
仍需实机验证的项见发现 6；守秘人浏览器一侧的过滤与快照由系统 17、18 实现后验证。
建议在实机验证通过后执行 `/architecture-decision accept ADR-0001`。
