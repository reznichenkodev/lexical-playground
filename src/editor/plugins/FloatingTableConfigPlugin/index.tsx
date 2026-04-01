import type { JSX } from 'react';

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

import type { TableCellData, TableConfigCommandPayload } from '../../nodes/CustomTableNode';
import {
  $isCustomTableNode,
  generateId,
  OPEN_TABLE_CONFIG_COMMAND,
} from '../../nodes/CustomTableNode';
import s from './style.module.css';

interface PanelProps {
  nodeKey: NodeKey;
  initialSelectedCells: { rowIndex: number; cellIndex: number }[];
  anchorElem: HTMLElement;
  onClose: () => void;
}

function FloatingTableConfigPanel({
  nodeKey,
  initialSelectedCells,
  anchorElem,
  onClose,
}: PanelProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);

  // Snapshot of node state for computing merge/split availability
  const [nodeState, setNodeState] = useState<{
    headers: string[];
    rows: TableCellData[][];
  } | null>(null);

  const selectedCells = initialSelectedCells;

  // Load current node state
  useEffect(() => {
    const read = () => {
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isCustomTableNode(node)) {
          setNodeState({
            headers: node.getHeaders(),
            rows: node.getRows().map((r) => r.map((c) => ({ ...c }))),
          });
        }
      });
    };
    read();
    return editor.registerUpdateListener(() => read());
  }, [editor, nodeKey]);

  // Position panel below/above the table
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

  // ---- Row operations ----

  const addRow = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCustomTableNode(node)) return;
      const colCount = node.getHeaders().length;
      const newRow: TableCellData[] = Array.from({ length: colCount }, () => ({
        id: generateId(),
        editorState: null,
        colspan: 1,
      }));
      node.setRows([...node.getRows(), newRow]);
    });
  }, [editor, nodeKey]);

  const removeLastRow = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCustomTableNode(node)) return;
      const rows = node.getRows();
      if (rows.length > 0) node.setRows(rows.slice(0, -1));
    });
  }, [editor, nodeKey]);

  // ---- Column operations ----

  const addColumn = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCustomTableNode(node)) return;
      node.setHeaders([...node.getHeaders(), '']);
      node.setRows(
        node.getRows().map((row) => [
          ...row,
          { id: generateId(), editorState: null, colspan: 1 },
        ]),
      );
    });
  }, [editor, nodeKey]);

  // Can only remove last column when no merged cell covers it
  const canRemoveCol =
    nodeState !== null &&
    nodeState.headers.length > 1 &&
    nodeState.rows.every((row) => {
      const last = row[row.length - 1];
      return last && last.colspan === 1;
    });

  const removeLastColumn = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCustomTableNode(node)) return;
      const headers = node.getHeaders();
      if (headers.length <= 1) return;
      const rows = node.getRows();
      if (!rows.every((r) => r[r.length - 1]?.colspan === 1)) return;
      node.setHeaders(headers.slice(0, -1));
      node.setRows(rows.map((row) => row.slice(0, -1)));
    });
  }, [editor, nodeKey]);

  // ---- Merge / Split ----

  const canMerge = (() => {
    if (selectedCells.length !== 2) return false;
    const [a, b] = selectedCells;
    if (a.rowIndex !== b.rowIndex) return false;
    const [left, right] =
      a.cellIndex < b.cellIndex ? [a, b] : [b, a];
    return right.cellIndex === left.cellIndex + 1;
  })();

  const mergeCells = useCallback(() => {
    if (!canMerge) return;
    const [a, b] = selectedCells;
    const [left, right] =
      a.cellIndex < b.cellIndex ? [a, b] : [b, a];
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCustomTableNode(node)) return;
      const rows = node.getRows().map((r) => r.map((c) => ({ ...c })));
      const row = rows[left.rowIndex];
      row[left.cellIndex].colspan += row[right.cellIndex].colspan;
      row[left.cellIndex].content =
        [row[left.cellIndex].content, row[right.cellIndex].content]
          .filter(Boolean)
          .join(' ');
      row.splice(right.cellIndex, 1);
      node.setRows(rows);
    });
    onClose();
  }, [editor, nodeKey, canMerge, selectedCells, onClose]);

  const canSplit =
    nodeState !== null &&
    selectedCells.length === 1 &&
    (() => {
      const { rowIndex, cellIndex } = selectedCells[0];
      return (nodeState.rows[rowIndex]?.[cellIndex]?.colspan ?? 1) > 1;
    })();

  const splitCell = useCallback(() => {
    if (!canSplit || selectedCells.length !== 1) return;
    const { rowIndex, cellIndex } = selectedCells[0];
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isCustomTableNode(node)) return;
      const rows = node.getRows().map((r) => r.map((c) => ({ ...c })));
      const cell = rows[rowIndex][cellIndex];
      const newColspan = cell.colspan - 1;
      cell.colspan = 1;
      rows[rowIndex].splice(cellIndex + 1, 0, {
        content: '',
        colspan: newColspan,
      });
      node.setRows(rows);
    });
    onClose();
  }, [editor, nodeKey, canSplit, selectedCells, onClose]);

  const rowCount = nodeState?.rows.length ?? 0;

  const selectionHint =
    selectedCells.length === 0
      ? 'Click cells in the table to select (Shift/Ctrl for multi)'
      : selectedCells.length === 1
        ? `1 cell selected`
        : `${selectedCells.length} cells selected`;

  return (
    <div
      ref={panelRef}
      className={s['FloatingTableConfig__panel']}
      role='dialog'
      aria-label='Table configuration'
    >
      {/* Header */}
      <div className={s['FloatingTableConfig__header']}>
        <span className={s['FloatingTableConfig__title']}>Configure Table</span>
        <button
          type='button'
          className={s['FloatingTableConfig__close']}
          onClick={onClose}
          aria-label='Close'
        >
          &times;
        </button>
      </div>

      <div className={s['FloatingTableConfig__body']}>
        {/* Rows */}
        <div className={s['FloatingTableConfig__section']}>
          <span className={s['FloatingTableConfig__sectionLabel']}>
            Rows{rowCount > 0 ? ` (${rowCount})` : ''}
          </span>
          <div className={s['FloatingTableConfig__btnGroup']}>
            <button
              type='button'
              className={s['FloatingTableConfig__actionBtn']}
              onClick={addRow}
            >
              + Add row
            </button>
            <button
              type='button'
              className={s['FloatingTableConfig__actionBtn']}
              onClick={removeLastRow}
              disabled={rowCount === 0}
            >
              − Remove last
            </button>
          </div>
        </div>

        {/* Columns */}
        <div className={s['FloatingTableConfig__section']}>
          <span className={s['FloatingTableConfig__sectionLabel']}>
            Columns{nodeState ? ` (${nodeState.headers.length})` : ''}
          </span>
          <div className={s['FloatingTableConfig__btnGroup']}>
            <button
              type='button'
              className={s['FloatingTableConfig__actionBtn']}
              onClick={addColumn}
            >
              + Add column
            </button>
            <button
              type='button'
              className={s['FloatingTableConfig__actionBtn']}
              onClick={removeLastColumn}
              disabled={!canRemoveCol}
              title={!canRemoveCol ? 'Cannot remove — last column has merged cells' : undefined}
            >
              − Remove last
            </button>
          </div>
        </div>

        {/* Cell merge / split */}
        <div className={s['FloatingTableConfig__section']}>
          <span className={s['FloatingTableConfig__sectionLabel']}>Cells</span>
          <p className={s['FloatingTableConfig__hint']}>{selectionHint}</p>
          <div className={s['FloatingTableConfig__btnGroup']}>
            <button
              type='button'
              className={[
                s['FloatingTableConfig__actionBtn'],
                s['FloatingTableConfig__actionBtn--primary'],
              ].join(' ')}
              onClick={mergeCells}
              disabled={!canMerge}
              title={!canMerge ? 'Select 2 adjacent cells in the same row' : undefined}
            >
              Merge ↔
            </button>
            <button
              type='button'
              className={[
                s['FloatingTableConfig__actionBtn'],
                s['FloatingTableConfig__actionBtn--primary'],
              ].join(' ')}
              onClick={splitCell}
              disabled={!canSplit}
              title={!canSplit ? 'Select a merged cell to split' : undefined}
            >
              Split ↔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Plugin ----

export default function FloatingTableConfigPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [activePayload, setActivePayload] =
    useState<TableConfigCommandPayload | null>(null);

  const closePanel = useCallback(() => setActivePayload(null), []);

  useEffect(() => {
    return editor.registerCommand(
      OPEN_TABLE_CONFIG_COMMAND,
      (payload) => {
        setActivePayload((current) =>
          current?.nodeKey === payload.nodeKey ? null : payload,
        );
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!activePayload) return null;

  return createPortal(
    <FloatingTableConfigPanel
      nodeKey={activePayload.nodeKey}
      initialSelectedCells={activePayload.selectedCells}
      anchorElem={anchorElem}
      onClose={closePanel}
    />,
    anchorElem,
  );
}
