export interface CountryRegion {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  exchangeRateToZAR: number; // 1 Foreign Unit = X ZAR (e.g. 1 USD = 18.5 ZAR, 1 AOA = 0.019 ZAR)
  timeZone: string;
  defaultCities: string[];
  locale: string;
  language: 'en' | 'pt';
}

export const COUNTRIES: CountryRegion[] = [
  {
    code: 'AO',
    name: 'Angola',
    flag: '🇦🇴',
    currency: 'AOA',
    currencySymbol: 'Kz',
    exchangeRateToZAR: 0.019, // 1 ZAR ≈ 52.6 AOA (1,000 AOA ≈ 19 ZAR)
    timeZone: 'Africa/Luanda',
    defaultCities: ['Luanda', 'Huambo', 'Benguela', 'Lubango', 'Cabinda', 'Lobito'],
    locale: 'pt-AO',
    language: 'pt'
  },
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    currencySymbol: 'R',
    exchangeRateToZAR: 1.0,
    timeZone: 'Africa/Johannesburg',
    defaultCities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein'],
    locale: 'en-ZA',
    language: 'en'
  },
  {
    code: 'NA',
    name: 'Namibia',
    flag: '🇳🇦',
    currency: 'NAD',
    currencySymbol: 'N$',
    exchangeRateToZAR: 1.0,
    timeZone: 'Africa/Windhoek',
    defaultCities: ['Windhoek', 'Walvis Bay', 'Swakopmund', 'Oshakati'],
    locale: 'en-NA',
    language: 'en'
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    exchangeRateToZAR: 18.5, // 1 USD = 18.5 ZAR
    timeZone: 'America/New_York',
    defaultCities: ['New York', 'Los Angeles', 'Miami', 'Houston', 'Chicago'],
    locale: 'en-US',
    language: 'en'
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    currencySymbol: 'CA$',
    exchangeRateToZAR: 13.5, // 1 CAD = 13.5 ZAR
    timeZone: 'America/Toronto',
    defaultCities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
    locale: 'en-CA',
    language: 'en'
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRateToZAR: 20.0, // 1 EUR = 20.0 ZAR
    timeZone: 'Europe/Lisbon',
    defaultCities: ['Lisbon', 'Porto', 'Faro', 'Braga', 'Coimbra'],
    locale: 'pt-PT',
    language: 'pt'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    exchangeRateToZAR: 23.5, // 1 GBP = 23.5 ZAR
    timeZone: 'Europe/London',
    defaultCities: ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
    locale: 'en-GB',
    language: 'en'
  }
];

export function getCountryByCode(code?: string): CountryRegion {
  if (!code) return COUNTRIES[1]; // Default to South Africa
  const found = COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found || COUNTRIES[1];
}

export function getCountryByName(name?: string): CountryRegion {
  if (!name) return COUNTRIES[1];
  const q = name.toLowerCase().trim();
  const found = COUNTRIES.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase() === q ||
      c.defaultCities.some((city) => city.toLowerCase().includes(q))
  );
  return found || COUNTRIES[1];
}

/**
 * Converts an amount in ZAR to target currency
 */
export function convertZARToCurrency(zarAmount: number, targetCurrencyCode: string): {
  foreignAmount: number;
  formatted: string;
  currency: string;
  symbol: string;
} {
  const country = COUNTRIES.find((c) => c.currency === targetCurrencyCode) || COUNTRIES[1];
  
  let foreignAmount = 0;
  if (country.currency === 'ZAR' || country.currency === 'NAD') {
    foreignAmount = zarAmount;
  } else if (country.currency === 'AOA') {
    // 1 ZAR = ~52.63 AOA (approx 1 / 0.019)
    foreignAmount = Math.round(zarAmount / country.exchangeRateToZAR);
  } else {
    foreignAmount = Math.round((zarAmount / country.exchangeRateToZAR) * 100) / 100;
  }

  const formatted = `${country.currencySymbol} ${foreignAmount.toLocaleString()}`;
  return {
    foreignAmount,
    formatted,
    currency: country.currency,
    symbol: country.currencySymbol
  };
}

/**
 * Calculate client quote ensuring R500 minimum net profit
 */
export function calculateQuoteWithProfit(params: {
  baseCostZAR?: number;
  desiredProfitZAR?: number; // Default R500
  targetCurrency?: string; // Default ZAR
}) {
  const baseCost = params.baseCostZAR ?? 500;
  const minProfit = params.desiredProfitZAR ?? 500;
  const totalZAR = baseCost + minProfit;

  const converted = convertZARToCurrency(totalZAR, params.targetCurrency || 'ZAR');
  const convertedProfit = convertZARToCurrency(minProfit, params.targetCurrency || 'ZAR');
  const convertedBaseCost = convertZARToCurrency(baseCost, params.targetCurrency || 'ZAR');

  return {
    baseCostZAR: baseCost,
    minProfitZAR: minProfit,
    totalZAR,
    targetCurrency: converted.currency,
    totalInTargetCurrency: converted.foreignAmount,
    formattedTotal: converted.formatted,
    profitInTargetCurrency: convertedProfit.foreignAmount,
    formattedProfit: convertedProfit.formatted,
    baseCostInTargetCurrency: convertedBaseCost.foreignAmount,
    formattedBaseCost: convertedBaseCost.formatted
  };
}
