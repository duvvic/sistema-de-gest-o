// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const developerRoutes = require('./routes/developerRoutes');

const app = express();

// =====================================================
// MIDDLEWARES
// =====================================================

// CORS - Permitir requisições do frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Logging middleware (desenvolvimento)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================================================
// MIDDLEWARE DE AUTENTICAÇÃO (TEMPORÁRIO)
// =====================================================
// TODO: Substituir por autenticação real (JWT, session, etc.)
app.use('/api', (req, res, next) => {
    // Por enquanto, simula um usuário logado via header
    // Em produção, isso virá de um token JWT ou session
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
        return res.status(401).json({
            error: 'Não autenticado',
            message: 'Envie o header X-User-Id com o ID do colaborador'
        });
    }

    // Popula req.user para os controllers
    req.user = {
        id: parseInt(userId),
        role: userRole || 'developer'
    };

    next();
});

// =====================================================
// ROTAS
// =====================================================

// Health check (não requer autenticação)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rotas de desenvolvedor
app.use('/api/developer', developerRoutes);

// Rota 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl
    });
});

// =====================================================
// ERROR HANDLER GLOBAL
// =====================================================
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ================================================');
    console.log(`   Backend API rodando na porta ${PORT}`);
    console.log('   ================================================');
    console.log('');
    console.log('   📡 Endpoints disponíveis:');
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/developer/clients`);
    console.log(`   GET  http://localhost:${PORT}/api/developer/clients/:id/projects`);
    console.log(`   GET  http://localhost:${PORT}/api/developer/projects/:id/tasks`);
    console.log(`   GET  http://localhost:${PORT}/api/developer/stats`);
    console.log('');
    console.log('   ⚠️  Auth temporária via headers:');
    console.log('      X-User-Id: <ID do colaborador>');
    console.log('      X-User-Role: developer|admin');
    console.log('');
    console.log('================================================');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM recebido. Fechando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT recebido. Fechando servidor...');
    process.exit(0);
});
