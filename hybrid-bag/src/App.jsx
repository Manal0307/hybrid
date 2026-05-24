import { Routes, Route } from "react-router-dom";
import { AmbientSoundProvider } from "./context/AmbientSoundContext";
import Home from "./pages/Home";
import Materials from "./pages/Materials";
import Process from "./pages/Process";
import About from "./pages/About";

function App() {
  return (
    <AmbientSoundProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/process" element={<Process />} />
      </Routes>
    </AmbientSoundProvider>
  );
}

export default App;
