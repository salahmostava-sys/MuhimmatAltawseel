import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';
import { PageSection } from '@shared/components/layout/PageScaffold';
import { AppCard, AddAppCard } from '@modules/apps/components/AppCard';
import { AppEmployeesPanel } from '@modules/apps/components/AppEmployeesPanel';
import { AppModal } from '@modules/apps/components/AppModal';
import { AppsPageHeader } from '@modules/apps/components/AppsPageHeader';
import { useAppsPage } from '@modules/apps/hooks/useAppsPage';

const AppsPage = () => {
  const {
    permissions,
    monthYear,
    apps,
    appsLoading,
    selectedApp,
    appEmployees,
    loadingEmployees,
    modalApp,
    deleteApp,
    deleting,
    savingApp,
    openingCreateModal,
    openingEditModal,
    closeModal,
    setDeleteApp,
    toggleSelectApp,
    saveApp,
    toggleMonthlyActive,
    confirmDelete,
    closeSelectedApp,
  } = useAppsPage();

  return (
    <div className="space-y-4" dir="rtl">
      <AppsPageHeader canEdit={permissions.can_edit} onAdd={openingCreateModal} />

      <PageSection title={`منصات شهر ${format(new Date(`${monthYear}-01`), 'MMMM yyyy', { locale: ar })}`}>
        {appsLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                selected={selectedApp?.id === app.id}
                canEdit={permissions.can_edit}
                onSelect={toggleSelectApp}
                onEdit={openingEditModal}
                onToggleActive={(item, event) => {
                  event.stopPropagation();
                  void toggleMonthlyActive(item);
                }}
                onDelete={(item, event) => {
                  event.stopPropagation();
                  setDeleteApp(item);
                }}
              />
            ))}

            {permissions.can_edit && <AddAppCard onClick={openingCreateModal} />}
          </div>
        )}

        {selectedApp && (
          <AppEmployeesPanel
            app={selectedApp}
            monthYear={monthYear}
            employees={appEmployees}
            loading={loadingEmployees}
            onClose={closeSelectedApp}
          />
        )}
      </PageSection>

      {modalApp !== undefined && (
        <AppModal
          app={modalApp}
          saving={savingApp}
          onClose={closeModal}
          onSave={saveApp}
        />
      )}

      <AlertDialog open={!!deleteApp} onOpenChange={(open) => { if (!open) setDeleteApp(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>أرشفة المنصة (Soft Delete)</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من أرشفة <strong>"{deleteApp?.name}"</strong>؟
              لن تظهر المنصة في الأشهر القادمة، لكنها ستبقى محفوظة في أرشيف الأشهر الماضية للحفاظ على دقة الرواتب والتقارير.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'جاري الأرشفة...' : 'تأكيد الأرشفة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppsPage;
