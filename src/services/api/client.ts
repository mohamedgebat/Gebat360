/**
 * GEBAT 360° ERP — Client HTTP Base Service & Uniform Error Handling
 * Gestionnaire unifié des requêtes API REST et des erreurs HTTP (401, 403, 404, 409, 422, 500)
 */

const API_BASE_URL = 'http://localhost:5001/api/v1';

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function httpClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('gebat_jwt_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = await response.json().catch(() => ({
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: `Une erreur HTTP ${response.status} s'est produite.`,
        },
      }));

      const code = errorPayload.error?.code || `HTTP_${response.status}`;
      const message = errorPayload.error?.message || `Erreur serveur HTTP ${response.status}`;

      // Gérer les sessions expirées (401)
      if (response.status === 401) {
        localStorage.removeItem('gebat_jwt_token');
        console.warn('🔒 Session expirée ou token non valide (401). Déconnexion automatique.');
        throw new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Veuillez vous re-connecter.');
      }

      // Gérer les interdictions RBAC (403)
      if (response.status === 403) {
        throw new ApiError(403, 'FORBIDDEN_ACCESS', 'Vous ne possédez pas les habilitations nécessaires pour cette action.');
      }

      // Gérer les éléments introuvables (404)
      if (response.status === 404) {
        throw new ApiError(404, code, message || 'La ressource demandée est introuvable.');
      }

      // Gérer les conflits d'unicité (409)
      if (response.status === 409) {
        throw new ApiError(409, 'RESOURCE_CONFLICT', message || 'Un enregistrement avec ce code existe déjà.');
      }

      // Gérer les erreurs de validation payload (422)
      if (response.status === 422) {
        throw new ApiError(422, 'VALIDATION_ERROR', message || 'Données transmises non valides.');
      }

      // Erreur serveur anonymisée (500)
      throw new ApiError(response.status, code, message);
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Erreur réseau / Serveur inaccessible
    console.error('🌐 Erreur Réseau API Client:', err.message);
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de contacter le serveur backend API (http://localhost:5001/api/v1).');
  }
}
