import type { JSX } from 'react';

import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { useRef } from 'react';
import * as React from 'react';

import s from './style.module.css';

export default function DraggableBlockPlugin({
  anchorElem,
}: {
  anchorElem: HTMLElement;
}): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div ref={menuRef} className={s['DraggableBlock__menu']}>
          <div className={s['DraggableBlock__icon']}>⠿</div>
        </div>
      }
      targetLineComponent={
        <div ref={targetLineRef} className={s['DraggableBlock__targetLine']} />
      }
      isOnMenu={(el) => !!menuRef.current?.contains(el)}
    />
  );
}
