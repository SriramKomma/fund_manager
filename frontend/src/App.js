import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import MoneyManager from "./components/MoneyManager";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

const App = () => {
  const isAuthenticated = !!JSON.parse(localStorage.getItem("user"))?.token;

  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/login" component={Login} />
        <Route exact path="/register" component={Register} />
        <ProtectedRoute exact path="/" component={MoneyManager} />
        {isAuthenticated ? <Redirect to="/" /> : <Redirect to="/login" />}
      </Switch>
    </BrowserRouter>
  );
};

export default App;
