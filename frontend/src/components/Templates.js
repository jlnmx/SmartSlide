import React from "react";
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
    <div className="templates-container">
      <header className="templates-header">
        <h1>Templates</h1>
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
                <div key={template.id} className="template-card">
                  <h3>{template.title}</h3>
                  <button className="use-template-btn">Use Template</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Templates;