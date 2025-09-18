/**
 * Güvenli JSON parse utility fonksiyonu
 * API response'larını güvenli bir şekilde parse eder
 */

export interface SafeParseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function safeJsonParse<T = any>(response: Response): Promise<SafeParseResult<T>> {
  try {
    // Response'un ok olup olmadığını kontrol et
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        message: 'Server error'
      };
    }

    // Content-Type kontrolü
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return {
        success: false,
        error: 'Non-JSON response',
        message: `Expected JSON but got ${contentType}`,
        data: text as any
      };
    }

    // Response text'ini al
    const text = await response.text();
    
    // Boş veya undefined kontrolü
    if (!text || text === 'undefined' || text.trim() === '') {
      return {
        success: false,
        error: 'Empty response',
        message: 'Server returned empty response'
      };
    }

    // JSON parse et
    const data = JSON.parse(text);
    
    return {
      success: true,
      data: data as T
    };
  } catch (error) {
    // JSON parse hatası UI'da sembolik hataya yol açıyordu; sadeleştiriyoruz
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parse error',
      message: 'Failed to parse JSON response'
    };
  }
}

/**
 * Basit response kontrolü - sadece success durumunu döner
 */
export async function safeJsonParseSimple(response: Response): Promise<boolean> {
  const result = await safeJsonParse(response);
  return result.success && result.data?.success === true;
}

/**
 * Data ile birlikte parse et
 */
export async function safeJsonParseWithData<T = any>(response: Response): Promise<{ success: boolean; data?: T }> {
  const result = await safeJsonParse<T>(response);
  return {
    success: result.success,
    data: result.data
  };
}
