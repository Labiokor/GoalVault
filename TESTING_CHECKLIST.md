# API Testing Guide & Checklist

## Setup
- [ ] MongoDB is running locally or connection string is set in `.env`
- [ ] Backend server is running (`npm start`)
- [ ] Frontend dev server is running (`npm run dev`)
- [ ] Test user has been seeded (`node Backend/seeds/seedData.js`)

## Test User Credentials
```
Email: test@example.com
Password: TestPassword123
```

---

## Authentication Endpoints

### Register
- [ ] POST `/api/auth/register` - Create new account
  - Payload: `{ name, email, password }`
  - Expected: User object + auth token
  - Test: Register a new user

### Login
- [ ] POST `/api/auth/login` - Log in user
  - Payload: `{ email, password }`
  - Expected: User object + auth token
  - Test: Login with test credentials

### Get Current User
- [ ] GET `/api/auth/me` - Get logged-in user profile
  - Headers: `Authorization: Bearer {token}`
  - Expected: Current user object
  - Test: After login, verify user data

---

## Habits Endpoints

### Get All Habits
- [ ] GET `/api/habits` 
  - Headers: `Authorization: Bearer {token}`
  - Expected: Array of habits
  - Test: Should return 5 seeded habits

### Create Habit
- [ ] POST `/api/habits`
  - Payload: `{ name, frequency, icon, target?, challengeDays?, reminderTime? }`
  - Test: Create a new habit with challenge

### Get Single Habit
- [ ] GET `/api/habits/:id`
  - Expected: Single habit object
  - Test: Get one of the seeded habits

### Update Habit
- [ ] PUT `/api/habits/:id`
  - Payload: `{ name?, frequency?, target?, challengeDays? }`
  - Test: Modify habit details

### Complete Habit
- [ ] POST `/api/habits/:id/complete`
  - Expected: Updated habit with incremented streak
  - Test: Complete a habit and verify streak increases

### Delete Habit
- [ ] DELETE `/api/habits/:id`
  - Expected: Success message
  - Test: Delete a habit

### Habit Milestones
- [ ] Test milestone rewards trigger at: 3, 7, 14, 21, 30, 60, 100 days
- [ ] Verify messages display correctly
- [ ] Check challenge badges show correctly (3:🔥, 7:🏆, 14:🏅, 21:⭐, 30:💎)

---

## Notes Endpoints

### Get All Notes
- [ ] GET `/api/notes`
  - Headers: `Authorization: Bearer {token}`
  - Expected: Array of notes (should have 4 seeded)
  - Test: Should have pinned notes marked

### Create Note
- [ ] POST `/api/notes`
  - Payload: `{ title, content, category }`
  - Test: Create note in each category (personal, work, study, ideas)

### Get Single Note
- [ ] GET `/api/notes/:id`
  - Expected: Single note with full content
  - Test: Get one of the seeded notes

### Update Note
- [ ] PUT `/api/notes/:id`
  - Payload: `{ title?, content?, category?, pinned? }`
  - Test: Edit note and toggle pin

### Pin/Unpin Note
- [ ] PUT `/api/notes/:id/pin`
  - Expected: Note with `pinned` toggled
  - Test: Pin/unpin multiple notes

### Delete Note
- [ ] DELETE `/api/notes/:id`
  - Expected: Success message
  - Test: Delete a note

### Note Search & Filtering
- [ ] Frontend search in title/content (client-side or API search endpoint)
- [ ] Filter by category
- [ ] Sort by date (Today, This Week, This Month, Older)

---

## Goals Endpoints

### Get All Goals
- [ ] GET `/api/goals`
  - Expected: Array of 3 seeded goals
  - Test: Should have various statuses

### Create Goal
- [ ] POST `/api/goals`
  - Payload: `{ title, description, dueDate, category, status? }`
  - Test: Create a new goal

### Update Goal Progress
- [ ] PUT `/api/goals/:id`
  - Payload: `{ progress?, status? }`
  - Test: Update progress and status

### Delete Goal
- [ ] DELETE `/api/goals/:id`
  - Test: Delete a goal

---

## Tasks Endpoints

### Get All Tasks
- [ ] GET `/api/tasks`
  - Expected: Array of 3 seeded tasks
  - Test: Should have various priorities and statuses

### Create Task
- [ ] POST `/api/tasks`
  - Payload: `{ title, description, dueDate, priority, category, status? }`
  - Test: Create task with high, medium, low priority

### Update Task Status
- [ ] PUT `/api/tasks/:id`
  - Payload: `{ status?, priority? }`
  - Test: Mark task complete

### Delete Task
- [ ] DELETE `/api/tasks/:id`
  - Test: Delete a task

---

## Reminders Endpoints

### Get All Reminders
- [ ] GET `/api/reminders`
  - Expected: Array of 2 seeded reminders
  - Test: Should have daily and weekly recurrences

### Create Reminder
- [ ] POST `/api/reminders`
  - Payload: `{ title, datetime, recurrenceType?, category?, notes? }`
  - Test: Create reminder with daily recurrence

### Trigger Reminder
- [ ] POST `/api/reminders/:id/trigger`
  - Test: Manually trigger a reminder

### Delete Reminder
- [ ] DELETE `/api/reminders/:id`
  - Test: Delete a reminder

---

## Frontend Integration Tests

### Habits
- [ ] [ ] View all habits with correct data
- [ ] [ ] See 3-day challenge with 🔥 emoji
- [ ] [ ] See weekly performance chart
- [ ] [ ] See calendar view
- [ ] [ ] Create new habit
- [ ] [ ] Complete habit and see streak increase
- [ ] [ ] See milestone reward popups at 3, 7, 14, 21, 30 days
- [ ] [ ] See motivational messages
- [ ] [ ] Delete habit
- [ ] [ ] Daily reminder works

### Notes
- [ ] [ ] View all notes grouped by date
- [ ] [ ] Search notes by title/content
- [ ] [ ] Filter by category
- [ ] [ ] Create new note
- [ ] [ ] Edit note with auto-save
- [ ] [ ] Pin/unpin note
- [ ] [ ] Delete note
- [ ] [ ] See pin icon in list

### Goals
- [ ] [ ] View all goals
- [ ] [ ] Create new goal
- [ ] [ ] Update goal progress
- [ ] [ ] Delete goal

### Tasks
- [ ] [ ] View all tasks
- [ ] [ ] Create new task
- [ ] [ ] Mark task complete
- [ ] [ ] Delete task

---

## Error Handling Tests

- [ ] Missing auth token returns 401
- [ ] Invalid token returns 401
- [ ] Unauthorized access returns 403
- [ ] Invalid ID returns 404
- [ ] Validation errors return 400
- [ ] Server errors return 500 with message

---

## Performance Tests

- [ ] Load habits page - should load < 1 second
- [ ] Load notes page - should load < 1 second
- [ ] Search 100 notes - should filter < 500ms
- [ ] Complete habit - should update < 500ms
- [ ] Bulk create 50 notes - should handle gracefully

---

## Cross-Browser Tests

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari
- [ ] Mobile (iOS Safari, Chrome Mobile)

---

## Deployment Readiness

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Error logging set up
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] JWT secrets are secure
- [ ] Password hashing working
- [ ] Email service configured (if applicable)

---

## Known Issues & Workarounds

(Document any issues found during testing)

| Issue | Status | Workaround |
|-------|--------|-----------|
| | | |

---

## Sign-off

- **Tester**: 
- **Date**: 
- **Status**: ⬜ Not Started | 🟨 In Progress | 🟩 Complete | 🟥 Failed

---

## Notes

Use this section for additional observations, suggestions, or issues found.
