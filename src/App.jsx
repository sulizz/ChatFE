import { SignUp } from "./SignUp"
import { ChatComponent } from "./ChatComponent"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import { HomePage } from "./HomePage"
import { Login } from "./Login"
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<ChatComponent />} />
      </Routes>
    </Router>
  )
}

export default App
