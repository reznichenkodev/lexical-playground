import type { JSX } from 'react';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  LexicalEditor,
  LexicalNode,
  LexicalCommand,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import {
  $applyNodeReplacement,
  $getNodeByKey,
  createCommand,
  createEditor,
  DecoratorNode,
} from 'lexical';
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from 'react';
import s from './style.module.css';

// ---- Types ----

export interface TableCellData {
  id: string;
  /** Serialized Lexical EditorState (JSON string). null = empty cell. */
  editorState: string | null;
  colspan: number;
}

export interface CustomTablePayload {
  headers: string[];
  rows: TableCellData[][];
  key?: NodeKey;
}

export interface TableConfigCommandPayload {
  nodeKey: NodeKey;
  selectedCells: { rowIndex: number; cellIndex: number }[];
}

export type SerializedCustomTableNode = Spread<
  {
    headers: string[];
    rows: TableCellData[][];
  },
  SerializedLexicalNode
>;

// ---- Helpers ----

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Creates a blank table payload with stable cell IDs */
export function createEmptyTable(cols: number, rows: number): CustomTablePayload {
  const headers = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`);
  const tableRows = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      id: generateId(),
      editorState: null,
      colspan: 1,
    })),
  );
  return { headers, rows: tableRows };
}

/** Extracts plain text from a serialized EditorState JSON string */
export function extractTextFromState(json: string | null): string {
  if (!json) return '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (node: any): string => {
      if (typeof node?.text === 'string') return node.text;
      if (Array.isArray(node?.children)) return node.children.map(walk).join('');
      return '';
    };
    return walk(JSON.parse(json)?.root ?? {});
  } catch {
    return '';
  }
}

/**
 * Wraps plain text in a minimal serialized Lexical paragraph so that
 * pasted cell content is restored into the nested editor correctly.
 */
function createTextEditorState(text: string): string {
  return JSON.stringify({
    root: {
      children: [
        {
          children: text
            ? [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }]
            : [],
          direction: text ? 'ltr' : null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: text ? 'ltr' : null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });
}

/**
 * Converts a pasted / imported `<table>` DOM element into a CustomTableNode.
 *
 * Parsing rules:
 * - Headers come from `<thead> > <tr> > <th>` (or the first `<tr>` if no thead).
 * - Body rows come from `<tbody> > <tr> > <td>`.
 * - `colspan` attributes are preserved.
 * - Each cell's text content is stored as a minimal Lexical paragraph so the
 *   nested editor can restore it correctly.
 */
function $convertTableElement(element: HTMLElement): DOMConversionOutput {
  const headers: string[] = [];
  const rows: TableCellData[][] = [];

  // --- Headers ---
  const thead = element.querySelector('thead');
  if (thead) {
    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      headerRow.querySelectorAll('th').forEach((th) => {
        headers.push(th.textContent?.trim() ?? '');
      });
    }
  }

  // Fallback: first <tr> whose cells are all <th>
  if (headers.length === 0) {
    const firstRow = element.querySelector('tr');
    if (firstRow) {
      const ths = firstRow.querySelectorAll('th');
      if (ths.length > 0) {
        ths.forEach((th) => headers.push(th.textContent?.trim() ?? ''));
      }
    }
  }

  // --- Body rows ---
  const tbody = element.querySelector('tbody') ?? element;
  let skippedFirstRow = false;

  tbody.querySelectorAll('tr').forEach((tr) => {
    // When tbody === element the first <tr> may be the header row we already read
    if (tbody === element && !skippedFirstRow && headers.length > 0) {
      skippedFirstRow = true;
      return;
    }

    const row: TableCellData[] = [];
    tr.querySelectorAll('td').forEach((td) => {
      const colspan = Math.max(1, parseInt(td.getAttribute('colspan') ?? '1', 10));
      const text = td.textContent?.trim() ?? '';
      row.push({
        id: generateId(),
        editorState: text ? createTextEditorState(text) : null,
        colspan,
      });
    });

    if (row.length > 0) rows.push(row);
  });

  // If no headers were found, generate them from the column count
  if (headers.length === 0) {
    const colCount =
      rows.length > 0
        ? Math.max(...rows.map((r) => r.reduce((s, c) => s + c.colspan, 0)))
        : 0;
    for (let i = 0; i < colCount; i++) headers.push(`Header ${i + 1}`);
  }

  return { node: $createCustomTableNode({ headers, rows }) };
}

// ---- Commands ----

export const OPEN_TABLE_CONFIG_COMMAND: LexicalCommand<TableConfigCommandPayload> =
  createCommand('OPEN_TABLE_CONFIG_COMMAND');

export const INSERT_CUSTOM_TABLE_COMMAND: LexicalCommand<CustomTablePayload> =
  createCommand('INSERT_CUSTOM_TABLE_COMMAND');

// ---- Node ----

export class CustomTableNode extends DecoratorNode<JSX.Element> {
  __headers: string[];
  __rows: TableCellData[][];

  static getType(): string {
    return 'custom-table';
  }

  static clone(node: CustomTableNode): CustomTableNode {
    return new CustomTableNode(
      [...node.__headers],
      node.__rows.map((row) => row.map((c) => ({ ...c }))),
      node.__key,
    );
  }

  constructor(headers: string[], rows: TableCellData[][], key?: NodeKey) {
    super(key);
    this.__headers = headers;
    this.__rows = rows;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      table: () => ({
        conversion: $convertTableElement,
        // Priority 2 overrides @lexical/table's default handler (priority 1)
        priority: 2,
      }),
    };
  }

  static importJSON(serialized: SerializedCustomTableNode): CustomTableNode {
    return $createCustomTableNode({
      headers: serialized.headers,
      rows: serialized.rows,
    });
  }

  exportJSON(): SerializedCustomTableNode {
    return {
      type: 'custom-table',
      version: 1,
      headers: this.__headers,
      rows: this.__rows,
    };
  }

  getHeaders(): string[] {
    return this.__headers;
  }
  getRows(): TableCellData[][] {
    return this.__rows;
  }
  setHeaders(h: string[]): void {
    this.getWritable().__headers = h;
  }
  setRows(r: TableCellData[][]): void {
    this.getWritable().__rows = r;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = s['CustomTable__root'];
    return div;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  exportDOM(): { element: HTMLElement } {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-custom-table', 'true');

    // --- Standard HTML table ---
    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    this.__headers.forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.__rows.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = extractTextFromState(cell.editorState);
        if (cell.colspan > 1) td.setAttribute('colspan', String(cell.colspan));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);

    // --- m-table markup ---
    const mTable = document.createElement('m-table');
    this.__rows.forEach((row) => {
      const block = document.createElement('highlight-block');
      block.setAttribute('highlight', 'gray');

      let colIdx = 0;
      row.forEach((cell) => {
        const mCell = document.createElement('m-table-cell');

        const secondary = document.createElement('m-table-secondary');
        secondary.textContent = this.__headers[colIdx] ?? '';

        const primary = document.createElement('m-table-primary');
        primary.textContent = extractTextFromState(cell.editorState);

        mCell.appendChild(secondary);
        mCell.appendChild(primary);
        block.appendChild(mCell);

        colIdx += cell.colspan;
      });

      mTable.appendChild(block);
    });
    wrapper.appendChild(mTable);

    return { element: wrapper };
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <Suspense fallback={null}>
        <CustomTableDecorator
          nodeKey={this.__key}
          headers={this.__headers}
          rows={this.__rows}
          parentEditor={editor}
        />
      </Suspense>
    );
  }
}

// ---- Cell state initializer (runs inside nested composer context) ----
//
// Placed BEFORE OnChangePlugin in the JSX tree so its useEffect runs first,
// before OnChangePlugin registers its listener. This prevents the initial
// state load from triggering a spurious parent-node update.

function CellStateInitializer({ json }: { json: string | null }): null {
  const [editor] = useLexicalComposerContext();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current || !json) return;
    didRun.current = true;
    // LexicalNestedComposer copies parent nodes in useLayoutEffect which
    // runs before any useEffect, so custom nodes are already registered here.
    try {
      const state = editor.parseEditorState(json);
      if (!state.isEmpty()) editor.setEditorState(state);
    } catch {
      // Silently ignore malformed saved state
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ---- Nested cell editor ----
//
// Each body cell is an independent LexicalEditor (LexicalNestedComposer).
// It inherits all registered node types from the parent editor automatically
// (LexicalNestedComposer copies _nodes in its useLayoutEffect).
//
// Content is synced back to the parent CustomTableNode by stable cell ID.

interface TableCellEditorProps {
  cellId: string;
  initialState: string | null;
  parentEditor: LexicalEditor;
  parentNodeKey: NodeKey;
}

const TableCellEditor = memo(function TableCellEditor({
  cellId,
  initialState,
  parentEditor,
  parentNodeKey,
}: TableCellEditorProps): JSX.Element {
  // Create the nested editor once; nodes are copied from parent by
  // LexicalNestedComposer's useLayoutEffect at mount time.
  const [nestedEditor] = useState(() =>
    createEditor({ namespace: `tcell-${cellId}`, onError: console.error }),
  );

  // Track the last value we wrote to the parent to break re-entry loops
  const lastSyncedRef = useRef<string | null>(null);

  return (
    <LexicalNestedComposer initialEditor={nestedEditor}>
      {/* Must appear BEFORE OnChangePlugin so its useEffect fires first */}
      <CellStateInitializer json={initialState} />

      <RichTextPlugin
        contentEditable={
          <ContentEditable className={s['CustomTable__cellEditable']} />
        }
        ErrorBoundary={LexicalErrorBoundary}
        placeholder={null}
      />

      {/* Per-cell undo / redo (Ctrl+Z works inside cells) */}
      <HistoryPlugin />

      {/* Sync cell content to parent node whenever it changes */}
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) => {
          const json = JSON.stringify(editorState.toJSON());
          if (json === lastSyncedRef.current) return;
          lastSyncedRef.current = json;

          // Find cell by stable ID in case structural operations shifted indices
          parentEditor.update(() => {
            const node = $getNodeByKey(parentNodeKey);
            if (!$isCustomTableNode(node)) return;
            const rows = node.getRows().map((r) => r.map((c) => ({ ...c })));
            for (const row of rows) {
              const cell = row.find((c) => c.id === cellId);
              if (cell) {
                cell.editorState = json;
                node.setRows(rows);
                return;
              }
            }
          });
        }}
      />
    </LexicalNestedComposer>
  );
});

// ---- Decorator wrapper ----

function CustomTableDecorator({
  nodeKey,
  headers,
  rows,
  parentEditor,
}: {
  nodeKey: NodeKey;
  headers: string[];
  rows: TableCellData[][];
  parentEditor: LexicalEditor;
}): JSX.Element {
  // Headers are plain-text inputs (th labels rarely need rich content)
  const [localHeaders, setLocalHeaders] = useState<string[]>(() => [...headers]);

  // Re-sync header values when column count changes
  useEffect(() => {
    setLocalHeaders([...headers]);
  }, [headers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selected cells for merge / split (Ctrl/Cmd + click to toggle)
  const [selectedCells, setSelectedCells] = useState<
    { rowIndex: number; cellIndex: number }[]
  >([]);

  const handleHeaderChange = (ci: number, value: string) => {
    setLocalHeaders((prev) => {
      const next = [...prev];
      next[ci] = value;
      return next;
    });
  };

  const handleHeaderBlur = useCallback(
    (ci: number, value: string) => {
      parentEditor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isCustomTableNode(node)) return;
        const next = [...node.getHeaders()];
        next[ci] = value;
        node.setHeaders(next);
      });
    },
    [parentEditor, nodeKey],
  );

  const handleConfigClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      parentEditor.dispatchCommand(OPEN_TABLE_CONFIG_COMMAND, {
        nodeKey,
        selectedCells,
      });
    },
    [parentEditor, nodeKey, selectedCells],
  );

  return (
    <div className={s['CustomTable__container']}>
      <div className={s['CustomTable__tableWrapper']}>
        <table className={s['CustomTable__table']}>
          <thead>
            <tr>
              {localHeaders.map((h, ci) => (
                <th key={ci} className={s['CustomTable__th']}>
                  <input
                    className={s['CustomTable__cellInput']}
                    value={h}
                    placeholder={`Header ${ci + 1}`}
                    onChange={(e) => handleHeaderChange(ci, e.target.value)}
                    onBlur={(e) => handleHeaderBlur(ci, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const isSel = selectedCells.some(
                    (sc) => sc.rowIndex === ri && sc.cellIndex === ci,
                  );
                  return (
                    <td
                      key={cell.id}
                      colSpan={cell.colspan}
                      className={[
                        s['CustomTable__td'],
                        isSel ? s['CustomTable__td--selected'] : '',
                      ].join(' ')}
                      // Ctrl/Cmd + click → toggle cell selection for merge/split
                      // Plain click passes through to the nested editor
                      onClickCapture={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedCells((prev) => {
                            const exists = prev.some(
                              (sc) => sc.rowIndex === ri && sc.cellIndex === ci,
                            );
                            if (exists)
                              return prev.filter(
                                (sc) =>
                                  !(sc.rowIndex === ri && sc.cellIndex === ci),
                              );
                            return [...prev, { rowIndex: ri, cellIndex: ci }];
                          });
                        }
                      }}
                    >
                      <TableCellEditor
                        cellId={cell.id}
                        initialState={cell.editorState}
                        parentEditor={parentEditor}
                        parentNodeKey={nodeKey}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type='button'
        className={s['CustomTable__configBtn']}
        title='Configure table'
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleConfigClick}
        aria-label='Configure table'
      >
        ⚙
      </button>

      {selectedCells.length > 0 && (
        <div className={s['CustomTable__selectionHint']}>
          {selectedCells.length === 1
            ? '1 cell selected'
            : `${selectedCells.length} cells selected`}{' '}
          · Ctrl+click to add/remove
        </div>
      )}
    </div>
  );
}

// ---- Public helpers ----

export function $createCustomTableNode({
  headers,
  rows,
  key,
}: CustomTablePayload): CustomTableNode {
  return $applyNodeReplacement(new CustomTableNode(headers, rows, key));
}

export function $isCustomTableNode(
  node: LexicalNode | null | undefined,
): node is CustomTableNode {
  return node instanceof CustomTableNode;
}
