const CapacityUtils = require('./frontend/src/utils/capacity');

const monthStart = '2026-03-01';
const monthEnd = '2026-03-31';

const grossDays = CapacityUtils.getWorkingDaysInRange(monthStart, monthEnd, [], [], 8);
console.log(`March 2026 Gross Days (8h meta): ${grossDays}`);
console.log(`176 expected? ${grossDays * 8 === 176}`);

const febStart = '2026-02-01';
const febEnd = '2026-02-28';
const febGrossDays = CapacityUtils.getWorkingDaysInRange(febStart, febEnd, [], [], 8);
console.log(`Feb 2026 Gross Days: ${febGrossDays}`);
console.log(`160 expected? ${febGrossDays * 8 === 160}`);
