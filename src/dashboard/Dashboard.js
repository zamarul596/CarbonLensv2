import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import './Dashboard.css';
import ESGRecommendationSystem from './ESGRecommendationSystem';

const jsPDF = require('jspdf').default;
require('jspdf-autotable');
const XLSX = require('xlsx');

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Chart colors
const chartColors = {
  scope1: '#0066FF',
  scope2: '#34C759',
  scope3: '#FFB800'
};

// Default data structure
const defaultMonthData = {
  scope1: [0],
  scope2: [0],
  scope3: [0]
};

// Helper function to format emissions with appropriate units
const formatEmissionsValue = (value) => {
  const numValue = Number(value) || 0;
  
  // Since emissions are now stored in tCO2e, we need to adjust the logic
  if (numValue >= 1) {
    return `${numValue.toFixed(2)} tCO₂e`;
  } else if (numValue >= 0.001) {
    return `${(numValue * 1000).toFixed(2)} kg CO₂e`;
  } else if (numValue >= 0.000001) {
    return `${(numValue * 1000000).toFixed(2)} g CO₂e`;
  } else {
    return `${(numValue * 1000000000).toFixed(2)} mg CO₂e`;
  }
};

function Dashboard() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedChartYear, setSelectedChartYear] = useState('all');
  const [userData, setUserData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [pieChartData, setPieChartData] = useState(null);
  const [selectedScope, setSelectedScope] = useState('all');
  const [selectedTableMonth, setSelectedTableMonth] = useState('all');
  const [selectedTableYear, setSelectedTableYear] = useState('all');
  
  // Sync chart filters with table filters
  useEffect(() => {
    // Sync month filter (including 'all')
    setSelectedTableMonth(selectedMonth);
    
    // Sync year filter (including 'all')
    setSelectedTableYear(selectedChartYear);
  }, [selectedMonth, selectedChartYear]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [loading, setLoading] = useState(false);
  const [emissionsData, setEmissionsData] = useState({
    scope1: [],
    scope2: [],
    scope3: []
  });
  const [monthlyEmissions, setMonthlyEmissions] = useState({});
  const [departmentData, setDepartmentData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeActionMenu, setActiveActionMenu] = useState(null);



  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User ${user.uid} signed in` : 'User signed out');
      setAuthUser(user);
      setAuthLoading(false);
      
      if (!user) {
        console.log('No authenticated user, redirecting to login');
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeActionMenu !== null && !event.target.closest('.action-menu')) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeActionMenu]);

  // Fetch user data when authentication state changes
  useEffect(() => {
    if (!authUser) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          console.log('User document does not exist');
          // Set default user data if document doesn't exist
          setUserData({
            contactPerson: 'User',
            email: authUser.email || 'user@example.com',
            companyName: 'Your Company',
            companyId: 'COMP001'
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Set default data on error
        setUserData({
          contactPerson: 'User',
          email: 'user@example.com',
          companyName: 'Your Company',
          companyId: 'COMP001'
        });
      }
    };
    fetchUserData();
  }, [authUser]);

  // Fetch emissions data from Firebase
  useEffect(() => {
    if (!authUser || authLoading) {
      setDataLoading(false);
      return;
    }

    const fetchEmissionsData = async () => {

      try {
        setDataLoading(true);
        
        // Get user's company ID
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        let companyId = 'COMP001'; // Default fallback
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          companyId = userData.companyId || 'COMP001';
        }

        // Fetch scope 1,2 data from Firebase
        const scopeDataRef = collection(db, `companies/${companyId}/scope1_2_data`);
        
        // First, let's try without the scope filter to see if there's any data
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
          console.log('Document data:', data);
          console.log('Emissions object:', data.emissions);
          console.log('Utility type:', data.utilityType);
          console.log('Emissions total:', data.emissions?.total);
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
            console.log('Processing utility type:', data.utilityType, 'for month:', monthKey);
            if (data.utilityType === 'fuel') {
              const fuelEmissions = (data.emissions?.total || 0) / 1000; // Convert from kg CO2e to tCO2e
              emissionsByMonth[monthKey].scope1 += Number(fuelEmissions) || 0;
              console.log('Added fuel emissions:', fuelEmissions, 'for month:', monthKey, 'Total scope1 now:', emissionsByMonth[monthKey].scope1);
            } else if (data.utilityType === 'electricity') {
              const electricityEmissions = (data.emissions?.total || 0) / 1000; // Convert from kg CO2e to tCO2e
              emissionsByMonth[monthKey].scope2 += Number(electricityEmissions) || 0;
              console.log('Added electricity emissions:', electricityEmissions, 'for month:', monthKey, 'Total scope2 now:', emissionsByMonth[monthKey].scope2);
            } else {
              console.log('Unknown utility type:', data.utilityType);
            }

            // Store individual records for department breakdown
            if (!emissionsByMonth[monthKey].records) {
              emissionsByMonth[monthKey].records = [];
            }
            emissionsByMonth[monthKey].records.push({
              fileName: data.fileName,
              utilityType: data.utilityType,
              emissions: (Number(data.emissions?.total || 0) / 1000).toFixed(2), // Convert from kg CO2e to tCO2e
              amount: Number(data.amount || 0).toFixed(2),
              usage: Number(data.usage?.value || data.usage || 0).toFixed(2),
              billPeriod: data.billPeriod,
              uploadDate: data.uploadDate,
              status: data.status || 'processed',
              month: data.month || null,
              year: data.year || null
            });
          }
        });

        console.log('Processed emissions by month:', emissionsByMonth);
        console.log('Total scope1 emissions:', Object.values(emissionsByMonth).reduce((sum, month) => sum + month.scope1, 0));
        console.log('Total scope2 emissions:', Object.values(emissionsByMonth).reduce((sum, month) => sum + month.scope2, 0));

        // Fetch scope 3 data using the exact same logic as Scope3Page
        let allRealData = [];
        
        // Get all users under the company
        const usersRef = collection(db, 'companies', companyId, 'users');
        const usersSnapshot = await getDocs(usersRef);
        console.log(`Found ${usersSnapshot.docs.length} users in company ${companyId}`);
        
        // For each user, fetch their data (same as Scope3Page)
        for (const userDoc of usersSnapshot.docs) {
          const employeeUserId = userDoc.id;
          console.log(`Fetching data for employee: ${employeeUserId}`);
          
          // Try different collection names for this employee (same as Scope3Page)
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
              console.log(`Found ${snapshot.docs.length} documents in ${collectionName} for employee ${employeeUserId}`);
              
              if (snapshot.docs.length > 0) {
                const docs = snapshot.docs.map(doc => {
                  const realData = doc.data();
                  console.log(`Real document in ${collectionName} for employee ${employeeUserId}:`, realData);
                  return {
                    id: doc.id,
                    ...realData,
                    type: collectionName.includes('Commuting') ? 'Commuting' : 'Business Travel',
                    collectionName: collectionName,
                    userId: employeeUserId,
                    // Add explicit type based on collection name
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

        // If no data found from employees, try company-level collections (same as Scope3Page)
        if (allRealData.length === 0) {
          console.log('No employee data found, trying company-level collections...');
          
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
              console.log(`Found ${snapshot.docs.length} documents in company-level collection ${collectionName}`);
              
              if (snapshot.docs.length > 0) {
                const docs = snapshot.docs.map(doc => {
                  const realData = doc.data();
                  console.log(`Real document in company-level collection ${collectionName}:`, realData);
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

        console.log('ALL REAL DATA FOUND:', allRealData.length, 'documents');
        console.log('Complete real data:', allRealData);

        // Process the discovered data - use ALL existing data from Firebase (same as Scope3Page)
        let processedData = [];
        
        allRealData.forEach(item => {
          const data = item;
          console.log('Processing real Firebase document:', data);
          
          // If this is business travel with segments, create separate entries for each segment (same as Scope3Page)
          if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
            console.log('Processing business travel with segments:', data.segments.length, 'segments');
            
            data.segments.forEach((segment, segmentIndex) => {
              console.log('Processing segment:', segmentIndex, segment);
              
              processedData.push({
                id: `${item.id}_segment_${segmentIndex}`,
                ...data, // Keep original data
                ...segment, // Add segment data
                type: 'Business Travel',
                collectionName: item.collectionName,
                userId: item.userId,
                isCommuting: false,
                isBusinessTravel: true,
                // Use segment data for display
                emissions: (segment.emissions || 0) / 1000, // Convert from kg CO2e to tCO2e
                distance: segment.distance || 0,
                mode: segment.mode || 'Unknown',
                date: segment.date || data.date || '',
                purpose: segment.purpose || data.purpose || '',
                fromLocation: segment.fromLocation || '',
                toLocation: segment.toLocation || '',
                // Extract employee ID from business travel data
                employeeId: data.employeeId || segment.employeeId || data.userId || 'Unknown',
                // Keep original business travel data
                totalDistance: data.totalDistance || 0,
                totalEmissions: (data.totalEmissions || 0) / 1000, // Convert from kg CO2e to tCO2e
                status: data.status || '',
                submittedAt: data.submittedAt || '',
                // Display mode for business travel
                displayMode: segment.mode || segment.purpose || data.purpose || 'Unknown',
                // Mark as segment
                isSegment: true,
                parentId: item.id,
                segmentIndex: segmentIndex
              });
            });
          } else {
            // Regular commuting data or business travel without segments (same as Scope3Page)
            processedData.push({
              id: item.id,
              ...data, // Keep ALL original data
              type: data.type,
              // Use the actual field names from your Firebase data
              emissions: (data.emissions || data.totalEmissions || 0) / 1000, // Convert from kg CO2e to tCO2e
              distance: data.distance || data.roundTripDistance || data.totalDistance || 0,
              mode: data.transportMethod || data.transportType || data.mode || 'Unknown',
              date: data.date || '',
              employeeId: data.employeeId || data.userId || 'Unknown',
              month: data.month || '',
              year: data.year || '',
              // Keep all other fields from your real data
              purpose: data.purpose || '',
              destination: data.destination || '',
              createdAt: data.createdAt || '',
              // Additional fields from your data
              checkInTime: data.checkInTime || '',
              transportMethod: data.transportMethod || '',
              transportType: data.transportType || '',
              roundTripDistance: data.roundTripDistance || 0,
              totalDistance: data.totalDistance || 0,
              totalEmissions: (data.totalEmissions || 0) / 1000, // Convert from kg CO2e to tCO2e
              segments: data.segments || [],
              status: data.status || '',
              submittedAt: data.submittedAt || '',
              // For business travel, use purpose as mode if no transport method
              displayMode: data.transportMethod || data.transportType || data.mode || data.purpose || 'Unknown',
              isSegment: false
            });
          }
        });

        console.log('PROCESSED DATA:', processedData.length, 'items');
        console.log('Sample processed data:', processedData.slice(0, 3));

        // Group data by month and calculate emissions (same logic as Scope3Page)
        processedData.forEach(item => {
          // Extract month and year from date field (same as Scope3Page)
          let itemMonth = item.month || '';
          let itemYear = item.year || '';
          
          // If no month/year fields, try to extract from date field (same as Scope3Page)
          if (!itemMonth || !itemYear) {
            const dateStr = item.date || '';
            if (dateStr) {
              // Handle different date formats (same as Scope3Page)
              let date;
              if (dateStr.includes('T')) {
                // ISO format
                date = new Date(dateStr);
              } else if (dateStr.includes('-')) {
                // YYYY-MM-DD format
                date = new Date(dateStr);
              } else {
                // Try parsing as timestamp
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
          
          // If still no month/year, try to extract from createdAt timestamp (same as Scope3Page)
          if (!itemMonth || !itemYear) {
            const createdAt = item.createdAt;
            if (createdAt) {
              let date;
              if (createdAt.toDate) {
                // Firestore timestamp
                date = createdAt.toDate();
              } else if (typeof createdAt === 'number') {
                // Unix timestamp
                date = new Date(createdAt);
              } else if (typeof createdAt === 'string') {
                // String timestamp
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
          
          // Create month key for emissionsByMonth
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
            
            // Add scope 3 emissions
            const emissionsToAdd = Number(item.emissions || 0);
            emissionsByMonth[monthKey].scope3 += emissionsToAdd;
            console.log(`Added scope 3 emissions: ${emissionsToAdd} tCO2e to month ${monthKey}, total now: ${emissionsByMonth[monthKey].scope3}`);
          } else {
            console.log('Skipping item due to missing month/year:', item);
          }
        });

        // Convert to arrays for charts
        const sortedMonths = Object.keys(emissionsByMonth).sort();
        const scope1Data = [];
        const scope2Data = [];
        const scope3Data = [];
        const labels = [];

        sortedMonths.forEach(monthKey => {
          const monthData = emissionsByMonth[monthKey];
          scope1Data.push(monthData.scope1);
          scope2Data.push(monthData.scope2);
          scope3Data.push(monthData.scope3);
          labels.push(monthData.monthName);
        });

        console.log('Setting emissions data:', {
          scope1: scope1Data,
          scope2: scope2Data,
          scope3: scope3Data
        });

        setEmissionsData({
          scope1: scope1Data,
          scope2: scope2Data,
          scope3: scope3Data
        });

        setMonthlyEmissions(emissionsByMonth);

        // Create department-like data from actual records
        const departmentRecords = [];
        Object.values(emissionsByMonth).forEach(monthData => {
          if (monthData.records) {
            monthData.records.forEach(record => {
              departmentRecords.push({
                department: record.utilityType === 'fuel' ? 'Fuel Consumption' : 'Electricity Usage',
                mode: record.utilityType === 'fuel' ? 'Vehicle' : 'Building',
                emissions: {
                  scope1: record.utilityType === 'fuel' ? Number(record.emissions) : 0,
                  scope2: record.utilityType === 'electricity' ? Number(record.emissions) : 0,
                  scope3: 0
                },
                status: record.status,
                lastUpdated: record.uploadDate instanceof Timestamp 
                  ? record.uploadDate.toDate().toLocaleDateString()
                  : new Date(record.uploadDate).toLocaleDateString(),
                fileName: record.fileName,
                utilityType: record.utilityType,
                amount: record.amount,
                usage: record.usage,
                month: record.month,
                year: record.year,
                billPeriod: record.billPeriod
              });
            });
          }
          
          // Add scope 3 records if they exist
          if (monthData.scope3 > 0) {
            departmentRecords.push({
              department: 'Scope 3 Emissions',
              mode: 'Commuting & Travel',
              emissions: {
                scope1: 0,
                scope2: 0,
                scope3: monthData.scope3
              },
              status: 'processed',
              lastUpdated: new Date().toLocaleDateString(),
              fileName: 'Scope 3 Data',
              utilityType: 'scope3',
              amount: monthData.scope3.toFixed(2),
              usage: monthData.scope3.toFixed(2),
              month: monthData.month,
              year: monthData.year,
              billPeriod: new Date(monthData.year, monthData.month, 1)
            });
          }
        });

        setDepartmentData(departmentRecords);

      } catch (error) {
        console.error('Error fetching emissions data:', error);
        // Set default data on error
        setEmissionsData({
          scope1: [0],
          scope2: [0],
          scope3: [0]
        });
      } finally {
        setDataLoading(false);
      }
    };

    fetchEmissionsData();
  }, [authUser, authLoading]);

  // Update charts when month changes or when emissions data changes
  useEffect(() => {
    try {
      console.log('Chart update triggered:', {
        dataLoading,
        selectedMonth,
        emissionsData,
        monthlyEmissions: Object.keys(monthlyEmissions)
      });

      if (dataLoading) {
        console.log('Data is still loading, skipping chart update');
        return; // Don't update charts while loading
      }

      let data;
      let labels;

      // Filter data based on selected month and year
      let filteredMonthlyEmissions = { ...monthlyEmissions };
      
      // Filter by year if not 'all'
      if (selectedChartYear !== 'all') {
        filteredMonthlyEmissions = {};
        Object.keys(monthlyEmissions).forEach(monthKey => {
          const monthData = monthlyEmissions[monthKey];
          if (monthData.year && monthData.year.toString() === selectedChartYear) {
            filteredMonthlyEmissions[monthKey] = monthData;
          }
        });
      }
      
      if (selectedMonth === 'all') {
        // Use all available data (filtered by year if selected)
        const sortedMonths = Object.keys(filteredMonthlyEmissions).sort();
        const scope1Data = [];
        const scope2Data = [];
        const scope3Data = [];
        const monthLabels = [];
        
        sortedMonths.forEach(monthKey => {
          const monthData = filteredMonthlyEmissions[monthKey];
          scope1Data.push(monthData.scope1);
          scope2Data.push(monthData.scope2);
          scope3Data.push(monthData.scope3);
          monthLabels.push(monthData.monthName.charAt(0).toUpperCase() + monthData.monthName.slice(1));
        });
        
        data = {
          scope1: scope1Data,
          scope2: scope2Data,
          scope3: scope3Data
        };
        labels = monthLabels;
        console.log('Using filtered data:', { data, labels, selectedChartYear });
      } else {
        // Filter for specific month
        const monthKey = Object.keys(filteredMonthlyEmissions).find(key => {
          const monthData = filteredMonthlyEmissions[key];
          return monthData.monthName === selectedMonth;
        });
        
        if (monthKey) {
          const monthData = filteredMonthlyEmissions[monthKey];
          data = {
            scope1: [monthData.scope1],
            scope2: [monthData.scope2],
            scope3: [monthData.scope3]
          };
          labels = [selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)];
          console.log('Using specific month data:', { data, labels });
        } else {
          data = defaultMonthData;
          labels = [selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)];
          console.log('No data for selected month/year, using default:', { data, labels });
        }
      }

      // Ensure we have data arrays
      const scope1Data = data.scope1.length > 0 ? data.scope1 : [0];
      const scope2Data = data.scope2.length > 0 ? data.scope2 : [0];
      const scope3Data = data.scope3.length > 0 ? data.scope3 : [0];

      console.log('Chart data arrays:', { scope1Data, scope2Data, scope3Data, labels });

      // Bar chart data - filter by selected scope
      const datasets = [];
      
      if (selectedScope === 'all' || selectedScope === 'scope1') {
        datasets.push({
          label: 'Scope 1 Emissions (Fuel)',
          data: scope1Data,
          backgroundColor: chartColors.scope1,
        });
      }
      
      if (selectedScope === 'all' || selectedScope === 'scope2') {
        datasets.push({
          label: 'Scope 2 Emissions (Electricity)',
          data: scope2Data,
            backgroundColor: chartColors.scope2,
        });
      }
      
      if (selectedScope === 'all' || selectedScope === 'scope3') {
        datasets.push({
          label: 'Scope 3 Emissions (Commuting & Travel)',
          data: scope3Data,
          backgroundColor: chartColors.scope3,
        });
      }

      const chartDataObj = {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: datasets
      };

      console.log('Setting chart data:', chartDataObj);
      setChartData(chartDataObj);

      // Pie chart data - show totals for all months or latest for specific month
      let pieScope1, pieScope2, pieScope3;
      
      if (selectedMonth === 'all') {
        // Sum all months for pie chart
        pieScope1 = scope1Data.reduce((sum, val) => sum + (Number(val) || 0), 0);
        pieScope2 = scope2Data.reduce((sum, val) => sum + (Number(val) || 0), 0);
        pieScope3 = scope3Data.reduce((sum, val) => sum + (Number(val) || 0), 0);
      } else {
        // Show latest values for specific month
        pieScope1 = scope1Data[scope1Data.length - 1] || 0;
        pieScope2 = scope2Data[scope2Data.length - 1] || 0;
        pieScope3 = scope3Data[scope3Data.length - 1] || 0;
      }

      // Filter pie chart by selected scope
      const pieLabels = [];
      const pieData = [];
      const pieColors = [];

      if (selectedScope === 'all' || selectedScope === 'scope1') {
        pieLabels.push('Scope 1 (Fuel)');
        pieData.push(pieScope1);
        pieColors.push(chartColors.scope1);
      }
      
      if (selectedScope === 'all' || selectedScope === 'scope2') {
        pieLabels.push('Scope 2 (Electricity)');
        pieData.push(pieScope2);
        pieColors.push(chartColors.scope2);
      }
      
      if (selectedScope === 'all' || selectedScope === 'scope3') {
        pieLabels.push('Scope 3 (Commuting & Travel)');
        pieData.push(pieScope3);
        pieColors.push(chartColors.scope3);
      }

      const pieChartDataObj = {
        labels: pieLabels,
        datasets: [{
          data: pieData,
          backgroundColor: pieColors,
          borderWidth: 0
        }]
      };

      console.log('Setting pie chart data:', pieChartDataObj);
      setPieChartData(pieChartDataObj);
    } catch (error) {
      console.error('Error updating chart data:', error);
      // Set default data if there's an error
      setChartData({
        labels: ['No Data'],
        datasets: [
          {
            label: 'Scope 1 Emissions',
            data: [0],
            backgroundColor: chartColors.scope1,
          },
          {
            label: 'Scope 2 Emissions',
            data: [0],
            backgroundColor: chartColors.scope2,
          },
          {
            label: 'Scope 3 Emissions',
            data: [0],
            backgroundColor: chartColors.scope3,
          }
        ]
      });
      setPieChartData({
        labels: ['Scope 1', 'Scope 2', 'Scope 3'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [chartColors.scope1, chartColors.scope2, chartColors.scope3],
          borderWidth: 0
        }]
      });
    }
  }, [selectedMonth, selectedChartYear, emissionsData, monthlyEmissions, dataLoading]);

  // Get emission value based on selected scope
  const getEmissionValue = (emissions) => {
    if (!emissions) return 0;
    
    // Ensure all values are numbers
    const scope1 = Number(emissions.scope1) || 0;
    const scope2 = Number(emissions.scope2) || 0;
    const scope3 = Number(emissions.scope3) || 0;
    
    let result;
    switch (selectedScope) {
      case 'scope1':
        result = scope1;
        break;
      case 'scope2':
        result = scope2;
        break;
      case 'scope3':
        result = scope3;
        break;
      case 'all':
      default:
        result = scope1 + scope2 + scope3;
        break;
    }
    
    // Ensure we return a number
    return typeof result === 'number' ? result : 0;
  };

  // Filter departments based on search, month and scope
  const filteredDepartments = React.useMemo(() => {
    // Use real department data instead of hardcoded data
    let filteredData = departmentData;
    
    // Filter by search term
    if (searchTerm) {
      filteredData = filteredData.filter(dept => 
        dept.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.utilityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by month if not 'all'
    if (selectedTableMonth !== 'all') {
      filteredData = filteredData.filter(dept => {
        // Check if the record has month/year data
        if (dept.month !== null && dept.year !== null) {
          const monthNames = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
          ];
          const recordMonth = monthNames[dept.month];
          return recordMonth === selectedTableMonth;
        } else if (dept.billPeriod) {
          // Fallback to billPeriod if month/year not available
          const billDate = dept.billPeriod instanceof Timestamp ? 
            dept.billPeriod.toDate() : new Date(dept.billPeriod);
          const monthName = billDate.toLocaleString('default', { month: 'short' }).toLowerCase();
          return monthName === selectedTableMonth;
        }
        return false;
      });
    }

    // Filter by year if not 'all'
    if (selectedTableYear !== 'all') {
      filteredData = filteredData.filter(dept => {
        // Check if the record has year data
        if (dept.year !== null && dept.year !== undefined) {
          return dept.year.toString() === selectedTableYear;
        } else if (dept.billPeriod) {
          // Fallback to billPeriod if year not available
          const billDate = dept.billPeriod instanceof Timestamp ? 
            dept.billPeriod.toDate() : new Date(dept.billPeriod);
          return billDate.getFullYear().toString() === selectedTableYear;
        }
        return false;
      });
    }

    // Filter by scope
    if (selectedScope !== 'all') {
      filteredData = filteredData.filter(dept => {
        switch (selectedScope) {
          case 'scope1':
            return dept.utilityType === 'fuel';
          case 'scope2':
            return dept.utilityType === 'electricity';
          case 'scope3':
            return dept.utilityType === 'scope3';
          default:
            return true;
        }
      });
    }

    return filteredData.map(dept => {
      const emissionValue = getEmissionValue(dept.emissions);
      const numericValue = typeof emissionValue === 'number' ? emissionValue : 0;
      return {
        ...dept,
        displayEmissions: numericValue.toFixed(2)
      };
    });
  }, [departmentData, selectedTableMonth, selectedTableYear, searchTerm, selectedScope]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const paginatedDepartments = filteredDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Action menu functions
  const handleActionMenuClick = (index) => {
    setActiveActionMenu(activeActionMenu === index ? null : index);
  };

  const handleViewDetails = (row) => {
    console.log('View details for:', row);
    alert(`Viewing details for ${row.fileName || 'entry'}`);
    setActiveActionMenu(null);
  };

  const handleEditEntry = (row) => {
    console.log('Edit entry:', row);
    alert(`Editing entry: ${row.fileName || 'entry'}`);
    setActiveActionMenu(null);
  };

  const handleDownloadFile = (row) => {
    console.log('Download file:', row);
    alert(`Downloading file: ${row.fileName || 'entry'}`);
    setActiveActionMenu(null);
  };

  const handleShareData = (row) => {
    console.log('Share data:', row);
    alert(`Sharing data for: ${row.fileName || 'entry'}`);
    setActiveActionMenu(null);
  };

  // Generate and download PDF
    const downloadPDF = () => {
    try {
      setLoading(true);

      // Create new document
      const doc = new jsPDF();

      // Add title (centered)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      const title = "Emissions Report";
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 20);

      // Add metadata (centered with proper spacing)
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const metadata = [
        `Period: ${selectedTableMonth === 'all' ? 'All Months' : selectedTableMonth.toUpperCase()}`,
        `Generated: ${new Date().toLocaleDateString()}`
      ];
      
      if (userData) {
        metadata.push(`Company: ${userData.companyName}`, `Company ID: ${userData.companyId}`);
      }

      metadata.forEach((text, index) => {
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (doc.internal.pageSize.width - textWidth) / 2, 30 + (index * 6));
      });

      // Sort data by scope (1, 2, 3)
      const sortedData = [...filteredDepartments].sort((a, b) => {
        const scopeOrder = { 'fuel': 1, 'electricity': 2, 'scope3': 3 };
        const scopeA = scopeOrder[a.utilityType] || 4;
        const scopeB = scopeOrder[b.utilityType] || 4;
        return scopeA - scopeB;
      });

      // Group data by scope and month (like Excel structure)
      const scopeGroups = {
        scope1: { name: 'Scope 1 - Fuel Consumption', data: [] },
        scope2: { name: 'Scope 2 - Electricity Usage', data: [] },
        scope3: { name: 'Scope 3 - Commuting & Travel', data: [] }
      };

      // Categorize data by scope
      sortedData.forEach(item => {
        if (item.utilityType === 'fuel') {
          scopeGroups.scope1.data.push(item);
        } else if (item.utilityType === 'electricity') {
          scopeGroups.scope2.data.push(item);
        } else if (item.utilityType === 'scope3') {
          scopeGroups.scope3.data.push(item);
        }
      });

      // Function to format data for table
      const formatTableData = (item) => {
        // Determine scope
        let scope = 'N/A';
        if (item.utilityType === 'fuel') scope = 'Scope 1';
        else if (item.utilityType === 'electricity') scope = 'Scope 2';
        else if (item.utilityType === 'scope3') scope = 'Scope 3';
        else scope = 'N/A';

        // Format period display
        let periodDisplay = 'N/A';
        if (item.month !== null && item.year !== null) {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          periodDisplay = `${monthNames[item.month]} ${item.year}`;
        } else if (item.billPeriod) {
          const billDate = item.billPeriod instanceof Timestamp ? 
            item.billPeriod.toDate() : new Date(item.billPeriod);
          periodDisplay = billDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
        }

        return [
          scope,
          item.fileName || 'N/A',
          item.utilityType || 'N/A',
          Number(item.displayEmissions).toFixed(2),
          item.usage ? `${Number(item.usage).toFixed(2)} ${item.utilityType === 'electricity' ? 'kWh' : 'L'}` : 'N/A',
          periodDisplay,
          item.lastUpdated || 'N/A'
        ];
      };

      // Function to group data by month with proper date extraction
      const groupByMonth = (data) => {
        const monthGroups = {};
        
        data.forEach(item => {
          let monthKey = null;
          let monthName = null;
          
          // Extract date from Period field first (most reliable)
          if (item.period && item.period !== 'N/A') {
            try {
              // Try to parse period like "March 2025"
              const periodMatch = item.period.match(/(\w+)\s+(\d{4})/);
              if (periodMatch) {
                const monthStr = periodMatch[1];
                const year = periodMatch[2];
                const monthNames = [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ];
                const monthIndex = monthNames.findIndex(name => 
                  name.toLowerCase() === monthStr.toLowerCase()
                );
                if (monthIndex !== -1) {
                  monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                  monthName = `${monthStr} ${year}`;
                }
              }
            } catch (error) {
              console.error('Error parsing period:', error);
            }
          }
          
          // Fallback to month/year fields
          if (!monthKey && item.month !== null && item.year !== null) {
            monthKey = `${item.year}-${String(item.month + 1).padStart(2, '0')}`;
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            monthName = `${monthNames[item.month]} ${item.year}`;
          }
          
          // Fallback to billPeriod
          if (!monthKey && item.billPeriod) {
            try {
              const billDate = item.billPeriod instanceof Timestamp ? 
                item.billPeriod.toDate() : new Date(item.billPeriod);
              if (!isNaN(billDate.getTime())) {
                monthKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
                monthName = billDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              }
            } catch (error) {
              console.error('Error parsing billPeriod:', error);
            }
          }
          
          // Only add to groups if we have a valid month key
          if (monthKey && monthName) {
            if (!monthGroups[monthKey]) {
              monthGroups[monthKey] = {
                name: monthName,
                data: []
              };
            }
            monthGroups[monthKey].data.push(item);
          }
        });
        
        return monthGroups;
      };

      let currentY = 50; // Start with proper margin from top
      const tableColumn = ["Scope", "File Name", "Utility Type", "Emissions (tCO2e)", "Usage", "Period", "Upload Date"];
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Process each scope
      Object.values(scopeGroups).forEach(scopeGroup => {
        if (scopeGroup.data.length > 0) {
          // Check if we need a new page
          if (currentY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            currentY = 30; // Proper margin for new page
          }

          // Add scope header (centered with proper margins)
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.setFillColor(52, 199, 89);
          doc.rect(margin, currentY - 5, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          
          const scopeText = scopeGroup.name;
          const scopeTextWidth = doc.getTextWidth(scopeText);
          doc.text(scopeText, margin + (contentWidth - scopeTextWidth) / 2, currentY);
          currentY += 15;

          // Group by month
          const monthGroups = groupByMonth(scopeGroup.data);
          const sortedMonths = Object.keys(monthGroups).sort();

          sortedMonths.forEach(monthKey => {
            const monthGroup = monthGroups[monthKey];
            if (monthGroup && monthGroup.data.length > 0) {
              // Check if we need a new page before adding month header
              if (currentY > doc.internal.pageSize.height - 100) {
                doc.addPage();
                currentY = 30;
              }

              // Add month header (centered with proper margins)
              doc.setFontSize(10);
              doc.setFont(undefined, 'bold');
              doc.setFillColor(74, 144, 226);
              doc.rect(margin, currentY - 5, contentWidth, 6, 'F');
              doc.setTextColor(255, 255, 255);
              
              const monthText = monthGroup.name;
              const monthTextWidth = doc.getTextWidth(monthText);
              doc.text(monthText, margin + (contentWidth - monthTextWidth) / 2, currentY);
              currentY += 10;

              // Add table for this month
              const tableRows = monthGroup.data.map(formatTableData);
              
              doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: currentY,
                theme: 'grid',
                styles: {
                  fontSize: 7,
                  cellPadding: 3,
                  lineWidth: 0.1,
                  lineColor: [0, 0, 0]
                },
                headStyles: {
                  fillColor: [74, 144, 226],
                  textColor: [255, 255, 255],
                  fontSize: 8,
                  fontStyle: 'bold',
                  halign: 'center',
                  lineWidth: 0.1,
                  lineColor: [0, 0, 0]
                },
                bodyStyles: {
                  lineWidth: 0.1,
                  lineColor: [0, 0, 0]
                },
                columnStyles: {
                  0: { cellWidth: 22 }, // Scope
                  1: { cellWidth: 32 }, // File Name
                  2: { cellWidth: 22 }, // Utility Type
                  3: { cellWidth: 28, halign: 'right' }, // Emissions
                  4: { cellWidth: 28, halign: 'right' }, // Usage
                  5: { cellWidth: 28 }, // Period
                  6: { cellWidth: 28 } // Upload Date
                },
                didDrawPage: function (data) {
                  // Update currentY after table is drawn
                  currentY = data.cursor.y + 15; // More space after table
                },
                margin: { top: 5, right: margin, bottom: 5, left: margin }
              });

              // Add space after table
              currentY += 10;
            }
          });

          // Add space between scopes
          currentY += 15;
        }
      });

      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `emissions-report-${selectedTableMonth}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate and download Excel
  const downloadExcel = () => {
    try {
      setLoading(true);

      // Separate data by scope
      const scope1Data = filteredDepartments.filter(item => item.utilityType === 'fuel');
      const scope2Data = filteredDepartments.filter(item => item.utilityType === 'electricity');
      const scope3Data = filteredDepartments.filter(item => item.utilityType === 'scope3');

      // Function to format and sort data for each scope
      const formatScopeData = (data, scopeName) => {
        return data.map(item => {
          // Extract month and year for sorting
          let month = null;
          let year = null;
          let periodDisplay = 'N/A';

          if (item.month !== null && item.year !== null) {
            month = item.month;
            year = item.year;
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            periodDisplay = `${monthNames[item.month]} ${item.year}`;
          } else if (item.billPeriod) {
            const billDate = item.billPeriod instanceof Timestamp ? 
              item.billPeriod.toDate() : new Date(item.billPeriod);
            month = billDate.getMonth();
            year = billDate.getFullYear();
            periodDisplay = billDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            });
          }

          return {
            'File Name': item.fileName || 'N/A',
            'Utility Type': item.utilityType || 'N/A',
            'Emissions (tCO2e)': Number(item.displayEmissions).toFixed(2),
            'Usage': item.usage ? `${Number(item.usage).toFixed(2)} ${item.utilityType === 'electricity' ? 'kWh' : 'L'}` : 'N/A',
            'Period': periodDisplay,
            'Status': item.status || 'N/A',
            'Upload Date': item.lastUpdated || 'N/A',
            // Hidden fields for sorting
            _month: month,
            _year: year,
            _sortKey: month !== null && year !== null ? `${year}-${String(month + 1).padStart(2, '0')}` : '9999-99'
          };
        }).sort((a, b) => {
          // Sort by year first, then by month
          if (a._year !== b._year) {
            return a._year - b._year;
          }
          return a._month - b._month;
        });
      };

      // Format data for each scope
      const scope1Formatted = formatScopeData(scope1Data, 'Scope 1');
      const scope2Formatted = formatScopeData(scope2Data, 'Scope 2');
      const scope3Formatted = formatScopeData(scope3Data, 'Scope 3');

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Function to create worksheet with color coding and tables
      const createWorksheet = (data, sheetName) => {
        if (data.length === 0) return null;

        // Remove hidden fields for display
        const displayData = data.map(item => {
          const { _month, _year, _sortKey, ...displayItem } = item;
          return displayItem;
        });

        // Group data by month
        const monthGroups = {};
        data.forEach((item, index) => {
          if (item._month !== null && item._year !== null) {
            const monthKey = `${item._year}-${String(item._month + 1).padStart(2, '0')}`;
            if (!monthGroups[monthKey]) {
              monthGroups[monthKey] = {
                month: item._month,
                year: item._year,
                monthName: new Date(item._year, item._month, 1).toLocaleString('default', { month: 'long' }),
                data: []
              };
            }
            monthGroups[monthKey].data.push(displayData[index]);
          }
        });

        // Create worksheet with table structure
        const worksheet = {};
        let currentRow = 0;

        // Month colors
        const monthColors = [
          { fill: { fgColor: { rgb: "E8F4FD" } } }, // Light blue
          { fill: { fgColor: { rgb: "F0F8FF" } } }, // Alice blue
          { fill: { fgColor: { rgb: "F5F5F5" } } }, // Light gray
          { fill: { fgColor: { rgb: "FFF8DC" } } }, // Cornsilk
          { fill: { fgColor: { rgb: "F0FFF0" } } }, // Honeydew
          { fill: { fgColor: { rgb: "FFF0F5" } } }, // Lavender blush
          { fill: { fgColor: { rgb: "FDF5E6" } } }, // Old lace
          { fill: { fgColor: { rgb: "F8F8FF" } } }, // Ghost white
          { fill: { fgColor: { rgb: "F5F5DC" } } }, // Beige
          { fill: { fgColor: { rgb: "F0F8FF" } } }, // Alice blue
          { fill: { fgColor: { rgb: "FFFACD" } } }, // Lemon chiffon
          { fill: { fgColor: { rgb: "F0FFFF" } } }  // Azure
        ];

        // Sort months chronologically
        const sortedMonths = Object.keys(monthGroups).sort();
        let colorIndex = 0;

        sortedMonths.forEach(monthKey => {
          const monthGroup = monthGroups[monthKey];
          const monthData = monthGroup.data;
          
          if (monthData.length > 0) {
            // Add month header
            const monthHeaderCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
            worksheet[monthHeaderCell] = {
              v: `${monthGroup.monthName} ${monthGroup.year}`,
              s: {
                fill: { fgColor: { rgb: "34C759" } },
                font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
                alignment: { horizontal: "center" }
              }
            };

            // Merge cells for month header (span all columns)
            if (!worksheet['!merges']) worksheet['!merges'] = [];
            worksheet['!merges'].push({
              s: { r: currentRow, c: 0 },
              e: { r: currentRow, c: 6 } // 7 columns total
            });

            currentRow++;

            // Add table headers
            const headers = ['File Name', 'Utility Type', 'Emissions (tCO2e)', 'Usage', 'Period', 'Status', 'Upload Date'];
            headers.forEach((header, colIndex) => {
              const headerCell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
              worksheet[headerCell] = {
                v: header,
                s: {
                  fill: { fgColor: { rgb: "4A90E2" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true },
                  alignment: { horizontal: "center" },
                  border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                  }
                }
              };
            });

            currentRow++;

            // Add data rows with borders and colors
            monthData.forEach((rowData, rowIndex) => {
              const values = [
                rowData['File Name'],
                rowData['Utility Type'],
                rowData['Emissions (tCO2e)'],
                rowData['Usage'],
                rowData['Period'],
                rowData['Status'],
                rowData['Upload Date']
              ];

              values.forEach((value, colIndex) => {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
                worksheet[cellAddress] = {
                  v: value,
                  s: {
                    fill: monthColors[colorIndex],
                    border: {
                      top: { style: "thin", color: { rgb: "000000" } },
                      bottom: { style: "thin", color: { rgb: "000000" } },
                      left: { style: "thin", color: { rgb: "000000" } },
                      right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { horizontal: colIndex === 2 || colIndex === 3 ? "right" : "left" }
                  }
                };
              });

              currentRow++;
            });

            // Add empty row after each month table
            currentRow++;
            colorIndex = (colorIndex + 1) % monthColors.length;
          }
        });

        // Set worksheet range
        worksheet['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(currentRow - 1, 0), c: 6 }
        });

        return worksheet;
      };

      // Create summary worksheet
      const createSummaryWorksheet = () => {
        const worksheet = {};
        let currentRow = 0;

        // Calculate totals for each scope
        const scope1Total = scope1Formatted.reduce((sum, item) => sum + Number(item['Emissions (tCO2e)'] || 0), 0);
        const scope2Total = scope2Formatted.reduce((sum, item) => sum + Number(item['Emissions (tCO2e)'] || 0), 0);
        const scope3Total = scope3Formatted.reduce((sum, item) => sum + Number(item['Emissions (tCO2e)'] || 0), 0);
        const grandTotal = scope1Total + scope2Total + scope3Total;

        // Calculate monthly totals
        const monthlyTotals = {};
        [...scope1Formatted, ...scope2Formatted, ...scope3Formatted].forEach(item => {
          const period = item['Period'];
          if (period && period !== 'N/A') {
            if (!monthlyTotals[period]) {
              monthlyTotals[period] = {
                scope1: 0,
                scope2: 0,
                scope3: 0,
                total: 0
              };
            }
            const emissions = Number(item['Emissions (tCO2e)'] || 0);
            if (item['Utility Type'] === 'fuel') {
              monthlyTotals[period].scope1 += emissions;
            } else if (item['Utility Type'] === 'electricity') {
              monthlyTotals[period].scope2 += emissions;
            } else if (item['Utility Type'] === 'scope3') {
              monthlyTotals[period].scope3 += emissions;
            }
            monthlyTotals[period].total += emissions;
          }
        });

        // Title
        const titleCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        worksheet[titleCell] = {
          v: 'Emissions Report Summary',
          s: {
            font: { bold: true, sz: 16 },
            alignment: { horizontal: "center" }
          }
        };
        if (!worksheet['!merges']) worksheet['!merges'] = [];
        worksheet['!merges'].push({
          s: { r: currentRow, c: 0 },
          e: { r: currentRow, c: 6 }
        });
        currentRow += 2;

        // Company info
        if (userData) {
          const companyCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
          worksheet[companyCell] = {
            v: `Company: ${userData.companyName}`,
            s: { font: { bold: true } }
          };
          currentRow++;
          const companyIdCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
          worksheet[companyIdCell] = {
            v: `Company ID: ${userData.companyId}`,
            s: { font: { bold: true } }
          };
          currentRow += 2;
        }

        // Report period
        const periodCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        worksheet[periodCell] = {
          v: `Report Period: ${selectedTableMonth === 'all' ? 'All Months' : selectedTableMonth.toUpperCase()}`,
          s: { font: { bold: true } }
        };
        currentRow++;
        const generatedCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        worksheet[generatedCell] = {
          v: `Generated: ${new Date().toLocaleDateString()}`,
          s: { font: { bold: true } }
        };
        currentRow += 2;

        // Scope totals table
        const scopeHeaders = ['Scope', 'Description', 'Total Emissions (tCO2e)', 'Percentage'];
        scopeHeaders.forEach((header, colIndex) => {
          const headerCell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          worksheet[headerCell] = {
            v: header,
            s: {
              fill: { fgColor: { rgb: "4A90E2" } },
              font: { color: { rgb: "FFFFFF" }, bold: true },
              alignment: { horizontal: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            }
          };
        });
        currentRow++;

        // Scope data rows
        const scopeData = [
          { scope: 'Scope 1', description: 'Fuel Consumption', total: scope1Total, percentage: grandTotal > 0 ? (scope1Total / grandTotal * 100) : 0 },
          { scope: 'Scope 2', description: 'Electricity Usage', total: scope2Total, percentage: grandTotal > 0 ? (scope2Total / grandTotal * 100) : 0 },
          { scope: 'Scope 3', description: 'Commuting & Travel', total: scope3Total, percentage: grandTotal > 0 ? (scope3Total / grandTotal * 100) : 0 }
        ];

        scopeData.forEach((rowData, rowIndex) => {
          const values = [
            rowData.scope,
            rowData.description,
            rowData.total.toFixed(2),
            `${rowData.percentage.toFixed(1)}%`
          ];

          values.forEach((value, colIndex) => {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            worksheet[cellAddress] = {
              v: value,
              s: {
                border: {
                  top: { style: "thin", color: { rgb: "000000" } },
                  bottom: { style: "thin", color: { rgb: "000000" } },
                  left: { style: "thin", color: { rgb: "000000" } },
                  right: { style: "thin", color: { rgb: "000000" } }
                },
                alignment: { horizontal: colIndex >= 2 ? "right" : "left" }
              }
            };
          });
          currentRow++;
        });

        // Grand total row
        const grandTotalValues = ['TOTAL', 'All Scopes', grandTotal.toFixed(2), '100.0%'];
        grandTotalValues.forEach((value, colIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          worksheet[cellAddress] = {
            v: value,
            s: {
              fill: { fgColor: { rgb: "34C759" } },
              font: { color: { rgb: "FFFFFF" }, bold: true },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              },
              alignment: { horizontal: colIndex >= 2 ? "right" : "left" }
            }
          };
        });
        currentRow += 2;

        // Monthly breakdown table
        const monthlyHeaders = ['Period', 'Scope 1 (tCO2e)', 'Scope 2 (tCO2e)', 'Scope 3 (tCO2e)', 'Total (tCO2e)'];
        monthlyHeaders.forEach((header, colIndex) => {
          const headerCell = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          worksheet[headerCell] = {
            v: header,
            s: {
              fill: { fgColor: { rgb: "FF6B35" } },
              font: { color: { rgb: "FFFFFF" }, bold: true },
              alignment: { horizontal: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            }
          };
        });
        currentRow++;

        // Monthly data rows
        const sortedMonths = Object.keys(monthlyTotals).sort();
        sortedMonths.forEach(month => {
          const monthData = monthlyTotals[month];
          const values = [
            month,
            monthData.scope1.toFixed(2),
            monthData.scope2.toFixed(2),
            monthData.scope3.toFixed(2),
            monthData.total.toFixed(2)
          ];

          values.forEach((value, colIndex) => {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            worksheet[cellAddress] = {
              v: value,
              s: {
                border: {
                  top: { style: "thin", color: { rgb: "000000" } },
                  bottom: { style: "thin", color: { rgb: "000000" } },
                  left: { style: "thin", color: { rgb: "000000" } },
                  right: { style: "thin", color: { rgb: "000000" } }
                },
                alignment: { horizontal: colIndex === 0 ? "left" : "right" }
              }
            };
          });
          currentRow++;
        });

        // Set worksheet range
        worksheet['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(currentRow - 1, 0), c: 4 }
        });

        return worksheet;
      };

      // Create worksheets for each scope
      const scope1Worksheet = createWorksheet(scope1Formatted, 'Scope 1 - Fuel Consumption');
      const scope2Worksheet = createWorksheet(scope2Formatted, 'Scope 2 - Electricity Usage');
      const scope3Worksheet = createWorksheet(scope3Formatted, 'Scope 3 - Commuting & Travel');
      const summaryWorksheet = createSummaryWorksheet();

      // Add worksheets to workbook (Summary first)
      if (summaryWorksheet) {
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      }
      if (scope1Worksheet) {
        XLSX.utils.book_append_sheet(workbook, scope1Worksheet, 'Scope 1 - Fuel');
      }
      if (scope2Worksheet) {
        XLSX.utils.book_append_sheet(workbook, scope2Worksheet, 'Scope 2 - Electricity');
      }
      if (scope3Worksheet) {
        XLSX.utils.book_append_sheet(workbook, scope3Worksheet, 'Scope 3 - Commuting');
      }

      // Generate and download file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `emissions-report-scopes-${selectedTableMonth}-${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Monthly Scope 1, 2, and 3 Emissions (tCO2e)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        enabled: true
      },
      datalabels: {
        display: false
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right'
      },
      tooltip: {
        enabled: true
      },
      datalabels: {
        display: false
      }
    }
  };

  // Format month name for display
  const formatMonthName = (month) => {
    if (month === 'all') return 'All Months';
    return month.charAt(0).toUpperCase() + month.slice(1);
  };

  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect if no authenticated user
  if (!authUser) {
    return null; // Will redirect to login via useEffect
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="menu-item active">
          <i className="icon dashboard-icon"></i>
          Dashboard
        </div>
        <div className="menu-item" onClick={() => navigate('/upload-data')}>
          <i className="icon upload-icon"></i>
          Upload Data
        </div>
        <div className="menu-item" onClick={() => navigate('/scope3')}>
          <i className="icon scope3-icon"></i>
          Scope 3
        </div>
        <div className="menu-item" onClick={() => navigate('/reports')}>
          <i className="icon reports-icon"></i>
          Reports
        </div>
        <div className="menu-item" onClick={() => navigate('/settings')}>
          <i className="icon settings-icon"></i>
          Settings
          </div>
        <div className="menu-item">
          <i className="icon help-icon"></i>
          Help
        </div>
        
        {/* User Info */}
        {userData && (
          <div className="user-info">
            <div className="user-avatar">
              {userData.contactPerson ? userData.contactPerson[0].toUpperCase() : 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{userData.contactPerson || 'User'}</div>
              <div className="user-email">{userData.email}</div>
              <div className="company-info">
                <span className="company-name">{userData.companyName}</span>
                <span className="company-id">ID: {userData.companyId}</span>
              </div>
            </div>
          </div>
        )}
        </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <h2>Welcome back, {userData?.contactPerson || 'User'}!</h2>
          <p>Dive into your ESG dashboard to monitor and manage your environmental impact. Review recent trends and identify areas for improvement.</p>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <i className="icon scope1-icon"></i>
              <span>Scope 1 Emissions</span>
            </div>
            <div className="metric-value">
              {dataLoading ? 'Loading...' : 
                formatEmissionsValue(Array.isArray(emissionsData.scope1) ? emissionsData.scope1.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0)
              }
            </div>
            <div className="metric-change increase">
              {dataLoading ? 'Calculating...' : '↑ From uploaded fuel data'}
            </div>
          </div>
          <div className="metric-card">
              <div className="metric-header">
              <i className="icon scope2-icon"></i>
              <span>Scope 2 Emissions</span>
            </div>
            <div className="metric-value">
              {dataLoading ? 'Loading...' : 
                formatEmissionsValue(Array.isArray(emissionsData.scope2) ? emissionsData.scope2.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0)
              }
            </div>
            <div className="metric-change decrease">
              {dataLoading ? 'Calculating...' : '↓ From uploaded electricity data'}
            </div>
              </div>
          <div className="metric-card">
            <div className="metric-header">
              <i className="icon scope3-icon"></i>
              <span>Scope 3 Emissions</span>
              </div>
            <div className="metric-value">
              {dataLoading ? 'Loading...' : 
                formatEmissionsValue(Array.isArray(emissionsData.scope3) ? emissionsData.scope3.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0)
              }
            </div>
            <div className="metric-change increase">
              {dataLoading ? 'Calculating...' : '↑ Not implemented yet'}
            </div>
              </div>
          <div className="metric-card">
            <div className="metric-header">
              <i className="icon total-score-icon"></i>
              <span>Total Emissions</span>
            </div>
            <div className="metric-value">
              {dataLoading ? 'Loading...' : 
                formatEmissionsValue(
                  (Array.isArray(emissionsData.scope1) ? emissionsData.scope1.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0) +
                  (Array.isArray(emissionsData.scope2) ? emissionsData.scope2.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0) +
                  (Array.isArray(emissionsData.scope3) ? emissionsData.scope3.reduce((sum, val) => sum + (Number(val) || 0), 0) : 0)
                )
              }
            </div>
            <div className="metric-change increase">
              {dataLoading ? 'Calculating...' : '↑ Combined scope 1,2 & 3'}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-container">
          <div className="emissions-chart">
            <div className="chart-header">
              <h3>Emissions Trends Over Time</h3>
              <div className="chart-filters">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="month-select"
                  disabled={dataLoading}
                >
                  <option value="all">All Months</option>
                  <option value="jan">January</option>
                  <option value="feb">February</option>
                  <option value="mar">March</option>
                  <option value="apr">April</option>
                  <option value="may">May</option>
                  <option value="jun">June</option>
                  <option value="jul">July</option>
                  <option value="aug">August</option>
                  <option value="sep">September</option>
                  <option value="oct">October</option>
                  <option value="nov">November</option>
                  <option value="dec">December</option>
                </select>
                <select 
                  value={selectedChartYear}
                  onChange={(e) => setSelectedChartYear(e.target.value)}
                  className="year-select"
                  disabled={dataLoading}
                >
            
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                  <option value="2020">2020</option>
                </select>
              </div>
            </div>
            <div className="chart-wrapper">
              {dataLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading emissions data...</p>
                </div>
              ) : (
                chartData && <Bar data={chartData} options={barOptions} />
              )}
            </div>
          </div>
          <div className="pie-chart">
            <h3>Emissions Breakdown by Scope</h3>
            <div className="chart-wrapper">
              {dataLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading emissions data...</p>
                </div>
              ) : (
                pieChartData && <Pie data={pieChartData} options={pieOptions} />
              )}
            </div>
          </div>
        </div>

        {/* Department Section */}
        <div className="department-section">
          <div className="section-header">
            <div className="header-content">
              <h3>Emissions Breakdown by Uploaded Bills</h3>
              <p>
                Detailed view of carbon emissions from uploaded utility bills and scope 3 data 
                (Scope 1: Fuel, Scope 2: Electricity, Scope 3: Commuting & Travel)
                <span className="filter-indicator">
                  {' '}• Showing {selectedTableMonth !== 'all' ? selectedTableMonth.charAt(0).toUpperCase() + selectedTableMonth.slice(1) : 'All Months'} {selectedTableYear !== 'all' ? selectedTableYear : 'All Years'} data
                </span>
              </p>
            </div>
          </div>
          
          <div className="table-controls">
            <div className="control-group">
              <input
                type="text"
                placeholder="Search by file name or utility type..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select 
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="scope-select"
              >
                <option value="all">All Scopes</option>
                <option value="scope1">Scope 1</option>
                <option value="scope2">Scope 2</option>
                <option value="scope3">Scope 3</option>
              </select>
              <select 
                value={selectedTableMonth}
                onChange={(e) => {
                  setSelectedTableMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="month-select"
              >
                <option value="all">All Months</option>
                <option value="jan">January</option>
                <option value="feb">February</option>
                <option value="mar">March</option>
                <option value="apr">April</option>
                <option value="may">May</option>
                <option value="jun">June</option>
                <option value="jul">July</option>
                <option value="aug">August</option>
                <option value="sep">September</option>
                <option value="oct">October</option>
                <option value="nov">November</option>
                <option value="dec">December</option>
              </select>
              <select 
                value={selectedTableYear}
                onChange={(e) => {
                  setSelectedTableYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="year-select"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>
            <div className="download-buttons">
              <button 
                className="download-button pdf-button" 
                onClick={downloadPDF}
                disabled={loading}
              >
                <i className="icon download-icon"></i>
                {loading ? 'Generating PDF...' : 'Download PDF'}
              </button>
              <button 
                className="download-button excel-button" 
                onClick={downloadExcel}
                disabled={loading}
              >
                <i className="icon download-icon"></i>
                {loading ? 'Generating Excel...' : 'Download Excel'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Utility Type</th>
                  <th>
                    Emissions (tCO2e)
                    {selectedScope !== 'all' && ` - ${selectedScope.toUpperCase()}`}
                  </th>
                  <th>Usage</th>
                  <th>Period</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading data...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDepartments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      <p>No emissions data found. Upload utility bills to see your emissions data here.</p>
                    </td>
                  </tr>
                ) : (
                                    paginatedDepartments.map((row, index) => {
                    // Format period display
                    let periodDisplay = 'N/A';
                    if (row.month !== null && row.year !== null) {
                      const monthNames = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ];
                      periodDisplay = `${monthNames[row.month]} ${row.year}`;
                    } else if (row.billPeriod) {
                      // Fallback to billPeriod if month/year not available
                      const billDate = row.billPeriod instanceof Timestamp ? 
                        row.billPeriod.toDate() : new Date(row.billPeriod);
                      periodDisplay = billDate.toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      });
                    }

                    return (
                  <tr key={index}>
                        <td>{row.fileName || 'N/A'}</td>
                        <td>{row.utilityType || row.department}</td>
                        <td>{Number(row.displayEmissions).toFixed(2)}</td>
                        <td>{row.usage ? `${Number(row.usage).toFixed(2)} ${row.utilityType === 'electricity' ? 'kWh' : 'L'}` : 'N/A'}</td>
                        <td>{periodDisplay}</td>
                        <td>{row.lastUpdated}</td>
                        <td>
                          <div className="action-menu">
                            <button className="action-button" onClick={() => handleActionMenuClick(index)}>⋮</button>
                            {activeActionMenu === index && (
                              <div className="action-dropdown">
                                <button onClick={() => handleViewDetails(row)}>View Details</button>
                                <button onClick={() => handleEditEntry(row)}>Edit Entry</button>
                                <button onClick={() => handleDownloadFile(row)}>Download File</button>
                                <button onClick={() => handleShareData(row)}>Share Data</button>
                              </div>
                            )}
                          </div>
                        </td>
                  </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <div className="page-numbers">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={currentPage === i + 1 ? 'active' : ''}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>





        {/* ESG Recommendation System */}
        {!dataLoading && (emissionsData.scope1.length > 0 || emissionsData.scope2.length > 0 || emissionsData.scope3.length > 0) && (
          <ESGRecommendationSystem 
            emissionsData={emissionsData}
            monthlyEmissions={monthlyEmissions}
            userData={userData}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard; 