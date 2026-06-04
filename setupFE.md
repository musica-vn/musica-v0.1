├── .husky/\
│ └── pre-commit\
│\
├── public/\
│\
├── src/\
│ ├── assets/\
│ │ ├── images/\
│ │ ├── icons/\
│ │ └── fonts/\
│ │\
│ ├── views/ # Tương đương pages của React\
│ │ ├── auth/\
│ │ │ ├── LoginView\.vue\
│ │ │ └── RegisterView\.vue\
│ │ │\
│ │ └── dashboard/\
│ │ └── DashboardView\.vue\
│ │\
│ ├── components/\
│ │ ├── base/\
│ │ │ ├── BaseButton.vue\
│ │ │ ├── BaseInput.vue\
│ │ │ └── BaseTable.vue\
│ │ │\
│ │ └── features/\
│ │ ├── auth/\
│ │ └── dashboard/\
│ │\
│ ├── layouts/\
│ │ ├── MainLayout.vue\
│ │ └── AuthLayout.vue\
│ │\
│ ├── router/\
│ │ └── index.ts\
│ │\
│ ├── stores/ # Pinia\
│ │ ├── auth.store.ts\
│ │ └── user.store.ts\
│ │\
│ ├── composables/ # Thay cho hooks\
│ │ ├── useAuth.ts\
│ │ ├── usePagination.ts\
│ │ └── useDebounce.ts\
│ │\
│ ├── services/\
│ │ ├── auth.service.ts\
│ │ └── user.service.ts\
│ │\
│ ├── api/ # Nếu muốn tách riêng\
│ │ ├── axios.ts\
│ │ └── interceptors.ts\
│ │\
│ ├── schemas/\
│ │ ├── auth.schema.ts\
│ │ └── user.schema.ts\
│ │\
│ ├── types/\
│ │\
│ ├── constants/\
│ │\
│ ├── utils/\
│ │\
│ ├── plugins/ # Vue plugins\
│ │ ├── pinia.ts\
│ │ ├── router.ts\
│ │ └── i18n.ts\
│ │\
│ ├── directives/\
│ │ └── permission.ts\
│ │\
│ ├── styles/\
│ │ ├── main.css\
│ │ ├── variables.css\
│ │ └── tailwind.css\
│ │\
│ ├── App.vue\
│ └── main.ts\
│\
├── index.html\
├── eslint.config.mjs\
├── .prettierrc\
├── tailwind.config.js\
├── tsconfig.json\
├── vite.config.ts\
├── Dockerfile\
├── docker-compose.yml\
├── package.json\
├── .gitignore\
└── .env
