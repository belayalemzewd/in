# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deployment (GitHub Pages)

This repository includes a GitHub Actions workflow that builds the Vite app and publishes `dist/` to the `gh-pages` branch. To deploy:

1. Create a repository on GitHub under your account (for example `in`).
2. Add your Supabase environment variables as repository secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Settings → Secrets → Actions).
3. From your project root run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/belayalemzewd/<REPO_NAME>.git
git push -u origin main
```

4. GitHub Actions will run the build and deploy to GitHub Pages automatically. Wait for the action to complete and then enable Pages from the repository Settings if needed.

Notes:
- `vite.config.js` has `base: './'` so assets are served correctly.
- Alternatively, you can deploy with Vercel or Netlify for easier env management and previews.
