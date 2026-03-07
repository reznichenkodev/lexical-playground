import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  LexicalCommand,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type { JSX } from 'react';

import { $applyNodeReplacement, createCommand, DecoratorNode } from 'lexical';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import * as React from 'react';
import { Suspense } from 'react';

import './ButtonNode.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Command to open the floating config panel for a ButtonNode
export const OPEN_BUTTON_CONFIG_COMMAND: LexicalCommand<NodeKey> =
  createCommand('OPEN_BUTTON_CONFIG_COMMAND');

export interface ButtonNodePayload {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  disabled?: boolean;
  key?: NodeKey;
}

export type SerializedButtonNode = Spread<
  {
    label: string;
    variant: ButtonVariant;
    size: ButtonSize;
    href: string;
    disabled: boolean;
  },
  SerializedLexicalNode
>;

// ---- React Component ----

interface ButtonComponentProps {
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  href: string;
  disabled: boolean;
  isSelected: boolean;
}

function ButtonComponent({
  label,
  variant,
  size,
  href,
  disabled,
  isSelected,
}: ButtonComponentProps): JSX.Element {
  const classes = [
    'ButtonNode__button',
    `ButtonNode__button--${variant}`,
    `ButtonNode__button--${size}`,
    isSelected ? 'ButtonNode__button--selected' : '',
    disabled ? 'ButtonNode__button--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={classes}
        target='_blank'
        rel='noreferrer'
        data-lexical-button='true'
      >
        {label}
      </a>
    );
  }

  return (
    <button
      type='button'
      className={classes}
      disabled={disabled}
      data-lexical-button='true'
    >
      {label}
    </button>
  );
}

// ---- ButtonNode ----

export class ButtonNode extends DecoratorNode<JSX.Element> {
  __label: string;
  __variant: ButtonVariant;
  __size: ButtonSize;
  __href: string;
  __disabled: boolean;

  static getType(): string {
    return 'button';
  }

  static clone(node: ButtonNode): ButtonNode {
    return new ButtonNode(
      node.__label,
      node.__variant,
      node.__size,
      node.__href,
      node.__disabled,
      node.__key,
    );
  }

  static importJSON(serialized: SerializedButtonNode): ButtonNode {
    const { label, variant, size, href, disabled } = serialized;
    return $createButtonNode({ label, variant, size, href, disabled });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      button: (_node: Node) => ({
        conversion: $convertButtonElement,
        priority: 1,
      }),
    };
  }

  constructor(
    label: string,
    variant: ButtonVariant = 'primary',
    size: ButtonSize = 'md',
    href: string = '',
    disabled: boolean = false,
    key?: NodeKey,
  ) {
    super(key);
    this.__label = label;
    this.__variant = variant;
    this.__size = size;
    this.__href = href;
    this.__disabled = disabled;
  }

  exportJSON(): SerializedButtonNode {
    return {
      label: this.__label,
      variant: this.__variant,
      size: this.__size,
      href: this.__href,
      disabled: this.__disabled,
      type: 'button',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('button');
    element.setAttribute('data-lexical-button', 'true');
    element.setAttribute('data-variant', this.__variant);
    element.setAttribute('data-size', this.__size);
    if (this.__href) element.setAttribute('data-href', this.__href);
    if (this.__disabled) element.setAttribute('disabled', 'true');
    element.textContent = this.__label;
    return { element };
  }

  // Getters
  getLabel(): string {
    return this.__label;
  }
  getVariant(): ButtonVariant {
    return this.__variant;
  }
  getSize(): ButtonSize {
    return this.__size;
  }
  getHref(): string {
    return this.__href;
  }
  getDisabled(): boolean {
    return this.__disabled;
  }

  // Setters (always use writable node)
  setLabel(label: string): void {
    const writable = this.getWritable();
    writable.__label = label;
  }
  setVariant(variant: ButtonVariant): void {
    const writable = this.getWritable();
    writable.__variant = variant;
  }
  setSize(size: ButtonSize): void {
    const writable = this.getWritable();
    writable.__size = size;
  }
  setHref(href: string): void {
    const writable = this.getWritable();
    writable.__href = href;
  }
  setDisabled(disabled: boolean): void {
    const writable = this.getWritable();
    writable.__disabled = disabled;
  }

  // DecoratorNode required methods
  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = 'ButtonNode__wrapper';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ButtonNodeDecorator
          nodeKey={this.__key}
          label={this.__label}
          variant={this.__variant}
          size={this.__size}
          href={this.__href}
          disabled={this.__disabled}
          editor={editor}
        />
      </Suspense>
    );
  }
}

// ---- Decorator wrapper ----

function ButtonNodeDecorator({
  nodeKey,
  label,
  variant,
  size,
  href,
  disabled,
  editor,
}: {
  nodeKey: NodeKey;
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  href: string;
  disabled: boolean;
  editor: LexicalEditor;
}): JSX.Element {
  const [isSelected] = useLexicalNodeSelection(nodeKey);

  const handleConfigClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      editor.dispatchCommand(OPEN_BUTTON_CONFIG_COMMAND, nodeKey);
    },
    [editor, nodeKey],
  );

  return (
    <>
      <ButtonComponent
        label={label}
        variant={variant}
        size={size}
        href={href}
        disabled={disabled}
        isSelected={isSelected}
      />
      <button
        type='button'
        className='ButtonNode__configBtn'
        title='Configure button'
        // Prevent editor blur when clicking the control
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleConfigClick}
        contentEditable={false}
        aria-label='Configure button'
      >
        ⚙
      </button>
    </>
  );
}

// ---- Helpers ----

export function $createButtonNode(payload: ButtonNodePayload): ButtonNode {
  return $applyNodeReplacement(
    new ButtonNode(
      payload.label,
      payload.variant ?? 'primary',
      payload.size ?? 'md',
      payload.href ?? '',
      payload.disabled ?? false,
      payload.key,
    ),
  );
}

export function $isButtonNode(
  node: LexicalNode | null | undefined,
): node is ButtonNode {
  return node instanceof ButtonNode;
}

function $convertButtonElement(element: HTMLElement): DOMConversionOutput {
  const label = element.textContent ?? 'Button';
  const variant =
    (element.getAttribute('data-variant') as ButtonVariant) ?? 'primary';
  const size = (element.getAttribute('data-size') as ButtonSize) ?? 'md';
  const href = element.getAttribute('data-href') ?? '';
  const disabled = element.hasAttribute('disabled');
  return { node: $createButtonNode({ label, variant, size, href, disabled }) };
}
