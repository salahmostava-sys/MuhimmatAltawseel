import React from 'react';
import { FuelPageHeader } from '@modules/fuel/components/FuelPageHeader';
import { FuelFiltersToolbar, FuelPlatformTabs } from '@modules/fuel/components/FuelFilters';
import {
  FuelMonthlyView,
  FuelDailyDetailedView,
  FuelDailyFastList,
} from '@modules/fuel/components/FuelTable';
import { ImportModal } from '@modules/fuel/components/FuelImportModal';
import { useFuelPage } from '@modules/fuel/hooks/useFuelPage';

const FuelPage = () => { // NOSONAR: UI container with many independent handlers
  const {
    view,
    setView,
    dailyMode,
    setDailyMode,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    search,
    setSearch,
    selectedEmployee,
    setSelectedEmployee,
    platformTab,
    setPlatformTab,
    years,
    employees,
    apps,
    monthYear,
    monthStart,
    monthEnd,
    ridersForTab,
    loading,
    filteredMonthly,
    filteredDaily,
    totalKm,
    totalFuel,
    totalOrders,
    avgCostPerKm,
    dailyTotalKm,
    dailyTotalFuel,
    tableRef,
    handleExportMonthly,
    handleExportDaily,
    fastDailyPage,
    setFastDailyPage,
    fastDailyPageSize,
    fastDailyFilters,
    setFastDailyFilters,
    showImport,
    setShowImport,
    expandedRider,
    setExpandedRider,
    newEntry,
    setNewEntry,
                    editingDaily,
    setEditingDaily,
    defaultEntryDate,
                    savingEntry,
    submitNewEntry,
                    updateEditingDaily,
                    saveEditedDaily,
                    handleDeleteDaily,
    permissions,
    refetchMonthly,
    monthOrdersMap,
  } = useFuelPage();

  const fuelToolbarEnd = (
    <>
      <FuelFiltersToolbar
        search={search}
        setSearch={setSearch}
        view={view}
        dailyMode={dailyMode}
        handleExportMonthly={handleExportMonthly}
        handleExportDaily={handleExportDaily}
        onOpenImport={() => setShowImport(true)}
      />
    </>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <FuelPageHeader
        view={view}
        onViewChange={setView}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        years={years}
        toolbarEnd={fuelToolbarEnd}
      />

      <FuelPlatformTabs platformTab={platformTab} setPlatformTab={setPlatformTab} apps={apps} />

      {view === 'monthly' && (
        <FuelMonthlyView
          loading={loading}
          filteredMonthly={filteredMonthly}
          totalKm={totalKm}
          totalFuel={totalFuel}
          totalOrders={totalOrders}
          avgCostPerKm={avgCostPerKm}
          setSelectedEmployee={setSelectedEmployee}
          setView={setView}
          setExpandedRider={setExpandedRider}
          tableRef={tableRef}
        />
      )}

      {view === 'daily' && (
        <>
          {dailyMode === 'fast' ? (
            <FuelDailyFastList
              monthYear={monthYear}
              monthStart={monthStart}
              monthEnd={monthEnd}
              employees={ridersForTab}
              filters={fastDailyFilters}
              onFiltersChange={(next) => {
                setFastDailyFilters(next);
                setFastDailyPage(1);
              }}
              page={fastDailyPage}
              pageSize={fastDailyPageSize}
              onPageChange={setFastDailyPage}
              onBack={() => setDailyMode('detailed')}
            />
          ) : (
            <FuelDailyDetailedView
              filteredDaily={filteredDaily}
              dailyTotalKm={dailyTotalKm}
              dailyTotalFuel={dailyTotalFuel}
              ridersForTab={ridersForTab}
              selectedEmployee={selectedEmployee}
              setSelectedEmployee={setSelectedEmployee}
              loading={loading}
              expandedRider={expandedRider}
              setExpandedRider={setExpandedRider}
              monthOrdersMap={monthOrdersMap}
              permissionsCanEdit={permissions.can_edit}
              newEntry={newEntry}
              setNewEntry={setNewEntry}
                          defaultEntryDate={defaultEntryDate}
              savingEntry={savingEntry}
              submitNewEntry={submitNewEntry}
              editingDaily={editingDaily}
              setEditingDaily={setEditingDaily}
              updateEditingDaily={updateEditingDaily}
              saveEditedDaily={saveEditedDaily}
              handleDeleteDaily={handleDeleteDaily}
              setDailyMode={setDailyMode}
            />
          )}
        </>
      )}

      {showImport && (
        <ImportModal
          employees={employees}
          monthYear={monthYear}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); void refetchMonthly(); }}
        />
      )}

    </div>
  );
};

export default FuelPage;
