# context-band

Мод для Claude Code: полоса над полем ввода.

- заполненность окна контекста (полоска, проценты, токены);
- текущая модель — кнопка, переключает Opus / Sonnet / Haiku / Fable со следующего запроса, разговор сохраняется;
- усилия (effort) — кнопка, переключает low / medium / high / xhigh / max;
- режим ответа — кнопка «Режим»: «Обычный» или «Caveman» (коротко, без воды). Каждая сессия начинается с обычного;
- кнопки «Сжать» (`/compact`) и «Сбросить» (`/clear`, с подтверждением).

Режим «Caveman» берёт текст скилла из `~/.agents/skills/caveman/SKILL.md`. Поставить его:

```
npx skills add JuliusBrussee/caveman
```

Сам по себе скилл не включится: мод глушит скиллы пакета caveman (вызов `/caveman`, инструмент Skill, меню команд), пока режим не выбран кнопкой в полосе. Удалять ничего не нужно.

## Установка

В терминальной сессии Claude Code:

```
/plugin install context-band --marketplace soseregasarychev-dotcom/context-band
```

Ответьте `y` на вопрос о добавлении маркетплейса и выберите область установки.

Из командной строки:

```
claude plugin install context-band --marketplace soseregasarychev-dotcom/context-band
```

В приложении для компьютера: «+» рядом с полем ввода → Plugins → Add marketplace `soseregasarychev-dotcom/context-band` → Add plugin.
