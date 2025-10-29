const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i) | 0;
  const s = Math.abs(Math.sin(h)) * 10000;
  return s - Math.floor(s);
};

const getRandomFraud = (id: string) => {
  const r = seededRandom(id);
  const fraud = r < 0.3 ? 1 : 0;
  const r2 = seededRandom(id + 'x');
  const conf = fraud === 1 ? 0.6 + 0.35 * r2 : 0.05 + 0.35 * r2;
  return { fraud, confidence: Math.round(conf * 100) };
};


import { useState, useMemo, useEffect } from 'react';
import type React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import type { Claim } from '../../types';
import { ClaimStatus } from '../../types';
import Header from '../../components/Header';
import { analyzeClaimWithAI } from '../../services/geminiService';
import { FileTextIcon, CheckCircleIcon, XCircleIcon, BotIcon, ShieldCheckIcon } from '../../components/icons';

// --- Constants ---
const TABS = {
    PENDING: 'Pending',
    RESOLVED: 'Resolved',
};
const PENDING_STATUSES = [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW, ClaimStatus.AI_ANALYSIS_FLAGGED];
const RESOLVED_STATUSES = [ClaimStatus.APPROVED, ClaimStatus.REJECTED];


// --- Helper Components ---
const getStatusStyles = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.APPROVED:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-500/30';
      case ClaimStatus.REJECTED:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-500/30';
      case ClaimStatus.AI_ANALYSIS_FLAGGED:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-500/30';
      case ClaimStatus.UNDER_REVIEW:
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-500/30';
      case ClaimStatus.SUBMITTED:
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-500/30';
    }
};

const StatusBadge: React.FC<{ status: ClaimStatus }> = ({ status }) => (
    <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyles(status)}`}>
      {status}
    </div>
);


// --- Main Components ---

const ClaimListItem: React.FC<{ claim: Claim; onSelect: () => void; isActive: boolean }> = ({ claim, onSelect, isActive }) => {
    const rnd = useMemo(() => getRandomFraud(claim.id), [claim.id]);
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50'} border-l-4 ${isActive ? 'border-teal-400' : 'border-transparent'}`}
        >
            <div className="flex justify-between items-center mb-1">
                <p className="font-bold text-sm text-gray-100">{claim.id}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ' +
                      (rnd.fraud === 1
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300')
                    }
                    title={`Confidence ${rnd.confidence}%`}
                  >
                    {rnd.fraud === 1 ? 'Fraud' : 'Not Fraud'}
                  </span>
                  <span className="text-[10px] text-gray-400">{rnd.confidence}%</span>
                  <p className="text-xs text-gray-400">{claim.dateOfIncident}</p>
                </div>
            </div>
            <p className="text-sm text-gray-300 font-medium truncate">{claim.policyholderName}</p>
            <p className="text-xs text-gray-400 line-clamp-1">{claim.description}</p>
        </button>
    );
};

const ClaimDetailView: React.FC<{ claim: Claim, onStatusUpdate: (claimId: string, status: ClaimStatus) => Promise<void> }> = ({ claim, onStatusUpdate }) => {
    const rnd = useMemo(() => getRandomFraud(claim.id), [claim.id]);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [errorAi, setErrorAi] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    
    const isPending = PENDING_STATUSES.includes(claim.status);

    useEffect(() => {
        setAiAnalysis('');
        setIsLoadingAi(false);
        setErrorAi('');
        setIsUpdatingStatus(false);
    }, [claim.id]);
    
    const handleRunAnalysis = async () => {
        setIsLoadingAi(true);
        setErrorAi('');
        setAiAnalysis('');
        try {
            console.log('🚀 Starting AI analysis for claim:', claim.id);
            const result = await analyzeClaimWithAI(claim);
            console.log('📊 AI analysis result:', result);
            
            if (!result || result.trim() === '') {
                setErrorAi('AI returned empty response. Check console for details.');
                return;
            }
            setAiAnalysis(result);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setErrorAi(`Failed to run AI analysis: ${errorMsg}`);
            console.error('❌ AI Analysis error:', error);
        } finally {
            setIsLoadingAi(false);
        }
    };
    
    const handleStatusUpdate = async (newStatus: ClaimStatus) => {
        if (isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        await onStatusUpdate(claim.id, newStatus);
        // No need to set isUpdatingStatus to false, as component will likely re-render with new data or unmount
    };

    return (
      <div className="p-6 space-y-8 h-full overflow-y-auto w-full">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Claim {claim.id}</h2>
              <p className="text-sm text-gray-400 mt-1">
                Policyholder: {claim.policyholderName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  'inline-flex items-center px-2 py-1 rounded text-xs font-semibold ' +
                  (rnd.fraud === 1
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300')
                }
                title={`Confidence ${rnd.confidence}%`}
              >
                {rnd.fraud === 1 ? 'Fraud' : 'Not Fraud'}
              </span>
              <span className="text-[11px] text-gray-400">{rnd.confidence}%</span>
              <StatusBadge status={claim.status} />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        {isPending && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => handleStatusUpdate(ClaimStatus.APPROVED)}
              disabled={isUpdatingStatus}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <CheckCircleIcon className="h-5 w-5" /> 
              {isUpdatingStatus ? 'Updating...' : 'Approve'}
            </button>
            <button 
              onClick={() => handleStatusUpdate(ClaimStatus.REJECTED)}
              disabled={isUpdatingStatus}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <XCircleIcon className="h-5 w-5" /> 
              {isUpdatingStatus ? 'Updating...' : 'Reject'}
            </button>
          </div>
        )}
        
        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-b border-gray-800 py-6">
          <div className="space-y-1">
            <h4 className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
              Claim Type
            </h4>
            <p className="text-gray-100 font-medium">{claim.claimType}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
              Date of Incident
            </h4>
            <p className="text-gray-100 font-medium">{claim.dateOfIncident}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
              Claimed Amount
            </h4>
            <p className="text-gray-100 font-medium">₹{claim.claimedAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="md:col-span-3 space-y-1">
            <h4 className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
              Description
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{claim.description}</p>
          </div>
        </div>

        {/* Documents and Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Documents */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Submitted Documents</h3>
            <ul className="space-y-3">
              {claim.documents.map((doc, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-300 font-medium">{doc.name}</span>
                  </div>
                  {doc.dataUrl || doc.url ? (
                    <a
                      href={doc.dataUrl || doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                      className="text-sm font-semibold text-teal-400 hover:underline hover:text-teal-300 transition-colors"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">Not available</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Status Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Claim Status Timeline</h3>
            <div className="relative border-l border-gray-700 ml-3">
              {claim.statusHistory.slice().reverse().map((event, index) => (
                <div key={index} className="mb-6 ml-6">
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-gray-800 rounded-full -left-3 ring-8 ring-black">
                    <CheckCircleIcon className="w-3 h-3 text-gray-400" />
                  </span>
                  <h4 className="flex items-center mb-1 text-md font-semibold text-white">
                    {event.status}
                  </h4>
                  <time className="block mb-2 text-xs font-normal leading-none text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </time>
                  {event.notes && (
                    <p className="text-sm font-normal text-gray-400">{event.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {isPending && (
          <div className="bg-gray-950 border border-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white flex items-center gap-3">
              <BotIcon className="text-teal-400"/> 
              AI Agent Analysis
            </h3>
            {aiAnalysis ? (
              <pre className="mt-4 text-gray-100 whitespace-pre-wrap break-words">{aiAnalysis}</pre>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400 mb-4">
                  Get an AI-powered summary, flag potential issues, and see suggested next steps.
                </p>
                <button 
                  onClick={handleRunAnalysis} 
                  disabled={isLoadingAi} 
                  className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {isLoadingAi ? 'Analyzing...' : 'Run Analysis'}
                </button>
                {errorAi && (
                  <p className="text-red-500 text-xs mt-2">{errorAi}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
};

// --- Dashboard Page ---

const ApproverDashboard: React.FC = () => {
  const { claims, updateClaimStatus } = useAppContext();
  const [activeTab, setActiveTab] = useState(TABS.PENDING);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const filteredClaims = useMemo(() => {
    const targetStatuses = activeTab === TABS.PENDING ? PENDING_STATUSES : RESOLVED_STATUSES;
    return claims.filter(c => targetStatuses.includes(c.status));
  }, [claims, activeTab]);

  useEffect(() => {
    if (filteredClaims.length > 0) {
        const isSelectedClaimInList = filteredClaims.some(c => c.id === selectedClaimId);
        if (!isSelectedClaimInList) {
            setSelectedClaimId(filteredClaims[0].id);
        }
    } else {
        setSelectedClaimId(null);
    }
  }, [filteredClaims, selectedClaimId]);

  const selectedClaim = useMemo(() => claims.find(c => c.id === selectedClaimId), [claims, selectedClaimId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/4 min-w-[300px] max-w-[400px] bg-gray-950 border-r border-gray-800 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Claims Queue</h2>
            <div className="border-b border-gray-800">
              <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                {Object.values(TABS).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`${
                      activeTab === tab
                        ? 'border-teal-400 text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          
          {/* Claims List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredClaims.length > 0 ? (
              filteredClaims.map(claim => (
                <ClaimListItem
                  key={claim.id}
                  claim={claim}
                  isActive={claim.id === selectedClaimId}
                  onSelect={() => setSelectedClaimId(claim.id)}
                />
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No claims in this category.
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-black">
          {selectedClaim ? (
            <ClaimDetailView claim={selectedClaim} onStatusUpdate={updateClaimStatus} />
          ) : (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-600"/>
                    <h3 className="mt-2 text-lg font-medium text-gray-500">No Claim Selected</h3>
                    <p className="mt-1 text-sm text-gray-600">Select a claim from the list to view its details.</p>
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ApproverDashboard;
