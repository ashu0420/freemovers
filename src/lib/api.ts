const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');

export interface LoginRequest {
  email: string;
  password: string;
  user_type: 'customer' | 'driver';
}

export interface RegisterRequest extends LoginRequest {
  password2: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  preferred_locale?: 'en' | 'ja';
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'customer' | 'driver';
    phone_number: string;
    phone_verified?: boolean;
    preferred_locale?: 'en' | 'ja';
    preferred_notification_channel?: 'line' | 'whatsapp' | 'sms';
    line_user_id?: string | null;
  };
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string | { [key: string]: string[] | string };
  status: number;
}

export async function registerUser(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.detail || data || 'Registration failed',
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      error: 'Network error. Please try again.',
      status: 500,
    };
  }
}

export async function loginUser(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.detail || data || 'Login failed',
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      error: 'Network error. Please try again.',
      status: 500,
    };
  }
}

export async function logoutUser(refreshToken: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    // Even if the server returns an error, we still want to clear the local auth state
    if (!response.ok) {
      console.error('Logout API error:', await response.json());
    }

    return {
      status: response.status,
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      error: 'Network error during logout',
      status: 500,
    };
  }
}
