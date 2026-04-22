import { apiRequest } from "../api/api.js"

export const getTasks = async () => {
  return await apiRequest("/tasks")
}

export const createTask = async (task) => {
  return await apiRequest("/tasks", "POST", task)
}

export const updateTask = async (id, data) => {
  return await apiRequest(`/tasks/${id}`, "PUT", data)
}