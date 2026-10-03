import React from 'react';
import { Pill, Boxes, AlertTriangle, DollarSign } from 'lucide-react';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import StatCard from '../components/ui/StatCard';
import SalesChart from '../components/dashboard/SalesChart';
import CategoryDistributionChart from '../components/dashboard/CategoryDistributionChart';
import InventoryAlerts from '../components/dashboard/InventoryAlerts';
import RecentActivity from '../components/dashboard/RecentActivity';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Primary Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Medicines"
          value="1,428"
          change="+34 items"
          isPositive={true}
          timeframe="vs last month"
          icon={Pill}
          iconBgColor="bg-[#DDF5E9]"
          iconColor="text-[#087F5B]"
        />

        <StatCard
          title="Available Stock"
          value="38,940"
          change="+4.8%"
          isPositive={true}
          timeframe="vs last month"
          icon={Boxes}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Low-Stock Medicines"
          value="14"
          change="Needs Action"
          isPositive={false}
          timeframe="below safety margin"
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />

        <StatCard
          title="Today's Sales"
          value="$4,285.50"
          change="+12.4%"
          isPositive={true}
          timeframe="vs yesterday"
          icon={DollarSign}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryDistributionChart />
        </div>
      </div>

      {/* Inventory Alerts and Critical Actions */}
      <div className="grid grid-cols-1 gap-6">
        <InventoryAlerts />
      </div>

      {/* Recent Activity Table */}
      <div className="grid grid-cols-1 gap-6">
        <RecentActivity />
      </div>
    </div>
  );
};

export default DashboardPage;
