export interface PricingTier {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  clientPrice: number;       // Annual client website price
  companyBase: number;       // Company base amount
  linkActionRate: number;    // Immediate payout for adding website link (R1.00 ZAR base)
  messageActionRate: number; // Immediate payout for sending outreach message (R0.50 ZAR base)
  linkBonus: number;         // Success bonus when deal closes/pays for link creator (R50.00 ZAR base)
  messageBonus: number;      // Success bonus when deal closes/pays for message sender (R25.00 ZAR base)
}

/**
 * Defined Pricing Tiers with exact proportional ratios based on the South African base:
 * 
 * SOUTH AFRICA: Client Price R650 | Company Base R500
 * - Link Action: R1.00
 * - Message Action: R0.50
 * - Link Success Bonus: R50.00 (ratio 50 / 650)
 * - Message Success Bonus: R25.00 (ratio 25 / 650)
 * 
 * USA: Client Price $50
 * - Link Bonus: $3.85 (50/650 * 50 = 3.846 -> $3.85)
 * - Message Bonus: $1.92 (25/650 * 50 = 1.923 -> $1.92)
 * - Link Action: $0.08 (1/650 * 50 = 0.077 -> $0.08)
 * - Message Action: $0.04 (0.5/650 * 50 = 0.038 -> $0.04)
 * - Company Base: $38.46 (500/650 * 50)
 * 
 * ANGOLA: Client Price 55,000 Kz
 * - Link Bonus: 4,231 Kz (50/650 * 55000 = 4230.77 -> 4,231 Kz)
 * - Message Bonus: 2,115 Kz (25/650 * 55000 = 2115.38 -> 2,115 Kz)
 * - Link Action: 85 Kz (1/650 * 55000 = 84.6 -> 85 Kz)
 * - Message Action: 42 Kz (0.5/650 * 55000 = 42.3 -> 42 Kz)
 * - Company Base: 42,308 Kz (500/650 * 55000)
 * 
 * EUROPE (EUR): Client Price €45
 * - Link Bonus: €3.46 (50/650 * 45 = 3.4615 -> €3.46)
 * - Message Bonus: €1.73 (25/650 * 45 = 1.7307 -> €1.73)
 * - Link Action: €0.07 (1/650 * 45 = 0.069 -> €0.07)
 * - Message Action: €0.03 (0.5/650 * 45 = 0.035 -> €0.03)
 * - Company Base: €34.62 (500/650 * 45)
 */
export const PRICING_TIERS: Record<string, PricingTier> = {
  ZA: {
    countryCode: 'ZA',
    countryName: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    clientPrice: 650,
    companyBase: 500,
    linkActionRate: 1.00,
    messageActionRate: 0.50,
    linkBonus: 50.00,
    messageBonus: 25.00
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    clientPrice: 50,
    companyBase: 38.46,
    linkActionRate: 0.08,
    messageActionRate: 0.04,
    linkBonus: 3.85,
    messageBonus: 1.92
  },
  AO: {
    countryCode: 'AO',
    countryName: 'Angola',
    currency: 'AOA',
    currencySymbol: 'Kz',
    clientPrice: 55000,
    companyBase: 42308,
    linkActionRate: 85,
    messageActionRate: 42,
    linkBonus: 4231,
    messageBonus: 2115
  },
  PT: {
    countryCode: 'PT',
    countryName: 'Europe',
    currency: 'EUR',
    currencySymbol: '€',
    clientPrice: 45,
    companyBase: 34.62,
    linkActionRate: 0.07,
    messageActionRate: 0.03,
    linkBonus: 3.46,
    messageBonus: 1.73
  }
};

/**
 * Returns the configured pricing tier for a country name, code, or currency.
 * Defaults to South Africa (ZAR).
 */
export function getPricingTierForCountry(countryIdentifier?: string): PricingTier {
  if (!countryIdentifier) return PRICING_TIERS.ZA;
  
  const id = countryIdentifier.toLowerCase().trim();

  // Check United States / USD
  if (id.includes('united states') || id.includes('usa') || id === 'us' || id === 'usd' || id.includes('america')) {
    return PRICING_TIERS.US;
  }
  
  // Check Angola / AOA / Kz
  if (id.includes('angola') || id === 'ao' || id === 'aoa' || id.includes('luanda') || id === 'kz') {
    return PRICING_TIERS.AO;
  }
  
  // Check Europe / EUR
  if (
    id.includes('europe') ||
    id.includes('euro') ||
    id.includes('portugal') ||
    id.includes('spain') ||
    id.includes('france') ||
    id.includes('germany') ||
    id === 'pt' ||
    id === 'eu' ||
    id === 'eur' ||
    id === '€'
  ) {
    return PRICING_TIERS.PT;
  }

  // Default to South Africa
  return PRICING_TIERS.ZA;
}

/**
 * Formats a monetary amount according to currency rules.
 */
export function formatMoney(amount: number, currency: string = 'ZAR', symbol?: string): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sym = symbol || (currency === 'ZAR' ? 'R' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'AOA' ? 'Kz' : 'R');

  if (currency === 'AOA') {
    // Round to whole numbers or 2 decimals if fraction
    const formatted = Math.round(safeAmount).toLocaleString('pt-AO');
    return `${formatted} ${sym}`;
  }

  if (currency === 'USD') {
    return `${sym}${safeAmount.toFixed(2)}`;
  }

  if (currency === 'EUR') {
    return `${sym}${safeAmount.toFixed(2)}`;
  }

  // Default ZAR
  return `${sym}${safeAmount.toFixed(2)}`;
}
