import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import { useEffect } from 'react';

import {
  $createCustomTableNode,
  INSERT_CUSTOM_TABLE_COMMAND,
} from '../../nodes/CustomTableNode';

export default function CustomTablePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_CUSTOM_TABLE_COMMAND,
      (payload) => {
        $insertNodeToNearestRoot($createCustomTableNode(payload));
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
