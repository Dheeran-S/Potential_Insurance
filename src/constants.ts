
import type { User, Claim } from './types';
import { UserRole, ClaimStatus } from './types';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Krit Lunkad', email: 'customer@example.com', role: UserRole.CUSTOMER },
  { id: 'user-2', name: 'Anshukman MJ', email: 'anshu@example.com', role: UserRole.CUSTOMER },
  { id: 'user-3', name: 'Aravind Kumar S', email: 'aravind@example.com', role: UserRole.CUSTOMER },
  { id: 'user-approver-1', name: 'Approver One', email: 'approver@example.com', role: UserRole.APPROVER },
];

export const MOCK_CLAIMS: Claim[] = [
    {
        id: 'C-1025',
        policyNumber: 'PN-HEALTH-5873',
        policyholderId: 'user-1',
        policyholderName: 'Krit Lunkad',
        claimType: 'Health Insurance',
        dateOfIncident: '2025-10-20',
        claimedAmount: 180000,
        description: 'Emergency appendectomy at City Hospital. Required immediate surgery and a 3-day hospital stay.',
        documents: [
            { name: 'Hospital Admission Form.pdf', type: 'application/pdf', size: 120450 },
            { name: 'Final Bill (H-987).pdf', type: 'application/pdf', size: 340980 },
        ],
        status: ClaimStatus.UNDER_REVIEW,
        statusHistory: [
            { status: ClaimStatus.SUBMITTED, timestamp: '2025-10-26T10:00:00Z' },
            { status: ClaimStatus.UNDER_REVIEW, timestamp: '2025-10-27T11:30:00Z', notes: 'Assigned to senior approver.' },
        ],
    },
    {
        id: 'C-1024',
        policyNumber: 'PN-AUTO-1121',
        policyholderId: 'user-2',
        policyholderName: 'Anshukman MJ',
        claimType: 'Auto Insurance',
        dateOfIncident: '2025-10-22',
        claimedAmount: 75000,
        description: 'Rear-end collision, damage to bumper and trunk. Police report filed.',
        documents: [
            { name: 'police-report.pdf', type: 'application/pdf', size: 500123 },
            { name: 'repair-estimate.jpg', type: 'image/jpeg', size: 1200456 },
        ],
        status: ClaimStatus.APPROVED,
        statusHistory: [
            { status: ClaimStatus.SUBMITTED, timestamp: '2025-10-23T09:00:00Z' },
            { status: ClaimStatus.UNDER_REVIEW, timestamp: '2025-10-24T14:00:00Z' },
            { status: ClaimStatus.APPROVED, timestamp: '2025-10-28T16:00:00Z', notes: 'Claim approved. Payment processing.' },
        ],
    },
    {
        id: 'C-1026',
        policyNumber: 'PN-HOME-9432',
        policyholderId: 'user-3',
        policyholderName: 'Aravind Kumar S',
        claimType: 'Home Insurance',
        dateOfIncident: '2025-10-24',
        claimedAmount: 250000,
        description: 'Water damage from burst pipe in kitchen. Damaged flooring and cabinets.',
        documents: [
            { name: 'plumber-report.pdf', type: 'application/pdf', size: 98000 },
            { name: 'photos-damage.zip', type: 'application/zip', size: 5600000 },
        ],
        status: ClaimStatus.SUBMITTED,
        statusHistory: [
             { status: ClaimStatus.SUBMITTED, timestamp: '2025-10-25T18:45:00Z' },
        ]
    }
];
