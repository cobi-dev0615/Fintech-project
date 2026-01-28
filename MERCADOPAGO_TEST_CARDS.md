# Mercado Pago Test Cards (Sandbox)

When testing payments in Mercado Pago's sandbox environment, you must use specific test card numbers. The security code (CVV) alone is not sufficient - you need to use the complete test card information.

## Test Cards for Sandbox

### Approved Payments

**Mastercard:**
- Card Number: `5031 4332 1540 6351`
- CVV: `123`
- Expiration: Any future date (e.g., `11/25` or `12/26`)
- Cardholder Name: Any name

**Visa:**
- Card Number: `5031 7557 3453 0604`
- CVV: `123`
- Expiration: Any future date
- Cardholder Name: Any name

**American Express:**
- Card Number: `3753 651535 56885`
- CVV: `1234`
- Expiration: Any future date
- Cardholder Name: Any name

### Rejected Payments (for testing error scenarios)

**Mastercard (Rejected):**
- Card Number: `5031 4332 1540 6351`
- CVV: `123`
- Use with specific test scenarios

**Visa (Rejected):**
- Card Number: `5031 7557 3453 0604`
- CVV: `123`
- Use with specific test scenarios

## Important Notes

1. **Card Number is Required**: The "Pagar" button will remain inactive until you enter a valid test card number, not just the CVV.

2. **Expiration Date**: Use any future date (month/year format). Common examples:
   - `11/25`
   - `12/26`
   - `01/27`

3. **CVV**: 
   - For Mastercard and Visa: Use `123`
   - For American Express: Use `1234`

4. **Cardholder Name**: Can be any name (e.g., "Test User", "John Doe")

5. **CPF/Identification**: Use any valid CPF format for Brazilian test accounts

## Common Issues

### Button Stays Inactive
- **Problem**: "Pagar" button remains greyed out even after entering CVV
- **Solution**: Make sure you've entered a complete test card number (not just CVV). The card number must match one of the test cards above.

### Payment Fails
- Check that you're using the correct test card number
- Verify the expiration date is in the future
- Ensure CVV matches the card type (123 for most, 1234 for Amex)

## Testing Different Scenarios

### Approved Payment
Use the Mastercard or Visa test cards above with CVV `123` and any future expiration date.

### Pending Payment
Some test scenarios may result in pending payments that require manual approval in the Mercado Pago dashboard.

### Rejected Payment
Use specific test card numbers or scenarios that trigger rejection (check Mercado Pago documentation for current test scenarios).

## References

- [Mercado Pago Test Cards Documentation](https://www.mercadopago.com.br/developers/en/docs/checkout-api/integration-test/test-cards)
- [Checkout API Test Cards](https://www.mercadopago.com.br/developers/en/docs/checkout-api-payments/additional-content/your-integrations/test/cards)
