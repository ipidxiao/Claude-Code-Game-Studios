/**
 * Browser entry keeps only the bindings it reads, plus bare side-effect imports.
 * Real consumers stay on their own import paths.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const appSrc = read('js/app.mjs');

const dropped = [
    "from './data/skills.mjs'",
    "from './data/jobs.mjs'",
    "from './data/experiences.mjs'",
    "from './data/items.mjs'",
    "from './data/dev_logs.mjs'",
    "from './coc.mjs'",
    "from './core/context_manager.mjs'",
    "from './core/extensions.mjs'",
    "from './tools/definitions.mjs'",
    "from './tools/handlers/index.mjs'",
    "from './state/core.mjs'",
    "from './state/ui.mjs'",
    "from './state/gameplay.mjs'",
    "from './state/persistence.mjs'",
    "from './data/arc_chapters.mjs'",
    "from './data/arc_pressure_copy.mjs'",
    "from './data/capability_system.mjs'",
    "from './data/capability_risk.mjs'",
    "from './data/desk_pref.mjs'",
    "from './data/creative_smoke_catalog.mjs'",
    "from './data/keeper_style.mjs'",
    "from './state/mythos_heat.mjs'",
    "from './data/encounter_seed.mjs'",
    "from './state/unreliable_clues.mjs'",
    "from './core/globals_registry.mjs'",
    "from './chat_export.mjs'"
];
for (const spec of dropped) {
    assert.equal(appSrc.includes(spec), false, spec);
}

const kept = [
    "from './state/state.mjs'",
    "from './ai_logic.mjs'",
    "import './state/rule_check.mjs'",
    "import './state/accessor.mjs'",
    "import './state/aftermath.mjs'",
    "import './state/arc_ledger.mjs'",
    "import './state/false_lead.mjs'",
    "import './boot/shell_side_effects.mjs'"
];
for (const spec of kept) {
    assert.ok(appSrc.includes(spec), spec);
}
assert.ok(!appSrc.includes('CoCAI,'));
assert.ok(!appSrc.includes("from './tools/slash.mjs'"));

const aiAt = appSrc.indexOf("from './ai_logic.mjs'");
const barrelAt = appSrc.indexOf("import './boot/shell_side_effects.mjs'");
assert.ok(aiAt >= 0 && barrelAt > aiAt, 'CoCAI loads before the side-effect barrel');

const consumers = [
    ['js/engines/skills.mjs', "from '../data/skills.mjs'"],
    ['js/engines/skills.mjs', "from '../data/jobs.mjs'"],
    ['js/components/char_creator.mjs', "from '../data/experiences.mjs'"],
    ['js/ai_logic.mjs', "from './data/items.mjs'"],
    ['js/ai_logic.mjs', "from './coc.mjs'"],
    ['js/ai_logic.mjs', "from './core/context_manager.mjs'"],
    ['js/ai_logic.mjs', "from './tools/definitions.mjs'"],
    ['js/ai_logic.mjs', "from './tools/handlers/index.mjs'"],
    ['js/tools/handlers/system.mjs', "from '../../data/dev_logs.mjs'"],
    ['js/tools/slash.mjs', "from '../core/extensions.mjs'"],
    ['js/state/state.mjs', "from './core.mjs'"],
    ['js/state/state.mjs', "from './ui.mjs'"],
    ['js/state/state.mjs', "from './gameplay.mjs'"],
    ['js/state/state.mjs', "from './persistence.mjs'"],
    ['js/views/lobby_view.mjs', "from '../data/arc_chapters.mjs'"],
    ['js/views/lobby_view.mjs', "from '../data/capability_system.mjs'"],
    ['js/views/lobby_view.mjs', "from '../data/desk_pref.mjs'"],
    ['js/views/lobby_view.mjs', "from '../data/keeper_style.mjs'"],
    ['js/data/display_pipeline.mjs', "from './arc_pressure_copy.mjs'"],
    ['js/data/capability_system.mjs', "from './capability_risk.mjs'"],
    ['js/state/pressure_bus.mjs', "from './mythos_heat.mjs'"],
    ['js/state/arc_ledger.mjs', "from '../data/encounter_seed.mjs'"],
    ['js/components/story_clues.mjs', "from '../state/unreliable_clues.mjs'"],
    ['js/views/dev_log_view.mjs', "from '../data/creative_smoke_catalog.mjs'"],
    ['js/views/story_view.mjs', "from '../chat_export.mjs'"]
];
for (const [file, spec] of consumers) {
    assert.ok(read(file).includes(spec), file + ' ' + spec);
}

console.log('app_entry_imports_smoke: OK', { dropped: dropped.length, consumers: consumers.length });
