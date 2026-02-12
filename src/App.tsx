import { useAppStore } from './store';
import SetupPage from './components/setup/SetupPage';
import Workspace from './components/workspace/Workspace';

function App() {
  const view = useAppStore((s) => s.view);

  if (view === 'setup') {
    return <SetupPage />;
  }

  return <Workspace />;
}

export default App;
