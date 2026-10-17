const API_BASE_URL = 'http://localhost:3001/api/v1';

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('smart_pme_token');
  }

  static setAuth(token: string, user: any, org: any) {
    localStorage.setItem('smart_pme_token', token);
    localStorage.setItem('smart_pme_user', JSON.stringify(user));
    localStorage.setItem('smart_pme_org', JSON.stringify(org));
  }

  static clearAuth() {
    localStorage.removeItem('smart_pme_token');
    localStorage.removeItem('smart_pme_user');
    localStorage.removeItem('smart_pme_org');
  }

  static getSavedUser() {
    try {
      const data = localStorage.getItem('smart_pme_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static getSavedOrg() {
    try {
      const data = localStorage.getItem('smart_pme_org');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearAuth();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Session expirée');
    }

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || 'Une erreur est survenue');
    }

    return json;
  }

  // Auth
  static login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static registerOrganization(data: any) {
    return this.request<any>('/auth/register-organization', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static getMe() {
    return this.request<any>('/auth/me');
  }

  // Dashboard
  static getDashboardMetrics() {
    return this.request<any>('/dashboard/metrics');
  }

  // Products
  static getProducts(search?: string, categoryId?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    return this.request<any[]>(`/products?${params.toString()}`);
  }

  static getLowStock() {
    return this.request<any[]>('/products/low-stock');
  }

  static getCategories() {
    return this.request<any[]>('/products/categories');
  }

  static createProduct(data: any) {
    return this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateProduct(id: string, data: any) {
    return this.request<any>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers
  static getCustomers(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return this.request<any[]>(`/customers?${params.toString()}`);
  }

  static createCustomer(data: any) {
    return this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateCustomer(id: string, data: any) {
    return this.request<any>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static deleteCustomer(id: string) {
    return this.request<any>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Sales
  static getSales(limit = 50) {
    return this.request<any[]>(`/sales?limit=${limit}`);
  }

  static createSale(data: any) {
    return this.request<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Invoices
  static getInvoices(status?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return this.request<any[]>(`/invoices?${params.toString()}`);
  }

  static getInvoiceById(id: string) {
    return this.request<any>(`/invoices/${id}`);
  }

  static createInvoice(data: any) {
    return this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static cancelInvoice(id: string, reason: string) {
    return this.request<any>(`/invoices/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  // Payments
  static getPayments(invoiceId?: string) {
    const params = new URLSearchParams();
    if (invoiceId) params.append('invoiceId', invoiceId);
    return this.request<any[]>(`/payments?${params.toString()}`);
  }

  static createPayment(data: any) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Finances
  static getExpenses() {
    return this.request<any[]>('/finances/expenses');
  }

  static createExpense(data: any) {
    return this.request<any>('/finances/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static getCashRegisters() {
    return this.request<any[]>('/finances/cash-registers');
  }

  static getCurrentCashSession() {
    return this.request<any>('/finances/cash-sessions/current');
  }

  static openCashSession(data: any) {
    return this.request<any>('/finances/cash-sessions/open', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static closeCashSession(sessionId: string, closingCountedBalance: number, notes?: string) {
    return this.request<any>(`/finances/cash-sessions/${sessionId}/close`, {
      method: 'PATCH',
      body: JSON.stringify({ closingCountedBalance, notes }),
    });
  }

  static getFinancialAccounts() {
    return this.request<any[]>('/finances/accounts');
  }

  // Anomalies
  static getAnomalies(status?: string, severity?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    return this.request<any[]>(`/anomalies?${params.toString()}`);
  }

  static scanAnomalies() {
    return this.request<any>('/anomalies/scan', { method: 'POST' });
  }

  static resolveAnomaly(id: string, resolutionNote: string) {
    return this.request<any>(`/anomalies/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolutionNote }),
    });
  }

  static dismissAnomaly(id: string) {
    return this.request<any>(`/anomalies/${id}/dismiss`, { method: 'PATCH' });
  }

  // Organization
  static getOrgProfile() {
    return this.request<any>('/organizations/profile');
  }

  static updateOrgSettings(settings: any) {
    return this.request<any>('/organizations/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  static updateOrgProfile(profile: any) {
    return this.request<any>('/organizations/profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
  }
}
