# 🎮 Neon Chain Reaction

Визуально эффектная головоломка с неоновой эстетикой, созданная на PixiJS + TypeScript + Webpack.

[Game Preview](https://alex4124.github.io/neon_chain/)

## 🌟 Особенности

- 💫 **Невероятная графика**: Неоновое свечение, particle эффекты, bloom
- 🎯 **Простой геймплей**: Создавайте цепные реакции кликая по орбам
- ⚡ **Система комбо**: Чем больше цепь, тем больше очков
- 🎨 **Modern UI**: Минималистичный дизайн в dark-теме
- 📥 **Download функция**: Сохраните скриншот с вашим результатом

## 🎮 Как играть

1. Кликайте на цветные орбы
2. Орба взрывается и создает волну
3. Волна взрывает соседние орбы **того же цвета**
4. Создавайте цепные реакции для большего количества очков
5. У вас есть 60 секунд!

## 🚀 Установка и запуск

### Требования
- Node.js 16+ 
- npm или yarn

### Команды

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm start

# Сборка для production
npm run build
```

После запуска `npm start` игра откроется в браузере на `http://localhost:8080`

## 📁 Структура проекта

```
neon-chain-reaction/
├── src/
│   ├── Game.ts          # Основная логика игры
│   ├── index.ts         # Точка входа
│   ├── index.html       # HTML шаблон
│   └── styles.css       # Стили
├── dist/                # Скомпилированные файлы
├── webpack.config.js    # Конфигурация Webpack
├── tsconfig.json        # Конфигурация TypeScript
└── package.json
```

## 🎨 Технологии

- **PixiJS 7.3** - WebGL рендеринг и графика
- **TypeScript 5.3** - Типизация и разработка
- **Webpack 5** - Сборка и бандлинг
- **CSS3** - Стилизация и градиенты

## 🎯 Система очков

- **Первый клик**: 10 очков
- **Цепная реакция**: 5 × множитель комбо
- **Комбо**: Активируется при взрыве 3+ орб подряд

## 📸 Функции после игры

После окончания игры доступны две кнопки:

- **RESTART** - Начать новую игру
- **DOWNLOAD** - Скачать скриншот с результатом

## 💡 Советы

- Ищите большие группы орб одного цвета
- Начинайте с центра для максимального радиуса взрыва
- Планируйте цепные реакции заранее
- Следите за таймером!

## 🛠️ Для разработки

Проект использует:
- Hot Module Replacement для быстрой разработки
- Source maps для отладки
- TypeScript strict mode для безопасности типов
- CSS modules для изолированных стилей

## 📝 Лицензия

MIT

---

Сделано с ❤️ и PixiJS

## Deployment

- `npm run deploy` � builds the project and publishes `dist` to the `gh-pages` branch using the `gh-pages` package.
- Alternatively, push to `main` (or trigger the workflow manually) to let GitHub Actions build and deploy automatically via `.github/workflows/deploy.yml`.
- Configure the repository on GitHub: Settings > Pages > Build and deployment > GitHub Actions.

## Quality Checks

- `npm run lint` � static analysis for the TypeScript sources using ESLint + Prettier rules.


