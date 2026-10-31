import type { Trade } from './types';

export interface HouseCallForm {
  trade: Trade | null;
  description: string;
  address: string;
  contactName: string;
  phone: string;
}

export type FieldName = 'trade' | 'description' | 'address' | 'contactName' | 'phone';

/** Same messages as apps/api/src/house-calls.ts so the form matches the API. */
export function validateHouseCallForm(input: HouseCallForm): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!input.trade) errors.trade = 'Choose plumber, electrician, or HVAC.';

  const description = input.description.trim();
  if (description.length < 10) errors.description = 'Describe the problem in at least 10 characters.';
  else if (description.length > 2000) errors.description = 'Keep the description under 2000 characters.';

  const address = input.address.trim();
  if (address.length < 5) errors.address = 'Enter the street address.';
  else if (address.length > 200) errors.address = 'Keep the address under 200 characters.';

  const contactName = input.contactName.trim();
  if (!contactName) errors.contactName = 'Enter a name.';
  else if (contactName.length > 80) errors.contactName = 'Keep the name under 80 characters.';

  const phone = input.phone.trim();
  const digits = phone.replace(/\D/g, '');
  if (!phone || phone.length > 40 || digits.length < 10 || digits.length > 15) {
    errors.phone = 'Enter a phone number with at least 10 digits.';
  }

  return errors;
}
