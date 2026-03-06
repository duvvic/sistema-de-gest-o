import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sistema de Gestão SaaS API',
            version: '1.0.0',
            description: 'Documentação da API do Sistema de Gestão Empresarial (V1)',
            contact: {
                name: 'CTO / Nic-Labs Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Desenvolvimento Local',
            },
            {
                url: 'https://api.niclabs.com.br/api/v1',
                description: 'Produção',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'], // Caminhos para os arquivos onde as anotações JSDoc serão escritas
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app) => {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
    app.get('/api/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};
