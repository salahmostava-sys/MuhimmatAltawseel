import { describe, expect, it } from 'vitest';
import {
  isValidEmployeePhone,
  isValidEmployeeNationalId,
  clampEmployeePhoneInput,
  clampEmployeeNationalIdInput,
} from './employeeFieldValidation';

describe('isValidEmployeePhone', () => {
  it('accepts valid local numbers (05xxxxxxxx)', () => {
    expect(isValidEmployeePhone('0512345678')).toBe(true);
    expect(isValidEmployeePhone('0551234567')).toBe(true);
  });

  it('accepts valid international numbers (9665xxxxxxxx)', () => {
    expect(isValidEmployeePhone('966512345678')).toBe(true);
    expect(isValidEmployeePhone('966551234567')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidEmployeePhone('123456')).toBe(false);
    expect(isValidEmployeePhone('0612345678')).toBe(false);
    expect(isValidEmployeePhone('')).toBe(false);
    expect(isValidEmployeePhone(null)).toBe(false);
    expect(isValidEmployeePhone(undefined)).toBe(false);
  });

  it('ignores non-digit characters', () => {
    expect(isValidEmployeePhone('05-1234-5678')).toBe(true);
    expect(isValidEmployeePhone('+966 51 234 5678')).toBe(true);
  });
});

describe('isValidEmployeeNationalId', () => {
  it('accepts valid IDs starting with 1 or 2', () => {
    expect(isValidEmployeeNationalId('1234567890')).toBe(true);
    expect(isValidEmployeeNationalId('2345678901')).toBe(true);
  });

  it('rejects invalid IDs', () => {
    expect(isValidEmployeeNationalId('3456789012')).toBe(false);
    expect(isValidEmployeeNationalId('123456789')).toBe(false); // 9 digits
    expect(isValidEmployeeNationalId('12345678901')).toBe(false); // 11 digits
    expect(isValidEmployeeNationalId('')).toBe(false);
    expect(isValidEmployeeNationalId(null)).toBe(false);
  });
});

describe('clampEmployeePhoneInput', () => {
  it('clamps local numbers to 10 digits', () => {
    expect(clampEmployeePhoneInput('05123456789999')).toBe('0512345678');
  });

  it('clamps international numbers to 12 digits', () => {
    expect(clampEmployeePhoneInput('96651234567899')).toBe('966512345678');
  });

  it('strips non-digits', () => {
    expect(clampEmployeePhoneInput('+966-51-234-5678')).toBe('966512345678');
  });
});

describe('clampEmployeeNationalIdInput', () => {
  it('clamps to 10 digits', () => {
    expect(clampEmployeeNationalIdInput('123456789012345')).toBe('1234567890');
  });

  it('strips non-digits', () => {
    expect(clampEmployeeNationalIdInput('12-345-67890')).toBe('1234567890');
  });
});
