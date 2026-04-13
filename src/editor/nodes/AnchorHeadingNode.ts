import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  Spread,
} from 'lexical';
import {
  HeadingNode,
  type HeadingTagType,
  type SerializedHeadingNode,
} from '@lexical/rich-text';

export type SerializedAnchorHeadingNode = Spread<
  { anchorId: string },
  SerializedHeadingNode
>;

const HEADING_TAGS: HeadingTagType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * Drop-in replacement for HeadingNode that adds an optional anchor ID.
 * Registered directly in PlaygroundNodes (no `replace` wrapper needed).
 * Uses the same Lexical type ('heading') so existing JSON loads without migration.
 */
export class AnchorHeadingNode extends HeadingNode {
  __anchorId: string;

  static getType(): string {
    return 'heading';
  }

  static clone(node: AnchorHeadingNode): AnchorHeadingNode {
    return new AnchorHeadingNode(node.getTag(), node.__anchorId, node.__key);
  }

  constructor(tag: HeadingTagType, anchorId = '', key?: NodeKey) {
    super(tag, key);
    this.__anchorId = anchorId;
  }

  // Handles both legacy format (no anchorId field) and new format
  static importJSON(
    serialized: SerializedHeadingNode & { anchorId?: string },
  ): AnchorHeadingNode {
    const node = new AnchorHeadingNode(serialized.tag, serialized.anchorId ?? '');
    node.setFormat(serialized.format);
    node.setIndent(serialized.indent);
    node.setDirection(serialized.direction);
    return node;
  }

  // Override importDOM so pasted HTML creates AnchorHeadingNode (not HeadingNode).
  // Also reads existing id="" attributes from pasted content.
  static importDOM(): DOMConversionMap | null {
    const convert =
      (tag: HeadingTagType) =>
      (element: HTMLElement): DOMConversionOutput => ({
        node: $createAnchorHeadingNode(tag, element.id ?? ''),
      });

    return Object.fromEntries(
      HEADING_TAGS.map((tag) => [tag, () => ({ conversion: convert(tag), priority: 0 })]),
    );
  }

  exportJSON(): SerializedAnchorHeadingNode {
    return {
      ...super.exportJSON(),
      anchorId: this.__anchorId,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    this._applyAnchorId(dom, this.__anchorId);
    return dom;
  }

  updateDOM(prevNode: AnchorHeadingNode, dom: HTMLElement): boolean {
    const updated = super.updateDOM(prevNode, dom);
    if (prevNode.__anchorId !== this.__anchorId) {
      this._applyAnchorId(dom, this.__anchorId);
    }
    return updated;
  }

  private _applyAnchorId(dom: HTMLElement, id: string): void {
    if (id) {
      dom.id = id;
      dom.dataset.anchorId = id;
    } else {
      dom.removeAttribute('id');
      delete dom.dataset.anchorId;
    }
  }

  getAnchorId(): string {
    return this.__anchorId;
  }

  setAnchorId(id: string): void {
    this.getWritable().__anchorId = id;
  }
}

export function $isAnchorHeadingNode(
  node: LexicalNode | null | undefined,
): node is AnchorHeadingNode {
  return node instanceof AnchorHeadingNode;
}

// No $applyNodeReplacement — we register AnchorHeadingNode directly in PlaygroundNodes
export function $createAnchorHeadingNode(
  tag: HeadingTagType,
  anchorId = '',
): AnchorHeadingNode {
  return new AnchorHeadingNode(tag, anchorId);
}
