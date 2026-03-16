import { clientRepository } from '../repositories/clientRepository.js';
import { auditService } from '../audit/auditService.js';
import { auditContext } from '../audit/auditMiddleware.js';
import { isAdmUser } from '../utils/security.js';
import { projectService } from './projectService.js';

export const clientService = {
    async getAllClients(user, includeInactive, options = {}) {
        const query = {
            page: options.page,
            limit: options.limit,
            order: options.sort ? { column: options.sort, ascending: options.order !== 'desc' } : { column: 'nome', ascending: true },
            filters: {},
            in: {}
        };

        if (includeInactive !== 'true') {
            query.filters.ativo = true;
        }

        if (!isAdmUser(user)) {
            // Se não for admin, busca apenas clientes de projetos vinculados
            const projects = await projectService.getAllProjects(user);
            const clientIds = [...new Set(projects.map(p => p.cliente_id))];

            if (clientIds.length === 0) return [];
            query.in.id = clientIds;
        }

        return await clientRepository.findAll(query);
    },

    async getClientById(user, id) {
        const client = await clientRepository.findById(id);

        if (client && !isAdmUser(user)) {
            const projects = await projectService.getAllProjects(user);
            const clientIds = [...new Set(projects.map(p => p.cliente_id))];

            if (!clientIds.includes(Number(id))) {
                const error = new Error('Você não tem permissão para visualizar este cliente.');
                error.status = 403;
                throw error;
            }
        }

        return client;
    },

    async createClient(data) {
        // Formata os dados conforme a tabela dim_clientes
        const payload = {
            NomeCliente: data.NomeCliente?.trim() || "(Sem nome)",
            ativo: data.ativo ?? true,
            NewLogo: data.NewLogo || data.logoUrl || null,
            Pais: data.Pais || data.pais || null,
            tipo_cliente: data.tipo_cliente || 'cliente_final',
            partner_id: data.partner_id || null,
            responsavel_interno_id: data.responsavel_interno_id || null,
            responsavel_externo: data.responsavel_externo || data.Responsavel || null,
            email_contato: data.email_contato || data.email || data["E-mail"] || null,
            contato_principal: data.contato_principal || data.responsavel_externo || data.Responsavel || null,
            telefone: data.telefone || data.Telefone || null,
            cnpj: data.cnpj || null,
            doc_nic_ativo: data.doc_nic_ativo ?? false,
            Criado: data.Criado || new Date().toISOString().split('T')[0]
        };

        if (payload.tipo_cliente === 'cliente_final' && !payload.partner_id) {
            throw new Error('Todo cliente deve estar obrigatoriamente vinculado a um parceiro responsável.');
        }

        const created = await clientRepository.create(payload);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            userName: context.userName,
            action: 'CREATE',
            entity: 'dim_clientes',
            entityId: created.ID_Cliente,
            entityName: created.NomeCliente,
            newData: created,
            ip: context.ip
        });

        return created;
    },

    async updateClient(id, data) {
        const client = await clientRepository.findById(id);
        if (!client) throw new Error('Cliente não encontrado');

        // Mapeamento explícito de campos do frontend para a tabela dim_clientes
        const payload = {};

        if (data.name !== undefined || data.NomeCliente !== undefined)
            payload.NomeCliente = (data.name || data.NomeCliente)?.trim();

        if (data.logoUrl !== undefined || data.NewLogo !== undefined)
            payload.NewLogo = data.logoUrl || data.NewLogo;

        if (data.active !== undefined || data.ativo !== undefined)
            payload.ativo = data.active ?? data.ativo;

        if (data.pais !== undefined || data.Pais !== undefined)
            payload.Pais = data.pais || data.Pais;

        if (data.tipo_cliente !== undefined) payload.tipo_cliente = data.tipo_cliente;
        if (data.partner_id !== undefined) payload.partner_id = data.partner_id;
        if (data.responsavel_interno_id !== undefined) payload.responsavel_interno_id = data.responsavel_interno_id;
        if (data.responsavel_externo !== undefined) payload.responsavel_externo = data.responsavel_externo;
        if (data.email_contato !== undefined) payload.email_contato = data.email_contato;
        if (data.contato_principal !== undefined) payload.contato_principal = data.contato_principal;
        if (data.telefone !== undefined) payload.telefone = data.telefone;
        if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
        if (data.doc_nic_ativo !== undefined) payload.doc_nic_ativo = data.doc_nic_ativo;

        // Se o cliente ficar desativado, ele deve sair do parceiro (unlinking automático)
        if (payload.ativo === false) {
            payload.partner_id = null;
        }

        // Garantir que campos vazios sejam nulos para o banco
        Object.keys(payload).forEach(key => {
            if (payload[key] === '' || payload[key] === undefined) {
                payload[key] = null;
            }
        });

        const isCurrentlyActive = payload.ativo ?? client.ativo;
        if (isCurrentlyActive && (payload.tipo_cliente === 'cliente_final' || client.tipo_cliente === 'cliente_final')) {
            const effectivePartnerId = payload.partner_id !== undefined ? payload.partner_id : client.partner_id;
            if (client.tipo_cliente === 'cliente_final' && !effectivePartnerId) {
                throw new Error('Todo cliente ATIVO deve estar obrigatoriamente vinculado a um parceiro responsável.');
            }
        }

        const updated = await clientRepository.update(client.ID_Cliente || id, payload);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            userName: context.userName,
            action: 'UPDATE',
            entity: 'dim_clientes',
            entityId: id,
            entityName: updated.NomeCliente,
            oldData: client,
            newData: updated,
            ip: context.ip
        });

        return updated;
    },

    async deleteClient(id) {
        const client = await clientRepository.findById(id);
        if (!client) {
            // Se não encontrar, pode ser que já esteja deletado (soft-delete filtra por padrão)
            // Retornamos true para ser idempotente e não quebrar o frontend stale
            return true;
        }

        // Antes de deletar (soft-delete), garantimos que ele 'saiu do parceiro' e ficou inativo
        // Isso atende à regra de que clientes que não existem/estão inativos não devem estar vinculados.
        await clientRepository.update(id, { partner_id: null, ativo: false });

        await clientRepository.delete(id);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            userName: context.userName,
            action: 'DELETE',
            entity: 'dim_clientes',
            entityId: id,
            entityName: client.NomeCliente,
            oldData: client,
            ip: context.ip
        });

        return true;
    }
};
