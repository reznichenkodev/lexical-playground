import type { JSX } from 'react';
import type { ImagePreset } from '../../nodes/ImageNode';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  NodeKey,
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
  $isImageNode,
  OPEN_IMAGE_CONFIG_COMMAND,
} from '../../nodes/ImageNode';
import s from './style.module.css';

const PRESETS: ImagePreset[] = ['desktop', 'mobile'];

interface FloatingImageConfigPanelProps {
  nodeKey: NodeKey;
  anchorElem: HTMLElement;
  onClose: () => void;
}

function FloatingImageConfigPanel({
  nodeKey,
  anchorElem,
  onClose,
}: FloatingImageConfigPanelProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);

  const [src, setSrc] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [preset, setPreset] = useState<ImagePreset>('desktop');

  const hasInitialized = useRef(false);

  // Load current values from node
  useEffect(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        setSrc(node.getSrc());
        setWidth(node.getWidth() != null ? String(node.getWidth()) : '');
        setHeight(node.getHeight() != null ? String(node.getHeight()) : '');
        setPreset(node.getPreset());
      }
    });
    return () => {
      hasInitialized.current = false;
    };
  }, [editor, nodeKey]);

  // Position the panel near the image node
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const nodeDom = editor.getElementByKey(nodeKey);
    if (!nodeDom) return;

    const nodeRect = nodeDom.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    let top = nodeRect.bottom - anchorRect.top + anchorElem.scrollTop + 8;
    let left = nodeRect.left - anchorRect.left + anchorElem.scrollLeft;

    const maxLeft = anchorRect.width - panelRect.width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

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

  const applyChanges = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        if (node.getSrc() !== src) node.setSrc(src);
        const numWidth = width !== '' ? Number(width) : undefined;
        const numHeight = height !== '' ? Number(height) : undefined;
        if (node.getWidth() !== numWidth) node.setWidth(numWidth);
        if (node.getHeight() !== numHeight) node.setHeight(numHeight);
        if (node.getPreset() !== preset) node.setPreset(preset);
      }
    });
  }, [editor, nodeKey, src, width, height, preset]);

  // Auto-apply preset immediately
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    applyChanges();
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={panelRef}
      className={s['FloatingImageConfig__panel']}
      role='dialog'
      aria-label='Image configuration'
    >
      <div className={s['FloatingImageConfig__header']}>
        <span className={s['FloatingImageConfig__title']}>Configure Image</span>
        <button
          type='button'
          className={s['FloatingImageConfig__close']}
          onClick={onClose}
          aria-label='Close'
        >
          &times;
        </button>
      </div>

      <div className={s['FloatingImageConfig__body']}>
        {/* Preset */}
        <div className={s['FloatingImageConfig__field']}>
          <label className={s['FloatingImageConfig__label']}>Preset</label>
          <div className={s['FloatingImageConfig__presetGroup']}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type='button'
                className={[
                  s['FloatingImageConfig__presetBtn'],
                  preset === p ? s['FloatingImageConfig__presetBtn--active'] : '',
                ].join(' ')}
                onClick={() => setPreset(p)}
              >
                {p === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
              </button>
            ))}
          </div>
        </div>

        {/* Src */}
        <div className={s['FloatingImageConfig__field']}>
          <label className={s['FloatingImageConfig__label']}>Source URL</label>
          <input
            type='text'
            className={s['FloatingImageConfig__input']}
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            onBlur={applyChanges}
            placeholder='https://...'
          />
        </div>

        {/* Width & Height */}
        <div className={s['FloatingImageConfig__row']}>
          <div className={s['FloatingImageConfig__field']}>
            <label className={s['FloatingImageConfig__label']}>Width (px)</label>
            <input
              type='number'
              className={s['FloatingImageConfig__input']}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              onBlur={applyChanges}
              placeholder='auto'
              min={0}
            />
          </div>
          <div className={s['FloatingImageConfig__field']}>
            <label className={s['FloatingImageConfig__label']}>Height (px)</label>
            <input
              type='number'
              className={s['FloatingImageConfig__input']}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={applyChanges}
              placeholder='auto'
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Plugin ----

export default function FloatingImageConfigPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [activeNodeKey, setActiveNodeKey] = useState<NodeKey | null>(null);

  const closePanel = useCallback(() => setActiveNodeKey(null), []);

  useEffect(() => {
    return editor.registerCommand(
      OPEN_IMAGE_CONFIG_COMMAND,
      (nodeKey) => {
        setActiveNodeKey((current) => (current === nodeKey ? null : nodeKey));
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!activeNodeKey) return null;

  return createPortal(
    <FloatingImageConfigPanel
      nodeKey={activeNodeKey}
      anchorElem={anchorElem}
      onClose={closePanel}
    />,
    anchorElem,
  );
}
