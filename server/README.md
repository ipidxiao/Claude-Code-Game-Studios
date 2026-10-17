# 联机中转服务程序

真人守秘人辅助模式用的中转程序（`docs/architecture/adr-0001-multiplayer-relay-keeper-authority.md`，
设计见 `design/gdd/server-and-room.md`）。它托管游戏页面、开房间、按收件人转发消息、断线补发；
**不运行规则、不调用 AI、不读消息内容**，守秘人浏览器是唯一的权威。

> 目前只有服务程序本身。游戏页面里的"开房间 / 加入房间"界面与状态同步（系统 17、19）还没做，
> 所以现在启动它只能当作本机网页服务器使用，联机功能要等系统 17 完成。

## 运行

需要 Node.js 20 或更高版本。

```bash
cd server
npm install
npm start
```

启动后会打印：

- **守秘人**：`http://localhost:8080`——和以前用 `python -m http.server 8080` 打开的是同一个地址，旧存档、AI 密钥照常可用。
  启动前先关掉原来的 `python -m http.server`，否则端口被占用。
- **玩家**：局域网 / Tailscale 地址，三档任选，都能玩：

  | 档位 | 地址 | 玩家要做的 | 差别 |
  |---|---|---|---|
  | A. mkcert 证书 | `https://<地址>:8443` | 在手机上信任 mkcert 根证书 | 有离线缓存 |
  | B. 自签证书 | `https://<地址>:8443` | 浏览器提示不安全时点"继续访问" | 无离线缓存 |
  | C. 普通 http | `http://<地址>:8081` | 无 | 无离线缓存，热点内不加密 |

## 证书

- **A 档**：把 mkcert 生成的证书放到 `server/.cert/mkcert.pem` 与 `server/.cert/mkcert-key.pem`。
- **B 档**：没有 mkcert 证书时，首次启动用 `openssl` 自动生成自签证书（`server/.cert/self*.pem`）。
- 没有 `openssl` 时不开 https 端口，只提供 C 档，启动时会说明。

## 线上（Tailscale）

守秘人和玩家加入同一个 Tailscale 网络后，在守秘人电脑上运行：

```bash
tailscale serve --bg http://localhost:8081
```

玩家用 Tailscale 给出的 https 地址打开即可。

## 配置

都可以用环境变量覆盖（`config.mjs`）：`KEEPER_PORT`（8080）、`HTTP_PORT`（8081）、`HTTPS_PORT`（8443）、
`REPLAY_LIMIT`（200）、`PING_INTERVAL_MS` / `PONG_TIMEOUT_MS`（20000 / 20000）、`MAX_MESSAGE_BYTES`（4 MiB）、`MAX_MEMBERS`（8）。

房间信息保存在 `server/data/room.json`（只存哈希，不存明文凭据），重启后房间和玩家链接继续有效。

## 测试

```bash
npm test     # 房间规则 14 项 + 真实套接字 3 项
```
