const CapacityUtils = require('./frontend/src/utils/capacity');

const holidays = [];
const absences = [
    { userId: 'u1', startDate: '2026-03-02', endDate: '2026-03-03', status: 'aprovada_gestao', period: 'integral' }
];

const dailyGoal = 8;
const effectiveWorkingDays = CapacityUtils.getWorkingDaysInRange('2026-03-01', '2026-03-31', holidays, absences, dailyGoal);
console.log(`Effective: ${effectiveWorkingDays}`);
