import { DeterministicTransactionParser } from '../parser/DeterministicTransactionParser.js';

describe('DeterministicTransactionParser', () => {
    
    const mockDate = new Date('2026-09-15T00:00:00.000Z');
    const householdId = 'test-household';

    it('should parse a standard UPI debit message', async () => {
        const sms = "Your A/c XX4521 has been debited by Rs.850.00 at SWIGGY on 15-Sep-2026. Ref 123456.";
        
        const result = await DeterministicTransactionParser.parse(sms, 'HDFCBK', mockDate, householdId);
        
        expect(result.isFinancial).toBe(true);
        expect(result.amount).toBe(850.00);
        expect(result.direction).toBe('DEBIT');
        expect(result.transactionType).toBe('EXPENSE');
        expect(result.merchant?.toUpperCase()).toBe('SWIGGY');
        expect(result.accountSuffix).toBe('4521');
        expect(result.referenceNumber).toBe('123456');
        expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse a standard bank credit message', async () => {
        const sms = "INR 25,000 credited to A/c XX9988 by John Doe. Ref ABC987654.";
        
        const result = await DeterministicTransactionParser.parse(sms, 'ICICIB', mockDate, householdId);
        
        expect(result.isFinancial).toBe(true);
        expect(result.amount).toBe(25000);
        expect(result.direction).toBe('CREDIT');
        expect(result.transactionType).toBe('INCOME');
        expect(result.accountSuffix).toBe('9988');
        expect(result.referenceNumber).toBe('ABC987654');
    });

    it('should ignore OTP messages', async () => {
        const sms = "Your OTP is 123456 for a transaction of Rs.850.00. Do not share this.";
        
        const result = await DeterministicTransactionParser.parse(sms, 'HDFCBK', mockDate, householdId);
        
        expect(result.isFinancial).toBe(false);
    });

    it('should identify ATM withdrawals', async () => {
        const sms = "Rs. 5,000 withdrawn from ATM A/c XX1234.";
        
        const result = await DeterministicTransactionParser.parse(sms, 'SBI', mockDate, householdId);
        
        expect(result.transactionType).toBe('WITHDRAWAL');
    });
});
