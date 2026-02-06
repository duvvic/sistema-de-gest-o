import express from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { checkProjectHasTasks, checkTaskHasHours } from '../services/projectService.js';

const router = express.Router();

// GET /api/admin/clients
router.get('/clients', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('dim_clientes')
            .select('ID_Cliente, NomeCliente')
            .eq('ativo', true)
            .order('NomeCliente');

        if (error) throw error;
        res.json(data.map(c => ({ id: c.ID_Cliente, name: c.NomeCliente })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/projects
router.get('/projects', requireAdmin, async (req, res) => {
    try {
        const { clientIds } = req.query;
        let query = supabaseAdmin
            .from('dim_projetos')
            .select('ID_Projeto, NomeProjeto, ID_Cliente')
            .eq('ativo', true)
            .order('NomeProjeto');

        if (clientIds) {
            const ids = clientIds.split(',').map(Number);
            query = query.in('ID_Cliente', ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data.map(p => ({ id: p.ID_Projeto, name: p.NomeProjeto, clientId: p.ID_Cliente })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/collaborators
router.get('/collaborators', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('dim_colaboradores')
            .select('ID_Colaborador, NomeColaborador, email, role')
            .eq('ativo', true)
            .order('NomeColaborador');

        if (error) throw error;
        res.json(data.map(c => ({ id: c.ID_Colaborador, name: c.NomeColaborador, email: c.email, role: c.role })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/tasks
router.get('/tasks', requireAdmin, async (req, res) => {
    try {
        const { projectIds } = req.query;
        let query = supabaseAdmin
            .from('fato_tarefas')
            .select('id_tarefa_novo, Afazer, ID_Projeto')
            .order('Afazer');

        if (projectIds) {
            const ids = projectIds.split(',').map(Number);
            query = query.in('ID_Projeto', ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data.map(t => ({ id: t.id_tarefa_novo, name: t.Afazer, projectId: t.ID_Projeto })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/projects/:id
router.delete('/projects/:id', requireAdmin, async (req, res) => {
    try {
        const projectId = req.params.id;
        console.log(`[DELETE Project] Attempting to delete project ID: "${projectId}"`);

        // Validar se o projeto tem tarefas
        const hasTasks = await checkProjectHasTasks(projectId);
        console.log(`[DELETE Project] Has tasks? ${hasTasks}`);

        if (hasTasks) {
            console.warn(`[DELETE Project] Blocked: Project ${projectId} has tasks.`);
            return res.status(400).json({
                error: 'Não é possível excluir este projeto pois existem tarefas criadas nele.'
            });
        }

        // Exclusão FÍSICA do projeto (Hard Delete)
        // Force ID validation
        const numericId = parseInt(projectId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'ID de projeto inválido' });
        }

        // 1. Remover membros do projeto para evitar FK constraint (se não for cascade)
        await supabaseAdmin.from('project_members').delete().eq('id_projeto', numericId);

        // 2. Tentar excluir o projeto
        const { data, error } = await supabaseAdmin
            .from('dim_projetos')
            .delete() // MUDANÇA: Delete ao invés de Update
            .eq('ID_Projeto', numericId)
            .select();

        console.log(`[DELETE Project] Delete result - Error: ${error?.message}, Data length: ${data?.length}`);

        if (error) {
            // Se erro for de FK, avisar usuário
            if (error.code === '23503') { // foreign_key_violation
                throw new Error('Não é possível excluir o projeto pois existem registros vinculados (Ex: Horas, Custos).');
            }
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`[DELETE Project] Warning: No rows deleted for ID ${numericId}. Project might not exist.`);
            return res.status(404).json({ error: 'Projeto não encontrado ou já excluído.' });
        }

        res.json({ success: true, message: 'Projeto excluído permanentemente.' });
    } catch (e) {
        console.error('Erro ao excluir projeto:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/tasks/:id
router.delete('/tasks/:id', requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;

        // Validar se a tarefa tem horas apontadas
        const hasHours = await checkTaskHasHours(taskId);
        if (hasHours) {
            return res.status(400).json({
                error: 'Não é possível excluir esta tarefa pois existem horas apontadas nela.'
            });
        }

        // Exclusão física da tarefa
        const { error } = await supabaseAdmin
            .from('fato_tarefas')
            .delete()
            .eq('id_tarefa_novo', taskId);

        if (error) throw error;
        res.json({ success: true, message: 'Tarefa excluída com sucesso.' });
    } catch (e) {
        console.error('Erro ao excluir tarefa:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
