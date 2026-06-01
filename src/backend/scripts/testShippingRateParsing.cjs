function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function extractEasyPostRateDollarString(rate) {
  const candidates = [
    rate?.rate,
    rate?.list_rate,
    rate?.retail_rate,
    rate?.adjusted_rate,
    rate?.base_rate?.amount,
  ];

  for (const candidate of candidates) {
    const str = normalizeText(candidate);
    if (str) return str;
  }

  return "";
}

function parseEasyPostRateToCents(rate) {
  if (Number.isFinite(Number(rate?.rateCents)) && Number(rate.rateCents) > 0) {
    return Math.round(Number(rate.rateCents));
  }

  const str = extractEasyPostRateDollarString(rate);
  if (!str) return 0;

  const numeric = Number(str);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  return Math.round(numeric * 100);
}

const FREIGHT_RATE_PATTERN = /freight|ltl|truckload|pallet|intermodal/i;

function isParcelShippingRate(rate) {
  const carrier = normalizeText(rate?.carrier);
  const service = normalizeText(rate?.service);
  if (!carrier && !service) return false;

  const combined = `${carrier} ${service}`;
  if (FREIGHT_RATE_PATTERN.test(combined)) {
    return false;
  }

  const normalizedMode = normalizeText(rate?.mode).toLowerCase();
  if (normalizedMode === "freight") {
    return false;
  }

  return true;
}

const cases = [
  [{ rate: "20.00", currency: "USD" }, 2000],
  [{ rate: "7.33", currency: "USD" }, 733],
  [{ rate: "18.62", currency: "USD" }, 1862],
  [{ rate: 20, currency: "USD" }, 2000],
  [{ rate: "1862.00", currency: "USD" }, 186200],
];

let failed = 0;
for (const [rate, expected] of cases) {
  const actual = parseEasyPostRateToCents(rate);
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK" : "FAIL"} rate=${JSON.stringify(rate)} -> ${actual} (expected ${expected})`);
}

const parcelCases = [
  [{ carrier: "USPS", service: "Priority", rate: "12.00", currency: "USD" }, true],
  [{ carrier: "UPS", service: "Ground", rate: "18.00", currency: "USD" }, true],
  [{ carrier: "FedEx", service: "FEDEX_GROUND", rate: "20.00", currency: "USD" }, true],
  [{ carrier: "UPSFreight", service: "LTL", rate: "120.00", currency: "USD" }, false],
  [{ carrier: "FedEx", service: "FreightEconomy", rate: "95.00", currency: "USD" }, false],
  [{ carrier: "SAIA", service: "Standard", rate: "80.00", currency: "USD" }, true],
  [{ carrier: "UPS", service: "Pallet", rate: "70.00", currency: "USD" }, false],
];

for (const [rate, expected] of parcelCases) {
  const actual = isParcelShippingRate(rate);
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK" : "FAIL"} parcel=${JSON.stringify(rate)} -> ${actual} (expected ${expected})`);
}

process.exit(failed > 0 ? 1 : 0);
