# Data Flow Diagram - مهمات التوصيل (Muhimmat Altawseel)

```mermaid
flowchart TB
    subgraph Database[(Database - Supabase)]
        daily_orders[(daily_orders)]
        apps[(apps)]
        salary_schemes[(salary_schemes)]
        salary_scheme_tiers[(salary_scheme_tiers)]
        salary_records[(salary_records)]
        employees[(employees)]
        locked_months[(locked_months)]
    end

    subgraph OrdersModule[📦 Orders Module]
        OrdersPage[📋 صفحة الطلبات<br/>OrdersPage.tsx]
        SpreadsheetGrid[📊 Spreadsheet Grid<br/>SpreadsheetGridTab.tsx]
    end

    subgraph AppsModule[📱 Apps Module]
        AppsPage[📱 صفحة التطبيقات<br/>Apps.tsx]
        MonthlyStats[📈 إحصائيات شهرية]
    end

    subgraph SalaryModule[💰 Salary Module]
        SchemesPage[⚙️ صفحة السكيمات<br/>SalarySchemes.tsx]
        SalariesPage[💵 صفحة الرواتب<br/>SalariesPage.tsx]
        SalaryEngine[⚡ Salary Engine<br/>Edge Function]
    end

    subgraph SettingsModule[🔧 Settings Module]
        SettingsHub[🔧 إعدادات النظام<br/>SettingsHub.tsx]
    end

    %% Orders Page Data Flow
    daily_orders -->|employee_id, app_id<br/>orders_count, date| OrdersPage
    employees -->|employee data| OrdersPage
    apps -->|app names & colors| OrdersPage
    
    OrdersPage -->|Grid Data<br/>employee × day × app| SpreadsheetGrid
    SpreadsheetGrid -->|Save Orders<br/>daily_orders upsert| daily_orders
    
    %% Apps Page Data Flow
    daily_orders -->|Aggregated Orders<br/>SUM(orders_count)| AppsPage
    apps -->|App Config<br/>brand_color, is_active| AppsPage
    AppsPage -->|Monthly Stats<br/>total_orders, active_riders| MonthlyStats
    
    %% Schemes Page Data Flow
    salary_schemes -->|Scheme Config<br/>scheme_type, monthly_amount| SchemesPage
    salary_scheme_tiers -->|Tiers Data<br/>from_orders, to_orders, price| SchemesPage
    apps -->|scheme_id assignment| SchemesPage
    
    SchemesPage -->|Pin Scheme to Month<br/>scheme_month_snapshots| Database
    
    %% Salaries Page Data Flow
    daily_orders -->|Context Orders<br/>getSalaryContextOrdersByMonth| SalariesPage
    salary_schemes -->|Active Schemes with Tiers| SalariesPage
    salary_records -->|Saved Records<br/>is_approved, net_salary| SalariesPage
    employees -->|Employee List<br/>name, city, iban| SalariesPage
    locked_months -->|Lock Status| SalariesPage
    
    SalariesPage -->|Calculate Request<br/>mode: month_preview| SalaryEngine
    SalaryEngine -->|Salary Preview<br/>base_salary, deductions| SalariesPage
    
    %% Cross-Module Flow
    SchemesPage -.->|Assign scheme_id to app| apps
    OrdersPage -.->|Trigger Salary Recalc| SalariesPage
    
    %% Styling like n8n
    style OrdersPage fill:#fbbf24,stroke:#d97706,color:#000
    style AppsPage fill:#60a5fa,stroke:#2563eb,color:#000
    style SchemesPage fill:#a78bfa,stroke:#7c3aed,color:#000
    style SalariesPage fill:#34d399,stroke:#059669,color:#000
    style SettingsHub fill:#f472b6,stroke:#db2777,color:#000
    style SalaryEngine fill:#f87171,stroke:#dc2626,color:#fff
    
    style daily_orders fill:#e0e7ff,stroke:#4338ca
    style apps fill:#e0e7ff,stroke:#4338ca
    style salary_schemes fill:#e0e7ff,stroke:#4338ca
    style employees fill:#e0e7ff,stroke:#4338ca
```

## شرح التدفقات الرئيسية

### 1. 📋 صفحة الطلبات → 📱 صفحة التطبيقات
- **البيانات**: `employee_id`, `app_id`, `orders_count`, `date`
- **الوظيفة**: تجميع الطلبات اليومية لكل تطبيق

### 2. 📋 صفحة الطلبات → 💵 صفحة الرواتب
- **البيانات**: `getSalaryContextOrdersByMonth()` - طلبات الشهر
- **الوظيفة**: حساب الرواتب بناءً على الطلبات الفعلية

### 3. ⚙️ صفحة السكيمات → 💵 صفحة الرواتب
- **البيانات**: `salary_schemes` + `salary_scheme_tiers` + `apps.scheme_id`
- **الوظيفة**: تطبيق قواعد حساب الرواتب (الشرائح)

### 4. ⚡ Salary Engine (Edge Function)
- **المدخلات**: `mode: 'month_preview'`, `month_year`
- **المخرجات**: `base_salary`, `advance_deduction`, `external_deduction`, `net_salary`

### 5. 🔒 قفل الشهر
- **من**: `locked_months` table
- **يؤثر على**: صفحة الطلبات (read-only) + صفحة الرواتب (freeze calculations)
