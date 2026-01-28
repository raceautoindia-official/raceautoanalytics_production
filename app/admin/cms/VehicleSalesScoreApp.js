import { useState } from 'react';

// Helper functions for statistics
const computeMean = (arr) =>
  arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;

const computeMedian = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const computeStdDev = (arr) => {
  if (!arr.length) return 0;
  const mean = computeMean(arr);
  const variance =
    arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// Compute sample skewness using the formula:
// skewness = (n/( (n-1)(n-2) )) * (sum((xi - mean)^3) / stdDev^3)
const computeSkewness = (arr) => {
  if (arr.length < 3) return 0;
  const n = arr.length;
  const mean = computeMean(arr);
  const stdDev = computeStdDev(arr);
  if (stdDev === 0) return 0;
  let sumCube = 0;
  for (let i = 0; i < n; i++) {
    sumCube += Math.pow(arr[i] - mean, 3);
  }
  return (n / ((n - 1) * (n - 2))) * (sumCube / Math.pow(stdDev, 3));
};

// Default definitions for positive and negative attributes
const defaultPosAttributes = [
  { key: 'advertising', label: 'Advertising Spend' },
  { key: 'satisfaction', label: 'Customer Satisfaction' },
  { key: 'brandReputation', label: 'Brand Reputation' },
  { key: 'marketShare', label: 'Market Share' },
  { key: 'innovationIndex', label: 'Innovation Index' },
  { key: 'customerRetention', label: 'Customer Retention' },
  { key: 'dealerNetwork', label: 'Dealer Network Strength' },
  { key: 'productQuality', label: 'Product Quality' },
  { key: 'socialMedia', label: 'Social Media Engagement' },
  { key: 'newModel', label: 'New Model Attractiveness' },
];

const defaultNegAttributes = [
  { key: 'warrantyClaims', label: 'Warranty Claims' },
  { key: 'maintenanceComplaints', label: 'Maintenance Complaints' },
  { key: 'recalls', label: 'Recalls' },
  { key: 'depreciationRate', label: 'Depreciation Rate' },
  { key: 'fuelInefficiency', label: 'Fuel Inefficiency' },
  { key: 'emissionIssues', label: 'Emission Issues' },
  { key: 'customerComplaints', label: 'Customer Complaints' },
  { key: 'accidentRates', label: 'Accident Rates' },
  { key: 'serviceDowntime', label: 'Service Downtime' },
  { key: 'costOverruns', label: 'Cost Overruns' },
];

const numYears = 5;
const defaultYearNames = Array.from({ length: numYears }, (_, i) => `Year ${i + 1}`);

// Generate 8 equally spaced score options between 0 and 10.
const scoreOptions = Array.from({ length: 8 }, (_, i) => i * (10 / 7));

const VehicleSalesScoreApp = () => {
  // Editable attribute names for positive and negative attributes
  const [posAttributes, setPosAttributes] = useState(defaultPosAttributes);
  const [negAttributes, setNegAttributes] = useState(defaultNegAttributes);

  // Editable year names for the score calculator
  const [yearNames, setYearNames] = useState(defaultYearNames);

  // Universal weights for each attribute.
  const initialWeights = {};
  [...posAttributes, ...negAttributes].forEach(attr => {
    initialWeights[attr.key] = 0.1;
  });
  const [weights, setWeights] = useState(initialWeights);

  // State for score labels (editable). Default labels are "0" to "7".
  const [scoreLabels, setScoreLabels] = useState(["0", "1", "2", "3", "4", "5", "6", "7"]);

  // Attribute scores for each attribute across years.
  const initializeScores = (attributes) => {
    const data = {};
    attributes.forEach(attr => {
      data[attr.key] = Array(numYears).fill(0);
    });
    return data;
  };
  const [posScores, setPosScores] = useState(initializeScores(posAttributes));
  const [negScores, setNegScores] = useState(initializeScores(negAttributes));

  // Handlers for editing attribute names
  const handlePosAttributeNameChange = (key, newName) => {
    setPosAttributes(
      posAttributes.map(attr =>
        attr.key === key ? { ...attr, label: newName } : attr
      )
    );
  };
  const handleNegAttributeNameChange = (key, newName) => {
    setNegAttributes(
      negAttributes.map(attr =>
        attr.key === key ? { ...attr, label: newName } : attr
      )
    );
  };

  // Handler for editing year names for the score table
  const handleYearNameChange = (index, newName) => {
    const updated = [...yearNames];
    updated[index] = newName;
    setYearNames(updated);
  };

  // Handler to update universal weight for an attribute
  const handleWeightChange = (key, value) => {
    setWeights({ ...weights, [key]: parseFloat(value) });
  };

  // Handlers to update scores
  const handlePosScoreChange = (key, year, value) => {
    const newScores = [...posScores[key]];
    newScores[year] = parseFloat(value, 10);
    setPosScores({ ...posScores, [key]: newScores });
  };
  const handleNegScoreChange = (key, year, value) => {
    const newScores = [...negScores[key]];
    newScores[year] = parseFloat(value, 10);
    setNegScores({ ...negScores, [key]: newScores });
  };

  // Handler for editing score labels
  const handleScoreLabelChange = (index, newLabel) => {
    const updated = [...scoreLabels];
    updated[index] = newLabel;
    setScoreLabels(updated);
  };

  // Calculate final scores for each year using weighted sum:
  // Score = (Sum of positives: score * weight) - (Sum of negatives: score * weight)
  const calculateScores = () => {
    const finalScores = [];
    for (let i = 0; i < numYears; i++) {
      let posSum = 0,
        negSum = 0;
      posAttributes.forEach(attr => {
        const score = posScores[attr.key][i];
        const weight = weights[attr.key] || 0;
        posSum += score * weight;
      });
      negAttributes.forEach(attr => {
        const score = negScores[attr.key][i];
        const weight = weights[attr.key] || 0;
        negSum += score * weight;
      });
      finalScores.push(posSum - negSum);
    }
    return finalScores;
  };

  const scores = calculateScores();

  // ------------- New Section for Volume Data & CAGR ----------------

  // Separate year names for volume data so they can be changed independently
  const [volumeYearNames, setVolumeYearNames] = useState(
    Array.from({ length: numYears }, (_, i) => `Year ${i + 1}`)
  );
  // Volumes for each year, defaulted to 0
  const [volumes, setVolumes] = useState(Array(numYears).fill(0));

  const handleVolumeYearNameChange = (index, newName) => {
    const updated = [...volumeYearNames];
    updated[index] = newName;
    setVolumeYearNames(updated);
  };

  const handleVolumeChange = (index, newVolume) => {
    const updated = [...volumes];
    updated[index] = parseFloat(newVolume);
    setVolumes(updated);
  };

  // Compute CAGR using the formula:
  // CAGR = (Ending Value / Beginning Value)^(1/numYears) - 1
  const computeCAGR = () => {
    const initialVolume = volumes[0];
    const finalVolume = volumes[numYears - 1];
    if (initialVolume > 0 && numYears > 0) {
      return Math.pow(finalVolume / initialVolume, 1 / numYears) - 1;
    }
    return null;
  };

  const cagr = computeCAGR();

  // ------------- New Section for Forecast Growth (Based on Scores) ----------------
  // Modified forecast formula:
  // If pastGrowth >= 0: change = pastGrowth * Year Score/10
  // If pastGrowth < 0: change = |pastGrowth| * Year Score/10
  // Then, Forecast Growth = pastGrowth + change
  // "Percentage Change" is simply the computed change.
  // The initial past growth is taken from the computed CAGR.
  // Additionally, forecast volumes are computed starting with the last given volume.
  const computeForecastGrowthData = () => {
    const forecastData = [];
    let pastGrowth = cagr;
    if (pastGrowth === null) {
      return Array(numYears).fill(null);
    }
    // Use the last given volume as the starting volume for forecasts
    let prevVolume = volumes[volumes.length - 1];
    for (let i = 0; i < numYears; i++) {
      let change;
      if (pastGrowth < 0) {
        change = Math.abs(pastGrowth) * scores[i] / 10;
      } else {
        change = pastGrowth * scores[i] / 10;
      }
      const forecast = pastGrowth + change;
      const forecastVolume = prevVolume * (1 + forecast);
      forecastData.push({ forecast, change, forecastVolume });
      pastGrowth = forecast;
      prevVolume = forecastVolume;
    }
    return forecastData;
  };

  const forecastData = computeForecastGrowthData();

  // ------------- New Section for Historical Forecast (Based on Volume Data Alone) ----------------
  // This function computes forecast growth rates and volumes based solely on historical volume data.
  // It computes historical growth rates: g_i = (V_{i+1}/V_i) - 1, then calculates a baseline (mean) and deviations.
  // Then, for forecast period j: forecastGrowth = baseline + deviation[j mod (n-1)]
  // and forecastVolume is computed recursively.
  const computeHistoricalForecastData = () => {
    if (volumes.length < 2) return Array(numYears).fill(null);
    const growthRates = [];
    for (let i = 0; i < volumes.length - 1; i++) {
      growthRates.push(volumes[i + 1] / volumes[i] - 1);
    }
    const baseline = computeMean(growthRates);
    const deviations = growthRates.map(g => g - baseline);
    const forecastDataHistorical = [];
    let prevVolume = volumes[volumes.length - 1];
    for (let j = 0; j < numYears; j++) {
      const index = j % (volumes.length - 1); // cycle through deviations
      const forecastGrowth = baseline + deviations[index];
      const forecastVolume = prevVolume * (1 + forecastGrowth);
      forecastDataHistorical.push({
        forecastGrowth,
        percentageChange: deviations[index],
        forecastVolume,
      });
      prevVolume = forecastVolume;
    }
    return forecastDataHistorical;
  };

  const historicalForecastData = computeHistoricalForecastData();

  // ------------- New Section for Linear Regression Forecast from Volume Data ----------------
  // This function uses simple linear regression on historical volumes (with x as the year index)
  // to forecast volumes for the next 5 years.
  // The regression equation is: V = intercept + slope * x
  // It then computes the percentage change relative to the previous forecast volume.
  const computeLinearRegressionForecastVolumes = () => {
    const n = volumes.length;
    if (n === 0) return [];
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = volumes[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecastDataLR = [];
    // Forecast for the next 5 years: x = n+1 to n+5
    let prevVolume = volumes[n - 1];
    for (let i = 1; i <= 5; i++) {
      const xForecast = n + i;
      const forecastVolume = intercept + slope * xForecast;
      const percentageChange = i === 1 
        ? (forecastVolume - prevVolume) / prevVolume 
        : (forecastVolume - forecastDataLR[i - 2].forecastVolume) / forecastDataLR[i - 2].forecastVolume;
      forecastDataLR.push({ forecastVolume, percentageChange });
      prevVolume = forecastVolume;
    }
    return forecastDataLR;
  };

  const linearRegressionForecastData = computeLinearRegressionForecastVolumes();

  // ------------- New Section for Statistical Summary ----------------
  // Compute statistics for:
  // 1. Past Volume Data (volumes array)
  // 2. Forecast Growth Percentages (forecast values from forecastData)
  // 3. Forecast Volumes (forecastVolume values from forecastData)
  const volumeStats = volumes.length
    ? {
        mean: computeMean(volumes),
        median: computeMedian(volumes),
        skewness: computeSkewness(volumes),
        stdDev: computeStdDev(volumes),
      }
    : null;

  const forecastGrowthValues = forecastData
    .filter((item) => item !== null)
    .map((item) => item.forecast);
  const forecastGrowthStats = forecastGrowthValues.length
    ? {
        mean: computeMean(forecastGrowthValues),
        median: computeMedian(forecastGrowthValues),
        skewness: computeSkewness(forecastGrowthValues),
        stdDev: computeStdDev(forecastGrowthValues),
      }
    : null;

  const forecastVolumeValues = forecastData
    .filter((item) => item !== null)
    .map((item) => item.forecastVolume);
  const forecastVolumeStats = forecastVolumeValues.length
    ? {
        mean: computeMean(forecastVolumeValues),
        median: computeMedian(forecastVolumeValues),
        skewness: computeSkewness(forecastVolumeValues),
        stdDev: computeStdDev(forecastVolumeValues),
      }
    : null;

  // -------------------------------------------------------------------

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Vehicle Sales Score Calculator</h1>

      {/* Edit Year Names for Score Calculator */}
      <section>
        <h2>Edit Year Names</h2>
        {yearNames.map((name, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            <label>
              Year {index + 1} Name:{' '}
              <input
                type="text"
                value={name}
                onChange={(e) => handleYearNameChange(index, e.target.value)}
                style={{ marginLeft: '10px' }}
              />
            </label>
          </div>
        ))}
      </section>

      {/* Positive Attributes: Editable Names & Universal Weights */}
      <section style={{ marginTop: '20px' }}>
        <h2>Positive Attributes</h2>
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Attribute Name</th>
              <th>Universal Weight (0 to 1)</th>
            </tr>
          </thead>
          <tbody>
            {posAttributes.map(attr => (
              <tr key={attr.key}>
                <td>
                  <input
                    type="text"
                    value={attr.label}
                    onChange={(e) =>
                      handlePosAttributeNameChange(attr.key, e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights[attr.key]}
                    onChange={(e) => handleWeightChange(attr.key, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Negative Attributes: Editable Names & Universal Weights */}
      <section style={{ marginTop: '20px' }}>
        <h2>Negative Attributes</h2>
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Attribute Name</th>
              <th>Universal Weight (0 to 1)</th>
            </tr>
          </thead>
          <tbody>
            {negAttributes.map(attr => (
              <tr key={attr.key}>
                <td>
                  <input
                    type="text"
                    value={attr.label}
                    onChange={(e) =>
                      handleNegAttributeNameChange(attr.key, e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weights[attr.key]}
                    onChange={(e) => handleWeightChange(attr.key, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Editable Score Labels */}
      <section style={{ marginTop: '20px' }}>
        <h2>Edit Score Dropdown Labels</h2>
        {scoreLabels.map((label, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            <label>
              Label {index}:{' '}
              <input
                type="text"
                value={label}
                onChange={(e) => handleScoreLabelChange(index, e.target.value)}
                style={{ marginLeft: '10px' }}
              />
            </label>
          </div>
        ))}
      </section>

      {/* Positive Attributes Scores */}
      <section style={{ marginTop: '20px' }}>
        <h2>Positive Attributes Scores</h2>
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Attribute</th>
              {yearNames.map((yearName, index) => (
                <th key={index}>{yearName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posAttributes.map(attr => (
              <tr key={attr.key}>
                <td>{attr.label}</td>
                {yearNames.map((_, i) => (
                  <td key={i}>
                    <select
                      value={posScores[attr.key][i]}
                      onChange={(e) =>
                        handlePosScoreChange(attr.key, i, e.target.value)
                      }
                    >
                      {scoreOptions.map((option, idx) => (
                        <option key={option} value={option}>
                          {scoreLabels[idx]}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Negative Attributes Scores */}
      <section style={{ marginTop: '20px' }}>
        <h2>Negative Attributes Scores</h2>
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Attribute</th>
              {yearNames.map((yearName, index) => (
                <th key={index}>{yearName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {negAttributes.map(attr => (
              <tr key={attr.key}>
                <td>{attr.label}</td>
                {yearNames.map((_, i) => (
                  <td key={i}>
                    <select
                      value={negScores[attr.key][i]}
                      onChange={(e) =>
                        handleNegScoreChange(attr.key, i, e.target.value)
                      }
                    >
                      {scoreOptions.map((option, idx) => (
                        <option key={option} value={option}>
                          {scoreLabels[idx]}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Final Scores */}
      <section style={{ marginTop: '20px' }}>
        <h2>Yearly Scores</h2>
        <ul>
          {scores.map((score, i) => (
            <li key={i}>
              {yearNames[i]}: {(score.toFixed(2) / 10).toFixed(2)}
            </li>
          ))}
        </ul>
      </section>

      {/* Volume Data & CAGR */}
      <section style={{ marginTop: '20px' }}>
        <h2>Volume Data & CAGR</h2>
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>Year Name</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {volumeYearNames.map((name, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      handleVolumeYearNameChange(index, e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={volumes[index]}
                    onChange={(e) => handleVolumeChange(index, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '10px' }}>
          <strong>CAGR: </strong>
          {cagr !== null ? (cagr * 100).toFixed(2) + '%' : 'N/A'}
        </div>
      </section>

      {/* Forecast Growth Percentages & Volumes (Based on Scores) */}
      <section style={{ marginTop: '20px' }}>
        <h2>Forecast Growth Percentages & Volumes (Based on Scores)</h2>
        <p>
          Initial Past Year Percentage (from CAGR):{' '}
          {cagr !== null ? (cagr * 100).toFixed(2) + '%' : 'N/A'}
        </p>
        <ul>
          {forecastData.map((data, i) => (
            <li key={i}>
              {yearNames[i]}: Forecast Growth:{' '}
              {data !== null
                ? (data.forecast * 100).toFixed(2) + '%'
                : 'N/A'}{' '}
              | Percentage Change:{' '}
              {data !== null
                ? (data.change * 100).toFixed(2) + '%'
                : 'N/A'}{' '}
              | Forecast Volume:{' '}
              {data !== null
                ? data.forecastVolume.toFixed(2)
                : 'N/A'}
            </li>
          ))}
        </ul>
      </section>

      {/* Historical Forecast from Volume Data */}
      <section style={{ marginTop: '20px' }}>
        <h2>Historical Forecast from Volume Data</h2>
        <p>
          This forecast is based solely on historical volume data and CAGR.
        </p>
        <ul>
          {historicalForecastData.map((data, i) => (
            <li key={i}>
              {yearNames[i]}: Forecast Growth:{' '}
              {data !== null
                ? (data.forecastGrowth * 100).toFixed(2) + '%'
                : 'N/A'}{' '}
              | Percentage Change:{' '}
              {data !== null
                ? (data.percentageChange * 100).toFixed(2) + '%'
                : 'N/A'}{' '}
              | Forecast Volume:{' '}
              {data !== null
                ? data.forecastVolume.toFixed(2)
                : 'N/A'}
            </li>
          ))}
        </ul>
      </section>

      {/* Linear Regression Forecast from Volume Data */}
      <section style={{ marginTop: '20px' }}>
        <h2>Linear Regression Forecast from Volume Data</h2>
        <p>
          Forecasting the next 5 years based solely on historical volume data using linear regression.
        </p>
        <ul>
          {linearRegressionForecastData.map((data, i) => (
            <li key={i}>
              Year {numYears + i + 1}: Forecast Volume:{' '}
              {data !== null
                ? data.forecastVolume.toFixed(2)
                : 'N/A'}{' '}
              | Percentage Change:{' '}
              {data !== null
                ? (data.percentageChange * 100).toFixed(2) + '%'
                : 'N/A'}
            </li>
          ))}
        </ul>
      </section>

      {/* Statistical Summary */}
      <section style={{ marginTop: '20px' }}>
        <h2>Statistical Summary</h2>
        <div>
          <h3>Past Volume Data</h3>
          {volumeStats ? (
            <ul>
              <li>Mean: {volumeStats.mean.toFixed(2)}</li>
              <li>Median: {volumeStats.median.toFixed(2)}</li>
              <li>Skewness: {volumeStats.skewness.toFixed(2)}</li>
              <li>Std Dev: {volumeStats.stdDev.toFixed(2)}</li>
            </ul>
          ) : (
            'N/A'
          )}
        </div>
        <div>
          <h3>CAGR</h3>
          <p>{cagr !== null ? (cagr * 100).toFixed(2) + '%' : 'N/A'}</p>
        </div>
        <div>
          <h3>Forecast Growth Percentages (Based on Scores)</h3>
          {forecastGrowthStats ? (
            <ul>
              <li>Mean: {(forecastGrowthStats.mean * 100).toFixed(2)}%</li>
              <li>Median: {(forecastGrowthStats.median * 100).toFixed(2)}%</li>
              <li>Skewness: {(forecastGrowthStats.skewness * 100).toFixed(2)}%</li>
              <li>Std Dev: {(forecastGrowthStats.stdDev * 100).toFixed(2)}%</li>
            </ul>
          ) : (
            'N/A'
          )}
        </div>
        <div>
          <h3>Forecast Volumes (Based on Scores)</h3>
          {forecastVolumeStats ? (
            <ul>
              <li>Mean: {forecastVolumeStats.mean.toFixed(2)}</li>
              <li>Median: {forecastVolumeStats.median.toFixed(2)}</li>
              <li>Skewness: {forecastVolumeStats.skewness.toFixed(2)}</li>
              <li>Std Dev: {forecastVolumeStats.stdDev.toFixed(2)}</li>
            </ul>
          ) : (
            'N/A'
          )}
        </div>
      </section>
    </div>
  );
};

export default VehicleSalesScoreApp;