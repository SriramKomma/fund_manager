import { Component } from "react";
import { Redirect } from "react-router-dom";
import axios from "axios";
import "./index.css";

const API_URL = process.env.REACT_APP_API_URL || "";

const EXPENSE_CATEGORIES = [
  { id: "groceries", name: "Groceries", icon: "🛒" },
  { id: "electricity", name: "Electricity", icon: "💡" },
  { id: "wifi", name: "WiFi", icon: "📶" },
  { id: "cooking", name: "Cooking/Gas", icon: "🔥" },
  { id: "rent", name: "Rent", icon: "🏠" },
  { id: "maintenance", name: "Maintenance", icon: "🔧" },
  { id: "food", name: "Food", icon: "🍕" },
  { id: "other", name: "Other", icon: "📦" },
];

const MEMBER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"
];

class GroupManager extends Component {
  state = {
    groups: [],
    selectedGroup: null,
    showCreateModal: false,
    showExpenseModal: false,
    showPaymentModal: false,
    showAddMoneyModal: false,
    newGroup: { groupName: "", monthlyContribution: "", members: "" },
    newExpense: { title: "", amount: "", paidBy: "", category: "other" },
    newPayment: { from: "", to: "", amount: "", note: "" },
    addMoney: { memberName: "", amount: "", note: "" },
    balance: null,
    expenses: [],
    loading: true,
    activeTab: "dashboard",
    redirectTo: null,
  };

  componentDidMount() {
    this.fetchGroups();
  }

  fetchGroups = async () => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";
    
    try {
      const response = await axios.get(`${API_URL}/groups`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      this.setState({ groups: response.data, loading: false });
    } catch (error) {
      console.error("Error fetching groups:", error);
      this.setState({ loading: false });
    }
  };

  selectGroup = async (group) => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";
    
    try {
      const [balanceRes, expensesRes] = await Promise.all([
        axios.get(`${API_URL}/groups/${group.groupId}/balance`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          withCredentials: true,
        }),
        axios.get(`${API_URL}/groups/${group.groupId}/expenses`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          withCredentials: true,
        })
      ]);
      
      this.setState({ 
        selectedGroup: group, 
        balance: balanceRes.data,
        expenses: expensesRes.data
      });
    } catch (error) {
      console.error("Error fetching group details:", error);
    }
  };

  createGroup = async () => {
    const { newGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";
    
    if (!newGroup.groupName) {
      alert("Please enter group name");
      return;
    }

    const members = newGroup.members
      .split(",")
      .map(m => m.trim())
      .filter(m => m)
      .map(name => ({ name, userId: null, balance: 0, totalPaid: 0 }));

    try {
      await axios.post(`${API_URL}/groups`, {
        groupName: newGroup.groupName,
        monthlyContribution: newGroup.monthlyContribution || 0,
        members
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.setState({ showCreateModal: false, newGroup: { groupName: "", monthlyContribution: "", members: "" } });
      this.fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Failed to create group");
    }
  };

  addExpense = async () => {
    const { newExpense, selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    if (!newExpense.title || !newExpense.amount || !newExpense.paidBy) {
      alert("Please fill all fields");
      return;
    }

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.groupId}/expenses`, {
        ...newExpense,
        amount: parseInt(newExpense.amount),
        splitBetween: selectedGroup.members.map(m => m.name)
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.setState({ showExpenseModal: false, newExpense: { title: "", amount: "", paidBy: "", category: "other" } });
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to add expense");
    }
  };

  makePayment = async () => {
    const { newPayment, selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    if (!newPayment.from || !newPayment.to || !newPayment.amount) {
      alert("Please fill all fields");
      return;
    }

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.groupId}/pay`, {
        from: newPayment.from,
        to: newPayment.to,
        amount: parseInt(newPayment.amount),
        note: newPayment.note
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.setState({ showPaymentModal: false, newPayment: { from: "", to: "", amount: "", note: "" } });
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error making payment:", error);
      alert("Failed to make payment");
    }
  };

  addGroupMoney = async () => {
    const { addMoney, selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    if (!addMoney.memberName || !addMoney.amount) {
      alert("Please fill all fields");
      return;
    }

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.groupId}/add-money`, {
        memberName: addMoney.memberName,
        amount: parseInt(addMoney.amount),
        note: addMoney.note
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.setState({ showAddMoneyModal: false, addMoney: { memberName: "", amount: "", note: "" } });
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error adding money:", error);
      alert("Failed to add money");
    }
  };

  deleteExpense = async (expenseId) => {
    const { selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    try {
      await axios.delete(`${API_URL}/groups/${selectedGroup.groupId}/expenses/${expenseId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  resetBalances = async () => {
    const { selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    if (!window.confirm("Are you sure you want to reset all balances to zero?")) return;

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.groupId}/reset-balances`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error resetting balances:", error);
    }
  };

  goBack = () => {
    this.setState({ selectedGroup: null });
  };

  logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("appMode");
    this.setState({ redirectTo: "/login" });
  };

  getMemberColor = (index) => MEMBER_COLORS[index % MEMBER_COLORS.length];

  getMemberInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  getCategoryIcon = (categoryId) => {
    const category = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : "📦";
  };

  render() {
    const { 
      groups, selectedGroup, showCreateModal, showExpenseModal, showPaymentModal, showAddMoneyModal,
      newGroup, newExpense, newPayment, addMoney, balance, expenses, loading, activeTab, redirectTo 
    } = this.state;

    if (redirectTo) {
      return <Redirect to={redirectTo} />;
    }

    if (loading) {
      return <div className="loading"><div className="spinner"></div>Loading...</div>;
    }

    // If no group selected, show groups list
    if (!selectedGroup) {
      return (
        <div className="group-list-container">
          <div className="group-list-header">
            <div>
              <h1>My Groups</h1>
              <p className="subtitle">Track shared expenses with roommates</p>
            </div>
            <button className="btn-primary" onClick={() => this.setState({ showCreateModal: true })}>
              <span>+</span> Create Group
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="no-groups">
              <div className="empty-icon">👥</div>
              <h3>No groups yet</h3>
              <p>Create your first group to start tracking shared expenses!</p>
              <button className="btn-primary" onClick={() => this.setState({ showCreateModal: true })}>
                Create Your First Group
              </button>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((group, index) => (
                <div key={group.groupId} className="group-card" onClick={() => this.selectGroup(group)}>
                  <div className="group-card-header" style={{ background: this.getMemberColor(index) }}>
                    <span className="group-emoji">👥</span>
                  </div>
                  <div className="group-card-body">
                    <h3>{group.groupName}</h3>
                    <div className="group-stats">
                      <div className="stat">
                        <span className="stat-value">{group.members.length}</span>
                        <span className="stat-label">Members</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">₹{group.monthlyContribution || 0}</span>
                        <span className="stat-label">Monthly</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCreateModal && (
            <div className="modal-overlay" onClick={() => this.setState({ showCreateModal: false })}>
              <div className="modal create-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Create New Group</h2>
                  <button className="close-btn" onClick={() => this.setState({ showCreateModal: false })}>×</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Room 204, Hostel A"
                      value={newGroup.groupName}
                      onChange={e => this.setState({ newGroup: { ...newGroup, groupName: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Monthly Contribution (optional)</label>
                    <input
                      type="number"
                      placeholder="e.g., 5000"
                      value={newGroup.monthlyContribution}
                      onChange={e => this.setState({ newGroup: { ...newGroup, monthlyContribution: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Member Names (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., John, Peter, Mike, Raj"
                      value={newGroup.members}
                      onChange={e => this.setState({ newGroup: { ...newGroup, members: e.target.value } })}
                    />
                    <span className="hint">Don't include yourself - you'll be added automatically</span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => this.setState({ showCreateModal: false })}>Cancel</button>
                  <button className="btn-primary" onClick={this.createGroup}>Create Group</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show selected group dashboard
    return (
      <div className="group-dashboard">
        <div className="dashboard-header">
          <button className="back-btn" onClick={this.goBack}>← Back</button>
          <div className="header-info">
            <h1>{selectedGroup.groupName}</h1>
            <span className="member-count">{selectedGroup.members.length} Members</span>
          </div>
          <button className="logout-btn" onClick={this.logout}>Logout</button>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "dashboard" })}
          >
            💰 Balances
          </button>
          <button 
            className={`tab ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "expenses" })}
          >
            📋 Expenses
          </button>
          <button 
            className={`tab ${activeTab === "settle" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "settle" })}
          >
            🤝 Settle Up
          </button>
        </div>

        {activeTab === "dashboard" && balance && (
          <div className="dashboard-content">
            <div className="summary-cards">
              <div className="summary-card total-expenses">
                <div className="card-icon">💸</div>
                <div className="card-info">
                  <h3>Total Expenses</h3>
                  <p className="amount">₹{balance.totalExpenses}</p>
                </div>
              </div>
              <div className="summary-card monthly">
                <div className="card-icon">📅</div>
                <div className="card-info">
                  <h3>Monthly Goal</h3>
                  <p className="amount">₹{balance.monthlyContribution}</p>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <button className="quick-action-btn" onClick={() => this.setState({ showExpenseModal: true })}>
                <span>➕</span> Add Expense
              </button>
              <button className="quick-action-btn secondary" onClick={() => this.setState({ showPaymentModal: true })}>
                <span>💸</span> Pay Someone
              </button>
              <button className="quick-action-btn secondary" onClick={() => this.setState({ showAddMoneyModal: true })}>
                <span>💵</span> Add Money
              </button>
            </div>

            <div className="members-section">
              <div className="section-header">
                <h2>👤 Member Balances</h2>
              </div>
              <div className="members-list">
                {balance.balances.map((member, index) => (
                  <div key={member.name} className={`member-card ${member.balance >= 0 ? "positive" : "negative"}`}>
                    <div className="member-avatar" style={{ background: this.getMemberColor(index) }}>
                      {this.getMemberInitials(member.name)}
                    </div>
                    <div className="member-info">
                      <h4>{member.name}</h4>
                      <p className="balance">
                        {member.balance > 0 ? `+₹${member.balance} to receive` : 
                         member.balance < 0 ? `₹${Math.abs(member.balance)} to pay` : 
                         "Settled"}
                      </p>
                    </div>
                    <div className="member-stats">
                      <div className="stat-item">
                        <span className="label">Paid</span>
                        <span className="value">₹{member.totalPaid}</span>
                      </div>
                      <div className="stat-item">
                        <span className="label">Balance</span>
                        <span className={`value ${member.balance >= 0 ? "positive" : "negative"}`}>
                          {member.balance >= 0 ? "+" : ""}₹{member.balance}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {balance.settlements && balance.settlements.length > 0 && (
              <div className="settlements-section">
                <div className="section-header">
                  <h2>🔄 Suggested Settlements</h2>
                </div>
                <div className="settlements-list">
                  {balance.settlements.map((settle, i) => (
                    <div key={i} className="settlement-item">
                      <span className="from">{settle.from}</span>
                      <span className="arrow">→</span>
                      <span className="to">{settle.to}</span>
                      <span className="amount">₹{settle.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="expenses-content">
            <div className="section-header">
              <h2>📋 All Transactions</h2>
              <button className="btn-primary" onClick={() => this.setState({ showExpenseModal: true })}>
                ➕ Add
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="no-expenses">
                <div className="empty-icon">📝</div>
                <h3>No expenses yet</h3>
                <p>Add your first expense!</p>
              </div>
            ) : (
              <div className="expenses-list">
                {expenses.map(expense => (
                  <div key={expense.expenseId} className="expense-item">
                    <div className="expense-icon">{this.getCategoryIcon(expense.category)}</div>
                    <div className="expense-info">
                      <h4>{expense.title}</h4>
                      <p>Paid by: <strong>{expense.paidBy}</strong> • {expense.date}</p>
                    </div>
                    <div className="expense-amount">
                      <p className="amount">₹{expense.amount}</p>
                      <button className="delete-btn" onClick={() => this.deleteExpense(expense.expenseId)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "settle" && balance && (
          <div className="settle-content">
            <div className="section-header">
              <h2>🤝 Settle Up</h2>
            </div>
            
            {balance.settlements && balance.settlements.length > 0 ? (
              <div className="settlements-full">
                <h3>How to Settle</h3>
                {balance.settlements.map((settle, i) => (
                  <div key={i} className="settlement-card">
                    <div className="settlement-person from">
                      <div className="avatar" style={{ background: this.getMemberColor(i) }}>
                        {this.getMemberInitials(settle.from)}
                      </div>
                      <span>{settle.from}</span>
                    </div>
                    <div className="settlement-arrow">
                      <span className="amount">₹{settle.amount}</span>
                      <span className="arrow">→</span>
                    </div>
                    <div className="settlement-person to">
                      <div className="avatar" style={{ background: this.getMemberColor(i + 1) }}>
                        {this.getMemberInitials(settle.to)}
                      </div>
                      <span>{settle.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-settlements">
                <div className="empty-icon">✅</div>
                <h3>All Settled!</h3>
                <p>Everyone is even - no payments needed.</p>
              </div>
            )}

            <div className="settle-actions">
              <button className="quick-action-btn" onClick={() => this.setState({ showPaymentModal: true })}>
                <span>💸</span> Record a Payment
              </button>
              <button className="quick-action-btn secondary" onClick={() => this.setState({ showAddMoneyModal: true })}>
                <span>💵</span> Add Money to Group
              </button>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showExpenseModal && (
          <div className="modal-overlay" onClick={() => this.setState({ showExpenseModal: false })}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>➕ Add Expense</h2>
                <button className="close-btn" onClick={() => this.setState({ showExpenseModal: false })}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Groceries, Electricity Bill"
                    value={newExpense.title}
                    onChange={e => this.setState({ newExpense: { ...newExpense, title: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    placeholder="e.g., 500"
                    value={newExpense.amount}
                    onChange={e => this.setState({ newExpense: { ...newExpense, amount: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <div className="category-grid">
                    {EXPENSE_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        className={`category-btn ${newExpense.category === cat.id ? "selected" : ""}`}
                        onClick={() => this.setState({ newExpense: { ...newExpense, category: cat.id } })}
                      >
                        <span className="cat-icon">{cat.icon}</span>
                        <span className="cat-name">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Paid By</label>
                  <select
                    value={newExpense.paidBy}
                    onChange={e => this.setState({ newExpense: { ...newExpense, paidBy: e.target.value } })}
                  >
                    <option value="">Select member</option>
                    {selectedGroup.members.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => this.setState({ showExpenseModal: false })}>Cancel</button>
                <button className="btn-primary" onClick={this.addExpense}>Add Expense</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="modal-overlay" onClick={() => this.setState({ showPaymentModal: false })}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>💸 Make Payment</h2>
                <button className="close-btn" onClick={() => this.setState({ showPaymentModal: false })}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>From</label>
                  <select
                    value={newPayment.from}
                    onChange={e => this.setState({ newPayment: { ...newPayment, from: e.target.value } })}
                  >
                    <option value="">Who is paying?</option>
                    {selectedGroup.members.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>To</label>
                  <select
                    value={newPayment.to}
                    onChange={e => this.setState({ newPayment: { ...newPayment, to: e.target.value } })}
                  >
                    <option value="">Who receives?</option>
                    {selectedGroup.members.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    placeholder="e.g., 1000"
                    value={newPayment.amount}
                    onChange={e => this.setState({ newPayment: { ...newPayment, amount: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Rent part payment"
                    value={newPayment.note}
                    onChange={e => this.setState({ newPayment: { ...newPayment, note: e.target.value } })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => this.setState({ showPaymentModal: false })}>Cancel</button>
                <button className="btn-primary" onClick={this.makePayment}>Record Payment</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Money Modal */}
        {showAddMoneyModal && (
          <div className="modal-overlay" onClick={() => this.setState({ showAddMoneyModal: false })}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>💵 Add Money</h2>
                <button className="close-btn" onClick={() => this.setState({ showAddMoneyModal: false })}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Member Name</label>
                  <select
                    value={addMoney.memberName}
                    onChange={e => this.setState({ addMoney: { ...addMoney, memberName: e.target.value } })}
                  >
                    <option value="">Select member</option>
                    {selectedGroup.members.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    placeholder="e.g., 2000"
                    value={addMoney.amount}
                    onChange={e => this.setState({ addMoney: { ...addMoney, amount: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label>Note (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Monthly rent"
                    value={addMoney.note}
                    onChange={e => this.setState({ addMoney: { ...addMoney, note: e.target.value } })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => this.setState({ showAddMoneyModal: false })}>Cancel</button>
                <button className="btn-primary" onClick={this.addGroupMoney}>Add Money</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default GroupManager;
