import { useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../hooks/useAppContext';
import Header from '../../components/Header';
// Note: We now send files directly to the backend using FormData.

const NewClaimPage: React.FC = () => {
  const [policyNumber, setPolicyNumber] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dateOfIncident, setDateOfIncident] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [claimType, setClaimType] = useState('Health Insurance');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { ingestServerClaim } = useAppContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);
    setFiles(prev => [...prev, ...fileList]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!policyNumber || !description || !dateOfIncident || !claimedAmount) {
      alert('Please fill all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('policyNumber', policyNumber);
      fd.append('claimType', claimType);
      fd.append('dateOfIncident', dateOfIncident);
      fd.append('claimedAmount', claimedAmount);
      fd.append('description', description);
      files.forEach(f => fd.append('files', f, f.name));

      const res = await fetch('/api/claims', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.ok && data?.claim) {
        await ingestServerClaim(data.claim);
        // Fire-and-forget: call topic creation and JSON submit with base64 docs, then extract placeholders
        try {
          // Create topic
          const topicResp = await fetch('/api/create-topic', { method: 'POST' });
          const topicJson = await topicResp.json().catch(() => ({} as any));
          const topicIdSubmit = topicJson?.topic_id || data?.claim?.blockchain?.topic_id;

          // Prepare base64 documents
          const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = String(reader.result || '');
              const idx = result.indexOf(',');
              resolve(idx >= 0 ? result.slice(idx + 1) : result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          const docs = await Promise.all(
            files.map(async f => ({ filename: f.name, content_base64: await toBase64(f) }))
          );

          // Submit claim (JSON)
          await fetch('/api/claims/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: 'cust-PLACEHOLDER',
              claim_id: String(data.claim.id),
              topic_id: topicIdSubmit,
              documents: docs,
              metadata: {
                type: claimType.toLowerCase().includes('vehicle') ? 'motor' : 'health',
                submitted_by: 'customer',
                incident_date: String(dateOfIncident),
                claimed_amount: Number(claimedAmount),
                policy_number: String(policyNumber),
                description: String(description),
              },
            }),
          }).catch(() => {});

          // Extract placeholders using same topic
          await fetch('/api/claims/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claim_id: String(data.claim.id),
              customer_id: 'cust-PLACEHOLDER',
              topic_id: topicIdSubmit,
              extracted: {
                chassis_number: 'CHS1234567890',
                engine_number: 'ENG9876543210',
                make: 'Honda',
                model: 'City',
                year: 2019,
                registration_number: 'MH12AB1234',
                policy_number: String(policyNumber),
              },
            }),
          }).catch(() => {});
        } catch (_) {
          // ignore any blockchain API errors
        }
      }
      navigate('/customer/dashboard');
    } catch (err) {
      console.error('Failed to submit claim:', err);
      alert('Failed to submit claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles =
    'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-500 sm:text-sm transition-shadow duration-200';

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      <Header />

      {/* Centered Container */}
      <main className="w-screen min-h-[calc(100vh-64px)] flex items-start justify-center py-10">
        <div className="w-full max-w-5xl px-6 flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-8 w-full">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Submit Your Claim</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Fill out the form below to submit your insurance claim.</p>
          </div>

          {/* Form Card */}
          <div className="w-full max-w-4xl">
            <div className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="policyNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    id="policyNumber"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className={inputStyles}
                    placeholder="Enter your policy number"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="claimType"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Claim Type *
                  </label>
                  <select
                    id="claimType"
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value)}
                    className={inputStyles}
                  >
                    <option>Health Insurance</option>
                    <option>Veichle Insurance</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dateOfIncident"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Date of Incident *
                  </label>
                  <input
                    type="date"
                    id="dateOfIncident"
                    value={dateOfIncident}
                    onChange={(e) => setDateOfIncident(e.target.value)}
                    className={inputStyles + ' dark:[color-scheme:dark]'}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="claimedAmount"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Claimed Amount (₹) *
                  </label>
                  <input
                    type="number"
                    id="claimedAmount"
                    value={claimedAmount}
                    onChange={(e) => setClaimedAmount(e.target.value)}
                    className={inputStyles}
                    placeholder="e.g., 50000"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Claim Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Claim Details
              </h2>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Description *
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputStyles}
                placeholder="Describe your claim briefly..."
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Supporting Documents
              </h2>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white dark:bg-gray-950 rounded-md font-medium text-teal-600 dark:text-teal-400 hover:text-teal-500"
                  >
                    <span>Choose files</span>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF, PNG, JPG up to 10MB
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {files.map((file, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                    >
                      📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </li>
                  ))}
                </ul>
              )}
            </div>

              {/* Submit */}
              <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full max-w-md flex justify-center items-center gap-2 py-3 px-6 rounded-lg text-base font-medium text-white bg-teal-600 hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewClaimPage;
