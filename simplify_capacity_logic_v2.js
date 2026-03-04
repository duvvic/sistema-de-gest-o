const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\utils\\capacity.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Simplificar interface DayAllocation
content = content.replace(/plannedHours: number;\s*continuousHours: number;/g, 'plannedHours: number;');
content = content.replace(/continuousHours: number;/g, '');

// 2. Simplificar a função de simulação
const simLoopStart = 'let plannedHours = 0;';
const simLoopEnd = 'allocations.push\\({';

const newLogic = `        let plannedHours = 0;
        let bufferHours = 0;
        const currentCapacity = isAbsent ? 0 : capacityDia;

        if (isWorkingDay) {
            // Check if user is in any active project during this day
            const projectMemberships = projectMembers.filter(pm => String(pm.id_colaborador) === String(userId));
            const activeProjectsForUser = projectMemberships.filter(pm => {
                const project = allProjects.find(p => String(p.id) === String(pm.id_projeto));
                if (!project || project.active === false || project.status === 'Concluído' || project.status === 'Cancelado') return false;
                
                // Check membership dates
                const pmStart = pm.start_date || project.startDate || '';
                const pmEnd = pm.end_date || project.estimatedDelivery || '';
                
                return dateStr >= pmStart && (pmEnd === '' || dateStr <= pmEnd);
            });

            // Check if user has active tasks for this day
            const userTasks = allTasks.filter(t =>
                (String(t.developerId) === String(userId) || t.collaboratorIds?.some(id => String(id) === String(userId))) &&
                t.status !== 'Done' && 
                (t.status as string) !== 'Concluído' &&
                (t.status as string) !== 'Cancelled' && 
                (t.status as string) !== 'Cancelada' &&
                !t.deleted_at
            );
            const activeTasks = userTasks.filter(t => {
                const project = allProjects.find(p => String(p.id) === String(t.projectId));
                if (!project) return false;
                const tStart = t.scheduledStart || t.actualStart || project.startDate || '';
                const tEnd = t.estimatedDelivery || '';
                return dateStr >= tStart && (tEnd === '' || dateStr <= tEnd);
            });

            if (activeTasks.length > 0 || activeProjectsForUser.length > 0) {
                plannedHours = currentCapacity;
                bufferHours = 0;
            } else {
                plannedHours = 0;
                bufferHours = currentCapacity;
            }
        }`;

// Replace the calculation block
const calcRegex = /let plannedHours = 0;[\s\S]*?if \(isWorkingDay\) {[\s\S]*?}\s*(?=allocations\.push)/g;
content = content.replace(calcRegex, newLogic + '\n\n');

// 3. Output mapping (Remove continuousHours)
content = content.replace(/plannedHours: Number\(plannedHours\.toFixed\(2\)\),/g, 'plannedHours: Number(plannedHours.toFixed(2)),');
content = content.replace(/continuousHours: Number\(continuousHours\.toFixed\(2\)\),/g, '');
content = content.replace(/totalOccupancy: Number\(\(plannedHours \+ continuousHours\)\.toFixed\(2\)\),/g, 'totalOccupancy: Number(plannedHours.toFixed(2)),');
content = content.replace(/totalOccupancy: Number\(plannedHours\.toFixed\(2\)\),/g, 'totalOccupancy: Number(plannedHours.toFixed(2)),');

fs.writeFileSync(path, content, 'utf8');
console.log("capacity.ts: Logic integrated Project Memberships + Tasks -> Ocupado.");
