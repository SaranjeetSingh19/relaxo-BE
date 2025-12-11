const YAML = require('yamljs');
const path = require('path');
require('dotenv').config();

// const isProd = process.env.NODE_ENV === 'prod';
const isProd = true;

const domainUrl = process.env.DOMAIN_URL;
const authSwagger = YAML.load(path.join(__dirname, '../swagger/auth.swagger.yml'));
const billSwagger = YAML.load(path.join(__dirname, '../swagger/bill.swagger.yml'));
const feedbackSwagger = YAML.load(path.join(__dirname, '../swagger/feedback.swagger.yml'));

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Relaxo Billing API',
        version: '1.0.0',
        description: 'Combined Swagger docs for Billing and Feedback'
    },
    servers: [{ url: isProd ? domainUrl : 'http://localhost:5000' }],
    paths: {
        ...authSwagger.paths,
        ...billSwagger.paths,
        ...feedbackSwagger.paths,
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            ...authSwagger.components?.schemas,
            ...billSwagger.components?.schemas,
            ...feedbackSwagger.components?.schemas,
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
};

module.exports = swaggerDocument;
