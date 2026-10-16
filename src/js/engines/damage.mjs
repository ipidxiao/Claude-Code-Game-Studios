// ESM engine module — source for browser build
// Unified HP/SAN damage entry point (AUDITFIX: single authority for HP/SAN mutations)
//
// This module is the ONE AND ONLY place that directly modifies char.derived.hp
// and char.derived.sanity. All other engines MUST route through these functions.

export function attachDamageEngine(CoCEngine) {
  /**
   * SINGLE AUTHORITY: apply HP damage to a character.
   *
   * Decrements char.derived.hp, syncs char.hp for backward compat,
   * triggers MajorWoundEngine checks, dying checks, and status updates.
   *
   * @param {Object} char - Character object with .derived, .attrs, .status
   * @param {number} amount - Raw damage amount (positive, before armor)
   * @param {Object} [source] - { type: 'combat'|'poison'|'environmental'|'spell', desc: '...' }
   * @returns {Object} { newHp, damageDealt, majorWound: object|null, dying: object|null, unconscious: bool }
   */
  CoCEngine.applyDamage = function(char, amount, source) {
    if (!char) return { newHp: 0, damageDealt: 0, majorWound: null, dying: null, unconscious: false };
    // Top-level hp with no derived used to no-op. Seed derived from that hp, then subtract.
    if (!char.derived) {
      if (typeof char.hp !== 'number') return { newHp: 0, damageDealt: 0, majorWound: null, dying: null, unconscious: false };
      char.derived = { hp: char.hp, maxHp: typeof char.maxHp === 'number' ? char.maxHp : char.hp };
    } else if (typeof char.derived.hp !== 'number' && typeof char.hp === 'number') {
      char.derived.hp = char.hp;
      if (typeof char.derived.maxHp !== 'number') char.derived.maxHp = typeof char.maxHp === 'number' ? char.maxHp : char.hp;
    }

    const dmg = Math.max(0, Number(amount) || 0);
    if (dmg <= 0) return { newHp: char.derived.hp, damageDealt: 0, majorWound: null, dying: null, unconscious: false };

    // Canonical write: derived.hp
    char.derived.hp = Math.max(0, (char.derived.hp || 0) - dmg);
    // Backward-compat sync: top-level hp
    if (typeof char.hp === 'number') char.hp = char.derived.hp;
    if (char.status && char.status.aimBonus) char.status.aimBonus = 0;

    let ritualInterrupted = null;
    if (char.status && char.status.ritual && CoCEngine.MythosEngine && typeof CoCEngine.MythosEngine.interruptRitual === 'function') {
      ritualInterrupted = CoCEngine.MythosEngine.interruptRitual(char, (source && source.desc) || '受伤');
    }

    const result = {
      newHp: char.derived.hp,
      damageDealt: dmg,
      majorWound: null,
      dying: null,
      unconscious: false,
      ritualInterrupted: ritualInterrupted && ritualInterrupted.ok ? ritualInterrupted : null
    };

    // Major wound check
    const MW = CoCEngine.MajorWoundEngine;
    if (MW && typeof MW.checkMajorWound === 'function') {
      const wound = MW.checkMajorWound(char, dmg);
      if (wound && wound.isMajor) {
        if (typeof MW.applyMajorWound === 'function') {
          MW.applyMajorWound(char, wound);
        }
        result.majorWound = wound;
      }
    }

    // Dying / unconscious check
    if (char.derived.hp <= 0) {
      if (!char.status) char.status = {};
      if (char.status.hasMajorWound) {
        char.status.isDying = true;
        result.dying = true;
      } else {
        char.status.isUnconscious = true;
        result.unconscious = true;
      }
    }

    return result;
  };

  /**
   * Keep top-level hp and derived.hp on the same current value.
   * Does not recompute max HP from attributes.
   */
  CoCEngine.mirrorCurrentHp = function(char, hp, maxHp) {
    if (!char) return 0;
    const next = Math.max(0, Number(hp) || 0);
    if (!char.derived) char.derived = {};
    char.hp = next;
    char.derived.hp = next;
    if (maxHp != null && Number.isFinite(Number(maxHp))) {
      const max = Math.max(next, Number(maxHp));
      char.maxHp = max;
      char.derived.maxHp = max;
    } else if (typeof char.derived.maxHp !== 'number' && typeof char.maxHp === 'number') {
      char.derived.maxHp = char.maxHp;
    }
    return next;
  };

  /**
   * SINGLE AUTHORITY: apply HP healing to a character.
   *
   * Increments char.derived.hp (capped at maxHp), syncs char.hp,
   * clears dying/unconscious flags when appropriate.
   *
   * @param {Object} char - Character object
   * @param {number} amount - Healing amount
   * @param {Object} [source] - { type: 'first_aid'|'medicine'|'rest'|'magic', desc: '...' }
   * @returns {Object} { newHp, healedAmount, oldHp }
   */
  CoCEngine.applyHealing = function(char, amount, source) {
    if (!char || !char.derived) return { newHp: 0, healedAmount: 0, oldHp: 0 };

    let cap = 0;
    if (typeof CoCEngine.maxHp === 'function') cap = CoCEngine.maxHp(char);
    if (!cap && char.derived.maxHp > 0) cap = char.derived.maxHp;
    if (!cap && char.attrs && char.attrs.CON != null && char.attrs.SIZ != null) {
      cap = Math.floor((char.attrs.CON + char.attrs.SIZ) / 10);
    }
    if (!cap) cap = 10;
    const oldHp = (typeof CoCEngine.currentHp === 'function') ? CoCEngine.currentHp(char) : (char.derived.hp || 0);
    const heal = Math.max(0, Number(amount) || 0);

    char.derived.hp = Math.min(cap, oldHp + heal);
    char.hp = char.derived.hp;
    if (typeof CoCEngine.syncHp === 'function') CoCEngine.syncHp(char);

    const result = { newHp: char.derived.hp, healedAmount: heal, oldHp: oldHp };

    // Clear status flags if HP > 0
    if (char.derived.hp > 0 && char.status) {
      char.status.isDying = false;
      char.status.isUnconscious = false;
    }

    return result;
  };

  /**
   * SINGLE AUTHORITY: apply SAN loss through the full SanityEngine pipeline.
   *
   * This is the ONLY path for SAN loss. All other modules (mythos, scenarios, etc.)
   * MUST call this instead of directly modifying char.derived.sanity.
   *
   * @param {Object} char - Character object
   * @param {number} loss - SAN points to lose (positive)
   * @param {string} cause - Description of what caused the loss
   * @returns {Object} SanityEngine result { newSan, loss, tempInsanity, indefInsanity, ... }
   */
  CoCEngine.applySanLoss = function(char, loss, cause) {
    return CoCEngine.SanityEngine.applySanLoss(char, loss, cause);
  };

  /**
   * SINGLE AUTHORITY: apply SAN recovery.
   *
   * @param {Object} char - Character object
   * @param {number} amount - SAN points to recover (positive)
   * @param {string} reason - Description of recovery source
   * @returns {Object} { recovered, oldSan, newSan }
   */
  CoCEngine.applySanRecovery = function(char, amount, reason) {
    return CoCEngine.SanityEngine.applySanityReward(char, amount + '', reason);
  };
}
