# PharmaSync – Smart Pharmacy Inventory Management System

PharmaSync is a college project designed to help pharmacies manage medicine stock, track expiry dates, record sales, manage suppliers, and predict future medicine demand.

## Features

- **Inventory Management:** Add and manage medicines and their stock.
- **Expiry Tracking:** Track medicine batch numbers and expiry dates.
- **FEFO Management:** Prioritize medicines that expire first.
- **Sales Management:** Record medicine sales and update stock.
- **Supplier Management:** Maintain supplier details and manage purchases.
- **Demand Forecasting:** Predict medicine demand for the next 7 and 30 days.
- **Reorder Suggestions:** Suggest when and how much stock to purchase.
- **Dashboard:** View inventory, sales, and forecasting information.

## Technologies Used

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Charts:** Recharts
- **Build Tool:** Vite

## Project Structure

```text
PharmaSync/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── app.ts
│       └── server.ts
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── types/
│       ├── App.tsx
│       └── main.tsx
└── README.md
```

## Installation and Setup

### Prerequisites

- Node.js 18 or later
- npm
- MongoDB Community Server or a MongoDB Atlas account

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `backend` directory and configure your MongoDB connection.

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pharmasync
```

For MongoDB Atlas, use your own connection string instead.

Keep database credentials private and do not upload your `.env` file to GitHub.

### 4. Start the backend

From the `backend` directory, run the development command defined in `backend/package.json`, for example:

```bash
npm run dev
```

### 5. Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Open the local URL displayed by Vite in your browser, usually `http://localhost:5173`.

## Demand Forecasting

PharmaSync uses historical medicine sales to estimate future demand and generate restocking suggestions.

The forecasting feature supports:
- 7-day demand forecasts
- 30-day demand forecasts
- Stock-based reorder recommendations

## Project Objective

The goal of PharmaSync is to reduce manual pharmacy inventory work, improve expiry-date management, prevent unnecessary stock shortages, and help pharmacy owners make better restocking decisions.

## Author

**Kethana Mellachervu**
