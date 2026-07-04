export class ApiClient {
  private static getHeaders() {
    const token = localStorage.getItem('focuspath_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  private static async request(endpoint: string, options: RequestInit = {}) {
    const headers = this.getHeaders();
    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      return data;
    } catch (e: any) {
      console.error(`API Error on ${endpoint}:`, e);
      throw e;
    }
  }

  static get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  static post(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static put(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static patch(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
