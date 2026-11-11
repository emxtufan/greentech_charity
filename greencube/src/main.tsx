import {createRoot} from 'react-dom/client';
import App from './App.tsx';

let mountNode = document.getElementById('greencube-react-root');

if (!mountNode) {
  mountNode = document.createElement('div');
  mountNode.id = 'greencube-react-root';
  document.body.appendChild(mountNode);
}

createRoot(mountNode).render(<App />);
