# Admin Panel Pages - Functional Documentation

This document describes the functionality and features of each page in the admin panel.

---

## 📊 Dashboard (`/admin/dashboard`)

**File:** `frontend/src/pages/admin/AdminDashboard.tsx`

### Overview
The main administrative dashboard providing a high-level overview of the platform's key metrics and performance indicators.

### Key Features

#### 1. **Key Performance Indicators (KPIs)**
- **Active Users**: Total number of active users (customers and consultants)
- **Monthly Recurring Revenue (MRR)**: Total recurring revenue per month
- **Churn Rate**: Percentage of users who canceled subscriptions
- **Active Alerts**: Count of system alerts requiring attention

#### 2. **Real-Time Updates**
- WebSocket connection for live metric updates
- Automatic refresh every 60 seconds
- Real-time alert notifications

#### 3. **Data Visualizations**
- **User Growth Chart**: Line chart showing user growth over time (monthly)
- **Revenue Chart**: Bar chart displaying revenue trends by month

#### 4. **System Alerts**
- List of recent platform alerts
- Alert types and severity levels
- Timestamp for each alert

### Data Sources
- Fetches metrics from `/api/admin/dashboard/metrics`
- Includes cached data for performance optimization
- Handles graceful fallbacks on API errors

---

## 👥 User Management (`/admin/users`)

**File:** `frontend/src/pages/admin/UserManagement.tsx`

### Overview
Comprehensive user management interface for viewing, searching, filtering, and managing all platform users.

### Key Features

#### 1. **User List with Pagination**
- Display all users with pagination (20 per page)
- Shows: Name, Email, Role, Status, Plan, Registration Date
- Pagination controls: Previous/Next buttons and page numbers
- Search functionality by name or email

#### 2. **User Details Dialog**
Comprehensive user information modal showing:
- **Basic Information**: Name, Email, Phone, Birth Date, Role, Status, Risk Profile
- **Subscription Information**: Plan name, price, status, billing dates
- **Financial Summary**: Cash, Investments, Debt, Net Worth
- **Statistics**: Number of connections, goals, clients (for consultants)
- **Associated Consultants**: For customer users, shows linked consultants

#### 3. **User Actions**
- **View Details**: Open detailed user information dialog
- **Change Role**: Switch user between customer/consultant/admin
- **Block/Unblock**: Block or unblock user access
- All actions are logged in audit trail

#### 4. **Filtering & Search**
- Search by name or email (debounced)
- Filter by role: customer, consultant, admin
- Filter by status: active, blocked, pending
- Auto-reset to page 1 on search/filter changes

### Data Sources
- Fetches users from `/api/admin/users` with pagination
- Gets detailed user info from `/api/admin/users/:id`
- Updates user status via `/api/admin/users/:id/status`
- Updates user role via `/api/admin/users/:id/role`

---

## 💳 Subscriptions (`/admin/subscriptions`)

**File:** `frontend/src/pages/admin/Subscriptions.tsx`

### Overview
Manage and monitor all user subscriptions, payment status, and subscription metrics.

### Key Features

#### 1. **Subscription List with Pagination**
- Display all subscriptions with pagination (20 per page)
- Shows: User name/email, Plan name, Amount, Status, Next billing date, Created date
- Status indicators: Active, Past Due, Canceled, Paused

#### 2. **Subscription KPIs**
- **Total MRR**: Monthly Recurring Revenue
- **Active Subscriptions**: Count of active subscriptions
- **Past Due Subscriptions**: Count of overdue subscriptions

#### 3. **Filtering Options**
- Search by user name or email
- Filter by subscription status (all, active, past_due, canceled)
- Filter by plan type
- Auto-reset pagination on filter changes

#### 4. **Subscription Information**
- Plan details and pricing
- Billing cycle information
- Payment history references

### Data Sources
- Fetches subscriptions from `/api/admin/subscriptions` with pagination
- Includes user and plan information via joins

---

## 📦 Plan Management (`/admin/plans`)

**File:** `frontend/src/pages/admin/PlanManagement.tsx`

### Overview
Dedicated page for managing subscription plans, pricing, features, and plan configurations.

### Key Features

#### 1. **Plan List**
- Display all available subscription plans
- Shows plan name, price, connection limit, features, and active status
- Visual indicators for unlimited plans

#### 2. **Plan Editor Dialog**
Create or edit plans with the following fields:
- **Code**: Unique identifier (cannot be changed after creation)
- **Name**: Display name for the plan
- **Price**: Monthly price in Brazilian Reais
- **Connection Limit**: Maximum number of connections (null = unlimited)
- **Features**: Dynamic list of plan features
  - Add new features
  - Edit existing features
  - Remove features
- **Active Status**: Toggle to enable/disable plan

#### 3. **Plan Actions**
- **Add New Plan**: Create a new subscription plan
- **Edit Plan**: Modify existing plan details
- **Save Plans**: Persist all changes to the database
- Validation ensures required fields are filled

#### 4. **Feature Management**
- Dynamic feature list per plan
- Add features via text input
- Remove features with delete button
- Features displayed as tags on plan cards

### Data Sources
- Loads plans from `/api/admin/settings` (plans section)
- Saves plans via `/api/admin/settings/plans`
- Default plans loaded if API fails

---

## 💰 Financial Reports (`/admin/financial`)

**File:** `frontend/src/pages/admin/FinancialReports.tsx`

### Overview
Comprehensive financial reporting and analytics for revenue, commissions, and transactions.

### Key Features

#### 1. **Financial KPIs**
- **Total Revenue**: Sum of all revenue
- **Total Commissions**: Total consultant commissions paid
- **Net Revenue**: Revenue minus commissions
- **MRR**: Monthly Recurring Revenue

#### 2. **Revenue Chart**
- Line chart showing revenue trends over time
- Monthly revenue breakdown
- Visual trend analysis

#### 3. **Commission Analytics**
- Bar chart showing commissions by consultant
- Displays: Consultant name, number of clients, commission amount
- Helps identify top-earning consultants

#### 4. **Transaction History**
- Table of recent financial transactions
- Shows: Date, Type, Amount, Client
- Transaction type indicators

#### 5. **Period Selection** (UI prepared)
- Period filter dropdown (month/quarter/year)
- Currently defaulted to monthly view

### Data Sources
- Fetches financial data from `/api/admin/financial/reports`
- Includes revenue, commissions, transactions, and MRR data
- Gracefully handles missing payment/subscription tables

---

## 🔌 Integrations Monitor (`/admin/integrations`)

**File:** `frontend/src/pages/admin/IntegrationsMonitor.tsx`

### Overview
Monitor the health and performance of external integrations (Open Finance, B3, payment providers).

### Key Features

#### 1. **Integration Health KPIs**
- **Healthy**: Number of integrations with good status
- **Degraded**: Number of integrations with degraded performance
- **Down**: Number of integrations currently down
- **Average Uptime**: Overall platform uptime percentage

#### 2. **Integration List**
For each integration displays:
- Integration name and provider
- Status: healthy, degraded, or down
- Last sync timestamp
- Uptime percentage
- Error rate
- Requests made today

#### 3. **Integration Logs**
Real-time activity log showing:
- Timestamp of each event
- Integration name
- Event message
- Event type: success, warning, or error
- Color-coded by event type

#### 4. **Status Indicators**
- Visual status badges (green/yellow/red)
- Quick identification of problematic integrations
- Last sync information

### Data Sources
- Fetches integration health from `/api/admin/integrations`
- Includes KPIs, integration list, and activity logs
- Handles missing `integration_health` table gracefully

---

## 🔍 DAMA Prospecting (`/admin/prospecting`)

**File:** `frontend/src/pages/admin/DAMAProspecting.tsx`

### Overview
Data Analytics and Marketing Automation (DAMA) tool for identifying high-potential prospects and managing conversion funnel.

### Key Features

#### 1. **Prospecting KPIs**
- **High Potential**: Count of high-potential prospects
- **Total Net Worth**: Combined net worth of all prospects
- **Average Engagement**: Average engagement percentage
- **Total Prospects**: Total number of prospects

#### 2. **Conversion Funnel**
Visual breakdown showing distribution across stages:
- Free tier users
- Basic plan users
- Pro plan users
- Consultant tier users

#### 3. **Prospects Table with Pagination**
- Display prospects with pagination (20 per page)
- Shows: User name/email, Stage, Net Worth, Engagement %, Potential, Last Activity
- Visual engagement progress bar
- Potential badges (High/Medium/Low)

#### 4. **Prospect Detail Dialog**
Comprehensive prospect information modal:
- **Basic Information**: Name, Email, Phone, Birth Date, Role, Status, Risk Profile
- **Prospect-Specific Info**: Potential level, Stage, Engagement percentage
- **Subscription Information**: Current plan details
- **Financial Summary**: Cash, Investments, Debt, Net Worth
- **Statistics**: Connections, Goals, Clients (for consultants)
- **Associated Consultants**: If customer, shows linked consultants

#### 5. **Filtering Options**
- Search by prospect name or email
- Filter by stage: free, basic, pro, consultant
- Filter by potential: high, medium, low
- Auto-reset pagination on filter changes

#### 6. **Calculated Metrics**
- Net worth calculated from bank accounts and investments
- Engagement calculated from connections, goals, and activity
- Potential assessed based on net worth and engagement

### Data Sources
- Fetches prospect data from `/api/admin/prospecting`
- Dynamically calculates metrics based on available tables
- Handles missing tables gracefully (bank_accounts, holdings, connections, goals)

---

## ⚙️ Settings (`/admin/settings`)

**File:** `frontend/src/pages/admin/Settings.tsx`

### Overview
Central configuration hub for platform settings, email automation, customization, and legal policies.

### Key Features

#### 1. **Email Settings Tab**
Configure automated email functionality:
- **From Email**: Sender email address for automated emails
- **From Name**: Sender name displayed in emails
- **Welcome Email**: Toggle to send welcome emails to new users
- **Monthly Report**: Toggle to send monthly reports automatically
- **Email Alerts**: Toggle to allow email alerts
- **Save Button**: Save email settings independently

#### 2. **Platform Settings Tab**
Core platform configuration:
- **Maintenance Mode**: Toggle to block all users except admins
- **Allow Registrations**: Toggle to enable/disable new user registrations
- **Require Email Verification**: Toggle to require email verification for account activation
- **Save Button**: Save platform settings independently

#### 3. **Customization Tab**
Branding and appearance settings:
- **Platform Logo**: Upload platform logo (file input with preview)
- **Primary Color**: Color picker for primary brand color
- **Platform Name**: Name of the platform
- **Description**: Platform description text
- **Save Button**: Save customization settings independently

#### 4. **Policies Tab**
Legal and policy documentation:
- **Terms of Service**: Multi-line textarea for terms of use
- **Privacy Policy**: Multi-line textarea for privacy policy
- **Cookie Policy**: Multi-line textarea for cookie policy
- **Save Button**: Save policies independently

#### 5. **Global Save**
- "Save All Changes" button in header
- Saves all settings tabs at once
- Provides unified save option

### Data Sources
- Loads settings from `/api/admin/settings`
- Saves email settings via `/api/admin/settings/email`
- Saves platform settings via `/api/admin/settings/platform`
- Saves customization via `/api/admin/settings/customization`
- Saves policies via `/api/admin/settings/policies`

---

## 🔐 Access Control

All admin pages require:
- **Authentication**: Valid JWT token
- **Authorization**: User role must be 'admin'
- **Audit Logging**: All admin actions are logged for audit trail

---

## 📡 API Endpoints Used

| Page | Endpoints |
|------|-----------|
| Dashboard | `GET /api/admin/dashboard/metrics` |
| User Management | `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/status`, `PATCH /api/admin/users/:id/role` |
| Subscriptions | `GET /api/admin/subscriptions` |
| Plan Management | `GET /api/admin/settings`, `PUT /api/admin/settings/plans` |
| Financial Reports | `GET /api/admin/financial/reports` |
| Integrations | `GET /api/admin/integrations` |
| Prospecting | `GET /api/admin/prospecting` |
| Settings | `GET /api/admin/settings`, `PUT /api/admin/settings/email`, `PUT /api/admin/settings/platform`, `PUT /api/admin/settings/customization`, `PUT /api/admin/settings/policies` |

---

## 🎨 UI/UX Features

### Common Patterns Across All Pages
- **Consistent Header**: Page title and description
- **Loading States**: Skeleton loaders and loading indicators
- **Error Handling**: Graceful error messages and fallbacks
- **Responsive Design**: Mobile-friendly layouts
- **Pagination**: Consistent pagination UI for list pages
- **Search/Filter**: Debounced search and filter controls
- **Save Buttons**: Section-specific and global save options
- **Success/Error Notifications**: Alert messages for user actions

### Design Components
- ChartCard: Container for card-based content
- ProfessionalKpiCard: KPI display cards
- Dialog: Modal dialogs for detailed views
- Badge: Status and category indicators
- Table: Data tables with sorting and pagination

---

## 📝 Notes

- All admin pages include comprehensive error handling
- Missing database tables are handled gracefully
- Real-time updates available on Dashboard via WebSocket
- All admin actions are logged to audit trail
- Pagination limits maximum 100 items per page for performance
- Search functionality is debounced (300ms delay)

---

## 🚀 Future Enhancements

Potential improvements for each page:
- **Dashboard**: Custom date range selection, export reports
- **User Management**: Bulk actions, CSV export, advanced filters
- **Subscriptions**: Subscription modification, proration handling
- **Plan Management**: Plan templates, A/B testing
- **Financial Reports**: Custom date ranges, detailed breakdowns
- **Integrations**: Integration configuration UI, retry mechanisms
- **Prospecting**: Automated lead scoring, email campaigns
- **Settings**: Advanced email templates, multi-language support

