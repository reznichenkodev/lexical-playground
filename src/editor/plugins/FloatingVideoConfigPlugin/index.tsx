import type { JSX } from 'react';
import type { VideoPreset } from '../../nodes/VideoNode';

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

import { $isVideoNode, OPEN_VIDEO_CONFIG_COMMAND } from '../../nodes/VideoNode';
import s from './style.module.css';

const PRESETS: VideoPreset[] = ['desktop', 'mobile'];

interface FloatingVideoConfigPanelProps {
  nodeKey: NodeKey;
  anchorElem: HTMLElement;
  onClose: () => void;
}

function FloatingVideoConfigPanel({
  nodeKey,
  anchorElem,
  onClose,
}: FloatingVideoConfigPanelProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);

  const [src, setSrc] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [preset, setPreset] = useState<VideoPreset>('desktop');
  const [controls, setControls] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);

  const hasInitialized = useRef(false);

  // Load current values from node
  useEffect(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isVideoNode(node)) {
        setSrc(node.getSrc());
        setWidth(node.getWidth() != null ? String(node.getWidth()) : '');
        setHeight(node.getHeight() != null ? String(node.getHeight()) : '');
        setPreset(node.getPreset());
        setControls(node.getControls());
        setAutoplay(node.getAutoplay());
        setLoop(node.getLoop());
        setMuted(node.getMuted());
      }
    });
    return () => {
      hasInitialized.current = false;
    };
  }, [editor, nodeKey]);

  // Position the panel near the video node
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
      if ($isVideoNode(node)) {
        if (node.getSrc() !== src) node.setSrc(src);
        const numWidth = width !== '' ? Number(width) : undefined;
        const numHeight = height !== '' ? Number(height) : undefined;
        if (node.getWidth() !== numWidth) node.setWidth(numWidth);
        if (node.getHeight() !== numHeight) node.setHeight(numHeight);
        if (node.getPreset() !== preset) node.setPreset(preset);
        if (node.getControls() !== controls) node.setControls(controls);
        if (node.getAutoplay() !== autoplay) node.setAutoplay(autoplay);
        if (node.getLoop() !== loop) node.setLoop(loop);
        if (node.getMuted() !== muted) node.setMuted(muted);
      }
    });
  }, [editor, nodeKey, src, width, height, preset, controls, autoplay, loop, muted]);

  // Auto-apply toggles immediately
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    applyChanges();
  }, [preset, controls, autoplay, loop, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={panelRef}
      className={s['FloatingVideoConfig__panel']}
      role='dialog'
      aria-label='Video configuration'
    >
      <div className={s['FloatingVideoConfig__header']}>
        <span className={s['FloatingVideoConfig__title']}>Configure Video</span>
        <button
          type='button'
          className={s['FloatingVideoConfig__close']}
          onClick={onClose}
          aria-label='Close'
        >
          &times;
        </button>
      </div>

      <div className={s['FloatingVideoConfig__body']}>
        {/* Preset */}
        <div className={s['FloatingVideoConfig__field']}>
          <label className={s['FloatingVideoConfig__label']}>Preset</label>
          <div className={s['FloatingVideoConfig__presetGroup']}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type='button'
                className={[
                  s['FloatingVideoConfig__presetBtn'],
                  preset === p ? s['FloatingVideoConfig__presetBtn--active'] : '',
                ].join(' ')}
                onClick={() => setPreset(p)}
              >
                {p === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
              </button>
            ))}
          </div>
        </div>

        {/* Src */}
        <div className={s['FloatingVideoConfig__field']}>
          <label className={s['FloatingVideoConfig__label']}>Source URL</label>
          <input
            type='text'
            className={s['FloatingVideoConfig__input']}
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            onBlur={applyChanges}
            placeholder='https://...'
          />
        </div>

        {/* Width & Height */}
        <div className={s['FloatingVideoConfig__row']}>
          <div className={s['FloatingVideoConfig__field']}>
            <label className={s['FloatingVideoConfig__label']}>Width (px)</label>
            <input
              type='number'
              className={s['FloatingVideoConfig__input']}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              onBlur={applyChanges}
              placeholder='auto'
              min={0}
            />
          </div>
          <div className={s['FloatingVideoConfig__field']}>
            <label className={s['FloatingVideoConfig__label']}>Height (px)</label>
            <input
              type='number'
              className={s['FloatingVideoConfig__input']}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={applyChanges}
              placeholder='auto'
              min={0}
            />
          </div>
        </div>

        {/* Playback toggles */}
        <div className={s['FloatingVideoConfig__field']}>
          <label className={s['FloatingVideoConfig__label']}>Playback</label>
          <div className={s['FloatingVideoConfig__toggleGroup']}>
            {(
              [
                { key: 'controls', label: 'Controls', value: controls, set: setControls },
                { key: 'autoplay', label: 'Autoplay', value: autoplay, set: setAutoplay },
                { key: 'loop', label: 'Loop', value: loop, set: setLoop },
                { key: 'muted', label: 'Muted', value: muted, set: setMuted },
              ] as const
            ).map(({ key, label, value, set }) => (
              <button
                key={key}
                type='button'
                className={[
                  s['FloatingVideoConfig__toggleBtn'],
                  value ? s['FloatingVideoConfig__toggleBtn--active'] : '',
                ].join(' ')}
                onClick={() => set(!value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Plugin ----

export default function FloatingVideoConfigPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [activeNodeKey, setActiveNodeKey] = useState<NodeKey | null>(null);

  const closePanel = useCallback(() => setActiveNodeKey(null), []);

  useEffect(() => {
    return editor.registerCommand(
      OPEN_VIDEO_CONFIG_COMMAND,
      (nodeKey) => {
        setActiveNodeKey((current) => (current === nodeKey ? null : nodeKey));
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!activeNodeKey) return null;

  return createPortal(
    <FloatingVideoConfigPanel
      nodeKey={activeNodeKey}
      anchorElem={anchorElem}
      onClose={closePanel}
    />,
    anchorElem,
  );
}
