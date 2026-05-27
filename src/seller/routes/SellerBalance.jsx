import { useEffect, useState } from "react";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";
import {
  cashOutSellerBalance,
  getSellerBalance,
  getSellerRecurringPayout,
  updateSellerRecurringPayout,
} from "../services/sellerPortalService.js";

export default function SellerBalance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [schedule, setSchedule] = useState({
    enabled: false,
    payoutType: "full",
    dayOfMonth: 1,
    customAmountCents: "",
  });

  const loadBalance = async () => {
    setLoading(true);
    setError("");
    try {
      const [balanceData, scheduleData] = await Promise.all([
        getSellerBalance(),
        getSellerRecurringPayout(),
      ]);
      setBalance({
        available: Number(balanceData.available || 0),
        pending: Number(balanceData.pending || 0),
      });
      setSchedule({
        enabled: Boolean(scheduleData.payoutSchedule?.enabled),
        payoutType: scheduleData.payoutSchedule?.payoutType || "full",
        dayOfMonth: scheduleData.payoutSchedule?.dayOfMonth || 1,
        customAmountCents: scheduleData.payoutSchedule?.customAmountCents
          ? String(scheduleData.payoutSchedule.customAmountCents / 100)
          : "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load balance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleCashout = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = cashoutAmount.trim() ? { amount: Number(cashoutAmount) } : {};
      const result = await cashOutSellerBalance(payload);
      setMessage(result.message || "Cash out initiated.");
      setCashoutAmount("");
      await loadBalance();
    } catch (err) {
      setError(err?.response?.data?.message || "Cash out failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await updateSellerRecurringPayout({
        enabled: schedule.enabled,
        payoutType: schedule.payoutType,
        dayOfMonth: Number(schedule.dayOfMonth),
        customAmountCents: schedule.payoutType === "custom"
          ? Math.round(Number(schedule.customAmountCents || 0) * 100)
          : null,
      });
      setMessage(result.message || "Recurring payout saved.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save recurring payout.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <SellerNavBar pageName="Balance" />
      <SideMenu title="Seller Menu" role="seller" />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-28">
        {loading ? (
          <p className="text-gray-600">Loading balance...</p>
        ) : (
          <>
            <p className="text-6xl font-black text-black">${balance.available.toFixed(2)}</p>
            <p className="mt-2 text-sm text-gray-600">Available balance · Pending ${balance.pending.toFixed(2)}</p>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}

            <section className="mt-8 rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold text-gray-900">Cash out</h2>
              <p className="mt-1 text-sm text-gray-600">Leave blank to cash out your full available balance.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cashoutAmount}
                  onChange={(event) => setCashoutAmount(event.target.value)}
                  placeholder="Custom amount (optional)"
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3"
                />
                <button
                  type="button"
                  onClick={handleCashout}
                  disabled={saving}
                  className="rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  Cash out
                </button>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold text-gray-900">Recurring payout</h2>
              <p className="mt-1 text-sm text-gray-600">
                On a specific day each month, send full balance, half balance, or a custom amount to your bank account.
              </p>
              <form className="mt-4 space-y-4" onSubmit={handleScheduleSave}>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(event) => setSchedule((prev) => ({ ...prev, enabled: event.target.checked }))}
                  />
                  Enable recurring payout
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={schedule.payoutType}
                    onChange={(event) => setSchedule((prev) => ({ ...prev, payoutType: event.target.value }))}
                    className="rounded-xl border border-gray-300 px-4 py-3"
                  >
                    <option value="full">Full balance</option>
                    <option value="half">Half balance</option>
                    <option value="custom">Custom amount</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={schedule.dayOfMonth}
                    onChange={(event) => setSchedule((prev) => ({ ...prev, dayOfMonth: event.target.value }))}
                    className="rounded-xl border border-gray-300 px-4 py-3"
                    placeholder="Day of month (1-28)"
                  />
                </div>
                {schedule.payoutType === "custom" ? (
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={schedule.customAmountCents}
                    onChange={(event) => setSchedule((prev) => ({ ...prev, customAmountCents: event.target.value }))}
                    placeholder="Custom payout amount (USD)"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                ) : null}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400 disabled:opacity-60"
                >
                  Save recurring payout
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
