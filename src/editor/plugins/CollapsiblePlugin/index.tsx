import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, CLICK_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import { useEffect } from 'react';

import { $isCollapsibleContainerNode } from '../../nodes/CollapsibleNode';

export default function CollapsiblePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.classList.contains('Collapsible__titleToggle')) {
          return false;
        }

        const containerDom = target.closest(
          '.Collapsible__container',
        ) as HTMLElement | null;
        const nodeKey = containerDom?.dataset.nodeKey;
        if (!nodeKey) return false;

        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isCollapsibleContainerNode(node)) {
            node.setOpen(!node.getOpen());
          }
        });

        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
