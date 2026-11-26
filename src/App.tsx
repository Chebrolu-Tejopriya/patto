import { Inspector } from './ui/Inspector';
import { Library } from './ui/Library';
import { Stage } from './ui/Stage';

export default function App() {
  return (
    <div className="app">
      <Library />
      <Stage />
      <Inspector />
    </div>
  );
}
