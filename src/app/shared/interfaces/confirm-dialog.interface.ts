/** Content and styling for a confirmation prompt. */
export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** Styles the confirm button as a warning, for irreversible actions. */
  readonly destructive?: boolean;
}
