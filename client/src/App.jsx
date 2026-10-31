import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main landing route */}
        <Route path="/" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;

