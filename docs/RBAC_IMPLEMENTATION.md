# Sistema de Controle de Acessos (RBAC) - Guia de Implementação

## ✅ Implementação Concluída

### 📦 Componentes Criados

#### **Backend**
- ✅ `backend/constants/roles.js` - Definição de roles
- ✅ `backend/middleware/authorize.js` - Middlewares de autorização
- ✅ `backend/services/auditService.js` - Serviço de auditoria
- ✅ `backend/utils/sanitizeData.js` - Sanitização de dados sensíveis

#### **Frontend**
- ✅ `frontend/src/constants/roles.ts` - Constantes de roles (TypeScript)
- ✅ `frontend/src/guards/RoleGuard.tsx` - Route guard
- ✅ `frontend/src/components/RoleComponents.tsx` - Componentes de conditional rendering
- ✅ `frontend/src/pages/Unauthorized.tsx` - Página de acesso negado

#### **Banco de Dados**
- ✅ Campo `role` adicionado em `dim_colaboradores`
- ✅ Campo `tower` adicionado em `dim_colaboradores`
- ✅ Campos `responsible_user_id` e `project_manager_id` em `dim_projetos`
- ✅ Tabela `project_members` para vínculos
- ✅ Tabela `audit_log` para auditoria

---

## 🚀 Como Usar

### 1. **Proteger Rotas no Backend**

```javascript
const { requireRole, validateProjectAccess } = require('./middleware/authorize');
const { USER_ROLES } = require('./constants/roles');

// Rota apenas para Admin e Executive
router.get('/executive/portfolio', 
  authenticateUser, 
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE]), 
  getPortfolio
);

// Rota com validação de vínculo ao projeto
router.get('/projects/:projectId', 
  authenticateUser,
  validateProjectAccess, // Valida se usuário tem acesso ao projeto
  getProjectDetails
);

// Rota apenas para PMO
router.post('/projects', 
  authenticateUser,
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.PMO]),
  createProject
);
```

### 2. **Sanitizar Dados no Backend**

```javascript
const { sanitizeProject, sanitizeUser } = require('./utils/sanitizeData');

// Em um controller
async function getProject(req, res) {
  const project = await getProjectById(req.params.id);
  
  // Sanitizar baseado no role do usuário
  const isResponsible = (
    project.responsible_user_id === req.user.id ||
    project.project_manager_id === req.user.id
  );
  
  const sanitized = sanitizeProject(project, req.user, isResponsible);
  
  res.json(sanitized);
}
```

### 3. **Proteger Rotas no Frontend**

```typescript
// Em App.tsx ou Routes.tsx
import { RoleGuard } from '@/guards/RoleGuard';
import { USER_ROLES } from '@/constants/roles';

<Route 
  path="/executive/*" 
  element={
    <RoleGuard allowedRoles={[USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE]}>
      <ExecutiveLayout />
    </RoleGuard>
  } 
/>

<Route 
  path="/pmo/*" 
  element={
    <RoleGuard allowedRoles={[USER_ROLES.SYSTEM_ADMIN, USER_ROLES.PMO]}>
      <PMOLayout />
    </RoleGuard>
  } 
/>

<Route path="/unauthorized" element={<Unauthorized />} />
```

### 4. **Conditional Rendering nos Componentes**

```typescript
import { ShowForRoles, ShowFinancialData, usePermissions } from '@/components/RoleComponents';
import { USER_ROLES } from '@/constants/roles';

function ProjectDetails() {
  const { canSeeFinancial, canEditProjects } = usePermissions();

  return (
    <div>
      <h1>{project.name}</h1>

      {/* Mostrar apenas para Admin e PMO */}
      <ShowForRoles roles={[USER_ROLES.SYSTEM_ADMIN, USER_ROLES.PMO]}>
        <button onClick={editProject}>Editar Projeto</button>
      </ShowForRoles>

      {/* Mostrar dados financeiros apenas para roles autorizados */}
      <ShowFinancialData>
        <div>
          <p>Valor: R$ {project.valor_total_rs}</p>
          <p>Margem: {project.margem}%</p>
        </div>
      </ShowFinancialData>

      {/* Usar hook de permissões */}
      {canEditProjects && (
        <button>Criar Novo Projeto</button>
      )}
    </div>
  );
}
```

### 5. **Registrar Logs de Auditoria**

```javascript
const { logCriticalChange } = require('./services/auditService');

async function updateProject(req, res) {
  const oldProject = await getProjectById(req.params.id);
  const newProject = await updateProjectData(req.params.id, req.body);

  // Registrar alteração
  await logCriticalChange('UPDATE', 'PROJECT', req.user, {
    id: req.params.id,
    before: oldProject,
    after: newProject
  });

  res.json(newProject);
}
```

---

## 📋 Próximos Passos

### 1. **Atualizar Usuários Existentes**

Execute no banco de dados:

```sql
-- Definir roles dos usuários existentes
UPDATE dim_colaboradores 
SET role = 'system_admin' 
WHERE email = 'admin@niclabs.com';

UPDATE dim_colaboradores 
SET role = 'pmo' 
WHERE cargo ILIKE '%gerente%';

UPDATE dim_colaboradores 
SET role = 'tech_lead',
    tower = 'ABAP'  -- ou 'Fiori', 'GP', etc.
WHERE cargo ILIKE '%líder%';

-- Definir responsáveis dos projetos
UPDATE dim_projetos 
SET responsible_user_id = (
  SELECT "ID_Colaborador" 
  FROM dim_colaboradores 
  WHERE "NomeColaborador" = manager
  LIMIT 1
)
WHERE manager IS NOT NULL;
```

### 2. **Atualizar AuthContext**

Certifique-se de que o `AuthContext` retorna o campo `role`:

```typescript
// frontend/src/contexts/AuthContext.tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: string; // ← Adicionar este campo
  tower?: string;
  // ... outros campos
}
```

### 3. **Adicionar Rotas Protegidas**

Atualize seu arquivo de rotas para usar os guards:

```typescript
import { RoleGuard } from '@/guards/RoleGuard';
import { USER_ROLES } from '@/constants/roles';

// Exemplo de estrutura de rotas
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/unauthorized" element={<Unauthorized />} />
  
  {/* Rotas Admin */}
  <Route path="/admin/*" element={
    <RoleGuard allowedRoles={[USER_ROLES.SYSTEM_ADMIN]}>
      <AdminLayout />
    </RoleGuard>
  } />
  
  {/* Rotas Executive */}
  <Route path="/executive/*" element={
    <RoleGuard allowedRoles={[USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE]}>
      <ExecutiveLayout />
    </RoleGuard>
  } />
  
  {/* Rotas PMO */}
  <Route path="/pmo/*" element={
    <RoleGuard allowedRoles={[USER_ROLES.SYSTEM_ADMIN, USER_ROLES.PMO]}>
      <PMOLayout />
    </RoleGuard>
  } />
  
  {/* Rotas Resource */}
  <Route path="/resource/*" element={
    <RoleGuard allowedRoles={[USER_ROLES.RESOURCE]}>
      <ResourceLayout />
    </RoleGuard>
  } />
</Routes>
```

### 4. **Testar o Sistema**

1. Criar usuários com diferentes roles
2. Tentar acessar rotas protegidas
3. Verificar se dados sensíveis são ocultados
4. Verificar logs de auditoria

---

## 🔒 Segurança

### Checklist de Segurança

- [x] Roles definidos no banco de dados
- [x] Middleware de autorização no backend
- [x] Validação de vínculo ao projeto
- [x] Sanitização de dados sensíveis
- [x] Route guards no frontend
- [x] Conditional rendering por role
- [x] Logs de auditoria
- [x] Página de acesso negado
- [ ] Atualizar roles dos usuários existentes
- [ ] Configurar responsáveis dos projetos
- [ ] Testar todos os cenários de acesso

---

## 📚 Documentação Completa

Consulte `docs/CONTROLE_DE_ACESSOS.md` para documentação detalhada com:
- Matriz completa de permissões
- Regras de negócio por perfil
- Exemplos de código
- Considerações técnicas
- Testes de segurança

---

**Implementado em**: 26/01/2026  
**Versão**: 1.0  
**Status**: ✅ Pronto para uso
