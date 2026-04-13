import type { Klass, LexicalNode } from 'lexical';

import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HashtagNode } from '@lexical/hashtag';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { OverflowNode } from '@lexical/overflow';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

import { AnchorHeadingNode } from './AnchorHeadingNode';
import { ButtonNode } from './ButtonNode/ButtonNode';
import {
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
} from './CollapsibleNode';
import { CustomTableNode } from './CustomTableNode';
import { ImageNode } from './ImageNode';

// AnchorHeadingNode uses type 'heading' — registers directly without replace wrapper.
// The toolbar must use $createAnchorHeadingNode instead of $createHeadingNode.
const PlaygroundNodes: Array<Klass<LexicalNode>> = [
  AnchorHeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  OverflowNode,
  HorizontalRuleNode,
  MarkNode,
  // Custom nodes
  ButtonNode,
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
  CustomTableNode,
  ImageNode,
];

export default PlaygroundNodes;
