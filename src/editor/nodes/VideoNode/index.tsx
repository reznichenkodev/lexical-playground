import type { JSX } from 'react';
import type {
  LexicalEditor,
  LexicalNode,
  LexicalCommand,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { $applyNodeReplacement, createCommand, DecoratorNode } from 'lexical';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import * as React from 'react';
import { Suspense } from 'react';
import s from './style.module.css';

export type VideoPreset = 'desktop' | 'mobile';

export const OPEN_VIDEO_CONFIG_COMMAND: LexicalCommand<NodeKey> = createCommand(
  'OPEN_VIDEO_CONFIG_COMMAND',
);

export interface VideoPayload {
  src: string;
  width?: number;
  height?: number;
  preset?: VideoPreset;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  key?: NodeKey;
}

export type SerializedVideoNode = Spread<
  {
    src: string;
    width?: number;
    height?: number;
    preset: VideoPreset;
    controls: boolean;
    autoplay: boolean;
    loop: boolean;
    muted: boolean;
  },
  SerializedLexicalNode
>;

export class VideoNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __width: number | undefined;
  __height: number | undefined;
  __preset: VideoPreset;
  __controls: boolean;
  __autoplay: boolean;
  __loop: boolean;
  __muted: boolean;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(
      node.__src,
      node.__width,
      node.__height,
      node.__preset,
      node.__controls,
      node.__autoplay,
      node.__loop,
      node.__muted,
      node.__key,
    );
  }

  constructor(
    src: string,
    width?: number,
    height?: number,
    preset: VideoPreset = 'desktop',
    controls = true,
    autoplay = false,
    loop = false,
    muted = false,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__width = width;
    this.__height = height;
    this.__preset = preset;
    this.__controls = controls;
    this.__autoplay = autoplay;
    this.__loop = loop;
    this.__muted = muted;
  }

  static importJSON(serializedNode: SerializedVideoNode): VideoNode {
    const { src, width, height, preset, controls, autoplay, loop, muted } =
      serializedNode;
    return $createVideoNode({
      src,
      width,
      height,
      preset,
      controls,
      autoplay,
      loop,
      muted,
    });
  }

  exportJSON(): SerializedVideoNode {
    return {
      type: 'video',
      version: 1,
      src: this.__src,
      width: this.__width,
      height: this.__height,
      preset: this.__preset,
      controls: this.__controls,
      autoplay: this.__autoplay,
      loop: this.__loop,
      muted: this.__muted,
    };
  }

  // Getters
  getSrc(): string {
    return this.__src;
  }
  getWidth(): number | undefined {
    return this.__width;
  }
  getHeight(): number | undefined {
    return this.__height;
  }
  getPreset(): VideoPreset {
    return this.__preset;
  }
  getControls(): boolean {
    return this.__controls;
  }
  getAutoplay(): boolean {
    return this.__autoplay;
  }
  getLoop(): boolean {
    return this.__loop;
  }
  getMuted(): boolean {
    return this.__muted;
  }

  // Setters
  setSrc(src: string): void {
    this.getWritable().__src = src;
  }
  setWidth(width: number | undefined): void {
    this.getWritable().__width = width;
  }
  setHeight(height: number | undefined): void {
    this.getWritable().__height = height;
  }
  setPreset(preset: VideoPreset): void {
    this.getWritable().__preset = preset;
  }
  setControls(controls: boolean): void {
    this.getWritable().__controls = controls;
  }
  setAutoplay(autoplay: boolean): void {
    this.getWritable().__autoplay = autoplay;
  }
  setLoop(loop: boolean): void {
    this.getWritable().__loop = loop;
  }
  setMuted(muted: boolean): void {
    this.getWritable().__muted = muted;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = s['VideoNode__wrapper'];
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <Suspense fallback={null}>
        <VideoNodeDecorator
          nodeKey={this.__key}
          src={this.__src}
          width={this.__width}
          height={this.__height}
          preset={this.__preset}
          controls={this.__controls}
          autoplay={this.__autoplay}
          loop={this.__loop}
          muted={this.__muted}
          editor={editor}
        />
      </Suspense>
    );
  }
}

// ---- Decorator ----

function VideoNodeDecorator({
  nodeKey,
  src,
  width,
  height,
  preset,
  controls,
  autoplay,
  loop,
  muted,
  editor,
}: {
  nodeKey: NodeKey;
  src: string;
  width?: number;
  height?: number;
  preset: VideoPreset;
  controls: boolean;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  editor: LexicalEditor;
}): JSX.Element {
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  const handleConfigClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.dispatchCommand(OPEN_VIDEO_CONFIG_COMMAND, nodeKey);
    },
    [editor, nodeKey],
  );

  const presetStyle: React.CSSProperties =
    preset === 'mobile' ? { maxWidth: '375px' } : { maxWidth: '100%' };

  return (
    <>
      <video
        className={[
          s['VideoNode__video'],
          isSelected ? s['VideoNode__video--selected'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        src={src}
        style={{
          ...presetStyle,
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        muted={muted || autoplay}
        playsInline
        draggable={false}
      />
      <button
        type='button'
        className={s['VideoNode__configBtn']}
        title='Configure video'
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleConfigClick}
        contentEditable={false}
        aria-label='Configure video'
      >
        ⚙
      </button>
    </>
  );
}

// ---- Helpers ----

export function $createVideoNode({
  src,
  width,
  height,
  preset = 'desktop',
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  key,
}: VideoPayload): VideoNode {
  return $applyNodeReplacement(
    new VideoNode(
      src,
      width,
      height,
      preset,
      controls,
      autoplay,
      loop,
      muted,
      key,
    ),
  );
}

export function $isVideoNode(
  node: LexicalNode | null | undefined,
): node is VideoNode {
  return node instanceof VideoNode;
}
