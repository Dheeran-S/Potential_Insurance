
import type React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import { useAppContext } from '../../hooks/useAppContext';
import type { Claim } from '../../types';
import { ClaimStatus } from '../../types';
import { FileTextIcon } from '../../components/icons';

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

const StatusDisplay: React.FC<{ status: ClaimStatus }> = ({ status }) => (
  <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusStyles(status)}`}>
    {status}
  </div>
);

const ClaimCard: React.FC<{ claim: Claim }> = ({ claim }) => (
  <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-lg dark:hover:shadow-teal-900/20 transition-all duration-300">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {claim.id} - {claim.claimType}
        </p>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-1">
          {`Claim for ₹${claim.claimedAmount.toLocaleString('en-IN')}`}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Incident Date: {claim.dateOfIncident}
        </p>
      </div>
      <div className="ml-4 flex flex-col items-end gap-2">
        <StatusDisplay status={claim.status} />
        {typeof claim.fraud === 'number' && (
          <span
            className={
              'inline-flex items-center px-2 py-1 rounded text-xs font-medium ' +
              (claim.fraud === 1
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300')
            }
            title={claim.fraud === 1 ? 'Predicted as Fraudulent' : 'Predicted as Not Fraudulent'}
          >
            {claim.fraud === 1 ? 'Fraud' : 'Not Fraud'}
          </span>
        )}
      </div>
    </div>
    <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm line-clamp-2">
      {claim.description}
    </p>
  </div>
);


const CustomerDashboard: React.FC = () => {
  const { user, claims } = useAppContext();
  const userClaims = claims.filter(claim => claim.policyholderId === user?.id);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black">
      <Header />
      
      <main className="w-full px-6 lg:px-12 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Claims
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and track your insurance claims
            </p>
          </div>
          <Link
            to="/customer/new-claim"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200 shadow-sm"
          >
            <FileTextIcon className="h-5 w-5" />
            Submit New Claim
          </Link>
        </div>

        {/* Claims Grid */}
        {userClaims.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userClaims.map(claim => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950">
            <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No claims found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get started by submitting your first claim.
            </p>
            <Link
              to="/customer/new-claim"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200"
            >
              <FileTextIcon className="h-4 w-4" />
              Submit New Claim
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
