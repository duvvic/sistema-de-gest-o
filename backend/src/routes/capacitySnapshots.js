import express from 'express';
import { capacitySnapshotService, CAPACITY_ALGORITHM_VERSION } from '../services/capacitySnapshotService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

const router = express.Router();

/**
 * POST /api/v1/capacity-snapshots
 * Grava snapshots de capacidade + alocação em uma operação atômica.
 *
 * Body:
 * {
 *   month: 'YYYY-MM',
 *   snapshots: [...],          // dados de capacidade por usuário
 *   allocationSnapshots: [...] // dados por tarefa
 * }
 */
router.post('/', async (req, res) => {
    try {
        const { month, snapshots = [], allocationSnapshots = [] } = req.body;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return sendError(res, 'Campo "month" inválido. Use o formato YYYY-MM.', 400);
        }
        if (!Array.isArray(snapshots) || snapshots.length === 0) {
            return sendError(res, 'Campo "snapshots" deve ser um array não vazio.', 400);
        }

        const createdBy = req.user?.id || 'api';

        const result = await capacitySnapshotService.saveTransactionalSnapshot(
            month,
            snapshots,
            allocationSnapshots,
            createdBy
        );

        if (result.errors?.length > 0 && result.saved === 0) {
            return sendError(res, result.errors.join('; '), 409);
        }

        return sendSuccess(res, {
            message: 'Snapshot salvo com sucesso',
            month,
            algorithm_version: CAPACITY_ALGORITHM_VERSION,
            ...result
        });
    } catch (err) {
        console.error('[SnapshotRoute POST] Erro:', err.message);
        return sendError(res, err.message, 500);
    }
});

/**
 * GET /api/v1/capacity-snapshots/months
 * Lista os meses disponíveis com metadados de versionamento.
 */
router.get('/months', async (req, res) => {
    try {
        const months = await capacitySnapshotService.listSnapshotMonths();
        return sendSuccess(res, months);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
});

/**
 * GET /api/v1/capacity-snapshots/version
 * Retorna a versão atual do algoritmo de cálculo.
 */
router.get('/version', (req, res) => {
    return sendSuccess(res, { algorithm_version: CAPACITY_ALGORITHM_VERSION });
});

/**
 * GET /api/v1/capacity-snapshots/team/:month
 * Retorna o snapshot completo da equipe para um mês —
 * inclui capacidade, alocações e metadados de cálculo.
 */
router.get('/team/:month', async (req, res) => {
    try {
        const { month } = req.params;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return sendError(res, 'Formato de mês inválido. Use YYYY-MM.', 400);
        }
        const data = await capacitySnapshotService.getTeamSnapshotByMonth(month);
        return sendSuccess(res, data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
});

/**
 * GET /api/v1/capacity-snapshots/user/:userId
 * Retorna o histórico de capacidade de um colaborador.
 * Query params: fromMonth, toMonth  (ex: ?fromMonth=2025-01&toMonth=2025-12)
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { fromMonth, toMonth } = req.query;
        const data = await capacitySnapshotService.getUserCapacityHistory(userId, fromMonth, toMonth);
        return sendSuccess(res, data);
    } catch (err) {
        return sendError(res, err.message, 500);
    }
});

/**
 * GET /api/v1/capacity-snapshots/integrity/:month
 * Valida a integridade dos snapshots de um mês específico.
 * Útil para auditoria financeira — detecta adulteração de dados.
 */
router.get('/integrity/:month', async (req, res) => {
    try {
        const { month } = req.params;
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return sendError(res, 'Formato de mês inválido. Use YYYY-MM.', 400);
        }
        const report = await capacitySnapshotService.validateSnapshotIntegrity(month);
        const tampered = report.filter(r => !r.isIntact);
        return sendSuccess(res, {
            month,
            total: report.length,
            intact: report.filter(r => r.isIntact).length,
            tampered: tampered.length,
            tamperedUsers: tampered.map(r => r.userId),
            details: report
        });
    } catch (err) {
        return sendError(res, err.message, 500);
    }
});

export default router;
