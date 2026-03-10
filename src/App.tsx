import type { JSX } from 'react';
import Editor from './editor/Editor';
import s from './App.module.css';

export default function App(): JSX.Element {
  return (
    <div className={s.App}>
      <header className={s.App__header}>
        <h1 className={s.App__title}>Lexical Playground</h1>
        <p className={s.App__subtitle}>
          Rich text editor · Click&nbsp;<strong>+ Button</strong> in toolbar to
          insert a configurable button node
        </p>
      </header>
      <main className={s['App__main']}>
        <Editor />
      </main>
    </div>
  );
}
