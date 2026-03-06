// services/taskService.ts
// CRUD de Tarefas migrado para o Backend Express

import { Task } from '@/types';
import { apiRequest } from './apiClient';

// ===========================
// CREATE
// ===========================
export async function createTask(data: Partial<Task>): Promise<number> {
  const newTask = await apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  // O endpoint responde com id_tarefa_novo (ou id, dependendo do payload do seu repository de resposta)
  // De acordo com o que fizemos no repositório backend, a query retorna * incl. id_tarefa_novo
  return newTask.id_tarefa_novo;
}

// ===========================
// UPDATE
// ===========================
export async function updateTask(taskId: string | number, data: Partial<Task>): Promise<void> {
  await apiRequest(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ===========================
// DELETE
// ===========================
export async function deleteTask(taskId: string | number, force: boolean = false, deleteHours: boolean = false): Promise<void> {
  const params = new URLSearchParams();
  if (force) params.append('force', 'true');
  if (deleteHours) params.append('deleteHours', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  await apiRequest(`/tasks/${taskId}${query}`, {
    method: 'DELETE'
  });
}
