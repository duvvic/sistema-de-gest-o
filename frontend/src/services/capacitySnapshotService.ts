import api from './api';
import * as CapacityUtils from '@/utils/capacity';
import { calculateUserVelocity } from '@/utils/capacity';
import { getWorkingDaysInRange } from '@/utils/capacity';
import type {
    User, Project, ProjectMember, Task, TimesheetEntry,
    Holiday, TaskMemberAllocation, Absence
} from '@/types';

/** Versão atual do algoritmo — deve coincidir com CAPACITY_ALGORITHM_VERSION no backend */
export const CAPACITY_ALGORITHM_VERSION = '2.0.0';

export interface CalculationContext {
    workingDays: number;
    holidaysConsidered: number;
    totalTasks: number;
    totalAbsences: number;
    algorithmParams: {
        velocityClamped: boolean;
        velocityMin: number;
        velocityMax: number;
        futureDaysDistribution: boolean;
    };
}

export interface CapacitySnapshotRecord {
    userId: string;
    userName: string;
    month: string;
    capacity: number;
    allocated: number;
    plannedHours: number;
    continuousHours: number;
    performed: number;
    occupancyRate: number;
    available: number;
    status: string;
    forecastIdeal?: string;
    forecastRealistic?: string;
    isSaturated?: boolean;
    velocity: number;
    calculationContext: CalculationContext;
}

export interface AllocationSnapshotRecord {
    userId: string;
    month: string;
    taskId: string;
    projectId: string;
    projectName: string;
    taskTitle: string;
    effortInMonth: number;
    effortBase: number;         // esforço ANTES de velocity
    velocityApplied: number;    // velocity congelado no momento
    reportedHours: number;
    remainingHours: number;
}

/**
 * Serviço de Snapshot de Capacidade — Frontend v2
 * Implementa as 5 regras enterprise de auditabilidade.
 */
export const capacitySnapshotService = {

    /**
     * Compila e persiste snapshots mensais imutáveis para toda a equipe.
     * Envia capacity + allocation em uma operação atômica via API.
     */
    async saveTeamSnapshot(
        month: string,
        users: User[],
        projects: Project[],
        projectMembers: ProjectMember[],
        tasks: Task[],
        timesheetEntries: TimesheetEntry[],
        holidays: Holiday[],
        taskMemberAllocations: TaskMemberAllocation[],
        absences: Absence[]
    ): Promise<{ saved: number; skipped: number; errors: string[] }> {
        const operationalUsers = users.filter(u =>
            u.active !== false && (u.torre || '').toUpperCase() !== 'N/A'
        );

        const [year, mon] = month.split('-').map(Number);
        const monthStart = `${month}-01`;
        const monthEnd = new Date(year, mon, 0).toISOString().split('T')[0];

        const snapshots: CapacitySnapshotRecord[] = [];
        const allocationSnapshots: AllocationSnapshotRecord[] = [];

        for (const user of operationalUsers) {
            const userAbsences = absences.filter(a => String(a.userId) === String(user.id));
            const userTasks = tasks.filter(t =>
                (String(t.developerId) === String(user.id) ||
                 (t.collaboratorIds || []).some(id => String(id) === String(user.id))) &&
                !t.deleted_at
            );

            // 1. Métricas mensais
            const capData = CapacityUtils.getUserMonthlyAvailability(
                user, month, projects, projectMembers, timesheetEntries,
                tasks, holidays, taskMemberAllocations, absences, users
            );

            // 2. Forecast cumulativo
            const releaseDate = CapacityUtils.calculateIndividualReleaseDate(
                user, projects, projectMembers, timesheetEntries,
                tasks, holidays, taskMemberAllocations, absences, users
            );

            // 3. Velocity individual (Regra 5 — congelado no momento)
            const velocity = calculateUserVelocity(String(user.id), timesheetEntries, tasks);

            // 4. Contexto de cálculo (Regra 2 — JSONB auditável)
            const workingDays = getWorkingDaysInRange(monthStart, monthEnd, holidays, userAbsences, user.dailyAvailableHours || 8);
            const calculationContext: CalculationContext = {
                workingDays: Number(workingDays.toFixed(2)),
                holidaysConsidered: holidays.filter(h => {
                    const hDate = h.date;
                    return hDate >= monthStart && hDate <= monthEnd;
                }).length,
                totalTasks: userTasks.length,
                totalAbsences: userAbsences.length,
                algorithmParams: {
                    velocityClamped: true,
                    velocityMin: 0.6,
                    velocityMax: 1.8,
                    futureDaysDistribution: true
                }
            };

            snapshots.push({
                userId: String(user.id),
                userName: user.name,
                month,
                capacity: capData.capacity,
                allocated: capData.allocated,
                plannedHours: capData.plannedHours,
                continuousHours: capData.continuousHours,
                performed: capData.performed,
                occupancyRate: capData.occupancyRate,
                available: capData.available,
                status: capData.status,
                forecastIdeal: releaseDate?.ideal,
                forecastRealistic: releaseDate?.realistic,
                isSaturated: releaseDate?.isSaturated,
                velocity,
                calculationContext
            });

            // 5. Breakdown por tarefa com velocity congelado (Regra 5)
            if (capData.breakdown?.tasks) {
                for (const tb of capData.breakdown.tasks as Array<{ id: string; projectId: string; hours: number; reported: number }>) {
                    const task = tasks.find(t => t.id === tb.id);
                    const project = projects.find(p => p.id === tb.projectId);
                    if (!task) continue;

                    const totalReported = timesheetEntries
                        .filter(e => e.taskId === tb.id && String(e.userId) === String(user.id))
                        .reduce((s, e) => s + (Number(e.totalHours) || 0), 0);

                    const alloc = taskMemberAllocations.find(a =>
                        String(a.taskId) === String(tb.id) && String(a.userId) === String(user.id)
                    );
                    const baseEffort = alloc?.reservedHours
                        ? Number(alloc.reservedHours)
                        : (Number(task.estimatedHours) || 0);

                    allocationSnapshots.push({
                        userId: String(user.id),
                        month,
                        taskId: tb.id,
                        projectId: tb.projectId,
                        projectName: project?.name || '',
                        taskTitle: task.title || '',
                        effortInMonth: tb.hours,
                        effortBase: baseEffort,           // sem velocity
                        velocityApplied: velocity,        // velocity congelado
                        reportedHours: tb.reported,
                        remainingHours: Math.max(0, baseEffort * velocity - totalReported)
                    });
                }
            }
        }

        // ENVIO ATÔMICO (Regra 4)
        const response = await api.post('/capacity-snapshots', {
            month,
            snapshots,
            allocationSnapshots
        });

        return response.data?.data || { saved: 0, skipped: 0, errors: [] };
    },

    /**
     * Busca o snapshot completo da equipe para um mês (capacidade + alocações).
     */
    async getTeamSnapshotByMonth(month: string) {
        const response = await api.get(`/capacity-snapshots/team/${month}`);
        return response.data?.data || { capacitySnapshots: [], allocationSnapshots: [] };
    },

    /**
     * Busca o histórico de um colaborador com filtros opcionais.
     */
    async getUserHistory(userId: string, fromMonth?: string, toMonth?: string) {
        const params: Record<string, string> = {};
        if (fromMonth) params.fromMonth = fromMonth;
        if (toMonth) params.toMonth = toMonth;
        const response = await api.get(`/capacity-snapshots/user/${userId}`, { params });
        return response.data?.data || [];
    },

    /**
     * Lista meses disponíveis com metadados de versão do algoritmo.
     */
    async listAvailableMonths() {
        const response = await api.get('/capacity-snapshots/months');
        return response.data?.data || [];
    },

    /**
     * Verifica a integridade dos snapshots de um mês (auditoria financeira).
     */
    async validateIntegrity(month: string) {
        const response = await api.get(`/capacity-snapshots/integrity/${month}`);
        return response.data?.data || { intact: 0, tampered: 0, details: [] };
    },

    /**
     * Retorna a versão atual do algoritmo registrada no backend.
     */
    async getAlgorithmVersion(): Promise<string> {
        try {
            const response = await api.get('/capacity-snapshots/version');
            return response.data?.data?.algorithm_version || CAPACITY_ALGORITHM_VERSION;
        } catch {
            return CAPACITY_ALGORITHM_VERSION;
        }
    }
};
