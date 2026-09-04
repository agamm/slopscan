import { colorRules } from './color.js';
import { surfaceRules } from './surface.js';
import { typeRules } from './type.js';
import { layoutRules } from './layout.js';
import { iconRules } from './iconography.js';
import { effectRules } from './effects.js';

// Weights are a first guess, not a fitted model. They need a labelled corpus
// before the total means anything; read the per-rule list, not the number.
export const RULES = [
  ...colorRules, ...surfaceRules, ...typeRules, ...layoutRules, ...iconRules, ...effectRules,
];
