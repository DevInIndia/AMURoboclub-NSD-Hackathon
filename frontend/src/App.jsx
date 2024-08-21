import React from 'react'
import {Routes, Route} from "react-router-dom"
import Home from './pages/Home'
import AdvanceSearch from './pages/AdvanceSearch'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/advance' element={<AdvanceSearch/>}/>
      </Routes>
    </div>
  )
}

export default App
