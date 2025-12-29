-- Script para definir papéis dos usuários na tabela dim_colaboradores
-- Sistema simplificado com apenas 2 papéis:
-- "Administrador" - Acesso completo (Rodolfo Reis e Fernanda Nicácio)
-- "Padrão" - Colaborador normal (todos os demais)

-- 1. Define todos os usuários ativos como 'Padrão' (colaborador normal)
UPDATE dim_colaboradores
SET papel = 'Padrão'
WHERE (ativo = true OR ativo IS NULL);

-- 2. Define apenas Rodolfo Reis e Fernanda Nicácio como 'Administrador'
UPDATE dim_colaboradores
SET papel = 'Administrador'
WHERE "NomeColaborador" IN ('Rodolfo Reis', 'Fernanda Nicácio')
AND (ativo = true OR ativo IS NULL);

-- 3. Verificação: Mostra todos os usuários e seus papéis
SELECT 
    "ID_Colaborador",
    "NomeColaborador",
    "E-mail",
    papel,
    "Cargo",
    ativo
FROM dim_colaboradores
WHERE ativo = true OR ativo IS NULL
ORDER BY 
    CASE papel 
        WHEN 'Administrador' THEN 1 
        ELSE 2 
    END,
    "NomeColaborador";

-- NOTA: Os valores válidos para o campo 'papel' são:
-- 'Administrador' - Acesso completo ao sistema
-- 'Padrão' - Colaborador normal (acesso limitado)
