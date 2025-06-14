// Global variables
let climbingData = [];
let sportData = [];
let boulderData = [];
let charts = {};

// Indoor gyms to exclude (as mentioned in README)
const INDOOR_GYMS = [
    'Sharma Climbing BCN Gavá',
    'Klättercentret Solna'
];

// Grade conversion for sorting
const SPORT_GRADES = {
    '4': 1, '4+': 2, '5a': 3, '5a+': 4, '5b': 5, '5b+': 6, '5c': 7, '5c+': 8,
    '6a': 9, '6a+': 10, '6b': 11, '6b+': 12, '6c': 13, '6c+': 14,
    '7a': 15, '7a+': 16, '7b': 17, '7b+': 18, '7c': 19, '7c+': 20,
    '8a': 21, '8a+': 22, '8b': 23, '8b+': 24, '8c': 25, '8c+': 26,
    '9a': 27, '9a+': 28, '9b': 29, '9b+': 30, '9c': 31, '9c+': 32
};

const BOULDER_GRADES = {
    '3': 1, '3+': 2, '4': 3, '4+': 4, '5': 5, '5+': 6,
    '5A': 7, '5B': 8, '5C': 9,
    '6A': 10, '6A+': 11, '6B': 12, '6B+': 13, '6C': 14, '6C+': 15,
    '7A': 16, '7A+': 17, '7B': 18, '7B+': 19, '7C': 20, '7C+': 21,
    '8A': 22, '8A+': 23, '8B': 24, '8B+': 25, '8C': 26, '8C+': 27
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadClimbingData();
        processData();
        updateStats();
        createCharts();
        setupEventListeners();
        hideLoading();
    } catch (error) {
        console.error('Error initializing app:', error);
        hideLoading();
        showError('Failed to load climbing data. Please try again later.');
    }
}

async function loadClimbingData() {
    return new Promise((resolve, reject) => {
        Papa.parse('data/logbook.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }
                climbingData = results.data;
                resolve();
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}

function processData() {
    // Filter out indoor gyms and invalid entries
    const filteredData = climbingData.filter(row => {
        const cragName = row['Crag Name'] || '';
        const routeGrade = row['Route Grade'] || '';
        const gearStyle = row['Route Gear Style'] || '';
        
        // Exclude indoor gyms
        if (INDOOR_GYMS.some(gym => cragName.includes(gym))) {
            return false;
        }
        
        // Only include valid grades and gear styles
        return routeGrade && (gearStyle === 'Sport' || gearStyle === 'Boulder');
    });

    // Separate sport and boulder data
    sportData = filteredData.filter(row => row['Route Gear Style'] === 'Sport');
    boulderData = filteredData.filter(row => row['Route Gear Style'] === 'Boulder');

    // Sort by date (newest first)
    const sortByDate = (a, b) => new Date(b['Ascent Date']) - new Date(a['Ascent Date']);
    sportData.sort(sortByDate);
    boulderData.sort(sortByDate);
}

function updateStats() {
    // Total ascents (excluding indoor)
    const totalAscents = sportData.length + boulderData.length;
    document.getElementById('total-ascents').textContent = totalAscents;

    // Hardest sport grade
    const hardestSport = getHardestGrade(sportData, SPORT_GRADES);
    document.getElementById('hardest-sport').textContent = hardestSport || 'N/A';

    // Hardest boulder grade
    const hardestBoulder = getHardestGrade(boulderData, BOULDER_GRADES);
    document.getElementById('hardest-boulder').textContent = hardestBoulder || 'N/A';

    // Countries count
    const countries = new Set([...sportData, ...boulderData].map(row => row['Country']));
    document.getElementById('countries-count').textContent = countries.size;

    // Last updated
    const lastUpdated = new Date().toLocaleDateString();
    document.getElementById('last-updated').textContent = lastUpdated;
}

function getHardestGrade(data, gradeSystem) {
    if (data.length === 0) return null;
    
    let hardestGrade = '';
    let hardestValue = 0;
    
    data.forEach(row => {
        const grade = cleanGrade(row['Route Grade']);
        const value = gradeSystem[grade];
        if (value && value > hardestValue) {
            hardestValue = value;
            hardestGrade = grade;
        }
    });
    
    return hardestGrade;
}

function cleanGrade(grade) {
    if (!grade) return '';
    // Remove extra characters and normalize
    return grade.replace(/[\/\-\s]/g, '').split(/[,;]/)[0].trim();
}

function createCharts() {
    createGradeDistributionChart('sport');
    createGradeDistributionChart('boulder');
    createProgressionChart('sport');
    createProgressionChart('boulder');
    updateRoutesList('sport');
    updateRoutesList('boulder');
}

function createGradeDistributionChart(type) {
    const data = type === 'sport' ? sportData : boulderData;
    const gradeSystem = type === 'sport' ? SPORT_GRADES : BOULDER_GRADES;
    const canvasId = `${type}-grade-chart`;
    
    // Count grades
    const gradeCounts = {};
    data.forEach(row => {
        const grade = cleanGrade(row['Route Grade']);
        if (gradeSystem[grade]) {
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        }
    });

    // Sort grades by difficulty
    const sortedGrades = Object.keys(gradeCounts).sort((a, b) => gradeSystem[a] - gradeSystem[b]);
    const counts = sortedGrades.map(grade => gradeCounts[grade]);

    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedGrades,
            datasets: [{
                label: 'Number of Ascents',
                data: counts,
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#718096'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#718096'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createProgressionChart(type) {
    const data = type === 'sport' ? sportData : boulderData;
    const gradeSystem = type === 'sport' ? SPORT_GRADES : BOULDER_GRADES;
    const canvasId = `${type}-progression-chart`;
    
    // Group by month and find hardest grade per month
    const monthlyProgress = {};
    
    data.forEach(row => {
        const date = new Date(row['Ascent Date']);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const grade = cleanGrade(row['Route Grade']);
        const gradeValue = gradeSystem[grade];
        
        if (gradeValue) {
            if (!monthlyProgress[monthKey] || gradeValue > monthlyProgress[monthKey].value) {
                monthlyProgress[monthKey] = {
                    value: gradeValue,
                    grade: grade,
                    date: date
                };
            }
        }
    });

    // Sort by date and create cumulative max
    const sortedMonths = Object.keys(monthlyProgress).sort();
    const progressData = [];
    let cumulativeMax = 0;
    
    sortedMonths.forEach(month => {
        const monthData = monthlyProgress[month];
        if (monthData.value > cumulativeMax) {
            cumulativeMax = monthData.value;
        }
        progressData.push({
            x: month,
            y: cumulativeMax,
            grade: Object.keys(gradeSystem).find(key => gradeSystem[key] === cumulativeMax)
        });
    });

    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Hardest Grade',
                data: progressData,
                borderColor: 'rgba(118, 75, 162, 1)',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Hardest Grade: ${context.raw.grade}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            const grade = Object.keys(gradeSystem).find(key => gradeSystem[key] === value);
                            return grade || value;
                        },
                        color: '#718096'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    type: 'time',
                    time: {
                        parser: 'YYYY-MM',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    ticks: {
                        color: '#718096'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateRoutesList(type) {
    const data = type === 'sport' ? sportData : boulderData;
    const gradeSystem = type === 'sport' ? SPORT_GRADES : BOULDER_GRADES;
    
    // Get hardest routes
    const hardestRoutes = data
        .filter(row => gradeSystem[cleanGrade(row['Route Grade'])])
        .sort((a, b) => {
            const gradeA = gradeSystem[cleanGrade(a['Route Grade'])];
            const gradeB = gradeSystem[cleanGrade(b['Route Grade'])];
            return gradeB - gradeA;
        })
        .slice(0, 5);
    
    // Get recent routes
    const recentRoutes = data.slice(0, 5);
    
    // Update hardest routes
    const hardestContainer = document.getElementById(`${type}-hardest-routes`);
    hardestContainer.innerHTML = hardestRoutes.map(route => createRouteItem(route)).join('');
    
    // Update recent routes
    const recentContainer = document.getElementById(`${type}-recent-routes`);
    recentContainer.innerHTML = recentRoutes.map(route => createRouteItem(route)).join('');
}

function createRouteItem(route) {
    const routeName = route['Route Name'] || 'Unknown Route';
    const grade = cleanGrade(route['Route Grade']) || 'N/A';
    const cragName = route['Crag Name'] || 'Unknown Crag';
    const country = route['Country'] || 'Unknown';
    const ascentType = route['Ascent Type'] || 'Unknown';
    const date = new Date(route['Ascent Date']).toLocaleDateString();
    const stars = route['Route Stars'] || '';
    
    const ascentClass = ascentType.toLowerCase().replace(/\s+/g, '');
    
    return `
        <div class="route-item ${ascentClass}">
            <div class="route-info">
                <div class="route-name">${routeName}</div>
                <div class="route-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${cragName}, ${country}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-climbing"></i> ${ascentType}</span>
                    ${stars ? `<span><i class="fas fa-star"></i> ${stars}</span>` : ''}
                </div>
            </div>
            <div class="route-grade">${grade}</div>
        </div>
    `;
}

function setupEventListeners() {
    // Toggle between sport and boulder
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            switchClimbingType(type);
        });
    });
}

function switchClimbingType(type) {
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Update sections
    document.querySelectorAll('.climbing-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${type}-section`).classList.add('active');
    
    // Add animation
    document.getElementById(`${type}-section`).classList.add('fade-in');
    setTimeout(() => {
        document.getElementById(`${type}-section`).classList.remove('fade-in');
    }, 500);
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('hidden');
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 300);
}

function showError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-exclamation-triangle" style="color: #e53e3e;"></i>
            <p style="color: #e53e3e;">${message}</p>
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getAscentTypeColor(ascentType) {
    const colors = {
        'onsight': '#48bb78',
        'redpoint': '#ed8936',
        'red point': '#ed8936',
        'flash': '#4299e1',
        'send': '#9f7aea',
        'hangdog': '#718096',
        'hang dog': '#718096',
        'attempt': '#a0aec0'
    };
    
    return colors[ascentType.toLowerCase()] || '#718096';
}

// Handle window resize for charts
window.addEventListener('resize', function() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
}); 