# Controle de Acessos – Sistema de Gestão de Projetos | Nic-Labs

## 1. Objetivo

Definir o modelo de controle de acessos do sistema interno de gestão de projetos da Fábrica Nic-Labs, garantindo segurança da informação, segregação de funções e acesso baseado em necessidade operacional.

---

## 2. Princípios de Controle

- ✅ **Acesso por necessidade operacional**
- 🔒 **Dados financeiros restritos**
- 📊 **Portfólio completo apenas para gestão**
- 👤 **Recurso visualiza apenas o que executa**
- 🛡️ **Controle sempre validado no backend**

---

## 3. Perfis de Acesso

### 3.1. **System Admin (Administrador do Sistema)**

**Descrição**: Administrador técnico do sistema, TI

**Acesso Total**:
- ✅ **TODAS** as funcionalidades do sistema
- ✅ Gerenciamento de usuários e permissões
- ✅ Configurações do sistema
- ✅ Acesso ao banco de dados
- ✅ Logs e auditoria
- ✅ Backup e restore
- ✅ Integrações e APIs

**Rotas Permitidas**:
```
/admin/*
/system/*
/config/*
/logs/*
/users/*
```

**Role no Banco**: `system_admin`

---

### 3.2. **Executive (Direção / Gestão Executiva)**

**Descrição**: Diretores, C-Level, Gestão Executiva

**Visão Estratégica Completa**:
- ✅ **Portfólio completo** de todos os projetos
- ✅ **Todos os dados financeiros**: custos, margens, ROI, forecast
- ✅ **Quadro de capacidade completo** de todos os recursos
- ✅ **Dashboards executivos** e KPIs estratégicos
- ✅ **Status Report Semanal** de todos os projetos
- ✅ Exportação de relatórios (Excel, PowerBI)
- ✅ Visualização de riscos e alertas críticos
- ❌ **NÃO** cria/edita projetos diretamente (apenas visualiza)
- ❌ **NÃO** gerencia usuários

**Rotas Permitidas**:
```
/executive/dashboard
/executive/portfolio
/executive/financial-reports
/executive/capacity
/executive/kpis
/executive/export
```

**Role no Banco**: `executive`

**Dados Visíveis**:
- Valor orçado vs real de todos os projetos
- Margem e lucratividade
- Custo/hora de recursos
- Forecast de conclusão
- Análise de capacidade global

---

### 3.3. **PMO (Gerente de Projetos / PMO)**

**Descrição**: Gerentes de Projeto, PMO, Coordenadores

**Gestão Operacional de Projetos**:
- ✅ Visualizar **projetos sob sua responsabilidade**
- ✅ Criar, editar e excluir projetos que gerencia
- ✅ Criar, editar e excluir tarefas dos seus projetos
- ✅ Alocar recursos nos seus projetos
- ✅ Visualizar **status, cronograma, riscos** dos seus projetos
- ✅ Visualizar **horas do time** alocado nos seus projetos
- ✅ Editar **Status Report Semanal** dos seus projetos
- ✅ Visualizar timesheets da equipe dos seus projetos
- ✅ Dashboard de gestão de projetos
- ⚠️ Visualiza **dados financeiros APENAS dos seus projetos**
- ❌ **NÃO** visualiza portfólio completo
- ❌ **NÃO** visualiza dados financeiros de outros projetos

**Rotas Permitidas**:
```
/pmo/dashboard
/pmo/my-projects
/pmo/projects/:id (apenas se for responsável)
/pmo/team-capacity
/pmo/reports
```

**Role no Banco**: `pmo`

**Filtro de Dados**:
```sql
WHERE responsible_user_id = current_user_id
   OR project_manager_id = current_user_id
```

---

### 3.4. **Financial (Financeiro / Controladoria)**

**Descrição**: Analistas financeiros, Controladoria, Contabilidade

**Visão Financeira Completa**:
- ✅ Visualizar **todos os custos** de todos os projetos
- ✅ Visualizar **valor/hora** de todos os recursos
- ✅ Visualizar **orçado x real** de todos os projetos
- ✅ Visualizar **margens e lucratividade**
- ✅ Visualizar **forecast financeiro**
- ✅ Exportar relatórios financeiros
- ✅ Dashboard financeiro e de custos
- ✅ Visualizar timesheets de todos (para cálculo de custos)
- ❌ **NÃO** edita projetos ou tarefas
- ❌ **NÃO** aloca recursos
- ❌ **NÃO** visualiza detalhes técnicos ou riscos operacionais

**Rotas Permitidas**:
```
/financial/dashboard
/financial/costs
/financial/budget-vs-actual
/financial/margins
/financial/forecast
/financial/reports
/financial/export
```

**Role no Banco**: `financial`

**Dados Visíveis**:
- `valor_total_rs` (orçado)
- `custo_atual` (calculado)
- `custo_para_terminar` (forecast)
- `margem` e `resultado`
- `custo_hora` de todos os recursos
- Timesheets completos (para cálculo)

---

### 3.5. **Tech Lead (Líder Técnico / Torre)**

**Descrição**: Líderes técnicos, Coordenadores de Torre (ABAP, Fiori, GP, etc.)

**Visão Técnica e Alocação da Torre**:
- ✅ Visualizar **projetos da sua torre**
- ✅ Visualizar **alocação dos recursos da sua torre**
- ✅ Visualizar **capacidade da sua torre**
- ✅ Visualizar **tarefas técnicas da sua torre**
- ✅ Editar progresso de tarefas da torre
- ✅ Visualizar timesheets da sua equipe
- ✅ Dashboard de capacidade da torre
- ✅ Visualizar riscos técnicos
- ⚠️ Visualiza **horas alocadas vs executadas** da torre
- ❌ **NÃO** visualiza dados financeiros (valores, custos, margens)
- ❌ **NÃO** visualiza projetos de outras torres
- ❌ **NÃO** cria ou exclui projetos

**Rotas Permitidas**:
```
/tech-lead/dashboard
/tech-lead/tower-projects
/tech-lead/tower-capacity
/tech-lead/tower-tasks
/tech-lead/team-timesheets
```

**Role no Banco**: `tech_lead`

**Filtro de Dados**:
```sql
WHERE tower = current_user_tower
   OR developer_tower = current_user_tower
```

**Dados Visíveis**:
- Projetos onde há recursos da torre alocados
- Horas estimadas e alocadas (sem valores financeiros)
- Capacidade e carga da equipe da torre
- Status técnico e riscos

---

### 3.6. **Resource (Recurso / Consultor)**

**Descrição**: Desenvolvedores, Consultores, Analistas, Executores

**Visão Individual de Execução**:
- ✅ Visualizar **APENAS seus projetos** (onde está alocado)
- ✅ Visualizar **APENAS suas atividades/tarefas**
- ✅ Editar **progresso das próprias tarefas**
- ✅ **Apontamento de horas** (criar/editar próprios timesheets)
- ✅ Visualizar **próprio status** no quadro de capacidade
- ✅ Dashboard pessoal de tarefas
- ❌ **NÃO** visualiza dados financeiros
- ❌ **NÃO** visualiza tarefas de outros
- ❌ **NÃO** visualiza timesheets de outros
- ❌ **NÃO** visualiza portfólio completo
- ❌ **NÃO** cria ou exclui projetos
- ❌ **NÃO** aloca recursos

**Rotas Permitidas**:
```
/resource/dashboard
/resource/my-tasks
/resource/my-projects
/resource/timesheet
/resource/profile
```

**Role no Banco**: `resource`

**Filtro de Dados**:
```sql
WHERE developer_id = current_user_id
   OR collaborator_ids @> ARRAY[current_user_id]
```

---

## 4. Matriz de Permissões Completa

| Funcionalidade | System Admin | Executive | PMO | Financial | Tech Lead | Resource |
|----------------|--------------|-----------|-----|-----------|-----------|----------|
| **PROJETOS** |
| Ver todos os projetos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver projetos sob responsabilidade | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver projetos da torre | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Ver apenas projetos alocados | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar projeto | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar projeto | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Excluir projeto | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Ver dados financeiros | ✅ | ✅ | ✅* | ✅ | ❌ | ❌ |
| Ver Status Report Semanal | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| Editar Status Report | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| **TAREFAS** |
| Ver todas as tarefas | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver tarefas dos seus projetos | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver tarefas da torre | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver apenas próprias tarefas | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Criar tarefa | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Editar qualquer tarefa | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Editar tarefas da torre | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Editar própria tarefa | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Excluir tarefa | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| **TIMESHEETS** |
| Ver todos os timesheets | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ver timesheets dos seus projetos | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Ver timesheets da torre | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ver próprio timesheet | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Criar próprio timesheet | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Editar próprio timesheet | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Editar timesheet de outros | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| Excluir timesheet | ✅ | ❌ | ✅* | ❌ | ❌ | ❌ |
| **EQUIPE** |
| Ver toda a equipe | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver equipe dos seus projetos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver equipe da torre | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Ver equipe do projeto alocado | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar colaborador | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar colaborador | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver custo/hora | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **CLIENTES** |
| Ver todos os clientes | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver clientes dos seus projetos | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver cliente do projeto alocado | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar cliente | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar cliente | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **DASHBOARDS & RELATÓRIOS** |
| Dashboard Executivo | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Dashboard PMO | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard Financeiro | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Dashboard Torre | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Dashboard Pessoal | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Quadro Capacidade (completo) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Quadro Capacidade (torre) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Quadro Capacidade (próprio) | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Relatório Financeiro | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Exportar Excel/PowerBI | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

**Legenda**: 
- ✅ = Permitido
- ❌ = Negado
- ✅* = Permitido apenas para seus projetos

---

## 5. Regras de Negócio por Perfil

### 5.1. **System Admin**

```javascript
// Acesso total sem restrições
const hasAccess = () => true;
```

---

### 5.2. **Executive**

```javascript
// Vê tudo, mas não edita
const projects = await fetchAllProjects();
const financialData = await fetchAllFinancialData();
const capacity = await fetchAllCapacity();

// Dados financeiros completos
const showFinancialFields = true;
```

---

### 5.3. **PMO**

```javascript
// Vê e edita apenas projetos sob sua responsabilidade
const projects = await fetchProjects({
  filter: {
    OR: [
      { responsibleUserId: currentUser.id },
      { projectManagerId: currentUser.id }
    ]
  }
});

// Dados financeiros apenas dos seus projetos
const showFinancialFields = (project.responsibleUserId === currentUser.id);
```

---

### 5.4. **Financial**

```javascript
// Vê todos os dados financeiros, mas não edita projetos
const projects = await fetchAllProjects();
const timesheets = await fetchAllTimesheets();

// Sempre mostra campos financeiros
const showFinancialFields = true;

// Mas não pode editar
const canEdit = false;
```

---

### 5.5. **Tech Lead**

```javascript
// Vê apenas projetos e recursos da sua torre
const projects = await fetchProjects({
  filter: {
    members: {
      some: { tower: currentUser.tower }
    }
  }
});

const teamCapacity = await fetchCapacity({
  filter: { tower: currentUser.tower }
});

// NÃO vê dados financeiros
const showFinancialFields = false;
```

---

### 5.6. **Resource**

```javascript
// Vê apenas onde está alocado
const projects = await fetchProjects({
  filter: {
    OR: [
      { members: { some: { userId: currentUser.id } } },
      { tasks: { some: { developerId: currentUser.id } } }
    ]
  }
});

const tasks = await fetchTasks({
  filter: {
    OR: [
      { developerId: currentUser.id },
      { collaboratorIds: { contains: currentUser.id } }
    ]
  }
});

// NÃO vê dados financeiros
const showFinancialFields = false;
```

---

## 6. Implementação Backend

### 6.1. **Enum de Roles**

```javascript
// backend/constants/roles.js
const USER_ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  EXECUTIVE: 'executive',
  PMO: 'pmo',
  FINANCIAL: 'financial',
  TECH_LEAD: 'tech_lead',
  RESOURCE: 'resource'
};

module.exports = { USER_ROLES };
```

---

### 6.2. **Middleware de Autorização**

```javascript
// backend/middleware/authorize.js
const { USER_ROLES } = require('../constants/roles');

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Requer perfil: ${allowedRoles.join(' ou ')}`
      });
    }

    next();
  };
};

// Uso nas rotas:
router.get('/executive/portfolio', 
  authenticateUser, 
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE]), 
  getPortfolio
);

router.get('/financial/costs', 
  authenticateUser, 
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE, USER_ROLES.FINANCIAL]), 
  getCosts
);

router.get('/pmo/my-projects', 
  authenticateUser, 
  requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.PMO]), 
  getMyProjects
);
```

---

### 6.3. **Filtro de Dados por Role**

```javascript
// backend/services/projectService.js
const getProjectsForUser = async (user) => {
  const { role, id, tower } = user;

  switch (role) {
    case USER_ROLES.SYSTEM_ADMIN:
    case USER_ROLES.EXECUTIVE:
    case USER_ROLES.FINANCIAL:
      // Veem todos os projetos
      return await getAllProjects();

    case USER_ROLES.PMO:
      // Vê apenas projetos sob sua responsabilidade
      return await getProjectsByResponsible(id);

    case USER_ROLES.TECH_LEAD:
      // Vê apenas projetos da sua torre
      return await getProjectsByTower(tower);

    case USER_ROLES.RESOURCE:
      // Vê apenas projetos onde está alocado
      return await getProjectsByMember(id);

    default:
      return [];
  }
};
```

---

### 6.4. **Sanitização de Dados Financeiros**

```javascript
// backend/utils/sanitizeData.js
const { USER_ROLES } = require('../constants/roles');

const sanitizeProjectForUser = (project, user) => {
  // Roles que podem ver dados financeiros
  const canSeeFinancial = [
    USER_ROLES.SYSTEM_ADMIN,
    USER_ROLES.EXECUTIVE,
    USER_ROLES.FINANCIAL
  ].includes(user.role);

  // PMO vê dados financeiros apenas dos seus projetos
  if (user.role === USER_ROLES.PMO) {
    const isResponsible = (
      project.responsibleUserId === user.id ||
      project.projectManagerId === user.id
    );
    if (!isResponsible) {
      canSeeFinancial = false;
    }
  }

  if (canSeeFinancial) {
    return project; // Retorna tudo
  }

  // Remover campos financeiros
  const sanitized = { ...project };
  delete sanitized.valor_total_rs;
  delete sanitized.custo_atual;
  delete sanitized.margem;
  delete sanitized.resultado;
  delete sanitized.custo_para_terminar;
  
  return sanitized;
};

const sanitizeUserForRole = (userToShow, currentUser) => {
  // Apenas Executive e Financial veem custo/hora
  const canSeeCost = [
    USER_ROLES.SYSTEM_ADMIN,
    USER_ROLES.EXECUTIVE,
    USER_ROLES.FINANCIAL
  ].includes(currentUser.role);

  if (canSeeCost) {
    return userToShow;
  }

  const sanitized = { ...userToShow };
  delete sanitized.hourlyCost;
  delete sanitized.custo_hora;
  
  return sanitized;
};

module.exports = { sanitizeProjectForUser, sanitizeUserForRole };
```

---

## 7. Implementação Frontend

### 7.1. **Route Guards**

```typescript
// frontend/src/guards/RoleGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const USER_ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  EXECUTIVE: 'executive',
  PMO: 'pmo',
  FINANCIAL: 'financial',
  TECH_LEAD: 'tech_lead',
  RESOURCE: 'resource'
};

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  allowedRoles, 
  children 
}) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Uso nas rotas:
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
```

---

### 7.2. **Conditional Rendering por Role**

```typescript
// frontend/src/components/RoleComponents.tsx
import { useAuth } from '@/contexts/AuthContext';

export const ShowForRoles: React.FC<{ 
  roles: string[]; 
  children: React.ReactNode 
}> = ({ roles, children }) => {
  const { currentUser } = useAuth();
  return roles.includes(currentUser?.role) ? <>{children}</> : null;
};

export const ShowFinancialData: React.FC<{ 
  children: React.ReactNode 
}> = ({ children }) => {
  const { currentUser } = useAuth();
  const canSeeFinancial = ['system_admin', 'executive', 'financial'].includes(
    currentUser?.role
  );
  return canSeeFinancial ? <>{children}</> : null;
};

// Uso:
<ShowForRoles roles={['system_admin', 'executive', 'pmo']}>
  <CreateProjectButton />
</ShowForRoles>

<ShowFinancialData>
  <div>Valor: R$ {project.valor_total_rs}</div>
  <div>Margem: {project.margem}%</div>
</ShowFinancialData>
```

---

## 8. Resumo Visual dos Perfis

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIERARQUIA DE ACESSOS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔧 SYSTEM ADMIN                                                │
│     └─ Acesso total ao sistema                                  │
│                                                                  │
│  👔 EXECUTIVE (Direção)                                         │
│     └─ Portfólio completo + Dados financeiros (somente leitura) │
│                                                                  │
│  📊 PMO (Gerente de Projetos)                                   │
│     └─ Projetos sob responsabilidade + Gestão operacional       │
│                                                                  │
│  💰 FINANCIAL (Controladoria)                                   │
│     └─ Todos os dados financeiros (somente leitura)             │
│                                                                  │
│  🏗️ TECH LEAD (Líder de Torre)                                 │
│     └─ Projetos e recursos da torre                             │
│                                                                  │
│  👤 RESOURCE (Consultor/Desenvolvedor)                          │
│     └─ Apenas projetos e tarefas alocados                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Regras de Vínculo (Access Binding)

### 9.1. **Princípio Fundamental**

> **Acesso condicionado à alocação no projeto**

Todo acesso a dados de projeto deve ser validado com base no vínculo do usuário com aquele projeto específico.

---

### 9.2. **Regras por Perfil**

#### **PMO (Gerente de Projetos)**
```javascript
// Acessa APENAS projetos sob sua gestão
const canAccessProject = (project, user) => {
  if (user.role !== 'pmo') return false;
  
  return (
    project.responsibleUserId === user.id ||
    project.projectManagerId === user.id ||
    project.pmoId === user.id
  );
};

// Exemplo de validação no backend
router.get('/projects/:id', authenticateUser, async (req, res) => {
  const project = await getProjectById(req.params.id);
  
  if (req.user.role === 'pmo' && !canAccessProject(project, req.user)) {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Você não é responsável por este projeto'
    });
  }
  
  res.json(sanitizeProjectForUser(project, req.user));
});
```

---

#### **Resource (Recurso / Consultor)**
```javascript
// Acessa APENAS projetos em que atua
const canAccessProject = (project, user) => {
  if (user.role !== 'resource') return false;
  
  // Verifica se está na lista de membros do projeto
  const isMember = project.members?.some(m => m.userId === user.id);
  
  // Verifica se tem tarefas atribuídas no projeto
  const hasTasks = project.tasks?.some(t => 
    t.developerId === user.id || 
    t.collaboratorIds?.includes(user.id)
  );
  
  return isMember || hasTasks;
};

// Validação de tarefa
const canAccessTask = (task, user) => {
  if (user.role !== 'resource') return false;
  
  return (
    task.developerId === user.id ||
    task.collaboratorIds?.includes(user.id)
  );
};
```

---

#### **Tech Lead (Líder de Torre)**
```javascript
// Acessa APENAS projetos da sua torre
const canAccessProject = (project, user) => {
  if (user.role !== 'tech_lead') return false;
  
  // Verifica se há recursos da torre alocados no projeto
  const hasTowerMembers = project.members?.some(m => 
    m.tower === user.tower
  );
  
  return hasTowerMembers;
};

// Validação de recurso
const canViewResource = (resource, user) => {
  if (user.role !== 'tech_lead') return false;
  
  return resource.tower === user.tower;
};
```

---

### 9.3. **Tabela de Vínculo no Banco**

```sql
-- Tabela de membros do projeto (project_members)
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES dim_projetos(ID_Projeto),
  user_id BIGINT NOT NULL REFERENCES dim_colaboradores(ID_Colaborador),
  role VARCHAR(50), -- 'manager', 'developer', 'consultant', etc.
  allocation_percentage NUMERIC(5,2), -- % de alocação
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

---

### 9.4. **Validação de Vínculo no Backend**

```javascript
// backend/middleware/projectAccess.js
const validateProjectAccess = async (req, res, next) => {
  const { projectId } = req.params;
  const user = req.user;
  
  // System Admin e Executive sempre têm acesso
  if (['system_admin', 'executive', 'financial'].includes(user.role)) {
    return next();
  }
  
  const project = await getProjectById(projectId);
  
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado' });
  }
  
  // Validar vínculo baseado no role
  let hasAccess = false;
  
  switch (user.role) {
    case 'pmo':
      hasAccess = (
        project.responsibleUserId === user.id ||
        project.projectManagerId === user.id
      );
      break;
      
    case 'tech_lead':
      const hasTowerMembers = await checkTowerMembersInProject(
        projectId, 
        user.tower
      );
      hasAccess = hasTowerMembers;
      break;
      
    case 'resource':
      const isMember = await checkUserIsMember(projectId, user.id);
      const hasTasks = await checkUserHasTasks(projectId, user.id);
      hasAccess = isMember || hasTasks;
      break;
      
    default:
      hasAccess = false;
  }
  
  if (!hasAccess) {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Você não tem vínculo com este projeto'
    });
  }
  
  req.project = project;
  next();
};

// Uso:
router.get('/projects/:projectId', 
  authenticateUser, 
  validateProjectAccess, 
  getProjectDetails
);
```

---

## 10. Dados Sensíveis (Field-Level Security)

### 10.1. **Classificação de Dados**

#### **🔴 CRÍTICO - Acesso Restrito**

Apenas **System Admin**, **Executive** e **Financial**

| Campo | Tabela | Descrição |
|-------|--------|-----------|
| `custo_hora` | `dim_colaboradores` | Valor/hora de custo do recurso |
| `hourlyCost` | `dim_colaboradores` | Custo horário (alias) |
| `valor_total_rs` | `dim_projetos` | Valor orçado/vendido do projeto |
| `margem` | Calculado | Margem de lucro (%) |
| `resultado` | Calculado | Lucro/prejuízo do projeto |
| `custo_atual` | Calculado | Custo empenhado até o momento |
| `custo_para_terminar` | Calculado | Forecast de custo para conclusão |

---

#### **🟡 SENSÍVEL - Acesso Condicional**

**PMO** vê apenas dos seus projetos

| Campo | Tabela | Descrição |
|-------|--------|-----------|
| `allocated_hours` | `fato_tarefas` | Horas alocadas por recurso |
| `estimated_hours` | `fato_tarefas` | Horas estimadas da tarefa |
| `gaps_issues` | `dim_projetos` | Impedimentos e gaps do projeto |
| `important_considerations` | `dim_projetos` | Considerações estratégicas |
| `weekly_status_report` | `dim_projetos` | Status report semanal |
| `risks` | `fato_tarefas` | Riscos identificados |

---

#### **🟢 PÚBLICO - Acesso Geral**

Todos os perfis com vínculo ao projeto

| Campo | Tabela | Descrição |
|-------|--------|-----------|
| `NomeProjeto` | `dim_projetos` | Nome do projeto |
| `StatusProjeto` | `dim_projetos` | Status atual |
| `startDate` | `dim_projetos` | Data de início |
| `estimatedDelivery` | `dim_projetos` | Data prevista de entrega |
| `Afazer` | `fato_tarefas` | Descrição da tarefa |
| `Porcentagem` | `fato_tarefas` | Progresso da tarefa |
| `StatusTarefa` | `fato_tarefas` | Status da tarefa |

---

### 10.2. **Implementação de Field-Level Security**

```javascript
// backend/utils/fieldSecurity.js

const SENSITIVE_FIELDS = {
  CRITICAL: [
    'custo_hora',
    'hourlyCost',
    'valor_total_rs',
    'margem',
    'resultado',
    'custo_atual',
    'custo_para_terminar'
  ],
  SENSITIVE: [
    'allocated_hours',
    'gaps_issues',
    'important_considerations',
    'weekly_status_report',
    'risks'
  ]
};

const sanitizeProject = (project, user, isResponsible = false) => {
  const sanitized = { ...project };
  
  // Remover campos CRÍTICOS
  const canSeeCritical = [
    'system_admin',
    'executive',
    'financial'
  ].includes(user.role);
  
  if (!canSeeCritical) {
    SENSITIVE_FIELDS.CRITICAL.forEach(field => {
      delete sanitized[field];
    });
  }
  
  // Remover campos SENSÍVEIS (PMO vê apenas dos seus projetos)
  const canSeeSensitive = (
    canSeeCritical ||
    (user.role === 'pmo' && isResponsible)
  );
  
  if (!canSeeSensitive) {
    SENSITIVE_FIELDS.SENSITIVE.forEach(field => {
      delete sanitized[field];
    });
  }
  
  return sanitized;
};

const sanitizeUser = (userToShow, currentUser) => {
  const sanitized = { ...userToShow };
  
  // Remover custo/hora
  const canSeeCost = [
    'system_admin',
    'executive',
    'financial'
  ].includes(currentUser.role);
  
  if (!canSeeCost) {
    delete sanitized.custo_hora;
    delete sanitized.hourlyCost;
    delete sanitized.monthlyAvailableHours; // Capacidade global
  }
  
  return sanitized;
};

module.exports = { sanitizeProject, sanitizeUser, SENSITIVE_FIELDS };
```

---

### 10.3. **Capacidade Global**

**Restrição**: Apenas **System Admin**, **Executive** e **Financial**

```javascript
// Capacidade global = soma de todos os recursos
const getGlobalCapacity = async (user) => {
  if (!['system_admin', 'executive', 'financial'].includes(user.role)) {
    throw new Error('Acesso negado: capacidade global é restrita');
  }
  
  const allResources = await getAllResources();
  
  return {
    totalCapacity: allResources.reduce((sum, r) => 
      sum + (r.monthlyAvailableHours || 160), 0
    ),
    totalAllocated: allResources.reduce((sum, r) => 
      sum + r.allocatedHours, 0
    ),
    utilizationRate: calculateUtilization(allResources)
  };
};

// Tech Lead vê apenas capacidade da torre
const getTowerCapacity = async (user) => {
  if (user.role !== 'tech_lead') {
    throw new Error('Acesso negado');
  }
  
  const towerResources = await getResourcesByTower(user.tower);
  
  return {
    tower: user.tower,
    totalCapacity: towerResources.reduce((sum, r) => 
      sum + (r.monthlyAvailableHours || 160), 0
    ),
    totalAllocated: towerResources.reduce((sum, r) => 
      sum + r.allocatedHours, 0
    )
  };
};
```

---

### 10.4. **Campos Estratégicos de Status**

```javascript
// Campos que apenas PMO e superiores podem editar
const STRATEGIC_FIELDS = [
  'gaps_issues',
  'important_considerations',
  'weekly_status_report',
  'status_executivo',
  'health_indicator'
];

const canEditStrategicFields = (user, project) => {
  // System Admin sempre pode
  if (user.role === 'system_admin') return true;
  
  // PMO pode editar apenas dos seus projetos
  if (user.role === 'pmo') {
    return (
      project.responsibleUserId === user.id ||
      project.projectManagerId === user.id
    );
  }
  
  // Outros perfis não podem editar
  return false;
};
```

---

## 11. Considerações Técnicas

### 11.1. **Controle por Perfil (RBAC)**

**Role-Based Access Control** implementado em **todas as camadas**:

```
┌─────────────────────────────────────────────┐
│         CAMADAS DE SEGURANÇA                │
├─────────────────────────────────────────────┤
│                                              │
│  1️⃣ FRONTEND                                │
│     └─ Route Guards (React Router)          │
│     └─ Conditional Rendering                │
│     └─ UI/UX adaptado por role              │
│                                              │
│  2️⃣ API GATEWAY                             │
│     └─ Autenticação JWT                     │
│     └─ Validação de token                   │
│     └─ Rate limiting por role               │
│                                              │
│  3️⃣ BACKEND (Node.js)                       │
│     └─ Middleware de autorização            │
│     └─ Validação de vínculo                 │
│     └─ Sanitização de dados                 │
│     └─ Field-level security                 │
│                                              │
│  4️⃣ BANCO DE DADOS (PostgreSQL)             │
│     └─ Row-level security (RLS)             │
│     └─ Políticas por tabela                 │
│     └─ Audit triggers                       │
│                                              │
└─────────────────────────────────────────────┘
```

---

### 11.2. **Validação de Vínculo no Backend**

> **CRÍTICO**: Toda validação de acesso DEVE ser feita no backend

```javascript
// ❌ ERRADO - Validação apenas no frontend
if (currentUser.role === 'pmo') {
  // Mostrar dados financeiros
}

// ✅ CORRETO - Validação no backend
router.get('/projects/:id/financial', 
  authenticateUser,
  validateProjectAccess, // Valida vínculo
  requireRole(['system_admin', 'executive', 'financial', 'pmo']),
  async (req, res) => {
    const project = req.project; // Já validado pelo middleware
    
    // Sanitizar dados baseado no role
    const sanitized = sanitizeProject(project, req.user, true);
    
    res.json(sanitized);
  }
);
```

---

### 11.3. **Logs de Alterações Críticas**

**Auditoria obrigatória** para:

- ✅ Criação/edição/exclusão de projetos
- ✅ Alteração de dados financeiros
- ✅ Mudança de status estratégico
- ✅ Alocação/desalocação de recursos
- ✅ Edição de Status Report Semanal
- ✅ Tentativas de acesso negado

```javascript
// backend/utils/auditLog.js
const logCriticalChange = async (action, resource, user, changes) => {
  await db.audit_log.create({
    timestamp: new Date(),
    userId: user.id,
    userRole: user.role,
    action, // 'CREATE', 'UPDATE', 'DELETE', 'ACCESS_DENIED'
    resource, // 'PROJECT', 'TASK', 'USER', etc.
    resourceId: changes.id,
    changes: JSON.stringify(changes),
    ipAddress: user.ipAddress,
    userAgent: user.userAgent
  });
  
  // Alertar em caso de acesso negado
  if (action === 'ACCESS_DENIED') {
    await sendSecurityAlert({
      user: user.name,
      resource,
      timestamp: new Date()
    });
  }
};

// Uso:
router.put('/projects/:id', 
  authenticateUser,
  validateProjectAccess,
  async (req, res) => {
    const oldProject = await getProjectById(req.params.id);
    const newProject = await updateProject(req.params.id, req.body);
    
    // Log da alteração
    await logCriticalChange('UPDATE', 'PROJECT', req.user, {
      id: req.params.id,
      before: oldProject,
      after: newProject
    });
    
    res.json(newProject);
  }
);
```

---

### 11.4. **Segurança por Campo (Field-Level Security)**

```javascript
// Implementação de proxy para ocultar campos automaticamente
const createSecureProxy = (object, user, isResponsible = false) => {
  return new Proxy(object, {
    get(target, prop) {
      // Verificar se o campo é sensível
      if (SENSITIVE_FIELDS.CRITICAL.includes(prop)) {
        const canSee = [
          'system_admin',
          'executive',
          'financial'
        ].includes(user.role);
        
        if (!canSee) {
          return undefined; // Ocultar campo
        }
      }
      
      if (SENSITIVE_FIELDS.SENSITIVE.includes(prop)) {
        const canSee = (
          ['system_admin', 'executive', 'financial'].includes(user.role) ||
          (user.role === 'pmo' && isResponsible)
        );
        
        if (!canSee) {
          return undefined;
        }
      }
      
      return target[prop];
    }
  });
};

// Uso:
const project = await getProjectById(projectId);
const secureProject = createSecureProxy(project, req.user, isResponsible);
res.json(secureProject);
```

---

### 11.5. **Rate Limiting por Role**

```javascript
// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (role) => {
  const limits = {
    system_admin: { windowMs: 60000, max: 1000 }, // 1000 req/min
    executive: { windowMs: 60000, max: 500 },     // 500 req/min
    pmo: { windowMs: 60000, max: 300 },           // 300 req/min
    financial: { windowMs: 60000, max: 300 },
    tech_lead: { windowMs: 60000, max: 200 },     // 200 req/min
    resource: { windowMs: 60000, max: 100 }       // 100 req/min
  };
  
  const config = limits[role] || limits.resource;
  
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: 'Limite de requisições excedido. Tente novamente em breve.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Uso:
router.use((req, res, next) => {
  const limiter = createRateLimiter(req.user?.role || 'resource');
  limiter(req, res, next);
});
```

---

### 11.6. **Testes de Segurança**

```javascript
// tests/security/accessControl.test.js
describe('Access Control', () => {
  describe('PMO Access', () => {
    it('should allow PMO to access their own projects', async () => {
      const pmo = createTestUser({ role: 'pmo', id: 1 });
      const project = createTestProject({ responsibleUserId: 1 });
      
      const hasAccess = canAccessProject(project, pmo);
      expect(hasAccess).toBe(true);
    });
    
    it('should deny PMO access to other projects', async () => {
      const pmo = createTestUser({ role: 'pmo', id: 1 });
      const project = createTestProject({ responsibleUserId: 2 });
      
      const hasAccess = canAccessProject(project, pmo);
      expect(hasAccess).toBe(false);
    });
    
    it('should hide financial data from PMO for other projects', async () => {
      const pmo = createTestUser({ role: 'pmo', id: 1 });
      const project = createTestProject({ 
        responsibleUserId: 2,
        valor_total_rs: 100000
      });
      
      const sanitized = sanitizeProject(project, pmo, false);
      expect(sanitized.valor_total_rs).toBeUndefined();
    });
  });
  
  describe('Resource Access', () => {
    it('should only show tasks assigned to resource', async () => {
      const resource = createTestUser({ role: 'resource', id: 1 });
      const tasks = [
        { id: 1, developerId: 1 },
        { id: 2, developerId: 2 },
        { id: 3, collaboratorIds: [1, 3] }
      ];
      
      const filtered = filterTasksForUser(tasks, resource);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.id)).toEqual([1, 3]);
    });
  });
});
```

---

## 12. Checklist de Implementação

- [ ] Criar enum de roles no backend
- [ ] Atualizar tabela `dim_colaboradores` com novo campo `role`
- [ ] Implementar middleware de autorização por role
- [ ] Implementar filtros de dados por role
- [ ] Implementar sanitização de dados financeiros
- [ ] Criar route guards no frontend
- [ ] Criar componentes de conditional rendering
- [ ] Atualizar rotas com proteção de role
- [ ] Implementar dashboards específicos por role
- [ ] Criar sistema de auditoria de acessos
- [ ] Documentar permissões no código
- [ ] Testar todos os cenários de acesso

---

**Documento atualizado em**: 26/01/2026  
**Versão**: 2.0  
**Responsável**: Sistema de Gestão Nic-Labs
