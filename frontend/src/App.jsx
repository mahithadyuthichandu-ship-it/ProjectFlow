import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Board from './pages/Board';
import Team from './pages/Team';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/board" element={<Board />} />
        <Route path="/board/:projectId" element={<Board />} />
        <Route path="/team" element={<Team />} />
      </Routes>
    </Layout>
  );
}
