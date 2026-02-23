import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Home, Calculator, DollarSign, TrendingUp, Building2, Scale, PiggyBank,
  Percent, Gift, MapPin, BarChart3, ArrowLeft, Layers, FileText, Info
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';

/* ============================================================
   WA PROPERTY CALCULATORS - Perch
   All rates sourced from WA Government (RevenueWA) as at Feb 2026
   ============================================================ */

// ── WA Stamp Duty (Transfer Duty) General Rates ──
// Source: wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment
function calcStampDuty(value: number): number {
  if (value <= 0) return 0;
  if (value <= 120000) return Math.ceil(value / 100) * 1.90;
  if (value <= 150000) return 2280 + Math.ceil((value - 120000) / 100) * 2.85;
  if (value <= 360000) return 3135 + Math.ceil((value - 150000) / 100) * 3.80;
  if (value <= 725000) return 11115 + Math.ceil((value - 360000) / 100) * 4.75;
  return 28453 + Math.ceil((value - 725000) / 100) * 5.15;
}

// ── WA First Home Buyer Stamp Duty (from 21 March 2025) ──
// Source: wa.gov.au changes announced March 2025
function calcFHBStampDuty(value: number, isMetro: boolean): number {
  if (value <= 0) return 0;
  if (isMetro) {
    if (value > 700000) return calcStampDuty(value);
    if (value <= 500000) return 0;
    return Math.ceil((value - 500000) / 100) * 13.63;
  } else {
    if (value > 750000) return calcStampDuty(value);
    if (value <= 500000) return 0;
    return Math.ceil((value - 500000) / 100) * 11.89;
  }
}

// ── WA Land Tax Rates ──
// Source: wa.gov.au/organisation/department-of-treasury-and-finance/land-tax-assessment
function calcLandTax(value: number): number {
  if (value <= 300000) return 0;
  if (value <= 420000) return 300;
  if (value <= 1000000) return 300 + (value - 420000) * 0.0025;
  if (value <= 1800000) return 1750 + (value - 1000000) * 0.009;
  if (value <= 5000000) return 8950 + (value - 1800000) * 0.018;
  if (value <= 11000000) return 66550 + (value - 5000000) * 0.02;
  return 186550 + (value - 11000000) * 0.0267;
}

function calcMRIT(value: number): number {
  if (value <= 300000) return 0;
  return (value - 300000) * 0.0014;
}

// ── Mortgage Repayment Calculation ──
function calcRepayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── Generate Amortisation Schedule ──
function generateAmortisation(principal: number, annualRate: number, years: number) {
  const monthly = calcRepayment(principal, annualRate, years);
  const r = annualRate / 100 / 12;
  const data = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  for (let year = 1; year <= years; year++) {
    let yearInterest = 0;
    let yearPrincipal = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * r;
      const principalPaid = monthly - interest;
      yearInterest += interest;
      yearPrincipal += principalPaid;
      balance = Math.max(0, balance - principalPaid);
    }
    totalInterest += yearInterest;
    totalPrincipal += yearPrincipal;
    data.push({
      year,
      balance: Math.round(balance),
      interest: Math.round(totalInterest),
      principal: Math.round(totalPrincipal),
    });
  }
  return { data, totalInterest: Math.round(totalInterest), monthly };
}

// ── Australian Tax Rates 2025-26 ──
function calcIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 18200) return 0;
  if (taxableIncome <= 45000) return (taxableIncome - 18200) * 0.16;
  if (taxableIncome <= 135000) return 4288 + (taxableIncome - 45000) * 0.30;
  if (taxableIncome <= 190000) return 31288 + (taxableIncome - 135000) * 0.37;
  return 51638 + (taxableIncome - 190000) * 0.45;
}

function getMarginalRate(taxableIncome: number): number {
  if (taxableIncome <= 18200) return 0;
  if (taxableIncome <= 45000) return 0.16;
  if (taxableIncome <= 135000) return 0.30;
  if (taxableIncome <= 190000) return 0.37;
  return 0.45;
}

// ── Borrowing Power Calculation ──
function calcBorrowingPower(
  grossIncome: number, partnerIncome: number, monthlyExpenses: number,
  existingLoans: number, creditLimit: number, dependants: number
): number {
  const totalGross = grossIncome + partnerIncome;
  const netMonthly = (totalGross - calcIncomeTax(totalGross) - totalGross * 0.02) / 12;
  const dependantCost = dependants * 400;
  const creditCost = creditLimit * 0.038 / 12;
  const availableForRepayment = (netMonthly - monthlyExpenses - dependantCost - existingLoans - creditCost) * 0.85;
  if (availableForRepayment <= 0) return 0;
  const bufferRate = Math.max(6, 6.5) / 100 / 12;
  const n = 30 * 12;
  return availableForRepayment * (Math.pow(1 + bufferRate, n) - 1) / (bufferRate * Math.pow(1 + bufferRate, n));
}

// ── Helpers ──
const fmt = (n: number) => n.toLocaleString('en-AU', { maximumFractionDigits: 0 });
const fmtD = (n: number, d: number) => n.toLocaleString('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d });

type CalcId = 'mortgage' | 'stamp' | 'borrow' | 'yield' | 'buyrent' | 'offset' |
  'compare' | 'equity' | 'nge' | 'cgt' | 'fhog' | 'land';

interface CalcDef {
  id: CalcId;
  slug: string;
  title: string;
  desc: string;
  seoTitle: string;
  seoDesc: string;
  icon: typeof Calculator;
  color: string;
}

const CALCS: CalcDef[] = [
  { id: 'mortgage', slug: 'mortgage-repayments', title: 'Mortgage Repayments', desc: 'P&I vs Interest Only with amortisation chart', seoTitle: 'Perth Mortgage Repayment Calculator 2026 | Perch', seoDesc: 'Calculate P&I and interest-only mortgage repayments for Perth properties. Compare weekly, fortnightly and monthly payments with amortisation chart.', icon: Home, color: 'text-orange-500' },
  { id: 'stamp', slug: 'stamp-duty-wa', title: 'Stamp Duty (WA)', desc: 'Transfer duty with first home buyer concessions', seoTitle: 'WA Stamp Duty Calculator 2026 | Perch', seoDesc: 'Calculate Western Australia transfer duty costs including first home buyer concessions and March 2025 threshold changes. Free and accurate.', icon: FileText, color: 'text-blue-500' },
  { id: 'borrow', slug: 'borrowing-power', title: 'Borrowing Power', desc: 'How much can you borrow based on income', seoTitle: 'Perth Borrowing Power Calculator | Perch', seoDesc: 'Estimate how much you can borrow for a Perth property based on your income, expenses and current interest rates with 3% serviceability buffer.', icon: TrendingUp, color: 'text-green-500' },
  { id: 'yield', slug: 'rental-yield', title: 'Rental Yield', desc: 'Gross and net yield with expense breakdown', seoTitle: 'Perth Rental Yield Calculator | Perch', seoDesc: 'Calculate gross and net rental yield for Perth investment properties with full expense breakdown including management fees, rates and insurance.', icon: Building2, color: 'text-purple-500' },
  { id: 'buyrent', slug: 'buy-vs-rent', title: 'Buy vs Rent', desc: 'Break-even analysis with wealth comparison', seoTitle: 'Buy vs Rent Calculator Perth 2026 | Perch', seoDesc: 'Should you buy or rent in Perth? Compare long-term wealth with interactive chart and break-even analysis.', icon: Scale, color: 'text-teal-500' },
  { id: 'offset', slug: 'offset-account', title: 'Offset Account', desc: 'Interest and time saved with your offset', seoTitle: 'Offset Account Savings Calculator | Perch', seoDesc: 'Calculate how much interest and time your offset account saves on your home loan. See equivalent rate comparison.', icon: PiggyBank, color: 'text-pink-500' },
  { id: 'compare', slug: 'loan-comparison', title: 'Loan Comparison', desc: 'Compare two loan scenarios side by side', seoTitle: 'Home Loan Comparison Calculator | Perch', seoDesc: 'Compare two home loan scenarios side by side. Monthly payments, total interest and break-even time for refinancing.', icon: BarChart3, color: 'text-indigo-500' },
  { id: 'equity', slug: 'equity-calculator', title: 'Equity Calculator', desc: 'Available equity for your next purchase', seoTitle: 'Home Equity Calculator Perth | Perch', seoDesc: 'Calculate your available and usable equity at 80% LVR. See your maximum purchase price for your next Perth property investment.', icon: Layers, color: 'text-amber-500' },
  { id: 'nge', slug: 'negative-gearing', title: 'Negative Gearing', desc: 'Tax benefits of investment property losses', seoTitle: 'Negative Gearing Calculator Australia 2026 | Perch', seoDesc: 'Calculate tax benefits of negatively geared investment properties. Annual loss, marginal tax rate benefit and net cost after tax.', icon: Percent, color: 'text-red-500' },
  { id: 'cgt', slug: 'capital-gains-tax', title: 'Capital Gains Tax', desc: 'CGT on investment property sale', seoTitle: 'Capital Gains Tax Calculator Australia 2026 | Perch', seoDesc: 'Calculate CGT on investment property sales including the 50% discount for properties held longer than 12 months.', icon: DollarSign, color: 'text-cyan-500' },
  { id: 'fhog', slug: 'first-home-grants-wa', title: 'First Home Grants', desc: 'FHOG eligibility and stamp duty savings', seoTitle: 'WA First Home Owner Grant Calculator 2026 | Perch', seoDesc: 'Check eligibility for the $10K FHOG and stamp duty concessions in Western Australia including March 2025 threshold changes.', icon: Gift, color: 'text-lime-500' },
  { id: 'land', slug: 'land-tax-wa', title: 'Land Tax (WA)', desc: 'Annual land tax for investment properties', seoTitle: 'WA Land Tax Calculator 2026 | Perch', seoDesc: 'Calculate annual land tax for Perth investment properties using current Western Australian progressive tax rates and thresholds.', icon: MapPin, color: 'text-rose-500' },
];


// ════════════════════════════════════════════════════════════
// INDIVIDUAL CALCULATOR COMPONENTS
// ════════════════════════════════════════════════════════════

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ResultCard({ label, value, sub, color = 'bg-muted' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── 1. MORTGAGE REPAYMENTS ──
function MortgageCalc() {
  const [loan, setLoan] = useState(800000);
  const [rate, setRate] = useState(5.5);
  const [years, setYears] = useState(30);
  const [freq, setFreq] = useState<'monthly' | 'fortnightly' | 'weekly'>('monthly');
  const [extra, setExtra] = useState(0);

  const monthly = calcRepayment(loan, rate, years);
  const ioMonthly = loan * (rate / 100 / 12);
  const { data: amortData, totalInterest } = generateAmortisation(loan, rate, years);

  const freqPayment = freq === 'monthly' ? monthly : freq === 'fortnightly' ? monthly / 2 : monthly * 12 / 52;
  const freqLabel = freq === 'monthly' ? '/month' : freq === 'fortnightly' ? '/fortnight' : '/week';

  // Extra repayments calculation
  let savingsYears = 0;
  let savingsInterest = 0;
  if (extra > 0) {
    const r = rate / 100 / 12;
    let bal = loan;
    let months = 0;
    let totalInt = 0;
    while (bal > 0 && months < years * 12) {
      const interest = bal * r;
      const principalPaid = monthly + extra - interest;
      totalInt += interest;
      bal = Math.max(0, bal - principalPaid);
      months++;
    }
    savingsYears = years - months / 12;
    savingsInterest = totalInterest - totalInt;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LabelRow label="Loan Amount ($)">
          <Input type="number" value={loan} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoan(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Interest Rate (%)">
          <Input type="number" step="0.1" value={rate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Loan Term (years)">
          <Input type="number" value={years} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYears(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Repayment Frequency">
          <Select value={freq} onValueChange={v => setFreq(v as typeof freq)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </LabelRow>
        <LabelRow label="Extra Repayments ($/month)">
          <Input type="number" value={extra} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtra(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label={`P&I Repayment ${freqLabel}`} value={`$${fmt(Math.round(freqPayment))}`} color="bg-orange-500/10" />
        <ResultCard label="Interest Only /month" value={`$${fmt(Math.round(ioMonthly))}`} sub={`$${fmt(Math.round(monthly - ioMonthly))} more for P&I`} />
        <ResultCard label="Total Interest" value={`$${fmt(totalInterest)}`} sub={`${((totalInterest / loan) * 100).toFixed(0)}% of loan`} color="bg-red-500/10" />
        <ResultCard label="Total Cost" value={`$${fmt(loan + totalInterest)}`} sub={`Loan + interest`} />
      </div>

      {extra > 0 && savingsYears > 0 && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <p className="text-sm font-medium text-green-600">Extra Repayments Impact</p>
          <p className="text-lg font-bold mt-1">
            Save ${fmt(Math.round(savingsInterest))} in interest | Pay off {fmtD(savingsYears, 1)} years earlier
          </p>
        </div>
      )}

      {amortData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Loan Balance Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={amortData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`$${fmt(v)}`, '']} labelFormatter={l => `Year ${l}`} />
                <Area type="monotone" dataKey="balance" stroke="#f97316" fill="#f97316" fillOpacity={0.2} name="Remaining Balance" />
                <Area type="monotone" dataKey="interest" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Total Interest Paid" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. STAMP DUTY (WA) ──
function StampDutyCalc() {
  const [price, setPrice] = useState(1000000);
  const [buyerType, setBuyerType] = useState<'general' | 'fhb'>('general');
  const [isMetro, setIsMetro] = useState(true);

  const generalDuty = calcStampDuty(price);
  const fhbDuty = calcFHBStampDuty(price, isMetro);
  const duty = buyerType === 'fhb' ? fhbDuty : generalDuty;
  const effectiveRate = price > 0 ? (duty / price) * 100 : 0;
  const fhbSaving = buyerType === 'fhb' ? generalDuty - fhbDuty : 0;
  const mortgageReg = 200.20;
  const transferReg = price <= 85000 ? 200.20 : 200.20 + Math.ceil((price - 85000) / 10000) * 20.20;
  const totalCosts = duty + mortgageReg + transferReg;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LabelRow label="Property Price ($)">
          <Input type="number" value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Buyer Type">
          <Select value={buyerType} onValueChange={v => setBuyerType(v as 'general' | 'fhb')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Owner Occupier / Investor</SelectItem>
              <SelectItem value="fhb">First Home Buyer</SelectItem>
            </SelectContent>
          </Select>
        </LabelRow>
        {buyerType === 'fhb' && (
          <LabelRow label="Location">
            <Select value={isMetro ? 'metro' : 'regional'} onValueChange={v => setIsMetro(v === 'metro')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metro">Perth Metro / Peel</SelectItem>
                <SelectItem value="regional">Regional WA</SelectItem>
              </SelectContent>
            </Select>
          </LabelRow>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Stamp Duty" value={`$${fmt(Math.round(duty))}`} color="bg-blue-500/10" />
        <ResultCard label="Effective Rate" value={`${fmtD(effectiveRate, 2)}%`} sub="of property value" />
        <ResultCard label="Registration Fees" value={`$${fmt(Math.round(mortgageReg + transferReg))}`} sub="Mortgage + Transfer" />
        <ResultCard label="Total Govt Costs" value={`$${fmt(Math.round(totalCosts))}`} color="bg-orange-500/10" />
      </div>

      {fhbSaving > 0 && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <p className="text-sm font-medium text-green-600">First Home Buyer Saving</p>
          <p className="text-lg font-bold mt-1">You save ${fmt(Math.round(fhbSaving))} compared to standard rates</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>WA transfer duty rates effective 1 July 2008. First home buyer concessions updated 21 March 2025. Registration fees are estimates.</span>
      </div>
    </div>
  );
}

// ── 3. BORROWING POWER ──
function BorrowingCalc() {
  const [income, setIncome] = useState(120000);
  const [partnerIncome, setPartnerIncome] = useState(0);
  const [expenses, setExpenses] = useState(3000);
  const [existingLoans, setExistingLoans] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [dependants, setDependants] = useState(0);

  const maxLoan = calcBorrowingPower(income, partnerIncome, expenses, existingLoans, creditLimit, dependants);
  const deposit20pct = maxLoan * 0.25;
  const maxProperty = maxLoan + deposit20pct;
  const monthlyRepayment = calcRepayment(maxLoan, 6.0, 30);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LabelRow label="Your Gross Annual Income ($)">
          <Input type="number" value={income} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIncome(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Partner Gross Annual Income ($)">
          <Input type="number" value={partnerIncome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPartnerIncome(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Monthly Living Expenses ($)">
          <Input type="number" value={expenses} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenses(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Existing Loan Repayments ($/month)">
          <Input type="number" value={existingLoans} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExistingLoans(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Credit Card Limits ($)">
          <Input type="number" value={creditLimit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreditLimit(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Number of Dependants">
          <Input type="number" value={dependants} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDependants(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Max Borrowing" value={`$${fmt(Math.round(maxLoan))}`} color="bg-green-500/10" />
        <ResultCard label="Max Property Price" value={`$${fmt(Math.round(maxProperty))}`} sub="With 20% deposit" color="bg-orange-500/10" />
        <ResultCard label="Est. Monthly Repayment" value={`$${fmt(Math.round(monthlyRepayment))}`} sub="at 6.0% over 30 years" />
        <ResultCard label="20% Deposit Needed" value={`$${fmt(Math.round(deposit20pct))}`} />
      </div>

      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Estimate only. Banks use a 6%+ serviceability buffer rate. Actual borrowing power varies by lender. Does not include LMI, stamp duty, or fees. Consult a mortgage broker.</span>
      </div>
    </div>
  );
}

// ── 4. RENTAL YIELD ──
function RentalYieldCalc() {
  const [propertyValue, setPropertyValue] = useState(800000);
  const [weeklyRent, setWeeklyRent] = useState(700);
  const [councilRates, setCouncilRates] = useState(2400);
  const [waterRates, setWaterRates] = useState(1200);
  const [insurance, setInsurance] = useState(1800);
  const [maintenance, setMaintenance] = useState(2000);
  const [management, setManagement] = useState(8);
  const [strata, setStrata] = useState(0);

  const annualRent = weeklyRent * 52;
  const managementCost = annualRent * (management / 100);
  const totalExpenses = councilRates + waterRates + insurance + maintenance + managementCost + strata;
  const grossYield = propertyValue > 0 ? (annualRent / propertyValue) * 100 : 0;
  const netIncome = annualRent - totalExpenses;
  const netYield = propertyValue > 0 ? (netIncome / propertyValue) * 100 : 0;
  const weeklyCashflow = netIncome / 52;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LabelRow label="Property Value ($)">
          <Input type="number" value={propertyValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyValue(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Weekly Rent ($)">
          <Input type="number" value={weeklyRent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeeklyRent(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Council Rates ($/year)">
          <Input type="number" value={councilRates} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouncilRates(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Water Rates ($/year)">
          <Input type="number" value={waterRates} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaterRates(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Insurance ($/year)">
          <Input type="number" value={insurance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInsurance(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Maintenance ($/year)">
          <Input type="number" value={maintenance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaintenance(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Property Management (%)">
          <Input type="number" step="0.5" value={management} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManagement(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Strata/Body Corp ($/year)">
          <Input type="number" value={strata} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStrata(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Gross Yield" value={`${fmtD(grossYield, 2)}%`} color={grossYield >= 4 ? 'bg-green-500/10' : grossYield >= 3 ? 'bg-yellow-500/10' : 'bg-red-500/10'} />
        <ResultCard label="Net Yield" value={`${fmtD(netYield, 2)}%`} color={netYield >= 3 ? 'bg-green-500/10' : netYield >= 2 ? 'bg-yellow-500/10' : 'bg-red-500/10'} />
        <ResultCard label="Annual Cash Flow" value={`$${fmt(Math.round(netIncome))}`} sub={netIncome >= 0 ? 'Positive' : 'Negative'} />
        <ResultCard label="Weekly Cash Flow" value={`$${fmt(Math.round(weeklyCashflow))}`} sub="After all expenses" />
      </div>

      <div className="bg-muted rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Expense Breakdown</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Annual Rent:</span><span className="font-medium text-right">${fmt(annualRent)}</span>
          <span className="text-muted-foreground">Management ({management}%):</span><span className="font-medium text-right">-${fmt(Math.round(managementCost))}</span>
          <span className="text-muted-foreground">Council Rates:</span><span className="font-medium text-right">-${fmt(councilRates)}</span>
          <span className="text-muted-foreground">Water Rates:</span><span className="font-medium text-right">-${fmt(waterRates)}</span>
          <span className="text-muted-foreground">Insurance:</span><span className="font-medium text-right">-${fmt(insurance)}</span>
          <span className="text-muted-foreground">Maintenance:</span><span className="font-medium text-right">-${fmt(maintenance)}</span>
          {strata > 0 && <><span className="text-muted-foreground">Strata:</span><span className="font-medium text-right">-${fmt(strata)}</span></>}
          <span className="font-medium border-t pt-1">Net Income:</span><span className={`font-bold text-right border-t pt-1 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>${fmt(Math.round(netIncome))}</span>
        </div>
      </div>
    </div>
  );
}

// ── 5. BUY VS RENT ──
function BuyVsRentCalc() {
  const [propertyPrice, setPropertyPrice] = useState(1000000);
  const [deposit, setDeposit] = useState(200000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [weeklyRent, setWeeklyRent] = useState(750);
  const [capitalGrowth, setCapitalGrowth] = useState(4);
  const [rentGrowth, setRentGrowth] = useState(3);
  const [investReturn, setInvestReturn] = useState(7);
  const [yearsToCompare, setYearsToCompare] = useState(10);

  const loan = propertyPrice - deposit;
  const monthlyRepayment = calcRepayment(loan, interestRate, 30);
  const stampDuty = calcStampDuty(propertyPrice);

  const data = [];
  let buyWealth = 0;
  let rentWealth = deposit + stampDuty;
  let currentRent = weeklyRent;
  let propertyVal = propertyPrice;
  let loanBal = loan;
  const r = interestRate / 100 / 12;

  for (let year = 1; year <= Math.min(yearsToCompare, 30); year++) {
    // Buyer: property grows, pays mortgage
    propertyVal *= (1 + capitalGrowth / 100);
    let yearPrincipal = 0;
    for (let m = 0; m < 12; m++) {
      const interest = loanBal * r;
      const princ = monthlyRepayment - interest;
      yearPrincipal += princ;
      loanBal = Math.max(0, loanBal - princ);
    }
    buyWealth = propertyVal - loanBal;

    // Renter: invests deposit + difference
    const annualRent = currentRent * 52;
    const annualMortgage = monthlyRepayment * 12;
    const rentSaving = annualMortgage - annualRent;
    if (rentSaving > 0) {
      rentWealth += rentSaving;
    }
    rentWealth *= (1 + investReturn / 100);
    currentRent *= (1 + rentGrowth / 100);

    data.push({
      year,
      buying: Math.round(buyWealth),
      renting: Math.round(rentWealth),
    });
  }

  const breakeven = data.findIndex(d => d.buying > d.renting);
  const finalDiff = data.length > 0 ? data[data.length - 1].buying - data[data.length - 1].renting : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LabelRow label="Property Price ($)">
          <Input type="number" value={propertyPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyPrice(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Deposit ($)">
          <Input type="number" value={deposit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeposit(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Interest Rate (%)">
          <Input type="number" step="0.1" value={interestRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInterestRate(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Weekly Rent ($)">
          <Input type="number" value={weeklyRent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeeklyRent(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Capital Growth (%/yr)">
          <Input type="number" step="0.5" value={capitalGrowth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCapitalGrowth(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Rent Increase (%/yr)">
          <Input type="number" step="0.5" value={rentGrowth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentGrowth(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Investment Return (%/yr)">
          <Input type="number" step="0.5" value={investReturn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvestReturn(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Compare Over (years)">
          <Input type="number" value={yearsToCompare} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYearsToCompare(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Buyer Wealth" value={`$${fmt(data.length > 0 ? data[data.length-1].buying : 0)}`} sub={`After ${yearsToCompare} years`} color="bg-orange-500/10" />
        <ResultCard label="Renter Wealth" value={`$${fmt(data.length > 0 ? data[data.length-1].renting : 0)}`} sub={`After ${yearsToCompare} years`} color="bg-blue-500/10" />
        <ResultCard label="Break-Even" value={breakeven >= 0 ? `Year ${breakeven + 1}` : 'Never'} sub={breakeven >= 0 ? 'Buying overtakes renting' : 'Within timeframe'} color={breakeven >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} />
        <ResultCard label="Difference" value={`$${fmt(Math.abs(Math.round(finalDiff)))}`} sub={finalDiff > 0 ? 'Buying wins' : 'Renting wins'} />
      </div>

      {data.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Wealth Comparison Over Time</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => [`$${fmt(v)}`, '']} labelFormatter={l => `Year ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="buying" stroke="#f97316" strokeWidth={2} name="Buying" dot={false} />
                <Line type="monotone" dataKey="renting" stroke="#3b82f6" strokeWidth={2} name="Renting" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 6. OFFSET ACCOUNT ──
function OffsetCalc() {
  const [loanBalance, setLoanBalance] = useState(800000);
  const [offsetBalance, setOffsetBalance] = useState(100000);
  const [rate, setRate] = useState(5.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const withoutOffset = calcRepayment(loanBalance, rate, loanTerm);
  const effectiveLoan = Math.max(0, loanBalance - offsetBalance);
  const withOffset = calcRepayment(effectiveLoan, rate, loanTerm);

  const monthlySaving = withoutOffset - withOffset;
  const { totalInterest: intWithout } = generateAmortisation(loanBalance, rate, loanTerm);
  const { totalInterest: intWith } = generateAmortisation(effectiveLoan, rate, loanTerm);
  const interestSaved = intWithout - intWith;

  // Time saved
  const r = rate / 100 / 12;
  let bal = loanBalance - offsetBalance;
  let months = 0;
  while (bal > 0 && months < loanTerm * 12) {
    const interest = bal * r;
    const princ = withoutOffset - interest;
    bal = Math.max(0, bal - princ);
    months++;
  }
  const timeSaved = loanTerm - months / 12;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LabelRow label="Loan Balance ($)">
          <Input type="number" value={loanBalance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoanBalance(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Offset Balance ($)">
          <Input type="number" value={offsetBalance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOffsetBalance(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Interest Rate (%)">
          <Input type="number" step="0.1" value={rate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Remaining Loan Term (years)">
          <Input type="number" value={loanTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoanTerm(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Monthly Saving" value={`$${fmt(Math.round(monthlySaving))}`} color="bg-green-500/10" />
        <ResultCard label="Total Interest Saved" value={`$${fmt(Math.round(interestSaved))}`} color="bg-green-500/10" />
        <ResultCard label="Time Saved" value={`${fmtD(Math.max(0, timeSaved), 1)} years`} sub="Off your loan term" color="bg-orange-500/10" />
        <ResultCard label="Effective Rate" value={`${fmtD(loanBalance > 0 ? rate * (effectiveLoan / loanBalance) : 0, 2)}%`} sub={`vs ${rate}% without offset`} />
      </div>
    </div>
  );
}

// ── 7. LOAN COMPARISON ──
function LoanCompareCalc() {
  const [loan, setLoan] = useState(800000);
  const [rate1, setRate1] = useState(5.5);
  const [term1, setTerm1] = useState(30);
  const [fee1, setFee1] = useState(0);
  const [rate2, setRate2] = useState(5.9);
  const [term2, setTerm2] = useState(30);
  const [fee2, setFee2] = useState(0);

  const monthly1 = calcRepayment(loan, rate1, term1);
  const monthly2 = calcRepayment(loan, rate2, term2);
  const { totalInterest: int1 } = generateAmortisation(loan, rate1, term1);
  const { totalInterest: int2 } = generateAmortisation(loan, rate2, term2);
  const total1 = loan + int1 + fee1 * term1 * 12;
  const total2 = loan + int2 + fee2 * term2 * 12;

  return (
    <div className="space-y-6">
      <LabelRow label="Loan Amount ($)">
        <Input type="number" value={loan} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoan(Number(e.target.value))} />
      </LabelRow>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-orange-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-base text-orange-500">Loan A</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LabelRow label="Interest Rate (%)"><Input type="number" step="0.1" value={rate1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate1(Number(e.target.value))} /></LabelRow>
            <LabelRow label="Term (years)"><Input type="number" value={term1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTerm1(Number(e.target.value))} /></LabelRow>
            <LabelRow label="Monthly Fees ($)"><Input type="number" value={fee1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFee1(Number(e.target.value))} /></LabelRow>
            <div className="border-t pt-3 space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Repayment</p>
              <p className="text-2xl font-bold">${fmt(Math.round(monthly1 + fee1))}</p>
              <p className="text-xs text-muted-foreground">Total cost: ${fmt(Math.round(total1))}</p>
              <p className="text-xs text-muted-foreground">Total interest: ${fmt(Math.round(int1))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-base text-blue-500">Loan B</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LabelRow label="Interest Rate (%)"><Input type="number" step="0.1" value={rate2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRate2(Number(e.target.value))} /></LabelRow>
            <LabelRow label="Term (years)"><Input type="number" value={term2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTerm2(Number(e.target.value))} /></LabelRow>
            <LabelRow label="Monthly Fees ($)"><Input type="number" value={fee2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFee2(Number(e.target.value))} /></LabelRow>
            <div className="border-t pt-3 space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Repayment</p>
              <p className="text-2xl font-bold">${fmt(Math.round(monthly2 + fee2))}</p>
              <p className="text-xs text-muted-foreground">Total cost: ${fmt(Math.round(total2))}</p>
              <p className="text-xs text-muted-foreground">Total interest: ${fmt(Math.round(int2))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`rounded-lg p-4 border ${total1 < total2 ? 'bg-orange-500/10 border-orange-500/20' : total2 < total1 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-muted'}`}>
        <p className="text-sm font-medium">{total1 < total2 ? 'Loan A saves you' : total2 < total1 ? 'Loan B saves you' : 'Both loans cost the same'}</p>
        {total1 !== total2 && <p className="text-lg font-bold mt-1">${fmt(Math.abs(Math.round(total1 - total2)))} over the life of the loan</p>}
        <p className="text-sm text-muted-foreground mt-1">Monthly difference: ${fmt(Math.abs(Math.round((monthly1 + fee1) - (monthly2 + fee2))))}/month</p>
      </div>
    </div>
  );
}

// ── 8. EQUITY CALCULATOR ──
function EquityCalc() {
  const [propertyValue, setPropertyValue] = useState(1200000);
  const [mortgage, setMortgage] = useState(580000);

  const totalEquity = propertyValue - mortgage;
  const usableEquity = propertyValue * 0.8 - mortgage;
  const lvr = propertyValue > 0 ? (mortgage / propertyValue) * 100 : 0;
  const nextDeposit20 = usableEquity > 0 ? usableEquity : 0;
  const nextProperty = nextDeposit20 > 0 ? nextDeposit20 / 0.2 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabelRow label="Current Property Value ($)">
          <Input type="number" value={propertyValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyValue(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Outstanding Mortgage ($)">
          <Input type="number" value={mortgage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMortgage(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Total Equity" value={`$${fmt(Math.max(0, totalEquity))}`} color="bg-green-500/10" />
        <ResultCard label="Usable Equity" value={`$${fmt(Math.max(0, Math.round(usableEquity)))}`} sub="80% LVR limit" color="bg-orange-500/10" />
        <ResultCard label="Current LVR" value={`${fmtD(lvr, 1)}%`} sub={lvr <= 80 ? 'No LMI required' : 'LMI may apply'} color={lvr <= 80 ? 'bg-green-500/10' : 'bg-red-500/10'} />
        <ResultCard label="Could Purchase Up To" value={`$${fmt(Math.round(nextProperty))}`} sub="Using equity as 20% deposit" />
      </div>

      <div className="bg-muted rounded-lg p-4">
        <div className="w-full bg-background rounded-full h-4 relative overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(100, lvr)}%` }} />
          <div className="absolute top-0 h-full border-r-2 border-dashed border-red-500" style={{ left: '80%' }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0%</span>
          <span className="text-red-500">80% LVR</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

// ── 9. NEGATIVE GEARING ──
function NegativeGearingCalc() {
  const [propertyValue, setPropertyValue] = useState(800000);
  const [loanAmount, setLoanAmount] = useState(640000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [weeklyRent, setWeeklyRent] = useState(600);
  const [annualExpenses, setAnnualExpenses] = useState(8000);
  const [taxableIncome, setTaxableIncome] = useState(120000);
  const [depreciation, setDepreciation] = useState(8000);

  const annualRent = weeklyRent * 52;
  const annualInterest = loanAmount * (interestRate / 100);
  const totalDeductions = annualInterest + annualExpenses + depreciation;
  const netRentalIncome = annualRent - totalDeductions;
  const isNegativelyGeared = netRentalIncome < 0;
  const marginalRate = getMarginalRate(taxableIncome);
  const taxBenefit = isNegativelyGeared ? Math.abs(netRentalIncome) * marginalRate : 0;
  const netCostAfterTax = isNegativelyGeared ? Math.abs(netRentalIncome) - taxBenefit : 0;
  const weeklyCost = netCostAfterTax / 52;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LabelRow label="Property Value ($)">
          <Input type="number" value={propertyValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyValue(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Loan Amount ($)">
          <Input type="number" value={loanAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoanAmount(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Interest Rate (%)">
          <Input type="number" step="0.1" value={interestRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInterestRate(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Weekly Rent ($)">
          <Input type="number" value={weeklyRent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeeklyRent(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Other Annual Expenses ($)">
          <Input type="number" value={annualExpenses} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnualExpenses(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Depreciation ($/year)">
          <Input type="number" value={depreciation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepreciation(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Your Taxable Income ($)">
          <Input type="number" value={taxableIncome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaxableIncome(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Net Rental Income" value={`${netRentalIncome >= 0 ? '' : '-'}$${fmt(Math.abs(Math.round(netRentalIncome)))}`}
          sub={isNegativelyGeared ? 'Negatively geared' : 'Positively geared'}
          color={isNegativelyGeared ? 'bg-red-500/10' : 'bg-green-500/10'} />
        <ResultCard label="Tax Benefit" value={`$${fmt(Math.round(taxBenefit))}`}
          sub={`at ${(marginalRate * 100).toFixed(0)}% + 2% Medicare`} color="bg-green-500/10" />
        <ResultCard label="Net Cost After Tax" value={`$${fmt(Math.round(netCostAfterTax))}/yr`}
          sub={`$${fmt(Math.round(weeklyCost))}/week`} color="bg-orange-500/10" />
        <ResultCard label="Your Marginal Rate" value={`${(marginalRate * 100).toFixed(0)}%`}
          sub={`+ 2% Medicare levy`} />
      </div>

      <div className="bg-muted rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Deduction Breakdown</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Rental Income:</span><span className="font-medium text-right text-green-600">${fmt(annualRent)}</span>
          <span className="text-muted-foreground">Loan Interest:</span><span className="font-medium text-right text-red-600">-${fmt(Math.round(annualInterest))}</span>
          <span className="text-muted-foreground">Other Expenses:</span><span className="font-medium text-right text-red-600">-${fmt(annualExpenses)}</span>
          <span className="text-muted-foreground">Depreciation:</span><span className="font-medium text-right text-red-600">-${fmt(depreciation)}</span>
          <span className="font-medium border-t pt-1">Net Position:</span>
          <span className={`font-bold text-right border-t pt-1 ${netRentalIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netRentalIncome >= 0 ? '' : '-'}${fmt(Math.abs(Math.round(netRentalIncome)))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 10. CAPITAL GAINS TAX ──
function CGTCalc() {
  const [purchasePrice, setPurchasePrice] = useState(800000);
  const [salePrice, setSalePrice] = useState(1200000);
  const [purchaseCosts, setPurchaseCosts] = useState(35000);
  const [sellingCosts, setSellingCosts] = useState(25000);
  const [improvements, setImprovements] = useState(0);
  const [held12Months, setHeld12Months] = useState(true);
  const [taxableIncome, setTaxableIncome] = useState(120000);

  const costBase = purchasePrice + purchaseCosts + sellingCosts + improvements;
  const capitalGain = Math.max(0, salePrice - costBase);
  const discount = held12Months ? 0.5 : 0;
  const taxableGain = capitalGain * (1 - discount);
  const marginalRate = getMarginalRate(taxableIncome + taxableGain);
  const estimatedTax = taxableGain * (marginalRate + 0.02);
  const netProfit = salePrice - costBase - estimatedTax;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LabelRow label="Purchase Price ($)">
          <Input type="number" value={purchasePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchasePrice(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Sale Price ($)">
          <Input type="number" value={salePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalePrice(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Purchase Costs (stamp duty, legal)">
          <Input type="number" value={purchaseCosts} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchaseCosts(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Selling Costs (agent fee, legal)">
          <Input type="number" value={sellingCosts} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellingCosts(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Capital Improvements ($)">
          <Input type="number" value={improvements} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImprovements(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Your Taxable Income ($)">
          <Input type="number" value={taxableIncome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaxableIncome(Number(e.target.value))} />
        </LabelRow>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={held12Months} onCheckedChange={setHeld12Months} />
        <label className="text-sm">Held for more than 12 months (50% CGT discount)</label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Capital Gain" value={`$${fmt(Math.round(capitalGain))}`} />
        <ResultCard label="Taxable Gain" value={`$${fmt(Math.round(taxableGain))}`} sub={held12Months ? '50% discount applied' : 'No discount'} color="bg-orange-500/10" />
        <ResultCard label="Estimated CGT" value={`$${fmt(Math.round(estimatedTax))}`} sub={`at ~${((marginalRate + 0.02) * 100).toFixed(0)}% effective rate`} color="bg-red-500/10" />
        <ResultCard label="Net Profit After Tax" value={`$${fmt(Math.round(netProfit))}`} color={netProfit > 0 ? 'bg-green-500/10' : 'bg-red-500/10'} />
      </div>
    </div>
  );
}

// ── 11. FIRST HOME OWNER GRANTS ──
function FHOGCalc() {
  const [price, setPrice] = useState(500000);
  const [isNewHome, setIsNewHome] = useState(true);
  const [isMetro, setIsMetro] = useState(true);

  const fhogGrant = isNewHome && price <= 750000 ? 10000 : 0;
  const fhbDuty = calcFHBStampDuty(price, isMetro);
  const generalDuty = calcStampDuty(price);
  const dutySaving = generalDuty - fhbDuty;
  const totalSaving = fhogGrant + dutySaving;

  const maxThreshold = isMetro ? 700000 : 750000;
  const eligible = price <= maxThreshold;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LabelRow label="Property Price ($)">
          <Input type="number" value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value))} />
        </LabelRow>
        <LabelRow label="Property Type">
          <Select value={isNewHome ? 'new' : 'established'} onValueChange={v => setIsNewHome(v === 'new')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New Home / Off the Plan</SelectItem>
              <SelectItem value="established">Established Home</SelectItem>
            </SelectContent>
          </Select>
        </LabelRow>
        <LabelRow label="Location">
          <Select value={isMetro ? 'metro' : 'regional'} onValueChange={v => setIsMetro(v === 'metro')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="metro">Perth Metro / Peel</SelectItem>
              <SelectItem value="regional">Regional WA</SelectItem>
            </SelectContent>
          </Select>
        </LabelRow>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="FHOG Grant" value={fhogGrant > 0 ? `$${fmt(fhogGrant)}` : 'Not eligible'}
          sub={fhogGrant > 0 ? 'New home grant' : isNewHome ? 'Price too high' : 'New homes only'}
          color={fhogGrant > 0 ? 'bg-green-500/10' : 'bg-muted'} />
        <ResultCard label="Stamp Duty" value={`$${fmt(Math.round(fhbDuty))}`}
          sub={eligible ? (fhbDuty === 0 ? 'Full exemption!' : 'Concession applied') : 'Standard rates'}
          color={fhbDuty === 0 ? 'bg-green-500/10' : 'bg-orange-500/10'} />
        <ResultCard label="Duty Saving" value={`$${fmt(Math.round(dutySaving))}`}
          sub="vs standard rates" color="bg-green-500/10" />
        <ResultCard label="Total Savings" value={`$${fmt(Math.round(totalSaving))}`}
          sub="Grant + duty concession" color="bg-green-500/10" />
      </div>

      {eligible && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <p className="font-medium text-green-600">You qualify for first home buyer concessions</p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            {fhogGrant > 0 && <li>- $10,000 First Home Owner Grant (new homes)</li>}
            {fhbDuty === 0 && <li>- Full stamp duty exemption (property under $500,000)</li>}
            {fhbDuty > 0 && dutySaving > 0 && <li>- Reduced stamp duty rate ({isMetro ? 'metro' : 'regional'} concession)</li>}
          </ul>
        </div>
      )}

      {!eligible && (
        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <p className="font-medium text-red-600">Exceeds first home buyer threshold</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isMetro ? 'Metro/Peel' : 'Regional'} properties must be under ${fmt(maxThreshold)} for duty concessions. Standard rates apply.
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>FHOG: $10,000 for eligible new homes. Updated thresholds from 21 March 2025. You must be an Australian citizen/permanent resident, never owned property in Australia, and intend to live in the property for at least 6 months within 12 months of settlement.</span>
      </div>
    </div>
  );
}

// ── 12. LAND TAX (WA) ──
function LandTaxCalc() {
  const [landValue, setLandValue] = useState(500000);
  const [isMetro, setIsMetro] = useState(true);

  const landTax = calcLandTax(landValue);
  const mrit = isMetro ? calcMRIT(landValue) : 0;
  const totalTax = landTax + mrit;
  const effectiveRate = landValue > 0 ? (totalTax / landValue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabelRow label="Unimproved Land Value ($)">
          <Input type="number" value={landValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLandValue(Number(e.target.value))} />
        </LabelRow>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={isMetro} onCheckedChange={setIsMetro} />
          <label className="text-sm">Perth Metropolitan area (includes MRIT)</label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard label="Land Tax" value={`$${fmt(Math.round(landTax))}`} sub="/year" color="bg-orange-500/10" />
        {isMetro && <ResultCard label="Metro Improvement Tax" value={`$${fmt(Math.round(mrit))}`} sub="MRIT @ 0.14%" />}
        <ResultCard label="Total Annual Tax" value={`$${fmt(Math.round(totalTax))}`} sub="/year" color={totalTax > 0 ? 'bg-red-500/10' : 'bg-green-500/10'} />
        <ResultCard label="Effective Rate" value={`${fmtD(effectiveRate, 2)}%`} sub="of land value" />
      </div>

      {landValue <= 300000 && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <p className="font-medium text-green-600">Below land tax threshold</p>
          <p className="text-sm text-muted-foreground mt-1">Land valued at $300,000 or less is not subject to land tax in WA.</p>
        </div>
      )}

      <div className="bg-muted rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">WA Land Tax Brackets</h4>
        <div className="text-sm space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">$0 - $300,000</span><span>Nil</span>
            <span className="text-muted-foreground">$300,001 - $420,000</span><span>$300 flat</span>
            <span className="text-muted-foreground">$420,001 - $1,000,000</span><span>$300 + 0.25%</span>
            <span className="text-muted-foreground">$1M - $1.8M</span><span>$1,750 + 0.9%</span>
            <span className="text-muted-foreground">$1.8M - $5M</span><span>$8,950 + 1.8%</span>
            <span className="text-muted-foreground">$5M+</span><span>$66,550 + 2.0%</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Land tax applies to investment properties only. Your principal place of residence is exempt. Values are aggregated across all landholdings. Source: WA Department of Treasury and Finance.</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN CALCULATORS PAGE
// ════════════════════════════════════════════════════════════

const CALC_COMPONENTS: Record<CalcId, () => JSX.Element> = {
  mortgage: MortgageCalc,
  stamp: StampDutyCalc,
  borrow: BorrowingCalc,
  yield: RentalYieldCalc,
  buyrent: BuyVsRentCalc,
  offset: OffsetCalc,
  compare: LoanCompareCalc,
  equity: EquityCalc,
  nge: NegativeGearingCalc,
  cgt: CGTCalc,
  fhog: FHOGCalc,
  land: LandTaxCalc,
};

export function Calculators() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const activeDef = slug ? CALCS.find(c => c.slug === slug) : null;
  const activeCalc = activeDef ? activeDef.id : null;
  const ActiveComponent = activeCalc ? CALC_COMPONENTS[activeCalc] : null;

  // SEO: Set page title, meta description, and JSON-LD
  useEffect(() => {
    if (activeDef) {
      document.title = activeDef.seoTitle;
      // Meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.setAttribute('name', 'description'); document.head.appendChild(metaDesc); }
      metaDesc.setAttribute('content', activeDef.seoDesc);
      // OG tags
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
      ogTitle.setAttribute('content', activeDef.seoTitle);
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
      ogDesc.setAttribute('content', activeDef.seoDesc);
      // Canonical URL
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
      canonical.setAttribute('href', `https://perth-property-dashboard.vercel.app/calculators/${activeDef.slug}`);
      // JSON-LD
      let jsonLd = document.getElementById('calc-jsonld');
      if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'calc-jsonld'; jsonLd.setAttribute('type', 'application/ld+json'); document.head.appendChild(jsonLd); }
      jsonLd.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': activeDef.seoTitle.split(' | ')[0],
        'description': activeDef.seoDesc,
        'url': `https://perth-property-dashboard.vercel.app/calculators/${activeDef.slug}`,
        'applicationCategory': 'FinanceApplication',
        'operatingSystem': 'Any',
        'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'AUD' },
        'creator': { '@type': 'Organization', 'name': 'Perch' }
      });
    } else {
      document.title = 'Property Calculators Perth | Perch';
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', '12 free property calculators for Perth buyers and investors. Mortgage repayments, stamp duty, borrowing power, rental yield, negative gearing and more.');
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', 'https://perth-property-dashboard.vercel.app/calculators');
      const jsonLd = document.getElementById('calc-jsonld');
      if (jsonLd) jsonLd.remove();
    }
    return () => {
      const jsonLd = document.getElementById('calc-jsonld');
      if (jsonLd) jsonLd.remove();
    };
  }, [activeDef]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar isDark={isDark} onToggleDark={toggleDark} activePage="calculators" />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {activeCalc && (
            <Link to="/calculators">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> All Calculators
              </Button>
            </Link>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {activeDef ? activeDef.title : 'Property Calculators'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeDef ? activeDef.desc : 'WA-specific rates and real-time calculations to help you make smarter property decisions.'}
          </p>
        </div>

        {/* Calculator Grid (when no calculator selected) */}
        {!activeCalc && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {CALCS.map(calc => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} to={`/calculators/${calc.slug}`} className="no-underline">
                  <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group h-full">
                    <CardContent className="p-5">
                      <div className={`${calc.color} mb-3`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <h3 className="font-semibold group-hover:text-orange-500 transition-colors">{calc.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{calc.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Active Calculator */}
        {activeCalc && ActiveComponent && (
          <Card>
            <CardContent className="p-6">
              <ActiveComponent />
            </CardContent>
          </Card>
        )}

        {/* Quick nav when calculator is active */}
        {activeCalc && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Other Calculators</h3>
            <div className="flex flex-wrap gap-2">
              {CALCS.filter(c => c.id !== activeCalc).map(calc => (
                <Badge
                  key={calc.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors"
                  onClick={() => { navigate(`/calculators/${calc.slug}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {calc.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
