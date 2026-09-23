import React, { forwardRef } from 'react';
import { Job } from '../../types';

interface InvoiceProps {
  job: Job;
  currencySymbol?: string;
  garageName: string;
  departmentName?: string;
  documentType?: 'INVOICE' | 'ESTIMATE';
  customDescription?: string;
  customImage?: string;
  shopSettings?: any;
}

export const EliteInvoiceV2 = forwardRef<HTMLDivElement, InvoiceProps>(
  (
    { job, currencySymbol = 'FCFA', garageName, departmentName, documentType = 'INVOICE', customDescription, customImage, shopSettings },
    ref
  ) => {
    const laborFee = typeof job.laborFeeFcfa === 'number' ? job.laborFeeFcfa : 0;
    const partsFee = job.partsFeeFcfa || 0;
    const total = laborFee + partsFee;

    const brandColor = job.garageInfo?.brandColor || '#1e3a8a';
    const invoiceMessage = job.garageInfo?.invoiceMessage || 'Quality service. Reliable repairs. Happier journeys.';
    const watermarkUrl = job.garageInfo?.watermarkUrl;

    const formatSenderName = () => {
      if (documentType === 'ESTIMATE') {
        return 'Head of Department';
      }
      return 'Technician';
    };

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const isValidUrl = (url?: string | null) => url && typeof url === 'string' && url.trim() !== '' && url !== 'undefined' && url !== 'null';

    const generalPhotos = [
      { url: job.exteriorPhotoUrl, label: 'Vehicle Condition (Exterior)' },
      { url: job.dashboardPhotoUrl, label: 'Dashboard / Mileage' },
      { url: job.generalJobPhotoUrl, label: 'General check & service' }
    ].filter(photo => isValidUrl(photo.url));

    const partsPhotos = {
      old: isValidUrl(job.oldPartPhotoUrl) ? job.oldPartPhotoUrl : null,
      new: isValidUrl(job.newPartPhotoUrl) ? job.newPartPhotoUrl : null
    };
    const hasPartsPhotos = Boolean(partsPhotos.old || partsPhotos.new);

    return (
      <div
        ref={ref}
        className="relative w-[210mm] min-h-[297mm] mx-auto bg-white text-black font-sans shadow-lg overflow-hidden shrink-0 print:w-full print:shadow-none print:m-0"
      >
        {/* WATERMARK ABSOLUTE LAYER */}
        {watermarkUrl && (
          <div
            className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-center bg-no-repeat bg-contain"
            style={{
              backgroundImage: `url('${watermarkUrl}')`,
              margin: 'auto',
              width: '50%',
              height: '50%',
            }}
          />
        )}

        {/* CONTENT LAYER */}
        <div className="relative z-10 flex flex-col min-h-full">
          {/* HEADER SECTION (3 Columns) */}
          <div className="flex items-start justify-between p-8 border-b border-gray-200">
            {/* Logo Box */}
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 rounded">
              {(shopSettings?.logo_url || watermarkUrl) ? (
                <img src={shopSettings?.logo_url || watermarkUrl || '/default-logo.png'} alt="Garage Logo" className="w-24 h-24 object-contain" />
              ) : (
                <>
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[10px] uppercase font-bold text-center px-2">Your Garage Logo Here</span>
                </>
              )}
            </div>

            {/* Garage Details (Center) */}
            <div className="flex-1 px-8 space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: brandColor }}>
                {shopSettings?.shop_name || job.garageInfo?.name || garageName || 'MOTOLOGA GARAGE'}
              </h1>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
                Service • Repair • Maintenance
              </p>

              <div className="text-xs text-gray-600 space-y-1.5 flex flex-col font-medium">
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {shopSettings?.shop_address || job.garageInfo?.location || 'Location not set'}
                </span>
                {(job.garageInfo?.phone || job.garageInfo?.ownerPhone) && (
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    {job.garageInfo?.phone || job.garageInfo?.ownerPhone}
                  </span>
                )}
                {(job.garageInfo?.email || job.garageInfo?.ownerEmail) && (
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    {job.garageInfo?.email || job.garageInfo?.ownerEmail}
                  </span>
                )}
              </div>
            </div>

            {/* Minimal Info (Right) */}
            <div className="w-64 border-l border-gray-200 pl-6 text-[11px] space-y-3 font-semibold text-gray-700 flex flex-col justify-end">
              <div className="flex justify-between items-center text-gray-500">
                <span>Date Created</span>
                <span>: {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* TITLE & INVOICE DETAILS ROW */}
          <div className="px-8 py-8 flex justify-between items-start">
            <div>
              <h2 className="text-[40px] leading-none font-black uppercase tracking-tight" style={{ color: brandColor }}>
                {documentType === 'ESTIMATE' ? 'ESTIMATE' : 'INVOICE'}
              </h2>
              <p className="text-[13px] font-bold text-gray-700 tracking-wider uppercase mt-2 mb-1">
                Vehicle Service & Repair
              </p>
              <p className="text-xs text-gray-500 italic">
                {invoiceMessage}
              </p>
            </div>
            
            <div className="w-64 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-[11px] font-semibold text-gray-700 space-y-2.5">
              <div className="flex justify-between items-center">
                <span>Invoice No.</span>
                <span className="font-bold">: INV-{job.id.substring(0,6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Job No.</span>
                <span>: JOB-{job.id.substring(6,12).toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Date</span>
                <span>: {formattedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Due Date</span>
                <span>: {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* INFO GRID (Customer / Vehicle) */}
          <div className="px-8 grid grid-cols-2 gap-6 mb-8">
            {/* Customer Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-black text-gray-800">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                Customer Information
              </div>
              <div className="p-4 text-[11px] space-y-3 font-semibold text-gray-600">
                <div className="flex items-baseline">
                  <span className="w-20">Name</span>
                  <span className="mr-2">:</span>
                  <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">{job.customerName || (job as any).customer_name || 'Walk-in'}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-20">Phone</span>
                  <span className="mr-2">:</span>
                  <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">{job.customerPhone}</span>
                </div>
                {(job as any).customerEmail && (
                  <div className="flex items-baseline">
                    <span className="w-20">Email</span>
                    <span className="mr-2">:</span>
                    <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">{(job as any).customerEmail}</span>
                  </div>
                )}
                {(job as any).customerAddress && (
                  <div className="flex items-baseline">
                    <span className="w-20">Address</span>
                    <span className="mr-2">:</span>
                    <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">{(job as any).customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-black text-gray-800">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd"/></svg>
                Vehicle Information
              </div>
              <div className="p-4 text-[11px] space-y-3 font-semibold text-gray-600">
                <div className="flex items-baseline">
                  <span className="w-28">Make / Model</span>
                  <span className="mr-2">:</span>
                  <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">{job.vehicleModel}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-28">Plate Number</span>
                  <span className="mr-2">:</span>
                  <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">{job.licensePlate}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-28">Mileage</span>
                  <span className="mr-2">:</span>
                  <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5 text-right">km</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLES */}
          <div className="px-8 space-y-6 mb-8 flex-1">
            {/* Labour Table */}
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 text-white font-black text-sm" style={{ backgroundColor: brandColor }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/></svg>
                Labour / Services
              </div>
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#f0f4f8] text-gray-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-4 w-10 text-center">#</th>
                    <th className="py-2.5 px-4">Description of Service</th>
                    <th className="py-2.5 px-4 text-center w-24">Qty / Hours</th>
                    <th className="py-2.5 px-4 text-right">Unit Price ({currencySymbol})</th>
                    <th className="py-2.5 px-4 text-right w-32 border-l border-gray-200 bg-[#e7eff6]">Total ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="font-medium text-gray-700 divide-y divide-gray-100">
                  <tr className="border-b-2 border-gray-200">
                    <td className="py-3 px-4 text-center">1</td>
                    <td className="py-3 px-4 font-bold text-gray-900 border-x border-gray-100 whitespace-pre-wrap text-[13px] leading-relaxed">
                      {customDescription || (job as any).hod_job_summary || (job as any).hodJobSummary || "No technical notes provided for this repair."}
                    </td>
                    <td className="py-3 px-4 text-center border-r border-gray-100">1</td>
                    <td className="py-3 px-4 text-right border-r border-gray-100 font-mono">{laborFee.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 bg-[#e7eff6]/40">{laborFee.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-[#e7eff6] font-bold text-[12px]">
                    <td colSpan={4} className="py-3 px-4 text-right text-gray-600">Subtotal</td>
                    <td className="py-3 px-4 text-right text-gray-900 font-mono">{laborFee.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PARTS CHANGED (BEFORE & AFTER) BLOCK */}
            {(hasPartsPhotos && documentType === 'INVOICE') && (
              <div className="rounded-lg overflow-hidden border border-gray-200 mt-6" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-center gap-2 px-4 py-3 text-white font-black text-sm" style={{ backgroundColor: brandColor }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>
                  PARTS CHANGED (BEFORE & AFTER)
                </div>
                <div className={`p-4 grid gap-4 bg-white ${(partsPhotos.old && partsPhotos.new) ? 'grid-cols-2' : 'grid-cols-1 w-1/2 mx-auto'}`}>
                  {/* Old Part */}
                  {partsPhotos.old && (
                    <div className="flex flex-col text-center">
                       <img src={partsPhotos.old} alt="Old Part" className="w-full h-48 object-cover border border-gray-300 rounded-lg placeholder-hidden" />
                       <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest mt-2">{partsPhotos.new ? 'Fig 1: Original Part (Worn)' : 'Original Part (Worn)'}</span>
                    </div>
                  )}

                  {/* New Part */}
                  {partsPhotos.new && (
                    <div className="flex flex-col text-center">
                       <img src={partsPhotos.new} alt="New Part" className="w-full h-48 object-cover border border-gray-300 rounded-lg placeholder-hidden" />
                       <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest mt-2">{partsPhotos.old ? 'Fig 2: Replacement Part (Installed)' : 'Replacement Part (Installed)'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SERVICE PHOTOS BLOCK */}
            {generalPhotos.length > 0 && (
              <div className="rounded-lg overflow-hidden border border-gray-200 mt-6">
                <div className="flex items-center gap-2 px-4 py-3 text-white font-black text-sm" style={{ backgroundColor: brandColor }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/></svg>
                  ADDITIONAL SERVICE PHOTOS
                </div>
                <div className="p-4 grid grid-cols-4 gap-4 bg-[#f0f4f8]">
                  {generalPhotos.slice(0, 4).map((photo, i) => (
                    <div key={i} className="flex flex-col gap-2 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                       <div className="w-full h-[100px] rounded-lg overflow-hidden relative bg-gray-100 shadow-inner">
                          <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex items-center gap-1.5 mt-1 border-gray-100 pt-1">
                          <svg className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" style={{ color: brandColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          <span className="text-[9.5px] font-bold text-gray-700 leading-tight">{photo.label}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER GRID */}
          <div className="px-8 grid grid-cols-2 gap-6 mb-8 mt-auto pt-4">
            {/* Payment & Remarks (Left) */}
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-black text-gray-800">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/></svg>
                  Payment Information
                </div>
                <div className="p-4 text-[11px] space-y-3 font-semibold text-gray-600">
                  <div className="flex items-baseline">
                    <span className="w-28">Payment Method</span>
                    <span className="mr-2">:</span>
                    <span className="border-b border-gray-200 flex-1 font-bold text-gray-900 pb-0.5">&nbsp;</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-28">Amount Paid</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 font-bold text-gray-900 font-mono">0 {currencySymbol}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-28">Balance</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 font-bold text-gray-900 font-mono">{total.toLocaleString()} {currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* Notes / Remarks */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-black text-gray-800">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
                  Notes / Remarks
                </div>
                <div className="p-4 text-[11px] font-medium text-gray-600 space-y-4">
                  {documentType === 'ESTIMATE' ? (
                     <p className="text-rose-700 italic font-bold">Please reply YES confirming approval of this estimate before work proceeds.</p>
                  ) : (
                     <p className="italic text-gray-500">{job.estimateNotes || "All goods remain property of the company until paid in full."}</p>
                  )}
                  <div className="border-b border-gray-200"></div>
                  <div className="border-b border-gray-200"></div>
                </div>
              </div>
            </div>

            {/* Summary & Signatures (Right) */}
            <div className="space-y-6 flex flex-col justify-between">
              {/* Summary Block */}
              <div className="border border-[#1e3a8a] rounded-lg overflow-hidden bg-white shadow-sm" style={{ borderColor: brandColor }}>
                <div className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-black" style={{ backgroundColor: brandColor }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
                  Summary
                </div>
                <div className="px-4 py-4 space-y-3 text-[11px] font-bold text-gray-600">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-mono text-gray-900">{(total).toLocaleString()} {currencySymbol}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Discount</span>
                    <span className="font-mono text-gray-900">0 {currencySymbol}</span>
                  </div>
                </div>
                <div className="px-4 py-4 flex justify-between items-center text-white text-[15px] font-black" style={{ backgroundColor: brandColor }}>
                  <span>TOTAL</span>
                  <span className="font-mono tracking-wider">{total.toLocaleString()} {currencySymbol}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-800 mb-6">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                    Technician
                  </div>
                  <div className="text-[10px] space-y-3 font-semibold text-gray-600">
                    <div className="flex items-baseline">
                      <span className="w-12">Name:</span>
                      <span className="border-b border-gray-300 flex-1 h-3">{job.mechanic_name || (job.assigned_to ? job.mechanic?.full_name : '') || 'Technician'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-12">Signature:</span>
                      <span className="border-b border-gray-300 flex-1 h-3"></span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-12">Date:</span>
                      <span className="border-b border-gray-300 flex-1 h-3 text-gray-800">{formattedDate}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-800 mb-6">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                    Supervisor
                  </div>
                  <div className="text-[10px] space-y-3 font-semibold text-gray-600">
                    <div className="flex items-baseline">
                      <span className="w-12">Name:</span>
                      <span className="border-b border-gray-300 flex-1 h-3 text-gray-800">{job.hod_name || 'Supervisor'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-12">Signature:</span>
                      <span className="border-b border-gray-300 flex-1 h-3"></span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="w-12">Date:</span>
                      <span className="border-b border-gray-300 flex-1 h-3 text-gray-800">{formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ABSOLUTE FOOTER */}
          <div className="mt-auto bg-[#1a2f4c] text-white flex justify-between items-center px-8 py-3.5" style={{ backgroundColor: brandColor ? `${brandColor}E6` : '#1a2f4c' }}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-black tracking-widest text-[13px]">MOTOLOGA</span>
              <span className="text-white/40">|</span>
              <span className="text-white/70 font-medium">Powered by Motologa</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 text-[10px] font-medium max-w-[200px] text-right">
              <svg className="w-5 h-5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span>This invoice is filled digitally and generated through the Motologa Garage Management System.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
EliteInvoiceV2.displayName = 'EliteInvoiceV2';
