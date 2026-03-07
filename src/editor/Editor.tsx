import type { JSX } from 'react';

import { registerCodeHighlighting } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useCallback, useEffect, useState } from 'react';

import PlaygroundNodes from './nodes/PlaygroundNodes';
import EditorTheme from './themes/EditorTheme';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import FloatingButtonConfigPlugin from './plugins/FloatingButtonConfigPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';

import './nodes/CollapsibleNode/index.css';
import './themes/EditorTheme.css';
import './Editor.css';

function CodeHighlightPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerCodeHighlighting(editor), [editor]);
  return null;
}

function onError(error: Error): void {
  console.error(error);
}

export default function Editor(): JSX.Element {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  const onRef = useCallback((elem: HTMLDivElement | null) => {
    if (elem !== null) setFloatingAnchorElem(elem);
  }, []);

  const initialConfig = {
    namespace: 'LexicalPlaygroundProj',
    theme: EditorTheme,
    nodes: PlaygroundNodes,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className='Editor__container'>
        <ToolbarPlugin />
        <div className='Editor__inner' ref={onRef}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className='Editor__contentEditable'
                aria-placeholder='Start typing...'
                placeholder={
                  <div className='Editor__placeholder'>Start typing...</div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <HorizontalRulePlugin />
          <TabIndentationPlugin />
          <CodeHighlightPlugin />
          <TablePlugin />
          <CollapsiblePlugin />
          {floatingAnchorElem && (
            <FloatingButtonConfigPlugin anchorElem={floatingAnchorElem} />
          )}
        </div>
      </div>
    </LexicalComposer>
  );
}
