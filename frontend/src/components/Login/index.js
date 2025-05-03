import { Component } from "react";
import axios from "axios";
import "./index.css";

class Login extends Component {
  state = {
    email: "",
    password: "",
    errorMsg: "",
  };

  onSubmitForm = async (event) => {
    event.preventDefault();
    const { email, password } = this.state;

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        { email, password },
        { withCredentials: true }
      );
      console.log("Login response:", response.data);
      localStorage.setItem(
        "user",
        JSON.stringify({
          userId: response.data.userId,
          username: response.data.username,
        })
      );
      window.location.href = "/";
    } catch (error) {
      console.error("Login error:", error.response?.data || error);
      this.setState({
        errorMsg: error.response?.data?.error || "Login failed",
      });
    }
  };

  onChangeEmail = (event) => this.setState({ email: event.target.value });
  onChangePassword = (event) => this.setState({ password: event.target.value });

  render() {
    const { email, password, errorMsg } = this.state;

    return (
      <div className="login-container">
        <form className="login-form" onSubmit={this.onSubmitForm}>
          <h1>Login</h1>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={this.onChangeEmail}
              className="input-field"
              placeholder="Enter your email"
              required
              autocomplete="email"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={this.onChangePassword}
              className="input-field"
              placeholder="Enter your password"
              required
              autocomplete="current-password" // Added
            />
          </div>
          {errorMsg && <p className="error-msg">{errorMsg}</p>}
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>
    );
  }
}

export default Login;
