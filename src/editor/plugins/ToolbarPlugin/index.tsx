import type { JSX } from 'react';

import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as React from 'react';

import { $createButtonNode } from '../../nodes/ButtonNode/ButtonNode';
import {
  $createCollapsibleContainerNode,
  $createCollapsibleContentNode,
  $createCollapsibleTitleNode,
} from '../../nodes/CollapsibleNode';
import { ImagePayload } from '../../nodes/ImageNode';
import { INSERT_IMAGE_COMMAND } from '../ImagePlugin';
import './index.css';

const TABLE_GRID_MAX = 8;

type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'code';

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  bullet: 'Bullet List',
  number: 'Numbered List',
  quote: 'Quote',
  code: 'Code',
};

function Divider(): JSX.Element {
  return <div className='Toolbar__divider' />;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type='button'
      title={title}
      disabled={disabled}
      className={['Toolbar__btn', active ? 'Toolbar__btn--active' : ''].join(
        ' ',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TableSizePicker({
  onSelect,
}: {
  onSelect: (rows: number, cols: number) => void;
}): JSX.Element {
  const [hovered, setHovered] = useState({ row: 0, col: 0 });
  return (
    <div className='Toolbar__tablePicker'>
      <div
        className='Toolbar__tableGrid'
        onMouseLeave={() => setHovered({ row: 0, col: 0 })}
      >
        {Array.from({ length: TABLE_GRID_MAX }, (_, r) =>
          Array.from({ length: TABLE_GRID_MAX }, (_, c) => (
            <div
              key={`${r}-${c}`}
              className={[
                'Toolbar__tableGridCell',
                r <= hovered.row && c <= hovered.col
                  ? 'Toolbar__tableGridCell--selected'
                  : '',
              ].join(' ')}
              onMouseEnter={() => setHovered({ row: r, col: c })}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(r + 1, c + 1);
              }}
            />
          )),
        )}
      </div>
      <div className='Toolbar__tableGridLabel'>
        {hovered.row + 1} × {hovered.col + 1}
      </div>
    </div>
  );
}

function ImageInsertPopover({
  onInsert,
}: {
  onInsert: (payload: ImagePayload) => void;
}): JSX.Element {
  const [url, setUrl] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleInsertUrl = () => {
    const trimmed = url.trim();
    if (trimmed) onInsert({ src: trimmed, alt: '' });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onInsert({ src: reader.result as string, alt: file.name });
    reader.readAsDataURL(file);
  };

  return (
    <div className='Toolbar__imagePopover'>
      <input
        type='url'
        className='Toolbar__imageInput'
        placeholder='https://...'
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleInsertUrl(); }}
        autoFocus
      />
      <button
        type='button'
        className='Toolbar__imageInsertBtn'
        onMouseDown={(e) => { e.preventDefault(); handleInsertUrl(); }}
      >
        Insert URL
      </button>
      <div className='Toolbar__imageOr'>or</div>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        type='button'
        className='Toolbar__imageInsertBtn'
        onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
      >
        Upload file
      </button>
    </div>
  );
}

export default function ToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tablePickerRef = useRef<HTMLDivElement>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const imagePickerRef = useRef<HTMLDivElement>(null);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Link
      const node = selection.anchor.getNode();
      const linkParent = $findMatchingParent(node, $isLinkNode);
      setIsLink(linkParent !== null);

      // Block type
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });
      if (element === null) element = anchorNode.getTopLevelElementOrThrow();

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $findMatchingParent(anchorNode, (n) =>
            $isListNode(n),
          );
          const type = parentList
            ? (parentList as ListNode).getListType()
            : (element as ListNode).getListType();
          setBlockType(type === 'bullet' ? 'bullet' : 'number');
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in BLOCK_TYPE_LABELS) {
            setBlockType(type as BlockType);
          } else {
            setBlockType('paragraph');
          }
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor, $updateToolbar]);

  const formatBlock = (type: BlockType) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === 'bullet') {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        return;
      }
      if (type === 'number') {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        return;
      }
      if (type === 'paragraph') {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }
      if (type === 'quote') {
        $setBlocksType(selection, () => $createQuoteNode());
        return;
      }
      if (type === 'h1' || type === 'h2' || type === 'h3' || type === 'h4') {
        $setBlocksType(selection, () => $createHeadingNode(type));
        return;
      }
    });
  };

  // Close table picker on outside click
  useEffect(() => {
    if (!showTablePicker) return;
    const handler = (e: MouseEvent) => {
      if (
        tablePickerRef.current &&
        !tablePickerRef.current.contains(e.target as Node)
      ) {
        setShowTablePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTablePicker]);

  // Close image picker on outside click
  useEffect(() => {
    if (!showImagePicker) return;
    const handler = (e: MouseEvent) => {
      if (
        imagePickerRef.current &&
        !imagePickerRef.current.contains(e.target as Node)
      ) {
        setShowImagePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showImagePicker]);

  const insertTable = (rows: number, cols: number) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: String(rows),
      columns: String(cols),
    });
    setShowTablePicker(false);
  };

  const insertImage = (payload: ImagePayload) => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    setShowImagePicker(false);
  };

  const insertCollapsible = () => {
    editor.update(() => {
      const container = $createCollapsibleContainerNode(true);
      const title = $createCollapsibleTitleNode();
      title.append($createTextNode(''));
      const content = $createCollapsibleContentNode();
      content.append($createParagraphNode());
      container.append(title, content);
      $insertNodeToNearestRoot(container);
      title.selectEnd();
    });
  };

  const insertButton = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const buttonNode = $createButtonNode({ label: 'Click me' });
        selection.insertNodes([buttonNode]);
      }
    });
  };

  const insertLink = () => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  return (
    <div ref={toolbarRef} className='Toolbar'>
      {/* Undo / Redo */}
      <ToolbarButton
        disabled={!canUndo}
        title='Undo (Ctrl+Z)'
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        ↩
      </ToolbarButton>
      <ToolbarButton
        disabled={!canRedo}
        title='Redo (Ctrl+Y)'
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        ↪
      </ToolbarButton>

      <Divider />

      {/* Block type selector */}
      <select
        className='Toolbar__select'
        value={blockType}
        onChange={(e) => formatBlock(e.target.value as BlockType)}
        title='Block type'
      >
        {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((type) => (
          <option key={type} value={type}>
            {BLOCK_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      <Divider />

      {/* Text format */}
      <ToolbarButton
        active={isBold}
        title='Bold (Ctrl+B)'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      >
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton
        active={isItalic}
        title='Italic (Ctrl+I)'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        active={isUnderline}
        title='Underline (Ctrl+U)'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
      >
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton
        active={isStrikethrough}
        title='Strikethrough'
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
        }
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        active={isCode}
        title='Inline code'
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
      >
        {'</>'}
      </ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton active={isLink} title='Insert link' onClick={insertLink}>
        🔗
      </ToolbarButton>

      {/* HR */}
      <ToolbarButton
        title='Insert divider'
        onClick={() =>
          editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
        }
      >
        ―
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        title='Align left'
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
      >
        ⇤
      </ToolbarButton>
      <ToolbarButton
        title='Align center'
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
      >
        ≡
      </ToolbarButton>
      <ToolbarButton
        title='Align right'
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
      >
        ⇥
      </ToolbarButton>

      <Divider />

      {/* Insert Table */}
      <div className='Toolbar__tablePickerWrapper' ref={tablePickerRef}>
        <button
          type='button'
          className='Toolbar__insertBtn'
          title='Insert Table'
          onClick={() => setShowTablePicker((v) => !v)}
        >
          + Table
        </button>
        {showTablePicker && <TableSizePicker onSelect={insertTable} />}
      </div>

      {/* Insert Collapsible */}
      <button
        type='button'
        className='Toolbar__insertBtn'
        title='Insert Collapsible'
        onClick={insertCollapsible}
      >
        + Collapsible
      </button>

      {/* Insert Image */}
      <div className='Toolbar__imagePickerWrapper' ref={imagePickerRef}>
        <button
          type='button'
          className='Toolbar__insertBtn'
          title='Insert Image'
          onClick={() => setShowImagePicker((v) => !v)}
        >
          + Image
        </button>
        {showImagePicker && <ImageInsertPopover onInsert={insertImage} />}
      </div>

      {/* Insert Button Node */}
      <button
        type='button'
        className='Toolbar__insertBtn'
        title='Insert Button'
        onClick={insertButton}
      >
        + Button
      </button>
    </div>
  );
}
