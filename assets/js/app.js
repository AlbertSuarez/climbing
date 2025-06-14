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
    '4': 1, '4+': 2, '5': 3, '5+': 4,
    '6a': 5, '6a+': 6, '6b': 7, '6b+': 8, '6c': 9, '6c+': 10,
    '7a': 11, '7a+': 12, '7b': 13, '7b+': 14, '7c': 15, '7c+': 16,
    '8a': 17, '8a+': 18, '8b': 19, '8b+': 20, '8c': 21, '8c+': 22,
    '9a': 23, '9a+': 24, '9b': 25, '9b+': 26, '9c': 27, '9c+': 28
};

const BOULDER_GRADES = {
    '3': 1, '3+': 2, '4': 3, '4+': 4, '5': 5, '5+': 6,
    '6A': 7, '6A+': 8, '6B': 9, '6B+': 10, '6C': 11, '6C+': 12,
    '7A': 13, '7A+': 14, '7B': 15, '7B+': 16, '7C': 17, '7C+': 18,
    '8A': 19, '8A+': 20, '8B': 21, '8B+': 22, '8C': 23, '8C+': 24
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
        initializeScrollAnimations();
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
    // Define successful ascent types for different climbing styles
    const successfulSportTypes = ['Red point', 'Onsight', 'Flash'];
    const successfulBoulderTypes = ['Flash', 'Send'];
    
    // Filter out indoor gyms, invalid entries, unsuccessful attempts, and multi-pitch routes
    const filteredData = climbingData.filter(row => {
        const cragName = row['Crag Name'] || '';
        const routeGrade = row['Route Grade'] || '';
        const gearStyle = row['Route Gear Style'] || '';
        const ascentType = row['Ascent Type'] || '';
        const ascentLabel = row['Ascent Label'] || '';
        
        // Exclude indoor gyms
        if (INDOOR_GYMS.some(gym => cragName.includes(gym))) {
            return false;
        }
        
        // Exclude multi-pitch routes (those with Ascent Label filled)
        if (ascentLabel.trim() !== '') {
            return false;
        }
        
        // Only include valid grades and gear styles
        if (!routeGrade || (gearStyle !== 'Sport' && gearStyle !== 'Boulder')) {
            return false;
        }
        
        // Check successful ascent types based on climbing style
        if (gearStyle === 'Sport') {
            return successfulSportTypes.includes(ascentType);
        } else if (gearStyle === 'Boulder') {
            return successfulBoulderTypes.includes(ascentType);
        }
        
        return false;
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
    // Total successful ascents (excluding indoor and unsuccessful attempts)
    const totalAscents = sportData.length + boulderData.length;
    document.getElementById('total-ascents').textContent = totalAscents;

    // Hardest sport grade
    const hardestSport = getHardestGrade(sportData, SPORT_GRADES);
    document.getElementById('hardest-sport').textContent = hardestSport || 'N/A';

    // Hardest boulder grade
    const hardestBoulder = getHardestGrade(boulderData, BOULDER_GRADES);
    document.getElementById('hardest-boulder').textContent = hardestBoulder || 'N/A';

    // Unique crags count
    const uniqueCrags = new Set([...sportData, ...boulderData].map(row => row['Crag Name']));
    document.getElementById('unique-crags').textContent = uniqueCrags.size;

    // Last updated
    const lastUpdated = new Date().toLocaleDateString();
    document.getElementById('last-updated').textContent = lastUpdated;
    
    // Update new detailed sections
    updateGradePerformance();
    updateFavoriteCrags();
    updateMonthlyActivity();
}

function updateGradePerformance() {
    // Sport climbing performance (Onsight or Flash)
    createPerformanceChart('sport');
    
    // Boulder performance (Flash only)
    createPerformanceChart('boulder');
}

function createPerformanceChart(type) {
    const data = type === 'sport' ? sportData : boulderData;
    const gradeSystem = type === 'sport' ? SPORT_GRADES : BOULDER_GRADES;
    const canvasId = `${type}-performance-chart`;
    
    const gradeStats = {};
    
    // Count total attempts and onsight/flash for each grade
    data.forEach(row => {
        const grade = cleanGrade(row['Route Grade']);
        const ascentType = row['Ascent Type'];
        
        if (gradeSystem[grade]) {
            if (!gradeStats[grade]) {
                gradeStats[grade] = { total: 0, onsightFlash: 0 };
            }
            gradeStats[grade].total++;
            
            // Check for onsight/flash based on climbing type
            if (type === 'sport' && (ascentType === 'Onsight' || ascentType === 'Flash')) {
                gradeStats[grade].onsightFlash++;
            } else if (type === 'boulder' && ascentType === 'Flash') {
                gradeStats[grade].onsightFlash++;
            }
        }
    });
    
    // Sort grades by difficulty
    const sortedGrades = Object.keys(gradeStats).sort((a, b) => gradeSystem[a] - gradeSystem[b]);
    
    // Prepare data for stacked bar chart
    const onsightFlashData = sortedGrades.map(grade => gradeStats[grade].onsightFlash);
    const redpointData = sortedGrades.map(grade => gradeStats[grade].total - gradeStats[grade].onsightFlash);
    
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element not found: ${canvasId}`);
        return;
    }
    const context = ctx.getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const onsightFlashLabel = type === 'sport' ? 'Onsight/Flash' : 'Flash';
    const redpointLabel = type === 'sport' ? 'Red point' : 'Send';
    
    charts[canvasId] = new Chart(context, {
        type: 'bar',
        data: {
            labels: sortedGrades,
            datasets: [
                {
                    label: onsightFlashLabel,
                    data: onsightFlashData,
                    backgroundColor: 'rgba(34, 197, 94, 0.85)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1,
                    borderRadius: function(context) {
                        const index = context.dataIndex;
                        const hasRedpoint = redpointData[index] > 0;
                        return hasRedpoint ? {
                            topLeft: 0,
                            topRight: 0,
                            bottomLeft: 6,
                            bottomRight: 6
                        } : 6; // All corners rounded when no redpoint data
                    },
                    borderSkipped: false,
                },
                {
                    label: redpointLabel,
                    data: redpointData,
                    backgroundColor: 'rgba(239, 68, 68, 0.85)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: function(context) {
                        const index = context.dataIndex;
                        const hasOnsightFlash = onsightFlashData[index] > 0;
                        return hasOnsightFlash ? {
                            topLeft: 6,
                            topRight: 6,
                            bottomLeft: 0,
                            bottomRight: 0
                        } : 6; // All corners rounded when no onsight/flash data
                    },
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2,
                    callbacks: {
                        afterLabel: function(context) {
                            const gradeIndex = context.dataIndex;
                            const grade = sortedGrades[gradeIndex];
                            const stats = gradeStats[grade];
                            const rate = Math.round((stats.onsightFlash / stats.total) * 100);
                            return `${onsightFlashLabel} rate: ${rate}% (${stats.onsightFlash}/${stats.total})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: '#718096'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#718096'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

function updateFavoriteCrags() {
    // Sport crags
    updateCragList('sport');
    
    // Boulder crags
    updateCragList('boulder');
}

function updateCragList(type) {
    const data = type === 'sport' ? sportData : boulderData;
    const cragCounts = {};
    const cragLinks = {};
    
    // Count climbs per crag and store crag links
    data.forEach(row => {
        const crag = row['Crag Name'];
        const cragLink = row['Crag Link'];
        if (crag) {
            cragCounts[crag] = (cragCounts[crag] || 0) + 1;
            if (cragLink && !cragLinks[crag]) {
                cragLinks[crag] = cragLink;
            }
        }
    });
    
    // Sort crags by count and take top 7
    const sortedCrags = Object.entries(cragCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 7);
    
    const containerId = `${type}-favorite-crags`;
    const container = document.getElementById(containerId);
    
    if (container) {
        container.innerHTML = sortedCrags.map(([crag, count]) => {
            const cragName = crag.split(',')[0]; // Take only the first part before comma
            const cragLink = cragLinks[crag];
            
            // Create clickable crag name
            const cragNameElement = cragLink ? 
                `<a href="${cragLink}" target="_blank" rel="noopener noreferrer" class="crag-name-link">${cragName}</a>` : 
                `<span class="crag-name">${cragName}</span>`;
            
            return `
                <div class="crag-item">
                    ${cragNameElement}
                    <span class="crag-count">${count}</span>
                </div>
            `;
        }).join('');
        
        // Ensure content is visible after update
        ensureContentVisible(container);
    }
}

function updateMonthlyActivity() {
    // Sport monthly activity
    updateMonthlyActivityForType('sport');
    
    // Boulder monthly activity
    updateMonthlyActivityForType('boulder');
}

function updateMonthlyActivityForType(type) {
    const data = type === 'sport' ? sportData : boulderData;
    const monthCounts = {};
    const yearCounts = {};
    
    // Count climbs per month and track years
    data.forEach(row => {
        const date = new Date(row['Ascent Date']);
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        
        if (!monthCounts[monthName]) {
            monthCounts[monthName] = 0;
            yearCounts[monthName] = new Set();
        }
        
        monthCounts[monthName]++;
        yearCounts[monthName].add(year);
    });
    
    // Calculate averages and sort chronologically
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthAverages = Object.entries(monthCounts).map(([month, total]) => {
        const yearsActive = yearCounts[month].size;
        const average = Math.round((total / yearsActive) * 10) / 10;
        return { month, total, average, yearsActive };
    }).sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
    
    const containerId = `${type}-monthly-activity`;
    const container = document.getElementById(containerId);
    
    if (container) {
        container.innerHTML = monthAverages.map(({ month, total, average, yearsActive }) => `
            <div class="month-activity-item">
                <div class="month-name">${month}</div>
                <div class="month-average">${average}</div>
                <div class="month-total">${total} total (${yearsActive} years)</div>
            </div>
        `).join('');
        
        // Ensure content is visible after update
        ensureContentVisible(container);
    }
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
    let cleanedGrade = grade.replace(/[\/\-\s]/g, '').split(/[,;]/)[0].trim();
    
    // Normalize sport grades: group lower grades
    // 5a, 5a+, 5b → 5
    // 5b+, 5c, 5c+ → 5+
    if (cleanedGrade === '5a' || cleanedGrade === '5a+' || cleanedGrade === '5b') {
        cleanedGrade = '5';
    } else if (cleanedGrade === '5b+' || cleanedGrade === '5c' || cleanedGrade === '5c+') {
        cleanedGrade = '5+';
    }
    
    // Normalize boulder grades: convert Font scale to V-scale equivalents
    // 5A → 5, 5C → 5+
    else if (cleanedGrade === '5A') {
        cleanedGrade = '5';
    } else if (cleanedGrade === '5C') {
        cleanedGrade = '5+';
    }
    
    return cleanedGrade;
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

    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element not found: ${canvasId}`);
        return;
    }
    const context = ctx.getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(context, {
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
    
    // Group by month and find hardest grade per month (only successful attempts)
    const monthlyProgress = {};
    
    data.forEach(row => {
        const date = new Date(row['Ascent Date']);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const grade = cleanGrade(row['Route Grade']);
        const gradeValue = gradeSystem[grade];
        
        // Only consider successful attempts (already filtered in processData)
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

    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element not found: ${canvasId}`);
        return;
    }
    const context = ctx.getContext('2d');
    
    // Destroy existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(context, {
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
    
    // Ensure content is visible after update
    ensureContentVisible(hardestContainer);
    ensureContentVisible(recentContainer);
}

function createRouteItem(route) {
    const routeName = route['Route Name'] || 'Unknown Route';
    const routeLink = route['Route Link'] || '';
    const grade = cleanGrade(route['Route Grade']) || 'N/A';
    const cragName = route['Crag Name'] || 'Unknown Crag';
    const cragLink = route['Crag Link'] || '';
    const country = route['Country'] || 'Unknown';
    const ascentType = route['Ascent Type'] || 'Unknown';
    const date = new Date(route['Ascent Date']).toLocaleDateString();
    const stars = route['Route Stars'] || '';
    
    const ascentClass = ascentType.toLowerCase().replace(/\s+/g, '');
    
    // Convert star text to visual stars
    const renderStars = (starText) => {
        if (!starText) return '';
        
        // Count the number of stars (asterisks)
        const starCount = (starText.match(/\*/g) || []).length;
        if (starCount === 0) return '';
        
        // Create filled stars
        const filledStars = '★'.repeat(starCount);
        // Create empty stars to make it 3 total (common climbing rating system)
        const emptyStars = starCount < 3 ? `<span class="empty-star">${'☆'.repeat(3 - starCount)}</span>` : '';
        
        const starLabel = starCount === 1 ? '1 star' : `${starCount} stars`;
        return `<span class="route-stars" title="${starLabel} - Route quality rating">${filledStars}${emptyStars}</span>`;
    };
    
    // Get ascent type icon based on the legend
    const getAscentIcon = (ascentType) => {
        const iconMap = {
            'Red point': '🔴',
            'Onsight': '👁️',
            'Flash': '⚡️',
            'Send': '✅'
        };
        return iconMap[ascentType] || '🧗';
    };
    
    // Create clickable route name
    const routeNameElement = routeLink ? 
        `<a href="${routeLink}" target="_blank" rel="noopener noreferrer" class="route-name-link">${routeName}</a>` : 
        `<span class="route-name">${routeName}</span>`;
    
    // Create clickable crag name
    const cragNameElement = cragLink ? 
        `<a href="${cragLink}" target="_blank" rel="noopener noreferrer" class="crag-name-link">${cragName}</a>` : 
        `<span>${cragName}</span>`;
    
    return `
        <div class="route-item ${ascentClass}">
            <div class="route-info">
                <div class="route-header">
                    <div class="route-name-container">
                        <span class="ascent-icon" title="${ascentType}">${getAscentIcon(ascentType)}</span>
                        ${routeNameElement}
                    </div>
                </div>
                <div class="route-details">
                    <span class="route-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${cragNameElement}, ${country}</span>
                    </span>
                    <span class="route-detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${date}</span>
                    </span>
                </div>
            </div>
            <div class="route-grade-container">
                <div class="route-grade">${grade}</div>
                ${renderStars(stars)}
            </div>
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
    const activeButton = document.querySelector(`[data-type="${type}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Update sections
    document.querySelectorAll('.climbing-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(`${type}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add animation
    if (targetSection) {
        targetSection.classList.add('fade-in');
        setTimeout(() => {
            targetSection.classList.remove('fade-in');
        }, 500);
        
        // Re-initialize scroll animations for the new section
        setTimeout(() => {
            reinitializeAnimationsForActiveSection();
            
            // Fallback: ensure all content in the active section is visible
            setTimeout(() => {
                ensureContentVisible(targetSection);
            }, 500);
        }, 100);
    }
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
    switch (ascentType) {
        case 'Onsight':
            return '#10b981'; // Green
        case 'Flash':
            return '#f59e0b'; // Amber
        case 'Red point':
            return '#ef4444'; // Red
        case 'Send':
            return '#8b5cf6'; // Purple
        default:
            return '#6b7280'; // Gray
    }
}

// Handle window resize for charts
window.addEventListener('resize', function() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
});

// Scroll Animation Functions
function initializeScrollAnimations() {
    // Add animation classes to elements
    addScrollAnimationClasses();
    
    // Create intersection observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    
    // Observe all elements with scroll animation classes
    const animatedElements = document.querySelectorAll('[class*="scroll-animate"]');
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

function addScrollAnimationClasses() {
    // Stats cards - scale animation with stagger
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.classList.add('scroll-animate-scale');
        card.style.transitionDelay = `${index * 0.1}s`;
    });
    
    // Section headers - fade in from top
    const sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        header.classList.add('scroll-animate');
    });
    
    // Chart containers - scale and slide up
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach((container, index) => {
        container.classList.add('scroll-animate');
        container.style.transitionDelay = `${index * 0.2}s`;
    });
    
    // Stats containers - slide from alternating sides
    const statsContainers = document.querySelectorAll('.stats-container');
    statsContainers.forEach((container, index) => {
        if (index % 2 === 0) {
            container.classList.add('scroll-animate-left');
        } else {
            container.classList.add('scroll-animate-right');
        }
        container.style.transitionDelay = `${index * 0.15}s`;
    });
    
    // Route containers - slide up
    const routeContainers = document.querySelectorAll('.routes-container');
    routeContainers.forEach(container => {
        container.classList.add('scroll-animate');
    });
    
    // Toggle buttons - fade in
    const toggleContainer = document.querySelector('.toggle-container');
    if (toggleContainer) {
        toggleContainer.classList.add('scroll-animate-fade');
    }
    
    // Footer - slide up
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.classList.add('scroll-animate');
    }
}

function handleIntersection(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Add animation class
            entry.target.classList.add('animate-in');
            
            // Handle special cases for lists and grids
            if (entry.target.classList.contains('routes-container')) {
                animateRouteItems(entry.target);
            } else if (entry.target.classList.contains('stats-container')) {
                animateStatsContent(entry.target);
            }
            
            // Stop observing this element
            observer.unobserve(entry.target);
        }
    });
}

function animateRouteItems(container) {
    const routeItems = container.querySelectorAll('.route-item');
    routeItems.forEach((item, index) => {
        // Remove any existing animation classes first
        item.classList.remove('scroll-animate-stagger', 'animate-in');
        item.style.transitionDelay = '';
        
        // Add animation class
        item.classList.add('scroll-animate-stagger');
        item.style.transitionDelay = `${index * 0.1}s`;
        
        // Trigger animation after a short delay
        setTimeout(() => {
            item.classList.add('animate-in');
        }, 100 + (index * 50));
    });
}

function animateStatsContent(container) {
    // Animate grade performance items
    const gradeItems = container.querySelectorAll('.grade-performance-item');
    gradeItems.forEach((item, index) => {
        // Remove any existing animation classes first
        item.classList.remove('scroll-animate-stagger', 'animate-in');
        item.style.transitionDelay = '';
        
        item.classList.add('scroll-animate-stagger');
        item.style.transitionDelay = `${index * 0.05}s`;
        setTimeout(() => {
            item.classList.add('animate-in');
        }, 200 + (index * 30));
    });
    
    // Animate crag items
    const cragItems = container.querySelectorAll('.crag-item');
    cragItems.forEach((item, index) => {
        // Remove any existing animation classes first
        item.classList.remove('scroll-animate-stagger', 'animate-in');
        item.style.transitionDelay = '';
        
        item.classList.add('scroll-animate-stagger');
        item.style.transitionDelay = `${index * 0.05}s`;
        setTimeout(() => {
            item.classList.add('animate-in');
        }, 300 + (index * 30));
    });
    
    // Animate monthly activity items
    const monthItems = container.querySelectorAll('.month-activity-item');
    monthItems.forEach((item, index) => {
        // Remove any existing animation classes first
        item.classList.remove('scroll-animate-scale', 'animate-in');
        item.style.transitionDelay = '';
        
        item.classList.add('scroll-animate-scale');
        item.style.transitionDelay = `${index * 0.05}s`;
        setTimeout(() => {
            item.classList.add('animate-in');
        }, 400 + (index * 40));
    });
}

// Helper function to ensure content is visible
function ensureContentVisible(container) {
    // Remove animation classes from all child elements to make them visible
    const allElements = container.querySelectorAll('*');
    allElements.forEach(element => {
        if (element.classList.contains('scroll-animate') || 
            element.classList.contains('scroll-animate-stagger') ||
            element.classList.contains('scroll-animate-scale') ||
            element.classList.contains('scroll-animate-left') ||
            element.classList.contains('scroll-animate-right') ||
            element.classList.contains('scroll-animate-fade')) {
            
            // If element doesn't have animate-in class, add it to make it visible
            if (!element.classList.contains('animate-in')) {
                element.classList.add('animate-in');
            }
        }
    });
}

// Re-initialize animations when switching between sport and boulder
function reinitializeAnimationsForActiveSection() {
    const activeSection = document.querySelector('.climbing-section.active');
    if (!activeSection) return;
    
    // Remove existing animation classes and delays from all elements in the active section
    const animatedElements = activeSection.querySelectorAll('[class*="scroll-animate"]');
    animatedElements.forEach(element => {
        element.classList.remove('animate-in');
        element.style.transitionDelay = '';
        // Remove all scroll animation classes
        element.classList.remove('scroll-animate', 'scroll-animate-left', 'scroll-animate-right', 'scroll-animate-scale', 'scroll-animate-fade', 'scroll-animate-stagger');
    });
    
    // Clear any existing timeouts
    setTimeout(() => {
        // Re-add animation classes for containers that are in viewport
        const containers = activeSection.querySelectorAll('.stats-container, .chart-container, .routes-container');
        containers.forEach((container, index) => {
            // Add appropriate animation class
            if (container.classList.contains('stats-container')) {
                if (index % 2 === 0) {
                    container.classList.add('scroll-animate-left');
                } else {
                    container.classList.add('scroll-animate-right');
                }
            } else {
                container.classList.add('scroll-animate');
            }
            
            // If element is in viewport, animate it immediately
            if (isElementInViewport(container)) {
                container.style.transitionDelay = `${index * 0.1}s`;
                setTimeout(() => {
                    container.classList.add('animate-in');
                    
                    // Handle content within containers
                    if (container.classList.contains('routes-container')) {
                        animateRouteItems(container);
                    } else if (container.classList.contains('stats-container')) {
                        animateStatsContent(container);
                    }
                }, 50 + (index * 100));
            } else {
                // For elements not in viewport, set up intersection observer
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('animate-in');
                            
                            if (entry.target.classList.contains('routes-container')) {
                                animateRouteItems(entry.target);
                            } else if (entry.target.classList.contains('stats-container')) {
                                animateStatsContent(entry.target);
                            }
                            
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
                
                observer.observe(container);
            }
        });
    }, 50);
}

function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
} 