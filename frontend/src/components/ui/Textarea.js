import React from "react";

function Textarea(props) {
  const { value, onChange, placeholder, className = "" } = props;

  return React.createElement("textarea", {
    value,
    onChange,
    placeholder,
    className: `ptc-textarea ${className}`.trim(),
  });
}

export default Textarea;
