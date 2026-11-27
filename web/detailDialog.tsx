import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export function DetailDialog({ title, onDismiss, children, eventKey, special, identity }: {
  title: string; onDismiss?: () => void; children: ReactNode; eventKey?: string; special?: 'enjoyment' | 'death'; identity?: ReactNode;
}) {
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

  return <dialog ref={dialog} className={`detail-dialog${eventKey ? ' event-dialog' : ''}${special ? ` event-dialog--${special}` : ''}`}
    data-life-event={eventKey} data-event-kind={special} aria-labelledby={id}
    onCancel={(event) => { event.preventDefault(); onDismiss?.(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onDismiss?.();
    }}>
    {identity}
    <header className="detail-dialog-header">
      <h2 id={id} ref={heading} tabIndex={-1}>{title}</h2>
      {onDismiss && !special && <button type="button" aria-label={`Close ${title}`} onClick={onDismiss}>×</button>}
    </header>
    <div className="detail-dialog-body">{children}</div>
  </dialog>;
}
