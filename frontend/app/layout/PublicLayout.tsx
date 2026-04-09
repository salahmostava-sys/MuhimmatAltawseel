import type { ReactNode } from 'react';
import { Suspense } from 'react';
import AuthLayout from '@app/layout/AuthLayout';
import Loading from '@shared/components/Loading';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <Loading minHeightClassName="min-h-[300px]" className="bg-background" resetKey="public" />
        }
      >
        {children}
      </Suspense>
    </AuthLayout>
  );
};

export default PublicLayout;

