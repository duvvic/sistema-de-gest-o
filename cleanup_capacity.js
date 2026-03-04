const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\utils\\capacity.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix indentation and ensures logical consistency in simulateUserDailyAllocation
const loopStartRegex = /const allocations: DayAllocation\[\] = \[\];[\s\S]*?return allocations;/;
const cleanLoop = `    const allocations: DayAllocation[] = [];
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const capacityDia = userDailyCap;

    let current = new Date(start);
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.some(h => dateStr >= h.date && dateStr <= (h.endDate || h.date));

        const activeAbsence = absences.find(a => {
            const aStart = a.startDate;
            const aEnd = a.endDate || a.startDate;
            const isApproved = a.status === 'aprovada_gestao' || a.status === 'aprovada_rh' || a.status === 'finalizada_dp';
            return String(a.userId) === String(userId) && dateStr >= aStart && dateStr <= aEnd && isApproved;
        });

        const isAbsent = !!activeAbsence;
        const isWorkingDay = !isWeekend && !isHoliday && !isAbsent;

        let plannedHours = 0;
        let bufferHours = 0;
        const currentCapacity = isAbsent ? 0 : capacityDia;

        if (isWorkingDay) {
            // 1. Check Project Memberships (Occupies 100% of day if active)
            const projectMemberships = projectMembers.filter(pm => String(pm.id_colaborador) === String(userId));
            const hasActiveProjectMembership = projectMemberships.some(pm => {
                const project = allProjects.find(p => String(p.id) === String(pm.id_projeto));
                if (!project || project.active === false || project.status === 'Concluído' || project.status === 'Cancelado') return false;
                
                const pmStart = pm.start_date || project.startDate || '';
                const pmEnd = pm.end_date || project.estimatedDelivery || '';
                return dateStr >= pmStart && (pmEnd === '' || dateStr <= pmEnd);
            });

            // 2. Check Tasks (Occupies 100% of day if active)
            const activeTask = allTasks.some(t => {
                const isAssigned = String(t.developerId) === String(userId) || t.collaboratorIds?.some(id => String(id) === String(userId));
                if (!isAssigned) return false;
                
                const isClosed = t.status === 'Done' || (t.status as string) === 'Concluído' || (t.status as string) === 'Cancelled' || (t.status as string) === 'Cancelada';
                if (isClosed || t.deleted_at) return false;

                const project = allProjects.find(p => String(p.id) === String(t.projectId));
                if (!project) return false;

                const tStart = t.scheduledStart || t.actualStart || project.startDate || '';
                const tEnd = t.estimatedDelivery || ''; // If no end, assume active
                
                return dateStr >= tStart && (tEnd === '' || dateStr <= tEnd);
            });

            if (hasActiveProjectMembership || activeTask) {
                plannedHours = currentCapacity;
                bufferHours = 0;
            } else {
                plannedHours = 0;
                bufferHours = currentCapacity;
            }
        }

        allocations.push({
            date: dateStr,
            plannedHours: Number(plannedHours.toFixed(2)),
            bufferHours: Number(bufferHours.toFixed(2)),
            totalOccupancy: Number(plannedHours.toFixed(2)),
            isWorkingDay,
            isAbsent,
            absenceType: activeAbsence?.type,
            capacity: currentCapacity
        });

        current.setDate(current.getDate() + 1);
    }
    return allocations;`;

content = content.replace(loopStartRegex, cleanLoop);

fs.writeFileSync(path, content, 'utf8');
console.log("capacity.ts: Cleaned up and optimized Ocupado logic.");
