import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * ==========================================
 * SWAGGER/OPENAPI CONFIGURATION
 * ==========================================
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Omni AI API Documentation',
      version: '1.0.0',
      description: 'Complete API documentation for Omni AI Backend',
      contact: {
        name: 'Omni AI Support',
        email: 'support@omniai.io',
        url: 'https://omniai.io'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development Server'
      },
      {
        url: 'https://api.omniai.io/api',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'name', 'role'],
          properties: {
            _id: {
              type: 'string',
              format: 'ObjectId',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            role: {
              type: 'string',
              enum: ['student', 'employee', 'cabinet_admin', 'company_admin'],
              example: 'employee'
            },
            avatar: {
              type: 'string',
              format: 'url'
            },
            isPublic: {
              type: 'boolean',
              default: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Task: {
          type: 'object',
          required: ['title'],
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            title: { type: 'string', example: 'Complete project' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'done'],
              default: 'todo'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium'
            },
            dueDate: { type: 'string', format: 'date-time' },
            assignedTo: { type: 'string', format: 'ObjectId' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        MLPrediction: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            userId: { type: 'string', format: 'ObjectId' },
            modelType: {
              type: 'string',
              enum: ['prediction', 'recommendation', 'anomaly']
            },
            riskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            riskScore: { type: 'number', example: 0.75 },
            confidence: { type: 'number', example: 0.92 },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Validation failed' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./server/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger UI
 */
export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true
    },
    customCss: '.topbar { display: none }',
    customSiteTitle: 'Omni AI API Documentation'
  }));
  
  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

/**
 * ==========================================
 * API ENDPOINT DOCUMENTATION (JSDoc Format)
 * ==========================================
 * Add these to actual route files
 */

export const swaggerEndpoints = {
  // Auth routes
  register: `
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, employee, cabinet_admin, company_admin]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   \$ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               \$ref: '#/components/schemas/Error'
 */
  `,
  
  login: `
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   \$ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
  `,

  getTasks: `
/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get user tasks with search and filtering
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         description: Search query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [todo, in-progress, done]
 *       - name: priority
 *         in: query
 *         description: Filter by priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [date, priority, status]
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     \$ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
  `,

  mlPredict: `
/**
 * @swagger
 * /ml/predict:
 *   post:
 *     summary: Get ML risk prediction
 *     tags: [ML]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               features:
 *                 type: object
 *     responses:
 *       200:
 *         description: ML prediction result
 *         content:
 *           application/json:
 *             schema:
 *               \$ref: '#/components/schemas/MLPrediction'
 */
  `,

  uploadFile: `
/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload file to S3
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: url
 *                 key:
 *                   type: string
 *                 size:
 *                   type: integer
 */
  `
};
