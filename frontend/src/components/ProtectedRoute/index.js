import { Redirect, Route } from "react-router-dom";

const ProtectedRoute = (props) => {
  const token = JSON.parse(localStorage.getItem("user"))?.token;
  if (!token) {
    return <Redirect to="/login" />;
  }
  return <Route {...props} />;
};

export default ProtectedRoute;
