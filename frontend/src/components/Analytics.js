import React from "react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import "../styles/Analytics.css";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const Analytics = () => {
  const slideData = {
    labels: ["January", "February", "March", "April"],
    datasets: [
      {
        label: "Number of Slides Created",
        data: [12, 19, 8, 15],
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const topicData = {
    labels: ["Business", "Education", "Technology", "Health"],
    datasets: [
      {
        label: "Most Common Topics",
        data: [40, 25, 20, 15],
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <h1>SmartSlide Analytics</h1>
      </header>
      <section className="analytics-section">
        <div className="chart-container">
          <h2>Slides Created Over Time</h2>
          <Bar data={slideData} />
        </div>
        <div className="chart-container">
          <h2>Most Common Topics</h2>
          <Pie data={topicData} />
        </div>
      </section>
      <section className="analytics-summary">
        <h2>Summary</h2>
        <p>Total Slides Created: 54</p>
        <p>Most Used Template: "Modern Business"</p>
        <p>Usage Frequency: 3 times per week</p>
      </section>
    </div>
  );
};

export default Analytics;