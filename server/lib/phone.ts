// E.164 format validation and parsing
// Format: +[country code][number]
// Example: +33612345678

export interface PhoneValidationResult {
  is_valid: boolean;
  formatted_phone: string;
  country_code?: string;
}

export function validateAndFormatPhone(phone: string): PhoneValidationResult {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check if it starts with + or convert 0 to country code
  let formatted = cleaned;
  if (!formatted.startsWith('+')) {
    // If it starts with 0, assume it's a French number (country code 33)
    if (formatted.startsWith('0')) {
      formatted = '+33' + formatted.slice(1);
    } else if (!formatted.startsWith('+')) {
      // Try to assume country code 33 (France) if no prefix
      formatted = '+33' + formatted;
    }
  }

  // Basic E.164 validation: +[1-3 digit country code][4-15 digits]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const is_valid = e164Regex.test(formatted);

  return {
    is_valid,
    formatted_phone: formatted,
    country_code: is_valid ? formatted.match(/^\+(\d{1,3})/)?.[1] : undefined,
  };
}

// Simulate WhatsApp verification (in real scenario, call Twilio Lookup API)
export async function checkWhatsAppAvailability(phone: string): Promise<boolean> {
  // TODO: Replace with real Twilio Lookup API when credentials are available
  // For now, simulate by checking if phone is valid E.164
  const validation = validateAndFormatPhone(phone);
  
  // Simulate: return true for demonstration
  // In production: await twilioClient.lookups.v2.phoneNumbers(phone).fetch({ fields: 'line_type_intelligence' })
  if (!validation.is_valid) {
    return false;
  }

  // Mock: assume 80% of valid numbers are on WhatsApp
  const mockWhatsAppRate = 0.8;
  const hash = phone.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  return (hash % 100) / 100 < mockWhatsAppRate;
}
