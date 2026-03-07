import type { JSX } from 'react';
import type {
  ButtonSize,
  ButtonVariant,
} from '../../nodes/ButtonNode/ButtonNode';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  NodeKey,
} from 'lexical';
import { OPEN_BUTTON_CONFIG_COMMAND } from '../../nodes/ButtonNode/ButtonNode';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { $isButtonNode } from '../../nodes/ButtonNode/ButtonNode';
import './index.css';

const VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'danger',
  'success',
  'ghost',
];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

interface FloatingConfigPanelProps {
  nodeKey: NodeKey;
  anchorElem: HTMLElement;
  onClose: () => void;
}

function FloatingConfigPanel({
  nodeKey,
  anchorElem,
  onClose,
}: FloatingConfigPanelProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);

  const [label, setLabel] = useState('');
  const [variant, setVariant] = useState<ButtonVariant>('primary');
  const [size, setSize] = useState<ButtonSize>('md');
  const [href, setHref] = useState('');
  const [disabled, setDisabled] = useState(false);

  // Tracks whether initial values have been loaded from the node.
  // Prevents applyChanges from firing with empty defaults before load completes.
  const hasInitialized = useRef(false);

  // Load current values from node
  useEffect(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isButtonNode(node)) {
        setLabel(node.getLabel());
        setVariant(node.getVariant());
        setSize(node.getSize());
        setHref(node.getHref());
        setDisabled(node.getDisabled());
      }
    });
    return () => {
      hasInitialized.current = false;
    };
  }, [editor, nodeKey]);

  // Position the panel above/below the button node's DOM element
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const editorElem = editor.getRootElement();
    if (!editorElem) return;

    const nodeDom = editor.getElementByKey(nodeKey);
    if (!nodeDom) return;

    const nodeRect = nodeDom.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    let top = nodeRect.bottom - anchorRect.top + anchorElem.scrollTop + 8;
    let left = nodeRect.left - anchorRect.left + anchorElem.scrollLeft;

    // Clamp to anchor bounds
    const maxLeft = anchorRect.width - panelRect.width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    // If panel goes below viewport, show above the node
    if (nodeRect.bottom + panelRect.height + 16 > window.innerHeight) {
      top =
        nodeRect.top -
        anchorRect.top +
        anchorElem.scrollTop -
        panelRect.height -
        8;
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.opacity = '1';
    panel.style.transform = 'scale(1)';
  }, [editor, nodeKey, anchorElem]);

  // Close on ESC
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

  // Apply changes to node — only writes values that actually changed (dirty check)
  const applyChanges = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isButtonNode(node)) {
        if (node.getLabel() !== label) node.setLabel(label);
        if (node.getVariant() !== variant) node.setVariant(variant);
        if (node.getSize() !== size) node.setSize(size);
        if (node.getHref() !== href) node.setHref(href);
        if (node.getDisabled() !== disabled) node.setDisabled(disabled);
      }
    });
  }, [editor, nodeKey, label, variant, size, href, disabled]);

  // Auto-apply button controls immediately (no focus issues with buttons)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    applyChanges();
  }, [variant, size, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={panelRef}
      className='FloatingButtonConfig__panel'
      role='dialog'
      aria-label='Button configuration'
    >
      <div className='FloatingButtonConfig__header'>
        <span className='FloatingButtonConfig__title'>Configure Button</span>
        <button
          type='button'
          className='FloatingButtonConfig__close'
          onClick={onClose}
          aria-label='Close'
        >
          &times;
        </button>
      </div>

      <div className='FloatingButtonConfig__body'>
        {/* Label */}
        <div className='FloatingButtonConfig__field'>
          <label className='FloatingButtonConfig__label'>Label</label>
          <input
            type='text'
            className='FloatingButtonConfig__input'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={applyChanges}
            placeholder='Button text...'
          />
        </div>

        {/* Variant */}
        <div className='FloatingButtonConfig__field'>
          <label className='FloatingButtonConfig__label'>Variant</label>
          <div className='FloatingButtonConfig__variantGrid'>
            {VARIANTS.map((v) => (
              <button
                key={v}
                type='button'
                className={[
                  'FloatingButtonConfig__variantBtn',
                  `FloatingButtonConfig__variantBtn--${v}`,
                  variant === v
                    ? 'FloatingButtonConfig__variantBtn--active'
                    : '',
                ].join(' ')}
                onClick={() => setVariant(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className='FloatingButtonConfig__field'>
          <label className='FloatingButtonConfig__label'>Size</label>
          <div className='FloatingButtonConfig__sizeGroup'>
            {SIZES.map((s) => (
              <button
                key={s}
                type='button'
                className={[
                  'FloatingButtonConfig__sizeBtn',
                  size === s ? 'FloatingButtonConfig__sizeBtn--active' : '',
                ].join(' ')}
                onClick={() => setSize(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Link */}
        <div className='FloatingButtonConfig__field'>
          <label className='FloatingButtonConfig__label'>Link (optional)</label>
          <input
            type='url'
            className='FloatingButtonConfig__input'
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onBlur={applyChanges}
            placeholder='https://...'
          />
        </div>

        {/* Disabled toggle */}
        <div className='FloatingButtonConfig__field FloatingButtonConfig__field--row'>
          <label className='FloatingButtonConfig__label'>Disabled</label>
          <button
            type='button'
            role='switch'
            aria-checked={disabled}
            className={[
              'FloatingButtonConfig__toggle',
              disabled ? 'FloatingButtonConfig__toggle--on' : '',
            ].join(' ')}
            onClick={() => setDisabled((d) => !d)}
          >
            <span className='FloatingButtonConfig__toggleThumb' />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Plugin ----

export default function FloatingButtonConfigPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [activeNodeKey, setActiveNodeKey] = useState<NodeKey | null>(null);

  const closePanel = useCallback(() => setActiveNodeKey(null), []);

  // Open panel when the ⚙ control button dispatches the command
  useEffect(() => {
    return editor.registerCommand(
      OPEN_BUTTON_CONFIG_COMMAND,
      (nodeKey) => {
        setActiveNodeKey((current) => (current === nodeKey ? null : nodeKey));
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!activeNodeKey) return null;

  return createPortal(
    <FloatingConfigPanel
      nodeKey={activeNodeKey}
      anchorElem={anchorElem}
      onClose={closePanel}
    />,
    anchorElem,
  );
}
