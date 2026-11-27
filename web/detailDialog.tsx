import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export function DetailDialog({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement;
    element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialog} className="detail-dialog" aria-labelledby={id}
    onCancel={(event) => { event.preventDefault(); onDismiss(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onDismiss();
    }}>
    <header className="detail-dialog-header">
      <h2 id={id} ref={heading} tabIndex={-1}>{title}</h2>
      <button type="button" aria-label={`Close ${title}`} onClick={onDismiss}>×</button>
    </header>
    <div className="detail-dialog-body">{children}</div>
  </dialog>;
}
