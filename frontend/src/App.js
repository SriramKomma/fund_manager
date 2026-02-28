import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import MoneyManager from "./components/MoneyManager";
import ModeSelection from "./components/ModeSelection";
import GroupManager from "./components/GroupManager";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

const App = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const isAuthenticated = !!user?.token;
  const appMode = localStorage.getItem("appMode");

  // If not authenticated, go to login
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Redirect to="/login" />
        </Switch>
      </BrowserRouter>
    );
  }

  // If authenticated but no mode selected, go to mode selection
  if (!appMode) {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/mode-selection" component={ModeSelection} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Redirect to="/mode-selection" />
        </Switch>
      </BrowserRouter>
    );
  }

  // If authenticated with mode, route based on mode
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/login" component={Login} />
        <Route exact path="/register" component={Register} />
        <Route exact path="/mode-selection" component={ModeSelection} />
        
        {appMode === "personal" ? (
          <ProtectedRoute exact path="/" component={MoneyManager} />
        ) : (
          <ProtectedRoute exact path="/groups" component={GroupManager} />
        )}
        
        {appMode === "personal" ? (
          <Redirect to="/" />
        ) : (
          <Redirect to="/groups" />
        )}
      </Switch>
    </BrowserRouter>
  );
};

export default App;
