export default function Template({ children }: { children: React.ReactNode }) {
  // Re-mounts on every navigation, so page content fades in each time.
  return <div className="page-enter">{children}</div>;
}
