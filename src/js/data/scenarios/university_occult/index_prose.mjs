/** Merged Miskatonic university occult prose bank. */
import { UNIVERSITY_PROSE_PART_1 } from './prose_01.mjs';
import { UNIVERSITY_PROSE_PART_2 } from './prose_02.mjs';
import { UNIVERSITY_PROSE_PART_3 } from './prose_03.mjs';
import { UNIVERSITY_PROSE_PART_4 } from './prose_04.mjs';
import { UNIVERSITY_PROSE_PART_5 } from './prose_05.mjs';
import { UNIVERSITY_PROSE_PART_6 } from './prose_06.mjs';
import { UNIVERSITY_PROSE_PART_7 } from './prose_07.mjs';

export const UNIVERSITY_PROSE = {
    ...UNIVERSITY_PROSE_PART_1,
    ...UNIVERSITY_PROSE_PART_2,
    ...UNIVERSITY_PROSE_PART_3,
    ...UNIVERSITY_PROSE_PART_4,
    ...UNIVERSITY_PROSE_PART_5,
    ...UNIVERSITY_PROSE_PART_6,
    ...UNIVERSITY_PROSE_PART_7
};
