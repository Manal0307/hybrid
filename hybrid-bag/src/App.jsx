import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Materials from "./pages/Materials";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/materials" element={<Materials />} />
    </Routes>
  );
}

export default App;
