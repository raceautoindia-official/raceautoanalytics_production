// Mock data generator for Flash Reports
export interface SalesData {
  month: string;
  actual: number;
  forecast?: number;
}

export interface OEMData {
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  marketShare?: number;
}

export interface SegmentData {
  name: string;
  value: number;
  color: string;
  share?: number;
}

export interface EVData {
  month: string;
  evShare: number;
  cngShare: number;
  hybridShare: number;
  totalEV: number;
}

export interface ApplicationData {
  application: string;
  value: number;
  month: string;
  share?: number;
}

// Regional multipliers
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  india: 1.0,
  apac: 1.2,
  emea: 0.8,
  americas: 1.5,
  global: 2.1,
};

// Generate time series data
export function generateSalesData(category: string, region: string): SalesData[] {
  const multiplier = REGIONAL_MULTIPLIERS[region] || 1;
  const baseValue = getBaseSalesValue(category) * multiplier;
  
  const months = [
    '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'
  ];

  return months.map((month, index) => {
    const trend = 1 + (index * 0.02); // 2% monthly growth trend
    const seasonal = 1 + Math.sin(index * Math.PI / 6) * 0.1; // 10% seasonal variation
    const noise = 1 + (Math.random() - 0.5) * 0.15; // 15% random variation
    
    const actual = Math.round(baseValue * trend * seasonal * noise);
    const forecast = index >= 20 ? Math.round(actual * (1.05 + Math.random() * 0.1)) : undefined;
    
    return {
      month: formatMonthForDisplay(month),
      actual,
      forecast,
    };
  });
}

// Generate OEM performance data
export function generateOEMData(category: string, region: string, compareType: 'mom' | 'yoy' = 'mom', currentMonth?: string): OEMData[] {
  const oems = getOEMsForCategory(category);
  const multiplier = REGIONAL_MULTIPLIERS[region] || 1;

  return oems.map((oem, index) => {
    const baseValue = (Math.random() * 50000 + 10000) * multiplier;
    const changePercent = (Math.random() - 0.5) * 30; // -15% to +15%
    const previous = Math.round(baseValue / (1 + changePercent / 100));
    const change = Math.round(baseValue - previous);

    // Calculate market share (decreases with each OEM)
    const marketShare = Number((35 - index * 5 + Math.random() * 3).toFixed(1));

    return {
      name: oem,
      current: Math.round(baseValue),
      previous,
      change,
      changePercent: Number(changePercent.toFixed(1)),
      marketShare,
    };
  }).sort((a, b) => b.current - a.current);
}

// Generate segment data
export function generateSegmentData(category: string, region: string): SegmentData[] {
  const segments = getSegmentsForCategory(category);
  const colors = ['#007AFF', '#2ECC71', '#FF5B5B', '#FFC043', '#8B5CF6', '#06B6D4'];

  const data = segments.map((segment, index) => ({
    name: segment,
    value: Math.round((Math.random() * 40000 + 5000) * (REGIONAL_MULTIPLIERS[region] || 1)),
    color: colors[index % colors.length],
  }));

  // Calculate shares
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return data.map(item => ({
    ...item,
    share: Number(((item.value / total) * 100).toFixed(1)),
  }));
}

// Generate EV share data
export function generateEVData(region: string, category?: string): EVData[] {
  const months = [
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09'
  ];

  return months.map((month, index) => {
    const evGrowthRate = region === 'india' ? 0.8 : 0.5; // India has higher EV adoption
    const baseEVShare = region === 'india' ? 3 : 2;
    
    return {
      month: formatMonthForDisplay(month),
      evShare: Number((baseEVShare + index * evGrowthRate + Math.random()).toFixed(1)),
      cngShare: Number((5 + Math.random() * 2).toFixed(1)),
      hybridShare: Number((1.5 + Math.random()).toFixed(1)),
      totalEV: Math.round((1000 + index * 200) * (REGIONAL_MULTIPLIERS[region] || 1)),
    };
  });
}

// Generate application data
export function generateApplicationData(category: string, region: string, month: string): ApplicationData[] {
  const applications = getApplicationsForCategory(category);

  const data = applications.map(app => ({
    application: app,
    value: Math.round((Math.random() * 20000 + 2000) * (REGIONAL_MULTIPLIERS[region] || 1)),
    month,
  }));

  // Calculate shares
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return data.map(item => ({
    ...item,
    share: Number(((item.value / total) * 100).toFixed(1)),
  })).sort((a, b) => b.value - a.value);
}

// Helper functions
export function formatMonthForDisplay(month: string): string {
  const [year, monthNum] = month.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
}

function getBaseSalesValue(category: string): number {
  const values: Record<string, number> = {
    'overall': 150000,
    'two-wheeler': 80000,
    'three-wheeler': 25000,
    'commercial-vehicles': 35000,
    'trucks': 20000,
    'buses': 8000,
    'passenger-vehicles': 60000,
    'tractor': 15000,
  };
  return values[category] || 10000;
}

function getOEMsForCategory(category: string): string[] {
  const oems: Record<string, string[]> = {
    'overall': ['Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Toyota', 'Kia'],
    'two-wheeler': ['Hero MotoCorp', 'Honda', 'Bajaj Auto', 'TVS Motor', 'Royal Enfield', 'Yamaha'],
    'three-wheeler': ['Bajaj Auto', 'Mahindra', 'Piaggio', 'TVS Motor', 'Force Motors', 'Atul Auto'],
    'commercial-vehicles': ['Tata Motors', 'Mahindra', 'Ashok Leyland', 'Eicher Motors', 'Force Motors'],
    'trucks': ['Tata Motors', 'Ashok Leyland', 'Mahindra', 'Eicher Motors', 'Bharatbenz'],
    'buses': ['Tata Motors', 'Ashok Leyland', 'Mahindra', 'Force Motors', 'Eicher Motors'],
    'passenger-vehicles': ['Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Toyota', 'Kia'],
    'tractor': ['Mahindra', 'Sonalika', 'TAFE', 'Escorts', 'John Deere', 'New Holland'],
  };
  return oems[category] || oems['overall'];
}

function getSegmentsForCategory(category: string): string[] {
  const segments: Record<string, string[]> = {
    'commercial-vehicles': ['Light Commercial Vehicle', 'Medium Commercial Vehicle', 'Heavy Commercial Vehicle'],
    'trucks': ['Light Trucks', 'Medium Trucks', 'Heavy Trucks', 'Ultra Heavy Trucks'],
    'buses': ['Mini Bus', 'Midi Bus', 'Full Size Bus', 'Luxury Coach'],
    'passenger-vehicles': ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'],
    'two-wheeler': ['Scooter', 'Motorcycle', 'Moped', 'Electric'],
    'three-wheeler': ['Passenger', 'Goods', 'E-rickshaw'],
    'tractor': ['Small (15-30 HP)', 'Medium (31-50 HP)', 'Large (51+ HP)'],
  };
  return segments[category] || ['Segment A', 'Segment B', 'Segment C'];
}

function getApplicationsForCategory(category: string): string[] {
  const applications: Record<string, string[]> = {
    'two-wheeler': ['Personal', 'Commercial', 'Delivery', 'Tourism'],
    'three-wheeler': ['Passenger Transport', 'Goods Transport', 'E-commerce', 'Tourism'],
    'trucks': ['Construction', 'Logistics', 'Mining', 'Agriculture', 'Manufacturing'],
    'buses': ['Public Transport', 'School Transport', 'Tourism', 'Private Charter'],
    'passenger-vehicles': ['Personal', 'Taxi/Cab', 'Corporate', 'Rental'],
    'tractor': ['Agriculture', 'Construction', 'Industrial', 'Municipal'],
  };
  return applications[category] || ['Application A', 'Application B', 'Application C'];
}

// Alternative fuel adoption data
export function generateAlternativeFuelData(region: string) {
  const fuelTypes = ['Electric', 'CNG', 'Hybrid', 'Ethanol', 'Hydrogen'];
  const colors = ['#2ECC71', '#007AFF', '#FFC043', '#8B5CF6', '#06B6D4'];

  return fuelTypes.map((fuel, index) => {
    const currentValue = Math.random() * 15000 + 5000;
    const previousValue = currentValue * (0.8 + Math.random() * 0.3); // Previous month variation

    return {
      fuel,
      current: Math.round(currentValue * (REGIONAL_MULTIPLIERS[region] || 1)),
      previous: Math.round(previousValue * (REGIONAL_MULTIPLIERS[region] || 1)),
      color: colors[index],
      change: Math.round((currentValue - previousValue) * (REGIONAL_MULTIPLIERS[region] || 1)),
      changePercent: Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1)),
    };
  });
}

// Generate Tipper and Tractor Trailer data
export function generateTipperTractorData(region: string) {
  const months = [
    '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
    '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09'
  ];

  const multiplier = REGIONAL_MULTIPLIERS[region] || 1;
  const tipperBase = 4500 * multiplier;
  const tractorTrailerBase = 3800 * multiplier;

  return months.map((month, index) => {
    const trend = 1 + (index * 0.008);
    const seasonal = 1 + Math.sin(index * Math.PI / 6) * 0.1;
    const noise = 1 + (Math.random() - 0.5) * 0.1;

    return {
      month: formatMonthForDisplay(month),
      tipper: Math.round(tipperBase * trend * seasonal * noise),
      tractorTrailer: Math.round(tractorTrailerBase * trend * seasonal * noise),
    };
  });
}

// Format number with Indian locale
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}