import type { JSX } from 'react';
import Editor from './editor/Editor';
import './App.css';

export default function App(): JSX.Element {
  return (
    <div className="App">
      <header className="App__header">
        <h1 className="App__title">Lexical Playground</h1>
        <p className="App__subtitle">
          Rich text editor · Click&nbsp;<strong>+ Button</strong> in toolbar to insert a configurable button node
        </p>
      </header>
      <main className="App__main">
        <Editor />
      </main>
    </div>
  );
}
