import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Summarizer from './components/Summarizer'
import Login from './components/Login'
import Signup from './components/Signup'
import ResultPage from './components/ResultPage'
import SummaryPage from './components/SummaryPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/summarizer" element={<Summarizer />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App