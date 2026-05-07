import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Chat = lazy(() => import('./pages/Chat'));
const Friends = lazy(() => import('./pages/Friends'));

function App() {
  return (
    <div className="App">
      <div className="matrix-bg"></div>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <ChatProvider>
              <Suspense fallback={<div className="app-loading text-success text-center p-5">Loading...</div>}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  <Route path="/friends" element={
                    <ProtectedRoute>
                      <Friends />
                    </ProtectedRoute>
                  } />
                  <Route path="/" element={<Navigate to="/chat" />} />
                </Routes>
              </Suspense>
            </ChatProvider>
          </SocketProvider>
        </AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </Router>
    </div>
  );
}

export default App;
