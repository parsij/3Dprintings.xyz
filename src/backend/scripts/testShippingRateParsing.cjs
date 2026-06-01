function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function centsFromDollars(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function extractEasyPostRateDollarString(rate) {
  const candidates = [
    rate?.adjusted_rate,
    rate?.rate,
    rate?.list_rate,
    rate?.retail_rate,
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

  if (str.includes(".")) {
    return Math.round(numeric * 100);
  }

  if (numeric < 100) {
    return Math.round(numeric * 100);
  }

  return Math.round(numeric);
}

const cases = [
  [{ rate: "20.00", currency: "USD" }, 2000],
  [{ rate: "7.33", currency: "USD" }, 733],
  [{ rate: 20, currency: "USD" }, 2000],
  [{ rate: 2000, currency: "USD" }, 2000],
  [{ rate: "2000.00", currency: "USD" }, 200000],
  [{ adjusted_rate: "15.50", rate: "14.00", currency: "USD" }, 1550],
];

let failed = 0;
for (const [rate, expected] of cases) {
  const actual = parseEasyPostRateToCents(rate);
  const old = centsFromDollars(rate.rate);
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK" : "FAIL"} rate=${JSON.stringify(rate)} -> ${actual} (expected ${expected}, old parser ${old})`);
}

process.exit(failed > 0 ? 1 : 0);
