import { useState } from 'react'
import './App.css'
import GhostGuardHero from './page/GhostGuardHero'
import { Route, Routes } from 'react-router-dom'
import Dashboard from './page/Dashboard'


function App() {

  return (
    <div> 
      <Routes>
        <Route path='/' element={<GhostGuardHero/>} />
        <Route path='/dashboard' element={<Dashboard/>} />
        
      </Routes>
    </div>
  )
}

export default App
