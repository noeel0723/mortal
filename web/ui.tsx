import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { emoji } from '../src/theme/tokens';
import type { Emoji } from '../src/theme/tokens';
import mark from '../assets/icon.png';

export function Mark({ className = '' }: { className?: string }) {
  return <img src={mark} width="80" height="80" alt="" className={`mark ${className}`} />;
}

export function Icon({ name }: { name: Emoji }) {
  return <span className="emoji" aria-hidden="true">{emoji[name]}</span>;
}

export function Button({ icon, kind = 'plain', className = '', children, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: Emoji;
  kind?: 'plain' | 'primary' | 'quiet' | 'danger';
  children: ReactNode;
}) {
  return <button type={type} className={`button button--${kind} ${className}`} {...props}><Icon name={icon} />{children}</button>;
}

export function Heading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <header className="heading">
      <div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>
      {action}
    </header>
  );
}

export function Rows({ items }: { items: { key?: string; label: string; value: ReactNode }[] }) {
  return <dl className="rows">{items.map(({ key, label, value }) => (
    <div className="data-row" key={key ?? label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export function Feedback({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (!error && !notice) return null;
  return <p className={`feedback ${error ? 'feedback--error' : ''}`} role={error ? 'alert' : 'status'}>{error ?? notice}</p>;
}
