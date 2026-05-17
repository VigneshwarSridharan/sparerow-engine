import { House } from '@strapi/icons';
import type { StrapiApp } from '@strapi/strapi/admin';

// @ts-ignore — Vite resolves SVG imports to URL strings in the admin build
import AuthLogo from './extensions/assets/logo.svg';
// @ts-ignore
import MenuLogo from './extensions/assets/logo-icon.svg';

export default {
  config: {
    auth: { logo: AuthLogo },
    menu: { logo: MenuLogo },
    head: { title: 'Sparerow Admin' },
    tutorials: false,
    notifications: { releases: false },
    theme: {
      light: {
        colors: {
          primary100: '#f0f0ff',
          primary200: '#d9d8ff',
          primary500: '#7b79ff',
          primary600: '#4945ff',
          primary700: '#271fe0',
        },
      },
    },
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'Sparerow',
        'app.components.LeftMenu.navbrand.workplace': 'Admin Panel',
        'HomePage.helmet.title': 'Sparerow Admin',
        'content-manager.plugin.name': 'Content',
      },
    },
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: '/dashboard',
      icon: House,
      intlLabel: { id: 'dashboard.link', defaultMessage: 'Dashboard' },
      Component: () => import('./extensions/Dashboard'),
      permissions: [],
    });
  },
};
