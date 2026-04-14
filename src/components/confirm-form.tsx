"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "children"> & {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  children: ReactNode;
};

export function ConfirmForm({ action, confirmMessage, children, onSubmit, ...props }: Props) {
  return (
    <form
      {...props}
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}

