import type {
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import { ElementNode } from 'lexical';

// ===================== CollapsibleContainerNode =====================

type SerializedCollapsibleContainerNode = Spread<
  { open: boolean },
  SerializedElementNode
>;

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  static getType(): string {
    return 'collapsible-container';
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add('Collapsible__container');
    dom.dataset.open = String(this.__open);
    dom.dataset.nodeKey = this.__key;
    return dom;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLElement): boolean {
    if (prevNode.__open !== this.__open) {
      dom.dataset.open = String(this.__open);
    }
    return false;
  }

  static importJSON(
    json: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    return $createCollapsibleContainerNode(json.open);
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
      type: 'collapsible-container',
      version: 1,
    };
  }

  setOpen(open: boolean): void {
    this.getWritable().__open = open;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }
}

export function $createCollapsibleContainerNode(
  open = true,
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(open);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}

// ===================== CollapsibleTitleNode =====================

export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return 'collapsible-title';
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add('Collapsible__title');

    const icon = document.createElement('span');
    icon.classList.add('Collapsible__titleToggle');
    icon.setAttribute('contenteditable', 'false');
    dom.append(icon);

    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(_json: SerializedElementNode): CollapsibleTitleNode {
    return $createCollapsibleTitleNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
      version: 1,
    };
  }
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}

// ===================== CollapsibleContentNode =====================

export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return 'collapsible-content';
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add('Collapsible__content');
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(_json: SerializedElementNode): CollapsibleContentNode {
    return $createCollapsibleContentNode();
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-content',
      version: 1,
    };
  }
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  return new CollapsibleContentNode();
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}
