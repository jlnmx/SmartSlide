import React from "react";

const Button = ({ onClick, disabled, className, children }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-[#111] text-white font-semibold py-3 px-6 rounded-full
        hover:bg-[#222] disabled:bg-gray-300 disabled:cursor-not-allowed
        transition duration-300 ease-in-out text-base tracking-wide shadow-md
        ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
