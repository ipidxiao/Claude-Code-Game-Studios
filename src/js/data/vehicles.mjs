/**
 * CoC 7e vehicle templates for chase (MOV / HP / armor / seats).
 * Numeric values are simplified for engine use; override via start_chase args.
 */
export const CoCVehicles = Object.freeze({
    bicycle: {
        id: 'bicycle',
        name: '自行车',
        mov: 10,
        hp: 5,
        armor: 0,
        seats: 1,
        skill: '骑术',
        notes: '轻便；碰撞易损'
    },
    motorcycle: {
        id: 'motorcycle',
        name: '摩托车',
        mov: 12,
        hp: 12,
        armor: 0,
        seats: 2,
        skill: '汽车驾驶',
        notes: '高速；翻车风险高'
    },
    automobile: {
        id: 'automobile',
        name: '汽车',
        mov: 10,
        hp: 20,
        armor: 2,
        seats: 4,
        skill: '汽车驾驶',
        notes: '默认民用轿车'
    },
    truck: {
        id: 'truck',
        name: '卡车',
        mov: 9,
        hp: 30,
        armor: 3,
        seats: 3,
        skill: '汽车驾驶',
        notes: '耐久高、机动略差'
    },
    horse_cart: {
        id: 'horse_cart',
        name: '马车',
        mov: 8,
        hp: 15,
        armor: 1,
        seats: 4,
        skill: '骑术',
        notes: '依赖牲畜'
    },
    horse: {
        id: 'horse',
        name: '骑乘马',
        mov: 12,
        hp: 14,
        armor: 0,
        seats: 1,
        skill: '骑术',
        notes: '单骑'
    },
    rowboat: {
        id: 'rowboat',
        name: '小船',
        mov: 4,
        hp: 10,
        armor: 0,
        seats: 4,
        skill: '导航',
        notes: '水面追逐'
    },
    steamship: {
        id: 'steamship',
        name: '汽船',
        mov: 6,
        hp: 40,
        armor: 4,
        seats: 20,
        skill: '导航',
        notes: '大型水面载具'
    }
});

export const DEFAULT_VEHICLE_ID = 'automobile';

/**
 * Resolve a vehicle template by id or Chinese name.
 * @param {string} idOrName
 * @returns {object|null}
 */
export function lookupVehicle(idOrName) {
    if (!idOrName) return null;
    const key = String(idOrName).trim();
    if (CoCVehicles[key]) return Object.assign({}, CoCVehicles[key]);
    const lower = key.toLowerCase();
    if (CoCVehicles[lower]) return Object.assign({}, CoCVehicles[lower]);
    const entries = Object.keys(CoCVehicles);
    for (let i = 0; i < entries.length; i++) {
        const v = CoCVehicles[entries[i]];
        if (v.name === key || v.id === key) return Object.assign({}, v);
    }
    return null;
}

/**
 * Merge template + numeric overrides into chase vehicleOpts.
 * @param {string|null} idOrName
 * @param {object} [overrides] mov/hp/maxHp/armor
 */
export function resolveVehicleOpts(idOrName, overrides) {
    overrides = overrides || {};
    const tmpl = lookupVehicle(idOrName);
    if (!tmpl) {
        if (idOrName != null && String(idOrName).trim() !== '') {
            console.warn('[CoCVehicles] unknown vehicle id:', idOrName);
            return null;
        }
        // No id → default automobile template (backward compatible).
        return resolveVehicleOpts(DEFAULT_VEHICLE_ID, overrides);
    }
    const mov = overrides.mov != null ? Number(overrides.mov)
        : (overrides.vehicleMov != null ? Number(overrides.vehicleMov)
            : (overrides.vehicle_mov != null ? Number(overrides.vehicle_mov) : tmpl.mov));
    const hp = overrides.hp != null ? Number(overrides.hp)
        : (overrides.vehicleHp != null ? Number(overrides.vehicleHp)
            : (overrides.vehicle_hp != null ? Number(overrides.vehicle_hp) : tmpl.hp));
    const maxHp = overrides.maxHp != null ? Number(overrides.maxHp)
        : (overrides.vehicleMaxHp != null ? Number(overrides.vehicleMaxHp)
            : (overrides.vehicle_max_hp != null ? Number(overrides.vehicle_max_hp) : hp));
    const armor = overrides.armor != null ? Number(overrides.armor)
        : (overrides.vehicleArmor != null ? Number(overrides.vehicleArmor)
            : (overrides.vehicle_armor != null ? Number(overrides.vehicle_armor) : tmpl.armor));
    return {
        id: tmpl.id,
        name: tmpl.name,
        mov: Number.isFinite(mov) && mov > 0 ? mov : tmpl.mov,
        hp: Number.isFinite(hp) && hp > 0 ? hp : tmpl.hp,
        maxHp: Number.isFinite(maxHp) && maxHp > 0 ? maxHp : (Number.isFinite(hp) && hp > 0 ? hp : tmpl.hp),
        armor: Number.isFinite(armor) && armor >= 0 ? armor : tmpl.armor,
        seats: tmpl.seats,
        skill: tmpl.skill,
        notes: tmpl.notes
    };
}
