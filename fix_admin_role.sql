-- Script para garantir que o usuário victor.picoli seja administrador
-- Execute este script no SQL Editor do Supabase

-- Atualizar o papel do usuário para Administrador
UPDATE dim_colaboradores
SET papel = 'Administrador'
WHERE email = 'victor.picoli@nic-labs.com.br';

-- Verificar se a atualização foi bem-sucedida
SELECT 
    ID_Colaborador,
    NomeColaborador,
    email,
    papel,
    ativo
FROM dim_colaboradores
WHERE email = 'victor.picoli@nic-labs.com.br';
