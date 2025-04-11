import React from "react";

function Button(props) {
  const { onClick, disabled, className = "", children } = props;

  return React.createElement(
    "button",
    {
      onClick,
      disabled,
      className: `ptc-button ${className}`.trim(), // `ptc-button` = PasteToCreate button
    },
    children
  );
}

export default Button;
