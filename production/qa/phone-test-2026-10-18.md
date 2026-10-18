# Real-device phone test — 2026-10-18

System 15 (relay, `design/gdd/server-and-room.md`); ADR-0001 acceptance precondition (fix list item 8).
Tester: the author. Keeper: Windows PC, Chrome, `http://localhost:8080`. Player: iPhone, Safari, same Wi-Fi.

## Builds

| Package | Commit | Used for |
|---|---|---|
| `CoC_Engine_V18.8_ParadoxFree_R31.1_20261018_306fe1e.zip` | 306fe1e | prep script, first join |
| `CoC_Engine_V18.8_ParadoxFree_R31.1_20261018_a891296.zip` | a891296 | reconnect-replay fix, re-test |

## Results

| Check | Result | Evidence |
|---|---|---|
| One-click prep (`一键准备并启动.bat`): Node via winget, ports, firewall, relay start | PASS (first run: openssl absent; R31.2 run installed OpenSSL, tier B on) | `evidence/phone-test-2026-10-18-1-prep-script.png` |
| Tier C (LAN http, `10.53.25.137:8081`): phone joins the room | PASS | `evidence/phone-test-2026-10-18-2-phone-joined-r31.webp` |
| Phone → keeper request, keeper → phone message | PASS | same, and `-4-keeper-log-a891296.png` |
| Message sent while the phone was locked is delivered on wake | **FAIL on 306fe1e** — message #1 lost; every player reconnect asked for a snapshot | `evidence/phone-test-2026-10-18-3-phone-missed-msg1-r31.png` |
| Same, after fix a891296 | PASS — #4 sent while locked, received at reconnect (05:42:09); no snapshot after reconnects | `-4-keeper-log-a891296.png`, `-5-phone-replay-msg4-a891296.png` |
| Tier B (LAN https, self-signed) | PASS — author confirmed the phone joins over the https link (R31.2 build, OpenSSL installed by the prep script) | `evidence/phone-test-2026-10-18-6-keeper-r31_2-tiers.png` |
| Tier A (mkcert) | NOT TESTED |  |
| Tailscale | NOT PASSED — both devices in the tailnet, phone cannot open 100.x links; Tailscale adapter is Public, relay rule covers it, likely a node.exe block rule from the first-run firewall prompt. **Author decided Tailscale is not required** (2026-10-18); not pursued |  |
| Game itself on the phone | PENDING |  |

## Defect found and fixed

The self-test player page resumed with an `epoch` it generated itself instead of the keeper's,
so the relay never matched it and replaced every replay with `snapshot_needed`. Fixed in
a891296: `server/public/relay-session.mjs` reports only what the relay handed out (token,
boot, keeper epoch, last dseq), persisted; covered by a real-socket test in
`server/test/relay.test.mjs` (6/6 deliberate breakages caught).
