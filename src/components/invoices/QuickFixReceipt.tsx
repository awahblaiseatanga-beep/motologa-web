import React, { forwardRef } from 'react';
import { Job } from '../../types';

interface InvoiceProps {
  job: Job;
  currencySymbol?: string;
  garageName: string;
  documentType?: 'INVOICE' | 'ESTIMATE';
  customDescription?: string;
  customImage?: string;
}

export const QuickFixReceipt = forwardRef<HTMLDivElement, InvoiceProps>(
  ({ job, currencySymbol = 'FCFA', garageName, documentType = 'INVOICE', customDescription, customImage }, ref) => {
    const laborFee = typeof job.laborFeeFcfa === 'number' ? job.laborFeeFcfa : 0;
    const partsFee = job.partsFeeFcfa || 0;
    const total = laborFee + partsFee;

    const formatSenderName = () => {
      if (documentType === 'ESTIMATE') {
        return 'Head of Department';
      }
      return 'Garage Owner';
    };

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div ref={ref} className="p-6 max-w-sm mx-auto bg-white text-black font-mono text-xs leading-loose print:w-full print:mx-0">
        <div className="text-center mb-6">
          <h1 className="text-xl font-black uppercase mb-1">{garageName}</h1>
          <p className="text-[10px] uppercase text-gray-600">
            {documentType === 'ESTIMATE' ? 'ADDITIONAL WORK ESTIMATE' : 'Official Workshop Receipt'}
          </p>
          <div className="border-b-2 border-dashed border-gray-300 my-4" />
        </div>

        <div className="space-y-1 mb-6">
          <p><span className="font-bold">Date:</span> {formattedDate}</p>
          <p><span className="font-bold">Job ID:</span> {job.id.substring(0, 8).toUpperCase()}</p>
          <p><span className="font-bold">Vehicle:</span> {job.vehicleModel}</p>
          <p><span className="font-bold">Plate:</span> {job.licensePlate}</p>
          <p><span className="font-bold">Customer:</span> {job.customerName || 'Walk-in'} ({job.customerPhone})</p>
        </div>

        <div className="border-b-2 border-dashed border-gray-300 my-4" />

        <div className="mb-6 space-y-3">
          <div className="flex justify-between font-bold">
            <span>Description</span>
            <span>Subtotal</span>
          </div>
          {partsFee > 0 && (
            <div className="flex justify-between items-start">
              <span>Spare Parts ({job.partSource})</span>
              <span>{partsFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-start">
            <span className="max-w-[70%]">{customDescription || job.diagnosticNotes || job.issueDescription || 'Labor & Services'} (Auth: {formatSenderName()})</span>
            <span>{laborFee.toLocaleString()}</span>
          </div>
        </div>

        <div className="border-b-2 border-dashed border-gray-300 my-4" />

        <div className="flex justify-between items-center text-lg font-black mb-1">
          <span>{documentType === 'ESTIMATE' ? 'EST. TOTAL' : 'TOTAL'}:</span>
          <span>
            {total.toLocaleString()} {currencySymbol}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm font-bold pt-1 mb-8">
          <span>{documentType === 'ESTIMATE' ? 'ESTIMATED BALANCE' : 'BALANCE'}:</span>
          <span>
            {total.toLocaleString()} {currencySymbol}
          </span>
        </div>

        {documentType === 'ESTIMATE' && (
          <div className="mb-6 border-2 border-dashed border-black p-3 text-center">
            <p className="font-black uppercase tracking-wider mb-2">⚠ ACTION REQUIRED</p>
            <p className="font-bold">Please review the additional findings above. Reply 'APPROVED' via WhatsApp to authorize the workshop to proceed with these repairs.</p>
          </div>
        )}

        <div className="text-center text-[10px] space-y-1">
          <p>Thank you for your business!</p>
          <p>Powered by MOTOLOGA</p>
        </div>
      </div>

    );
  }
);
QuickFixReceipt.displayName = 'QuickFixReceipt';
