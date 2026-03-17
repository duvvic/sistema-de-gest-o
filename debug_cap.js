require('ts-node').register({ transpileOnly: true });
const CapacityUtils = require('./frontend/src/utils/capacity.ts');

const user = {
    id: "eb359050-8b17-48b2-b166-5e5d1656c0ef", // Use a mock if needed, but we don't know Isabela's ID. Let's just mock the inputs.
    name: "Isabela Carrara",
    dailyAvailableHours: 8,
    monthlyAvailableHours: 0
};

const absences = [
    { userId: user.id, startDate: '2026-03-02', endDate: '2026-03-03', status: 'aprovada_gestao', period: 'integral' }
];

const tasks = [
    { id: '1', developerId: user.id, projectId: 'p1', estimatedHours: 91.73, status: 'To Do', actualStart: null, actualDelivery: null }
];
const projects = [
    { id: 'p1', name: 'Proj 1', project_type: 'planned', startDate: '2026-03-01', estimatedDelivery: '2026-03-31', active: true }
];

const res = CapacityUtils.getUserMonthlyAvailability(user, '2026-03', projects, [], [], tasks, [], [], absences);
console.log(JSON.stringify(res, null, 2));
