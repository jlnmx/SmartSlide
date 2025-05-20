import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/Templates.css";

const categoryMap = {
  Business: [
    "business_template",
    "business_plan",
    "marketing_strategy",
    "sales_pitch",
  ],
  Education: [
    "education_template",
    "lesson_plan",
    "research_presentation",
    "classroom_activity",
  ],
  Creative: [
    "creative_template",
    "portfolio_showcase",
    "storytelling",
    "design_proposal",
  ],
  Modern: ["modern_template"],
  Minimal: ["minimal_template"],
  Abstract: ["abstract_template"],
};

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/templates-list")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates || []);
      });
  }, []);

  useEffect(() => {
    // Group templates by categoryMap
    const groups = [];
    Object.entries(categoryMap).forEach(([cat, keys]) => {
      const groupTemplates = templates.filter((tpl) => keys.includes(tpl.id));
      if (groupTemplates.length > 0) {
        groups.push({ name: cat, templates: groupTemplates });
      }
    });
    // Add any templates not in categoryMap as "Other"
    const allIds = Object.values(categoryMap).flat();
    const otherTemplates = templates.filter((tpl) => !allIds.includes(tpl.id));
    if (otherTemplates.length > 0) {
      groups.push({ name: "Other", templates: otherTemplates });
    }
    setGrouped(groups);
  }, [templates]);

  const handleTemplateSelect = (template) => {
    navigate("/create", { state: { selectedTemplate: template } });
  };

  // Filter by search
  const filteredGroups = grouped
    .map((group) => ({
      ...group,
      templates: group.templates.filter(
        (tpl) =>
          tpl.name.toLowerCase().includes(search.toLowerCase()) ||
          tpl.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((group) => group.templates.length > 0);

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </header>
        <section className="categories-list">
          {filteredGroups.map((category) => (
            <div key={category.name} className="category">
              <h2 className="category-title">{category.name}</h2>
              <div className="templates-list">
                {category.templates.map((template) => (
                  <a
                    key={template.id}
                    href="#"
                    className="template-card"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <img
                      src={template.preview || "/images/default_preview.png"}
                      alt={template.name}
                      className="template-preview"
                      style={{
                        width: 120,
                        height: 90,
                        objectFit: "cover",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    />
                    <h3 className="template-title">{template.name}</h3>
                    <div className="template-description">
                      {template.description}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </section>
        <a href="/Help" className="help-link">
          Need help?
        </a>
      </div>
    </div>
  );
};

export default Templates;