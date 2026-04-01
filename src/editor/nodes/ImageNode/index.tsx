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

export type ImagePreset = 'desktop' | 'mobile';

export const OPEN_IMAGE_CONFIG_COMMAND: LexicalCommand<NodeKey> =
  createCommand('OPEN_IMAGE_CONFIG_COMMAND');

export interface ImagePayload {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  preset?: ImagePreset;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    preset: ImagePreset;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number | undefined;
  __height: number | undefined;
  __preset: ImagePreset;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__alt,
      node.__width,
      node.__height,
      node.__preset,
      node.__key,
    );
  }

  constructor(
    src: string,
    alt = '',
    width?: number,
    height?: number,
    preset: ImagePreset = 'desktop',
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
    this.__preset = preset;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, alt, width, height, preset } = serializedNode;
    return $createImageNode({ src, alt, width, height, preset });
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
      preset: this.__preset,
    };
  }

  // Getters
  getSrc(): string { return this.__src; }
  getAlt(): string { return this.__alt; }
  getWidth(): number | undefined { return this.__width; }
  getHeight(): number | undefined { return this.__height; }
  getPreset(): ImagePreset { return this.__preset; }

  // Setters
  setSrc(src: string): void {
    this.getWritable().__src = src;
  }
  setAlt(alt: string): void {
    this.getWritable().__alt = alt;
  }
  setWidth(width: number | undefined): void {
    this.getWritable().__width = width;
  }
  setHeight(height: number | undefined): void {
    this.getWritable().__height = height;
  }
  setPreset(preset: ImagePreset): void {
    this.getWritable().__preset = preset;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = s['ImageNode__wrapper'];
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ImageNodeDecorator
          nodeKey={this.__key}
          src={this.__src}
          alt={this.__alt}
          width={this.__width}
          height={this.__height}
          preset={this.__preset}
          editor={editor}
        />
      </Suspense>
    );
  }
}

// ---- Decorator ----

function ImageNodeDecorator({
  nodeKey,
  src,
  alt,
  width,
  height,
  preset,
  editor,
}: {
  nodeKey: NodeKey;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  preset: ImagePreset;
  editor: LexicalEditor;
}): JSX.Element {
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  const handleConfigClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.dispatchCommand(OPEN_IMAGE_CONFIG_COMMAND, nodeKey);
    },
    [editor, nodeKey],
  );

  const presetStyle: React.CSSProperties =
    preset === 'mobile' ? { maxWidth: '375px' } : { maxWidth: '100%' };

  return (
    <>
      <img
        className={[
          s['ImageNode__img'],
          isSelected ? s['ImageNode__img--selected'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        src={src}
        alt={alt}
        style={{
          ...presetStyle,
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
        draggable={false}
      />
      <button
        type='button'
        className={s['ImageNode__configBtn']}
        title='Configure image'
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleConfigClick}
        contentEditable={false}
        aria-label='Configure image'
      >
        ⚙
      </button>
    </>
  );
}

// ---- Helpers ----

export function $createImageNode({
  src,
  alt = '',
  width,
  height,
  preset = 'desktop',
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(src, alt, width, height, preset, key),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
