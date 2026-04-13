import type { JSX } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  NodeKey,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import {
  $isAnchorHeadingNode,
  AnchorHeadingNode,
} from '../../nodes/AnchorHeadingNode';
import s from './style.module.css';

// Sanitizes user input into a valid HTML id value
function sanitizeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^-+|-+$/g, '');
}

// ---- Floating panel ----

function FloatingAnchorPanel({
  nodeKey,
  anchorElem,
  onClose,
}: {
  nodeKey: NodeKey;
  anchorElem: HTMLElement;
  onClose: () => void;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);

  // Load current anchor ID from node
  useEffect(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAnchorHeadingNode(node)) setValue(node.getAnchorId());
    });
  }, [editor, nodeKey]);

  // Position: inline right side of the heading
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const nodeDom = editor.getElementByKey(nodeKey);
    if (!nodeDom) return;

    const nodeRect = nodeDom.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();

    const top =
      nodeRect.top -
      anchorRect.top +
      anchorElem.scrollTop +
      (nodeRect.height - 36) / 2;

    const rightEdge = nodeRect.right - anchorRect.left + anchorElem.scrollLeft + 10;
    const panelWidth = panel.getBoundingClientRect().width || 220;

    // If not enough space to the right, fall back to below the heading
    const fitsRight = nodeRect.right + panelWidth + 20 < window.innerWidth;

    if (fitsRight) {
      panel.style.top = `${top}px`;
      panel.style.left = `${rightEdge}px`;
    } else {
      panel.style.top = `${nodeRect.bottom - anchorRect.top + anchorElem.scrollTop + 6}px`;
      panel.style.left = `${nodeRect.left - anchorRect.left + anchorElem.scrollLeft}px`;
    }

    panel.style.opacity = '1';
    panel.style.transform = 'scale(1)';

    inputRef.current?.focus();
  }, [editor, nodeKey, anchorElem]);

  // Close on Escape
  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        onClose();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onClose]);

  const save = useCallback(
    (raw: string) => {
      const clean = sanitizeId(raw);
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isAnchorHeadingNode(node)) node.setAnchorId(clean);
      });
      if (clean !== raw) setValue(clean);
    },
    [editor, nodeKey],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      save(value);
      onClose();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const copyLink = useCallback(() => {
    const clean = sanitizeId(value);
    if (!clean) return;
    navigator.clipboard.writeText(`#${clean}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  const clearId = useCallback(() => {
    setValue('');
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAnchorHeadingNode(node)) node.setAnchorId('');
    });
  }, [editor, nodeKey]);

  return (
    <div
      ref={panelRef}
      className={s['FloatingAnchor__panel']}
      role='dialog'
      aria-label='Set anchor ID'
    >
      <span className={s['FloatingAnchor__hash']}>#</span>
      <input
        ref={inputRef}
        className={s['FloatingAnchor__input']}
        value={value}
        placeholder='anchor-id'
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        spellCheck={false}
      />
      {value && (
        <button
          type='button'
          className={[
            s['FloatingAnchor__iconBtn'],
            copied ? s['FloatingAnchor__iconBtn--success'] : '',
          ].join(' ')}
          title={copied ? 'Copied!' : 'Copy #anchor-id'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={copyLink}
        >
          {copied ? '✓' : '🔗'}
        </button>
      )}
      {value && (
        <button
          type='button'
          className={s['FloatingAnchor__iconBtn']}
          title='Remove anchor ID'
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearId}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ---- Plugin ----

export default function FloatingAnchorPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [activeNodeKey, setActiveNodeKey] = useState<NodeKey | null>(null);

  const closePanel = useCallback(() => setActiveNodeKey(null), []);

  useEffect(() => {
    // Show panel whenever selection moves into an AnchorHeadingNode
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          setActiveNodeKey(null);
          return false;
        }

        const anchor = selection.anchor.getNode();
        const headingNode = $findMatchingParent(
          anchor,
          (n): n is AnchorHeadingNode => $isAnchorHeadingNode(n),
        );

        setActiveNodeKey(headingNode ? headingNode.getKey() : null);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!activeNodeKey) return null;

  return createPortal(
    <FloatingAnchorPanel
      nodeKey={activeNodeKey}
      anchorElem={anchorElem}
      onClose={closePanel}
    />,
    anchorElem,
  );
}
