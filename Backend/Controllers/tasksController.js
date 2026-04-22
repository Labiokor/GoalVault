const Task = require('../models/Task')
const { createNotification } = require('./notificationController')
const { success, error } = require('../Utils/responseHandler')

exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, user: req.user.id })
    await createNotification(
      req.user.id,
      'New Task Added',
      `Your task "${task.title}" has been created`,
      'task',
      { model: 'Task', documentId: task._id }
    )
    success(res, task, 'Task created', 201)
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.getTasks = async (req, res) => {
  try {
    const filter = { user: req.user.id }
    if (req.query.status) filter.status = req.query.status      // ✅ e.g. ?status=done
    if (req.query.priority) filter.priority = req.query.priority // ✅ e.g. ?priority=high

    const tasks = await Task.find(filter).sort({ createdAt: -1 })
    success(res, tasks, 'Tasks retrieved')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }  // ✅ added runValidators
    )
    if (!task) return error(res, 'Task not found', 404)

    // ✅ Check task.status (updated value) not req.body.status
    if (task.status === 'done') {
      await createNotification(
        req.user.id,
        'Task Completed ✅',
        `You completed "${task.title}" — great work!`,
        'task',
        { model: 'Task', documentId: task._id }
      )
    }

    success(res, task, 'Task updated')
  } catch (err) {
    error(res, err.message, 500)
  }
}

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!task) return error(res, 'Task not found', 404)

    await createNotification(
      req.user.id,
      'Task Deleted',
      `Your task "${task.title}" has been deleted`,
      'task',
      { model: 'Task', documentId: task._id }
    )
    success(res, null, 'Task deleted')
  } catch (err) {
    error(res, err.message, 500)
  }
}
