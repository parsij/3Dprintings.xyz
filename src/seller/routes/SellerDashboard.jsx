import { useEffect, useState } from "react";
import SellerDashboardTopMetricsRow from "../components/SellerDashboardTopMetricsRow.jsx";
import SellerDashboardSalesLineChart from "../components/SellerDashboardSalesLineChart.jsx";
import SellerDashboardTopSellingProducts from "../components/SellerDashboardTopSellingProducts.jsx";
import SellerDashboardAverageScore from "../components/SellerDashboardAverageScore.jsx";
import SellerDashboardRevenueBarChart from "../components/SellerDashboardRevenueBarChart.jsx";
import { getSellerDashboard } from "../services/sellerDashboardService.js";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";

export default function SellerDashboard() {
  const [metrics, setMetrics] = useState([
    { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
    { title: "Total reviews", value: "0", subtext: "No change month over month" },
    { title: "All time sales", value: "0", subtext: "No change month over month" },
  ]);
  const [salesData, setSalesData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [averageScore, setAverageScore] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const data = await getSellerDashboard();
        if (cancelled) return;
        setMetrics(Array.isArray(data.metrics) ? data.metrics : []);
        setSalesData(Array.isArray(data.salesData) ? data.salesData : []);
        setTopProductsData(Array.isArray(data.products) ? data.products : []);
        setRevenueData(Array.isArray(data.revenueData) ? data.revenueData : []);
        setAverageScore(Number(data.averageScore || 0));
      } catch (err) {
        if (cancelled) return;
        setDashboardError(err?.response?.data?.message || "Failed to load seller dashboard.");
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={"mt-20 mx-5 md:mx-7.5 lg:mx-10"}>
      <SellerNavBar pageName={"Dashboard"}/>
      <SideMenu role={"seller"} title={"Seller Options"}/>
      {dashboardError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dashboardError}</div>
      ) : null}

      {dashboardLoading ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">Loading dashboard...</div>
      ) : null}

      <SellerDashboardTopMetricsRow metrics={metrics.length ? metrics : [
        { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
        { title: "Total reviews", value: "0", subtext: "No change month over month" },
        { title: "All time sales", value: "0", subtext: "No change month over month" },
      ]} />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SellerDashboardSalesLineChart data={salesData.length ? salesData : [{ day: "N/A", sales: 0 }]} />
        </div>
        <div className="lg:col-span-1">
          <SellerDashboardTopSellingProducts products={topProductsData} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SellerDashboardAverageScore score={averageScore} />
        </div>
        <div className="lg:col-span-2">
          <SellerDashboardRevenueBarChart data={revenueData.length ? revenueData : [{ month: "N/A", revenue: 0 }]} />
        </div>
      </div>
    </section>
  );
}