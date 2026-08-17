# Permissions & Authorization Model — PFinanc

PFinanc provides a dual-layer security model: **Household Multi-Tenancy Boundary** and **Account-Level Access Control**.

---

## 1. Household Roles

| Role | Dashboard | View Transactions | Record Txn in Own Accounts | Record Txn in Shared Accounts | Manage Accounts | Add Members | Change Member Roles |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`OWNER`** | Full | All | Yes | Yes | Yes | Yes | **Yes** |
| **`ADMIN`** | Full | All | Yes | Yes | Yes | Yes | No |
| **`MEMBER`** | Filtered | Accessible | Yes | Yes | No | No | No |
| **`VIEWER`** | Read-Only | Read-Only | No | No | No | No | No |

---

## 2. Account Ownership & Visibility

1. **Private Account**:
   - Belongs to an individual member (e.g., `Mitesh - HDFC Bank`).
   - Accessible by the account owner, Household Owner, and Household Admins.
   - Other standard members cannot view or post transactions into this account.

2. **Shared Account**:
   - Flagged with `is_shared = true` (e.g., `Family Cash Reserve`, `Joint Savings`).
   - Accessible by all active members of the household for recording shared domestic expenses or receiving transfers.

3. **Explicit Sharing (`account_access`)**:
   - Grants individual read, write, or admin permissions on specific private accounts to specific family members.
