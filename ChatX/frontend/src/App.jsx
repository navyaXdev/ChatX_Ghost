import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import EnterUser from './pages/EnterUser'
import ChatPage from './pages/ChatPage'
import ProtectedRoute from './route/ProtectedRoute'
import MainPage from './pages/MainPage'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/start' element={<EnterUser />} />
        <Route path='/' element={<MainPage/>}  />

        <Route path='/chat' element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
