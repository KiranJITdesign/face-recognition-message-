import SecurityToolbar from '@/components/security/SecurityToolbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SecurityToolbar />
      {children}
    </>
  );
}
