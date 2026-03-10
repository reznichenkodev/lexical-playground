import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';

import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { $createButtonNode } from '../../nodes/ButtonNode/ButtonNode';
import s from './style.module.css';

interface ToolbarInnerProps {
  editor: LexicalEditor;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isLink: boolean;
}

function ToolbarInner({
  editor,
  isBold,
  isItalic,
  isUnderline,
  isLink,
}: ToolbarInnerProps): JSX.Element {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');

  // Load URL when cursor is on an existing link
  useEffect(() => {
    if (!isLink) return;
    editor.getEditorState().read(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      const linkNode = $findMatchingParent(sel.anchor.getNode(), $isLinkNode);
      if ($isLinkNode(linkNode)) setLinkUrl(linkNode.getURL());
    });
  }, [isLink, editor]);

  // Position toolbar above (or below) the current selection — runs after every render
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const nativeSel = window.getSelection();
    if (!nativeSel || nativeSel.rangeCount === 0) return;

    const selRect = nativeSel.getRangeAt(0).getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();

    let top = selRect.top + window.scrollY - toolbarRect.height - 8;
    let left =
      selRect.left +
      window.scrollX +
      selRect.width / 2 -
      toolbarRect.width / 2;

    // Clamp horizontally within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - toolbarRect.width - 8));

    // If toolbar would go above viewport, place it below the selection
    if (top < window.scrollY + 4) {
      top = selRect.bottom + window.scrollY + 8;
    }

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
    toolbar.style.opacity = '1';
  });

  const handleLinkBtn = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      setLinkUrl('https://');
      setShowLinkInput(true);
    }
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url && url !== 'https://') {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
    setShowLinkInput(false);
  };

  const handleInsertButton = () => {
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        const text = sel.getTextContent().trim() || 'Click me';
        sel.insertNodes([$createButtonNode({ label: text })]);
      }
    });
  };

  return (
    <div ref={toolbarRef} className={s['FloatingToolbar']}>
      {showLinkInput ? (
        <div className={s['FloatingToolbar__linkRow']}>
          <input
            className={s['FloatingToolbar__linkInput']}
            type='url'
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink();
              if (e.key === 'Escape') setShowLinkInput(false);
            }}
            autoFocus
            placeholder='https://...'
          />
          <button
            type='button'
            className={s['FloatingToolbar__confirmBtn']}
            onMouseDown={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            ✓
          </button>
          <button
            type='button'
            className={s['FloatingToolbar__cancelBtn']}
            onMouseDown={(e) => {
              e.preventDefault();
              setShowLinkInput(false);
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <button
            type='button'
            title='Bold (Ctrl+B)'
            className={[
              s['FloatingToolbar__btn'],
              isBold ? s['FloatingToolbar__btn--active'] : '',
            ].join(' ')}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
          >
            <b>B</b>
          </button>
          <button
            type='button'
            title='Italic (Ctrl+I)'
            className={[
              s['FloatingToolbar__btn'],
              isItalic ? s['FloatingToolbar__btn--active'] : '',
            ].join(' ')}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
          >
            <i>I</i>
          </button>
          <button
            type='button'
            title='Underline (Ctrl+U)'
            className={[
              s['FloatingToolbar__btn'],
              isUnderline ? s['FloatingToolbar__btn--active'] : '',
            ].join(' ')}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
          >
            <u>U</u>
          </button>

          <div className={s['FloatingToolbar__divider']} />

          <button
            type='button'
            title={isLink ? 'Remove link' : 'Add link'}
            className={[
              s['FloatingToolbar__btn'],
              isLink ? s['FloatingToolbar__btn--active'] : '',
            ].join(' ')}
            onMouseDown={(e) => {
              e.preventDefault();
              handleLinkBtn();
            }}
          >
            🔗
          </button>
          <button
            type='button'
            title='Convert selection to Button node'
            className={s['FloatingToolbar__btn']}
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertButton();
            }}
          >
            + Btn
          </button>
        </>
      )}
    </div>
  );
}

export default function FloatingToolbarPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [isText, setIsText] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);

  const updateState = useCallback(() => {
    const sel = $getSelection();
    if (!$isRangeSelection(sel) || sel.isCollapsed()) {
      setIsText(false);
      return;
    }
    setIsText(true);
    setIsBold(sel.hasFormat('bold'));
    setIsItalic(sel.hasFormat('italic'));
    setIsUnderline(sel.hasFormat('underline'));
    setIsLink($findMatchingParent(sel.anchor.getNode(), $isLinkNode) !== null);
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateState());
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateState();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateState]);

  if (!isText) return null;

  return createPortal(
    <ToolbarInner
      editor={editor}
      isBold={isBold}
      isItalic={isItalic}
      isUnderline={isUnderline}
      isLink={isLink}
    />,
    document.body,
  );
}
