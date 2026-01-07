# GUIA RÁPIDO - Backend API

## 🚀 Como Rodar

### 1. Instalar Dependências
```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar o template
cp .env.example .env

# Editar .env com suas credenciais do PostgreSQL
# DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Rodar o Servidor

**Desenvolvimento (com auto-reload):**
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

O servidor estará rodando em `http://localhost:3001`

## 📡 Testar os Endpoints

### Usando cURL

```bash
# Health check (não requer auth)
curl http://localhost:3001/health

# Buscar clientes do colaborador ID 28
curl -H "X-User-Id: 28" \
     -H "X-User-Role: developer" \
     http://localhost:3001/api/developer/clients

# Buscar projetos do cliente 5 para colaborador 28
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/clients/5/projects

# Buscar tarefas do projeto 10 para colaborador 28
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/projects/10/tasks

# Buscar estatísticas do colaborador 28
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/stats
```

### Usando Postman/Insomnia

1. Criar nova requisição GET
2. URL: `http://localhost:3001/api/developer/clients`
3. Adicionar headers:
   - `X-User-Id`: `28` (ou outro ID de colaborador)
   - `X-User-Role`: `developer`
4. Enviar

## 🔐 Autenticação Temporária

Por enquanto, a autenticação é feita via **headers HTTP**:

- `X-User-Id`: ID do colaborador (obrigatório)
- `X-User-Role`: `developer` ou `admin` (opcional, padrão: developer)

**⚠️ IMPORTANTE:** Isso é apenas para desenvolvimento. Em produção, use JWT ou sessions.

## 📊 Estrutura de Resposta

### Sucesso (200)
```json
[
  {
    "id": "1",
    "name": "Cliente A",
    "logoUrl": "https://...",
    "projectCount": 3
  }
]
```

### Erro (401 - Não autenticado)
```json
{
  "error": "Não autenticado",
  "message": "Envie o header X-User-Id com o ID do colaborador"
}
```

### Erro (500 - Servidor)
```json
{
  "error": "Erro ao buscar clientes"
}
```

## 🔧 Troubleshooting

### Erro: "Cannot find module 'express'"
```bash
cd backend
npm install
```

### Erro: "Connection refused" (PostgreSQL)
- Verifique se o PostgreSQL está rodando
- Confira as credenciais no `.env`
- Teste a conexão: `psql -U user -d database -h host`

### Erro: "CORS blocked"
- Verifique se `FRONTEND_URL` no `.env` está correto
- Certifique-se que o frontend está rodando na porta correta

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Pool PostgreSQL
│   ├── repositories/
│   │   └── developerRepository.js  # SQL queries
│   ├── services/
│   │   └── developerService.js     # Business logic
│   ├── controllers/
│   │   └── developerController.js  # HTTP handlers
│   ├── routes/
│   │   └── developerRoutes.js      # Route definitions
│   └── server.js              # Main server file
├── .env                       # Environment variables (não commitado)
├── .env.example               # Template de variáveis
└── package.json
```

## 🎯 Próximos Passos

1. [ ] Implementar autenticação JWT
2. [ ] Adicionar endpoints para Admin
3. [ ] Implementar paginação
4. [ ] Adicionar validação de dados (Joi/Zod)
5. [ ] Adicionar testes (Jest)
6. [ ] Configurar CI/CD

---

**Documentação completa:** Ver `BACKEND_API_DOCS.md`