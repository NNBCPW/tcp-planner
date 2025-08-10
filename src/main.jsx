import React from 'react'
import { createRoot } from 'react-dom/client'
import TCPPlanner from './App.jsx'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TCPPlanner />
  </React.StrictMode>
)
