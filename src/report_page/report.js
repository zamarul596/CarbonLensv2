import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './report.css';
import logo from '../images/vectorlogo.svg';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  FaShare, 
  FaFileAlt, 
  FaFilePdf, 
  FaFileExcel,
  FaBell,
  FaUser,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const ReportPage = () => {
  const navigate = useNavigate();
  const [reportPeriod, setReportPeriod] = useState('');
  const [reportingStandard, setReportingStandard] = useState('CSI Standard');
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  // Data fetching states
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emissionsData, setEmissionsData] = useState({
    scope1: [],
    scope2: [],
    scope3: []
  });
  const [monthlyEmissions, setMonthlyEmissions] = useState({});
  const [companyData, setCompanyData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);



  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User ${user.uid} signed in` : 'User signed out');
      setAuthUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchEmissionsData = useCallback(async () => {
    try {
      setDataLoading(true);
      
      // Get user's company ID
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      let companyId = 'COMP001'; // Default fallback
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        companyId = userData.companyId || 'COMP001';
        setCompanyData(userData);
      }

      // Fetch scope 1,2 data from Firebase
      const scopeDataRef = collection(db, `companies/${companyId}/scope1_2_data`);
      
      const scopeQuery = query(
        scopeDataRef,
        orderBy('billPeriod', 'desc')
      );
      
      const querySnapshot = await getDocs(scopeQuery);
      console.log('Fetched documents:', querySnapshot.size);
      
      const emissionsByMonth = {};
      const allEmissions = {
        scope1: [],
        scope2: [],
        scope3: []
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const billPeriod = data.billPeriod;
        
        if (billPeriod) {
          // Convert Timestamp to Date
          const billDate = billPeriod instanceof Timestamp ? billPeriod.toDate() : new Date(billPeriod);
          const monthKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = billDate.toLocaleString('default', { month: 'short' }).toLowerCase();
          
          if (!emissionsByMonth[monthKey]) {
            emissionsByMonth[monthKey] = {
              scope1: 0,
              scope2: 0,
              scope3: 0,
              monthName: monthName,
              year: billDate.getFullYear(),
              month: billDate.getMonth()
            };
          }

          // Categorize by utility type
          if (data.utilityType === 'fuel') {
            const fuelEmissions = data.emissions?.total || 0;
            emissionsByMonth[monthKey].scope1 += Number(fuelEmissions) || 0;
            allEmissions.scope1.push({
              ...data,
              emissions: Number(fuelEmissions) || 0,
              monthKey: monthKey
            });
          } else if (data.utilityType === 'electricity') {
            const electricityEmissions = data.emissions?.total || 0;
            emissionsByMonth[monthKey].scope2 += Number(electricityEmissions) || 0;
            allEmissions.scope2.push({
              ...data,
              emissions: Number(electricityEmissions) || 0,
              monthKey: monthKey
            });
          }
        }
      });

      // Fetch scope 3 data
      let allRealData = [];
      
      // Get all users under the company
      const usersRef = collection(db, 'companies', companyId, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      // For each user, fetch their data
      for (const userDoc of usersSnapshot.docs) {
        const employeeUserId = userDoc.id;
        
        const possibleCollections = [
          'employee_commuting',
          'employeeCommuting', 
          'commuting',
          'business_travel',
          'businessTravel',
          'travel'
        ];

        for (const collectionName of possibleCollections) {
          try {
            const collectionRef = collection(db, 'companies', companyId, 'users', employeeUserId, collectionName);
            const snapshot = await getDocs(collectionRef);
            
            if (snapshot.docs.length > 0) {
              const docs = snapshot.docs.map(doc => {
                const realData = doc.data();
                return {
                  id: doc.id,
                  ...realData,
                  type: collectionName.includes('Commuting') ? 'Commuting' : 'Business Travel',
                  collectionName: collectionName,
                  userId: employeeUserId,
                  isCommuting: collectionName.includes('Commuting'),
                  isBusinessTravel: collectionName.includes('Travel')
                };
              });
              allRealData = [...allRealData, ...docs];
            }
          } catch (error) {
            console.log(`Error fetching ${collectionName} for employee ${employeeUserId}:`, error.message);
          }
        }
      }

      // If no data found from employees, try company-level collections
      if (allRealData.length === 0) {
        const companyLevelCollections = [
          'employee_commuting',
          'business_travel',
          'employeeCommuting',
          'businessTravel'
        ];

        for (const collectionName of companyLevelCollections) {
          try {
            const collectionRef = collection(db, 'companies', companyId, collectionName);
            const snapshot = await getDocs(collectionRef);
            
            if (snapshot.docs.length > 0) {
              const docs = snapshot.docs.map(doc => {
                const realData = doc.data();
                return {
                  id: doc.id,
                  ...realData,
                  type: collectionName.includes('commuting') ? 'Commuting' : 'Business Travel',
                  collectionName: collectionName,
                  userId: 'company_level'
                };
              });
              allRealData = [...allRealData, ...docs];
            }
          } catch (error) {
            console.log(`Error fetching company-level collection ${collectionName}:`, error.message);
          }
        }
      }

      // Process scope 3 data
      let processedData = [];
      
      allRealData.forEach(item => {
        const data = item;
        
        // If this is business travel with segments, create separate entries for each segment
        if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
          data.segments.forEach((segment, segmentIndex) => {
            processedData.push({
              id: `${item.id}_segment_${segmentIndex}`,
              ...data,
              ...segment,
              type: 'Business Travel',
              collectionName: item.collectionName,
              userId: item.userId,
              isCommuting: false,
              isBusinessTravel: true,
              emissions: segment.emissions || 0,
              distance: segment.distance || 0,
              mode: segment.mode || 'Unknown',
              date: segment.date || data.date || '',
              purpose: segment.purpose || data.purpose || '',
              fromLocation: segment.fromLocation || '',
              toLocation: segment.toLocation || '',
              employeeId: data.employeeId || segment.employeeId || data.userId || 'Unknown',
              totalDistance: data.totalDistance || 0,
              totalEmissions: data.totalEmissions || 0,
              status: data.status || '',
              submittedAt: data.submittedAt || '',
              displayMode: segment.mode || segment.purpose || data.purpose || 'Unknown',
              isSegment: true,
              parentId: item.id,
              segmentIndex: segmentIndex
            });
          });
        } else {
          // Regular commuting data or business travel without segments
          processedData.push({
            id: item.id,
            ...data,
            type: data.type,
            emissions: data.emissions || data.totalEmissions || 0,
            distance: data.distance || data.roundTripDistance || data.totalDistance || 0,
            mode: data.transportMethod || data.transportType || data.mode || 'Unknown',
            date: data.date || '',
            employeeId: data.employeeId || data.userId || 'Unknown',
            month: data.month || '',
            year: data.year || '',
            purpose: data.purpose || '',
            destination: data.destination || '',
            createdAt: data.createdAt || '',
            checkInTime: data.checkInTime || '',
            transportMethod: data.transportMethod || '',
            transportType: data.transportType || '',
            roundTripDistance: data.roundTripDistance || 0,
            totalDistance: data.totalDistance || 0,
            totalEmissions: data.totalEmissions || 0,
            segments: data.segments || [],
            status: data.status || '',
            submittedAt: data.submittedAt || '',
            displayMode: data.transportMethod || data.transportType || data.mode || data.purpose || 'Unknown',
            isSegment: false
          });
        }
      });

      // Group scope 3 data by month and calculate emissions
      processedData.forEach(item => {
        let itemMonth = item.month || '';
        let itemYear = item.year || '';
        
        if (!itemMonth || !itemYear) {
          const dateStr = item.date || '';
          if (dateStr) {
            let date;
            if (dateStr.includes('T')) {
              date = new Date(dateStr);
            } else if (dateStr.includes('-')) {
              date = new Date(dateStr);
            } else {
              date = new Date(parseInt(dateStr));
            }
            
            if (!isNaN(date.getTime())) {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              itemMonth = monthNames[date.getMonth()];
              itemYear = date.getFullYear().toString();
            }
          }
        }
        
        if (!itemMonth || !itemYear) {
          const createdAt = item.createdAt;
          if (createdAt) {
            let date;
            if (createdAt.toDate) {
              date = createdAt.toDate();
            } else if (typeof createdAt === 'number') {
              date = new Date(createdAt);
            } else if (typeof createdAt === 'string') {
              date = new Date(createdAt);
            }
            
            if (date && !isNaN(date.getTime())) {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              itemMonth = monthNames[date.getMonth()];
              itemYear = date.getFullYear().toString();
            }
          }
        }
        
        if (itemMonth && itemYear) {
          const monthKey = `${itemYear}-${String(new Date(itemMonth + ' 1, ' + itemYear).getMonth() + 1).padStart(2, '0')}`;
          const monthName = new Date(itemMonth + ' 1, ' + itemYear).toLocaleString('default', { month: 'short' }).toLowerCase();
          
          if (!emissionsByMonth[monthKey]) {
            emissionsByMonth[monthKey] = {
              scope1: 0,
              scope2: 0,
              scope3: 0,
              monthName: monthName,
              year: parseInt(itemYear),
              month: new Date(itemMonth + ' 1, ' + itemYear).getMonth()
            };
          }
          
          const emissions = Number(item.emissions) || 0;
          emissionsByMonth[monthKey].scope3 += emissions;
          
          allEmissions.scope3.push({
            ...item,
            emissions: emissions,
            monthKey: monthKey
          });
        }
      });

      console.log('Processed emissions by month:', emissionsByMonth);
      console.log('All emissions data:', allEmissions);

      setEmissionsData(allEmissions);
      setMonthlyEmissions(emissionsByMonth);
      setDataLoading(false);
    } catch (error) {
      console.error('Error fetching emissions data:', error);
      setDataLoading(false);
    }
  }, [authUser]);

  // Fetch emissions data when user is authenticated
  useEffect(() => {
    if (authUser && !authLoading) {
      fetchEmissionsData();
    }
  }, [authUser, authLoading, fetchEmissionsData]);

  // Calculate totals for report
  const calculateTotals = () => {
    const scope1Total = emissionsData.scope1.reduce((sum, item) => sum + (item.emissions || 0), 0);
    const scope2Total = emissionsData.scope2.reduce((sum, item) => sum + (item.emissions || 0), 0);
    const scope3Total = emissionsData.scope3.reduce((sum, item) => sum + (item.emissions || 0), 0);
    
    // Convert from kg CO2e to tCO2e (divide by 1000)
    return {
      scope1: scope1Total / 1000,
      scope2: scope2Total / 1000,
      scope3: scope3Total / 1000,
      total: (scope1Total + scope2Total + scope3Total) / 1000
    };
  };

  // Generate usage data summary
  const generateUsageDataSummary = () => {
    const scope1Usage = emissionsData.scope1.map(item => ({
      type: item.utilityType === 'fuel' ? 'Fuel Consumption' : 'Other',
      value: item.usage?.value || item.usage || 0,
      unit: item.usage?.unit || 'liters',
      emissions: (item.emissions || 0) / 1000, // Convert from kg CO2e to tCO2e
      fuelType: item.utilityType === 'fuel' ? (item.fuelType || 'petrol') : null
    }));

    const scope2Usage = emissionsData.scope2.map(item => ({
      type: 'Electricity Consumption',
      value: item.usage?.value || item.usage || 0,
      unit: 'kWh',
      emissions: (item.emissions || 0) / 1000 // Convert from kg CO2e to tCO2e
    }));

    // Group scope 3 by transport mode for better summary
    const scope3ByMode = {};
    emissionsData.scope3.forEach(item => {
      const mode = item.mode || item.transportMethod || item.transportType || 'Unknown';
      const type = item.type === 'Business Travel' ? 'Business Travel' : 'Employee Commuting';
      const key = `${type} - ${mode}`;
      
      if (!scope3ByMode[key]) {
        scope3ByMode[key] = {
          type: key,
          value: 0,
          unit: 'km',
          emissions: 0,
          mode: mode,
          travelType: type
        };
      }
      
      scope3ByMode[key].value += item.distance || 0;
      scope3ByMode[key].emissions += (item.emissions || 0) / 1000; // Convert from kg CO2e to tCO2e
    });

    const scope3Usage = Object.values(scope3ByMode);

    return {
      scope1: scope1Usage,
      scope2: scope2Usage,
      scope3: scope3Usage
    };
  };

  // Chart data for emissions visualization
  const getEmissionsChartData = () => {
    const totals = calculateTotals();
    const total = totals.scope1 + totals.scope2 + totals.scope3;
    
    const scope1Percentage = total > 0 ? ((totals.scope1 / total) * 100).toFixed(1) : '0.0';
    const scope2Percentage = total > 0 ? ((totals.scope2 / total) * 100).toFixed(1) : '0.0';
    const scope3Percentage = total > 0 ? ((totals.scope3 / total) * 100).toFixed(1) : '0.0';
    
    return {
      labels: [`Scope 1 (${scope1Percentage}%)`, `Scope 2 (${scope2Percentage}%)`, `Scope 3 (${scope3Percentage}%)`],
      datasets: [{
        data: [totals.scope1, totals.scope2, totals.scope3],
        backgroundColor: ['#0066FF', '#34C759', '#FFB800'],
        borderColor: ['#0066FF', '#34C759', '#FFB800'],
        borderWidth: 2
      }]
    };
  };

  const getMonthlyTrendData = () => {
    const sortedMonths = Object.keys(monthlyEmissions).sort();
    const labels = sortedMonths.map(key => {
      const month = monthlyEmissions[key];
      return `${month.monthName} ${month.year}`;
    });
    
    const scope1Data = sortedMonths.map(key => (monthlyEmissions[key].scope1 || 0) / 1000); // Convert from kg CO2e to tCO2e
    const scope2Data = sortedMonths.map(key => (monthlyEmissions[key].scope2 || 0) / 1000); // Convert from kg CO2e to tCO2e
    const scope3Data = sortedMonths.map(key => (monthlyEmissions[key].scope3 || 0) / 1000); // Convert from kg CO2e to tCO2e
    
    return {
      labels: labels,
      datasets: [
        {
          label: 'Scope 1',
          data: scope1Data,
          borderColor: '#0066FF',
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
          tension: 0.4
        },
        {
          label: 'Scope 2',
          data: scope2Data,
          borderColor: '#34C759',
          backgroundColor: 'rgba(52, 199, 89, 0.1)',
          tension: 0.4
        },
        {
          label: 'Scope 3',
          data: scope3Data,
          borderColor: '#FFB800',
          backgroundColor: 'rgba(255, 184, 0, 0.1)',
          tension: 0.4
        }
      ]
    };
  };



  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#34C759',
        borderWidth: 1
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toFixed(2)} tCO₂e (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: false
      }
    }
  };



  // Get available years with data
  const getAvailableDataYears = () => {
    const years = new Set();
    
    // Add years from scope 1 and 2 data
    Object.keys(monthlyEmissions).forEach(monthKey => {
      const month = monthlyEmissions[monthKey];
      if (month.scope1 > 0 || month.scope2 > 0) {
        years.add(month.year);
      }
    });
    
    // Add years from scope 3 data
    emissionsData.scope3.forEach(item => {
      let itemYear = null;
      
      if (item.year) {
        itemYear = parseInt(item.year);
      } else if (item.date) {
        const date = new Date(item.date);
        if (!isNaN(date.getTime())) {
          itemYear = date.getFullYear();
        }
      } else if (item.createdAt) {
        let date;
        if (item.createdAt.toDate) {
          date = item.createdAt.toDate();
        } else {
          date = new Date(item.createdAt);
        }
        if (!isNaN(date.getTime())) {
          itemYear = date.getFullYear();
        }
      }
      
      if (itemYear) {
        years.add(itemYear);
      }
    });
    
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  };

  // Check if selected year has any emissions data
  const hasDataForYear = (selectedYear) => {
    if (!selectedYear) return false;
    
    // Check if any emissions data exists for the selected year
    const yearInt = parseInt(selectedYear);
    
    // Check scope 1 and 2 data
    const hasScope12Data = Object.keys(monthlyEmissions).some(monthKey => {
      const month = monthlyEmissions[monthKey];
      return month.year === yearInt && (month.scope1 > 0 || month.scope2 > 0);
    });
    
    // Check scope 3 data
    const hasScope3Data = emissionsData.scope3.some(item => {
      // Extract year from various date formats in scope 3 data
      let itemYear = null;
      
      if (item.year) {
        itemYear = parseInt(item.year);
      } else if (item.date) {
        const date = new Date(item.date);
        if (!isNaN(date.getTime())) {
          itemYear = date.getFullYear();
        }
      } else if (item.createdAt) {
        let date;
        if (item.createdAt.toDate) {
          date = item.createdAt.toDate();
        } else {
          date = new Date(item.createdAt);
        }
        if (!isNaN(date.getTime())) {
          itemYear = date.getFullYear();
        }
      }
      
      return itemYear === yearInt;
    });
    
    return hasScope12Data || hasScope3Data;
  };

  // Validation functions
  const validateReportConfiguration = () => {
    const errors = {};

    // Validate report period is not empty
    if (!reportPeriod) {
      errors.reportPeriod = 'Please select a report period';
    }

    // Validate reporting standard is selected
    if (!reportingStandard) {
      errors.reportingStandard = 'Please select a reporting standard';
    }

    // Check if selected year has data
    if (reportPeriod && !hasDataForYear(reportPeriod)) {
      const availableYears = getAvailableDataYears();
      if (availableYears.length > 0) {
        errors.noData = `No emissions data found for ${reportPeriod}. Available years: ${availableYears.join(', ')}`;
      } else {
        errors.noData = `No emissions data found for ${reportPeriod}. Please upload data first.`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };



  // Alternative method using chart container IDs
  const captureChartById = async (containerId, chartName) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.log(`Container with ID ${containerId} not found`);
        return null;
      }

      console.log(`Capturing ${chartName} by ID: ${containerId}`);

      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      return canvas.toDataURL('image/png', 1.0);
    } catch (error) {
      console.error(`Error capturing ${chartName} by ID:`, error);
      return null;
    }
  };

  const generateReportData = () => {
    // Include all scopes in CSI Standard report
    const selectedScopes = ['scope1', 'scope2', 'scope3'];

    const totals = calculateTotals();
    const usageSummary = generateUsageDataSummary();

    const reportData = {
      period: reportPeriod || new Date().getFullYear().toString(),
      standard: reportingStandard,
      scopes: selectedScopes,
      generatedAt: new Date().toLocaleString(),
      companyName: companyData?.companyName || 'Company Name',
      overview: {
        totalEmissions: `${totals.total.toFixed(2)} tCO₂e`,
        scope1Emissions: `${totals.scope1.toFixed(2)} tCO₂e`,
        scope2Emissions: `${totals.scope2.toFixed(2)} tCO₂e`,
        scope3Emissions: `${totals.scope3.toFixed(2)} tCO₂e`,
        totalRecords: emissionsData.scope1.length + emissionsData.scope2.length + emissionsData.scope3.length
      },
      usageData: usageSummary,
      totals: totals,
      // Raw record-level data for summary table
      records: {
        scope1: emissionsData.scope1.map(item => ({
          activity: item.utilityType === 'fuel' ? 'Fuel Consumption' : 'Other',
          usage: Number(item.usage?.value || item.usage || 0),
          unit: item.usage?.unit || 'liters',
          transportOrFuel: item.fuelType || 'petrol',
          emissions: Number(item.emissions || 0) / 1000 // Convert from kg CO2e to tCO2e
        })),
        scope2: emissionsData.scope2.map(item => ({
          activity: 'Electricity Consumption',
          usage: Number(item.usage?.value || item.usage || 0),
          unit: 'kWh',
          transportOrFuel: '-',
          emissions: Number(item.emissions || 0) / 1000 // Convert from kg CO2e to tCO2e
        })),
        scope3: emissionsData.scope3.map(item => ({
          activity: item.type === 'Business Travel' ? 'Business Travel' : 'Employee Commuting',
          usage: Number(item.distance || 0),
          unit: 'km',
          transportOrFuel: item.mode || item.transportMethod || item.transportType || 'Unknown',
          emissions: Number(item.emissions || 0) / 1000 // Convert from kg CO2e to tCO2e
        }))
      }
    };

    // Include data for all scopes
    const scopeData = {
      'scope1': {
        title: 'Scope 1 Emissions',
        data: usageSummary.scope1.map(item => ({
          metric: item.type,
          value: item.value,
          unit: item.unit,
          emissions: item.emissions
        }))
      },
      'scope2': {
        title: 'Scope 2 Emissions',
        data: usageSummary.scope2.map(item => ({
          metric: item.type,
          value: item.value,
          unit: item.unit,
          emissions: item.emissions
        }))
      },
      'scope3': {
        title: 'Scope 3 Emissions',
        data: usageSummary.scope3.map(item => ({
          metric: item.type,
          value: item.value,
          unit: item.unit,
          emissions: item.emissions
        }))
      }
    };

    reportData.detailedData = reportData.scopes.map(scope => scopeData[scope]).filter(Boolean);
    return reportData;
  };

  const generatePDF = async (reportData) => {
    const doc = new jsPDF();
    
    // Professional typography settings
    doc.setFont('helvetica', 'normal');
    doc.setLineHeightFactor(1.4);
    
    // Page dimensions and margins
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const bottomMargin = 30;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    // Check which scopes have data
    const hasScope1Data = reportData.usageData.scope1.length > 0;
    const hasScope2Data = reportData.usageData.scope2.length > 0;
    const hasScope3Data = reportData.usageData.scope3.length > 0;
    
    let yPosition = 20;
    
    const ensureSpace = (neededHeight) => {
      if (yPosition + neededHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Enhanced text normalization
    const normalizeText = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/[\u00A0\u202F\u2007\u2009]/g, ' ') // Remove various space characters
        .replace(/[\u2012\u2013\u2014\u2212]/g, '-') // Normalize dashes
        .replace(/[\u2018\u2019]/g, "'") // Normalize quotes
        .replace(/[\u201C\u201D]/g, '"') // Normalize double quotes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Professional header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ESG Environmental Reporting – Bursa Malaysia Standard', leftMargin, yPosition);
    yPosition += 12;
    
    // Company and period info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Company Name: ${companyData?.name || 'CarbonLens'}`, leftMargin, yPosition);
    yPosition += 6;
    doc.text(`Reporting Period: ${reportData.period}`, leftMargin, yPosition);
    yPosition += 6;
    doc.text(`Reporting Framework: ${reportData.standard}`, leftMargin, yPosition);
    yPosition += 15;

    // Definitions section
    if (hasScope1Data || hasScope2Data || hasScope3Data) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Definition of Scope 1, 2, and 3 Emissions', leftMargin, yPosition);
      yPosition += 12;

      const addDefinition = (title, paragraph) => {
        ensureSpace(25);
        const cleanTitle = normalizeText(title);
        const cleanParagraph = normalizeText(paragraph);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(cleanTitle, leftMargin, yPosition);
      yPosition += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(cleanParagraph, contentWidth);
        wrapped.forEach((line) => {
          ensureSpace(6);
          doc.text(line, leftMargin, yPosition);
          yPosition += 5.5;
        });
        yPosition += 8;
      };

      if (hasScope1Data) {
        addDefinition(
          'Scope 1 – Direct emissions from owned or controlled operations',
          'These are greenhouse gases released directly from sources that are owned or controlled by the company itself. Typical activities include combustion of fuels in stationary equipment (e.g., generators, boilers), combustion of fuels in mobile equipment (e.g., company vehicles), process emissions arising from industrial chemistry, and fugitive releases such as refrigerant leaks. These emissions are the most controllable as they originate within the organization\'s operational boundary.'
        );
      }

      if (hasScope2Data) {
        addDefinition(
          'Scope 2 – Indirect emissions from purchased energy',
          'Scope 2 includes indirect emissions that occur at off-site power plants as a consequence of the organization\'s consumption of purchased electricity and, where relevant, purchased steam, heating, or cooling. Although the combustion does not happen on company premises, the demand for energy is created by company operations. These emissions are influenced by electricity intensity, energy efficiency programs, and the emission factor of the grid or supplier contract.'
        );
      }

      if (hasScope3Data) {
        addDefinition(
          'Scope 3 – Other indirect emissions across the value chain',
          'Scope 3 encompasses all remaining indirect emissions that are a consequence of business activities but occur from sources not owned or directly controlled by the organization. Examples include employee commuting, business travel (by air, rail, road), upstream and downstream transportation and distribution, waste generated in operations, purchased goods and services, capital goods, and end-of-life treatment of sold products. These categories often represent the largest share of a company\'s footprint and require supplier engagement and activity-based data to estimate reliably.'
        );
      }
    }

    // Summary Table
    yPosition += 8;
      doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Scope 1, 2, and 3 Greenhouse Gas Emissions Summary', leftMargin, yPosition);
    yPosition += 12;

    const totals = reportData.totals;
    const summaryRows = [];
    
    if (reportData.records.scope1.length > 0) {
      reportData.records.scope1.forEach(r => {
        summaryRows.push(['Scope 1', r.activity, r.usage.toFixed(2), r.unit, r.transportOrFuel || '-', r.emissions.toFixed(2)]);
      });
    }
    if (reportData.records.scope2.length > 0) {
      reportData.records.scope2.forEach(r => {
        summaryRows.push(['Scope 2', r.activity, r.usage.toFixed(2), r.unit, r.transportOrFuel || '-', r.emissions.toFixed(2)]);
      });
    }
    if (reportData.records.scope3.length > 0) {
      reportData.records.scope3.forEach(r => {
        summaryRows.push(['Scope 3', r.activity, r.usage.toFixed(2), r.unit, r.transportOrFuel || '-', r.emissions.toFixed(2)]);
      });
    }
    
    if (summaryRows.length > 0) {
      summaryRows.push(['Total', '', '', '', '', totals.total.toFixed(2)]);
    }

    ensureSpace(40);
    
    // Create body rows with different cell colors for each scope
    const coloredBodyRows = summaryRows.map(row => {
      const scope = row[0];
      let cellStyles = {};
      
      if (scope === 'Scope 1') {
        // Very light blue cells for Scope 1
        cellStyles = {
          0: { fillColor: [240, 248, 255] }, // Alice blue for scope cell
          1: { fillColor: [230, 240, 250] }, // Very light blue for activity
          2: { fillColor: [220, 230, 245] }, // Light blue for usage
          3: { fillColor: [210, 220, 240] }, // Light blue for unit
          4: { fillColor: [200, 210, 235] }, // Light blue for transport/fuel
          5: { fillColor: [190, 200, 230] }  // Light blue for emissions
        };
      } else if (scope === 'Scope 2') {
        // Very light green cells for Scope 2
        cellStyles = {
          0: { fillColor: [240, 255, 240] }, // Honeydew for scope cell
          1: { fillColor: [230, 250, 230] }, // Very light green for activity
          2: { fillColor: [220, 245, 220] }, // Light green for usage
          3: { fillColor: [210, 240, 210] }, // Light green for unit
          4: { fillColor: [200, 235, 200] }, // Light green for transport/fuel
          5: { fillColor: [190, 230, 190] }  // Light green for emissions
        };
      } else if (scope === 'Scope 3') {
        // Very light yellow/orange cells for Scope 3
        cellStyles = {
          0: { fillColor: [255, 250, 240] }, // Floral white for scope cell
          1: { fillColor: [255, 245, 230] }, // Very light orange for activity
          2: { fillColor: [255, 240, 220] }, // Light orange for usage
          3: { fillColor: [255, 235, 210] }, // Light orange for unit
          4: { fillColor: [255, 230, 200] }, // Light orange for transport/fuel
          5: { fillColor: [255, 225, 190] }  // Light orange for emissions
        };
      } else if (scope === 'Total') {
        // Very light gray cells for Total row
        cellStyles = {
          0: { fillColor: [250, 250, 250], fontStyle: 'bold' }, // Very light gray for scope cell
          1: { fillColor: [245, 245, 245], fontStyle: 'bold' }, // Light gray for activity
          2: { fillColor: [240, 240, 240], fontStyle: 'bold' }, // Light gray for usage
          3: { fillColor: [235, 235, 235], fontStyle: 'bold' }, // Light gray for unit
          4: { fillColor: [230, 230, 230], fontStyle: 'bold' }, // Light gray for transport/fuel
          5: { fillColor: [225, 225, 225], fontStyle: 'bold' }  // Light gray for emissions
        };
      }
      
      return { ...row, cellStyles: cellStyles };
    });
    
    doc.autoTable({
      startY: yPosition,
      head: [['Emission Scope', 'Activity', 'Usage', 'Unit', 'Transport/Fuel', 'Emissions (tCO₂e)']],
      body: coloredBodyRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [34, 199, 89], // Green color for header
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8, 
        overflow: 'linebreak', 
        cellPadding: 2, 
        lineHeight: 1.3 
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'left' },
        1: { cellWidth: 50, halign: 'left' },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 40, halign: 'left' },
        5: { cellWidth: 18, halign: 'right' }
      },
      tableWidth: contentWidth,
      margin: { left: leftMargin, right: rightMargin },
      didParseCell: function(data) {
        // Apply cell-specific styling based on scope
        const rowIndex = data.row.index;
        const cellIndex = data.column.index;
        
        if (data.row.index > 0) { // Skip header row
          const rowData = coloredBodyRows[rowIndex - 1];
          if (rowData && rowData.cellStyles && rowData.cellStyles[cellIndex]) {
            Object.assign(data.cell.styles, rowData.cellStyles[cellIndex]);
          }
        }
      }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Methodology Section
    if (hasScope1Data || hasScope2Data || hasScope3Data) {
      ensureSpace(25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Collection and Calculation Methodology', leftMargin, yPosition);
      yPosition += 12;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Emission Factors
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.text('Emission Factors Used:', leftMargin, yPosition);
        yPosition += 10;
      
      doc.setFont('times', 'normal');
      
      if (hasScope1Data) {
        ensureSpace(25);
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text('Scope 1 (Fuel Consumption):', leftMargin, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.text('• Diesel: 2.86 kg CO₂e per liter', leftMargin + 10, yPosition);
        yPosition += 7;
        doc.text('• RON95: 2.37 kg CO₂e per liter', leftMargin + 10, yPosition);
        yPosition += 7;
        doc.text('• RON97: 2.40 kg CO₂e per liter', leftMargin + 10, yPosition);
        yPosition += 12;
      }
      
      if (hasScope2Data) {
        ensureSpace(15);
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text('Scope 2 (Electricity):', leftMargin, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.text('• Malaysia Grid Mix: 0.774 kg CO₂e per kWh', leftMargin + 10, yPosition);
        yPosition += 12;
      }
      
      if (hasScope3Data) {
        ensureSpace(70);
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text('Scope 3 (Transport):', leftMargin, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.text('• Employee Commuting & Business Travel:', leftMargin + 10, yPosition);
        yPosition += 7;
        doc.text('  - Car (petrol): 0.171 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Car (diesel): 0.160 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Car (EV): 0.054 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Car (hybrid): 0.120 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Motorcycle (petrol): 0.103 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Motorcycle (EV): 0.054 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Bus: 0.104 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Train: 0.041 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - LRT: 0.041 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Bicycle: 0 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Walk: 0 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Plane (Short-haul): 0.255 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 6;
        doc.text('  - Plane (Long-haul): 0.139 kg CO₂e per km', leftMargin + 15, yPosition);
        yPosition += 12;
      }
      
      // Calculation Formulas
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.text('Calculation Formulas:', leftMargin, yPosition);
        yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      if (hasScope1Data) {
        ensureSpace(8);
        const formula1 = 'Scope 1: Emissions (kg CO₂e) = Fuel Consumption (liters) × Emission Factor';
        const wrapped1 = doc.splitTextToSize(formula1, contentWidth - 60);
        wrapped1.forEach((line) => {
          ensureSpace(6);
          doc.text(line, leftMargin, yPosition);
          yPosition += 6;
        });
        yPosition += 4;
      }
      if (hasScope2Data) {
        ensureSpace(8);
        const formula2 = 'Scope 2: Emissions (kg CO₂e) = Electricity Usage (kWh) × Grid Emission Factor';
        const wrapped2 = doc.splitTextToSize(formula2, contentWidth - 60);
        wrapped2.forEach((line) => {
          ensureSpace(6);
          doc.text(line, leftMargin, yPosition);
          yPosition += 6;
        });
        yPosition += 4;
      }
      if (hasScope3Data) {
        ensureSpace(8);
        const formula3 = 'Scope 3: Emissions (kg CO₂e) = Distance (km) × Transport Mode Emission Factor';
        const wrapped3 = doc.splitTextToSize(formula3, contentWidth - 60);
        wrapped3.forEach((line) => {
          ensureSpace(6);
          doc.text(line, leftMargin, yPosition);
          yPosition += 6;
        });
        yPosition += 4;
      }
      yPosition += 12;
      
      // Methodology notes
      ensureSpace(25);
      doc.setFont('helvetica', 'normal');
      doc.text('• Usage data was collected from company utility bills and travel records.', leftMargin, yPosition);
      yPosition += 7;
      doc.text('• Emission factors are based on IPCC and Malaysian Grid Mix for Scope 1 & 2.', leftMargin, yPosition);
      yPosition += 7;
      doc.text('• Transport emission factors are based on DEFRA guidelines for Scope 3.', leftMargin, yPosition);
      yPosition += 7;
      doc.text('• All calculations are verified and documented for accuracy.', leftMargin, yPosition);
    }

    // Emissions Visualization Section
    if (hasScope1Data || hasScope2Data || hasScope3Data) {
      yPosition += 15;
      ensureSpace(100);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Emissions Visualization (Graph/Chart)', leftMargin, yPosition);
      yPosition += 20;

      // Add emissions breakdown chart
      const emissionsChartImage = await captureChartById('emissions-breakdown-chart', 'Emissions Breakdown Chart');
      if (emissionsChartImage) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Figure 1: Breakdown of Greenhouse Gas Emissions by Scope for the Reporting Year', leftMargin, yPosition);
        yPosition += 12;
        ensureSpace(100);
        
        // Use square aspect ratio for doughnut chart to prevent compression
        const chartWidth = Math.min(contentWidth, 120);
        const chartHeight = chartWidth; // Square aspect ratio
        doc.addImage(emissionsChartImage, 'PNG', leftMargin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 15;
      }

      // Add monthly trend chart
      if (Object.keys(monthlyEmissions).length > 0) {
        const monthlyTrendImage = await captureChartById('monthly-trend-chart', 'Monthly Trend Chart');
        if (monthlyTrendImage) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          ensureSpace(95);
          doc.text('Figure 2: Monthly Emissions Trend by Scope', leftMargin, yPosition);
          yPosition += 8;
          doc.addImage(monthlyTrendImage, 'PNG', leftMargin, yPosition, contentWidth, 80);
          yPosition += 90;
        }
      }
    }

    // Notes and Future Commitments
          doc.addPage();
          yPosition = 20;

        doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes and Future Commitments', leftMargin, yPosition);
    yPosition += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notes = [
      '• Due to the current absence of business activity metrics like revenue or production volume, emission intensity metrics could not be calculated for this reporting cycle.',
      '• The company commits to enhancing data collection in future reporting cycles to enable calculation of emission intensity and other advanced KPIs.',
      '• Additional ESG components such as Corporate Social Investment (CSI) activities and governance disclosures will be included in subsequent reports.'
    ];

    notes.forEach(note => {
      ensureSpace(12);
      const wrapped = doc.splitTextToSize(note, contentWidth);
      wrapped.forEach((line) => {
        ensureSpace(6);
        doc.text(line, leftMargin, yPosition);
        yPosition += 5.5;
      });
      yPosition += 4;
    });

    // Footer
    yPosition += 20;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Prepared by: ${companyData?.name || 'CarbonLens System'}`, leftMargin, yPosition);
    yPosition += 7;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin, yPosition);

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('© 2025 CarbonLens. All rights reserved.', leftMargin, 285);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - rightMargin, 285, { align: 'right' });
    }

    return doc;
  };

  const generateReport = () => {
    // First check if year has data before other validations
    if (reportPeriod && !hasDataForYear(reportPeriod)) {
      const availableYears = getAvailableDataYears();
      let message = `❌ No Data Available\n\nNo emissions data found for the year ${reportPeriod}.`;
      
      if (availableYears.length > 0) {
        message += `\n\nYears with available data: ${availableYears.join(', ')}`;
        message += `\n\nPlease:\n• Select one of the available years: ${availableYears.join(', ')}\n• Upload emissions data for ${reportPeriod}\n• Check if data has been properly submitted for all scopes`;
      } else {
        message += `\n\nNo emissions data found for any year.\n\nPlease:\n• Upload emissions data first\n• Ensure data has been properly submitted for all scopes\n• Contact support if you believe this is an error`;
      }
      
      alert(message);
      return;
    }

    if (!validateReportConfiguration()) {
      return;
    }

    setIsGenerating(true);
    
    // Simulate report generation process
    setTimeout(() => {
      const reportData = generateReportData();
      setLastGenerated(reportData);
      setIsGenerating(false);
      
      // Show success message
      alert(`✅ Report generated successfully!\n\nPeriod: ${reportData.period}\nStandard: ${reportData.standard}\nIncludes: All scopes (Scope 1, 2, and 3)\n\nClick "Download PDF" to save your report.`);
    }, 1500);
  };

  const downloadPDF = async () => {
    if (!lastGenerated) {
      alert('Please generate a report first before downloading.');
      return;
    }

    try {
      console.log('Starting PDF generation with charts...');
      const doc = await generatePDF(lastGenerated);
      const fileName = `CarbonLens_Report_${lastGenerated.period}_${Date.now()}.pdf`;
      doc.save(fileName);
      
      alert(`✅ PDF downloaded successfully as: ${fileName}\n\nThe report includes:\n• Report overview\n• ESG performance trends\n• ${lastGenerated.standard} charts and analysis\n• Detailed scope data`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('❌ Error generating PDF. Please try again.\n\nIf charts are missing, please wait a moment for them to fully load and try again.');
    }
  };

  const downloadExcel = () => {
    alert('Downloading Excel data...');
  };

  const shareReport = () => {
    alert('Sharing report...');
  };

  return (
    <div className="report-page">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <img src={logo} alt="CarbonLens" />
          <span>CarbonLens</span>
        </div>
        
        <nav className="nav-links">
          <a href="/dashboard" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            Dashboard
          </a>
          <a href="/reports" className="nav-link active" onClick={(e) => { e.preventDefault(); }}>Reports</a>
        </nav>
        
        <div className="header-actions">
          <a href="/contact" className="contact-link">Contact Us</a>
          <button className="notification-btn"><FaBell /></button>
          <button className="profile-btn"><FaUser /></button>
        </div>
      </header>

      <div className="report-container">
        {/* Sidebar */}
        <aside className="report-sidebar">
          <div className="sidebar-section">
            <h3>Report Configuration</h3>
            <div className="form-group">
              <label>Report Period <span className="required">*</span></label>
              <select 
                value={reportPeriod} 
                onChange={(e) => {
                  const selectedYear = e.target.value;
                  setReportPeriod(selectedYear);
                  
                  // Clear validation errors first
                  setValidationErrors(prev => ({ 
                    ...prev, 
                    reportPeriod: null,
                    noData: null 
                  }));
                  
                  // Check for data availability immediately if year is selected
                  if (selectedYear && !dataLoading) {
                    setTimeout(() => {
                      if (!hasDataForYear(selectedYear)) {
                        const availableYears = getAvailableDataYears();
                        let errorMessage = `No emissions data found for ${selectedYear}.`;
                        if (availableYears.length > 0) {
                          errorMessage += ` Available years: ${availableYears.join(', ')}`;
                        } else {
                          errorMessage += ` Please upload data first.`;
                        }
                        setValidationErrors(prev => ({
                          ...prev,
                          noData: errorMessage
                        }));
                      }
                    }, 100); // Small delay to ensure state is updated
                  }
                }}
                className={`form-select ${validationErrors.reportPeriod ? 'error' : ''}`}
              >
                <option value="">Select Period</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              {validationErrors.reportPeriod && (
                <div className="error-message">
                  <FaExclamationTriangle />
                  {validationErrors.reportPeriod}
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Reporting Standard <span className="required">*</span></h3>
            <div className={`radio-group ${validationErrors.reportingStandard ? 'error' : ''}`}>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="standard" 
                  value="CSI Standard"
                  checked={reportingStandard === 'CSI Standard'}
                  onChange={(e) => {
                    setReportingStandard(e.target.value);
                    // Clear validation errors
                    if (validationErrors.reportingStandard) {
                      setValidationErrors(prev => ({ ...prev, reportingStandard: null }));
                    }
                  }}
                />
                <span className="radio-custom"></span>
                CSI Standard
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="standard" 
                  value="GRI Standard"
                  checked={reportingStandard === 'GRI Standard'}
                  onChange={(e) => {
                    setReportingStandard(e.target.value);
                    // Clear validation errors
                    if (validationErrors.reportingStandard) {
                      setValidationErrors(prev => ({ ...prev, reportingStandard: null }));
                    }
                  }}
                  disabled={true}
                />
                <span className="radio-custom"></span>
                GRI Standard (Coming Soon)
              </label>
            </div>
            {validationErrors.reportingStandard && (
              <div className="error-message">
                <FaExclamationTriangle />
                {validationErrors.reportingStandard}
              </div>
            )}
          </div>

          {/* No Data Error Message */}
          {validationErrors.noData && (
            <div className="error-message no-data-error">
                <FaExclamationTriangle />
              {validationErrors.noData}
            </div>
          )}

          {/* Success Message */}
          {lastGenerated && !isGenerating && (
            <div className="success-message">
              <FaCheckCircle />
              Report ready for download!
            </div>
          )}

          <button 
            className={`generate-btn ${isGenerating ? 'loading' : ''} ${lastGenerated ? 'success' : ''}`}
            onClick={generateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="loading-spinner"></div>
                Generating...
              </>
            ) : (
              <>
                <FaFileAlt />
                Generate Report
              </>
            )}
          </button>
        </aside>

        {/* Main Content */}
        <main className="report-main">
          {/* Actions Bar */}
          <div className="actions-bar">
            <button className="action-btn" onClick={downloadPDF}>
              <FaFilePdf />
              Download PDF
            </button>
            <button className="action-btn" onClick={downloadExcel}>
              <FaFileExcel />
              Download Excel
            </button>
            <button className="action-btn" onClick={shareReport}>
              <FaShare />
              Share
            </button>
          </div>

          {/* Report Overview removed as requested */}

          {/* Data Loading State */}
          {dataLoading && (
            <section className="loading-section">
              <div className="loading-spinner"></div>
              <p>Loading emissions data...</p>
          </section>
          )}

          {/* Emissions Summary */}
          {!dataLoading && (emissionsData.scope1.length > 0 || emissionsData.scope2.length > 0 || emissionsData.scope3.length > 0) && (
            <section className="emissions-summary">
              <h2>Emissions Summary</h2>
              <div className="summary-cards">
                {emissionsData.scope1.length > 0 && (
                  <div className="summary-card scope1">
                    <h3>Scope 1 Emissions</h3>
                    <div className="emissions-value">{calculateTotals().scope1.toFixed(2)} tCO₂e</div>
                    <div className="emissions-count">{emissionsData.scope1.length} records</div>
                  </div>
                )}
                {emissionsData.scope2.length > 0 && (
                  <div className="summary-card scope2">
                    <h3>Scope 2 Emissions</h3>
                    <div className="emissions-value">{calculateTotals().scope2.toFixed(2)} tCO₂e</div>
                    <div className="emissions-count">{emissionsData.scope2.length} records</div>
                </div>
                )}
                {emissionsData.scope3.length > 0 && (
                  <div className="summary-card scope3">
                    <h3>Scope 3 Emissions</h3>
                    <div className="emissions-value">{calculateTotals().scope3.toFixed(2)} tCO₂e</div>
                    <div className="emissions-count">{emissionsData.scope3.length} records</div>
                  </div>
                )}
                <div className="summary-card total">
                  <h3>Total Emissions</h3>
                  <div className="emissions-value">{calculateTotals().total.toFixed(2)} tCO₂e</div>
                  <div className="emissions-count">{emissionsData.scope1.length + emissionsData.scope2.length + emissionsData.scope3.length} total records</div>
                </div>
              </div>
            </section>
          )}

                    {/* Emissions Breakdown Chart */}
          {!dataLoading && (emissionsData.scope1.length > 0 || emissionsData.scope2.length > 0 || emissionsData.scope3.length > 0) && (
            <section className="chart-section">
              <h2>Emissions Breakdown by Scope</h2>
              <div id="emissions-breakdown-chart" className="chart-container large">
                <Doughnut data={getEmissionsChartData()} options={doughnutOptions} />
            </div>
            </section>
          )}

          {/* Monthly Trend Chart */}
          {!dataLoading && Object.keys(monthlyEmissions).length > 0 && (
            <section className="chart-section">
              <h2>Monthly Emissions Trend</h2>
              <div id="monthly-trend-chart" className="chart-container large">
                <Line data={getMonthlyTrendData()} options={chartOptions} />
            </div>
          </section>
          )}

          {/* Detailed Usage Data */}
          {!dataLoading && (generateUsageDataSummary().scope1.length > 0 || generateUsageDataSummary().scope2.length > 0 || generateUsageDataSummary().scope3.length > 0) && (
          <section className="detailed-data">
              <h2>Detailed Usage Data</h2>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scope</th>
                      <th>Activity Type</th>
                      <th>Usage Value</th>
                      <th>Unit</th>
                      <th>Transport Mode</th>
                      <th>Emissions (tCO₂e)</th>
                  </tr>
                </thead>
                <tbody>
                    {generateUsageDataSummary().scope1.map((item, index) => (
                      <tr key={`scope1-${index}`} className="scope1-row">
                        <td className="scope-cell scope1-bg">Scope 1</td>
                        <td>{item.type}</td>
                        <td>{item.value.toFixed(2)}</td>
                        <td>{item.unit}</td>
                        <td>{item.fuelType || '-'}</td>
                        <td className="emissions-cell">{item.emissions.toFixed(2)}</td>
                  </tr>
                    ))}
                    {generateUsageDataSummary().scope2.map((item, index) => (
                      <tr key={`scope2-${index}`} className="scope2-row">
                        <td className="scope-cell scope2-bg">Scope 2</td>
                        <td>{item.type}</td>
                        <td>{item.value.toFixed(2)}</td>
                        <td>{item.unit}</td>
                        <td>-</td>
                        <td className="emissions-cell">{item.emissions.toFixed(2)}</td>
                  </tr>
                    ))}
                    {generateUsageDataSummary().scope3.map((item, index) => (
                      <tr key={`scope3-${index}`} className="scope3-row">
                        <td className="scope-cell scope3-bg">Scope 3</td>
                        <td>{item.travelType}</td>
                        <td>{item.value.toFixed(2)}</td>
                        <td>{item.unit}</td>
                        <td>{item.mode}</td>
                        <td className="emissions-cell">{item.emissions.toFixed(2)}</td>
                  </tr>
                    ))}
                </tbody>
              </table>
              </div>
            </section>
          )}


        </main>
      </div>

      {/* Footer */}
      <footer className="report-footer">
        <p>© 2025 CarbonLens. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ReportPage;
