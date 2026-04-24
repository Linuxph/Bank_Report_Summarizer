// const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/auth';

// interface LoginResponse {
//   token: string;
//   user: {
//     id: string;
//     email: string;
//     name: string;
//   };
// }


// export const authService = {
//   async login(email: string, password: string): Promise<LoginResponse> {
//     const response = await request(`http://localhost:8080/api/auth/login`, {
//       email,
//       password,
//     });

//     return response as LoginResponse;
//   },

//   async signup(username: string, email: string, password: string): Promise<SignupResponse> {
//     const response = await request(`http://localhost:8080/api/auth/signup`, {
//       username,
//       email,
//       password,
//     });

//     return response as SignupResponse;
//   },
// };

// async function request(url: string, body: Record<string, string>) {
//   let response: Response;

//   try {
//     response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(body),
//     });
//   } catch {
//     throw new Error('Cannot reach the backend server. Check that the API is running and Vite proxy is configured.');
//   }

//   const contentType = response.headers.get('content-type') ?? '';
//   const isJson = contentType.includes('application/json');
//   const payload = isJson ? await response.json() : await response.text();

//   if (!response.ok) {
//     if (isJson && typeof payload === 'object' && payload !== null && 'message' in payload) {
//       throw new Error(String(payload.message));
//     }

//     if (typeof payload === 'string' && payload.trim()) {
//       throw new Error(payload);
//     }

//     throw new Error('Request failed');
//   }

//   return payload;
// }

const API_BASE =  '/api/auth';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface SignupResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await request(`http://localhost:8080/api/auth/login`, {
      email,
      password,
    });

    return response as LoginResponse;
  },

  async signup(username: string, email: string, password: string): Promise<SignupResponse> {
    const response = await request(`http://localhost:8080/api/auth/signup`, {
      username,
      email,
      password,
    });

    return response as SignupResponse;
  },
};

async function request(url: string, body: Record<string, string>) {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the backend server. Check that the API is running and Vite proxy is configured.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (isJson && typeof payload === 'object' && payload !== null && 'message' in payload) {
      throw new Error(String(payload.message));
    }

    if (typeof payload === 'string' && payload.trim()) {
      throw new Error(payload);
    }

    throw new Error('Request failed');
  }

  return payload;
}
