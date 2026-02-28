import { Component } from "react";
import { Redirect } from "react-router-dom";
import axios from "axios";
import "./index.css";

const API_URL = process.env.REACT_APP_API_URL || "";

class GroupManager extends Component {
  state = {
    groups: [],
    selectedGroup: null,
    showCreateModal: false,
    showExpenseModal: false,
    newGroup: { groupName: "", monthlyRent: "", members: "" },
    newExpense: { title: "", amount: "", paidBy: "", type: "Common" },
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
      console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  addExpense = async () => {
    const { newExpense, selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    try {
      await axios.post(`${API_URL}/groups/${selectedGroup.groupId}/expenses`, {
        ...newExpense,
        amount: parseInt(newExpense.amount),
        splitBetween: selectedGroup.members.map(m => m.name)
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      
      this.setState({ showExpenseModal: false, newExpense: { title: "", amount: "", paidBy: "", type: "Common" } });
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

  deleteGroup = async () => {
    const { selectedGroup } = this.state;
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const token = user.token || "";

    if (!window.confirm("Are you sure you want to delete this group? All expenses will be deleted.")) return;

    try {
      await axios.delete(`${API_URL}/groups/${selectedGroup.groupId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        withCredentials: true,
      });
      this.setState({ selectedGroup: null });
      this.fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
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

  render() {
    const { 
      groups, selectedGroup, showCreateModal, showExpenseModal, 
      newGroup, newExpense, balance, expenses, loading, activeTab, redirectTo 
    } = this.state;

    if (redirectTo) {
      return <Redirect to={redirectTo} />;
    }

    if (loading) {
      return <div className="loading">Loading...</div>;
    }

    // If no group selected, show groups list
    if (!selectedGroup) {
      return (
        <div className="group-list-container">
          <div className="group-list-header">
            <h1>My Groups</h1>
            <button className="btn-primary" onClick={() => this.setState({ showCreateModal: true })}>
              + Create Group
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="no-groups">
              <p>No groups yet. Create your first group to start tracking shared expenses!</p>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map(group => (
                <div key={group.groupId} className="group-card" onClick={() => this.selectGroup(group)}>
                  <h3>{group.groupName}</h3>
                  <p className="members-count">{group.members.length} Members</p>
                  <p className="rent-amount">Rent: ₹{group.monthlyRent}/month</p>
                  <div className="rent-status">
                    {group.members.filter(m => m.rentPaid).length}/{group.members.length} paid rent
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCreateModal && (
            <div className="modal-overlay" onClick={() => this.setState({ showCreateModal: false })}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Create New Group</h2>
                <div className="form-group">
                  <label>Group Name</label>
                  <input
                    type="text"
                    placeholder="e.g., PG Room - 204"
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
                </div>
                <div className="modal-actions">
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
          <h1>{selectedGroup.groupName}</h1>
          <button className="logout-btn" onClick={this.logout}>Logout</button>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "dashboard" })}
          >
            Dashboard
          </button>
          <button 
            className={`tab ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => this.setState({ activeTab: "expenses" })}
          >
            Expenses
          </button>
        </div>

        {activeTab === "dashboard" && balance && (
          <div className="dashboard-content">
            <div className="summary-cards">
              <div className="summary-card total-rent">
                <h3>Monthly Rent</h3>
                <p className="amount">₹{balance.monthlyRent}</p>
                <p className="sub">per person</p>
              </div>
              <div className="summary-card rent-collected">
                <h3>Rent Collected</h3>
                <p className="amount">₹{balance.rentCollected}</p>
                <p className="sub">{balance.totalMembers - balance.totalMembers} pending</p>
              </div>
              <div className="summary-card rent-pending">
                <h3>Rent Pending</h3>
                <p className="amount">₹{balance.rentPending}</p>
                <p className="sub">{balance.totalMembers - selectedGroup.members.filter(m => m.rentPaid).length} members</p>
              </div>
            </div>

            <div className="members-section">
              <div className="section-header">
                <h2>Members & Rent Status</h2>
                <button className="btn-small" onClick={this.resetRent}>Reset Monthly Rent</button>
              </div>
              <div className="members-list">
                {balance.balances.map(member => (
                  <div key={member.name} className={`member-card ${member.rentPaid ? "paid" : "pending"}`}>
                    <div className="member-info">
                      <h4>{member.name}</h4>
                      <p className="balance">
                        {member.netBalance > 0 ? `+₹${member.netBalance} to receive` : 
                         member.netBalance < 0 ? `₹${Math.abs(member.netBalance)} owes` : 
                         "Settled"}
                      </p>
                    </div>
                    <div className="rent-toggle">
                      <span className={`rent-badge ${member.rentPaid ? "paid" : ""}`}>
                        {member.rentPaid ? "Paid" : "Pending"}
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
              <h2>Group Expenses</h2>
              <button className="btn-primary" onClick={() => this.setState({ showExpenseModal: true })}>
                + Add Expense
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="no-expenses">
                <p>No expenses yet. Add your first group expense!</p>
              </div>
            ) : (
              <div className="expenses-list">
                {expenses.map(expense => (
                  <div key={expense.expenseId} className="expense-item">
                    <div className="expense-info">
                      <h4>{expense.title}</h4>
                      <p>Paid by: {expense.paidBy}</p>
                      <p className="date">{expense.date}</p>
                    </div>
                    <div className="expense-amount">
                      <p className="amount">₹{expense.amount}</p>
                      <button className="delete-btn" onClick={() => this.deleteExpense(expense.expenseId)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="expense-summary">
              <h3>Total: ₹{expenses.reduce((sum, e) => sum + e.amount, 0)}</h3>
              <p>₹{(expenses.reduce((sum, e) => sum + e.amount, 0) / selectedGroup.members.length).toFixed(0)} per person</p>
            </div>
          </div>
        )}

        {showExpenseModal && (
          <div className="modal-overlay" onClick={() => this.setState({ showExpenseModal: false })}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Add Group Expense</h2>
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
              <div className="form-group">
                <label>Type</label>
                <select
                  value={newExpense.type}
                  onChange={e => this.setState({ newExpense: { ...newExpense, type: e.target.value } })}
                >
                  <option value="Common">Common (Split equally)</option>
                  <option value="Individual">Individual</option>
                </select>
              </div>
              <div className="modal-actions">
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
