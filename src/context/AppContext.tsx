import { createContext, useState, useCallback } from 'react';
import type React from 'react';
import type { ReactNode } from 'react';
import type { User, Claim, ClaimStatusUpdate } from '../types';
import { UserRole, ClaimStatus } from '../types';
import { MOCK_USERS, MOCK_CLAIMS } from '../constants';
import { useNavigate } from 'react-router-dom';

interface AppContextType {
  user: User | null;
  claims: Claim[];
  isLoading: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  addClaim: (newClaimData: Omit<Claim, 'id' | 'policyholderId' | 'policyholderName' | 'status' | 'statusHistory'>) => Promise<void>;
  updateClaimStatus: (claimId: string, newStatus: ClaimStatus, notes?: string) => Promise<void>;
  ingestServerClaim: (serverClaim: any) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claim[]>(MOCK_CLAIMS);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const login = useCallback((email: string) => {
    const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setUser(foundUser);
      if (foundUser.role === UserRole.CUSTOMER) {
        navigate('/customer/dashboard');
      } else if (foundUser.role === UserRole.APPROVER) {
        navigate('/approver/dashboard');
      }
      return true;
    }
    return false;
  }, [navigate]);

  const logout = useCallback(() => {
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const addClaim = useCallback(async (newClaimData: Omit<Claim, 'id' | 'policyholderId' | 'policyholderName' | 'status' | 'statusHistory'>) => {
    if (!user) return;

    setIsLoading(true);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newClaim: Claim = {
      ...newClaimData,
      id: `C-${Math.floor(1000 + Math.random() * 9000)}`,
      policyholderId: user.id,
      policyholderName: user.name,
      status: ClaimStatus.SUBMITTED,
      statusHistory: [{ status: ClaimStatus.SUBMITTED, timestamp: new Date().toISOString() }],
    };
    setClaims(prevClaims => [newClaim, ...prevClaims]);
    setIsLoading(false);
  }, [user]);

  const updateClaimStatus = useCallback(async (claimId: string, newStatus: ClaimStatus, notes?: string) => {
    setIsLoading(true);
    // Call backend decision API (fire-and-forget style with graceful handling)
    try {
      const targetClaim = claims.find(c => c.id === claimId);
      const decision = newStatus === ClaimStatus.APPROVED ? 'approved' : newStatus === ClaimStatus.REJECTED ? 'rejected' : undefined;
      if (decision) {
        const approved_amount = decision === 'approved' ? (targetClaim?.claimedAmount ?? 0) : undefined;
        await fetch('/api/claims/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claim_id: claimId,
            customer_id: 'cust-PLACEHOLDER',
            topic_id: targetClaim && (targetClaim as any).blockchain?.topic_id ? (targetClaim as any).blockchain.topic_id : undefined,
            decision,
            approved_amount,
            reason: notes || (decision === 'approved' ? 'Meets policy terms' : 'Rejected by approver'),
          }),
        }).catch(() => {});
      }
    } catch (_) {
      // ignore network errors; continue optimistic UI update
    }

    setClaims(prevClaims =>
      prevClaims.map(claim => {
        if (claim.id === claimId) {
          const newStatusUpdate: ClaimStatusUpdate = {
            status: newStatus,
            timestamp: new Date().toISOString(),
            notes: notes || (newStatus === ClaimStatus.APPROVED ? 'Claim approved by approver.' : newStatus === ClaimStatus.REJECTED ? 'Claim rejected by approver.' : undefined),
          };
          return {
            ...claim,
            status: newStatus,
            statusHistory: [...claim.statusHistory, newStatusUpdate],
          };
        }
        return claim;
      })
    );
    setIsLoading(false);
  }, []);
  
  const ingestServerClaim = useCallback(async (serverClaim: any) => {
    if (!user || !serverClaim) return;
    setIsLoading(true);
    try {
      const normalizedDocuments = Array.isArray(serverClaim.documents)
        ? serverClaim.documents.map((d: any) => ({
            name: d?.name ?? 'document',
            type: d?.type ?? 'application/octet-stream',
            url: d?.url,
          }))
        : [];

      const newClaim: Claim = {
        id: String(serverClaim.id),
        policyNumber: String(serverClaim.policyNumber ?? ''),
        policyholderId: user.id,
        policyholderName: user.name,
        claimType: String(serverClaim.claimType ?? ''),
        dateOfIncident: String(serverClaim.dateOfIncident ?? ''),
        claimedAmount: Number(serverClaim.claimedAmount ?? 0),
        description: String(serverClaim.description ?? ''),
        documents: normalizedDocuments,
        fraud: typeof serverClaim.fraud === 'number' ? serverClaim.fraud : undefined,
        status: ClaimStatus.SUBMITTED,
        statusHistory: [{ status: ClaimStatus.SUBMITTED, timestamp: new Date().toISOString() }],
      };
      (newClaim as any).blockchain = serverClaim.blockchain ? serverClaim.blockchain : (serverClaim as any).blockchain;

      setClaims(prev => [newClaim, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  

  const value = { user, claims, login, logout, addClaim, updateClaimStatus, ingestServerClaim, isLoading };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
