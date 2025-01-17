import React from "react";
import { css } from "@emotion/react";
import DialogHeader from "./dialog-header.js";
import DialogFooter from "./dialog-footer.js";
import Input from "./input.js";
import Select from "./select.js";

const FormDialog = ({
  title,
  titleProps,
  dismiss,
  controls,
  submit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
}) => {
  const firstInputRef = React.useRef();

  const [hasPendingSubmit, setPendingSubmit] = React.useState(false);

  const [state, setState] = React.useState(() =>
    controls.reduce((acc, c) => {
      return { ...acc, [c.key]: c.initialValue ?? "" };
    }, {})
  );

  const hasRequiredInput = controls.every((c) => {
    if (!c.required) return true;
    return c.validate(state[c.key]);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submit == null) return;

    setPendingSubmit(true);
    try {
      await submit(state);
    } catch (e) {
      console.error(e);
      // TODO
    } finally {
      setPendingSubmit(false);
    }
  };

  React.useEffect(() => {
    firstInputRef.current.focus();
  }, []);

  const hasChanges = controls.some(
    (c) => c.initialValue === undefined || state[c.key] !== c.initialValue
  );

  return (
    <div
      css={css({
        padding: "1.5rem",
        "@media (min-width: 600px)": {
          padding: "2rem",
        },
      })}
    >
      <DialogHeader title={title} titleProps={titleProps} dismiss={dismiss} />

      <main>
        <form id="dialog-form" onSubmit={handleSubmit}>
          {controls.map((c, i) => (
            <div key={c.key} css={css({ "& + &": { marginTop: "2rem" } })}>
              {c.type === "select" ? (
                <Select
                  ref={i === 0 ? firstInputRef : undefined}
                  size={c.size ?? "large"}
                  value={c.value === undefined ? state[c.key] : c.value}
                  disabled={hasPendingSubmit}
                  onChange={(value) => {
                    setState((s) => ({ ...s, [c.key]: value }));
                    if (c.onChange) c.onChange(value);
                  }}
                  label={c.label}
                  placeholder={c.placeholder}
                  options={c.options}
                />
              ) : (
                <Input
                  ref={i === 0 ? firstInputRef : undefined}
                  contrast
                  size={c.size ?? "large"}
                  multiline={c.type === "multiline-text"}
                  value={c.value === undefined ? state[c.key] : c.value}
                  disabled={hasPendingSubmit}
                  onChange={(e) => {
                    setState((s) => ({ ...s, [c.key]: e.target.value }));
                    if (c.onChange) c.onChange(e.target.value);
                  }}
                  label={c.label}
                  placeholder={c.placeholder}
                  hint={c.hint}
                  rows={c.rows}
                />
              )}
            </div>
          ))}
        </form>
      </main>

      <DialogFooter
        cancel={dismiss}
        cancelButtonLabel={cancelLabel}
        submit={submit}
        submitButtonLabel={submitLabel}
        submitButtonProps={{
          type: "submit",
          form: "dialog-form",
          isLoading: hasPendingSubmit,
          disabled: !hasChanges || !hasRequiredInput || hasPendingSubmit,
          style: { minWidth: "8rem" },
        }}
      />
    </div>
  );
};

export default FormDialog;
