export function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const Icons = {
  Menu: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Icon>
  ),
  Sparkles: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M4 14l.8 2.4L7 17l-2.2.6L4 20l-.8-2.4L1 17l2.2-.6L4 14z" />
    </Icon>
  ),
  Book: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M4 19a2 2 0 0 0 2 2h14" />
      <path d="M6 2h14v17H6a2 2 0 0 0-2 2V4a2 2 0 0 1 2-2z" />
    </Icon>
  ),
  Target: (props: { className?: string }) => (
    <Icon className={props.className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M22 12h-3" />
      <path d="M12 22v-3" />
      <path d="M2 12h3" />
    </Icon>
  ),
  Check: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  ),
  ArrowRight: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </Icon>
  ),
  Home: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </Icon>
  ),
  Clipboard: (props: { className?: string }) => (
    <Icon className={props.className}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </Icon>
  ),
  Layers: (props: { className?: string }) => (
    <Icon className={props.className}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </Icon>
  ),
};

