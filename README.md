# Advanced Sales Tracker
## Application Workflow & Business Logic

The Advanced Sales Tracker will have two primary functions:

1. **Opportunity Management:** Track estimates, follow-ups, sales conversions, and commission eligibility.
2. **Salesman Tracking:** Manage production goals, current and historical performance, revenue, and close rates.

### Step 1: Admin Setup & User Management

- The Admin creates salesperson accounts and sends invitations so team members can log in.
- The Admin sets monthly and quarterly production goals for each salesperson.
- The Admin can create opportunities for themselves or on behalf of a salesperson.
- Salespeople can create and manage their own opportunities.
- The Admin can view and manage the entire team's performance, pipeline, and reports.

### Step 2: Create or Import an Opportunity

An opportunity can enter the Sales Tracker in two ways:

- **Manual Creation:** A salesperson creates an opportunity for a new prospect or customer.
- **ServiceTitan Integration:** Existing estimates may be imported or synced from ServiceTitan, subject to API capabilities and integration configuration.

When creating an opportunity, the relevant information includes:

- Customer and company details
- Contact name, phone, email, and address
- New or existing customer
- Lead source: Self-Generated or Company-Generated
- Assigned salesperson
- Quote type, department, and territory
- Estimated ticket value
- ServiceTitan Estimate ID, when available

The opportunity source and the person responsible for closing the sale will be tracked separately.

### Step 3: Estimate Management & Follow-up

Estimates will continue to be created and edited in ServiceTitan. The Sales Tracker will manage opportunity progress and follow-up activities.

The follow-up workflow will be:

- First reminder: 24 hours after presentation
- Second reminder: 3 days after presentation
- Third reminder: 1 week after presentation
- Custom reminder: The salesperson can set a new follow-up date based on the customer's response.

For example, if a customer requests one week to review an estimate, the salesperson can schedule the next reminder for that date.

The system will notify the assigned salesperson when a follow-up is due. Follow-ups should be managed according to the customer's response until the opportunity is resolved.

### Step 4: Opportunity Outcome

Each opportunity will be tracked through its outcome:

- **Open:** The customer has not made a final decision.
- **Won:** The customer accepts the opportunity and it converts into a sale.
- **Lost:** The opportunity does not convert.

When an opportunity is won, the Sale record will capture the relevant transaction details, including the ServiceTitan Work Order number, sale value, closing date, and salesperson responsible for closing.

Estimate and Work Order numbers will be tracked separately because they identify different stages of the transaction.

### Step 5: Sale, Payment & Commission Qualification

Each completed sale will be evaluated separately for revenue production and commission eligibility.

The system will track:

- Sale value and closing date
- Payment due date and payment status
- Payment method, such as credit card, check, ACH, or cash
- Opportunity source and closing responsibility
- New or existing customer
- Commissionable or non-commissionable status
- Required profit-margin and hours-charged-versus-hours-spent metrics

**Commission examples provided by the business:**

- A qualified, self-generated opportunity from a new customer may earn a 5% commission.
- A qualified, company-generated opportunity involving an existing customer may earn a 1% commission.
- A salesperson who only assists in closing an opportunity they did not generate or foster may receive revenue production credit without receiving commission on that transaction.

These percentages are examples of the intended commission structure. Final eligibility will depend on the agreed rules and required performance metrics.

Commission must also be tracked against payment collection. A commissionable sale must be collected before the full commission is paid, and commissions are handled on a quarterly basis.

### Step 6: Salesman Dashboard & Performance Tracking

Each salesperson will have access to their own dashboard, where they can view:

- Assigned opportunities and open estimates
- Upcoming and overdue follow-ups
- Won and lost opportunities
- Revenue generated during the selected period
- Progress toward monthly and quarterly goals
- Close rate percentage
- Commission eligibility and relevant payment status
- Current and historical performance

Salespeople will primarily manage their own pipeline and performance, while the Admin can review and manage the entire team.

### Step 7: Reporting & Business Insights

The Admin will be able to generate reports using:

- Weekly and monthly periods
- Quarterly reporting
- Year-to-date reporting
- Custom start and end dates
- Categories such as lead source, closing responsibility, department, territory, quote type, customer type, and salesperson

Reports will distinguish total revenue production from commissionable revenue so management can evaluate both sales performance and commission qualification accurately.

## Overall Workflow

**Admin Setup → Opportunity Creation or Import → Estimate & Follow-up → Won/Lost Outcome → Sale & Payment Tracking → Commission Qualification → Performance Dashboard & Reports**

The goal is to provide one centralized application for managing opportunities, reminding salespeople to follow up, tracking revenue, qualifying commissions, and measuring sales performance.