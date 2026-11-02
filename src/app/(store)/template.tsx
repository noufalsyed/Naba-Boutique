// Re-mounts on every navigation, giving each page a gentle fade-in.
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
