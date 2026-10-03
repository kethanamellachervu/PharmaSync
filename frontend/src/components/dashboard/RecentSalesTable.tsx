import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SaleRecord } from '../../types';

interface RecentSalesTableProps {
  sales: SaleRecord[];
}

export const RecentSalesTable: React.FC<RecentSalesTableProps> = ({ sales }) => {
  const formatSaleDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-subtle flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 text-[#087F5B]">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Recent Sales
            </h3>
            <p className="text-xs text-pharmacy-text-muted">
              Latest transactions recorded at the counter
            </p>
          </div>
        </div>

        <Link
          to="/sales"
          className="text-xs font-semibold text-[#087F5B] hover:underline flex items-center gap-1"
        >
          <span>Record New Sale</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="pt-2 flex-1 overflow-x-auto">
        {sales.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No sales recorded yet today.
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[480px]">
            <thead>
              <tr className="text-gray-400 font-medium border-b border-gray-100">
                <th className="py-2.5 px-2">Medicine</th>
                <th className="py-2.5 px-2 text-center">Quantity</th>
                <th className="py-2.5 px-2 text-right">Amount</th>
                <th className="py-2.5 px-2 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-2">
                    <p className="font-semibold text-gray-800">{sale.medicineName}</p>
                    {sale.batchesDeducted && sale.batchesDeducted.length > 0 && (
                      <p className="text-[10px] text-gray-400">
                        Batch: {sale.batchesDeducted.map((b) => b.batchNumber).join(', ')} (FEFO)
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-medium text-gray-700">
                    {sale.quantity} units
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-[#087F5B] font-mono">
                    ₹{sale.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-500 text-[11px]">
                    {formatSaleDate(sale.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex justify-end">
        <Link
          to="/sales"
          className="text-xs font-semibold text-[#087F5B] hover:text-[#066347] flex items-center gap-1 transition-colors"
        >
          <span>View all sales history</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default RecentSalesTable;
