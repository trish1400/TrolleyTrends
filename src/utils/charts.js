import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { formatDate, findStoreInfo, getColor, makeStringNameSafe } from './helpers.js';

function prepareScatterChartData(purchases) {
    const datasets = {};

    purchases.forEach(purchase => {
        // Use storeId to find the store info
        const storeInfo = findStoreInfo(purchase.storeId);
        const label = storeInfo && storeInfo.storeName ? storeInfo.storeName : 'Unknown';

        // Initialize the dataset for this label if it doesn't already exist
        if (!datasets[label]) {
            // Use color from storeInfo if available, otherwise assign a default color
            const color = storeInfo && storeInfo.color ? storeInfo.color : '#332288';

            datasets[label] = {
                label: label,
                data: [],
                backgroundColor: color, // Use the color from storeInfo
                borderColor: color
            };
        }

        // Add the purchase data to the dataset
        datasets[label].data.push({
            x: purchase.date,
            y: purchase.basketValueNet,
            items: purchase.totalItems
        });
    });

    return Object.values(datasets); // Convert the datasets object into an array
} 



export function createScatterChart(chartElementId, purchases) {
    const ctx = document.getElementById(chartElementId).getContext('2d');
    const data = prepareScatterChartData(purchases);

    const myScatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: data
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'dd MMM yyy', // Adjust based on your date format
                        tooltipFormat: 'd MMM yyyy', // British date format for tooltip
                        displayFormats: {
                            day: 'd MMM yyyy' // British date format for axis labels
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return `£${value.toFixed(2)}`;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        // Custom formatting for tooltip labels
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = `£${context.parsed.y.toFixed(2)}`;
                            const date = context.chart.scales.x.getLabelForValue(context.parsed.x);
                            const items = context.raw.items || context.dataset.data[context.dataIndex].items;
                            return `${label}: ${value} on ${date} (${items} items)`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });

 
    generateCustomDynamicLegend(myScatterChart, 'scatterChartLegend', false);

}


function generateCustomDynamicLegend(chart, legendContainerId, hasRollingAverage = false) {
    const legendContainer = document.getElementById(legendContainerId);
    legendContainer.innerHTML = ''; // Clear existing legend content

    // Create legend items
    chart.data.datasets.forEach((dataset, index) => {
        const legendItem = document.createElement('div');
        legendItem.id = `legend-item-${index}`; // Unique ID for each legend item
        legendItem.className = 'd-flex align-items-center px-2 cursor-pointer legend-item clickable';

        // Set the inner HTML of the legend item with the color box and dataset label
        legendItem.innerHTML = `
            <span class="legend-key" style="background-color: ${dataset.backgroundColor}; border: 2px solid ${dataset.borderColor}"></span>
            <small>${dataset.label}</small>
        `;


        // Add click event to toggle dataset visibility
        legendItem.onclick = () => {
            const meta = chart.getDatasetMeta(index);

            meta.hidden = !meta.hidden; // Toggle the 'hidden' property
            legendItem.classList.toggle('strikethrough', meta.hidden); // Toggle the strikethrough class based on visibility

            chart.update(); // Refresh the chart to reflect changes

            // Recalculate and update the rolling average dynamically
            if(hasRollingAverage == true) {
                updateRollingAverage(chart);
            }
        };

        legendContainer.appendChild(legendItem); // Append the legend item to the container
    });
}




export function drawStoresWithCounts(purchases) {
    const storeCounts = {};
    const storeValues = {};
    const backgroundColors = {};

    purchases.forEach(purchase => {
        const storeId = purchase.storeId;
        const storeInfo = findStoreInfo(storeId); // Look up store info by storeId

        if (!storeInfo) return; // Skip if store info is not found

        const { storeName, color } = storeInfo; // Destructure storeName and color from store info

        storeCounts[storeId] = (storeCounts[storeId] || 0) + 1;
        storeValues[storeId] = (storeValues[storeId] || 0) + purchase.basketValueNet;

        // Assign color to the store, if not already assigned
        if (!backgroundColors[storeId]) {
            backgroundColors[storeId] = color;
        }
    });

    // Prepare labels using storeIds, mapping them back to store names
    const labels = Object.keys(storeCounts).map(storeId => {
        const storeInfo = findStoreInfo(storeId);
        return storeInfo && storeInfo.storeName ? storeInfo.storeName : 'Unknown';
    });

    // Prepare data for the chart
    const datasetsData = [
        {
            label: 'Total Spent',
            data: Object.values(storeValues),
            backgroundColor: Object.values(backgroundColors),
            borderWidth: 0
        },
        {
            label: 'Number of Purchases',
            data: Object.values(storeCounts),
            backgroundColor: Object.values(backgroundColors), // Reuse the same colors for consistency
            borderWidth: 0
        }
    ];

    const ctx = document.getElementById('storesVisitedChart').getContext('2d');

    try {
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: datasetsData
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.raw;
                                const datasetLabel = context.dataset.label;
                                if (datasetLabel.includes('Total Spent')) {
                                    return `${label}: £${value.toFixed(2)}`;
                                } else {
                                    return `${label}: ${value} purchases`;
                                }
                            }
                        }
                    }
                }
            }
        });

        generateCustomDoughnutLegend(chart, 'storesVisitedChartLegend');
        chart.update(); //sometimes the chart didn't appear and I could not work out why - this brute forces it.

    } catch (error) {
        console.error('Error while creating the chart:', error);
    }


}







function generateCustomDoughnutLegend(chart, elementId) {
    const legend = document.getElementById(elementId);
    legend.innerHTML = chart.data.labels.map((label, index) => {
        const color = chart.data.datasets[0].backgroundColor[index];
        const dataValue = chart.data.datasets[0].data[index];
        const times = chart.data.datasets[1] ? chart.data.datasets[1].data[index] : 'N/A'; // Handle potential undefined dataset
        
        // Check if dataValue is undefined and handle it
        const valueFormatted = dataValue !== undefined ? `£${dataValue.toFixed(2)}` : 'N/A';

        // Use elementId in the legend item ID to ensure uniqueness
        return `<div id="legend-item-${elementId}-${index}" data-dataset-index="${index}" class="d-flex align-items-center px-2 cursor-pointer legend-item">
                    <span style="background-color: ${color};" class="legend-key"></span>
                    <small>${label}: ${valueFormatted} (${times} times)</small>
                </div>`;
    }).join('');
}







export function createWeeklyChart(weeklyPurchases, chartElementId) {
    // Determine the earliest and latest dates in the dataset
    const startDate = weeklyPurchases[0].weekCommencing;
    const endDate = weeklyPurchases[weeklyPurchases.length - 1].weekCommencing;
    
    // Generate a complete set of weekly labels
    const labels = [];
    for (let date = new Date(startDate); date <= endDate; date = new Date(date.setDate(date.getDate() + 7))) {
        labels.push(formatDate(date));
    }

    // Initialize dataByFormat for each formatKey and each label with zero
    const dataByFormat = {};

    // First, let's ensure that each formatKey has an entry in dataByFormat
    weeklyPurchases.forEach(item => {
        const formatKey = item.storeFormat;
        if (!dataByFormat[formatKey]) {
            dataByFormat[formatKey] = {};
        }
    });

    // Now, for each formatKey, we initialize every label with 0
    Object.keys(dataByFormat).forEach(formatKey => {
        if (!dataByFormat[formatKey]) dataByFormat[formatKey] = {};
        labels.forEach(label => {
            dataByFormat[formatKey][label] = 0;
        });
    });
    

    // Aggregate data by week and store format
    weeklyPurchases.forEach(item => {
        if (typeof item.basketValueNet !== 'number') {
            console.error('Non-numeric basketValueNet', item);
        }
        dataByFormat[item.storeFormat][formatDate(item.weekCommencing)] += item.basketValueNet;
    });


    // Create the rolling average dataset and add it at the beginning of the datasets array
    const rollingAverageDataset = {
        label: '5 week rolling average',
        data: new Array(labels.size).fill(null),
        borderColor: '#332288',
        backgroundColor: 'rgba(0,0,0,0)',
        type: 'line',
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        lineTension: 0.4,
        order: 0
    };

    const barChartDatasets  = Object.entries(dataByFormat).map(([format, values], index) => {
        // 'index' here is correctly scoped to the outer .map() function
        const data = Array.from(labels).map(label => values[label] || 0);  // Using sorted labels directly
        return {
            label: format,
            data,
            backgroundColor: getColor(index), // Uses 'index' from the outer .map() function
            borderColor: getColor(index),     // Uses 'index' from the outer .map() function
            fill: true,
            order: 1
        };
    });
      

    // Initialize Chart.js chart
    const ctx = document.getElementById(chartElementId).getContext('2d');
    const myWeeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from(labels),
            datasets: [rollingAverageDataset, ...barChartDatasets],
        },
        options: {
            scales: {
                x: { stacked: true },
                y: { stacked: true }
            },
            plugins: {
                tooltip: {
                    // Customizing the tooltip content
                    callbacks: {
                        title: function(tooltipItems) {
                            // Assuming the first dataset's label includes the week commencing information
                            return `Week commencing: ${tooltipItems[0].label}`;
                        },
                        label: function(context) {
                            // Formatting the tooltip with the store format and the value formatted as GBP
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: £${value.toFixed(2)}`;
                        }
                    },
                },
                legend: {
                    display: false
                }
            }
        }
    });

    myWeeklyChart.update(); //sometimes the chart appeared a funny size and I could not work out why - this brute forces it.

    // Initial calculation of rolling averages
    updateRollingAverage(myWeeklyChart);

    generateCustomDynamicLegend(myWeeklyChart,'weeklyBarChartLegend', true);  


}


function updateRollingAverage(chart) {
    const rollingAvgData = chart.data.datasets[0].data; // Assuming the first dataset is the rolling average
    rollingAvgData.fill(null); // Reset rolling average data

    // Loop through each label/week
    for (let i = 0; i < chart.data.labels.length; i++) {
        let totalSum = 0;
        let totalCount = 0;

        // Calculate the sum and count for the rolling window
        for (let j = -2; j <= 2; j++) { // Example window size: 5 weeks
            const idx = i + j;
            if (idx >= 0 && idx < chart.data.labels.length) {
                let weekSum = 0;
                let weekCount = 0;

                // Iterate over datasets, excluding the rolling average itself
                chart.data.datasets.slice(1).forEach((dataset, dIdx) => {
                    // Check if the dataset is visible
                    if (!chart.isDatasetVisible(dIdx + 1)) return; // Adjusted index due to slice(1)

                    const value = dataset.data[idx];
                    if (value !== null && value !== undefined) {
                        weekSum += value;
                        weekCount = 1; // Count the week once if any dataset has a value
                    }
                });

                // Add this week's total to the rolling sum
                if (weekCount > 0) {
                    totalSum += weekSum;
                    totalCount += weekCount;
                }
            }
        }

        // Calculate the rolling average for this week
        if (totalCount > 0) {
            rollingAvgData[i] = totalSum / totalCount;
        }
    }

    chart.update();
}






export function createPriceChart(productName, products) {

    // Filter products for the given product name
    const filteredProducts = products.filter(product => makeStringNameSafe(product.name) === productName);
  
    // Sort by timestamp to ensure chronological order
    filteredProducts.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));

  
    // Extract labels (dates), data (prices), and additional info for tooltips
    const labels = filteredProducts.map(product => formatDate(product.date));


    const data = filteredProducts.map(product => {
        // Ensure product.price is a number before calling toFixed
        const price = parseFloat(product.price);
        return !isNaN(price) ? price.toFixed(2) : "0.00"; // If it's not a number, default to "0.00"
    });

    const additionalInfo = filteredProducts.map(product => `${product.storeName}, ${product.storeFormat}`);
  
    // Create the dataset for the chart
    const dataset = {
      label: 'Product Price',
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.55)',
      data: data,
      fill: true
    };
  
    // Define the chart configuration
    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [dataset]
      },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                // Format the tooltip content
                const labelIndex = context.dataIndex;
                const price = context.dataset.data[labelIndex];
                const info = additionalInfo[labelIndex];
                const date = labels[labelIndex];
                return `£${price} (${info})`;
              }
            }
          }
        },
        maintainAspectRatio: false,
        scales: {
          x: {
            display: false
          },
          y: {
            display: false
          }
        },
        elements: {
          line: {
            borderWidth: 2,
            tension: 0.4
          },
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 4
          }
        }
      }
    };
  
    return config;
  }
  