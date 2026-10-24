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

Чтобы скилл не включался сам, удалите ссылку `~/.claude/skills/caveman`, которую создаёт установщик: тогда режим включается только кнопкой в полосе.

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
