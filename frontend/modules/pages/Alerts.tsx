import AlertsList from '@shared/components/AlertsList';

export default function AlertsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-primary to-primary/60 max-w-fit">
        التنبيهات
      </h1>
      <AlertsList />
    </div>
  );
}