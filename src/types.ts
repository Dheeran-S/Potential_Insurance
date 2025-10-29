
export enum UserRole {
  CUSTOMER = 'customer',
  APPROVER = 'approver',
}

export enum ClaimStatus {
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  AI_ANALYSIS_FLAGGED = 'AI Analysis Flagged',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ClaimFile {
  name: string;
  type: string;
  size?: number;
  url?: string;
  dataUrl?: string;
}

export interface ClaimStatusUpdate {
    status: ClaimStatus;
    timestamp: string;
    notes?: string;
}

export interface Claim {
  id: string;
  policyNumber: string;
  policyholderId: string;
  policyholderName: string;
  claimType: string;
  dateOfIncident: string;
  claimedAmount: number;
  description: string;
  documents: ClaimFile[];
  fraud?: number;
  status: ClaimStatus;
  statusHistory: ClaimStatusUpdate[];
}
