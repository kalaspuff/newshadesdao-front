import { Transforms } from "slate";
import { useSelected, useFocused } from "slate-react";
import InlineUserButton from "../../components/inline-user-button.js";

const middleware = (editor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return element.type === "user" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === "user" ? true : isVoid(element);
  };

  editor.insertMention = (ref, { at } = {}) => {
    const mention = {
      type: "user",
      ref,
      children: [{ text: "" }],
    };
    if (at) Transforms.select(editor, at);
    Transforms.insertNodes(editor, mention);
    Transforms.move(editor);
    editor.insertText(" ");
  };

  return editor;
};

const MentionComponent = ({ element, attributes, children }) => {
  const selected = useSelected();
  const focused = useFocused();
  const isFocused = selected && focused;

  return (
    <InlineUserButton
      userId={element.ref}
      component="span"
      data-focused={isFocused ? "true" : undefined}
      {...attributes}
    >
      {children}
    </InlineUserButton>
  );
};

export default () => ({
  middleware,
  elements: { user: MentionComponent },
});
