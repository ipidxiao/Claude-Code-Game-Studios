/**
 * Creative smoke catalog — single source for DevLog + list script (Q6).
 */
export const CREATIVE_SMOKE_CATALOG = Object.freeze([
    Object.freeze({ id: 'creative_waves_smoke', phase: 'W', covers: 'W1–W6 证据/余波/热度/scaffold' }),
    Object.freeze({ id: 'creative_c1_smoke', phase: 'C', covers: 'C1 arcLedger / 余波阈值' }),
    Object.freeze({ id: 'creative_c2_smoke', phase: 'C', covers: 'C2 NPC 信誉→线索' }),
    Object.freeze({ id: 'creative_c3_smoke', phase: 'C', covers: 'C3 双时钟 / keeper 密度' }),
    Object.freeze({ id: 'creative_c5_smoke', phase: 'C', covers: 'C5 能力标签' }),
    Object.freeze({ id: 'creative_d1_carry_smoke', phase: 'D', covers: 'D1 继承/重置' }),
    Object.freeze({ id: 'creative_d2_rep_clock_smoke', phase: 'D', covers: 'D2 信誉压力 / 时钟' }),
    Object.freeze({ id: 'creative_d3_falselead_heat_smoke', phase: 'D', covers: 'D3 假线索 / 热度事件' }),
    Object.freeze({ id: 'creative_d4_smoke', phase: 'D', covers: 'D4 桌规记忆 / 章节' }),
    Object.freeze({ id: 'creative_ux_content_smoke', phase: 'UX', covers: '四期 UX+内容短模' }),
    Object.freeze({ id: 'creative_phase5_smoke', phase: 'E/X', covers: 'E1–E5 + X1–X3' }),
    Object.freeze({ id: 'creative_phase6_system_smoke', phase: 'S', covers: 'S1–S4 系统抛光' }),
    Object.freeze({ id: 'creative_pq_system_smoke', phase: 'P/Q', covers: '桌规偏好门 + Q1–Q6 系统' }),
    Object.freeze({ id: 'creative_risk_gate_smoke', phase: 'R', covers: 'A–F 前风险门：别名/tag 对齐/API 锁/压力清单' }),
    Object.freeze({ id: 'capability_ir_wave_a_smoke', phase: 'A', covers: 'IR0–IR4 CapabilityDecl + CAPABILITY_IR_VERSION=1' }),
    Object.freeze({ id: 'pressure_bus_wave_b_smoke', phase: 'B', covers: 'PB0–PB4 PressureBus heat/flags/snapshot' }),
    Object.freeze({ id: 'display_pipeline_wave_c_smoke', phase: 'C', covers: 'DP0–DP4 Display Pipeline HUD/choice/desk (read-only)' }),
    Object.freeze({ id: 'session_manifest_wave_d_smoke', phase: 'D', covers: 'SM0–SM4 Session Manifest desk/session face (read-mostly)' }),
    Object.freeze({ id: 'encounter_verdict_wave_e_smoke', phase: 'E', covers: 'EV0–EV4 Encounter Verdict seed-gate vs clue tier (read-only)' }),
    Object.freeze({ id: 'timeline_contract_wave_f_smoke', phase: 'F', covers: 'TC0–TC4 Timeline Contract ending-recap row schema (read-only)' })
]);

export const CoCCreativeSmokeCatalog = { CREATIVE_SMOKE_CATALOG };
