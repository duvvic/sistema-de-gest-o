# 🚀 Guia de Instalação - Sistema NIC Labs Manager

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/) (recomendado)

## Passo 1: Clonar o Repositório

Abra o terminal (PowerShell ou CMD) e execute:

```bash
git clone https://github.com/duvvic/sistema-de-gest-o.git
cd sistema-de-gest-o
```

## Passo 2: Instalar Dependências

No terminal, dentro da pasta do projeto, execute:

```bash
npm install
```

Este comando instalará todas as bibliotecas necessárias (React, Supabase, Tailwind CSS, etc.).

## Passo 3: Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` e renomeie para `.env.local`:
   ```bash
   copy .env.example .env.local
   ```

2. Abra o arquivo `.env.local` no VS Code

3. Preencha com as credenciais do Supabase:

   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui
   ```

### 📌 Onde encontrar as credenciais do Supabase:

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Entre no seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → `anon` `public` → `VITE_SUPABASE_ANON_KEY`

## Passo 4: Executar o Projeto

No terminal, execute:

```bash
npm run dev
```

O sistema estará disponível em: **http://localhost:5173**

## 🔐 Credenciais de Acesso

Para fazer login no sistema, use as credenciais cadastradas no banco de dados Supabase (tabela `user_credentials`).

## 📁 Estrutura do Projeto

```
├── components/          # Componentes React (telas e formulários)
├── services/           # Conexão com Supabase e APIs
├── hooks/              # Hooks customizados
├── types.ts            # Definições de tipos TypeScript
├── App.tsx             # Componente principal
└── index.tsx           # Ponto de entrada
```

## 🛠️ Comandos Úteis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera versão de produção
- `npm run preview` - Visualiza a versão de produção localmente

## ⚠️ Troubleshooting

### Erro: "Variáveis do Supabase não configuradas"
- Verifique se o arquivo `.env.local` existe
- Confirme que as variáveis estão corretas
- Reinicie o servidor (`Ctrl+C` e depois `npm run dev`)

### Porta 5173 já está em uso
- O Vite escolherá automaticamente outra porta (ex: 5174)
- Ou finalize o processo usando a porta 5173

### Erro ao conectar com o banco
- Verifique sua conexão com a internet
- Confirme que as credenciais do Supabase estão corretas
- Verifique se o projeto Supabase está ativo

## 📞 Suporte

Em caso de dúvidas ou problemas, consulte a documentação:
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Supabase](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
