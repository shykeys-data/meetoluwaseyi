import { createRoot } from 'react-dom/client';
import { Admin } from './Admin.tsx';
import './admin.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Admin />);
