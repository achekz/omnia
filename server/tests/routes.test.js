/**
 * ==========================================
 * UNIT TESTS - Core Modules
 * ==========================================
 * Jest test suite for backend components
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  validateEmail,
  validatePassword,
  validateCreateTask,
  handleValidationErrors
} from '../utils/validators.js';
import { recordFailedAttempt, resetFailedAttempts } from '../middleware/rateLimiter.js';

describe('Input Validators', () => {
  describe('Email Validation', () => {
    test('should validate correct email format', () => {
      const result = validateEmail('user@example.com');
      expect(result).toBe(true);
    });

    test('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result).toBe(false);
    });

    test('should reject empty email', () => {
      const result = validateEmail('');
      expect(result).toBe(false);
    });
  });

  describe('Password Validation', () => {
    test('should validate strong password', () => {
      const result = validatePassword('SecurePass123!@#');
      expect(result.isValid).toBe(true);
    });

    test('should reject password without uppercase', () => {
      const result = validatePassword('securepass123!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('uppercase');
    });

    test('should reject password without number', () => {
      const result = validatePassword('SecurePass!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('number');
    });

    test('should reject short password', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('length');
    });
  });

  describe('Task Validation', () => {
    test('should validate correct task', () => {
      const task = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        dueDate: new Date()
      };
      const result = validateCreateTask(task);
      expect(result.isValid).toBe(true);
    });

    test('should reject task with empty title', () => {
      const task = {
        title: '',
        description: 'Test description'
      };
      const result = validateCreateTask(task);
      expect(result.isValid).toBe(false);
    });

    test('should reject task with short title', () => {
      const task = {
        title: 'ab', // Less than 3 chars
        description: 'Test description'
      };
      const result = validateCreateTask(task);
      expect(result.isValid).toBe(false);
    });

    test('should reject task with invalid priority', () => {
      const task = {
        title: 'Test Task',
        priority: 'invalid'
      };
      const result = validateCreateTask(task);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Authentication', () => {
  let authToken;
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  test('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
        name: 'Test User'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(testUser.email);
  });

  test('should not register duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
        name: 'Test User'
      });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: testUser.email,
        password: 'AnotherPass123!',
        name: 'Another User'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should login with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    authToken = response.body.data.accessToken;
  });

  test('should reject login with wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123!'
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  test('should verify JWT token', () => {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    expect(decoded.email).toBe(testUser.email);
  });
});

describe('Rate Limiting', () => {
  const userId = 'test-user-123';

  test('should track failed attempts', async () => {
    const attempts = await recordFailedAttempt(userId, 5);
    expect(attempts).toBeGreaterThan(0);
  });

  test('should increment attempts correctly', async () => {
    const userId2 = 'test-user-456';
    const attempt1 = await recordFailedAttempt(userId2, 5);
    const attempt2 = await recordFailedAttempt(userId2, 5);
    
    expect(attempt2).toBeGreaterThan(attempt1);
  });

  test('should reset failed attempts', async () => {
    const userId3 = 'test-user-789';
    await recordFailedAttempt(userId3, 5);
    await resetFailedAttempts(userId3);
    
    const attempts = await recordFailedAttempt(userId3, 5);
    expect(attempts).toBe(1);
  });
});

describe('Tasks API', () => {
  let authToken;
  let taskId;

  beforeAll(async () => {
    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    authToken = response.body.data.accessToken;
  });

  test('should create new task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Task',
        description: 'Task description',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Task');
    taskId = response.body.data._id;
  });

  test('should get all tasks', async () => {
    const response = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should get task by ID', async () => {
    const response = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(taskId);
  });

  test('should update task', async () => {
    const response = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'in-progress',
        priority: 'medium'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('in-progress');
  });

  test('should delete task', async () => {
    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('Search API', () => {
  let authToken;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    authToken = response.body.data.accessToken;
  });

  test('should search tasks by keyword', async () => {
    const response = await request(app)
      .post('/api/search/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        q: 'test',
        page: 1,
        limit: 10
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.tasks)).toBe(true);
  });

  test('should get activity suggestions', async () => {
    const response = await request(app)
      .get('/api/search/suggest')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('User Profile', () => {
  let authToken;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    authToken = response.body.data.accessToken;
  });

  test('should get user profile', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });

  test('should update user profile', async () => {
    const response = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Name',
        theme: 'dark'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Name');
  });
});

describe('Error Handling', () => {
  test('should return 404 for non-existent endpoint', async () => {
    const response = await request(app)
      .get('/api/non-existent')
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  test('should return 401 without token', async () => {
    const response = await request(app)
      .get('/api/tasks')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  test('should return validation error', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'weak'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
  });
});

describe('Performance Tests', () => {
  let authToken;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    authToken = response.body.data.accessToken;
  });

  test('should respond within 500ms for GET /api/tasks', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test('should handle pagination correctly', async () => {
    const response = await request(app)
      .get('/api/tasks?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.pagination).toBeDefined();
    expect(response.body.data.pagination.page).toBe(1);
  });
});

export default {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  afterEach
};
