import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ChatProvider from './context/ChatProvider.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChatProvider>
    <App />
    </ChatProvider>
  </StrictMode>,
)
