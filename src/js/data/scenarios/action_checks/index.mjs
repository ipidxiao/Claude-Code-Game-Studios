/** Action-check tables of the built-in scenarios, by scenario id (see ../action_checks.mjs). */
import { tutorialChecks } from './tutorial.mjs';
import { deepOneShadowChecks } from './deep_one_shadow.mjs';
import { abandonedAsylumChecks } from './abandoned_asylum.mjs';
import { midnightMuseumChecks } from './midnight_museum.mjs';
import { coastalFestivalChecks } from './coastal_festival.mjs';
import { universityOccultChecks } from './university_occult.mjs';
import { lighthouseSignalChecks } from './lighthouse_signal.mjs';
import { missingChildChecks } from './missing_child.mjs';
import { trainToNowhereChecks } from './train_to_nowhere.mjs';
import { carnivalOfMasksChecks } from './carnival_of_masks.mjs';
import { alleyToAsphaltChecks } from './alley_to_asphalt.mjs';
import { rainDockChaseChecks } from './rain_dock_chase.mjs';
import { hearingRoomChecks } from './hearing_room.mjs';
import { fogLighthouseChaseChecks } from './fog_lighthouse_chase.mjs';
import { newsroomMidnightChecks } from './newsroom_midnight.mjs';
import { cliffMistRunChecks } from './cliff_mist_run.mjs';
import { courtRecessChecks } from './court_recess.mjs';
import { lighthouseNightWatchChecks } from './lighthouse_night_watch.mjs';

export const ACTION_CHECKS_BY_ID = {
    tutorial: tutorialChecks,
    deep_one_shadow: deepOneShadowChecks,
    abandoned_asylum: abandonedAsylumChecks,
    midnight_museum: midnightMuseumChecks,
    coastal_festival: coastalFestivalChecks,
    university_occult: universityOccultChecks,
    lighthouse_signal: lighthouseSignalChecks,
    missing_child: missingChildChecks,
    train_to_nowhere: trainToNowhereChecks,
    carnival_of_masks: carnivalOfMasksChecks,
    alley_to_asphalt: alleyToAsphaltChecks,
    rain_dock_chase: rainDockChaseChecks,
    hearing_room: hearingRoomChecks,
    fog_lighthouse_chase: fogLighthouseChaseChecks,
    newsroom_midnight: newsroomMidnightChecks,
    cliff_mist_run: cliffMistRunChecks,
    court_recess: courtRecessChecks,
    lighthouse_night_watch: lighthouseNightWatchChecks
};
