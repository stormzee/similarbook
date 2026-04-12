import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/common/Navbar'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeedPage from './pages/FeedPage'
import SearchPage from './pages/SearchPage'
import NewTaskPage from './pages/NewTaskPage'
import TaskDetailPage from './pages/TaskDetailPage'
import ProfilePage from './pages/ProfilePage'
import ConnectionsPage from './pages/ConnectionsPage'
import InboxPage from './pages/InboxPage'
import ConversationPage from './pages/ConversationPage'

function PrivateRoute({ children }) {
  const { accessToken } = useAuthStore()
  return accessToken ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/feed" element={<PrivateRoute><FeedPage /></PrivateRoute>} />
        <Route path="/search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
        <Route path="/tasks/new" element={<PrivateRoute><NewTaskPage /></PrivateRoute>} />
        <Route path="/tasks/:id" element={<PrivateRoute><TaskDetailPage /></PrivateRoute>} />
        <Route path="/profile/:username" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/connections" element={<PrivateRoute><ConnectionsPage /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><InboxPage /></PrivateRoute>} />
        <Route path="/messages/:userId" element={<PrivateRoute><ConversationPage /></PrivateRoute>} />

        <Route path="/" element={<Navigate to="/feed" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
