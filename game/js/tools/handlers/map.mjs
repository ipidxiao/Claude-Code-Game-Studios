// ===============================================
// 归属：【程序】 引擎核心 / AI调度 / 状态管理
// 美术/策划/QA 请勿直接修改此文件
// 修改后放入 roles/programmer/ 运行 merge.py 合并
// ===============================================

/**
 * CoC Tool Handlers: Map and position domain (AUDITFIX8)
 */
import { requireField } from '../resolve.mjs';
import { getKpEngine } from '../../state/kp_config.mjs';
import { KpExecutionEngine } from '../../campaign/kp_execution_engine.mjs';

function normalizeRoomsArg(rooms) {
    if (rooms == null) return { ok: true, rooms: [] };
    if (Array.isArray(rooms)) return { ok: true, rooms };
    if (typeof rooms === 'object') {
        const list = Object.keys(rooms).map((k) => {
            const r = rooms[k];
            if (r && typeof r === 'object') return Object.assign({ id: r.id || k }, r);
            return { id: k, name: String(r) };
        });
        return { ok: true, rooms: list };
    }
    return { ok: false, error: '错误：rooms 须为数组（或房间 id→对象 的字典）' };
}

export function map(ctx) {
    const { gameState, createMap, updateRoom, setPosition } = ctx;

    const getKpEng = () => getKpEngine() || KpExecutionEngine;

    return {
        create_map: (args) => {
            const title = (args && args.title != null && String(args.title).trim())
                ? String(args.title).trim()
                : (gameState.currentLocation || '未知地点');
            const norm = normalizeRoomsArg(args && args.rooms);
            if (!norm.ok) return norm.error;
            createMap(title, norm.rooms);
            gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🗺️ [地图] ${title} 已绘制（${norm.rooms.length} 个区域）` });
            return `场景地图已创建：${title}`;
        },
        update_room: (args) => {
            const idField = requireField(args, 'room_id', { label: 'room_id' });
            if (!idField.ok) return idField.error;
            const roomId = String(idField.value);
            const ok = updateRoom(roomId, args.status, args.note);
            return ok ? `房间已更新：${roomId}` : `找不到房间：${roomId}`;
        },
        set_position: (args) => {
            const idField = requireField(args, 'room_id', { label: 'room_id' });
            if (!idField.ok) return idField.error;
            const roomId = String(idField.value);
            const ok = setPosition(roomId);
            if (ok) {
                const kpEng = getKpEng();
                if (kpEng && kpEng.isEnabled && kpEng.isEnabled(gameState) && kpEng.initScenePaths) {
                    kpEng.initScenePaths(gameState, gameState.currentLocation);
                }
                gameState.chatHistory.push({ role: 'system', isLocalOnly: true, content: `🚶 [移动] 进入：${gameState.currentLocation}` });
            }
            return ok ? `当前位置：${gameState.currentLocation}` : `找不到房间：${roomId}`;
        }
    };
};
