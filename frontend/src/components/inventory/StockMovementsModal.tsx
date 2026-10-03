import React, { useState, useEffect } from 'react';
import { X, History, ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Medicine, StockMovement } from '../../types';
import { apiService } from '../../services/api';
import Badge from '../ui/Badge';

interface StockMovementsModalProps {
  medicine: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockMovementsModal: React.FC<StockMovementsModalProps> = ({
  medicine,
  isOpen,
  onClose,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && medicine) {
      setIsLoading(true);
      apiService
        .getStockMovements(medicine.id, 50)
        .then((data) => setMovements(data))
        .catch(() => setMovements([]))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, medicine]);

  if (!isOpen || !medicine) return null;

  const getMovementBadge = (type: StockMovement['movementType']) => {
    switch (type) {
      case 'Stock Added':
        return (
          <Badge variant="success" className="gap-1">
            <ArrowDownLeft className="w-3 h-3 text-[#087F5B]" />
            <span>Stock Added</span>
          </Badge>
        );
      case 'Stock Removed':
        return (
          <Badge variant="critical" className="gap-1">
            <ArrowUpRight className="w-3 h-3 text-red-600" />
            <span>Stock Removed</span>
          </Badge>
        );
      case 'Adjustment':
        return (
          <Badge variant="warning" className="gap-1">
            <RotateCcw className="w-3 h-3 text-amber-700" />
            <span>Adjustment</span>
          </Badge>
        );
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Stock Movement Audit Trail
              </h3>
              <p className="text-xs text-pharmacy-text-muted mt-0.5">
                {medicine.name} • Total Usable Stock: {medicine.usableStock} {medicine.unit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading audit log...</div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">
              No stock movements recorded for this medicine yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Reason / Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-3 text-gray-500 font-medium">
                      {formatDate(mov.createdAt)}
                    </td>
                    <td className="py-3 px-3">
                      {getMovementBadge(mov.movementType)}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-gray-800">
                      {mov.batchNumber}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono">
                      <span
                        className={
                          mov.quantity > 0
                            ? 'text-[#087F5B]'
                            : mov.quantity < 0
                            ? 'text-red-600'
                            : 'text-gray-700'
                        }
                      >
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} {medicine.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 truncate max-w-xs">
                      {mov.reason || 'Standard transaction'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockMovementsModal;
