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
    deleteMode,
    appDependencies,
    deleting,
    savingApp,
    openingCreateModal,
    openingEditModal,
    closeModal,
    setDeleteApp,
    setDeleteMode,
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

      <AlertDialog open={!!deleteApp} onOpenChange={(open) => { if (!open) { setDeleteApp(null); setDeleteMode('soft'); } }}>
        <AlertDialogContent dir="rtl" className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === 'soft' ? 'أرشفة المنصة' : '⚠️ حذف المنصة نهائياً'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {deleteMode === 'soft' ? (
                <>
                  <p>
                    هل أنت متأكد من أرشفة <strong>"{deleteApp?.name}"</strong>؟
                  </p>
                  <p className="text-sm">
                    لن تظهر المنصة في الأشهر القادمة، لكنها ستبقى محفوظة في أرشيف الأشهر الماضية للحفاظ على دقة الرواتب والتقارير.
                  </p>
                  
                  {appDependencies && appDependencies.hasAnyDependencies && (
                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 space-y-2">
                      <p className="font-semibold text-warning">⚠️ تنبيه: المنصة مرتبطة ببيانات</p>
                      <ul className="text-sm space-y-1 mr-4">
                        {appDependencies.employeeAppsCount > 0 && (
                          <li>• {appDependencies.employeeAppsCount} موظف مرتبط</li>
                        )}
                        {appDependencies.dailyOrdersCount > 0 && (
                          <li>• {appDependencies.dailyOrdersCount} سجل طلبات</li>
                        )}
                        {appDependencies.appTargetsCount > 0 && (
                          <li>• {appDependencies.appTargetsCount} هدف شهري</li>
                        )}
                        {appDependencies.pricingRulesCount > 0 && (
                          <li>• {appDependencies.pricingRulesCount} قاعدة تسعير</li>
                        )}
                      </ul>
                      <p className="text-sm text-muted-foreground mt-2">
                        الأرشفة ستخفي المنصة فقط. للحذف الكامل، اضغط "حذف نهائي" أدناه.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
                    <p className="font-bold text-destructive">⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
                    <p>
                      سيتم حذف <strong>"{deleteApp?.name}"</strong> نهائياً من النظام بالكامل.
                    </p>
                  </div>

                  {appDependencies && (
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <p className="font-semibold">📊 البيانات المرتبطة التي سيتم حذفها:</p>
                      <ul className="text-sm space-y-1 mr-4">
                        <li>• {appDependencies.employeeAppsCount} ربط موظف</li>
                        <li>• {appDependencies.dailyOrdersCount} سجل طلبات يومي</li>
                        <li>• {appDependencies.appTargetsCount} هدف شهري</li>
                        <li>• {appDependencies.pricingRulesCount} قاعدة تسعير</li>
                      </ul>
                      <p className="text-sm text-destructive font-semibold mt-3">
                        ⚠️ سيؤثر هذا على حسابات الرواتب والتقارير التاريخية!
                      </p>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-900">
                      💡 <strong>نصيحة:</strong> إذا كنت تريد فقط إخفاء المنصة، استخدم "الأرشفة" بدلاً من الحذف النهائي.
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            
            {deleteMode === 'soft' && appDependencies?.hasAnyDependencies && (
              <button
                type="button"
                onClick={() => setDeleteMode('hard')}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                حذف نهائي بدلاً من ذلك
              </button>
            )}
            
            {deleteMode === 'hard' && (
              <button
                type="button"
                onClick={() => setDeleteMode('soft')}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                رجوع للأرشفة
              </button>
            )}
            
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className={deleteMode === 'hard' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-warning text-warning-foreground hover:bg-warning/90'
              }
            >
              {deleting 
                ? (deleteMode === 'hard' ? 'جاري الحذف النهائي...' : 'جاري الأرشفة...') 
                : (deleteMode === 'hard' ? '🗑️ تأكيد الحذف النهائي' : 'تأكيد الأرشفة')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppsPage;
