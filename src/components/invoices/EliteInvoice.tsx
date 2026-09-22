import React, { forwardRef } from 'react';
import { Job } from '../../types';

interface InvoiceProps {
  job: Job;
  currencySymbol?: string;
  garageName: string;
  documentType?: 'INVOICE' | 'ESTIMATE';
}

export const EliteInvoice = forwardRef<HTMLDivElement, InvoiceProps>(
  ({ job, currencySymbol = 'FCFA', garageName, documentType = 'INVOICE' }, ref) => {
    const laborFee = typeof job.laborFeeFcfa === 'number' ? job.laborFeeFcfa : 0;
    const partsFee = job.partsFeeFcfa || 0;
    const total = laborFee + partsFee;

    const formatTechName = () => {
      const name = job.mechanic?.full_name || job.assigned_to || 'Unassigned';
      return name.length > 20 ? 'Unknown Tech' : name;
    };

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div ref={ref} className="p-10 max-w-4xl mx-auto bg-white text-slate-800 font-sans print:w-full print:mx-0">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              {documentType === 'ESTIMATE' ? 'ADDITIONAL WORK ESTIMATE' : 'INVOICE'}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Ref: {job.id.substring(0, 8).toUpperCase()}</p>
            <p className="text-sm font-medium text-slate-500">Date: {formattedDate}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-emerald-700">{garageName}</h2>
            <p className="text-sm text-slate-600 mt-1">Douala / Yaoundé</p>
            <p className="text-sm text-slate-600">contact@motologa.cm</p>
          </div>
        </div>

        {/* Customer & Vehicle Details in Two Columns */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-2">
              Customer Details
            </h3>
            <p className="font-semibold text-slate-800">{job.customerName || 'Walk-in Client'}</p>
            <p className="text-sm text-slate-600 mt-1">Phone: {job.customerPhone}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-2">
              Vehicle Details
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600">
              <span className="font-medium">Model:</span>
              <span className="font-semibold text-slate-800">{job.vehicleModel}</span>
              <span className="font-medium">License Plate:</span>
              <span className="font-semibold text-slate-800">{job.licensePlate}</span>
            </div>
          </div>
        </div>

        {/* Breakdown Tables */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Service & Parts Breakdown</h3>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                <th className="p-3 font-semibold rounded-tl-lg">Description</th>
                <th className="p-3 font-semibold text-right">Details</th>
                <th className="p-3 font-semibold text-right rounded-tr-lg">Amount ({currencySymbol})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {partsFee > 0 && (
                <tr className="group">
                  <td className="p-4 bg-white font-medium text-slate-800">
                    Spare Parts Supplied
                  </td>
                  <td className="p-4 bg-white text-slate-600 text-right">
                    Source: {job.partSource}
                  </td>
                  <td className="p-4 bg-white font-mono text-slate-900 text-right">
                    {partsFee.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="group">
                <td className="p-4 bg-white font-medium text-slate-800">
                  {job.diagnosticNotes || job.issueDescription || 'Labor & Services'}
                </td>
                <td className="p-4 bg-white text-slate-600 text-right">
                  Assigned Tech: {formatTechName()}
                </td>
                <td className="p-4 bg-white font-mono text-slate-900 text-right">
                  {laborFee.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end gap-x-12 px-4 mb-4">
          <div className="w-1/2 space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">{total.toLocaleString()}</span>
            </div>
            {documentType !== 'ESTIMATE' && (
              <div className="flex justify-between text-slate-600 pb-3 border-b border-slate-200">
                <span>Advance Deposit</span>
                <span className="font-mono">0</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xl font-black text-emerald-800 pt-2 border-t border-slate-200">
              <span>{documentType === 'ESTIMATE' ? 'ESTIMATED TOTAL' : 'Remaining Balance'}</span>
              <span className="font-mono">{total.toLocaleString()} {currencySymbol}</span>
            </div>
          </div>
        </div>

        {documentType === 'ESTIMATE' && (
          <div className="mb-10 mx-4 border-2 border-rose-500 rounded-lg p-6 bg-rose-50">
            <p className="font-black text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="text-xl">!</span> ACTION REQUIRED
            </p>
            <p className="font-bold text-rose-900 text-sm">Please review the additional findings above. Reply <strong>'APPROVED'</strong> via WhatsApp to authorize the workshop to proceed with these repairs.</p>
          </div>
        )}

        {/* Photographic Evidence Section */}
        {(job.oldPartPhotoUrl || job.newPartPhotoUrl || job.generalJobPhotoUrl) && (
          <div className={`mb-10 print:break-inside-avoid border-t border-slate-200 pt-8 ${documentType !== 'ESTIMATE' ? 'mt-12' : 'mt-4'}`}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Photographic Evidence / Preuves Photographiques
            </h3>
            <div className="grid grid-cols-3 gap-6">
              {job.oldPartPhotoUrl && (
                <div className="flex flex-col gap-2 print:break-inside-avoid text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <img src={job.oldPartPhotoUrl} alt="Old Part Evidence" className="w-full h-32 object-cover rounded-md shadow-sm" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">Old Part</span>
                </div>
              )}
              {job.newPartPhotoUrl && (
                <div className="flex flex-col gap-2 print:break-inside-avoid text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <img src={job.newPartPhotoUrl} alt="New Part Evidence" className="w-full h-32 object-cover rounded-md shadow-sm" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">New Part</span>
                </div>
              )}
              {job.generalJobPhotoUrl && (
                <div className="flex flex-col gap-2 print:break-inside-avoid text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <img src={job.generalJobPhotoUrl} alt="General Job Evidence" className="w-full h-32 object-cover rounded-md shadow-sm" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">General</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer & Signatures */}
        <div className="grid grid-cols-2 gap-16 mt-16 pt-10 border-t border-slate-200">
          <div className="text-center">
            <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-slate-700">Authorised Signature</p>
            <p className="text-xs text-slate-500">MOTOLOGA GARAGE</p>
          </div>
          {documentType !== 'ESTIMATE' && (
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-slate-700">Customer Signature</p>
              <p className="text-xs text-slate-500">Upon reception of vehicle</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
EliteInvoice.displayName = 'EliteInvoice';
