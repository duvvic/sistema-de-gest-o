# 🎨 GUIA DE CORREÇÃO DO MODO CLARO - IMPLEMENTAÇÃO

## ✅ CONCLUÍDO

1. ✅ `theme.css` - Tokens CSS atualizados com design original LIGHT

## 📋 PRÓXIMOS PASSOS (FAZER AGORA)

### PALETA DE CORES - REFERÊNCIA RÁPIDA

**LIGHT (Original Restaurado):**
```css
--bg: #F7F7FB              /* fundo off-white */
--surface: #FFFFFF          /* cards brancos */
--surface-2: #F3F4F8        /* inputs */
--surface-hover: #F5F6FF    /* hover */
--sidebar-bg: #4C1D95       /* roxo escuro */
--sidebar-bg-2: #5B21B6     /* roxo médio (gradiente) */
--primary: #4C1D95          /* botões/links */
--primary-hover: #3B1675    /* hover botões */
--primary-soft: #EDE9FE     /* backgrounds suaves */
--text: #0F172A             /* títulos */
--text-2: #334155           /* texto normal */
--muted: #64748B            /* texto secundário */
--border: #E2E8F0           /* bordas */
--ring: rgba(76,29,149,0.35) /* focus */
```

**DARK (Mantido):**
```css
--bg: #151025
--surface: #2C283B
--sidebar-bg: #252236
--primary: #6D28D9
--text: #E8E7F0
--border: #3E385C
```

---

## 🔧 PADRÕES DE SUBSTITUIÇÃO

### 1. Backgrounds

```tsx
// ❌ ANTES (hardcoded)
className="bg-white"
className="bg-slate-50"
className="bg-slate-100"

// ✅ DEPOIS (usando tokens)
className="bg-[var(--surface)]"
className="bg-[var(--bg)]"
className="bg-[var(--surface-2)]"

// Ou inline style:
style={{ backgroundColor: 'var(--surface)' }}
style={{ backgroundColor: 'var(--bg)' }}
```

### 2. Textos

```tsx
// ❌ ANTES
className="text-slate-900"
className="text-slate-800"
className="text-slate-700"
className="text-slate-600"
className="text-slate-500"

// ✅ DEPOIS
className="text-[var(--text)]"      // títulos
className="text-[var(--text)]"      // títulos
className="text-[var(--text-2)]"    // texto normal
className="text-[var(--text-2)]"    // texto normal
className="text-[var(--muted)]"     // secundário
```

### 3. Bordas

```tsx
// ❌ ANTES
className="border-slate-200"
className="border-slate-100"

// ✅ DEPOIS
className="border-[var(--border)]"
```

### 4. Botões Primários

```tsx
// ❌ ANTES
className="bg-purple-600 hover:bg-purple-700"
className="bg-[#4c1d95] hover:bg-[#3b1675]"

// ✅ DEPOIS
className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
```

### 5. Botões Secundários/Ghost

```tsx
// ✅ PADRÃO
className="bg-transparent hover:bg-[var(--primary-soft)] text-[var(--text)] border border-[var(--border)]"
```

### 6. Inputs/Selects/Textareas

```tsx
// ✅ PADRÃO
className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)] 
           focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
```

### 7. Cards

```tsx
// ✅ PADRÃO
className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm
           hover:bg-[var(--surface-hover)]"

// Ou usar a classe utilitária:
className="ui-card"
```

---

## 📁 ARQUIVOS PARA ATUALIZAR (EM ORDEM DE PRIORIDADE)

### 🔴 CRÍTICO (fazer primeiro)

#### 1. `MainLayout.tsx`
**Mudanças principais:**
- Sidebar: aplicar gradiente roxo
  ```tsx
  // Sidebar container
  style={{ 
    background: 'linear-gradient(180deg, var(--sidebar-bg), var(--sidebar-bg-2))'
  }}
  
  // Item de menu ativo
  style={{
    backgroundColor: 'var(--surface)',
    color: 'var(--primary)'
  }}
  
  // Item de menu inativo
  style={{
    color: 'rgba(255, 255, 255, 0.8)'
  }}
  ```

- Main content area:
  ```tsx
  style={{ backgroundColor: 'var(--bg)' }}
  ```

#### 2. `AdminDashboard.tsx`
- Container principal: `bg-[var(--bg)]`
- Cards de clientes: `bg-[var(--surface)] border-[var(--border)]`
- Títulos: `text-[var(--text)]`
- Textos secundários: `text-[var(--text-2)]`

#### 3. `KanbanBoard.tsx`
- Background: `bg-[var(--bg)]`
- Colunas: `bg-[var(--surface-2)]`
- Cards de tarefas: `bg-[var(--surface)] border-[var(--border)]`

### 🟡 IMPORTANTE (fazer depois)

#### 4. `TeamList.tsx`
- Lista: `bg-[var(--surface)]`
- Itens: hover com `hover:bg-[var(--surface-hover)]`

#### 5. `TimesheetCalendar.tsx`
- Calendário: `bg-[var(--surface)]`
- Dias: `border-[var(--border)]`
- Dia selecionado: `bg-[var(--primary-soft)]`

#### 6. `ProjectForm.tsx` e `TaskDetail.tsx`
- Formulários: `bg-[var(--surface)]`
- Inputs: `bg-[var(--surface-2)] border-[var(--border)]`
- Labels: `text-[var(--text)]`

### 🟢 OPCIONAL (se tiver tempo)

7. `UserTasks.tsx`
8. `DeveloperProjects.tsx` (já tem alguns tokens)
9. `TimesheetAdminDashboard.tsx`
10. `TimesheetAdminDetail.tsx`

---

## 🎯 EXEMPLO COMPLETO: MainLayout.tsx

```tsx
// Sidebar com gradiente
<div
  className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col z-20 shadow-xl relative`}
  style={{ 
    background: 'linear-gradient(180deg, var(--sidebar-bg), var(--sidebar-bg-2))'
  }}
>
  {/* Header da sidebar */}
  <div className="p-6 flex items-center justify-between border-b border-white/10">
    {/* Logo e título em branco */}
    <h1 className="text-xl font-bold text-white">NIC-LABS</h1>
  </div>

  {/* Menu items */}
  <nav className="flex-1 p-4 space-y-2">
    {menuItems.map((item) => {
      const active = isActive(item.path);
      return (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
          style={{
            backgroundColor: active ? 'var(--surface)' : 'transparent',
            color: active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.8)',
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Icon className="w-5 h-5" />
          {sidebarOpen && <span className="font-medium">{item.label}</span>}
        </button>
      );
    })}
  </nav>
</div>

{/* Main content */}
<div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
  <Outlet />
</div>
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após aplicar as mudanças, verifique:

### Modo CLARO (Light)
- [ ] Fundo geral: off-white (#F7F7FB)
- [ ] Sidebar: gradiente roxo (#4C1D95 → #5B21B6)
- [ ] Cards: brancos (#FFFFFF) com borda cinza clara
- [ ] Textos: escuros e legíveis
- [ ] Botões: roxo corporativo (#4C1D95)
- [ ] Inputs: fundo levemente cinza (#F3F4F8)
- [ ] Sem áreas "brancas estouradas"

### Modo ESCURO (Dark)
- [ ] Fundo geral: #151025
- [ ] Sidebar: #252236
- [ ] Cards: #2C283B
- [ ] Textos: claros (#E8E7F0)
- [ ] Botões: roxo mais claro (#6D28D9)
- [ ] Bordas: #3E385C

### Geral
- [ ] Transição suave ao alternar modos
- [ ] Botão de tema funcional
- [ ] Sem console errors
- [ ] Todas as telas principais corrigidas

---

## 🚀 COMANDOS ÚTEIS

```bash
# Ver diferenças antes de commitar
git diff frontend/src/components/MainLayout.tsx

# Commitar mudanças
git add frontend/src/components/
git commit -m "feat(theme): Apply LIGHT mode tokens to components"
git push origin main
```

---

## 📝 NOTAS IMPORTANTES

1. **Não remova funcionalidades** - Apenas substitua cores
2. **Mantenha a estrutura** - Não mude a lógica dos componentes
3. **Teste ambos os modos** - Clique no botão Sol/Lua para validar
4. **Use inline styles quando necessário** - Tailwind não suporta `bg-[var(--custom)]` em todos os casos

---

**Status:** 🟡 Em Progresso  
**Próximo:** Atualizar MainLayout.tsx com sidebar em gradiente roxo
