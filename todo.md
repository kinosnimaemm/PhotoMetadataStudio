# PhotoMetadataStudio — реализация улучшений (DM Black Tea, 2026-06-12)

Пушим прямо в main (автодеплой на Render). Каждый коммит — рабочее состояние, тесты локально.

## Backend hardening
- [ ] 1. Тесты: убрать хардкод путей (/opt/homebrew/ffmpeg, /usr/bin/unzip) → env/PATH
- [ ] 2. runCommand: таймаут + kill для ffmpeg/exiftool
- [ ] 3. Валидация magic bytes (file-type) + ранний reject по расширению (stream.resume)
- [ ] 4. Rate limiting (cloud) + Origin check на мутирующих эндпоинтах
- [ ] 5. helmet-подобные заголовки (вручную, без лишних deps)
- [ ] 6. Центральный error handler + JSON 404 для /api
- [ ] 7. download/:index — удалять только при успешной отдаче
- [ ] 8. Убрать мёртвый savedFolder
- [ ] 9. Таймзона из профиля (IANA tz + Intl) — фикс OffsetTime в облаке
- [ ] 10. Self-host supabase-js (убрать CDN без SRI)

## Frontend
- [ ] 11. Тосты вместо alert/confirm
- [ ] 12. Запоминать последний профиль (localStorage)
- [ ] 13. Cmd+V вставка из буфера
- [ ] 14. Тёмная тема (prefers-color-scheme)
- [ ] 15. Карта Leaflet в конструкторе профиля
- [ ] 16. «Паспорт фото» — превью выбранного профиля
- [ ] 17. Прогресс обработки (polling) вместо спиннера
- [ ] 18. HEIC-превью (heic2any, lazy)
- [ ] 19. Favicon + OG-теги
- [ ] 20. Вынести инлайн-стили auth в styles.css

## Infra/docs
- [ ] 21. GitHub Actions CI (ubuntu: exiftool/ffmpeg/zip, npm test)
- [ ] 22. README: brew install, бейдж CI
- [ ] 23. Repo description + topics через gh api
- [ ] 24. git rm --cached .env (он сказал не париться, но из новых коммитов уберём трекинг)

## Прогон
- [ ] npm install, npm test до изменений (база)
- [ ] npm test после каждого блока
- [ ] Финальный smoke-тест UI через браузер + скриншот
