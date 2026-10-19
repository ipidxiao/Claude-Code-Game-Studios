/**
 * Monthly treatment for the insane (CoC 7e Keeper Rulebook, Treatment).
 * Official table is two tiers:
 *   institution — success on 01–50, or ≤ attending Psychoanalysis
 *   private/home — success on 01–95, or ≤ attending Psychoanalysis
 * 96–100 always fails and costs 1D6 SAN. Success recovers 1D3 and allows a
 * Sanity roll to shake the insanity off.
 * Mapped care keys: poor/average = institution (doctor 45 / 65), good = private.
 */

export const ASYLUM_CARE = Object.freeze({
    poor: {
        label: '机构看护（主治技能不足）',
        skill: 45,
        successRange: 50,
        successSan: '1D3',
        failSan: '1D6'
    },
    average: {
        label: '机构看护',
        skill: 65,
        successRange: 50,
        successSan: '1D3',
        failSan: '1D6'
    },
    good: {
        label: '私人看护',
        skill: 80,
        successRange: 95,
        successSan: '1D3',
        failSan: '1D6'
    }
});
