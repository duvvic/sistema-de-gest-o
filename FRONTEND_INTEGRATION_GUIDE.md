# 🔗 GUIA DE INTEGRAÇÃO FRONTEND ↔ BACKEND

## 📋 O QUE FOI CRIADO

### Arquivos Novos no Frontend

```
frontend/src/
├── services/
│   └── developerApi.ts          ✅ Cliente HTTP com axios
├── hooks/
│   └── useDeveloperData.ts      ✅ Hooks customizados
└── components/
    └── DeveloperProjects_NEW.tsx ✅ Componente refatorado
```

## 🚀 PASSO A PASSO PARA INTEGRAR

### 1. Adicionar Variável de Ambiente

Edite `frontend/.env.local` e adicione:

```env
VITE_API_URL=http://localhost:3001/api
```

### 2. Instalar Axios (se ainda não tiver)

```bash
cd frontend
npm install axios
```

### 3. Testar a Nova Versão

#### Opção A: Substituir o Componente Atual

```bash
# Renomear o antigo
mv src/components/DeveloperProjects.tsx src/components/DeveloperProjects_OLD.tsx

# Renomear o novo
mv src/components/DeveloperProjects_NEW.tsx src/components/DeveloperProjects.tsx
```

#### Opção B: Testar Lado a Lado

Adicione uma rota temporária em `AppRoutes.tsx`:

```typescript
// Rota temporária para testar
<Route
  path="developer/projects-new"
  element={
    <ProtectedRoute>
      <DeveloperProjects_NEW />
    </ProtectedRoute>
  }
/>
```

Acesse: `http://localhost:5173/developer/projects-new`

### 4. Verificar Funcionamento

**Checklist:**
- [ ] Backend rodando em `http://localhost:3001`
- [ ] Frontend rodando em `http://localhost:5173`
- [ ] Variável `VITE_API_URL` configurada
- [ ] Axios instalado
- [ ] Usuário logado (para pegar o ID)

### 5. Debugar Problemas

#### Erro: "Network Error"
```bash
# Verificar se backend está rodando
curl http://localhost:3001/health

# Verificar CORS
# O backend já está configurado para aceitar localhost:5173
```

#### Erro: "401 Unauthorized"
```typescript
// Verificar se o userId está sendo salvo
console.log(localStorage.getItem('currentUserId'));

// Se null, o AuthContext não está populando
// Verifique se currentUser.id existe
```

#### Array vazio mas esperava dados
```bash
# Testar diretamente no backend
curl -H "X-User-Id: SEU_ID" \
     http://localhost:3001/api/developer/clients

# Se retornar vazio, o colaborador não tem projetos vinculados
```

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### ❌ ANTES (Filtros no Frontend)

```typescript
// DeveloperProjects.tsx (antigo)
const myProjects = useMemo(() => {
  if (!currentUser) return [];
  if (currentUser.role === 'admin') return projects;
  
  // Filtra TODOS os projetos localmente
  return projects.filter(p => 
    myProjectIdsFromTasks.has(p.id) || 
    myMemberProjectIds.has(p.id)
  );
}, [projects, myProjectIdsFromTasks, myMemberProjectIds, currentUser]);

// Problemas:
// 1. Carrega TODOS os projetos do banco
// 2. Filtra no cliente (lento)
// 3. Expõe dados que o usuário não deveria ver
```

### ✅ DEPOIS (Backend Retorna Filtrado)

```typescript
// DeveloperProjects_NEW.tsx (novo)
const { clients, loading } = useMyClients();

// Backend executa:
// SELECT ... FROM dim_clientes
// INNER JOIN dim_projetos ...
// INNER JOIN project_members ...
// WHERE pm.id_colaborador = $1

// Vantagens:
// 1. Carrega APENAS dados relevantes
// 2. Filtro otimizado no banco (rápido)
// 3. Segurança: usuário só vê o que pode
```

## 🔄 FLUXO DE DADOS COMPLETO

```
1. Usuário clica em "Projetos"
   ↓
2. DeveloperProjects_NEW renderiza
   ↓
3. useMyClients() executa
   ↓
4. developerApi.fetchMyClients() chama axios
   ↓
5. Interceptor adiciona headers:
   - X-User-Id: 28 (do localStorage)
   - X-User-Role: developer
   ↓
6. Request: GET http://localhost:3001/api/developer/clients
   ↓
7. Backend (server.js) valida auth
   ↓
8. developerController.getMyClients() executa
   ↓
9. developerService.getMyClients() transforma dados
   ↓
10. developerRepository.getClientsByDeveloper() executa SQL:
    SELECT cli."NomeCliente", ...
    FROM dim_clientes cli
    INNER JOIN dim_projetos pro ...
    INNER JOIN project_members pm ...
    WHERE pm.id_colaborador = 28
    ↓
11. PostgreSQL retorna resultados
    ↓
12. Response: [{ id: "1", name: "Cliente A", ... }]
    ↓
13. Hook atualiza state: setClients(data)
    ↓
14. Componente re-renderiza com dados
```

## 🎯 PRÓXIMOS PASSOS

### Curto Prazo
1. [ ] Testar DeveloperProjects_NEW
2. [ ] Verificar loading states
3. [ ] Testar error handling
4. [ ] Substituir componente antigo

### Médio Prazo
1. [ ] Implementar autenticação JWT real
2. [ ] Adicionar refresh token
3. [ ] Implementar cache (React Query)
4. [ ] Adicionar paginação

### Longo Prazo
1. [ ] Migrar TODOS os componentes para API
2. [ ] Remover lógica de filtro do frontend
3. [ ] Implementar WebSockets para real-time
4. [ ] Adicionar offline support

## 📝 NOTAS IMPORTANTES

### Autenticação Temporária
Por enquanto, o userId é salvo no localStorage pelo hook `useMyClients`:

```typescript
localStorage.setItem('currentUserId', currentUser.id);
localStorage.setItem('currentUserRole', currentUser.role);
```

**⚠️ EM PRODUÇÃO:** Substituir por JWT tokens.

### CORS
O backend já está configurado para aceitar requests de `http://localhost:5173`.

Se mudar a porta do frontend, atualize `backend/.env`:
```env
FRONTEND_URL=http://localhost:NOVA_PORTA
```

### Performance
Com a API, você verá:
- ✅ Carregamento inicial mais rápido
- ✅ Menos memória usada no frontend
- ✅ Queries otimizadas no banco
- ✅ Dados sempre atualizados

## 🔧 TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| "Module not found: axios" | `npm install axios` |
| "VITE_API_URL is undefined" | Adicionar no `.env.local` e reiniciar Vite |
| "Network Error" | Verificar se backend está rodando |
| "401 Unauthorized" | Verificar localStorage userId |
| Array vazio | Normal se colaborador não tem projetos |
| Dados desatualizados | Implementar refetch ou React Query |

---

**Criado em:** 2026-01-07  
**Padrão:** Backend API + React Hooks  
**Status:** Pronto para teste
