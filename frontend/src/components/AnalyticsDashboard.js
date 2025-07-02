import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { format, subHours, isAfter } from 'date-fns';
import { TrendingUp, Activity, Clock, Globe, BarChart3, PieChart } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsDashboard = ({ requests, session }) => {
  const [timeRange, setTimeRange] = useState('24h'); // 1h, 24h, 7d
  
  // Filter requests by time range
  const filteredRequests = useMemo(() => {
    if (!requests.length) return [];
    
    const now = new Date();
    let cutoff;
    
    switch (timeRange) {
      case '1h':
        cutoff = subHours(now, 1);
        break;
      case '24h':
        cutoff = subHours(now, 24);
        break;
      case '7d':
        cutoff = subHours(now, 24 * 7);
        break;
      default:
        return requests;
    }
    
    return requests.filter(req => isAfter(new Date(req.timestamp), cutoff));
  }, [requests, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const uniqueIPs = new Set(filteredRequests.map(r => r.ip_address)).size;
    const methodCounts = filteredRequests.reduce((acc, req) => {
      acc[req.method] = (acc[req.method] || 0) + 1;
      return acc;
    }, {});
    
    const avgPerHour = timeRange === '1h' ? total : 
      timeRange === '24h' ? Math.round(total / 24 * 10) / 10 :
      Math.round(total / (7 * 24) * 10) / 10;

    return {
      total,
      uniqueIPs,
      methodCounts,
      avgPerHour,
      mostCommonMethod: Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    };
  }, [filteredRequests, timeRange]);

  // Request volume over time data
  const volumeData = useMemo(() => {
    if (!filteredRequests.length) return { labels: [], datasets: [] };

    const hours = timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : 7 * 24;
    const interval = timeRange === '1h' ? 5 : timeRange === '24h' ? 60 : 60 * 24; // minutes
    
    const labels = [];
    const data = [];
    const now = new Date();

    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval * 60 * 1000);
      const label = timeRange === '7d' ? 
        format(time, 'MMM dd') : 
        format(time, timeRange === '1h' ? 'HH:mm' : 'HH:mm');
      labels.push(label);

      const periodStart = new Date(time.getTime() - interval * 60 * 1000);
      const periodEnd = time;
      
      const count = filteredRequests.filter(req => {
        const reqTime = new Date(req.timestamp);
        return reqTime >= periodStart && reqTime < periodEnd;
      }).length;
      
      data.push(count);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Requests',
          data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filteredRequests, timeRange]);

  // HTTP Methods distribution
  const methodsData = useMemo(() => {
    const methods = stats.methodCounts;
    
    return {
      labels: Object.keys(methods),
      datasets: [
        {
          data: Object.values(methods),
          backgroundColor: [
            '#10b981', // GET - green
            '#3b82f6', // POST - blue
            '#f59e0b', // PUT - yellow
            '#ef4444', // DELETE - red
            '#8b5cf6', // PATCH - purple
            '#6b7280', // Others - gray
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  }, [stats.methodCounts]);

  // Response times (if you add this to backend)
  const responseSizesData = useMemo(() => {
    const sizes = filteredRequests.map(req => {
      const bodySize = req.body ? req.body.length : 0;
      if (bodySize === 0) return 'Empty';
      if (bodySize < 1000) return 'Small (<1KB)';
      if (bodySize < 10000) return 'Medium (1-10KB)';
      if (bodySize < 100000) return 'Large (10-100KB)';
      return 'Very Large (>100KB)';
    });

    const sizeCounts = sizes.reduce((acc, size) => {
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(sizeCounts),
      datasets: [
        {
          data: Object.values(sizeCounts),
          backgroundColor: [
            '#e5e7eb', // Empty - gray
            '#bfdbfe', // Small - light blue
            '#93c5fd', // Medium - blue
            '#60a5fa', // Large - darker blue
            '#3b82f6', // Very Large - dark blue
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  }, [filteredRequests]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  if (!session) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
          <p>Create a webhook session to view analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="mr-3 text-blue-600" size={24} />
              Analytics Dashboard
            </h2>
            <p className="text-gray-600">Insights for session {session.session_id}</p>
          </div>
          
          <div className="flex space-x-2">
            {['1h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '1h' ? 'Last Hour' : range === '24h' ? 'Last 24h' : 'Last 7 days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            icon={<Activity className="text-blue-600" size={24} />}
            title="Total Requests"
            value={stats.total}
            subtitle={`${stats.avgPerHour}/hour avg`}
          />
          <MetricCard
            icon={<Globe className="text-green-600" size={24} />}
            title="Unique IPs"
            value={stats.uniqueIPs}
            subtitle={`${Math.round(stats.uniqueIPs / Math.max(stats.total, 1) * 100)}% unique`}
          />
          <MetricCard
            icon={<TrendingUp className="text-purple-600" size={24} />}
            title="Most Common"
            value={stats.mostCommonMethod}
            subtitle={`${stats.methodCounts[stats.mostCommonMethod] || 0} requests`}
          />
          <MetricCard
            icon={<Clock className="text-orange-600" size={24} />}
            title="Session Age"
            value={session.created ? format(new Date(), 'HH:mm') : 'Active'}
            subtitle="Started today"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Volume Over Time */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Volume</h3>
          <div className="h-64">
            {filteredRequests.length > 0 ? (
              <Line data={volumeData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No requests in selected time range
              </div>
            )}
          </div>
        </div>

        {/* HTTP Methods Distribution */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HTTP Methods</h3>
          <div className="h-64">
            {Object.keys(stats.methodCounts).length > 0 ? (
              <Doughnut data={methodsData} options={pieOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Request Sizes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Sizes</h3>
          <div className="h-64">
            {filteredRequests.length > 0 ? (
              <Pie data={responseSizesData} options={pieOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredRequests.slice(0, 5).map((request, index) => (
              <div key={request.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    request.method === 'GET' ? 'bg-green-100 text-green-800' :
                    request.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {request.method}
                  </span>
                  <span className="text-sm text-gray-600">{request.ip_address}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(request.timestamp), 'HH:mm:ss')}
                </span>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon, title, value, subtitle }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex items-center space-x-3">
      {icon}
      <div>
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
  </div>
);

export default AnalyticsDashboard;