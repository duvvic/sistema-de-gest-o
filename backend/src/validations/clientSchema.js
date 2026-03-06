import { z } from 'zod';

export const createClientSchema = z.object({
    NomeCliente: z.string().min(3, "Nome do cliente deve ter ao menos 3 caracteres"),
    "E-mail": z.string().email("E-mail inválido").optional().nullable(),
    email: z.string().email("E-mail privado inválido").optional().nullable(),
    ativo: z.boolean().default(true),
    Responsavel: z.string().optional().nullable(),
    Telefone: z.string().optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial();
