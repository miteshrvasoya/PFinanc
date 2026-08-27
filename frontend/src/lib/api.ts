const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pfinanc_token');
  }

  private getHouseholdId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pfinanc_household_id');
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const householdId = this.getHouseholdId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (householdId) {
      headers['x-household-id'] = householdId;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: `HTTP_${response.status}`,
            message: data.message || 'An error occurred while communicating with the server',
          },
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Unable to connect to the backend server. Is it running on port 5000?',
        },
      };
    }
  }

  // Auth & System Status
  async getSystemStatus() {
    return this.request('/auth/system-status');
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string, householdName?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, household_name: householdName }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Dashboard & Analytics
  async getDashboard(view: 'household' | 'personal' = 'household') {
    return this.request(`/dashboard?view=${view}`);
  }

  async getMonthlyTrends(months = 6) {
    return this.request(`/analytics/trends?months=${months}`);
  }

  async getCategoryAnalytics(type: 'EXPENSE' | 'INCOME' = 'EXPENSE', startDate?: string, endDate?: string) {
    const params = new URLSearchParams({ type });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/categories?${params.toString()}`);
  }

  async getFamilyAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return this.request(`/analytics/family?${params.toString()}`);
  }

  // Accounts
  async getAccounts() {
    return this.request('/accounts');
  }

  async getAccount(id: string) {
    return this.request(`/accounts/${id}`);
  }

  async createAccount(accountData: any) {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateAccount(id: string, accountData: any) {
    return this.request(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(accountData),
    });
  }

  async toggleArchiveAccount(id: string) {
    return this.request(`/accounts/${id}/toggle-archive`, {
      method: 'POST',
    });
  }

  // Transactions
  async getTransactions(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    return this.request(`/transactions?${searchParams.toString()}`);
  }

  async createTransaction(txData: any) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    });
  }

  async updateTransaction(id: string, txData: any) {
    return this.request(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(txData),
    });
  }

  async confirmTransaction(id: string) {
    return this.request(`/transactions/${id}/confirm`, {
      method: 'POST',
    });
  }

  async rejectTransaction(id: string) {
    return this.request(`/transactions/${id}/reject`, {
      method: 'POST',
    });
  }

  async voidTransaction(id: string) {
    return this.request(`/transactions/${id}/void`, {
      method: 'POST',
    });
  }

  // Transfers
  async getTransfers() {
    return this.request('/transfers');
  }

  async createTransfer(transferData: any) {
    return this.request('/transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async voidTransfer(id: string) {
    return this.request(`/transfers/${id}/void`, {
      method: 'POST',
    });
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(categoryData: any) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  // Universal CSV Imports
  async previewCsv(accountId: string, file: File, columnMapping?: any) {
    const formData = new FormData();
    formData.append('account_id', accountId);
    formData.append('file', file);
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping));
    }
    return this.request('/imports/preview', {
      method: 'POST',
      body: formData,
    });
  }

  async commitImport(batchId: string, options: { includeDuplicates?: boolean; rowOverrides?: any } | boolean = {}) {
    const includeDuplicates = typeof options === 'boolean' ? options : (options.includeDuplicates ?? false);
    const rowOverrides = typeof options === 'object' && options.rowOverrides ? options.rowOverrides : {};
    return this.request(`/imports/commit/${batchId}`, {
      method: 'POST',
      body: JSON.stringify({
        include_duplicates: includeDuplicates,
        row_overrides: rowOverrides,
      }),
    });
  }

  // Household & Members
  async getHousehold(householdId: string) {
    return this.request(`/households/${householdId}`);
  }

  async addHouseholdMember(householdId: string, memberData: { email: string; role: string; name?: string }) {
    return this.request(`/households/${householdId}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMemberRole(householdId: string, memberId: string, role: string) {
    return this.request(`/households/${householdId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  // ==========================================
  // PHASE 2 & 2.5: INVESTMENTS, ASSETS & ONBOARDING
  // ==========================================

  // Onboarding Lifecycle
  async getOnboardingStatus() {
    return this.request('/onboarding/status');
  }

  async updateOnboardingStep(step: string, completedSection?: string, metadata?: any) {
    return this.request('/onboarding/step', {
      method: 'POST',
      body: JSON.stringify({
        step,
        completed_section: completedSection,
        metadata,
      }),
    });
  }

  async completeOnboarding() {
    return this.request('/onboarding/complete', {
      method: 'POST',
    });
  }

  async skipOnboarding() {
    return this.request('/onboarding/skip', {
      method: 'POST',
    });
  }

  async resetOnboarding() {
    return this.request('/onboarding/reset', {
      method: 'POST',
    });
  }

  // Classification & Learning Rules
  async classifyDescription(description: string, amount?: number, date?: string) {
    return this.request('/classification/classify', {
      method: 'POST',
      body: JSON.stringify({ description, amount, date }),
    });
  }

  async getClassificationRules() {
    return this.request('/classification/rules');
  }

  async saveClassificationRule(data: { pattern: string; category_id: string; transaction_type?: string; match_type?: string }) {
    return this.request('/classification/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteClassificationRule(id: string) {
    return this.request(`/classification/rules/${id}`, {
      method: 'DELETE',
    });
  }

  // Physical Assets (Gold, SGB, Tangible)
  async getPhysicalAssets(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/physical-assets${query}`);
  }

  async createPhysicalAsset(data: any) {
    return this.request('/physical-assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePhysicalAsset(id: string, data: any) {
    return this.request(`/physical-assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePhysicalAsset(id: string) {
    return this.request(`/physical-assets/${id}`, {
      method: 'DELETE',
    });
  }

  // Family Invitations
  async getInvitations() {
    return this.request('/invitations');
  }

  async createInvitation(data: { email: string; name?: string; role?: string }) {
    return this.request('/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPublicInvitation(token: string) {
    return this.request(`/invitations/public/${token}`);
  }

  async acceptPublicInvitation(token: string, data: { name?: string; password?: string; existingUserId?: string }) {
    return this.request(`/invitations/public/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeInvitation(id: string) {
    return this.request(`/invitations/${id}/revoke`, {
      method: 'POST',
    });
  }

  // Portfolio & Holdings
  async getPortfolioSummary(view: 'household' | 'personal' = 'household') {
    return this.request(`/investments/portfolio?view=${view}`);
  }

  async getHoldings(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    return this.request(`/investments/portfolio/holdings?${searchParams.toString()}`);
  }

  async getPortfolioSnapshots(range = '6M') {
    return this.request(`/investments/portfolio/snapshots?range=${range}`);
  }

  // Securities
  async searchSecurities(query: string) {
    return this.request(`/investments/securities/search?q=${encodeURIComponent(query)}`);
  }

  async getSecurities(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    return this.request(`/investments/securities?${searchParams.toString()}`);
  }

  async getSecurity(id: string) {
    return this.request(`/investments/securities/${id}`);
  }

  async createSecurity(data: any) {
    return this.request('/investments/securities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Investment Transactions
  async getInvestmentTransactions(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    return this.request(`/investments/transactions?${searchParams.toString()}`);
  }

  async createInvestmentTransaction(data: any) {
    return this.request('/investments/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async voidInvestmentTransaction(id: string) {
    return this.request(`/investments/transactions/${id}/void`, {
      method: 'POST',
    });
  }

  // Market Prices
  async refreshMarketPrices() {
    return this.request('/investments/prices/refresh', {
      method: 'POST',
    });
  }

  async setSecurityPrice(securityId: string, price: number, date?: string) {
    return this.request('/investments/prices/set', {
      method: 'POST',
      body: JSON.stringify({ security_id: securityId, price, price_date: date }),
    });
  }

  // Fixed Deposits
  async getFixedDeposits(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/investments/fixed-deposits${query}`);
  }

  async createFixedDeposit(data: any) {
    return this.request('/investments/fixed-deposits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFixedDeposit(id: string, data: any) {
    return this.request(`/investments/fixed-deposits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Retirement (EPF, PPF, NPS)
  async getRetirementAccounts(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/investments/retirement${query}`);
  }

  async createRetirementAccount(data: any) {
    return this.request('/investments/retirement', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRetirementContributions(accountId: string) {
    return this.request(`/investments/retirement/${accountId}/contributions`);
  }

  async addRetirementContribution(data: any) {
    return this.request('/investments/retirement/contributions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Investment Imports
  async previewInvestmentImport(accountId: string, filename: string, csvContent: string) {
    return this.request('/investments/imports/preview', {
      method: 'POST',
      body: JSON.stringify({
        investment_account_id: accountId,
        filename,
        csv_content: csvContent,
      }),
    });
  }

  async commitInvestmentImport(batchId: string, includeDuplicates = false) {
    return this.request(`/investments/imports/${batchId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ include_duplicates: includeDuplicates }),
    });
  }
}

export const api = new ApiClient();
