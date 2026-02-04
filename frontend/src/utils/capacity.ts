import { User, Task, Project } from '@/types';

/**
 * Calcula as horas alocadas para um usuário em um determinado mês/ano
 * com base nas horas estimadas das tarefas.
 */
export const getMonthlyAllocatedHours = (
    userId: string,
    monthStr: string, // Formato "YYYY-MM"
    tasks: Task[]
): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Último dia do mês

    let totalAllocated = 0;

    const userTasks = tasks.filter(t =>
        (t.developerId === userId || (t.collaboratorIds && t.collaboratorIds.includes(userId))) &&
        t.status !== 'Done' // Apenas tarefas não concluídas consomem capacidade futura
    );

    userTasks.forEach(task => {
        if (!task.estimatedHours) return;

        const taskStart = task.scheduledStart ? new Date(task.scheduledStart) : (task.actualStart ? new Date(task.actualStart) : new Date());
        const taskEnd = task.estimatedDelivery ? new Date(task.estimatedDelivery) : taskStart;

        // Se a tarefa não tem intervalo definido ou o fim é antes do início, assume um dia
        const startTime = taskStart.getTime();
        const endTime = Math.max(startTime, taskEnd.getTime());

        // Total de dias da tarefa (mínimo 1)
        const totalTaskDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1);

        // Dias da tarefa que caem dentro do mês alvo
        const overlapStart = Math.max(startTime, monthStart.getTime());
        const overlapEnd = Math.min(endTime, monthEnd.getTime());

        if (overlapStart <= overlapEnd) {
            const overlapDays = Math.max(1, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);

            // Proporção de horas da tarefa para este mês
            const userCount = 1 + (task.collaboratorIds?.length || 0); // Assume divisão igual entre os colaboradores?
            // Ou talvez o estimatedHours já seja individual? (O sistema parece tratar estimatedHours por tarefa)
            // Se for por tarefa, dividimos pelo número de alocados se o developerId não for o único.

            const taskHoursForUser = task.estimatedHours; // Vamos assumir por enquanto que estimatedHours é a carga para o "dono" ou total.
            // Se houver múltiplos colaboradores, a lógica de "dividir" depende da política da empresa.
            // O usuário disse: "pensando também quantas horas será dividido para cada colaborador".

            const individualTaskHours = taskHoursForUser / userCount;
            const hoursInMonth = (overlapDays / totalTaskDays) * individualTaskHours;

            totalAllocated += hoursInMonth;
        }
    });

    return Math.round(totalAllocated);
};

export const getUserMonthlyAvailability = (
    user: User,
    monthStr: string,
    tasks: Task[]
): { capacity: number; allocated: number; available: number } => {
    const capacity = user.monthlyAvailableHours || 160;
    const allocated = getMonthlyAllocatedHours(user.id, monthStr, tasks);
    return {
        capacity,
        allocated,
        available: capacity - allocated
    };
};
