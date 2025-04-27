import React from "react";
import Navbar from "./Navbar";
import "../styles/Templates.css";

const Templates = () => {
  const categories = [
    {
      id: 1,
      name: "Business",
      templates: [
        { id: 1, title: "Business Plan" },
        { id: 2, title: "Marketing Strategy" },
        { id: 3, title: "Sales Pitch" },
      ],
    },
    {
      id: 2,
      name: "Education",
      templates: [
        { id: 4, title: "Lesson Plan" },
        { id: 5, title: "Research Presentation" },
        { id: 6, title: "Classroom Activity" },
      ],
    },
    {
      id: 3,
      name: "Creative",
      templates: [
        { id: 7, title: "Portfolio Showcase" },
        { id: 8, title: "Storytelling" },
        { id: 9, title: "Design Proposal" },
      ],
    },
  ];

  return (
    <div>
      <Navbar />
      <div className="templates-container">
        <header className="templates-header">
          <h1 className="templates-title">TEMPLATES</h1>
          <input
            type="text"
            placeholder="Search templates..."
            className="search-bar"
          />
        </header>
        <section className="categories-list">
          {categories.map((category) => (
            <div key={category.id} className="category">
              <h2 className="category-title">{category.name}</h2>
              <div className="templates-list">
                {category.templates.map((template) => (
                  <a
                    key={template.id}
                    href="#"
                    className="template-card"
                    onClick={() => alert(`Clicked on ${template.title}`)}
                  >
                    <div className="template-placeholder"></div>
                    <h3 className="template-title">{template.title}</h3>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </section>
        <a href="#" className="help-link">Need help?</a>
      </div>
    </div>
  );
};

export default Templates;