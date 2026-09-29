export type DzwanMessageDetail =
  | {
      type: "confirm";
      message: string;
      resolve: (value: boolean) => void;
    }
  | {
      type: "prompt";
      message: string;
      defaultValue?: string;
      resolve: (value: string | null) => void;
    };

export function dzwanConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent<DzwanMessageDetail>("dzwan:message", {
        detail: {
          type: "confirm",
          message,
          resolve,
        },
      }),
    );
  });
}

export function dzwanPrompt(
  message: string,
  defaultValue = "",
): Promise<string | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent<DzwanMessageDetail>("dzwan:message", {
        detail: {
          type: "prompt",
          message,
          defaultValue,
          resolve,
        },
      }),
    );
  });
}
