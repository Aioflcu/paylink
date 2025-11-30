import React from 'react';
import './AnalyticsChart.css';

const AnalyticsChart = ({ data, type = 'line', title }) => {
  // Basic chart component - can be enhanced with actual charting library like Chart.js or Recharts
  return (
    <div className="analytics-chart">
      <h3>{title}</h3>
      <div className="chart-placeholder">
        <p>Chart visualization for {type} data</p>
        <div className="chart-data">
          {data && data.length > 0 ? (
            <ul>
              {data.map((item, index) => (
                <li key={index}>
                  {item.label || item.name}: {item.value || item.revenue || item.totalUsers}
                </li>
              ))}
            </ul>
          ) : (
            <p>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;
