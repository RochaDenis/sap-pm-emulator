# SAP S/4HANA Layer Integration

This directory contains the integration layer for the SAP S/4HANA emulator.
The project uses an independent SQLite database (`database-s4.db`) and maintains isolated routing logic, to adhere strictly to the rule: **Do not touch existing SAP ECC emulator files.**

## Differences from ECC Emulator

1. **CSRF Consistency:**
   - The S/4HANA Emulator accurately reflects strict SAP CSRF validation.
   - Any state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) **must** include a valid `x-csrf-token` header.
   - You can fetch a CSRF token by sending a `GET` request with the header `x-csrf-token: fetch`. The server will reply with the header containing the token.

2. **OData V2 Response Formatting:**
   - S/4HANA wraps responses in `{ "d": { "results": [...] } }` and single entities as `{ "d": { ... } }`.
   - Errors follow the standard SAP schema. Use the `sapV4Response` middleware (`res.s4Result`, `res.s4Single`, `res.s4Error`).

3. **HTTP Metadata:**
   - Endpoints include `sap-system` and `dataserviceversion` headers indicating S/4HANA structure.

## Folder Structure

```
src/v4/
├── config/        # Swagger configuration & SQLite DB setup
├── middleware/    # CSRF & Response middlewares
├── routes/        # Router mounting logic
├── controllers/   # Controllers for specific S/4HANA Services
├── database/      # Database logic
├── seed/          # Initial seed content
└── tests/         # S/4HANA Integration tests
```

## Relevant API Hub Reference

Please ensure new APIs built into this directory adhere to standard operations found on the official [SAP API Business Hub](https://api.sap.com/products/SAPS4HANA/apis/all).
