# Batloung Farm Fresh Produce Distribution Management System

A complete stock, purchasing, sales, payments and reporting system for Batloung Farm, a fresh produce distributor serving vendors across South Africa.

The application is a Node.js/Express REST API backed by MySQL 8 with a responsive, dependency-free JavaScript frontend. All pages are served by the same Express server.

**Local URL:** http://localhost:3000

**Demonstration video:** https://batloung-farm-demo-video.netlify.app

## Features

- Supplier management across all nine provinces (create, view, edit, delete, search).
- Fruit catalogue with separate **SMALL**, **MEDIUM** and **LARGE** selling prices.
- Stock tracked independently per fruit and packaging size.
- Vendor management with contact search and outstanding balances.
- Multi-item purchases that atomically increase stock.
- Multi-item sales that atomically decrease stock and reject the whole sale if any line has insufficient stock.
- Server-calculated purchase and sale totals; client-entered totals are never trusted.
- Payment recording for cash, mobile money and credit sales.
- Automatic payment statuses: `PAID`, `PARTIALLY_PAID`, `UNPAID`.
- Reports for top-selling fruit, date-range revenue, top vendors, current stock and live low-stock alerts.
- Dashboard with key metrics, low-stock warnings and recent sales.
- All data-entry forms, records and details appear in accessible modals.
- Search filters on suppliers, fruits, vendors, purchases, sales and payments.
- SVG symbol buttons for view, edit, delete and record payment actions.
- Responsive layout with a collapsible mobile sidebar.
- Central error handling, HTTP status codes, validation and `.env` configuration.

## Technology

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 18+ (tested on Node 24) |
| Server | Express 4 |
| Database | MySQL 8 / InnoDB |
| DB driver | `mysql2/promise` connection pool |
| Configuration | `dotenv` |
| Frontend | Vanilla HTML, CSS and ES modules |
| Development | nodemon |

No frontend framework, build step or CDN is required.

## Quick Start

### 1. Prerequisites

- Node.js 18 or newer.
- MySQL 8 running locally.
- A MySQL user with permission to create the `batloung_farm` database.

### 2. Install dependencies

```powershell
cd C:\Users\user\BatloungFarm
npm install
```

### 3. Configure the environment

The project already contains a working `.env` for this computer. For another machine, copy `.env.example` to `.env` and set your credentials:

```env
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=batloung_farm

LOW_STOCK_THRESHOLD=10
```

`.env` is git-ignored. Never commit real database credentials.

### 4. Create and seed the database

```powershell
npm run db:init
```

This drops and recreates all tables, then inserts realistic sample data. It is safe to run again whenever you want a clean demonstration database.

### 5. Start the application

```powershell
npm start
```

Open http://localhost:3000.

For development with automatic restarts:

```powershell
npm run dev
```

### 6. Health check

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected response:

```json
{
  "success": true,
  "status": "ok",
  "database": "connected"
}
```

If MySQL is unavailable the API still starts and returns HTTP `503` from the health endpoint with a clear message.

## Pages

| Route | Purpose |
| --- | --- |
| `/dashboard` | Business metrics, low-stock alerts and recent sales |
| `/suppliers` | Supplier records, province filter and CRUD |
| `/fruits` | Fruit catalogue, three price tiers, stock view and low-stock tab |
| `/vendors` | Vendor records, search and outstanding balances |
| `/purchases` | Record and inspect multi-item stock purchases |
| `/sales` | Record and inspect multi-item sales, payment status and balances |
| `/payments` | Record payments, review outstanding accounts and payment history |
| `/reports` | Top fruit, revenue range, top vendors and current stock reports |

All routes re-render in the browser without a full page reload.

## Database Design

The schema is in `database/schema.sql`. Sample data is in `database/seed.sql`.

### Tables

| Table | Description |
| --- | --- |
| `suppliers` | Farm produce suppliers, unique business name and phone, province enum |
| `fruits` | Fruit catalogue and available/unavailable status |
| `fruit_prices` | One selling price per fruit and packaging size |
| `vendors` | Produce buyers with unique phone numbers |
| `stock` | One row per fruit and packaging size with non-negative quantity |
| `purchases` | Purchase header with supplier, date and total |
| `purchase_details` | Purchase line items with quantity, unit cost and size |
| `sales` | Sale header with vendor, date, totals, payment method and status |
| `sales_details` | Sale line items with quantity, unit price and size |
| `payments` | Cash or mobile-money payments allocated to a sale |

### Key constraints

- `fruit_prices` and `stock` are unique on `(fruit_id, packaging_size)`.
- `CHECK` constraints prevent negative stock, non-positive quantities/prices and overpayment.
- Foreign keys use `ON DELETE RESTRICT` for referenced suppliers, vendors and fruits so history cannot be lost accidentally.
- Detail and payment rows cascade when their parent purchase or sale is deleted.
- All tables use InnoDB for transactions and row-level locking.

## API Reference

Base URL: `http://localhost:3000/api`

All responses are JSON. Success responses use `{ "success": true, ... }`; errors use `{ "success": false, "message": "..." }`.

### Suppliers

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/suppliers?q=` | List/search suppliers |
| `GET` | `/suppliers/:id` | Get one supplier |
| `POST` | `/suppliers` | Create a supplier |
| `PUT` | `/suppliers/:id` | Update a supplier |
| `DELETE` | `/suppliers/:id` | Delete an unreferenced supplier |

### Fruits and stock

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/fruits?q=&status=` | List/search fruits with prices and stock |
| `GET` | `/fruits/:id` | Get one fruit |
| `POST` | `/fruits` | Create a fruit with three prices and stock rows |
| `PUT` | `/fruits/:id` | Update fruit details and/or prices |
| `DELETE` | `/fruits/:id` | Delete an unreferenced fruit |
| `GET` | `/fruits/stock` | All stock rows |
| `GET` | `/fruits/:id/stock` | Stock for one fruit |
| `GET` | `/fruits/low-stock?threshold=10` | Items at or below the threshold |

### Vendors

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/vendors?q=` | List/search vendors with outstanding balance |
| `GET` | `/vendors/:id` | Get one vendor |
| `POST` | `/vendors` | Create a vendor |
| `PUT` | `/vendors/:id` | Update a vendor |
| `DELETE` | `/vendors/:id` | Delete a vendor with no sales |

### Purchases

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/purchases` | List purchases with supplier and line summary |
| `GET` | `/purchases/:id` | Get a purchase and its line items |
| `POST` | `/purchases` | Create a purchase and increase stock atomically |
| `PUT` | `/purchases/:id` | Edit a purchase and adjust stock atomically |
| `DELETE` | `/purchases/:id` | Delete a purchase and reverse its stock |

Example purchase request:

```json
{
  "supplier_id": 1,
  "purchase_date": "2026-11-14",
  "items": [
    { "fruit_id": 1, "packaging_size": "MEDIUM", "quantity": 10, "unit_cost": 5.5 },
    { "fruit_id": 2, "packaging_size": "SMALL", "quantity": 20, "unit_cost": 2.25 }
  ]
}
```

### Sales

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/sales` | List sales with vendor, boxes and balance |
| `GET` | `/sales/:id` | Get a sale and its line items |
| `POST` | `/sales` | Create a sale, validate stock and decrease stock atomically |
| `PUT` | `/sales/:id` | Edit a sale and adjust stock atomically |
| `DELETE` | `/sales/:id` | Delete a sale, restore stock and remove its payments |

Example credit sale:

```json
{
  "vendor_id": 3,
  "sale_date": "2026-11-14",
  "payment_method": "CREDIT",
  "amount_paid": 50,
  "settlement_method": "MOBILE_MONEY",
  "items": [
    { "fruit_id": 1, "packaging_size": "SMALL", "quantity": 2 },
    { "fruit_id": 2, "packaging_size": "MEDIUM", "quantity": 1 }
  ]
}
```

Sale prices and totals are read from `fruit_prices`; the client cannot submit a unit price. Cash and mobile-money sales are marked paid in full. Credit sales can be unpaid or partially paid.

### Payments

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/payments` | Payment history |
| `GET` | `/payments/summary` | Total collected and outstanding |
| `GET` | `/payments/outstanding` | Outstanding balance by vendor |
| `GET` | `/payments/outstanding-sales` | Individual sales with balances |
| `GET` | `/payments/:id` | Get one payment with its sale balance |
| `POST` | `/payments` | Record a cash or mobile-money payment |
| `PUT` | `/payments/:id` | Edit a payment and recalculate its sale balance |
| `DELETE` | `/payments/:id` | Delete a payment and recalculate its sale balance |

Example payment:

```json
{
  "sale_id": 6,
  "amount": 200,
  "payment_method": "MOBILE_MONEY",
  "reference": "M-PESA-4821"
}
```

### Reports

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/reports/dashboard` | Dashboard metrics and recent sales |
| `GET` | `/reports/top-fruits?limit=5` | Best-selling fruit by boxes |
| `GET` | `/reports/revenue?start_date=&end_date=` | Revenue for an inclusive date range |
| `GET` | `/reports/top-vendors` | Vendors ranked by boxes purchased |
| `GET` | `/reports/stock?packaging_size=` | Current stock, optionally filtered by size |

## Business Rules

- Stock is tracked separately for every packaging size.
- A fruit cannot have the same selling price for two packaging sizes.
- Purchase totals are calculated from quantity multiplied by unit cost.
- Sale totals are calculated from quantity multiplied by the stored selling price.
- Every purchase and sale runs inside a MySQL transaction.
- A failed purchase rolls back its header, details and stock changes.
- A sale checks every requested line with `SELECT ... FOR UPDATE` before writing anything.
- If any line has insufficient stock, the whole sale is rejected; no partial sale and no negative stock can occur.
- Editing a purchase or sale reverses the original stock effect and applies the new lines in one transaction.
- A purchase edit or delete is blocked when its stock has already been sold, preventing negative stock.
- Deleting a sale restores its stock; linked payments are removed by the database cascade.
- Editing or deleting a payment recalculates the parent sale's amount paid and payment status.
- Every record page (suppliers, fruits, vendors, purchases, sales, payments) provides view, edit and delete actions.
- Payment status is derived from the server-side total and amount paid:
  - `amount_paid = 0` and total greater than zero: `UNPAID`
  - `0 < amount_paid < total`: `PARTIALLY_PAID`
  - `amount_paid = total`: `PAID`
- An overpayment or a payment on a fully paid sale is rejected.
- Suppliers, vendors and fruits with related transaction history cannot be deleted.

## Transaction Demonstration

The insufficient-stock path is easy to demonstrate:

1. Note the current quantity for Mangoes (LARGE).
2. Submit a sale containing a valid Apple line and a Mango (LARGE) quantity larger than the available stock.
3. The API returns HTTP `400` with an `Insufficient stock` message.
4. Refresh the sales and fruits pages. No sale was created and the Apple stock did not change.

The same atomic behavior applies when a purchase contains an invalid fruit, packaging size or supplier.

Alternatively, run this SQL to watch a transaction roll back manually:

```sql
USE batloung_farm;
START TRANSACTION;
UPDATE stock SET available_quantity = available_quantity - 999999 WHERE fruit_id = 4 AND packaging_size = 'LARGE';
SELECT available_quantity FROM stock WHERE fruit_id = 4 AND packaging_size = 'LARGE';
ROLLBACK;
SELECT available_quantity FROM stock WHERE fruit_id = 4 AND packaging_size = 'LARGE';
```

The database-level `CHECK (available_quantity >= 0)` prevents the update from committing, and `ROLLBACK` restores the original value.

## Validation and HTTP Status Codes

| Code | Use |
| --- | --- |
| `200` | Successful read, update or delete |
| `201` | Created supplier, fruit, vendor, purchase, sale or payment |
| `400` | Validation error, insufficient stock, invalid packaging size, overpayment |
| `404` | Record or API route not found |
| `409` | Duplicate business name/phone, or delete blocked by related history |
| `500` | Unexpected server or database error |
| `503` | API is up but the database is unavailable |

Every controller uses `async`/`await` with `try/catch` and forwards errors to the central error handler.

## Sample Data

`npm run db:init` seeds:

- 9 suppliers covering all nine South African provinces.
- 5 fruits: Apples, Bananas, Oranges, Mangoes and Grapes.
- 6 vendors in Lesotho and South Africa.
- 6 purchases and 12 sales.
- 11 payment records, including paid, partially paid and unpaid sales.
- 15 stock rows (5 fruits × 3 packaging sizes).

Expected starting figures:

| Metric | Value |
| --- | --- |
| Total revenue | M 4,196.00 |
| Total collected | M 3,351.00 |
| Outstanding | M 845.00 |
| Outstanding vendors | 2 |
| Total boxes in stock | 770 |
| Low-stock rows | 3 |

## Project Structure

```text
BatloungFarm/
├── app.js                     Express application
├── server.js                  Startup and graceful shutdown
├── .env                       Local database configuration (git-ignored)
├── .env.example               Environment template
├── config/db.js               MySQL connection pool
├── database/
│   ├── schema.sql             Complete relational schema
│   ├── seed.sql               Sample data
│   └── init.js                Schema reset and seed runner
├── middleware/
│   ├── errorHandler.js
│   └── notFound.js
├── utils/
│   ├── ApiError.js
│   ├── constants.js
│   └── validation.js
├── routes/                    Express route definitions
├── controllers/               Request validation and responses
├── models/                    SQL and transaction logic
└── public/
    ├── index.html             Application shell
    ├── css/styles.css         Complete responsive design
    └── js/
        ├── api.js             Fetch wrapper
        ├── ui.js              Shared UI, icons, modals, formatting
        ├── actions.js         Shared sale/payment modals
        ├── app.js             Router and navigation
        └── pages/             One module per page
```

## Verification Performed

The finished application was tested against a live MySQL database and a real headless Edge browser:

- 36 API checks passed, including CRUD, duplicate handling, validation, multi-item purchases, price calculation, payment status transitions, overpayment rejection, delete protection, reports and rollback on insufficient stock.
- 47 browser checks passed across all eight pages, including row counts, search filters, modals, dynamic item rows, live price/balance calculations, report filtering, mobile navigation and zero console errors.
- All backend and frontend JavaScript files pass Node syntax checks.

Useful commands:

```powershell
# Syntax-check backend code
Get-ChildItem -Recurse -Filter *.js | Where-Object { $_.FullName -notmatch '\\public\\' } | ForEach-Object { node --check $_.FullName }

# Reset the demonstration database
npm run db:init
```

## Deployment

The application is ready to deploy to any Node.js host with a MySQL 8 database. It uses `process.env.PORT` and listens on all interfaces.

### Railway (recommended)

1. Push this project to GitHub (`.env` and `node_modules` are ignored).
2. Create a Railway project and add a **MySQL** service.
3. Add an application service from the GitHub repository.
4. Set these variables on the application service:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` from the MySQL service.
   - `LOW_STOCK_THRESHOLD=10`.
   - Do not set `PORT`; Railway provides it.
5. Set the start command to `npm start`.
6. Run `npm run db:init` once from the application service shell to create and seed the cloud database.
7. Generate a public domain in Railway and open it.

### Any VPS or cPanel Node host

1. Upload the project and run `npm install --omit=dev`.
2. Create a MySQL 8 database and user.
3. Create `.env` from `.env.example` with the production credentials.
4. Run `npm run db:init`.
5. Start with a process manager such as PM2: `pm2 start server.js --name batloung-farm`.
6. Put Nginx or Apache in front of the Node port and enable HTTPS.

### Production notes

- Use a dedicated MySQL user, not `root`.
- Set `DB_HOST` to the private database hostname where possible.
- Keep `.env` out of version control.
- If the provider requires TLS for MySQL, add the CA certificate and pass an `ssl` option in `config/db.js`.
- Run `npm run db:init` only when you intend to reset the database. Back up production data first.

## Demo Video Outline

1. Show the dashboard metrics and low-stock alerts.
2. Create a supplier, edit it and search the list.
3. Add a fruit with three different prices and show its stock modal.
4. Record a multi-item purchase and show stock increasing.
5. Attempt a sale larger than available stock and show the rejection.
6. Record a valid credit sale with a deposit and show `PARTIALLY_PAID`.
7. Record the outstanding payment and show the status change to `PAID`.
8. Show the revenue, top-fruit, top-vendor and stock reports.
9. Briefly show the responsive mobile layout.

## Troubleshooting

**`Access denied for user 'root'@'localhost'`**

The password in `.env` does not match MySQL. Update `DB_PASSWORD` and restart the server.

**`ECONNREFUSED 127.0.0.1:3306`**

Start the MySQL service:

```powershell
Start-Service MySQL80
```

**Port 3000 already in use**

Change `PORT` in `.env`, or stop the process using the port:

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
```

**Reset all data**

```powershell
npm run db:init
```

**API is running but pages show an error**

Open http://localhost:3000/api/health. If it returns `503`, fix the database connection first.
