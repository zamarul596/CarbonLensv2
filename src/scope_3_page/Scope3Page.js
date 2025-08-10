import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import './Scope3Page.css';
import logo from '../images/vectorlogo.svg';
import * as XLSX from 'xlsx';
// Import icons from react-icons
import { 
  FaChartLine, 
  FaRoute, 
  FaBus, 
  FaCar, 
  FaPlane, 
  FaBicycle, 
  FaTrain,
  FaBell,
  FaUser,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaFileUpload,
  FaSpinner,
  FaDownload
} from 'react-icons/fa';
import { IoMdAnalytics } from 'react-icons/io';

const Scope3Page = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('August');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTravelType, setSelectedTravelType] = useState('');
  const [selectedTransportMode, setSelectedTransportMode] = useState('');
  
  // State for real data
  const [employeeData, setEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEmissions, setTotalEmissions] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [commutingEmissions, setCommutingEmissions] = useState(0);
  const [businessTravelEmissions, setBusinessTravelEmissions] = useState(0);
  const [donutLoading, setDonutLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  
  // Authentication state
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationData, setSelectedLocationData] = useState(null);
  
  // Debug: Log initial donut loading state
  console.log('Initial donutLoading state:', true);

  // Filter data based on selected filters
  const filteredEmployeeData = React.useMemo(() => {
    let filteredData = employeeData;

    // Filter by employee
    if (selectedEmployee) {
      filteredData = filteredData.filter(item => 
        item.employeeId === selectedEmployee || 
        item.userId === selectedEmployee
      );
    }

    // Filter by travel type
    if (selectedTravelType) {
      filteredData = filteredData.filter(item => {
        if (selectedTravelType === 'Commuting') {
          return item.isCommuting || item.type === 'Commuting';
        } else if (selectedTravelType === 'Business Travel') {
          return item.isBusinessTravel || item.type === 'Business Travel';
        }
        return item.type === selectedTravelType;
      });
    }

    // Filter by transport mode
    if (selectedTransportMode) {
      filteredData = filteredData.filter(item => {
        const mode = item.displayMode || item.mode || item.transportMode;
        return mode === selectedTransportMode;
      });
    }



    return filteredData;
  }, [employeeData, selectedEmployee, selectedTravelType, selectedTransportMode]);

  // Calculate pagination based on filtered data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployeeData.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployeeData.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Get unique values for dropdowns
  const getUniqueEmployees = () => {
    const employees = [...new Set(employeeData.map(item => item.employeeId || item.userId).filter(Boolean))];
    return employees.sort();
  };

  const getUniqueTravelTypes = () => {
    const types = [...new Set(employeeData.map(item => {
      if (item.isCommuting) return 'Commuting';
      if (item.isBusinessTravel) return 'Business Travel';
      return item.type;
    }).filter(Boolean))];
    return types.sort();
  };

  const getUniqueTransportModes = () => {
    const modes = [...new Set(employeeData.map(item => 
      item.displayMode || item.mode || item.transportMode
    ).filter(Boolean))];
    return modes.sort();
  };

  // Handle filter changes
  const handleEmployeeChange = (e) => {
    setSelectedEmployee(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleTravelTypeChange = (e) => {
    setSelectedTravelType(e.target.value);
    setCurrentPage(1);
  };

  const handleTransportModeChange = (e) => {
    setSelectedTransportMode(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedEmployee('');
    setSelectedTravelType('');
    setSelectedTransportMode('');
    setCurrentPage(1);
  };

  const handleViewFullLocation = (row) => {
    setSelectedLocationData({
      mode: row.displayMode || row.mode || row.transportMode,
      fromLocation: row.fromLocation,
      toLocation: row.toLocation,
      date: row.date,
      employeeId: row.employeeId || row.userId
    });
    setShowLocationModal(true);
  };

  const closeLocationModal = () => {
    setShowLocationModal(false);
    setSelectedLocationData(null);
  };

  // Generate and download Excel
  const downloadExcel = () => {
    try {
      setLoading(true);

      // Separate commuting and business travel data
      const commutingData = filteredEmployeeData.filter(item => 
        item.isCommuting || item.type === 'Commuting'
      ).sort((a, b) => {
        // Sort by date (newest first), then by employee ID, then by distance
        const dateA = new Date(a.date || '1900-01-01');
        const dateB = new Date(b.date || '1900-01-01');
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        const employeeA = a.employeeId || a.userId || '';
        const employeeB = b.employeeId || b.userId || '';
        if (employeeA !== employeeB) {
          return employeeA.localeCompare(employeeB);
        }
        return (b.distance || 0) - (a.distance || 0);
      });

      const businessTravelData = filteredEmployeeData.filter(item => 
        item.isBusinessTravel || item.type === 'Business Travel'
      ).sort((a, b) => {
        // Sort by date (newest first), then by employee ID, then by emissions
        const dateA = new Date(a.date || '1900-01-01');
        const dateB = new Date(b.date || '1900-01-01');
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        const employeeA = a.employeeId || a.userId || '';
        const employeeB = b.employeeId || b.userId || '';
        if (employeeA !== employeeB) {
          return employeeA.localeCompare(employeeB);
        }
        return (b.emissions || 0) - (a.emissions || 0);
      });

      // Prepare data for Excel with proper formatting
      const prepareExcelData = (data) => {
        return data.map(item => ({
          'User ID': item.userId || 'Unknown',
          'Employee ID': item.employeeId || 'N/A',
          'Date': item.date || 'N/A',
          'Travel Type': item.isCommuting ? 'Commuting' : item.isBusinessTravel ? 'Business Travel' : item.type || 'N/A',
          'Transport Mode': item.displayMode || item.mode || item.transportMode || 'N/A',
          'Distance (km)': Number(item.distance || 0).toFixed(2),
          'Emissions (kg CO₂e)': Number(item.emissions || 0).toFixed(2),
          'From Location': item.fromLocation || 'N/A',
          'To Location': item.toLocation || 'N/A',
          'Is Segment': item.isSegment ? 'Yes' : 'No',
          'Collection Name': item.collectionName || 'N/A'
        }));
      };

      const commutingExcelData = prepareExcelData(commutingData);
      const businessTravelExcelData = prepareExcelData(businessTravelData);

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Add commuting data as first sheet
      if (commutingExcelData.length > 0) {
        const commutingWorksheet = XLSX.utils.json_to_sheet(commutingExcelData);
        XLSX.utils.book_append_sheet(workbook, commutingWorksheet, 'Commuting');
      }

      // Add business travel data as second sheet
      if (businessTravelExcelData.length > 0) {
        const businessTravelWorksheet = XLSX.utils.json_to_sheet(businessTravelExcelData);
        XLSX.utils.book_append_sheet(workbook, businessTravelWorksheet, 'Business Travel');
      }

      // Add summary sheet with metadata
      const summaryData = [
        { 'Metric': 'Generated On', 'Value': new Date().toLocaleDateString() },
        { 'Metric': 'Period', 'Value': `${selectedMonth} ${selectedYear}` },
        { 'Metric': 'Total Records', 'Value': filteredEmployeeData.length },
        { 'Metric': 'Commuting Records', 'Value': commutingData.length },
        { 'Metric': 'Business Travel Records', 'Value': businessTravelData.length },
        { 'Metric': 'Total Distance (km)', 'Value': filteredEmployeeData.reduce((sum, item) => sum + (item.distance || 0), 0).toFixed(2) },
        { 'Metric': 'Total Emissions (kg CO₂e)', 'Value': filteredEmployeeData.reduce((sum, item) => sum + (item.emissions || 0), 0).toFixed(2) }
      ];
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Generate and download Excel file
      XLSX.writeFile(workbook, `scope3-travel-data-${selectedMonth}-${selectedYear}-${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [employeeData]);

  // Update metrics based on filtered data
  useEffect(() => {
    if (filteredEmployeeData.length > 0) {
      const totalEmissionsValue = filteredEmployeeData.reduce((sum, item) => sum + (item.emissions || 0), 0);
      const totalDistanceValue = filteredEmployeeData.reduce((sum, item) => sum + (item.distance || 0), 0);
      const commutingEmissionsValue = filteredEmployeeData.filter(item => 
        item.isCommuting || item.type === 'Commuting'
      ).reduce((sum, item) => sum + (item.emissions || 0), 0);
      const businessTravelEmissionsValue = filteredEmployeeData.filter(item => 
        item.isBusinessTravel || item.type === 'Business Travel'
      ).reduce((sum, item) => sum + (item.emissions || 0), 0);

      setTotalEmissions(totalEmissionsValue);
      setTotalDistance(totalDistanceValue);
      setCommutingEmissions(commutingEmissionsValue);
      setBusinessTravelEmissions(businessTravelEmissionsValue);
    }
  }, [filteredEmployeeData]);

  // Fetch data from Firebase
  const fetchEmployeeData = async () => {
    if (!authUser || authLoading) {
      return;
    }

    try {
      setLoading(true);
      setDonutLoading(true); // Reset donut loading when starting to fetch
      console.log('Starting to fetch data, donutLoading set to true');
      const user = authUser;
      if (!user) {
        console.error('No authenticated user');
        navigate('/login');
        return;
      }

      console.log('Current user:', user);
      console.log('User UID:', user.uid);

      // Get user's company ID from their profile - this is the secure way
      let companyId = null;
      const userId = user.uid;

      try {
        // Get user's profile from the users collection
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.error('User profile not found');
          navigate('/login');
          return;
        }

        const userData = userDoc.data();
        companyId = userData.companyId;
        
        if (!companyId) {
          console.error('User does not have a company ID');
          navigate('/login');
          return;
        }

        console.log('User company ID:', companyId);
        
        // Verify user has admin access to this company
        if (!userData.isCompanyAdmin || userData.platform !== 'web') {
          console.error('User does not have admin access to this company');
          navigate('/login');
          return;
        }

        // Verify company exists and is active
        const companyDocRef = doc(db, 'companies', companyId);
        const companyDoc = await getDoc(companyDocRef);
        
        if (!companyDoc.exists()) {
          console.error('Company not found');
          navigate('/login');
          return;
        }

        const companyData = companyDoc.data();
        if (!companyData.isActive) {
          console.error('Company account is inactive');
          navigate('/login');
          return;
        }

      } catch (error) {
        console.error('Error fetching user profile:', error);
        navigate('/login');
        return;
      }

      console.log('Fetching data for company:', companyId);

      // Fetch data from the authenticated user's company only
      console.log('Fetching data from authenticated user\'s company...');
      
      let allRealData = [];
      
      // Get all users under the authenticated company
      try {
        const usersRef = collection(db, 'companies', companyId, 'users');
        const usersSnapshot = await getDocs(usersRef);
        console.log(`Found ${usersSnapshot.docs.length} users in company ${companyId}`);
        
        // For each user, fetch their data
        for (const userDoc of usersSnapshot.docs) {
          const employeeUserId = userDoc.id;
          console.log(`Fetching data for employee: ${employeeUserId}`);
          
          // Try different collection names for this employee
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
      } catch (error) {
        console.log('Error fetching employees:', error);
      }

      // If no data found from employees, try company-level collections
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

      // Process the discovered data - use ALL existing data from Firebase
      let processedData = [];
      
      allRealData.forEach(item => {
        const data = item;
        console.log('Processing real Firebase document:', data);
        
        // If this is business travel with segments, create separate entries for each segment
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
              emissions: segment.emissions || 0,
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
              totalEmissions: data.totalEmissions || 0,
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
          // Regular commuting data or business travel without segments
          processedData.push({
            id: item.id,
            ...data, // Keep ALL original data
            type: data.type,
            // Use the actual field names from your Firebase data
            emissions: data.emissions || data.totalEmissions || 0,
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
            totalEmissions: data.totalEmissions || 0,
            segments: data.segments || [],
            status: data.status || '',
            submittedAt: data.submittedAt || '',
            // For business travel, use purpose as mode if no transport method
            displayMode: data.transportMethod || data.transportType || data.mode || data.purpose || 'Unknown',
            isSegment: false
          });
        }
      });

      // Filter data by selected month and year
      console.log('Filtering by month:', selectedMonth, 'year:', selectedYear);
      
      const filteredData = processedData.filter(item => {
        // Extract month and year from date field
        let itemMonth = item.month || '';
        let itemYear = item.year || '';
        
        // If no month/year fields, try to extract from date field
        if (!itemMonth || !itemYear) {
          const dateStr = item.date || '';
          if (dateStr) {
            // Handle different date formats
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
        
        // If still no month/year, try to extract from createdAt timestamp
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
        
        console.log('Checking item for filtering:', {
          originalMonth: item.month,
          originalYear: item.year,
          extractedMonth: itemMonth,
          extractedYear: itemYear,
          date: item.date,
          createdAt: item.createdAt,
          selectedMonth,
          selectedYear,
          monthMatch: itemMonth.toLowerCase() === selectedMonth.toLowerCase(),
          yearMatch: itemYear.toString() === selectedYear.toString()
        });
        
        // Check if the item matches the selected month and year
        const monthMatch = itemMonth.toLowerCase() === selectedMonth.toLowerCase();
        const yearMatch = itemYear.toString() === selectedYear.toString();
        
        return monthMatch && yearMatch;
      });

      // Sort filtered data by date (newest first)
      const sortedData = filteredData.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || '');
        const dateB = new Date(b.date || b.createdAt || '');
        return dateB - dateA; // Newest first
      });

      console.log('Filtered and sorted data:', sortedData);
      
      // If no filtered data, show empty table (don't show all data for debugging)
      if (sortedData.length === 0) {
        console.log('No data found for selected month/year:', selectedMonth, selectedYear);
        console.log('Available data (for debugging only):', processedData);
        
        // Show what months/years are available in the data
        const availableDates = processedData.map(item => {
          const dateStr = item.date || '';
          if (dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              return {
                month: monthNames[date.getMonth()],
                year: date.getFullYear().toString(),
                date: dateStr
              };
            }
          }
          return null;
        }).filter(Boolean);
        
        const uniqueDates = [...new Set(availableDates.map(d => `${d.month} ${d.year}`))];
        console.log('Available months/years in data:', uniqueDates);
        
        // Set empty data - don't show all data
        setEmployeeData([]);
        setTotalEmissions(0);
        setTotalDistance(0);
        setCommutingEmissions(0);
        setBusinessTravelEmissions(0);
        setDonutLoading(false);
        return;
      }

      console.log('Data breakdown by collection:');
      sortedData.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          id: item.id,
          collectionName: item.collectionName,
          type: item.type,
          isCommuting: item.isCommuting,
          isBusinessTravel: item.isBusinessTravel,
          emissions: item.emissions,
          totalEmissions: item.totalEmissions,
          distance: item.distance,
          totalDistance: item.totalDistance,
          purpose: item.purpose,
          displayMode: item.displayMode
        });
      });

      // Auto-detect available months and years from the data
      const availableMonths = [...new Set(processedData.map(item => item.month).filter(Boolean))];
      const availableYears = [...new Set(processedData.map(item => item.year).filter(Boolean))];
      
      console.log('Available months in real data:', availableMonths);
      console.log('Available years in real data:', availableYears);

      // For debugging: show all data if no filtered data found
      const dataToShow = sortedData.length > 0 ? sortedData : processedData;
      setEmployeeData(dataToShow);

      // Calculate totals from filtered and sorted data
      const totalEmissionsValue = sortedData.reduce((sum, item) => sum + (item.emissions || 0), 0);
      const totalDistanceValue = sortedData.reduce((sum, item) => sum + (item.distance || 0), 0);
      
      // Separate commuting and business travel data
      const commutingData = sortedData.filter(item => item.isCommuting || item.collectionName.includes('Commuting'));
      const businessTravelData = sortedData.filter(item => item.isBusinessTravel || item.collectionName.includes('Travel'));
      
      console.log('Commuting data count:', commutingData.length);
      console.log('Business travel data count:', businessTravelData.length);
      console.log('Commuting data:', commutingData);
      console.log('Business travel data:', businessTravelData);
      
      // Debug: Check what's in the business travel data
      if (businessTravelData.length > 0) {
        console.log('Business travel data details:');
        businessTravelData.forEach((item, index) => {
          console.log(`Business travel item ${index}:`, {
            id: item.id,
            collectionName: item.collectionName,
            type: item.type,
            isCommuting: item.isCommuting,
            isBusinessTravel: item.isBusinessTravel,
            emissions: item.emissions,
            totalEmissions: item.totalEmissions,
            distance: item.distance,
            totalDistance: item.totalDistance,
            purpose: item.purpose,
            displayMode: item.displayMode,
            mode: item.mode,
            transportMethod: item.transportMethod,
            transportType: item.transportType
          });
        });
      }
      
      const commutingEmissionsValue = commutingData.reduce((sum, item) => sum + (item.emissions || 0), 0);
      const businessTravelEmissionsValue = businessTravelData.reduce((sum, item) => sum + (item.emissions || 0), 0);

      console.log('Calculated totals:', {
        totalEmissionsValue,
        totalDistanceValue,
        commutingEmissionsValue,
        businessTravelEmissionsValue
      });

      setTotalEmissions(totalEmissionsValue);
      setTotalDistance(totalDistanceValue);
      setCommutingEmissions(commutingEmissionsValue);
      setBusinessTravelEmissions(businessTravelEmissionsValue);
      
      // Set donut loading to false only when we have successfully calculated emissions
      if (totalEmissionsValue > 0 || processedData.length > 0) {
        // Add a small delay to make loading visible for testing
        setTimeout(() => {
          setDonutLoading(false);
          console.log('Data loaded successfully, donutLoading set to false');
        }, 1000); // 1 second delay
      }



    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Try alternative collection names if the first attempt fails
      try {
        console.log('Trying alternative collection names...');
        
        // Get user info again for the alternative approach
        const user = auth.currentUser;
        if (!user) {
          console.error('No authenticated user in alternative approach');
          return;
        }
        
        // Get user's company ID from their profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.error('User profile not found in alternative approach');
          return;
        }

        const userData = userDoc.data();
        const companyId = userData.companyId;
        
        if (!companyId) {
          console.error('User does not have a company ID in alternative approach');
          return;
        }
        
        const userId = user.uid;
        
        console.log('Trying alternative approach with different user/company combinations...');
        
        // Try different user IDs but only for the authenticated company
        const possibleUsers = [userId]; // Only try the authenticated user
        const possibleCompanies = [companyId]; // Only try the authenticated company
        
        let foundData = [];
        
        for (const testCompany of possibleCompanies) {
          for (const testUser of possibleUsers) {
            console.log(`Trying company: ${testCompany}, user: ${testUser}`);
            
            for (const collectionName of ['employeeCommuting', 'businessTravel', 'employee_commuting', 'business_travel']) {
              try {
                const collectionRef = collection(db, 'companies', testCompany, 'users', testUser, collectionName);
                const snapshot = await getDocs(collectionRef);
                console.log(`Alternative - Collection '${collectionName}' for ${testCompany}/${testUser}: ${snapshot.docs.length} documents`);
                
                if (snapshot.docs.length > 0) {
                  const docs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log(`Alternative - Document in ${collectionName}:`, data);
                    return {
                      id: doc.id,
                      ...data,
                      collectionName: collectionName,
                      type: collectionName.includes('commuting') ? 'Commuting' : 'Business Travel'
                    };
                  });
                  foundData = [...foundData, ...docs];
                }
              } catch (error) {
                console.log(`Alternative - Collection '${collectionName}' not accessible:`, error.message);
              }
            }
          }
        }
        
                          if (foundData.length > 0) {
           console.log('Processing alternative real data:', foundData);
           
           const processedDataAlt = foundData.map(item => {
             const data = item;
             console.log('Processing alternative real Firebase document:', data);
             
             return {
               id: item.id,
               ...data, // Keep ALL original data
               type: data.type,
               // Use the actual field names from your Firebase data
               emissions: data.emissions || 0,
               distance: data.distance || 0,
               mode: data.mode || 'Unknown',
               date: data.date || '',
               employeeId: data.employeeId || 'Unknown',
               month: data.month || '',
               year: data.year || '',
               // Keep all other fields from your real data
               purpose: data.purpose || '',
               destination: data.destination || '',
               createdAt: data.createdAt || ''
             };
           });
           
           console.log('ALL ALTERNATIVE REAL DATA FROM FIREBASE:', processedDataAlt);
           
           // Filter alternative data by selected month and year
           const filteredDataAlt = processedDataAlt.filter(item => {
             const itemMonth = item.month || '';
             const itemYear = item.year || '';
             
             console.log('Alternative - Checking real item:', {
               itemMonth,
               itemYear,
               selectedMonth,
               selectedYear,
               monthMatch: itemMonth.toLowerCase() === selectedMonth.toLowerCase(),
               yearMatch: itemYear.toString() === selectedYear.toString()
             });
             
             const monthMatch = itemMonth.toLowerCase() === selectedMonth.toLowerCase();
             const yearMatch = itemYear.toString() === selectedYear.toString();
             
             return monthMatch && yearMatch;
           });
           
           // If no filtered alternative data, show empty table
           if (filteredDataAlt.length === 0) {
             console.log('No alternative data found for selected month/year:', selectedMonth, selectedYear);
             setEmployeeData([]);
             setTotalEmissions(0);
             setTotalDistance(0);
             setCommutingEmissions(0);
             setBusinessTravelEmissions(0);
             setDonutLoading(false);
             return;
           }
           
           setEmployeeData(filteredDataAlt);
           
           const totalEmissionsValueAlt = filteredDataAlt.reduce((sum, item) => sum + (item.emissions || 0), 0);
           const totalDistanceValueAlt = filteredDataAlt.reduce((sum, item) => sum + (item.distance || 0), 0);
           const commutingEmissionsValueAlt = filteredDataAlt.filter(item => item.type === 'Commuting').reduce((sum, item) => sum + (item.emissions || 0), 0);
           const businessTravelEmissionsValueAlt = filteredDataAlt.filter(item => item.type === 'Business Travel').reduce((sum, item) => sum + (item.emissions || 0), 0);

           setTotalEmissions(totalEmissionsValueAlt);
           setTotalDistance(totalDistanceValueAlt);
           setCommutingEmissions(commutingEmissionsValueAlt);
           setBusinessTravelEmissions(businessTravelEmissionsValueAlt);
           
           // Set donut loading to false for alternative data path
           if (totalEmissionsValueAlt > 0 || filteredDataAlt.length > 0) {
             // Add a small delay to make loading visible for testing
             setTimeout(() => {
               setDonutLoading(false);
               console.log('Alternative data loaded successfully, donutLoading set to false');
             }, 1000); // 1 second delay
           }
           
           console.log('Alternative data processed successfully');
         } else {
           console.log('No data found with alternative approach');
         }
        
              } catch (altError) {
          console.error('Alternative approach also failed:', altError);
          // If no data found, set empty arrays
          setEmployeeData([]);
          setTotalEmissions(0);
          setTotalDistance(0);
          setCommutingEmissions(0);
          setBusinessTravelEmissions(0);
          setDonutLoading(false); // Stop loading even if no data found
        }
    } finally {
      setLoading(false);
      // Don't set donutLoading to false here - let it stay true if there was an error
    }
  };



  // Fetch data when component mounts, filters change, or authentication changes
  useEffect(() => {
    if (authUser && !authLoading) {
      fetchEmployeeData();
    }
  }, [selectedMonth, selectedYear, authUser, authLoading]);





  const getTransportIcon = (mode) => {
    const modeLower = mode?.toLowerCase() || '';
    
    // Check for specific keywords in the mode string
    if (modeLower.includes('plane') || modeLower.includes('flight') || modeLower.includes('air')) {
      return <FaPlane className="transport-icon" />;
    }
    if (modeLower.includes('car') || modeLower.includes('vehicle') || modeLower.includes('automobile')) {
      return <FaCar className="transport-icon" />;
    }
    if (modeLower.includes('train') || modeLower.includes('rail')) {
      return <FaTrain className="transport-icon" />;
    }
    if (modeLower.includes('bus') || modeLower.includes('public transport') || modeLower.includes('transit')) {
      return <FaBus className="transport-icon" />;
    }
    if (modeLower.includes('bicycle') || modeLower.includes('bike') || modeLower.includes('cycling')) {
      return <FaBicycle className="transport-icon" />;
    }
    if (modeLower.includes('walk') || modeLower.includes('foot')) {
      return <FaRoute className="transport-icon" />;
    }
    if (modeLower.includes('motorcycle') || modeLower.includes('moto')) {
      return <FaCar className="transport-icon" />; // Using car icon for motorcycle
    }
    if (modeLower.includes('taxi') || modeLower.includes('cab')) {
      return <FaCar className="transport-icon" />;
    }
    if (modeLower.includes('subway') || modeLower.includes('metro')) {
      return <FaTrain className="transport-icon" />;
    }
    
    // Default fallback
    return <FaRoute className="transport-icon" />;
  };

  const getEmissionColor = (emissions) => {
    if (emissions === 0) return '#34C759';
    if (emissions <= 20) return '#34C759';
    if (emissions <= 100) return '#FFB800';
    return '#FF3B30';
  };



  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="scope3-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading scope 3 page...</p>
        </div>
      </div>
    );
  }

  // Redirect if no authenticated user
  if (!authUser) {
    return null; // Will redirect to login via useEffect
  }

  return (
    <div className="scope3-page">
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
          <a href="/scope3" className="nav-link active">Scope 3</a>
        </nav>
        
        <div className="header-actions">
          <a href="/contact" className="contact-link">Contact Us</a>
          <button className="notification-btn"><FaBell /></button>
          <button className="profile-btn"><FaUser /></button>
        </div>
      </header>

      <div className="main-content">
        {/* Scope 3 Emissions Overview Section */}
        <section className="overview-section">
          <div className="overview-header">
            <h1>Scope 3 Emissions Overview</h1>
            <div className="month-year-selector">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="month-select"
              >
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
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
            

          </div>

          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Total Scope 3 Emissions</span>
                <FaChartLine className="metric-icon trend-up" />
              </div>
              <div className="metric-value">
                {loading ? (
                  <div className="metric-loading-text">
                    <div className="loading-spinner"></div>
                    <span>Please wait...</span>
                  </div>
                ) : (
                  `${totalEmissions.toLocaleString()} kg CO₂e for ${selectedMonth} ${selectedYear}`
                )}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Total Kilometers Traveled</span>
                <FaRoute className="metric-icon" />
              </div>
              <div className="metric-value">
                {loading ? (
                  <div className="metric-loading-text">
                    <div className="loading-spinner"></div>
                    <span>Please wait...</span>
                  </div>
                ) : (
                  `${totalDistance.toLocaleString()} km for ${selectedMonth} ${selectedYear}`
                )}
              </div>
            </div>
          </div>





          <div className="breakdown-chart">
            <h3>
              <IoMdAnalytics className="section-icon" />
              Breakdown: Commuting vs. Business Travel
            </h3>
            <div className="donut-chart">
              <svg width="200" height="200" viewBox="0 0 200 200" className="donut-svg">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                />
                
                {/* Commuting segment */}
                {totalEmissions > 0 && (
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="20"
                    strokeDasharray={`${(commutingEmissions / totalEmissions) * 502.4} 502.4`}
                    strokeDashoffset="0"
                    transform="rotate(-90 100 100)"
                  />
                )}
                
                {/* Business Travel segment */}
                {totalEmissions > 0 && (
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="20"
                    strokeDasharray={`${(businessTravelEmissions / totalEmissions) * 502.4} 502.4`}
                    strokeDashoffset={`-${(commutingEmissions / totalEmissions) * 502.4}`}
                    transform="rotate(-90 100 100)"
                  />
                )}
              </svg>
              <div className="donut-center">
                <div className="donut-value">
                  {donutLoading ? (
                    <div className="donut-loading-spinner"></div>
                  ) : (
                    totalEmissions.toLocaleString()
                  )}
                </div>
                <div className="donut-unit">kg CO₂e</div>
              </div>
              {/* Debug: Show loading state */}
              {console.log('Donut loading state:', donutLoading)}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot commuting"></span>
                <span>Commuting</span>
                <span className="legend-value">
                  {commutingEmissions.toLocaleString()} kg CO₂e
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-dot business"></span>
                <span>Business Travel</span>
                <span className="legend-value">
                  {businessTravelEmissions.toLocaleString()} kg CO₂e
                </span>
              </div>
            </div>
            {totalEmissions > 0 && (
              <div className="chart-percentages">
                <div className="percentage-item">
                  <span className="percentage-label">Commuting:</span>
                  <span className="percentage-value">
                    {((commutingEmissions / totalEmissions) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="percentage-item">
                  <span className="percentage-label">Business Travel:</span>
                  <span className="percentage-value">
                    {((businessTravelEmissions / totalEmissions) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            
            {totalEmissions > 0 && (
              <div className="detailed-breakdown">
                <div className="breakdown-header">
                  <h4>Detailed Breakdown</h4>
                </div>
                <div className="breakdown-metrics">
                  <div className="metric-breakdown">
                    <div className="metric-label">Total Emissions</div>
                    <div className="metric-value">{totalEmissions.toLocaleString()} kg CO₂e</div>
                  </div>
                  <div className="metric-breakdown">
                    <div className="metric-label">Commuting Emissions</div>
                    <div className="metric-value commuting">
                      {commutingEmissions.toLocaleString()} kg CO₂e
                      <span className="metric-percentage">
                        ({((commutingEmissions / totalEmissions) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="metric-breakdown">
                    <div className="metric-label">Business Travel Emissions</div>
                    <div className="metric-value business">
                      {businessTravelEmissions.toLocaleString()} kg CO₂e
                      <span className="metric-percentage">
                        ({((businessTravelEmissions / totalEmissions) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Employee Travel Data Section */}
        <section className="travel-data-section">
          <h2>
            <FaRoute className="section-icon" />
            Employee Travel Data
          </h2>
          
          <div className="filters-row">
            <select 
              value={selectedEmployee} 
              onChange={handleEmployeeChange}
              className="filter-select"
            >
              <option value="">Select Employee</option>
              {getUniqueEmployees().map(employee => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>

            <select 
              value={selectedTravelType} 
              onChange={handleTravelTypeChange}
              className="filter-select"
            >
              <option value="">Select Type</option>
              {getUniqueTravelTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select 
              value={selectedTransportMode} 
              onChange={handleTransportModeChange}
              className="filter-select"
            >
              <option value="">Select Mode</option>
              {getUniqueTransportModes().map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>


            <button 
              className="clear-filters-btn" 
              onClick={handleClearFilters}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Clear Filters
            </button>
            <button 
              className="download-excel-btn" 
              onClick={downloadExcel}
              disabled={loading || filteredEmployeeData.length === 0}
            >
              <i className="icon download-icon"></i>
              Download Excel
            </button>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading employee travel data...</p>
              </div>
            ) : (
              <table className="travel-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Employee ID</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Mode of Transport</th>
                    <th>Distance (km)</th>
                    <th>Emissions (kg CO₂e)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data-message">
                        {filteredEmployeeData.length === 0 ? 
                          'No travel data found matching the selected filters' : 
                          'No data available for the current page'
                        }
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((row, index) => (
                      <tr key={row.id || index}>
                        <td>{row.userId || 'Unknown'}</td>
                        <td>{row.employeeId || 'N/A'}</td>
                        <td>{row.date}</td>
                        <td>{row.isCommuting ? 'Commuting' : row.isBusinessTravel ? 'Business Travel' : row.type}</td>
                        <td className="transport-mode-cell">
                          {getTransportIcon(row.displayMode || row.mode || row.transportMode)}
                          <div className="transport-text-container">
                            <span 
                              className="transport-text"
                              title={row.isSegment ? `${row.displayMode || row.mode} (${row.fromLocation} → ${row.toLocation})` : row.displayMode || row.mode || row.transportMode}
                            >
                              {row.isSegment ? 
                                `${row.displayMode || row.mode} (${row.fromLocation?.split(',')[0] || ''} → ${row.toLocation?.split(',')[0] || ''})` : 
                                row.displayMode || row.mode || row.transportMode
                              }
                            </span>
                                                         {row.isSegment && (row.fromLocation?.includes(',') || row.toLocation?.includes(',')) && (
                               <button 
                                 className="view-full-btn"
                                 onClick={() => handleViewFullLocation(row)}
                                 title="View full location details"
                               >
                                 View Full
                               </button>
                             )}
                          </div>
                        </td>
                        <td>{row.distance}</td>
                        <td>
                          <div className="emission-cell">
                            <span className="emission-value">{row.emissions}</span>
                            <div 
                              className="emission-bar" 
                              style={{ 
                                backgroundColor: getEmissionColor(row.emissions),
                                width: `${Math.min(row.emissions / 4, 100)}px`
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
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
            )}
          </div>
        </section>


      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>© 2025 CarbonLens. All rights reserved.</span>
        </div>
      </footer>

      {/* Location Details Modal */}
      {showLocationModal && selectedLocationData && (
        <div className="modal-overlay" onClick={closeLocationModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Travel Details</h3>
              <button className="modal-close-btn" onClick={closeLocationModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Employee:</span>
                <span className="detail-value">{selectedLocationData.employeeId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{selectedLocationData.date}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Transport Mode:</span>
                <span className="detail-value">{selectedLocationData.mode}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">From:</span>
                <span className="detail-value">{selectedLocationData.fromLocation}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value">{selectedLocationData.toLocation}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scope3Page; 