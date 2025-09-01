import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(...registerables);

const Admin = () => {
  // Chart refs
  const anomalyChart1Ref = useRef(null);
  const anomalyChart2Ref = useRef(null);
  const quadrantChartRef = useRef(null);
  const risingStarsChartRef = useRef(null);
  const categoryChartRef = useRef(null);

  // Data generation utilities
  const generateDateLabels = (days) => {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().split('T')[0]);
    }
    return labels;
  };

  const generateSentimentData = (days, start, trend) => {
    const data = [];
    let current = start;
    for (let i = 0; i < days; i++) {
      data.push(Math.max(0, Math.min(100, current)));
      current += (Math.random() - 0.5 + trend) * 5;
    }
    return data;
  };

  const generateVolumeData = (days, base, hasSpike) => {
    const data = [];
    for (let i = 0; i < days; i++) {
      let volume = base + Math.random() * base * 0.5;
      if (hasSpike && i > days - 7 && Math.random() > 0.7) {
        volume *= 3; // Spike in volume
      }
      data.push(Math.round(volume));
    }
    return data;
  };

  // Chart creation functions
  const createAnomalyChart = (ctx, data, isAlert) => {
    return new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: generateDateLabels(30),
        datasets: [{
          type: 'line',
          label: 'Sentiment Score',
          data: data.sentiment,
          borderColor: isAlert ? '#f87171' : '#60a5fa',
          backgroundColor: isAlert ? '#fca5a5' : '#93c5fd',
          yAxisID: 'y_sentiment',
          tension: 0.3,
          pointRadius: 0,
        }, {
          type: 'bar',
          label: 'Review Volume',
          data: data.volume,
          backgroundColor: isAlert ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
          yAxisID: 'y_volume',
        }]
      },
              options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: data.productName, color: '#374151' },
            legend: { display: false },
            datalabels: { display: false }
          },
        scales: {
          x: { 
            type: 'time',
            time: { unit: 'day' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: '#6b7280' }
          },
          y_sentiment: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 100,
                          title: { display: true, text: 'Sentiment', color: '#6b7280' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: '#6b7280' }
          },
          y_volume: {
            type: 'linear',
            position: 'right',
                          title: { display: true, text: 'Volume', color: '#6b7280' },
            grid: { drawOnChartArea: false },
            ticks: { color: '#6b7280' }
          }
        }
      }
    });
  };

  useEffect(() => {
    let charts = [];

    // Mock data
    const anomalyData1 = {
      productName: "Pro-Gamer Headset (ALERT)",
      sentiment: [85, 86, 84, 85, 83, 85, 86, 84, 85, 83, 84, 85, 86, 84, 85, 83, 84, 85, 86, 84, 85, 83, 35, 32, 28, 30, 25, 22, 24, 26],
      volume: generateVolumeData(30, 20, true)
    };
    const anomalyData2 = {
      productName: "Ergo-Comfort Mouse (Stable)",
      sentiment: generateSentimentData(30, 92, -0.05),
      volume: generateVolumeData(30, 15, false)
    };

    // Create charts
    if (anomalyChart1Ref.current) {
      charts.push(createAnomalyChart(anomalyChart1Ref.current.getContext('2d'), anomalyData1, true));
    }
    if (anomalyChart2Ref.current) {
      charts.push(createAnomalyChart(anomalyChart2Ref.current.getContext('2d'), anomalyData2, false));
    }

    // Quadrant Chart
    if (quadrantChartRef.current) {
      const quadrantChart = new ChartJS(quadrantChartRef.current, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Products',
            data: [
              { x: 15, y: 4.8, label: 'Artisan Leather Journal' },
              { x: 25, y: 4.9, label: 'Silent-Click Mouse' },
              { x: 30, y: 4.6, label: 'Organic Tea Set' },
              { x: 250, y: 4.7, label: 'Pro-Gamer Keyboard' },
              { x: 350, y: 4.6, label: 'Yoga Mat Pro' },
              { x: 450, y: 4.8, label: 'Smart Coffee Mug' },
              { x: 10, y: 2.5, label: 'Basic USB Hub' },
              { x: 22, y: 3.1, label: 'Travel Mug' },
              { x: 300, y: 3.2, label: 'Smart-Light Lamp' },
              { x: 210, y: 2.9, label: 'Wireless Earbuds V1' },
            ],
            backgroundColor: (context) => {
              const { x, y } = context.raw;
              if (y >= 4.0 && x < 100) return '#34d399';
              if (y >= 4.0 && x >= 100) return '#60a5fa';
              if (y < 4.0 && x < 100) return '#fbbf24';
              return '#f87171';
            },
            pointRadius: 8,
            pointHoverRadius: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.raw.label;
                }
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: 'Number of Reviews', color: '#6b7280' },
              min: 0,
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#6b7280' }
            },
            y: {
              title: { display: true, text: 'Average Star Rating', color: '#6b7280' },
              min: 1, max: 5,
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#6b7280' }
            }
          }
        }
      });
      charts.push(quadrantChart);
    }

    // Rising Stars Chart
    if (risingStarsChartRef.current) {
      const risingStarsChart = new ChartJS(risingStarsChartRef.current, {
        type: 'line',
        data: {
          labels: generateDateLabels(60),
          datasets: [
            {
              label: 'Eco-Smart Water Bottle',
              data: generateSentimentData(60, 60, 0.4),
              borderColor: '#34d399',
              tension: 0.4,
              pointRadius: 0,
            },
            {
              label: 'Smart-Light Lamp',
              data: generateSentimentData(60, 85, -0.3),
              borderColor: '#f87171',
              tension: 0.4,
              pointRadius: 0,
            },
            {
              label: 'Travel Pillow 2.0',
              data: generateSentimentData(60, 70, 0.1),
              borderColor: '#60a5fa',
              tension: 0.4,
              pointRadius: 0,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: '#374151' } },
            datalabels: { display: false }
          },
          scales: {
            x: { 
              type: 'time', 
              time: { unit: 'week' },
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#6b7280' }
            },
            y: { 
              title: { display: true, text: 'Sentiment Score', color: '#6b7280' },
              min: 0, max: 100,
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#6b7280' }
            }
          }
        }
      });
      charts.push(risingStarsChart);
    }

    // Category Chart
    if (categoryChartRef.current) {
      const categoryChart = new ChartJS(categoryChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Apparel', 'Home Goods', 'Electronics', 'Books', 'Toys & Games'],
          datasets: [
            {
              label: 'Positive',
              data: [75, 65, 40, 80, 70],
              backgroundColor: '#22c55e',
            },
            {
              label: 'Neutral',
              data: [15, 20, 25, 12, 15],
              backgroundColor: '#f59e0b',
            },
            {
              label: 'Negative',
              data: [10, 15, 35, 8, 15],
              backgroundColor: '#ef4444',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { position: 'top', labels: { color: '#374151' } },
            datalabels: { display: false }
          },
          scales: {
            x: { 
              stacked: true, 
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              ticks: { color: '#6b7280' }
            },
            y: { 
              stacked: true,
              grid: { drawOnChartArea: false },
              ticks: { color: '#374151' }
            }
          }
        }
      });
      charts.push(categoryChart);
    }

    // Cleanup function
    return () => {
      charts.forEach(chart => {
        if (chart) chart.destroy();
      });
    };
  }, []);

  // Keyword cloud data
  const keywords = [
    { text: 'wrong size', weight: 28 }, { text: 'late delivery', weight: 25 },
    { text: 'broken', weight: 18 }, { text: 'poor quality', weight: 15 },
    { text: 'doesn\'t work', weight: 12 }, { text: 'bad smell', weight: 9 },
    { text: 'missing parts', weight: 22 }, { text: 'not as described', weight: 19 },
    { text: 'too expensive', weight: 7 }, { text: 'leaking', weight: 14 }
  ];

  const colors = ['#f87171', '#fb923c', '#facc15', '#a78bfa'];

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-black">Customer Review Sentiment Dashboard</h1>
        <p className="text-lg text-black mt-1">Actionable insights for the marketing team.</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Visualization 1: Anomaly & Risk Detection */}
        <div className="lg:col-span-2 bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-black mb-1">Anomaly & Risk Detection</h2>
          <p className="text-sm text-black mb-4">Products with sudden drops in sentiment or spikes in review volume. The line chart shows the sentiment score and the bar chart shows the review volume.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <canvas ref={anomalyChart1Ref}></canvas>
            </div>
            <div className="h-64">
              <canvas ref={anomalyChart2Ref}></canvas>
            </div>
          </div>
        </div>

        {/* Visualization 2: Negative Keyword Cloud */}
        <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-black mb-1">Negative Keyword Cloud</h2>
          <p className="text-sm text-black mb-6">Trending negative terms in reviews from the last 7 days.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-4 bg-gray-200 rounded-lg min-h-[250px]">
            {keywords.sort((a, b) => b.weight - a.weight).map((kw, i) => {
              const fontSize = 1 + (kw.weight / 28) * 1.5;
              const opacity = 0.8 + (kw.weight / 28) * 0.2;
              return (
                <span 
                  key={i}
                  className="font-semibold"
                  style={{
                    fontSize: `${fontSize}rem`,
                    color: colors[i % colors.length],
                    opacity: opacity
                  }}
                >
                  {kw.text}
                </span>
              );
            })}
          </div>
        </div>
        
        {/* Visualization 3: Opportunity & Growth */}
        <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-black mb-1">Opportunity & Growth Identification</h2>
          <p className="text-sm text-black mb-4">This chart shows some products having high sentiment score and low number of reviews. Identify the products that are not getting enough attention and improve their visibility.</p>
          <div className="h-72">
            <canvas ref={quadrantChartRef}></canvas>
          </div>
        </div>

        {/* Visualization 4: Rising Stars Monitor */}
        <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-black mb-1">Rising Stars Monitor</h2>
          <p className="text-sm text-black mb-4">Sentiment trends for products launched in the last 60 days.</p>
          <div className="h-72">
            <canvas ref={risingStarsChartRef}></canvas>
          </div>
        </div>

        {/* Visualization 5: Strategic Insights */}
        <div className="bg-gray-200 border border-gray-400 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-black mb-1">Strategic Insights</h2>
          <p className="text-sm text-black mb-4">Sentiment breakdown across product categories.</p>
          <div className="h-72">
            <canvas ref={categoryChartRef}></canvas>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Admin; 