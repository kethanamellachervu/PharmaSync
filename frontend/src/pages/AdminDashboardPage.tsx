import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Info,
  RefreshCw,
  MessageSquare,
  Building2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { apiService } from '../services/api';
import { PurchaseRequest, ProcurementSummary } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_ADMIN_APPROVAL');

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, sumData] = await Promise.all([
        apiService.getPurchaseRequests({ status: statusFilter === 'ALL' ? undefined : statusFilter }),
        apiService.getProcurementSummary(),
      ]);
      setRequests(reqData);
      setSummary(sumData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await apiService.approvePurchaseRequest(id, 'Admin (Store Manager)');
      setSuccessMsg(`Approved request for ${res.request.medicineName}. AI supplier order initiated!`);
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve purchase request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest || !rejectionReason.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);
    try {
      await apiService.rejectPurchaseRequest(rejectingRequest.id, rejectionReason);
      setSuccessMsg(`Rejected request for ${rejectingRequest.medicineName}.`);
      setRejectingRequest(null);
      setRejectionReason('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject purchase request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN_APPROVAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case 'ORDER_SENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1">
            <Send className="w-3.5 h-3.5 text-blue-600" /> Order Sent to Supplier
          </span>
        );
      case 'SUPPLIER_RESPONDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 border border-purple-200 text-purple-700 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" /> Supplier Responded
          </span>
        );
      case 'ORDER_CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Order Confirmed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Executive Portal
              </span>
              <span className="text-xs text-slate-400">PharmaSync Procurement Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Review and approve stock purchase requests generated by AI demand forecasting before orders are dispatched to suppliers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center gap-2 backdrop-blur-xs border border-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/supplier-messages')}
              className="px-4 py-2.5 rounded-xl bg-[#087F5B] hover:bg-[#06684a] text-white text-sm font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Supplier Messaging
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.pendingAdminApprovalCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Stock requests awaiting admin decision</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders Dispatched</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{summary?.ordersSentCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active AI supplier communications</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders Confirmed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary?.ordersConfirmedCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Ready for physical stock inwarding</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Section Header & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Stock Purchase Requests
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review low stock reorder recommendations generated by PharmaSync demand calculations.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-medium self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('PENDING_ADMIN_APPROVAL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'PENDING_ADMIN_APPROVAL'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Approval ({summary?.pendingAdminApprovalCount ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('ORDER_CONFIRMED')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'ORDER_CONFIRMED'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Requests
            </button>
          </div>
        </div>

        {/* Requests Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading purchase requests...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No requests found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              There are no purchase requests matching your current status filter ({statusFilter}).
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Info Block */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {req.requestNumber}
                    </span>
                    {getPriorityBadge(req.priority)}
                    {getStatusBadge(req.status)}
                    <span className="text-xs text-gray-400">
                      • {new Date(req.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 hover:text-[#087F5B] cursor-pointer" onClick={() => setSelectedRequest(req)}>
                      {req.medicineName}
                    </h3>
                    <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" /> Supplier: <span className="font-semibold text-gray-800">{req.supplierName}</span>
                    </p>
                  </div>

                  {/* Stock Metrics summary line */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-2.5 rounded-lg text-xs max-w-2xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Current Stock</span>
                      <span className="font-bold text-gray-800">{req.currentStock} units</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Forecast Demand</span>
                      <span className="font-bold text-gray-800">{req.forecastDemand} units</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Recommended Reorder</span>
                      <span className="font-bold text-[#087F5B]">{req.recommendedQuantity} units</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Est. Delivery</span>
                      <span className="font-medium text-gray-700">{req.expectedDelivery || 'Pending Supplier'}</span>
                    </div>
                  </div>

                  {/* Recommendation Reason */}
                  <p className="text-xs text-gray-600 italic">
                    <span className="font-semibold not-italic text-gray-700">Reason:</span> {req.reason}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Info className="w-4 h-4 text-blue-600" />
                    Forecast Details
                  </button>

                  {req.status === 'PENDING_ADMIN_APPROVAL' && (
                    <>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-[#087F5B] hover:bg-[#06684a] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>

                      <button
                        onClick={() => setRejectingRequest(req)}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}

                  {(req.status === 'ORDER_SENT' || req.status === 'SUPPLIER_RESPONDED' || req.status === 'ORDER_CONFIRMED') && (
                    <button
                      onClick={() => navigate('/supplier-messages')}
                      className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      View Conversation
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FORECAST EXPLANATION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#087F5B]" />
                <h3 className="text-lg font-bold text-gray-900">Forecasting Breakdown</h3>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Medicine</span>
              <p className="text-base font-bold text-gray-900">{selectedRequest.medicineName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Supplier: {selectedRequest.supplierName}</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-sm leading-relaxed">
              <p className="font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" /> Why PharmaSync recommends this purchase:
              </p>
              <p>{selectedRequest.forecastExplanation || selectedRequest.reason}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <div>
                <span className="text-[11px] text-gray-400 block font-medium uppercase">Current Stock</span>
                <span className="text-base font-bold text-gray-800">{selectedRequest.currentStock} units</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium uppercase">Forecast Demand</span>
                <span className="text-base font-bold text-gray-800">{selectedRequest.forecastDemand} units</span>
              </div>
              <div>
                <span className="text-[11px] text-[#087F5B] block font-medium uppercase">Recommended</span>
                <span className="text-base font-bold text-[#087F5B]">{selectedRequest.recommendedQuantity} units</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
              >
                Close
              </button>
              {selectedRequest.status === 'PENDING_ADMIN_APPROVAL' && (
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#087F5B] hover:bg-[#06684a] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-rose-700 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Purchase Request
              </h3>
              <button type="button" onClick={() => setRejectingRequest(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Rejecting reorder request for <span className="font-bold text-gray-800">{rejectingRequest.medicineName}</span> ({rejectingRequest.recommendedQuantity} units).
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Short Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Stock baseline exceeds current store requirement or alternate vendor selected."
                className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
