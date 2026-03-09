import type { JSX } from 'react';
import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { DecoratorNode } from 'lexical';
import * as React from 'react';

export interface ImagePayload {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number | undefined;
  __height: number | undefined;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__alt,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  constructor(
    src: string,
    alt = '',
    width?: number,
    height?: number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, alt, width, height } = serializedNode;
    return $createImageNode({ src, alt, width, height });
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
    };
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'ImageNode__wrapper';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <img
        className='ImageNode__img'
        src={this.__src}
        alt={this.__alt}
        style={{
          width: this.__width ? `${this.__width}px` : undefined,
          height: this.__height ? `${this.__height}px` : undefined,
        }}
        draggable={false}
      />
    );
  }
}

export function $createImageNode({
  src,
  alt = '',
  width,
  height,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(src, alt, width, height, key);
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
