import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import "../styles/Analytics.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const Analytics = () => {
  const [slideData, setSlideData] = useState({ labels: [], datasets: [] });
  const [topicData, setTopicData] = useState({ labels: [], datasets: [] });
  const [summary, setSummary] = useState({ slides_generated: 0, quizzes_generated: 0, scripts_generated: 0, last_active: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user id from localStorage (set at login)
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) return;
    fetch(`http://localhost:5000/analytics/${user.id}`)
      .then(res => res.json())
      .then(data => {
        // Monthly slides
        const months = Object.keys(data.monthly || {});
        const slidesPerMonth = months.map(m => data.monthly[m]);
        setSlideData({
          labels: months.length ? months : ["No Data"],
          datasets: [
            {
              label: "Number of Slides Created",
              data: slidesPerMonth.length ? slidesPerMonth : [0],
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        });
        // Topics
        const topics = Object.keys(data.topics || {});
        const topicCounts = topics.map(t => data.topics[t]);
        setTopicData({
          labels: topics.length ? topics : ["No Data"],
          datasets: [
            {
              label: "Most Common Topics",
              data: topicCounts.length ? topicCounts : [0],
              backgroundColor: [
                "rgba(255, 99, 132, 0.6)",
                "rgba(54, 162, 235, 0.6)",
                "rgba(255, 206, 86, 0.6)",
                "rgba(75, 192, 192, 0.6)",
                "rgba(153, 102, 255, 0.6)",
                "rgba(255, 159, 64, 0.6)"
              ],
              borderColor: [
                "rgba(255, 99, 132, 1)",
                "rgba(54, 162, 235, 1)",
                "rgba(255, 206, 86, 1)",
                "rgba(75, 192, 192, 1)",
                "rgba(153, 102, 255, 1)",
                "rgba(255, 159, 64, 1)"
              ],
              borderWidth: 1,
            },
          ],
        });
        setSummary({
          slides_generated: data.slides_generated,
          quizzes_generated: data.quizzes_generated,
          scripts_generated: data.scripts_generated,
          last_active: data.last_active,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Navbar />
      <div className="analytics-container">
        <header className="analytics-header">
          <h1 className="analytics-title">SMARTSLIDE ANALYTICS</h1>
        </header>
        <section className="analytics-section">
          <div className="chart-container">
            <h2>Slides created over time</h2>
            {loading ? <p>Loading...</p> : <Bar data={slideData} />}
          </div>
          <div className="chart-container">
            <h2>Most Common Topics</h2>
            {loading ? <p>Loading...</p> : <Pie data={topicData} />}
          </div>
        </section>
        <section className="analytics-summary">
          <h2>Summary</h2>
          <p>Total Slides Created: {summary.slides_generated}</p>
          <p>Total Quizzes Generated: {summary.quizzes_generated}</p>
          <p>Total Scripts Generated: {summary.scripts_generated}</p>
          <p>Last Active: {summary.last_active ? new Date(summary.last_active).toLocaleString() : "-"}</p>
        </section>
      </div>
    </div>
  );
};

export default Analytics;