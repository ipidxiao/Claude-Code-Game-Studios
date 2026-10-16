/**
 * Built-in scenario registry — ESM imports + optional window publish for legacy readers.
 */
import { CoCScenarioTutorial } from './tutorial.mjs';
import { CoCScenarioDeepOneShadow } from './deep_one_shadow.mjs';
import { CoCScenarioAbandonedAsylum } from './abandoned_asylum.mjs';
import { CoCScenarioMidnightMuseum } from './midnight_museum.mjs';
import { CoCScenarioCoastalFestival } from './coastal_festival.mjs';
import { CoCScenarioUniversityOccult } from './university_occult.mjs';
import { CoCScenarioLighthouseSignal } from './lighthouse_signal.mjs';
import { CoCScenarioMissingChild } from './missing_child.mjs';
import { CoCScenarioTrainToNowhere } from './train_to_nowhere.mjs';
import { CoCScenarioCarnivalOfMasks } from './carnival_of_masks.mjs';
import { CoCScenarioAlleyToAsphalt } from './alley_to_asphalt.mjs';
import { CoCScenarioRainDockChase } from './rain_dock_chase.mjs';
import { CoCScenarioHearingRoom } from './hearing_room.mjs';
import { CoCScenarioFogLighthouseChase } from './fog_lighthouse_chase.mjs';
import { CoCScenarioNewsroomMidnight } from './newsroom_midnight.mjs';
import { CoCScenarioCliffMistRun } from './cliff_mist_run.mjs';
import { CoCScenarioCourtRecess } from './court_recess.mjs';
import { CoCScenarioLighthouseNightWatch } from './lighthouse_night_watch.mjs';

export const BUILTIN_SCENARIOS = [
    CoCScenarioTutorial,
    CoCScenarioDeepOneShadow,
    CoCScenarioAbandonedAsylum,
    CoCScenarioMidnightMuseum,
    CoCScenarioCoastalFestival,
    CoCScenarioUniversityOccult,
    CoCScenarioLighthouseSignal,
    CoCScenarioMissingChild,
    CoCScenarioTrainToNowhere,
    CoCScenarioCarnivalOfMasks,
    CoCScenarioAlleyToAsphalt,
    CoCScenarioRainDockChase,
    CoCScenarioHearingRoom,
    CoCScenarioFogLighthouseChase,
    CoCScenarioNewsroomMidnight,
    CoCScenarioCliffMistRun,
    CoCScenarioCourtRecess,
    CoCScenarioLighthouseNightWatch,
];

export const BUILTIN_BY_ID = Object.fromEntries(BUILTIN_SCENARIOS.map((s) => [s.id, s]));

export const BUILTIN_GLOBALS = {
    CoCScenarioTutorial,
    CoCScenarioDeepOneShadow,
    CoCScenarioAbandonedAsylum,
    CoCScenarioMidnightMuseum,
    CoCScenarioCoastalFestival,
    CoCScenarioUniversityOccult,
    CoCScenarioLighthouseSignal,
    CoCScenarioMissingChild,
    CoCScenarioTrainToNowhere,
    CoCScenarioCarnivalOfMasks,
    CoCScenarioAlleyToAsphalt,
    CoCScenarioRainDockChase,
    CoCScenarioHearingRoom,
    CoCScenarioFogLighthouseChase,
    CoCScenarioNewsroomMidnight,
    CoCScenarioCliffMistRun,
    CoCScenarioCourtRecess,
    CoCScenarioLighthouseNightWatch,
};

if (typeof window !== 'undefined') {
    Object.assign(window, BUILTIN_GLOBALS);
}
