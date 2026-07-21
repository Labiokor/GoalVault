const nodemailer = require('nodemailer')

// Create transporter
let transporter = null

function getTransporter() {
  if (transporter) return transporter

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not set — email sending disabled')
    return null
  }
 transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // Gmail App Password — not your regular password
  }
})
  return transporter
}

// ── Send helper ───────────────────────────────────────────────────
async function sendMail(options) {
  const t = getTransporter()
  if (!t) {
    console.log('Email skipped — no credentials:', options.subject)
    return
  }
  try {
    await t.sendMail(options)
    console.log('Email sent to:', options.to)
  } catch (err) {
    console.error('Failed to send email:', err.message)
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────

function reminderEmailTemplate(userName, reminder) {
  const dt = new Date(reminder.datetime)
  const timeStr = dt.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>GoalVault Reminder</title>
    </head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:'Inter',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:28px;font-weight:900;margin:0;letter-spacing:-0.5px">GoalVault</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:2px">Your Productivity Sanctuary</p>
        </div>

        <!-- Content -->
        <div style="background:white;border-radius:16px;padding:32px;margin-bottom:24px;border:1px solid #e5e9eb;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="width:48px;height:48px;background:rgba(0,91,196,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px">🔔</div>
            <div>
              <p style="color:#5a6062;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0">Reminder</p>
              <h2 style="color:#2d3335;font-size:20px;font-weight:800;margin:4px 0 0">${reminder.title}</h2>
            </div>
          </div>

          <p style="color:#2d3335;font-size:15px;margin:0 0 8px">Hi <strong>${userName}</strong>,</p>
          <p style="color:#5a6062;font-size:14px;line-height:1.6;margin:0 0 24px">
            This is your GoalVault reminder. Here are the details:
          </p>

          <!-- Reminder details -->
          <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#5a6062;font-size:13px;font-weight:600;width:30%">📅 When</td>
                <td style="padding:8px 0;color:#2d3335;font-size:13px;font-weight:700">${timeStr}</td>
              </tr>
              ${reminder.notes ? `
              <tr>
                <td style="padding:8px 0;color:#5a6062;font-size:13px;font-weight:600;vertical-align:top">📝 Notes</td>
                <td style="padding:8px 0;color:#2d3335;font-size:13px">${reminder.notes}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0;color:#5a6062;font-size:13px;font-weight:600">🔄 Type</td>
                <td style="padding:8px 0;color:#2d3335;font-size:13px;font-weight:700">${reminder.recurring ? 'Recurring — ' + reminder.recurrenceType : 'One-time'}</td>
              </tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align:center;">
            <a href="${process.env.FRONTEND_URL || 'https://your-app.vercel.app'}/pages/reminders.html"
               style="display:inline-block;background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:14px;font-weight:700;">
              View Reminders
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;color:#767c7e;font-size:12px;">
          <p style="margin:0">GoalVault — Be Productive</p>
          <p style="margin:4px 0 0">You received this because you set a reminder on GoalVault.</p>
        </div>

      </div>
    </body>
    </html>
  `
}

function notificationEmailTemplate(userName, notification) {
  const typeEmojis = {
    goal:     '🎯',
    habit:    '🔥',
    task:     '✅',
    reminder: '🔔',
    finance:  '💰',
    general:  'ℹ️'
  }

  const emoji = typeEmojis[notification.type] || 'ℹ️'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:'Inter',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

        <div style="background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:28px;font-weight:900;margin:0">GoalVault</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:2px">Notification</p>
        </div>

        <div style="background:white;border-radius:16px;padding:32px;margin-bottom:24px;border:1px solid #e5e9eb;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
            <div style="width:48px;height:48px;background:rgba(0,91,196,0.1);border-radius:12px;text-align:center;line-height:48px;font-size:24px">${emoji}</div>
            <div>
              <p style="color:#5a6062;font-size:12px;font-weight:700;text-transform:uppercase;margin:0">${notification.type}</p>
              <h2 style="color:#2d3335;font-size:20px;font-weight:800;margin:4px 0 0">${notification.title}</h2>
            </div>
          </div>

          <p style="color:#2d3335;font-size:15px;margin:0 0 8px">Hi <strong>${userName}</strong>,</p>
          <p style="color:#5a6062;font-size:14px;line-height:1.6;margin:0 0 24px">${notification.message}</p>

          <div style="text-align:center;">
            <a href="${process.env.FRONTEND_URL || 'https://your-app.vercel.app'}/pages/notifications.html"
               style="display:inline-block;background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:14px;font-weight:700;">
              View Notifications
            </a>
          </div>
        </div>

        <div style="text-align:center;color:#767c7e;font-size:12px;">
          <p style="margin:0">GoalVault — Be Productive</p>
        </div>

      </div>
    </body>
    </html>
  `
}

function welcomeEmailTemplate(userName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8f9fa;font-family:'Inter',Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

        <div style="background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%);border-radius:16px;padding:40px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;font-size:32px;font-weight:900;margin:0">GoalVault</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;text-transform:uppercase;letter-spacing:2px">Your Productivity Sanctuary</p>
        </div>

        <div style="background:white;border-radius:16px;padding:32px;margin-bottom:24px;border:1px solid #e5e9eb;">
          <h2 style="color:#2d3335;font-size:24px;font-weight:800;margin:0 0 16px">Welcome, ${userName}! 🎉</h2>
          <p style="color:#5a6062;font-size:14px;line-height:1.7;margin:0 0 16px">
            Your GoalVault sanctuary is ready. Here's what you can do:
          </p>

          <div style="space-y:12px">
            ${[
              ['✅', 'Tasks', 'Create and track your daily tasks'],
              ['🔥', 'Habits', 'Build streaks and earn rewards'],
              ['🎯', 'Goals', 'Set long-term goals and track progress'],
              ['📝', 'Notes', 'Capture your thoughts and ideas'],
              ['💰', 'Finance', 'Track your income and expenses'],
              ['🔔', 'Reminders', 'Never miss an important deadline'],
            ].map(([emoji, title, desc]) => `
              <div style="display:flex;align-items:center;gap:16px;padding:12px;background:#f8f9fa;border-radius:12px;margin-bottom:8px;">
                <span style="font-size:24px;width:40px;text-align:center">${emoji}</span>
                <div>
                  <p style="color:#2d3335;font-size:14px;font-weight:700;margin:0">${title}</p>
                  <p style="color:#5a6062;font-size:12px;margin:2px 0 0">${desc}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.FRONTEND_URL || 'https://your-app.vercel.app'}/pages/dashboard.html"
               style="display:inline-block;background:linear-gradient(135deg,#005bc4 0%,#4388fd 100%);color:white;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:15px;font-weight:700;">
              Go to My Dashboard
            </a>
          </div>
        </div>

        <div style="text-align:center;color:#767c7e;font-size:12px;">
          <p style="margin:0">© 2026 GoalVault. Be Productive.</p>
        </div>

      </div>
    </body>
    </html>
  `
}

// ─── SEND FUNCTIONS ───────────────────────────────────────────────

exports.sendReminderEmail = async (userEmail, userName, reminder) => {
  await sendMail({
    from: '"GoalVault" <' + process.env.EMAIL_USER + '>',
    to: userEmail,
    subject: '🔔 Reminder: ' + reminder.title,
    html: reminderEmailTemplate(userName, reminder)
  })
}

exports.sendNotificationEmail = async (userEmail, userName, notification) => {
  await sendMail({
    from: '"GoalVault" <' + process.env.EMAIL_USER + '>',
    to: userEmail,
    subject: '🔔 ' + notification.title,
    html: notificationEmailTemplate(userName, notification)
  })
}

exports.sendWelcomeEmail = async (userEmail, userName) => {
  await sendMail({
    from: '"GoalVault" <' + process.env.EMAIL_USER + '>',
    to: userEmail,
    subject: '🎉 Welcome to GoalVault, ' + userName + '!',
    html: welcomeEmailTemplate(userName)
  })
}
