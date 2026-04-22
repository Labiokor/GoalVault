import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:          resolve(__dirname, 'index.html'),
        login:         resolve(__dirname, 'login.html'),
        register:      resolve(__dirname, 'register.html'),
        dashboard:     resolve(__dirname, 'pages/dashboard.html'),
        tasks:         resolve(__dirname, 'pages/tasks.html'),
        habits:        resolve(__dirname, 'pages/habits.html'),
        notes:         resolve(__dirname, 'pages/notes.html'),
        goals:         resolve(__dirname, 'pages/goals.html'),
        finance:       resolve(__dirname, 'pages/finance.html'),
        reminders:     resolve(__dirname, 'pages/reminders.html'),
        notifications: resolve(__dirname, 'pages/notifications.html'),
        settings:      resolve(__dirname, 'pages/settings.html'),
      }
    }
  },
  server: {
    port: 3050,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})