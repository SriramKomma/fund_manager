import { Component } from "react";
import { Redirect } from "react-router-dom";
import axios from "axios";
import "./index.css";

const API_URL = process.env.REACT_APP_API_URL || "";

class ModeSelection extends Component {
  state = {
    mode: "",
    redirectTo: null,
  };

  selectMode = (mode) => {
    localStorage.setItem("appMode", mode);
    this.setState({ mode, redirectTo: mode === "personal" ? "/" : "/groups" });
  };

  render() {
    const { redirectTo } = this.state;

    if (redirectTo) {
      return <Redirect to={redirectTo} />;
    }

    return (
      <div className="mode-selection-container">
        <div className="mode-selection-card">
          <div className="logo-container">
            <img
              src="https://cdn-icons-png.flaticon.com/512/2995/2995353.png"
              className="logo-image"
              alt="money manager logo"
            />
            <h1 className="app-title">Money Manager</h1>
          </div>
          
          <h2 className="mode-title">Choose Your Mode</h2>
          <p className="mode-subtitle">Select how you want to track your expenses</p>

          <div className="mode-options">
            <div 
              className="mode-option personal-mode"
              onClick={() => this.selectMode("personal")}
            >
              <div className="mode-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h3>Personal</h3>
              <p>Track your own income and expenses</p>
            </div>

            <div 
              className="mode-option group-mode"
              onClick={() => this.selectMode("group")}
            >
              <div className="mode-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <h3>Group / PG</h3>
              <p>Manage shared expenses with roommates</p>
            </div>
          </div>

          <div className="mode-features">
            <div className="feature-list">
              <h4>Group Mode Features:</h4>
              <ul>
                <li>Track rent payments</li>
                <li>Split expenses among members</li>
                <li>View who owes whom</li>
                <li>Manage PG/Bachelor room finances</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ModeSelection;
