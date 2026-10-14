import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export const withKeys = (children: ReactNode): ReactNode[] =>
  Children.toArray(children);
export function styleFromText(text: string): CSSProperties {
  return Object.fromEntries(
    text
      .split(";")
      .filter(Boolean)
      .map((rule) => {
        const colon = rule.indexOf(":");
        return [
          rule
            .slice(0, colon)
            .trim()
            .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
          rule.slice(colon + 1).trim(),
        ];
      }),
  );
}
/** Attributes used by the preserved field definitions. Never accepts events or HTML. */
export function htmlAttributes(text: string): Record<string, string | boolean> {
  const names: Record<string, string> = {
    autocomplete: "autoComplete",
    spellcheck: "spellCheck",
    inputmode: "inputMode",
    maxlength: "maxLength",
    minlength: "minLength",
    readonly: "readOnly",
  };
  const result: Record<string, string | boolean> = {};
  for (const match of text.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
    const name = match[1];
    if (
      /^(min|max|step|pattern|placeholder|title|required|disabled|readonly|autocomplete|spellcheck|inputmode|maxlength|minlength|selected)$/.test(
        name,
      )
    )
      result[names[name] ?? name] = match[2] ?? true;
  }
  return result;
}
type OptionProps = { selected?: boolean; value?: string; children?: ReactNode };
export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  let selected: string | undefined;
  const normalize = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (node) => {
      if (!isValidElement<OptionProps>(node)) return node;
      if (node.type === Fragment)
        return cloneElement(node, {}, normalize(node.props.children));
      if (node.type === "option") {
        if (node.props.selected)
          selected = node.props.value ?? String(node.props.children);
        return cloneElement(node, { selected: undefined });
      }
      return node;
    });
  const options = normalize(children);
  return (
    <select
      {...props}
      value={selected ?? "All"}
      onChange={props.onChange ?? (() => {})}
    >
      {options}
    </select>
  );
}
