import { Project, Task } from "../types";

export const getProjectStatusByTimeline = (p: Project, tasks?: Task[]) => {
    if (p.status === 'Concluído' || p.status === 'CONCLUÍDO') return 'CONCLUÍDO';
    if (p.endDateReal && p.endDateReal.trim() !== "") return 'CONCLUÍDO';

    // Se todas as tarefas estiverem concluídas, o projeto está concluído
    if (tasks && tasks.length > 0 && tasks.every(t => t.status === 'Done' || (t.progress || 0) >= 100)) {
        return 'CONCLUÍDO';
    }

    // Status ATRASADO agora depende de TAREFAS (Request 3)
    if (tasks && tasks.length > 0) {
        const hasDelayedTask = tasks.some(t => {
            if (t.status === 'Done') return false;
            if (!t.estimatedDelivery) return false;
            const deliveryDate = new Date(t.estimatedDelivery + 'T23:59:59');
            return deliveryDate < new Date();
        });

        // O usuário mencionou que status atrasado tem relação a status da tarefa
        if (hasDelayedTask) return 'ATRASADO';
    }

    if (p.startDateReal && p.startDateReal.trim() !== "") return 'EM ANDAMENTO';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Se não tem tarefas atrasadas, checamos se o projeto já iniciou ou se está no prazo
    if (p.startDate && p.startDate.trim() !== "") {
        const startP = new Date(p.startDate + 'T12:00:00');
        if (now >= startP) return 'INICIADO';
    }

    return 'NÃO INICIADO';
};

export const getProjectStatusColor = (status: string) => {
    switch (status) {
        case 'CONCLUÍDO':
            return {
                text: 'text-emerald-600 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-800',
                bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
                dot: 'bg-emerald-500'
            };
        case 'ATRASADO':
            return {
                text: 'text-red-600 dark:text-red-400',
                border: 'border-red-200 dark:border-red-800',
                bg: 'bg-red-500/5 dark:bg-red-500/10',
                dot: 'bg-red-500'
            };
        case 'EM ANDAMENTO':
        case 'INICIADO':
            return {
                text: 'text-blue-600 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-800',
                bg: 'bg-blue-500/5 dark:bg-blue-500/10',
                dot: 'bg-blue-500'
            };
        default:
            return {
                text: 'text-slate-600 dark:text-slate-400',
                border: 'border-slate-200 dark:border-slate-800',
                bg: 'bg-slate-500/5 dark:bg-slate-500/10',
                dot: 'bg-slate-500'
            };
    }
};
