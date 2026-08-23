export interface MockReport {
  id: string;
  medicineName: string;
  manufacturer: string;
  batchNumber: string;
  verdict: 'VERIFIED' | 'SUSPICIOUS' | 'COUNTERFEIT';
  confidence: number;
  riskScore: number;
  country: string;
  date: string;
  expiryDate: string;
}

export interface DailyVolume {
  date: string;
  verifications: number;
  counterfeits: number;
}

export interface SupplyChainAlert {
  id: string;
  medicine: string;
  manufacturer: string;
  batch: string;
  region: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  time: string;
  description: string;
}

export interface RegionalRisk {
  country: string;
  region: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  incidents: number;
  trend: 'up' | 'down' | 'stable';
}

export const mockReports: MockReport[] = [
  { id: 'RPT-A1B2C3', medicineName: 'Paracetamol 500mg', manufacturer: 'Cipla Ltd', batchNumber: 'CIP-2026-0441', verdict: 'VERIFIED', confidence: 97, riskScore: 5, country: 'India', date: '2026-03-27', expiryDate: '2028-06-15' },
  { id: 'RPT-D4E5F6', medicineName: 'Metformin 850mg', manufacturer: 'Sun Pharma', batchNumber: 'SUN-2026-1122', verdict: 'VERIFIED', confidence: 95, riskScore: 8, country: 'India', date: '2026-03-27', expiryDate: '2027-12-01' },
  { id: 'RPT-G7H8I9', medicineName: 'Amoxicillin 250mg', manufacturer: 'Unknown Mfg', batchNumber: 'UNK-0099', verdict: 'COUNTERFEIT', confidence: 92, riskScore: 95, country: 'Nigeria', date: '2026-03-26', expiryDate: '2027-03-10' },
  { id: 'RPT-J1K2L3', medicineName: 'Atorvastatin 20mg', manufacturer: 'Pfizer Inc', batchNumber: 'PFZ-2025-8834', verdict: 'VERIFIED', confidence: 99, riskScore: 2, country: 'USA', date: '2026-03-26', expiryDate: '2028-01-20' },
  { id: 'RPT-M4N5O6', medicineName: 'Insulin Glargine', manufacturer: 'Sanofi', batchNumber: 'SNF-2026-5567', verdict: 'SUSPICIOUS', confidence: 74, riskScore: 62, country: 'Brazil', date: '2026-03-25', expiryDate: '2027-09-30' },
  { id: 'RPT-P7Q8R9', medicineName: 'Azithromycin 500mg', manufacturer: 'Zydus Cadila', batchNumber: 'ZYD-2026-3310', verdict: 'VERIFIED', confidence: 96, riskScore: 6, country: 'India', date: '2026-03-25', expiryDate: '2028-04-12' },
  { id: 'RPT-S1T2U3', medicineName: 'Lisinopril 10mg', manufacturer: 'Lupin Ltd', batchNumber: 'LUP-2026-7721', verdict: 'VERIFIED', confidence: 93, riskScore: 10, country: 'UK', date: '2026-03-24', expiryDate: '2028-08-05' },
  { id: 'RPT-V4W5X6', medicineName: 'Ciprofloxacin 500mg', manufacturer: 'Fake Pharma Co', batchNumber: 'FPC-0001', verdict: 'COUNTERFEIT', confidence: 98, riskScore: 98, country: 'Nigeria', date: '2026-03-24', expiryDate: '2025-01-01' },
  { id: 'RPT-Y7Z8A1', medicineName: 'Omeprazole 20mg', manufacturer: 'Dr Reddy\'s', batchNumber: 'DRL-2026-4455', verdict: 'VERIFIED', confidence: 94, riskScore: 7, country: 'India', date: '2026-03-23', expiryDate: '2028-02-28' },
  { id: 'RPT-B2C3D4', medicineName: 'Ibuprofen 400mg', manufacturer: 'Suspect Labs', batchNumber: 'SL-2026-0012', verdict: 'SUSPICIOUS', confidence: 68, riskScore: 55, country: 'Brazil', date: '2026-03-23', expiryDate: '2027-11-15' },
  { id: 'RPT-E5F6G7', medicineName: 'Cetirizine 10mg', manufacturer: 'GSK', batchNumber: 'GSK-2026-9901', verdict: 'VERIFIED', confidence: 98, riskScore: 3, country: 'UK', date: '2026-03-22', expiryDate: '2028-07-20' },
  { id: 'RPT-H8I9J1', medicineName: 'Losartan 50mg', manufacturer: 'Torrent Pharma', batchNumber: 'TOR-2026-6632', verdict: 'VERIFIED', confidence: 91, riskScore: 12, country: 'India', date: '2026-03-22', expiryDate: '2027-10-10' },
  { id: 'RPT-K2L3M4', medicineName: 'Clopidogrel 75mg', manufacturer: 'Unregistered Co', batchNumber: 'UC-9999', verdict: 'COUNTERFEIT', confidence: 96, riskScore: 93, country: 'Vietnam', date: '2026-03-21', expiryDate: '2026-01-01' },
  { id: 'RPT-N5O6P7', medicineName: 'Metoprolol 50mg', manufacturer: 'AstraZeneca', batchNumber: 'AZ-2026-2244', verdict: 'VERIFIED', confidence: 97, riskScore: 4, country: 'USA', date: '2026-03-21', expiryDate: '2028-05-30' },
  { id: 'RPT-Q8R9S1', medicineName: 'Doxycycline 100mg', manufacturer: 'Aurobindo', batchNumber: 'AUR-2026-1178', verdict: 'SUSPICIOUS', confidence: 71, riskScore: 48, country: 'Kenya', date: '2026-03-20', expiryDate: '2027-08-22' },
  { id: 'RPT-T2U3V4', medicineName: 'Amlodipine 5mg', manufacturer: 'Cipla Ltd', batchNumber: 'CIP-2026-3398', verdict: 'VERIFIED', confidence: 96, riskScore: 5, country: 'India', date: '2026-03-20', expiryDate: '2028-03-15' },
  { id: 'RPT-W5X6Y7', medicineName: 'Hydroxychloroquine', manufacturer: 'IPCA Labs', batchNumber: 'IPC-2026-5543', verdict: 'VERIFIED', confidence: 92, riskScore: 9, country: 'India', date: '2026-03-19', expiryDate: '2028-01-10' },
  { id: 'RPT-Z8A1B2', medicineName: 'Warfarin 5mg', manufacturer: 'Bristol-Myers', batchNumber: 'BMS-2026-8876', verdict: 'VERIFIED', confidence: 99, riskScore: 2, country: 'USA', date: '2026-03-19', expiryDate: '2027-12-25' },
  { id: 'RPT-C3D4E5', medicineName: 'Tamiflu 75mg', manufacturer: 'Roche', batchNumber: 'ROC-2026-1190', verdict: 'SUSPICIOUS', confidence: 65, riskScore: 58, country: 'Thailand', date: '2026-03-18', expiryDate: '2027-06-01' },
  { id: 'RPT-F6G7H8', medicineName: 'Diazepam 5mg', manufacturer: 'Unknown Source', batchNumber: 'FAKE-0000', verdict: 'COUNTERFEIT', confidence: 99, riskScore: 99, country: 'Pakistan', date: '2026-03-18', expiryDate: '2024-12-31' },
];

export const dailyVolumeData: DailyVolume[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2026-03-27');
  date.setDate(date.getDate() - (29 - i));
  const base = 10000 + Math.floor(Math.random() * 5000);
  return {
    date: date.toISOString().split('T')[0],
    verifications: base,
    counterfeits: Math.floor(base * (0.05 + Math.random() * 0.06)),
  };
});

export const supplyChainAlerts: SupplyChainAlert[] = [
  { id: 'ALT-001', medicine: 'Amoxicillin 250mg', manufacturer: 'Unknown Mfg', batch: 'UNK-0099', region: 'West Africa', riskLevel: 'High', time: '2 hours ago', description: 'Unregistered batch detected in Lagos distribution center' },
  { id: 'ALT-002', medicine: 'Insulin Glargine', manufacturer: 'Sanofi (suspected)', batch: 'SNF-2026-5567', region: 'South America', riskLevel: 'Medium', time: '4 hours ago', description: 'Packaging inconsistency flagged by visual AI' },
  { id: 'ALT-003', medicine: 'Ciprofloxacin 500mg', manufacturer: 'Fake Pharma Co', batch: 'FPC-0001', region: 'West Africa', riskLevel: 'High', time: '6 hours ago', description: 'Confirmed counterfeit — batch not in any registered database' },
  { id: 'ALT-004', medicine: 'Clopidogrel 75mg', manufacturer: 'Unregistered Co', batch: 'UC-9999', region: 'Southeast Asia', riskLevel: 'High', time: '8 hours ago', description: 'Supply chain path missing customs verification node' },
  { id: 'ALT-005', medicine: 'Ibuprofen 400mg', manufacturer: 'Suspect Labs', batch: 'SL-2026-0012', region: 'South America', riskLevel: 'Medium', time: '12 hours ago', description: 'Manufacturer not found in WHO prequalified list' },
  { id: 'ALT-006', medicine: 'Doxycycline 100mg', manufacturer: 'Aurobindo', batch: 'AUR-2026-1178', region: 'East Africa', riskLevel: 'Medium', time: '18 hours ago', description: 'Temperature excursion detected during transit' },
  { id: 'ALT-007', medicine: 'Tamiflu 75mg', manufacturer: 'Roche (suspected)', batch: 'ROC-2026-1190', region: 'Southeast Asia', riskLevel: 'Medium', time: '1 day ago', description: 'Hologram pattern does not match reference database' },
  { id: 'ALT-008', medicine: 'Diazepam 5mg', manufacturer: 'Unknown Source', batch: 'FAKE-0000', region: 'South Asia', riskLevel: 'High', time: '1 day ago', description: 'Controlled substance with no valid chain of custody' },
];

export const regionalRiskData: RegionalRisk[] = [
  { country: 'Nigeria', region: 'West Africa', riskLevel: 'High', incidents: 487, trend: 'up' },
  { country: 'India (North)', region: 'South Asia', riskLevel: 'High', incidents: 312, trend: 'stable' },
  { country: 'Brazil', region: 'South America', riskLevel: 'Medium', incidents: 198, trend: 'up' },
  { country: 'Vietnam', region: 'Southeast Asia', riskLevel: 'High', incidents: 267, trend: 'up' },
  { country: 'Pakistan', region: 'South Asia', riskLevel: 'High', incidents: 341, trend: 'stable' },
  { country: 'Kenya', region: 'East Africa', riskLevel: 'Medium', incidents: 156, trend: 'down' },
  { country: 'Thailand', region: 'Southeast Asia', riskLevel: 'Medium', incidents: 134, trend: 'down' },
  { country: 'USA', region: 'North America', riskLevel: 'Low', incidents: 23, trend: 'stable' },
  { country: 'UK', region: 'Europe', riskLevel: 'Low', incidents: 18, trend: 'down' },
  { country: 'Indonesia', region: 'Southeast Asia', riskLevel: 'Medium', incidents: 189, trend: 'up' },
];

export const verdictDistribution = [
  { name: 'Verified', value: 78, color: '#10B981' },
  { name: 'Suspicious', value: 14, color: '#F59E0B' },
  { name: 'Counterfeit', value: 8, color: '#EF4444' },
];

export const countries = [
  'India', 'USA', 'UK', 'Nigeria', 'Brazil', 'Kenya', 'Vietnam',
  'Thailand', 'Pakistan', 'Indonesia', 'South Africa', 'Mexico',
  'Philippines', 'Bangladesh', 'Egypt'
];
