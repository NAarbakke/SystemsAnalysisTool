/** The properties views set when building elements; add to it as needed. */
type Props = {
  id?: string; className?: string; textContent?: string; title?: string; hidden?: boolean;
  type?: string; checked?: boolean; href?: string; download?: string; dataset?: Record<string, string>;
};

/** An element with properties and children in one expression. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: (Node | string)[]) {
  const { dataset, ...rest } = props;
  const node = Object.assign(document.createElement(tag), rest);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

/** Element lookup by id within a view; a missing id is a markup bug, so it throws. */
export function finder(root: ParentNode) {
  return <T extends Element = HTMLElement>(id: string) => {
    const node = root.querySelector<T>(`#${id}`);
    if (!node) throw new Error(`Missing #${id}`);
    return node;
  };
}

/** Two-digit index shown beside components in lists and callouts. */
export const ordinal = (index: number) => String(index + 1).padStart(2, '0');
