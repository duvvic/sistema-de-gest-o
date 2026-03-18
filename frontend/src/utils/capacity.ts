import { User, Task, Project, ProjectMember, Holiday, TimesheetEntry, TaskMemberAllocation, Absence } from '@/types';
import { parseTimeToDecimal } from './normalizers';

/**
 * CENTRALIZADOR DE CAPACIDADE ÚTIL
 * Retorna a capacidade disponível (horas) em um período, considerando feriados e ausências.
 */
export const getUserCapacityOnPeriod = (
    user: User,
    startDate: string,
    endDate: string,
    holidays: Holiday[] = [],
    absences: Absence[] = []
): number => {
    const dailyGoal = user.dailyAvailableHours || 8;
    const userAbsences = absences.filter(a => String(a.userId) === String(user.id));
    
    // Regra: (Horas/Dia) * (Dias Úteis Efetivos)
    // getWorkingDaysInRange já desconta feriados e ausências proporcionalmente
    const effectiveWorkingDays = getWorkingDaysInRange(startDate, endDate, holidays, userAbsences, dailyGoal);

    return Number((dailyGoal * effectiveWorkingDays).toFixed(2));
};

/**
 * CALCULA A VELOCIDADE INDIVIDUAL DO COLABORADOR (Regra 4)
 * velocity = horas_apontadas / horas_estimadas (baseado em tarefas concluídas)
 */
export const calculateUserVelocity = (
    userId: string,
    timesheetEntries: TimesheetEntry[],
    tasks: Task[]
): number => {
    // Filtramos tarefas concluídas do usuário
    const completedTasks = tasks.filter(t => 
        (String(t.developerId) === String(userId) || (t.collaboratorIds || []).some(id => String(id) === String(userId))) &&
        t.status === 'Done' && 
        (Number(t.estimatedHours) || 0) > 0
    );

    if (completedTasks.length < 2) return 1.0; // Amostra pequena, assume velocity padrão

    let totalEstimated = 0;
    let totalReported = 0;

    completedTasks.forEach(t => {
        totalEstimated += Number(t.estimatedHours) || 0;
        totalReported += timesheetEntries
            .filter(e => String(e.taskId) === String(t.id) && String(e.userId) === String(userId))
            .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);
    });

    if (totalEstimated === 0) return 1.0;
    // Velocity > 1: Lento (usa mais horas que o previsto)
    // Velocity < 1: Rápido (usa menos horas que o previsto)
    const rawVelocity = totalReported / totalEstimated;
    return Math.max(0.6, Math.min(1.8, rawVelocity)); // Clamp para evitar distorções absurdas
};

/**
 * DETERMINA O ESFORÇO TOTAL DE UM COLABORADOR ESPECÍFICO EM UMA TAREFA
 */
const getUserTaskTotalEffort = (
    task: Task, 
    userId: string, 
    taskMemberAllocations: TaskMemberAllocation[],
    allUsers: User[] = [],
    holidays: Holiday[] = [],
    absences: Absence[] = [],
    timesheetEntries: TimesheetEntry[] = [],
    allTasks: Task[] = []
): number => {
    // Busca velocidade se solicitado (Enterprise Rule 4)
    const velocity = calculateUserVelocity(userId, timesheetEntries, allTasks);

    const specificAllocation = taskMemberAllocations.find(a => String(a.taskId) === String(task.id) && String(a.userId) === String(userId));
    const hasAnyAllocationInTask = taskMemberAllocations.some(a => String(a.taskId) === String(task.id) && (a.reservedHours || 0) > 0);

    let baseEffort = 0;

    if (specificAllocation && specificAllocation.reservedHours > 0) {
        baseEffort = Number(specificAllocation.reservedHours);
    } else if (!hasAnyAllocationInTask) {
        // FALLBACK INTELIGENTE (Regra 5): Distribuição proporcional à capacidade
        const teamIds = Array.from(new Set([task.developerId, ...(task.collaboratorIds || [])])).filter(Boolean);
        const teamUsers = allUsers.filter(u => teamIds.includes(String(u.id)));

        if (teamUsers.length > 1) {
            const tStart = task.scheduledStart || task.actualStart || new Date().toISOString().split('T')[0];
            const tEnd = task.estimatedDelivery || tStart;
            
            const userObj = teamUsers.find(u => String(u.id) === String(userId));
            if (userObj) {
                const memberCap = getUserCapacityOnPeriod(userObj, tStart, tEnd, holidays, absences);
                const totalTeamCap = teamUsers.reduce((sum, u) => sum + getUserCapacityOnPeriod(u, tStart, tEnd, holidays, absences), 0);
                
                if (totalTeamCap > 0) {
                    baseEffort = (Number(task.estimatedHours) || 0) * (memberCap / totalTeamCap);
                }
            }
        }
        
        if (baseEffort === 0) {
            baseEffort = parseTimeToDecimal(String(task.estimatedHours || 0)) / (teamIds.length || 1);
        }
    } else {
        const isMainDev = String(task.developerId) === String(userId);
        if (isMainDev) {
            const totalAllocatedToOthers = taskMemberAllocations
                .filter(a => String(a.taskId) === String(task.id) && String(a.userId) !== String(userId))
                .reduce((sum, a) => sum + (Number(a.reservedHours) || 0), 0);
            baseEffort = Math.max(0, parseTimeToDecimal(String(task.estimatedHours || 0)) - totalAllocatedToOthers);
        }
    }

    // Regra Enterprise 4: Forecast Adaptativo via Velocity
    return baseEffort * velocity;
};

/**
 * CALCULA A CARGA DE UMA TAREFA EM UM PERÍODO ESPECÍFICO (MÊS OU DIA)
 */
const getTaskLoadOnPeriod = (
    task: Task,
    user: User,
    project: Project,
    timesheetEntries: TimesheetEntry[],
    taskMemberAllocations: TaskMemberAllocation[],
    analyzeStart: string, 
    analyzeEnd: string,
    contextStart: string,
    contextEnd: string,
    holidays: Holiday[],
    absences: Absence[],
    dailyGoal: number,
    allUsers: User[] = [],
    allTasks: Task[] = []
): { effortInPeriod: number; reportedInRange: number } => {
    // 1. Esforço Total (Com Velocity)
    let totalEffort = getUserTaskTotalEffort(task, user.id, taskMemberAllocations, allUsers, holidays, absences, timesheetEntries, allTasks);

    // 2. Apontamentos
    const userId = String(user.id);
    const reportedTotal = timesheetEntries
        .filter(e => String(e.taskId) === String(task.id) && String(e.userId) === userId)
        .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);

    const reportedInRange = timesheetEntries
        .filter(e => String(e.taskId) === String(task.id) && String(e.userId) === userId && e.date >= analyzeStart && e.date <= analyzeEnd)
        .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);

    if (task.status === 'Done') {
        return { effortInPeriod: reportedInRange, reportedInRange };
    }

    if (reportedTotal > totalEffort) totalEffort = reportedTotal;
    const remainingEffort = Math.max(0, totalEffort - reportedTotal);

    // 3. Distribuição do Backlog (Somente Futuro)
    let effortInPeriod = reportedInRange;
    const todayStr = new Date().toISOString().split('T')[0];

    if (remainingEffort > 0) {
        const tStart = task.scheduledStart || task.actualStart || project.startDate || contextStart;
        const tEnd = task.estimatedDelivery || project.estimatedDelivery || contextEnd;

        const distStart = tStart > todayStr ? tStart : todayStr;
        const distEnd = tEnd;

        if (distEnd < distStart) {
            // Atrasada (Overdue)
            const effectiveOverdueStart = contextStart > todayStr ? contextStart : todayStr;
            const overdueDays = getWorkingDaysInRange(effectiveOverdueStart, contextEnd, holidays, absences, dailyGoal) || 5;
            const hoursPerDay = remainingEffort / overdueDays;

            const intStart = effectiveOverdueStart > analyzeStart ? effectiveOverdueStart : analyzeStart;
            const intEnd = contextEnd < analyzeEnd ? contextEnd : analyzeEnd;

            if (intStart <= intEnd) {
                const intersectionDays = getWorkingDaysInRange(intStart, intEnd, holidays, absences, dailyGoal);
                effortInPeriod += hoursPerDay * intersectionDays;
            }
        } else {
            const futureWorkingDays = getWorkingDaysInRange(distStart, distEnd, holidays, absences, dailyGoal) || 1;
            const hoursPerDay = remainingEffort / futureWorkingDays;

            const intStart = distStart > analyzeStart ? distStart : analyzeStart;
            const intEnd = distEnd < analyzeEnd ? distEnd : analyzeEnd;

            if (intStart <= intEnd) {
                const intersectionDays = getWorkingDaysInRange(intStart, intEnd, holidays, absences, dailyGoal);
                effortInPeriod += hoursPerDay * intersectionDays;
            }
        }
    }

    return { effortInPeriod, reportedInRange };
};

/**

/**
 * Calcula a dedução de horas para um dia com base em feriados e ausências.
 */
const calculateDayDeduction = (dateStr: string, holidays: Holiday[], absences: Absence[], dailyMeta: number): number => {
    // Feriado?
    const holiday = holidays.find(h => dateStr >= h.date && dateStr <= (h.endDate || h.date));
    if (holiday) {
        if (holiday.hours && holiday.hours > 0) return holiday.hours;
        if (holiday.period === 'integral' || !holiday.period) return dailyMeta;
        if (holiday.period === 'manha' || holiday.period === 'noite') return 4;
        if (holiday.period === 'tarde') return 4;
        return dailyMeta;
    }

    // Ausência?
    const absence = absences.find(a => {
        const aStart = a.startDate;
        const aEnd = a.endDate || a.startDate;
        const isApproved = a.status === 'aprovada_gestao' || a.status === 'aprovada_rh' || a.status === 'finalizada_dp' || a.status === 'programado';
        return dateStr >= aStart && dateStr <= aEnd && isApproved;
    });

    if (absence) {
        if (absence.hours && absence.hours > 0) return absence.hours;
        if (absence.period === 'integral' || !absence.period) return dailyMeta;
        if (absence.period === 'manha' || absence.period === 'noite') return 4;
        if (absence.period === 'tarde') return 4;
        return dailyMeta;
    }

    return 0;
};

/**
 * Interface para detalhamento de carga/dia (usado no Modal de transparência)
 */
export interface WorkingDayDetail {
    date: string;
    isWorkingDay: boolean;
    isWeekend: boolean;
    holiday?: Holiday;
    absence?: Absence;
    deduction: number;
    effectiveDayValue: number; // 0 a 1
}

/**
 * Retorna o detalhamento de cada dia em um range para transparência de cálculo.
 */
export const getWorkingDaysBreakdown = (
    startDate: string,
    endDate: string,
    holidays: Holiday[] = [],
    absences: Absence[] = [],
    dailyMeta: number = 8
): WorkingDayDetail[] => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    if (start > end) return [];

    const details: WorkingDayDetail[] = [];
    let current = new Date(start);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Buscar feriado e ausência manualmente para popular o detalhe
        const holiday = holidays.find(h => dateStr >= h.date && dateStr <= (h.endDate || h.date));
        const absence = absences.find(a => {
            const aStart = a.startDate;
            const aEnd = a.endDate || a.startDate;
            const isApproved = a.status === 'aprovada_gestao' || a.status === 'aprovada_rh' || a.status === 'finalizada_dp';
            return dateStr >= aStart && dateStr <= aEnd && isApproved;
        });

        const deduction = calculateDayDeduction(dateStr, holidays, absences, dailyMeta);
        const effectiveDayValue = isWeekend ? 0 : Math.max(0, 1 - (deduction / dailyMeta));

        details.push({
            date: dateStr,
            isWorkingDay: !isWeekend && effectiveDayValue > 0,
            isWeekend,
            holiday,
            absence,
            deduction,
            effectiveDayValue
        });

        current.setDate(current.getDate() + 1);
    }

    return details;
};

/**
 * Retorna o número de dias úteis (Segunda a Sexta) em um determinado mês, descontando feriados.
 */
export const getWorkingDaysInMonth = (monthStr: string, holidays: Holiday[] = []): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1, 12, 0, 0);
    let workingDays = 0;

    const currentMonth = date.getMonth();
    const dailyGoal = 8; // Referência padrão para cálculo de feriado parcial

    while (date.getMonth() === currentMonth) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = date.toISOString().split('T')[0];
            const deduction = calculateDayDeduction(dateStr, holidays, [], dailyGoal);
            workingDays += Math.max(0, 1 - (deduction / dailyGoal));
        }
        date.setDate(date.getDate() + 1);
    }

    return workingDays;
};

/**
 * Retorna o número de dias úteis entre duas datas (inclusive), descontando feriados.
 */
export const getWorkingDaysInRange = (startDate: string, endDate: string, holidays: Holiday[] = [], absences: Absence[] = [], dailyMeta: number = 8): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    if (start > end) return 0;

    let workingDays = 0;
    let current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = current.toISOString().split('T')[0];
            const deduction = calculateDayDeduction(dateStr, holidays, absences, dailyMeta);
            workingDays += Math.max(0, 1 - (deduction / dailyMeta));
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDays;
};

/**
 * Adiciona dias úteis a uma data.
 */
export const addBusinessDays = (startDate: string, daysToAdd: number, holidays: Holiday[] = [], absences: Absence[] = [], dailyMeta: number = 8): string => {
    if (daysToAdd <= 0) return startDate;
    let current = new Date(startDate + 'T12:00:00');
    let added = 0;
    while (added < daysToAdd) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = current.toISOString().split('T')[0];
            const deduction = calculateDayDeduction(dateStr, holidays, absences, dailyMeta);
            added += Math.max(0, 1 - (deduction / dailyMeta));
        }
    }
    return current.toISOString().split('T')[0];
};

/**
 * Interface para Alocação Diária
 */
export interface DayAllocation {
    date: string;
    plannedHours: number;
    bufferHours: number;
    totalOccupancy: number;
    isWorkingDay: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    isAbsent: boolean;
    isPartialAbsence?: boolean;
    absenceType?: string;
    capacity: number;
    deduction: number;
}

/**
 * Calcula o compromisso diário do colaborador com projetos contínuos.
 * Regra: Capacidade diária (ex: 8h) dividida pelo número de membros no projeto.
 */
export const getUserContinuousCommitment = (
    userId: string,
    allProjects: Project[],
    projectMembers: ProjectMember[],
    userDailyCap: number = 8,
    dateStr?: string
): number => {
    // REFORMULADO: Alocação automática por membresia foi abolida.
    // Como regra de negócio, assumimos que um colaborador tem compromisso de base (manutenções/apoio) 
    // de 50% da sua capacidade para fins de cálculo de data realista, a menos que especificado o contrário.
    return userDailyCap * 0.5;
};

/**
 * LÓGICA DE ALOCAÇÃO DIÁRIA (SIMULAÇÃO) - REFORMULADA
 * Prioridade: Planejado (O que sobra após compromisso contínuo) | Contínuo (Compromisso base ou 100% se sem planejado)
 */
/**
 * LÓGICA DE ALOCAÇÃO DIÁRIA (SIMULAÇÃO ENTERPRISE)
 * Resolve conflitos diários usando priorização:
 * 1. Prazo (mais próximo primeiro)
 * 2. Prioridade Fixa (Critical > High > ...)
 * 3. Percentual concluído
 */
export const simulateUserDailyAllocation = (
    userId: string,
    startDate: string,
    endDate: string,
    allProjects: Project[],
    allTasks: Task[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = [],
    userDailyCap: number = 8,
    absences: Absence[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = [],
    allUsers: User[] = []
): DayAllocation[] => {
    const allocations: DayAllocation[] = [];
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const todayStr = new Date().toISOString().split('T')[0];

    // Preparamos o backlog de tarefas ativas do usuário
    const userTasks = allTasks.filter(t => {
        const isAssigned = String(t.developerId) === String(userId) || (t.collaboratorIds || []).some((id: string) => String(id) === String(userId));
        return isAssigned && !t.deleted_at && t.status !== 'Done';
    }).map(t => {
        const effort = getUserTaskTotalEffort(t, userId, taskMemberAllocations, allUsers, holidays, absences, timesheetEntries, allTasks);
        const reported = timesheetEntries
            .filter(e => String(e.taskId) === String(t.id) && String(e.userId) === String(userId))
            .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);
        return { 
            ...t, 
            remainingEffort: Math.max(0, effort - reported),
            priorityScore: (t.priority === 'Critical' ? 10 : t.priority === 'High' ? 7 : t.priority === 'Medium' ? 4 : 1)
        };
    }).sort((a, b) => {
        // Priorização Avançada (Regra 1)
        if (a.estimatedDelivery !== b.estimatedDelivery) {
            return (a.estimatedDelivery || '9999').localeCompare(b.estimatedDelivery || '9999');
        }
        if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
        return (b.progress || 0) - (a.progress || 0);
    });

    let current = new Date(start);
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const deduction = calculateDayDeduction(dateStr, holidays, absences.filter(a => String(a.userId) === String(userId)), userDailyCap);
        const currentCapacity = Math.max(0, userDailyCap - deduction);
        const isWorkingDay = !isWeekend && currentCapacity > 0;

        // Apontamentos reais no dia (sempre contam)
        const reportedOnDay = timesheetEntries
            .filter(e => String(e.userId) === String(userId) && e.date === dateStr)
            .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);

        let dayReserved = reportedOnDay;
        const tasksOnDay: { id: string; hours: number }[] = [];

        if (isWorkingDay && dateStr >= todayStr) {
            // Distribuímos as tarefas para o dia respeitando a capacidade disponível
            userTasks.forEach(t => {
                if (dayReserved >= currentCapacity) return;
                const p = allProjects.find(proj => proj.id === t.projectId);
                if (!p || p.active === false) return;

                const tStart = t.scheduledStart || t.actualStart || p.startDate || todayStr;
                const tEnd = t.estimatedDelivery || p.estimatedDelivery || endDate;

                if (dateStr >= tStart && dateStr <= tEnd) {
                    const futureDays = getWorkingDaysInRange(dateStr, tEnd, holidays, absences, userDailyCap) || 1;
                    const dailyShare = t.remainingEffort / futureDays;
                    const canAllocate = Math.min(dailyShare, currentCapacity - dayReserved, t.remainingEffort);
                    
                    if (canAllocate > 0.1) {
                        dayReserved += canAllocate;
                        t.remainingEffort -= canAllocate; // Desconta do simulador para os próximos dias
                        tasksOnDay.push({ id: t.id, hours: canAllocate });
                    }
                }
            });
        }

        const isHoliday = holidays.some(h => dateStr >= h.date && dateStr <= (h.endDate || h.date));
        const activeAbsence = absences.find(a => {
            const isApproved = a.status === 'aprovada_gestao' || a.status === 'aprovada_rh' || a.status === 'finalizada_dp';
            return String(a.userId) === String(userId) && dateStr >= a.startDate && dateStr <= (a.endDate || a.startDate) && isApproved;
        });

        allocations.push({
            date: dateStr,
            plannedHours: Number(dayReserved.toFixed(2)),
            bufferHours: Number(Math.max(0, currentCapacity - dayReserved).toFixed(2)),
            totalOccupancy: Number(dayReserved.toFixed(2)),
            isWorkingDay,
            isWeekend,
            isHoliday,
            isAbsent: deduction >= userDailyCap,
            isPartialAbsence: deduction > 0 && deduction < userDailyCap,
            absenceType: activeAbsence ? activeAbsence.type : (isHoliday ? 'Feriado' : (isWeekend ? 'FDS' : undefined)),
            capacity: currentCapacity,
            deduction: Number(deduction.toFixed(2))
        });

        current.setDate(current.getDate() + 1);
    }

    return allocations;
};

/**
 * CÁLCULO DE DATA FINAL DA TAREFA PLANEJADA (PREVISÃO MATEMÁTICA)
 * REGRA: Se entrar em um projeto planejado, assume-se que ele pode dedicar ATÉ 100% para finalizar.
 * Mas respeitando a nova regra de prioridade de 50% para prazos regulares.
 * O usuário pediu: "se entrar em um projeto planejado, ele terá 100% ocupado, qual a data que ele vai finalizar essa tarefa?"
 */
/**
 * PREVISÃO REALISTA DE TÉRMINO (BACKLOG CUMULATIVO)
 * Regra 4: Calcula a data baseada na capacidade real líquida e em TODAS as tarefas concorrentes.
 */
export const calculateTaskPredictedEndDate = (
    task: Task,
    allProjects: Project[],
    allTasks: Task[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = [],
    userDailyCap: number = 8,
    taskMemberAllocations: TaskMemberAllocation[] = [],
    absences: Absence[] = [],
    allUsers: User[] = []
): { ideal: string; realistic: string; isSaturated?: boolean } => {
    const userId = String(task.developerId);
    const fallback = { ideal: task.estimatedDelivery || '', realistic: task.estimatedDelivery || '' };
    if (!userId || userId === 'undefined') return fallback;

    // Calculamos o backlog resolvendo as concorrências via simulação
    const todayStr = new Date().toISOString().split('T')[0];
    const simulationEnd = addBusinessDays(todayStr, 120, holidays, absences.filter(a => String(a.userId) === userId), userDailyCap);
    
    const dailySimulation = simulateUserDailyAllocation(
        userId, todayStr, simulationEnd, allProjects, allTasks, 
        projectMembers, timesheetEntries, holidays, userDailyCap, 
        absences, taskMemberAllocations, allUsers
    );

    // Encontramos o dia em que a tarefa específica em questão "ZERA" seu esforço na simulação
    // Para simplificar e garantir precisão enterprise, vamos ver quando o backlog ACUMULADO atinge o ponto da tarefa.
    // Mas a simulateUserDailyAllocation já desconta esforço. 
    // Então a data realista é o último dia que teve carga > 0 na simulação de longo prazo.
    const lastBusyDay = [...dailySimulation].reverse().find(d => d.plannedHours > 0.1);
    const realisticDate = lastBusyDay ? lastBusyDay.date : todayStr;

    // Ideal: Ignora velocity e outras tarefas (Foco total)
    const effort = getUserTaskTotalEffort(task, userId, taskMemberAllocations, allUsers, holidays, absences, timesheetEntries, allTasks);
    const reported = timesheetEntries
        .filter(e => String(e.taskId) === String(task.id) && String(e.userId) === userId)
        .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);
    const remaining = Math.max(0, effort - reported);
    const diasIdeal = Math.ceil(remaining / userDailyCap);
    const idealDate = addBusinessDays(todayStr, diasIdeal, holidays, absences.filter(a => String(a.userId) === userId), userDailyCap);

    return { 
        ideal: idealDate, 
        realistic: realisticDate, 
        isSaturated: dailySimulation.filter(d => d.isWorkingDay && d.bufferHours < 0.5).length > 20 
    };
};

/**
 * MAPA DE OCUPAÇÃO EM UM INTERVALO DE DATAS (GENÉRICO)
 */
export const getUserAvailabilityInRange = (
    user: User,
    startDate: string,
    endDate: string,
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    tasks: Task[],
    holidays: Holiday[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = [],
    absences: Absence[] = [],
    allUsers: User[] = []
): {
    capacity: number;
    plannedHours: number;
    continuousHours: number;
    totalOccupancy: number;
    occupancyRate: number;
    balance: number;
    status: 'Sobrecarregado' | 'Alto' | 'Disponível';
    performed: number;
    allocated: number;
    available: number;
    breakdown: {
        planned: { id: string; name: string; hours: number }[];
        continuous: { id: string; name: string; hours: number }[];
        tasks: { id: string; projectId: string; hours: number; reported: number }[];
    };
    dailyOccupancy: { date: string; totalOccupancy: number }[];
} => {
    const dailyGoal = user.dailyAvailableHours || 8;
    const userAbsences = absences.filter(a => String(a.userId) === String(user.id));
    
    // Regra 2: Capacidade como fonte única
    const capacity = getUserCapacityOnPeriod(user, startDate, endDate, holidays, userAbsences);

    // 1. Detalhamento de Projetos e Carga das Tarefas
    const plannedProjectsBreakdown: { id: string; name: string; hours: number }[] = [];
    let plannedHoursTotal = 0;
    const continuousProjectsBreakdown: { id: string; name: string; hours: number }[] = [];
    let continuousHoursTotal = 0;
    const tasksBreakdown: { id: string; projectId: string; hours: number; reported: number }[] = [];
    let totalPerformed = 0;

    tasks.forEach(t => {
        const isMember = String(t.developerId) === String(user.id) || t.collaboratorIds?.some((id: string) => String(id) === String(user.id));
        if (!isMember || !!t.deleted_at) return;

        const p = projects.find(proj => String(proj.id) === String(t.projectId));
        if (!p) return;

        const { effortInPeriod, reportedInRange } = getTaskLoadOnPeriod(
            t, user, p, timesheetEntries, taskMemberAllocations,
            startDate, endDate, startDate, endDate, holidays, userAbsences, dailyGoal, allUsers, tasks
        );

        totalPerformed += reportedInRange;

        if (effortInPeriod > 0 || reportedInRange > 0) {
            tasksBreakdown.push({ 
                id: t.id, 
                projectId: t.projectId, 
                hours: Number(effortInPeriod.toFixed(2)),
                reported: Number(reportedInRange.toFixed(2))
            });

            if (p.project_type === 'continuous') {
                continuousHoursTotal += effortInPeriod;
                const existing = continuousProjectsBreakdown.find(pb => pb.id === p.id);
                if (existing) existing.hours += effortInPeriod;
                else continuousProjectsBreakdown.push({ id: p.id, name: p.name, hours: effortInPeriod });
            } else {
                plannedHoursTotal += effortInPeriod;
                const existing = plannedProjectsBreakdown.find(pb => pb.id === p.id);
                if (existing) existing.hours += effortInPeriod;
                else plannedProjectsBreakdown.push({ id: p.id, name: p.name, hours: effortInPeriod });
            }
        }
    });

    plannedProjectsBreakdown.forEach(pb => pb.hours = Number(pb.hours.toFixed(2)));
    continuousProjectsBreakdown.forEach(pb => pb.hours = Number(pb.hours.toFixed(2)));

    const totalOccupancy = plannedHoursTotal + continuousHoursTotal;
    const occupancyRateVal = capacity > 0 ? (totalOccupancy / capacity) : 0;
    const balance = capacity - totalOccupancy;

    let status: 'Sobrecarregado' | 'Alto' | 'Disponível' = 'Disponível';
    if (occupancyRateVal > 1.05) status = 'Sobrecarregado'; // 5% de margem
    else if (occupancyRateVal >= 0.85) status = 'Alto';

    // 2. Simulação de Distribuição Diária para o Heatmap
    const dailyAllocations = simulateUserDailyAllocation(
        String(user.id), startDate, endDate, projects, tasks, projectMembers, 
        timesheetEntries, holidays, dailyGoal, userAbsences, taskMemberAllocations, allUsers
    );

    const dailyOccupancy = dailyAllocations.map(d => ({
        date: d.date,
        totalOccupancy: d.totalOccupancy
    }));

    return {
        capacity: Number(capacity.toFixed(2)) || 0,
        plannedHours: Number(plannedHoursTotal.toFixed(2)) || 0,
        continuousHours: Number(continuousHoursTotal.toFixed(2)) || 0,
        totalOccupancy: Number(totalOccupancy.toFixed(2)) || 0,
        occupancyRate: Number((occupancyRateVal * 100).toFixed(2)) || 0,
        balance: Number(balance.toFixed(2)) || 0,
        status,
        performed: Number(totalPerformed.toFixed(2)) || 0,
        allocated: Number(totalOccupancy.toFixed(2)) || 0,
        available: Number(balance.toFixed(2)) || 0,
        breakdown: {
            planned: plannedProjectsBreakdown,
            continuous: continuousProjectsBreakdown,
            tasks: tasksBreakdown
        },
        dailyOccupancy
    };
};

/**
 * MAPA DE OCUPAÇÃO MENSAL
 */
export const getUserMonthlyAvailability = (
    user: User,
    monthStr: string, // "YYYY-MM"
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    tasks: Task[],
    holidays: Holiday[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = [],
    absences: Absence[] = [],
    allUsers: User[] = []
): any => {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = `${monthStr}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return getUserAvailabilityInRange(
        user,
        startDate,
        endDate,
        projects,
        projectMembers,
        timesheetEntries,
        tasks,
        holidays,
        taskMemberAllocations,
        absences,
        allUsers
    );
};

/**
 * Helpers legados
 */
export const calculateProjectWeightedProgress = (projectId: string, tasks: Task[]): number => {
    const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId));
    if (projectTasks.length === 0) return 0;

    let totalWeight = 0;
    let totalWeightedProgress = 0;

    projectTasks.forEach(t => {
        const weight = Number(t.estimatedHours) || 0;
        const progress = Number(t.progress) || (t.status === 'Done' ? 100 : 0);
        totalWeight += weight;
        totalWeightedProgress += weight * progress;
    });

    if (totalWeight === 0) {
        const sumProgress = projectTasks.reduce((sum, t) => sum + (Number(t.progress) || (t.status === 'Done' ? 100 : 0)), 0);
        return sumProgress / projectTasks.length;
    }

    return totalWeightedProgress / totalWeight;
};

export const calculateProjectTaskWeights = (projectId: string, tasks: Task[]): Task[] => {
    const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId));
    const totalForecast = projectTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
    return tasks.map(t => {
        if (String(t.projectId) === String(projectId)) {
            const peso = totalForecast > 0 ? (Number(t.estimatedHours) || 0) / totalForecast : 0;
            return { ...t, task_weight: peso };
        }
        return t;
    });
};

/**
 * Calcula a data estimada de "Backlog Free"
 * Nova regra: Assume que o colaborador dedica 100% ao planejado para definir a data de entrega final.
 */
export const calculateIndividualReleaseDate = (
    user: User,
    allProjects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    allTasks: Task[],
    holidays: Holiday[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = [],
    absences: Absence[] = [],
    allUsers: User[] = []
): { ideal: string; realistic: string; isSaturated?: boolean } | null => {
    // Reutilizamos a lógica cumulativa realista
    const firstTask = allTasks.find(t => String(t.developerId) === String(user.id) || t.collaboratorIds?.some(id => String(id) === String(user.id)));
    if (!firstTask) return null;

    return calculateTaskPredictedEndDate(
        firstTask, allProjects, allTasks, projectMembers, 
        timesheetEntries, holidays, user.dailyAvailableHours || 8, 
        taskMemberAllocations, absences, allUsers
    );
};

/**
 * TENDÊNCIA DE SATURAÇÃO (PRÓXIMOS 90 DIAS)
 * Analisa a evolução da taxa de saturação e carga.
 */
export const calculateTeamSaturationTrend = (
    users: User[],
    allProjects: Project[],
    projectMembers: ProjectMember[],
    allTasks: Task[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = []
): { month: string; saturationRate: number; avgLoad: number }[] => {
    const trends: { month: string; saturationRate: number; avgLoad: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 4; i++) {
        const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthStr = futureDate.toISOString().slice(0, 7);

        const operationalUsers = users.filter(u => u.active !== false && (u.torre || '').toUpperCase() !== 'N/A');
        if (operationalUsers.length === 0) continue;

        let saturatedCount = 0;
        let totalLoad = 0;

        operationalUsers.forEach(u => {
            const availability = getUserMonthlyAvailability(u, monthStr, allProjects, projectMembers, timesheetEntries, allTasks, holidays, taskMemberAllocations, [], users);
            totalLoad += availability.occupancyRate;

            if (availability.occupancyRate >= 100) {
                saturatedCount++;
            }
        });

        trends.push({
            month: monthStr,
            saturationRate: (saturatedCount / operationalUsers.length) * 100,
            avgLoad: totalLoad / operationalUsers.length
        });
    }

    return trends;
};

/**
 * ÍNDICE DE ELASTICIDADE DA EQUIPE
 * Quanto % da capacidade total ainda pode absorver novos projetos (buffer real).
 */
export const calculateTeamElasticity = (
    users: User[],
    monthStr: string,
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    tasks: Task[],
    holidays: Holiday[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = []
): number => {
    const operationalUsers = users.filter(u => u.active !== false && (u.torre || '').toUpperCase() !== 'N/A');
    if (operationalUsers.length === 0) return 0;

    let totalCapacity = 0;
    let totalAvailable = 0;

    operationalUsers.forEach(u => {
        const data = getUserMonthlyAvailability(u, monthStr, projects, projectMembers, timesheetEntries, tasks, holidays, taskMemberAllocations, [], users);
        totalCapacity += data.capacity;
        totalAvailable += Math.max(0, data.available); // Apenas saldo positivo conta como elasticidade
    });

    return totalCapacity > 0 ? (totalAvailable / totalCapacity) * 100 : 0;
};

/**
 * SIMULAÇÃO DE IMPACTO DE NOVO PROJETO
 * "Se eu vender um projeto de X horas, como fica a equipe?"
 */
export const simulateNewProjectImpact = (
    hours: number,
    users: User[],
    allProjects: Project[],
    projectMembers: ProjectMember[],
    allTasks: Task[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = [],
    taskMemberAllocations: TaskMemberAllocation[] = []
): { userId: string; name: string; releaseDateBefore: string; releaseDateAfter: string; isNewSaturated: boolean }[] => {
    const impact: any[] = [];
    const operationalUsers = users.filter(u => u.active !== false && (u.torre || '').toUpperCase() !== 'N/A');

    operationalUsers.forEach(u => {
        const current = calculateIndividualReleaseDate(u, allProjects, projectMembers, timesheetEntries, allTasks, holidays, taskMemberAllocations);
        if (!current) return;

        // Simula o acréscimo de horas distribuído no backlog do usuário
        // Criamos uma tarefa "fantasma" para simular o efeito
        const ghostTask: Task = {
            id: 'ghost',
            projectId: 'ghost_proj',
            developerId: u.id,
            status: 'Todo',
            estimatedHours: hours,
            title: 'Simulação'
        } as any;

        const simulatedTasks = [...allTasks, ghostTask];
        const after = calculateIndividualReleaseDate(u, allProjects, projectMembers, timesheetEntries, simulatedTasks, holidays, taskMemberAllocations);

        impact.push({
            userId: u.id,
            name: u.name,
            releaseDateBefore: current.realistic,
            releaseDateAfter: after?.realistic || current.realistic,
            isNewSaturated: after?.isSaturated || false
        });
    });

    return impact.sort((a, b) => {
        // Ordena por maior impacto (maior deslocamento de data)
        return new Date(b.releaseDateAfter).getTime() - new Date(a.releaseDateAfter).getTime();
    });
};
/**
 * CÁLCULO DE CAPACIDADE E SALDO DO USUÁRIO NO MÊS
 */
export const calculateUserCapacity = (
    userId: string,
    referenceDate: Date,
    allTasks: Task[],
    holidays: Holiday[] = [],
    absences: Absence[] = [],
    dailyCap: number = 8,
    allUsers: User[] = []
) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = `${monthStr}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const userAbsences = absences.filter(a =>
        String(a.userId) === String(userId) &&
        (a.status === 'aprovada_gestao' || a.status === 'aprovada_rh' || a.status === 'finalizada_dp')
    );
    const workingDays = getWorkingDaysInRange(startDate, endDate, holidays, userAbsences);
    const monthlyCapacity = dailyCap * workingDays;

    const capacityData = getUserAvailabilityInRange(
        { id: userId, dailyAvailableHours: dailyCap } as User,
        startDate, endDate, 
        [], [], [], allTasks, holidays, [], absences, allUsers
    );

    return {
        monthlyCapacity,
        allocatedHours: capacityData.allocated,
        availableBalance: capacityData.available
    };
};
