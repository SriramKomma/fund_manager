# Money Manager

A full-stack personal finance management application to track income, expenses, and generate financial reports.

![Money Manager](https://cdn-icons-png.flaticon.com/512/2995/2995353.png)

## Features

### Personal Mode
- **User Authentication** - Secure registration and login with JWT tokens
- **Transaction Management** - Add, edit, and delete income/expense transactions
- **Financial Overview** - View balance, total income, and total expenses at a glance
- **QR Code Scanner** - Scan UPI QR codes to add expenses instantly
- **PDF Reports** - Download transaction history as PDF reports
- **Dark/Light Mode** - Toggle between dark and light themes
- **Monthly Reset** - Automatic monthly balance carry-forward (cron job)
- **Responsive Design** - Works on desktop and mobile devices

### Group / PG Mode (Bachelor Room Management)
- **Multiple Groups** - Create and manage multiple PG/room groups
- **Member Management** - Add/remove members to groups
- **Rent Tracking** - Track monthly rent payments per member
- **Rent Status** - View who has paid rent and who hasn't
- **Expense Splitting** - Split common expenses equally among members
- **Balance Summary** - View who owes whom and by how much
- **Expense History** - Track all group expenses with dates
- **Monthly Reset** - Reset rent status for new month

## Tech Stack

### Frontend
- React.js 19
- React Router v5
- Axios
- js-cookie
- QR Scanner

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- JWT Authentication
- bcryptjs
- PDFKit

## Project Structure

```
fund_manager/
├── backend/
│   ├── server.js          # Main server file
│   ├── package.json
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   ├── MoneyManager/
│   │   │   ├── MoneyDetails/
│   │   │   ├── TransactionItem/
│   │   │   └── ProtectedRoute/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── public/
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/SriramKomma/fund_manager.git
cd fund_manager
```

2. **Install backend dependencies**

```bash
cd backend
npm install
```

3. **Install frontend dependencies**

```bash
cd ../frontend
npm install
```

### Configuration

1. **Backend - Create `.env` file in `backend/` directory**

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

2. **Frontend - Create `.env` file in `frontend/` directory**

```env
REACT_APP_API_URL=http://localhost:3001
```

### Running the Application

1. **Start the backend server**

```bash
cd backend
npm start
```

The server will run on `http://localhost:3001`

2. **Start the frontend development server**

```bash
cd frontend
npm start
```

The application will open at `http://localhost:3000`

## Deployment

### Backend (Render/Railway/Vercel)

1. Connect your GitHub repository to your preferred deployment platform
2. Set environment variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Your secret key for JWT tokens
   - `NODE_ENV`: production
3. The server will automatically start using `npm start`

### Frontend (Vercel/Netlify)

1. Connect your GitHub repository
2. Set environment variable:
   - `REACT_APP_API_URL`: Your deployed backend URL
3. Deploy

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login user |
| POST | `/logout` | Logout user |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transaction` | Get all transactions (protected) |
| POST | `/transaction` | Add new transaction (protected) |
| PUT | `/transaction/:id` | Update transaction (protected) |
| DELETE | `/transaction/:id` | Delete transaction (protected) |
| DELETE | `/transactions/clear` | Clear all transactions (protected) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/generate-pdf` | Download PDF report (protected) |

### Groups (PG/Bachelor Room)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | Get user's groups |
| POST | `/groups` | Create new group |
| GET | `/groups/:groupId` | Get group details |
| PUT | `/groups/:groupId` | Update group |
| DELETE | `/groups/:groupId` | Delete group |
| POST | `/groups/:groupId/members` | Add member to group |
| DELETE | `/groups/:groupId/members/:name` | Remove member |
| PUT | `/groups/:groupId/members/:name/rent` | Toggle rent paid status |
| GET | `/groups/:groupId/expenses` | Get group expenses |
| POST | `/groups/:groupId/expenses` | Add group expense |
| DELETE | `/groups/:groupId/expenses/:id` | Delete expense |
| GET | `/groups/:groupId/balance` | Get balance summary |
| POST | `/groups/:groupId/reset-rent` | Reset monthly rent |

## Screenshots

### Login Page
![Login](https://via.placeholder.com/800x600?text=Login+Page)

### Registration Page
![Register](https://via.placeholder.com/800x600?text=Register+Page)

### Dashboard
![Dashboard](https://via.placeholder.com/800x600?text=Dashboard)

### Add Transaction
![Add Transaction](https://via.placeholder.com/800x600?text=Add+Transaction)

### Transaction History
![History](https://via.placeholder.com/800x600?text=Transaction+History)

### Dark Mode
![Dark Mode](https://via.placeholder.com/800x600?text=Dark+Mode)

## Usage

### Personal Mode
1. **Register** - Create a new account with username, email, and password
2. **Login** - Use your credentials to log in
3. **Add Income** - Click "Add Transaction", enter title, amount, select "Income"
4. **Add Expense** - Click "Add Transaction", enter title, amount, select "Expenses"
5. **View Balance** - See your current balance, total income, and expenses at the top
6. **Edit/Delete** - Use the action buttons to edit or delete transactions
7. **Download Report** - Click the download icon to get a PDF of all transactions
8. **QR Scanner** - Click the QR icon to scan UPI payment codes
9. **Logout** - Click the logout icon to sign out

### Group/PG Mode
1. **Choose Mode** - After login, select "Group / PG" mode
2. **Create Group** - Click "+ Create Group", enter group name, monthly rent, and member names
3. **View Dashboard** - See rent collection status, pending payments, and member balances
4. **Track Rent** - Mark rent as paid/unpaid for each member
5. **Add Expenses** - Click "+ Add Expense" to split bills among members
6. **View Balances** - See who owes whom and by how much
7. **Reset Monthly** - Reset rent status for a new month
8. **Switch Mode** - Go to mode selection to switch between Personal and Group modes

## Security Features

- JWT token authentication
- HTTP-only cookies for session management
- Password hashing with bcrypt
- Protected routes with token verification
- CORS configuration for secure cross-origin requests

## License

MIT License

## Author

Sriram Komma

## Support

For issues or questions, please open a GitHub issue.
