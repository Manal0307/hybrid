import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Materials from "./pages/Materials";
import Process from "./pages/Process";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/materials" element={<Materials />} />
      <Route path="/process" element={<Process />} />
    </Routes>
  );
}

export default App;
