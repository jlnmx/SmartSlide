import React from "react";

const Textarea = ({ value, onChange, placeholder, className }) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`
        border border-gray-200 rounded-2xl p-6 w-full resize-none
        focus:outline-none focus:ring-2 focus:ring-[#111]
        text-base leading-relaxed shadow-sm bg-[#fafafa]
        placeholder-gray-400 text-gray-800
        ${className}`}
    />
  );
};

export default Textarea;
