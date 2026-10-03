import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Medicine } from '../../types';

interface DeleteConfirmDialogProps {
  medicine: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  medicine,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !medicine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-full bg-red-100 text-red-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Delete Medicine from Inventory?
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-gray-800">{medicine.name}</strong>? This action
              will permanently remove all{' '}
              <strong className="text-gray-800">{medicine.batches.length} associated batch(es)</strong>{' '}
              and stock records from your inventory.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Medicine'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
