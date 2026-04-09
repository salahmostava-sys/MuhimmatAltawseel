import { PlatformAccountDialog } from '@modules/platform-accounts/components/PlatformAccountDialog';
import { PlatformAccountsFilters } from '@modules/platform-accounts/components/PlatformAccountsFilters';
import { PlatformAccountsHeader } from '@modules/platform-accounts/components/PlatformAccountsHeader';
import { PlatformAccountsStats } from '@modules/platform-accounts/components/PlatformAccountsStats';
import { PlatformAccountsTable } from '@modules/platform-accounts/components/PlatformAccountsTable';
import { PlatformAssignDialog } from '@modules/platform-accounts/components/PlatformAssignDialog';
import { PlatformHistoryDialog } from '@modules/platform-accounts/components/PlatformHistoryDialog';
import { usePlatformAccountsPage } from '@modules/platform-accounts/hooks/usePlatformAccountsPage';
import { memo } from 'react';

const PlatformAccounts = () => {
  const {
    perms,
    loading,
    alertDays,
    accounts,
    apps,
    employees,
    employeesFull,
    activeCount,
    warnCount,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    platformFilter,
    setPlatformFilter,
    sortKey,
    sortDir,
    toggleSort,
    sortedAccounts,
    hasActiveFilters,
    accountDialog,
    setAccountDialog,
    editingAccount,
    accountForm,
    setAccountForm,
    savingAccount,
    openAddAccount,
    openEditAccount,
    accountEmployeeSelectValue,
    accountEmployeeOrphan,
    applyEmployeeToAccountForm,
    saveAccount,
    assignDialog,
    setAssignDialog,
    assignTarget,
    assignForm,
    setAssignForm,
    savingAssign,
    selectedAssignEmployeePreview,
    openAssign,
    saveAssign,
    historyDialog,
    setHistoryDialog,
    historyAccount,
    historyLoading,
    historyGroups,
    openHistory,
    clearFilters,
  } = usePlatformAccountsPage();

  return (
    <div className="space-y-4">
      <PlatformAccountsHeader
        loading={loading}
        accountsCount={accounts.length}
        activeCount={activeCount}
        warnCount={warnCount}
        canEdit={perms.can_edit}
        onAddAccount={openAddAccount}
      />

      <PlatformAccountsStats
        accountsCount={accounts.length}
        activeCount={activeCount}
        warnCount={warnCount}
        alertDays={alertDays}
        appsCount={apps.length}
      />

      <PlatformAccountsFilters
        search={search}
        onSearchChange={setSearch}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        apps={apps}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      <PlatformAccountsTable
        loading={loading}
        accountsCount={accounts.length}
        accounts={sortedAccounts}
        alertDays={alertDays}
        sortKey={sortKey}
        sortDir={sortDir}
        canEdit={perms.can_edit}
        onToggleSort={toggleSort}
        onOpenHistory={openHistory}
        onOpenAssign={openAssign}
        onOpenEdit={openEditAccount}
      />

      <PlatformAccountDialog
        open={accountDialog}
        onOpenChange={setAccountDialog}
        editingAccount={editingAccount}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        savingAccount={savingAccount}
        onSave={saveAccount}
        apps={apps}
        employeesFull={employeesFull}
        accountEmployeeSelectValue={accountEmployeeSelectValue}
        accountEmployeeOrphan={accountEmployeeOrphan}
        applyEmployeeToAccountForm={applyEmployeeToAccountForm}
      />

      <PlatformAssignDialog
        open={assignDialog}
        onOpenChange={setAssignDialog}
        assignTarget={assignTarget}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        savingAssign={savingAssign}
        onSave={saveAssign}
        employees={employees}
        selectedEmployeePreview={selectedAssignEmployeePreview}
      />

      <PlatformHistoryDialog
        open={historyDialog}
        onOpenChange={setHistoryDialog}
        historyAccount={historyAccount}
        historyLoading={historyLoading}
        historyGroups={historyGroups}
      />
    </div>
  );
};

export default memo(PlatformAccounts);
