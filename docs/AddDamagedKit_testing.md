**Manual & Unit Test Instructions — AddDamagedKit**

Manual test (quick):

- Open the app and click the "Report Damaged" quick action in the sidebar.
- Confirm the modal `Report Damaged Kit` appears.
- Try submitting the form empty — validation messages should show for Kit Number, Machine Type, Damaged Component(s), and Partner.
- Enter a Kit Number (e.g., `BR001`), select a Machine Type, choose one or more damaged components.
- If you check `Other`, ensure the "Specify Other Component" input appears and is required.
- Select a Partner and submit. Expect an alert "Damage report submitted" and the modal to close.
- Verify in your backend (movements table) that a `damage-report` movement was inserted with `kit_id`, `partner`, `damaged_components` and optional `damaged_component_other`.

Notes / troubleshooting:
- The handler `handleReportDamagedKit` updates the `kits` row (sets `status: 'damaged'` and `assigned_to`) and inserts into `movements`. Adjust field names to match your DB schema if different (e.g., `kit_number` vs `id`).
- If your app uses a different test runner (Jest, Vitest), ensure `@testing-library/react` is installed.

Example unit test (Vitest + React Testing Library):

File: `src/__tests__/AddDamagedKit.test.jsx`

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import AddDamagedKit from '../../src/AddDamagedKit';

test('renders form and validates Other field', () => {
  const handleSubmit = vi.fn();
  const handleClose = vi.fn();
  render(<AddDamagedKit onSubmit={handleSubmit} onClose={handleClose} />);

  // Kit Number input
  const kitInput = screen.getByPlaceholderText(/enter kit number/i);
  expect(kitInput).toBeInTheDocument();

  // Machine type select
  expect(screen.getByText(/select machine type/i)).toBeInTheDocument();

  // Damaged options
  expect(screen.getByText(/Fingerprint Scanner/i)).toBeInTheDocument();

  // Select Other and ensure other input appears
  const otherCheckbox = screen.getByLabelText(/Other/i);
  fireEvent.click(otherCheckbox);
  expect(screen.getByPlaceholderText(/describe the other damaged component/i)).toBeInTheDocument();

  // Fill required fields and submit
  fireEvent.change(kitInput, { target: { value: 'BR999' } });
  fireEvent.change(screen.getByRole('combobox', { name: /Biometric Machine Type/i }), { target: { value: 'Biorugged' } });
  fireEvent.change(screen.getByPlaceholderText(/describe the other damaged component/i), { target: { value: 'Custom part' } });
  fireEvent.change(screen.getByRole('combobox', { name: /Partner/i }), { target: { value: 'Ethio Tele' } });

  // Click submit
  fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));

  expect(handleSubmit).toHaveBeenCalled();
});
```

How to run (example):

1. Install test deps if you don't have them:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

2. Add a script to `package.json`:

```json
"scripts": {
  "test": "vitest"
}
```

3. Run tests:

```bash
npm run test
```

Adjust paths & tooling to your project's test runner as needed.
