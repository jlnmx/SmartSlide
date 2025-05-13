import React from "react";
import ReactDOM from "react-dom";
import "./styles/App.css";
import MainRouter from "./components/MainRouter";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <MainRouter />
  </React.StrictMode>
);