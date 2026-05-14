// ============================================================
// API ENDPOINT TESTING SETUP
// ============================================================
// Use these curl commands or import into Postman
// Replace {BASE_URL} with http://localhost:5000 (or your server URL)
// Replace {TOKEN} with the JWT token from login response

const BASE_URL = 'http://localhost:5000'
const API_VERSION = 'v1'

const API_ENDPOINTS = {
  // ==================== AUTH ====================
  auth: {
    register: `POST ${BASE_URL}/api/${API_VERSION}/auth/register`,
    login: `POST ${BASE_URL}/api/${API_VERSION}/auth/login`,
    getCurrentUser: `GET ${BASE_URL}/api/${API_VERSION}/auth/me`,
    logout: `POST ${BASE_URL}/api/${API_VERSION}/auth/logout`
  },

  // ==================== HABITS ====================
  habits: {
    getAll: `GET ${BASE_URL}/api/${API_VERSION}/habits`,
    create: `POST ${BASE_URL}/api/${API_VERSION}/habits`,
    getOne: `GET ${BASE_URL}/api/${API_VERSION}/habits/:id`,
    update: `PUT ${BASE_URL}/api/${API_VERSION}/habits/:id`,
    complete: `POST ${BASE_URL}/api/${API_VERSION}/habits/:id/complete`,
    delete: `DELETE ${BASE_URL}/api/${API_VERSION}/habits/:id`
  },

  // ==================== NOTES ====================
  notes: {
    getAll: `GET ${BASE_URL}/api/${API_VERSION}/notes`,
    create: `POST ${BASE_URL}/api/${API_VERSION}/notes`,
    getOne: `GET ${BASE_URL}/api/${API_VERSION}/notes/:id`,
    update: `PUT ${BASE_URL}/api/${API_VERSION}/notes/:id`,
    pin: `PUT ${BASE_URL}/api/${API_VERSION}/notes/:id/pin`,
    delete: `DELETE ${BASE_URL}/api/${API_VERSION}/notes/:id`
  },

  // ==================== GOALS ====================
  goals: {
    getAll: `GET ${BASE_URL}/api/${API_VERSION}/goals`,
    create: `POST ${BASE_URL}/api/${API_VERSION}/goals`,
    getOne: `GET ${BASE_URL}/api/${API_VERSION}/goals/:id`,
    update: `PUT ${BASE_URL}/api/${API_VERSION}/goals/:id`,
    delete: `DELETE ${BASE_URL}/api/${API_VERSION}/goals/:id`
  },

  // ==================== TASKS ====================
  tasks: {
    getAll: `GET ${BASE_URL}/api/${API_VERSION}/tasks`,
    create: `POST ${BASE_URL}/api/${API_VERSION}/tasks`,
    getOne: `GET ${BASE_URL}/api/${API_VERSION}/tasks/:id`,
    update: `PUT ${BASE_URL}/api/${API_VERSION}/tasks/:id`,
    delete: `DELETE ${BASE_URL}/api/${API_VERSION}/tasks/:id`
  },

  // ==================== REMINDERS ====================
  reminders: {
    getAll: `GET ${BASE_URL}/api/${API_VERSION}/reminders`,
    create: `POST ${BASE_URL}/api/${API_VERSION}/reminders`,
    getOne: `GET ${BASE_URL}/api/${API_VERSION}/reminders/:id`,
    update: `PUT ${BASE_URL}/api/${API_VERSION}/reminders/:id`,
    trigger: `POST ${BASE_URL}/api/${API_VERSION}/reminders/:id/trigger`,
    delete: `DELETE ${BASE_URL}/api/${API_VERSION}/reminders/:id`
  }
}

// ============================================================
// CURL EXAMPLES
// ============================================================

const CURL_EXAMPLES = {
  // AUTH
  register: `curl -X POST ${BASE_URL}/api/${API_VERSION}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123"
  }'`,

  login: `curl -X POST ${BASE_URL}/api/${API_VERSION}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'`,

  getCurrentUser: `curl -X GET ${BASE_URL}/api/${API_VERSION}/auth/me \\
  -H "Authorization: Bearer {TOKEN}"`,

  // HABITS
  getAllHabits: `curl -X GET ${BASE_URL}/api/${API_VERSION}/habits \\
  -H "Authorization: Bearer {TOKEN}"`,

  createHabit: `curl -X POST ${BASE_URL}/api/${API_VERSION}/habits \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "name": "Morning Meditation",
    "frequency": "daily",
    "icon": "🧘",
    "target": "15 mins",
    "challengeDays": 7,
    "reminderTime": "06:00"
  }'`,

  completeHabit: `curl -X POST ${BASE_URL}/api/${API_VERSION}/habits/{HABIT_ID}/complete \\
  -H "Authorization: Bearer {TOKEN}"`,

  updateHabit: `curl -X PUT ${BASE_URL}/api/${API_VERSION}/habits/{HABIT_ID} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "name": "Updated Habit Name",
    "target": "20 mins"
  }'`,

  deleteHabit: `curl -X DELETE ${BASE_URL}/api/${API_VERSION}/habits/{HABIT_ID} \\
  -H "Authorization: Bearer {TOKEN}"`,

  // NOTES
  getAllNotes: `curl -X GET ${BASE_URL}/api/${API_VERSION}/notes \\
  -H "Authorization: Bearer {TOKEN}"`,

  createNote: `curl -X POST ${BASE_URL}/api/${API_VERSION}/notes \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "title": "My Note",
    "content": "Note content here",
    "category": "personal"
  }'`,

  pinNote: `curl -X PUT ${BASE_URL}/api/${API_VERSION}/notes/{NOTE_ID}/pin \\
  -H "Authorization: Bearer {TOKEN}"`,

  updateNote: `curl -X PUT ${BASE_URL}/api/${API_VERSION}/notes/{NOTE_ID} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "title": "Updated Title",
    "content": "Updated content",
    "pinned": true
  }'`,

  deleteNote: `curl -X DELETE ${BASE_URL}/api/${API_VERSION}/notes/{NOTE_ID} \\
  -H "Authorization: Bearer {TOKEN}"`,

  // GOALS
  getAllGoals: `curl -X GET ${BASE_URL}/api/${API_VERSION}/goals \\
  -H "Authorization: Bearer {TOKEN}"`,

  createGoal: `curl -X POST ${BASE_URL}/api/${API_VERSION}/goals \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "title": "Learn TypeScript",
    "description": "Master TypeScript for development",
    "dueDate": "2026-12-31",
    "category": "learning"
  }'`,

  // TASKS
  getAllTasks: `curl -X GET ${BASE_URL}/api/${API_VERSION}/tasks \\
  -H "Authorization: Bearer {TOKEN}"`,

  createTask: `curl -X POST ${BASE_URL}/api/${API_VERSION}/tasks \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "title": "Design database schema",
    "description": "Plan the MongoDB schema",
    "dueDate": "2026-05-20",
    "priority": "high",
    "category": "work"
  }'`,

  completeTask: `curl -X PUT ${BASE_URL}/api/${API_VERSION}/tasks/{TASK_ID} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "status": "completed"
  }'`,

  // REMINDERS
  getAllReminders: `curl -X GET ${BASE_URL}/api/${API_VERSION}/reminders \\
  -H "Authorization: Bearer {TOKEN}"`,

  createReminder: `curl -X POST ${BASE_URL}/api/${API_VERSION}/reminders \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {TOKEN}" \\
  -d '{
    "title": "Morning Meditation",
    "datetime": "2026-05-13T06:00:00Z",
    "recurrenceType": "daily",
    "category": "habit"
  }'`
}

// ============================================================
// TESTING WORKFLOW
// ============================================================

const WORKFLOW = `
1. REGISTER/LOGIN
   ${CURL_EXAMPLES.register}
   Copy the token from response
   
2. GET CURRENT USER
   ${CURL_EXAMPLES.getCurrentUser}
   
3. CREATE A HABIT
   ${CURL_EXAMPLES.createHabit}
   
4. GET ALL HABITS
   ${CURL_EXAMPLES.getAllHabits}
   
5. COMPLETE A HABIT
   ${CURL_EXAMPLES.completeHabit}
   (Check streak incremented and milestone rewards trigger at 3,7,14,21,30 days)
   
6. CREATE A NOTE
   ${CURL_EXAMPLES.createNote}
   
7. PIN A NOTE
   ${CURL_EXAMPLES.pinNote}
   
8. CREATE A GOAL
   ${CURL_EXAMPLES.createGoal}
   
9. CREATE A TASK
   ${CURL_EXAMPLES.createTask}
   
10. CREATE A REMINDER
    ${CURL_EXAMPLES.createReminder}
`

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const ENV_VARS = {
  local: {
    BASE_URL: 'http://localhost:5000',
    API_VERSION: 'v1',
    TEST_EMAIL: 'test@example.com',
    TEST_PASSWORD: 'TestPassword123'
  },
  staging: {
    BASE_URL: 'https://api-staging.goalvault.com',
    API_VERSION: 'v1',
    TEST_EMAIL: 'test@staging.example.com',
    TEST_PASSWORD: 'TestPassword123'
  },
  production: {
    BASE_URL: 'https://api.goalvault.com',
    API_VERSION: 'v1'
  }
}

// ============================================================
// POSTMAN IMPORT TEMPLATE
// ============================================================

const POSTMAN_COLLECTION = {
  info: {
    name: 'GoalVault API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [
    {
      name: 'Auth',
      item: [
        {
          name: 'Register',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                password: 'TestPassword123'
              }, null, 2)
            },
            url: { raw: `${BASE_URL}/api/${API_VERSION}/auth/register` }
          }
        },
        {
          name: 'Login',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'test@example.com',
                password: 'TestPassword123'
              }, null, 2)
            },
            url: { raw: `${BASE_URL}/api/${API_VERSION}/auth/login` }
          }
        }
      ]
    }
  ]
}

module.exports = {
  BASE_URL,
  API_ENDPOINTS,
  CURL_EXAMPLES,
  ENV_VARS,
  POSTMAN_COLLECTION,
  WORKFLOW
}

// To use in tests:
// const { API_ENDPOINTS, CURL_EXAMPLES } = require('./testing-setup.js')
