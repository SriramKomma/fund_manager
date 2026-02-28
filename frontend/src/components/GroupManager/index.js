import { Component } from "react";
import { Redirect } from "react-router-dom";
import axios from "axios";
import "./index.css";

const API_URL = process.env.REACT_APP_API_URL || "";

const EXPENSE_CATEGORIES = [
  { id: "rent", name: "Rent", icon: "🏠" },
  { id: "groceries", name: "Groceries", icon: "🛒" },
  { id: "electricity", name: "Electricity", icon: "💡" },
  { id: "wifi", name: "WiFi", icon: "📶" },
  { id: "cooking", name: "Cooking/Gas", icon: "🔥" },
  { id: "cleaning", name: "Cleaning", icon: "🧹" },
  { id: "utensils", name: "Utensils", icon: "🍳" },
  { id: "maintenance", name: "Maintenance", icon: "🔧" },
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
    showSettleModal: false,
    newGroup: { groupName: "", monthlyRent: "", members: "" },
    newExpense: { title: "", amount: "", paidBy: "", category: "other" },
    settleExpense: { paidBy: "", paidTo: "", amount: "" },
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
    
    if (!newGroup.groupName || !newGroup.monthlyRent) {
      alert("Please enter group name and monthly rent");
      return;
    }

    const members = newGroup.members
      .split(",")
      .map(m => m.trim())
      .filter(m => m)
      .map(name => ({ name, userId: null, rentPaid: false, rentPaidDate: null }));

    try {
      await axios.post(`${API_URL}/groups`, {
        groupName: newGroup.groupName,
        monthlyRent: newGroup.monthlyRent,
        members
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.setState({ showCreateModal: false, newGroup: { groupName: "", monthlyRent: "", members: "" } });
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

  toggleRentStatus = async (memberName, currentStatus) => {
    const { selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    try {
      await axios.put(`${API_URL}/groups/${selectedGroup.groupId}/members/${memberName}/rent`, {
        rentPaid: !currentStatus
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error updating rent status:", error);
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

  resetRent = async () => {
    const { selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    if (!window.confirm("Are you sure you want to reset rent status for all members?")) return;

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.groupId}/reset-rent`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      this.selectGroup(selectedGroup);
    } catch (error) {
      console.error("Error resetting rent:", error);
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
      groups, selectedGroup, showCreateModal, showExpenseModal, 
      newGroup, newExpense, balance, expenses, loading, activeTab, redirectTo 
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
              <p className="subtitle">Manage your PG/Bachelor room expenses</p>
            </div>
            <button className="btn-primary" onClick={() => this.setState({ showCreateModal: true })}>
              <span>+</span> Create Group
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="no-groups">
              <div className="empty-icon">🏠</div>
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
                    <span className="group-emoji">🏠</span>
                  </div>
                  <div className="group-card-body">
                    <h3>{group.groupName}</h3>
                    <div className="group-stats">
                      <div className="stat">
                        <span className="stat-value">{group.members.length}</span>
                        <span className="stat-label">Members</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">₹{group.monthlyRent}</span>
                        <span className="stat-label">Rent</span>
                      </div>
                    </div>
                    <div className="rent-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${(group.members.filter(m => m.rentPaid).length / group.members.length) * 100}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {group.members.filter(m => m.rentPaid).length}/{group.members.length} paid rent
                      </span>
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
                      placeholder="e.g., PG Room - 204, Hostel A"
                      value={newGroup.groupName}
                      onChange={e => this.setState({ newGroup: { ...newGroup, groupName: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Monthly Rent (per person)</label>
                    <input
                      type="number"
                      placeholder="e.g., 5000"
                      value={newGroup.monthlyRent}
                      onChange={e => this.setState({ newGroup: { ...newGroup, monthlyRent: e.target.value } })}
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
            💰 Dashboard
          </button>
          <button 
            className={`tab ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "expenses" })}
          >
            📋 Expenses
          </button>
          <button 
            className={`tab ${activeTab === "members" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "members" })}
          >
            👥 Members
          </button>
        </div>

        {activeTab === "dashboard" && balance && (
          <div className="dashboard-content">
            <div className="summary-cards">
              <div className="summary-card total-rent">
                <div className="card-icon">🏠</div>
                <div className="card-info">
                  <h3>Monthly Rent</h3>
                  <p className="amount">₹{balance.monthlyRent}</p>
                  <p className="sub">per person</p>
                </div>
              </div>
              <div className="summary-card rent-collected">
                <div className="card-icon">✅</div>
                <div className="card-info">
                  <h3>Collected</h3>
                  <p className="amount">₹{balance.rentCollected}</p>
                  <p className="sub">{balance.totalMembers - selectedGroup.members.filter(m => m.rentPaid).length} pending</p>
                </div>
              </div>
              <div className="summary-card rent-pending">
                <div className="card-icon">⏳</div>
                <div className="card-info">
                  <h3>Pending</h3>
                  <p className="amount">₹{balance.rentPending}</p>
                  <p className="sub">{selectedGroup.members.filter(m => !m.rentPaid).length} members</p>
                </div>
              </div>
              <div className="summary-card total-expenses">
                <div className="card-icon">💸</div>
                <div className="card-info">
                  <h3>Total Expenses</h3>
                  <p className="amount">₹{expenses.reduce((sum, e) => sum + e.amount, 0)}</p>
                  <p className="sub">{expenses.length} transactions</p>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <button className="quick-action-btn" onClick={() => this.setState({ showExpenseModal: true })}>
                <span>➕</span> Add Expense
              </button>
              <button className="quick-action-btn secondary" onClick={() => this.setState({ showSettleModal: true })}>
                <span>🤝</span> Settle Up
              </button>
            </div>

            <div className="members-section">
              <div className="section-header">
                <h2>👥 Member Balances</h2>
                <button className="btn-small" onClick={this.resetRent}>Reset Monthly</button>
              </div>
              <div className="members-list">
                {balance.balances.map((member, index) => (
                  <div key={member.name} className={`member-card ${member.rentPaid ? "paid" : "pending"}`}>
                    <div className="member-avatar" style={{ background: this.getMemberColor(index) }}>
                      {this.getMemberInitials(member.name)}
                    </div>
                    <div className="member-info">
                      <h4>{member.name}</h4>
                      <p className="balance">
                        {member.netBalance > 0 ? `+₹${member.netBalance} to receive` : 
                         member.netBalance < 0 ? `₹${Math.abs(member.netBalance)} owes` : 
                         "✅ Settled"}
                      </p>
                    </div>
                    <div className="rent-toggle">
                      <span className={`rent-badge ${member.rentPaid ? "paid" : ""}`}>
                        {member.rentPaid ? "✅ Paid" : "⏳ Pending"}
                      </span>
                      <button 
                        className={`toggle-btn ${member.rentPaid ? "unpay" : "pay"}`}
                        onClick={() => this.toggleRentStatus(member.name, member.rentPaid)}
                      >
                        {member.rentPaid ? "Mark Unpaid" : "Mark Paid"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="expenses-content">
            <div className="section-header">
              <h2>📋 Group Expenses</h2>
              <button className="btn-primary" onClick={() => this.setState({ showExpenseModal: true })}>
                ➕ Add Expense
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="no-expenses">
                <div className="empty-icon">📝</div>
                <h3>No expenses yet</h3>
                <p>Add your first group expense!</p>
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
                      <p className="split">₹{(expense.amount / expense.splitBetween.length).toFixed(0)}/person</p>
                      <button className="delete-btn" onClick={() => this.deleteExpense(expense.expenseId)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expenses.length > 0 && (
              <div className="expense-summary">
                <div className="summary-row">
                  <span>Total Expenses</span>
                  <span className="total-amount">₹{expenses.reduce((sum, e) => sum + e.amount, 0)}</span>
                </div>
                <div className="summary-row">
                  <span>Per Person</span>
                  <span>₹{(expenses.reduce((sum, e) => sum + e.amount, 0) / selectedGroup.members.length).toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && selectedGroup && (
          <div className="members-content">
            <div className="section-header">
              <h2>👥 All Members</h2>
            </div>
            <div className="members-grid">
              {selectedGroup.members.map((member, index) => (
                <div key={index} className={`member-detail-card ${member.rentPaid ? "paid" : "pending"}`}>
                  <div className="member-avatar large" style={{ background: this.getMemberColor(index) }}>
                    {this.getMemberInitials(member.name)}
                  </div>
                  <h3>{member.name}</h3>
                  <div className="member-status">
                    <span className={`status-badge ${member.rentPaid ? "paid" : ""}`}>
                      {member.rentPaid ? "✅ Rent Paid" : "⏳ Rent Pending"}
                    </span>
                  </div>
                  <div className="member-actions">
                    <button 
                      className={`toggle-btn ${member.rentPaid ? "unpay" : "pay"}`}
                      onClick={() => this.toggleRentStatus(member.name, member.rentPaid)}
                    >
                      {member.rentPaid ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>
    );
  }
}

export default GroupManager;
