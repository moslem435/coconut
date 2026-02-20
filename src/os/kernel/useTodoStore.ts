import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface Todo {
  id: string
  content: string
  completed: boolean
  date: string // YYYY-MM-DD
  createdAt: number
}

interface TodoStore {
  todos: Todo[]
  addTodo: (content: string, date: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  getTodosByDate: (date: string) => Todo[]
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      todos: [],
      
      addTodo: (content: string, date: string) => {
        const newTodo: Todo = {
          id: uuidv4(),
          content,
          completed: false,
          date,
          createdAt: Date.now()
        }
        set((state) => ({ todos: [...state.todos, newTodo] }))
      },

      toggleTodo: (id: string) => {
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
        }))
      },

      deleteTodo: (id: string) => {
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        }))
      },

      getTodosByDate: (date: string) => {
        return get().todos.filter((t) => t.date === date).sort((a, b) => a.createdAt - b.createdAt)
      }
    }),
    {
      name: 'os-calendar-todos',
    }
  )
)
