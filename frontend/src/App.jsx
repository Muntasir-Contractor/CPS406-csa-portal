import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="Navbar">
        <ul className="nav_links">
          <li>
            <a href="#">Student Login</a>
          </li>
          <li>
            <a href="#">Coordinator Login</a>
          </li>
          <li>
            <a href="#"> Employer Login</a>
          </li>
        </ul>

      </div>
    </>
  )
}

export default App
