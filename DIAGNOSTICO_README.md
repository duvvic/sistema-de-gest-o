# 🔍 Diagnóstico: Inserts na View `fato_tarefas_view` em vez de `fato_tarefas`

## Problema
As novas tarefas estão sendo salvas em `fato_tarefas_view` quando deveriam ser salvas em `fato_tarefas`.

## Causas Possíveis

### 1️⃣ **RLS (Row Level Security) Muito Restritivo**
- A tabela `fato_tarefas` pode ter políticas RLS que bloqueiam INSERTs
- O Supabase redireciona o INSERT para a view como fallback
- **Solução**: Ajustar as políticas RLS para permitir INSERT

### 2️⃣ **View com INSTEAD OF Trigger**
- A view `fato_tarefas_view` pode ter um trigger que redireciona inserts
- **Solução**: Remover o trigger ou ajustar sua lógica

### 3️⃣ **Permissões Incorretas**
- O papel (role) usado pela app pode não ter permissão INSERT na tabela
- Mas pode ter em uma view
- **Solução**: Atualizar permissões

### 4️⃣ **Alias ou Synonym**
- `fato_tarefas` pode estar apontando para a view
- **Solução**: Verificar a definição das tabelas

## 📋 Como Usar o Script de Diagnóstico

### Passo 1: Executar Diagnóstico
1. Abra o **Supabase SQL Editor**
2. Cole o conteúdo de `DIAGNOSTICO_FATO_TAREFAS.sql`
3. Execute a **PARTE 1** (Diagnóstico) para identificar o problema:
   - Verifique se há registros em `fato_tarefas_view` que faltam em `fato_tarefas`
   - Verifique as políticas RLS
   - Verifique se há triggers

### Passo 2: Aplicar Correção
Baseado no diagnóstico, execute a correção apropriada da **PARTE 2**:

#### Se o problema é **RLS bloqueando INSERT**:
```sql
-- Desabilite RLS temporariamente (dev only!)
ALTER TABLE public.fato_tarefas DISABLE ROW LEVEL SECURITY;

-- Ou ajuste a política:
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.fato_tarefas;
CREATE POLICY "Enable insert for authenticated users"
ON public.fato_tarefas
FOR INSERT
TO authenticated
WITH CHECK (true);
```

#### Se há dados na **view que faltam na tabela**:
```sql
-- Copie dados de volta para a tabela
INSERT INTO public.fato_tarefas (...)
SELECT ... FROM public.fato_tarefas_view v
WHERE NOT EXISTS (
  SELECT 1 FROM public.fato_tarefas t 
  WHERE t.id_tarefa_novo = v.id_tarefa_novo
);
```

### Passo 3: Verificar
Execute a **PARTE 3** para confirmar que o problema foi resolvido.

## ✅ Verificação Rápida

Execute esta query para ver o status atual:
```sql
-- Conta registros
SELECT 'fato_tarefas' as origem, COUNT(*) FROM public.fato_tarefas
UNION ALL
SELECT 'fato_tarefas_view' as origem, COUNT(*) FROM public.fato_tarefas_view;

-- Se os números forem muito diferentes, há um problema
```

## 🚀 Prevenção

Para evitar isso no futuro:

1. **Verifique RLS**: Certifique-se de que as políticas permitem INSERT
2. **Teste Inserts**: Teste um INSERT direto na tabela antes de usar no app
3. **Monitor**: Monitore qual tabela/view está recebendo dados

## 📝 Checklist de Ação

- [ ] Executar diagnóstico (PARTE 1)
- [ ] Identificar a causa raiz
- [ ] Aplicar correção apropriada (PARTE 2)
- [ ] Executar verificações finais (PARTE 3)
- [ ] Testar criação de nova tarefa no app
- [ ] Confirmar que dados estão em `fato_tarefas` (não na view)

---

**Nota**: Se tiver dúvidas sobre qual correção aplicar, copie o output do diagnóstico e me mostre!
