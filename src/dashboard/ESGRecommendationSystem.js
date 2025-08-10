import React, { useState, useEffect, useMemo } from 'react';
import './ESGRecommendationSystem.css';

// AI-Powered ESG Recommendation System
const ESGRecommendationSystem = ({ emissionsData, monthlyEmissions, userData }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [learningProgress, setLearningProgress] = useState(0);

  // AI Machine Learning Engine
  const aiAnalysisEngine = useMemo(() => {
    if (!emissionsData || !monthlyEmissions) return null;

    try {
      // Calculate total emissions for each scope
      const totalScope1 = Array.isArray(emissionsData.scope1) 
        ? emissionsData.scope1.reduce((sum, val) => sum + (Number(val) || 0), 0) 
        : 0;
      const totalScope2 = Array.isArray(emissionsData.scope2) 
        ? emissionsData.scope2.reduce((sum, val) => sum + (Number(val) || 0), 0) 
        : 0;
      const totalScope3 = Array.isArray(emissionsData.scope3) 
        ? emissionsData.scope3.reduce((sum, val) => sum + (Number(val) || 0), 0) 
        : 0;

      const totalEmissions = totalScope1 + totalScope2 + totalScope3;

      // AI Pattern Recognition: Learn from data patterns
      const analyzePatterns = () => {
        const patterns = {
          seasonalTrends: {},
          emissionCorrelations: {},
          anomalyDetection: [],
          predictiveInsights: {}
        };

        // Seasonal Analysis - AI learns seasonal patterns
        const monthlyData = Object.keys(monthlyEmissions).map(monthKey => {
          const monthData = monthlyEmissions[monthKey];
          return {
            month: monthData.monthName,
            year: monthData.year,
            scope1: monthData.scope1,
            scope2: monthData.scope2,
            scope3: monthData.scope3,
            total: monthData.scope1 + monthData.scope2 + monthData.scope3,
            season: getSeason(monthData.monthName)
          };
        }).sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          return months.indexOf(a.month) - months.indexOf(b.month);
        });

        // AI Seasonal Pattern Learning
        const seasonalAnalysis = monthlyData.reduce((acc, data) => {
          if (!acc[data.season]) {
            acc[data.season] = { scope1: [], scope2: [], scope3: [], total: [] };
          }
          acc[data.season].scope1.push(data.scope1);
          acc[data.season].scope2.push(data.scope2);
          acc[data.season].scope3.push(data.scope3);
          acc[data.season].total.push(data.total);
          return acc;
        }, {});

        // Calculate seasonal averages and identify patterns
        Object.keys(seasonalAnalysis).forEach(season => {
          const data = seasonalAnalysis[season];
          
          // Only calculate averages if we have data for this season
          if (data.total.length > 0) {
            patterns.seasonalTrends[season] = {
              avgScope1: data.scope1.reduce((a, b) => a + b, 0) / data.scope1.length,
              avgScope2: data.scope2.reduce((a, b) => a + b, 0) / data.scope2.length,
              avgScope3: data.scope3.reduce((a, b) => a + b, 0) / data.scope3.length,
              avgTotal: data.total.reduce((a, b) => a + b, 0) / data.total.length,
              dominantScope: getDominantScope(data.scope1, data.scope2, data.scope3),
              monthCount: data.total.length, // Track how many months we have data for
              months: monthlyData.filter(d => d.season === season).map(d => d.month) // Track which months
            };
          }
        });

        // AI Correlation Analysis - Learn relationships between scopes
        patterns.emissionCorrelations = {
          scope1Scope2: calculateCorrelation(monthlyData.map(d => d.scope1), monthlyData.map(d => d.scope2)),
          scope1Scope3: calculateCorrelation(monthlyData.map(d => d.scope1), monthlyData.map(d => d.scope3)),
          scope2Scope3: calculateCorrelation(monthlyData.map(d => d.scope2), monthlyData.map(d => d.scope3))
        };

        // AI Anomaly Detection - Identify unusual patterns
        patterns.anomalyDetection = detectAnomalies(monthlyData);

        // AI Predictive Insights - Forecast future trends
        patterns.predictiveInsights = generatePredictions(monthlyData, patterns.seasonalTrends);

        return patterns;
      };

      // AI Recommendation Engine with Learning Capabilities
      const generateAIRecommendations = (patterns) => {
        const recommendations = [];
        const aiInsights = [];

        // AI learns from seasonal patterns - find the season with highest emissions
        let highestSeason = null;
        let highestAvgTotal = 0;
        
        Object.keys(patterns.seasonalTrends).forEach(season => {
          const seasonData = patterns.seasonalTrends[season];
          if (seasonData.avgTotal > highestAvgTotal) {
            highestAvgTotal = seasonData.avgTotal;
            highestSeason = season;
          }
        });

        // Generate recommendations for the season with highest emissions
        if (highestSeason) {
          const seasonData = patterns.seasonalTrends[highestSeason];
            const dominantScope = seasonData.dominantScope;
            const avgTotal = seasonData.avgTotal;
            
            aiInsights.push({
              type: 'seasonal',
              title: `AI Detected Seasonal Pattern`,
              description: `Your ${dominantScope} emissions typically peak during ${highestSeason} (avg: ${avgTotal.toFixed(2)} tCO2e based on ${seasonData.monthCount} months: ${seasonData.months.join(', ')})`,
              confidence: calculateConfidence(patterns.seasonalTrends),
              recommendation: generateSeasonalRecommendation(highestSeason, dominantScope, avgTotal)
            });

            // Calculate more realistic potential reduction based on seasonal variance
            const seasonalVariance = calculateSeasonalVariance(patterns.seasonalTrends);
            const potentialReductionMin = Math.min(15, seasonalVariance * 0.4);
            const potentialReductionMax = Math.min(30, seasonalVariance * 0.8);
            
            // Calculate savings based on seasonal peak emissions
            const carbonPrice = 25; // RM per tCO2e
            const seasonalSavingsMin = avgTotal * (potentialReductionMin / 100) * carbonPrice * 12; // Annual
            const seasonalSavingsMax = avgTotal * (potentialReductionMax / 100) * carbonPrice * 12; // Annual
            
            recommendations.push({
              priority: avgTotal > 50 ? 'High' : 'Medium',
              scope: dominantScope,
              title: `AI Seasonal Optimization: ${highestSeason.charAt(0).toUpperCase() + highestSeason.slice(1)}`,
              description: `Based on historical patterns, ${dominantScope} emissions typically peak during ${highestSeason} with average of ${(seasonData[`avg${dominantScope.replace(' ', '')}`] || 0).toFixed(2)} tCO2e per month (based on ${seasonData.monthCount} months: ${seasonData.months.join(', ')})`,
              actions: generateSeasonalActions(highestSeason, dominantScope),
              potentialReduction: `${potentialReductionMin.toFixed(0)}-${potentialReductionMax.toFixed(0)}%`,
              impact: (avgTotal || 0) > 50 ? 'High' : 'Medium',
              aiConfidence: calculateConfidence(patterns.seasonalTrends),
              estimatedSavings: `$${seasonalSavingsMin.toFixed(0)} - $${seasonalSavingsMax.toFixed(0)} annually`,
              learningSource: 'Seasonal Pattern Analysis'
            });
          }

        // AI learns from correlations
        Object.keys(patterns.emissionCorrelations).forEach(correlation => {
          const correlationValue = patterns.emissionCorrelations[correlation];
          if (Math.abs(correlationValue) > 0.7) {
            const scopes = correlation.split('Scope').filter(s => s.trim());
            const scope1 = `Scope ${scopes[0]?.trim() || '1'}`;
            const scope2 = `Scope ${scopes[1]?.trim() || '2'}`;
            aiInsights.push({
              type: 'correlation',
              title: `AI Discovered Strong Correlation`,
              description: `${scope1} and ${scope2} emissions are ${correlationValue > 0 ? 'positively' : 'negatively'} correlated (${Math.abs(correlationValue).toFixed(2)})`,
              confidence: Math.abs(correlationValue),
              recommendation: generateCorrelationRecommendation(scope1, scope2, correlationValue)
            });
          }
        });

        // AI anomaly detection insights
        patterns.anomalyDetection.forEach(anomaly => {
          aiInsights.push({
            type: 'anomaly',
            title: `AI Detected Unusual Pattern`,
            description: `Unusual ${anomaly.scope} emissions in ${anomaly.month} ${anomaly.year} (${(anomaly.deviation || 0).toFixed(1)}% from normal)`,
            confidence: 0.85,
            recommendation: generateAnomalyRecommendation(anomaly)
          });
        });

        // AI predictive recommendations
        if (patterns.predictiveInsights.nextMonthPrediction) {
          const prediction = patterns.predictiveInsights.nextMonthPrediction;
          const monthlyDataLength = Object.keys(monthlyEmissions).length;
          const currentAvgEmissions = totalEmissions / (monthlyDataLength || 1);
          
          // Calculate potential reduction based on historical variance and trend reliability
          let potentialReductionMin = 10;
          let potentialReductionMax = 25;
          
          if (prediction.trendReliability === 'High') {
            potentialReductionMin = Math.min(20, Math.abs(prediction.expectedIncrease * 0.6));
            potentialReductionMax = Math.min(40, Math.abs(prediction.expectedIncrease * 1.2));
          } else {
            potentialReductionMin = Math.min(15, Math.abs(prediction.expectedIncrease * 0.4));
            potentialReductionMax = Math.min(30, Math.abs(prediction.expectedIncrease * 0.8));
          }
          
          // Calculate realistic savings based on current emissions and carbon costs
          const carbonCostPerTonne = 25; // RM per tCO2e
          const predictedEmissionChange = (currentAvgEmissions * Math.abs(prediction.expectedIncrease)) / 100;
          const minSavings = predictedEmissionChange * (potentialReductionMin / 100) * carbonCostPerTonne;
          const maxSavings = predictedEmissionChange * (potentialReductionMax / 100) * carbonCostPerTonne;
          
          recommendations.push({
            priority: prediction.expectedIncrease > 20 ? 'High' : 'Medium',
            scope: 'Predictive',
            title: `AI Forecast: ${prediction.expectedIncrease > 0 ? 'Increase' : 'Decrease'} Expected`,
            description: `Based on ${monthlyDataLength} months of historical patterns, emissions are predicted to ${prediction.expectedIncrease > 0 ? 'increase' : 'decrease'} by ${Math.abs(prediction.expectedIncrease || 0).toFixed(1)}% next month (${prediction.trendReliability.toLowerCase()} confidence trend)`,
            actions: generatePredictiveActions(prediction),
            potentialReduction: `${potentialReductionMin.toFixed(0)}-${potentialReductionMax.toFixed(0)}%`,
            impact: Math.abs(prediction.expectedIncrease || 0) > 20 ? 'High' : 'Medium',
            aiConfidence: prediction.confidence,
            estimatedSavings: `$${minSavings.toFixed(0)} - $${maxSavings.toFixed(0)} monthly`,
            learningSource: 'Predictive Analytics'
          });
        }

        // AI personalized recommendations based on company characteristics
        const companyProfile = analyzeCompanyProfile(totalScope1, totalScope2, totalScope3, userData);
        if (companyProfile.characteristics.length > 0) {
          recommendations.push({
            priority: 'High',
            scope: 'Personalized',
            title: `AI Personalized Strategy`,
            description: `Based on your company profile (${companyProfile.characteristics.join(', ')}), here are tailored recommendations`,
            actions: generatePersonalizedActions(companyProfile),
            potentialReduction: `${companyProfile.potentialReduction.min}-${companyProfile.potentialReduction.max}%`,
            impact: 'High',
            aiConfidence: 0.92,
            estimatedSavings: `$${(companyProfile.estimatedSavings.min || 0).toFixed(0)}-$${(companyProfile.estimatedSavings.max || 0).toFixed(0)} annually`,
            learningSource: 'Company Profile Analysis'
          });
        }

        return { recommendations, aiInsights };
      };

      // Helper functions for AI analysis
             const getSeason = (month) => {
         // Malaysia has a tropical climate with wet and dry seasons
                 const seasons = {
          dry: ['jan', 'feb', 'mar', 'jun', 'jul'],
          wet: ['apr', 'may', 'aug', 'sep', 'oct', 'nov', 'dec']
        };
         for (const [season, months] of Object.entries(seasons)) {
           if (months.includes(month)) return season;
         }
         return 'unknown';
       };

      const getDominantScope = (scope1Data, scope2Data, scope3Data) => {
        const avgScope1 = scope1Data.reduce((a, b) => a + b, 0) / scope1Data.length;
        const avgScope2 = scope2Data.reduce((a, b) => a + b, 0) / scope2Data.length;
        const avgScope3 = scope3Data.reduce((a, b) => a + b, 0) / scope3Data.length;
        
        if (avgScope1 > avgScope2 && avgScope1 > avgScope3) return 'Scope 1';
        if (avgScope2 > avgScope1 && avgScope2 > avgScope3) return 'Scope 2';
        return 'Scope 3';
      };

      const calculateCorrelation = (x, y) => {
        const n = x.length;
        if (n !== y.length || n === 0) return 0;
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
      };

      const detectAnomalies = (monthlyData) => {
        const anomalies = [];
        const totals = monthlyData.map(d => d.total);
        const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
        const stdDev = Math.sqrt(totals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / totals.length);
        
                 monthlyData.forEach(data => {
           const zScore = Math.abs((data.total - mean) / stdDev);
                       if (zScore > 1.5 && Math.abs((data.total - mean) / mean) < 100) { // More realistic threshold
            anomalies.push({
              month: data.month,
              year: data.year,
              scope: getDominantScope([data.scope1], [data.scope2], [data.scope3]),
              deviation: ((data.total - mean) / mean) * 100,
              zScore: zScore
            });
          }
        });
        
        return anomalies;
      };

      const generatePredictions = (monthlyData, seasonalTrends) => {
        if (monthlyData.length < 3) return {};
        
        const recentTrend = monthlyData.slice(-3);
        const trendSlope = calculateTrendSlope(recentTrend.map(d => d.total));
        const currentSeason = getSeason(new Date().toLocaleString('default', { month: 'short' }).toLowerCase());
        const seasonalFactor = seasonalTrends[currentSeason]?.avgTotal || 0;
        
                 const nextMonthPrediction = {
           expectedIncrease: Math.max(-50, Math.min(50, trendSlope * 100)), // Cap at reasonable levels
          confidence: Math.min(0.95, 0.7 + (monthlyData.length * 0.02)),
          seasonalInfluence: seasonalFactor,
          trendReliability: Math.abs(trendSlope) > 0.1 ? 'High' : 'Low'
        };
        
        return { nextMonthPrediction };
      };

      const calculateTrendSlope = (values) => {
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
        const sumX2 = values.reduce((sum, val, i) => sum + i * i, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope / (sumY / n); // Normalize by average
      };

      const calculateConfidence = (patterns) => {
        const dataPoints = Object.keys(patterns).length;
        return Math.min(0.95, 0.6 + (dataPoints * 0.1));
      };

      const calculateSeasonalVariance = (seasonalTrends) => {
        const seasonalAverages = Object.values(seasonalTrends).map(season => season.avgTotal);
        if (seasonalAverages.length < 2) return 10; // Default variance
        
        const mean = seasonalAverages.reduce((a, b) => a + b, 0) / seasonalAverages.length;
        const variance = seasonalAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / seasonalAverages.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean * 100;
        
        return Math.min(50, Math.max(5, coefficientOfVariation)); // Cap between 5-50%
      };

      const analyzeCompanyProfile = (scope1, scope2, scope3, userData) => {
        const characteristics = [];
        const total = scope1 + scope2 + scope3;
        
        if (scope1 / total > 0.5) characteristics.push('High Vehicle Fleet');
        if (scope2 / total > 0.5) characteristics.push('Energy Intensive');
        if (scope3 / total > 0.5) characteristics.push('Employee Heavy');
        if (total > 100) characteristics.push('Large Scale Operations');
        if (userData?.companyName?.toLowerCase().includes('tech')) characteristics.push('Technology Sector');
        if (userData?.companyName?.toLowerCase().includes('manufacturing')) characteristics.push('Manufacturing Sector');
        
        // Calculate dynamic potential reduction based on company profile and emission levels
        let potentialMin = 10;
        let potentialMax = 25;
        
        // Adjust potential based on company characteristics
        if (characteristics.includes('High Vehicle Fleet')) {
          potentialMin += 5; // Fleet optimization can yield good results
          potentialMax += 10;
        }
        if (characteristics.includes('Energy Intensive')) {
          potentialMin += 8; // Energy optimization has high potential
          potentialMax += 15;
        }
        if (characteristics.includes('Large Scale Operations')) {
          potentialMin += 3; // Economies of scale
          potentialMax += 8;
        }
        
        // Calculate emissions intensity factor
        const emissionsIntensity = total / (userData?.employeeCount || 50); // Assume 50 employees if not provided
        if (emissionsIntensity > 2) {
          potentialMin += 5; // High emissions per employee means more room for improvement
          potentialMax += 10;
        }
        
        // Cap the potential reduction at reasonable levels
        potentialMin = Math.min(potentialMin, 25);
        potentialMax = Math.min(potentialMax, 45);
        
        // Calculate savings based on carbon price and potential reduction
        const carbonPrice = 25; // RM per tCO2e (approximate Malaysian carbon pricing)
        const minSavings = total * (potentialMin / 100) * carbonPrice;
        const maxSavings = total * (potentialMax / 100) * carbonPrice;
        
        return {
          characteristics,
          potentialReduction: { min: potentialMin, max: potentialMax },
          estimatedSavings: { min: minSavings, max: maxSavings }
        };
      };

      // Generate AI-powered action recommendations
             const generateSeasonalRecommendation = (season, dominantScope, avgTotal) => {
         const recommendations = {
           dry: 'Optimize cooling systems and consider renewable energy during dry season',
           wet: 'Implement energy efficiency measures and monitor humidity-related consumption'
         };
         return recommendations[season] || 'Implement seasonal optimization strategies';
       };

             const generateSeasonalActions = (season, dominantScope) => {
         const actions = {
           dry: [
             'Optimize air conditioning and cooling systems',
             'Implement renewable energy solutions (solar)',
             'Enhance building envelope efficiency',
             'Monitor peak electricity usage patterns'
           ],
           wet: [
             'Implement energy efficiency measures',
             'Monitor humidity-related consumption',
             'Optimize ventilation systems',
             'Consider dehumidification strategies'
           ]
         };
         return actions[season] || ['Implement seasonal optimization strategies'];
       };

      const generateCorrelationRecommendation = (scope1, scope2, correlation) => {
        if (correlation > 0.7) {
          return `Optimize both ${scope1} and ${scope2} together for maximum impact`;
        } else if (correlation < -0.7) {
          return `Reducing ${scope1} may increase ${scope2} - balance your approach`;
        }
        return 'Monitor the relationship between these emission sources';
      };

      const generateAnomalyRecommendation = (anomaly) => {
        return `Investigate the unusual ${anomaly.scope} emissions in ${anomaly.month} ${anomaly.year} and implement preventive measures`;
      };

      const generatePredictiveActions = (prediction) => {
        if (prediction.expectedIncrease > 0) {
          return [
            'Implement proactive emission reduction measures',
            'Review operational schedules and optimize efficiency',
            'Consider temporary emission offset strategies',
            'Monitor and adjust based on real-time data'
          ];
        } else {
          return [
            'Maintain current efficiency measures',
            'Document successful strategies for future reference',
            'Consider accelerating additional reduction initiatives',
            'Share best practices across the organization'
          ];
        }
      };

      const generatePersonalizedActions = (companyProfile) => {
        const actions = [];
        if (companyProfile.characteristics.includes('High Vehicle Fleet')) {
          actions.push('Implement fleet electrification strategy');
          actions.push('Optimize delivery routes and schedules');
        }
        if (companyProfile.characteristics.includes('Energy Intensive')) {
          actions.push('Conduct comprehensive energy audit');
          actions.push('Implement renewable energy solutions');
        }
        if (companyProfile.characteristics.includes('Employee Heavy')) {
          actions.push('Develop remote work policies');
          actions.push('Implement sustainable commuting programs');
        }
        if (companyProfile.characteristics.includes('Large Scale Operations')) {
          actions.push('Establish dedicated sustainability team');
          actions.push('Implement enterprise-wide ESG strategy');
        }
        return actions.length > 0 ? actions : ['Develop comprehensive sustainability strategy'];
      };

      // Execute AI Analysis
      const patterns = analyzePatterns();
      const aiResults = generateAIRecommendations(patterns);

      return {
        totalEmissions,
        emissionSources: [
          { scope: 'Scope 1', value: totalScope1, percentage: totalEmissions > 0 ? (totalScope1 / totalEmissions) * 100 : 0, type: 'Fuel Consumption' },
          { scope: 'Scope 2', value: totalScope2, percentage: totalEmissions > 0 ? (totalScope2 / totalEmissions) * 100 : 0, type: 'Electricity Usage' },
          { scope: 'Scope 3', value: totalScope3, percentage: totalEmissions > 0 ? (totalScope3 / totalEmissions) * 100 : 0, type: 'Commuting & Travel' }
        ],
        largestSource: [
          { scope: 'Scope 1', value: totalScope1, percentage: totalEmissions > 0 ? (totalScope1 / totalEmissions) * 100 : 0 },
          { scope: 'Scope 2', value: totalScope2, percentage: totalEmissions > 0 ? (totalScope2 / totalEmissions) * 100 : 0 },
          { scope: 'Scope 3', value: totalScope3, percentage: totalEmissions > 0 ? (totalScope3 / totalEmissions) * 100 : 0 }
        ].reduce((max, current) => current.value > max.value ? current : max),
        patterns,
        recommendations: aiResults.recommendations,
        aiInsights: aiResults.aiInsights,
        dataQuality: {
          hasScope1: totalScope1 > 0,
          hasScope2: totalScope2 > 0,
          hasScope3: totalScope3 > 0,
          completeness: ((totalScope1 > 0 ? 1 : 0) + (totalScope2 > 0 ? 1 : 0) + (totalScope3 > 0 ? 1 : 0)) / 3 * 100
        }
      };
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return null;
    }
  }, [emissionsData, monthlyEmissions, userData]);

  useEffect(() => {
    setRecommendations(aiAnalysisEngine);
  }, [aiAnalysisEngine]);

  // Simulate AI learning progress
  useEffect(() => {
    if (recommendations) {
      const interval = setInterval(() => {
        setLearningProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [recommendations]);

  if (!recommendations) {
    return (
      <div className="esg-recommendation-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>AI is analyzing your ESG data...</p>
          <div className="ai-learning-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${learningProgress}%` }}></div>
            </div>
            <span>AI Learning: {learningProgress}%</span>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="esg-recommendation-container">
      <div className="recommendation-header">
        <h3>AI-Powered ESG Recommendation System</h3>
        <p>Machine learning analysis with pattern recognition, seasonal insights, and personalized recommendations</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-header">
            <span>Total Emissions</span>
          </div>
          <div className="card-value">
            {recommendations?.totalEmissions?.toFixed(2) || '0.00'} tCO2e
          </div>
          <div className="card-description">
            Combined Scope 1, 2 & 3 emissions
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <span>Largest Source</span>
          </div>
          <div className="card-value">
            {recommendations?.largestSource?.scope || 'N/A'}
          </div>
          <div className="card-description">
            {recommendations?.largestSource?.percentage?.toFixed(1) || '0.0'}% of total emissions
          </div>
        </div>


      </div>

      {/* AI Insights Section */}
      {recommendations?.aiInsights && recommendations.aiInsights.length > 0 && (
        <div className="ai-insights-section">
          <h4>AI Discovered Patterns</h4>
          <p className="section-description">
            Machine learning analysis has identified these patterns in your emissions data:
          </p>
          <div className="ai-insights-grid">
            {recommendations.aiInsights.map((insight, index) => (
              <div key={index} className="ai-insight-card">
                <div className="insight-header">
                  <div className="insight-type">{insight.type?.toUpperCase() || 'UNKNOWN'}</div>
                  <div className="ai-confidence">AI Confidence: {(insight.confidence * 100)?.toFixed(0) || '0'}%</div>
                </div>
                <h5 className="insight-title">{insight.title || 'Pattern Analysis'}</h5>
                <p className="insight-description">{insight.description || 'No description available'}</p>
                <div className="insight-recommendation">
                  <strong>AI Recommendation:</strong> {insight.recommendation || 'No recommendation available'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="emissions-breakdown">
        <h4>Emissions Breakdown by Scope</h4>
        <div className="breakdown-chart">
          {recommendations?.emissionSources?.map((source, index) => (
            <div key={index} className="breakdown-bar">
              <div className="bar-label">{source.scope || 'Unknown Scope'}</div>
              <div className="bar-container">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${source.percentage || 0}%`,
                    backgroundColor: source.scope === 'Scope 1' ? '#0066FF' : 
                                   source.scope === 'Scope 2' ? '#34C759' : '#FFB800'
                  }}
                ></div>
                <div className="bar-value">{source.value?.toFixed(2) || '0.00'} tCO2e</div>
              </div>
              <div className="bar-percentage">{source.percentage?.toFixed(1) || '0.0'}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI-Generated Recommendations section removed as requested */}


    </div>
  );
};

export default ESGRecommendationSystem; 