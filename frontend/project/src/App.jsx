import './App.css'
import { Route, Routes } from "react-router-dom";
import Home from './Home';
import Snake from './Snake';

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/snake" element={<Snake />}/>
      </Routes>
    </>
  )
}

export default App
