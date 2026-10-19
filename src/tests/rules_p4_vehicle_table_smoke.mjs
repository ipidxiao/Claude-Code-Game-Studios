/**
 * P4: vehicle template table → ChaseEngine.start lookup + overrides.
 */
import { strict as assert } from 'node:assert';
import { CoCEngine } from '../js/coc.mjs';
import { CoCVehicles, lookupVehicle, resolveVehicleOpts, DEFAULT_VEHICLE_ID } from '../js/data/vehicles.mjs';

assert.ok(CoCEngine.Vehicles);
assert.equal(DEFAULT_VEHICLE_ID, 'automobile');
assert.ok(lookupVehicle('摩托车'));
assert.equal(lookupVehicle('truck').hp, 30);

const auto = resolveVehicleOpts(null, {});
assert.equal(auto.id, 'automobile');
assert.equal(auto.hp, 20);
assert.equal(auto.armor, 2);

const over = resolveVehicleOpts('motorcycle', { vehicle_hp: 99 });
assert.equal(over.id, 'motorcycle');
assert.equal(over.mov, 12);
assert.equal(over.hp, 99);

const quarry = { name: '逃', derived: { mov: 8 } };
const pursuer = { name: '追', derived: { mov: 8 } };

// vehicle:true without id → default automobile template
const def = CoCEngine.ChaseEngine.start(quarry, [pursuer], { vehicle: true });
assert.equal(def.vehicleId, 'automobile');
assert.equal(def.participants[0].vehicle.id, 'automobile');
assert.equal(def.participants[0].vehicle.hp, 20);
assert.equal(def.participants[0].effectiveMov, 10);

// Named template + numeric override
const bike = CoCEngine.ChaseEngine.start(quarry, [pursuer], {
    vehicle: true,
    vehicleId: 'bicycle',
    vehicleHp: 7
});
assert.equal(bike.vehicleId, 'bicycle');
assert.equal(bike.participants[0].vehicle.hp, 7);
assert.equal(bike.participants[0].vehicle.skill, '骑术');
assert.equal(CoCEngine.ChaseEngine.pushSkill(bike, bike.participants[0]), '骑术');

// Split quarry / pursuer vehicles
const split = CoCEngine.ChaseEngine.start(quarry, [pursuer], {
    vehicle: true,
    quarryVehicleId: 'horse',
    pursuerVehicleId: 'automobile'
});
assert.equal(split.participants[0].vehicle.id, 'horse');
assert.equal(split.participants[0].vehicle.mov, 12);
assert.equal(split.participants[1].vehicle.id, 'automobile');
assert.equal(split.participants[1].vehicle.mov, 10);

// Branch7-style numeric-only still works (overrides default table)
const legacy = CoCEngine.ChaseEngine.start(quarry, [pursuer], {
    vehicle: true,
    vehicleHp: 10,
    vehicleArmor: 2,
    vehicleMov: 12
});
assert.equal(legacy.participants[0].vehicle.hp, 10);
assert.equal(legacy.participants[0].vehicle.mov, 12);
assert.equal(legacy.participants[0].vehicle.armor, 2);

assert.ok(Object.keys(CoCVehicles).length >= 8);
console.log('rules_p4_vehicle_table_smoke: OK');
