
import React, { useState } from 'react';
import { Bot, Edit3, RotateCcw, X, CheckCircle2, Search } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { AgentSlot } from '../types/studio';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const QWEN_MODEL = 'qwen3.5:4b';

const SCENE_COUNT = 5;
const SCENE_MIN_WORDS = 56;
const SCENE_MAX_WORDS = 70;

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type OllamaChatResult = {
  error?: string;
  done_reason?: string;
  message?: {
    content?: string;
    thinking?: string;
  };
};

type GenerationReport = {
  sceneCount: number;
  spokenWords: number;
  sceneWordCounts: number[];
  estimatedSeconds: number;
  warnings: string[];
};

const SCRIPTWRITER_SYSTEM = `
Ты профессиональный сценарист коротких кинематографичных мини-сериалов.

Пиши исключительно на грамотном русском языке.
Соблюдай последовательность событий и характеры персонажей.
Не меняй имена, отношения и факты, заданные пользователем.
Создавай естественные диалоги, эмоциональные конфликты и интригу.
Не повторяй предложения, действия и сцены.
Не используй английские слова.
Не описывай работу камеры, монтаж и технические параметры съёмки.
Не показывай рассуждения и черновики.
Выполняй только указанную задачу.
`;

const SCENE_PURPOSES = [
  'СЦЕНА 1. ЗАВЯЗКА. Начни с сильного события или интриги. Сразу заинтересуй зрителя.',
  'СЦЕНА 2. ПОСЛЕДСТВИЯ. Покажи реакцию персонажей на первое событие. Развивай конфликт.',
  'СЦЕНА 3. НОВАЯ ИНФОРМАЦИЯ. Добавь важную улику, секрет или неожиданное обстоятельство.',
  'СЦЕНА 4. ОБОСТРЕНИЕ. Усиль конфликт. Поставь главного героя перед трудным выбором.',
  'СЦЕНА 5. КЛИФФХЭНГЕР. Заверши эпизод сильным неожиданным событием, которое заставит зрителя ждать следующую серию.',
];

async function askQwen(
  messages: ChatMessage[],
  numPredict: number,
  temperature: number
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages,
        think: false,
        stream: false,
        options: {
          temperature,
          top_p: 0.9,
          top_k: 40,
          repeat_last_n: 128,
          repeat_penalty: 1.08,
          num_predict: numPredict,
        },
      }),
    });
  } catch {
    throw new Error(
      'Не удалось подключиться к Ollama. Проверь, что ollama serve запущена и разрешён доступ с сайта.'
    );
  }

  let data: OllamaChatResult;

  try {
    data = (await response.json()) as OllamaChatResult;
  } catch {
    throw new Error('Ollama вернула ответ в неизвестном формате.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка при обращении к Ollama.');
  }

  if (data.done_reason === 'length') {
    throw new Error(
      'Qwen оборвала ответ из-за ограничения токенов. Попробуй создать сценарий ещё раз.'
    );
  }

  const result = (data.message?.content || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\\([*_#])/g, '$1')
    .trim();

  if (!result) {
    throw new Error('Qwen не вернула текст.');
  }

  return result;
}

function normalizeSceneHeading(
  text: string,
  sceneNumber: number
): string {
  const cleaned = text.trim();

  const headingPattern =
    /^(\s*(?:#{1,6}\s*)?(?:\*\*)?\s*СЦЕНА\s*(?:№\s*)?)\d+/i;

  if (headingPattern.test(cleaned)) {
    return cleaned.replace(
      headingPattern,
      (_match, prefix: string) => `${prefix}${sceneNumber}`
    );
  }

  return `СЦЕНА ${sceneNumber}\n${cleaned}`;
}

function countWords(text: string): number {
  const words = text.match(
    /[A-Za-zА-Яа-яЁё0-9]+(?:[-’'][A-Za-zА-Яа-яЁё0-9]+)*/g
  );

  return words ? words.length : 0;
}

// Извлекает реплики персонажей, не включая описания места и действий.
function extractDialogueText(script: string): string {
  const result: string[] = [];

  const nonDialogueLabels = new Set([
    'место',
    'время',
    'действие',
    'действия',
    'визуальное описание',
    'эмоции',
    'диалоги',
    'название',
    'жанр',
    'персонажи',
    'финал',
    'продолжительность',
    'хронометраж',
    'атмосфера',
  ]);

  for (const line of script.split('\n')) {
    const cleaned = line
      .replace(/\*\*/g, '')
      .replace(/^#{1,6}\s*/, '')
      .trim();

    const speakerMatch = cleaned.match(
      /^([А-ЯЁ][А-ЯЁа-яё -]{1,34})(?:\s*\([^)]*\))?\s*[:—]\s*(.+)$/u
    );

    if (speakerMatch) {
      const label = speakerMatch[1].trim().toLowerCase();

      if (!nonDialogueLabels.has(label)) {
        result.push(speakerMatch[2]);
      }

      continue;
    }

    if (/^—\s*\S/u.test(cleaned)) {
      result.push(cleaned.replace(/^—\s*/, ''));
    }
  }

  return result.join(' ');
}

function countDialogueWords(script: string): number {
  return countWords(extractDialogueText(script));
}

function countScenes(script: string): number {
  const matches = script.match(
    /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*СЦЕНА\s*(?:№\s*)?\d+\b/gim
  );

  return matches ? matches.length : 0;
}

function countRepeatedLines(script: string): number {
  const lines = script
    .split('\n')
    .map((line) => line.replace(/\*\*/g, '').trim().toLowerCase())
    .filter((line) => line.length > 60)
    .filter((line) => !/^сцена\s+\d+/i.test(line));

  const counts = new Map<string, number>();

  for (const line of lines) {
    counts.set(line, (counts.get(line) || 0) + 1);
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

function distanceFromTarget(words: number): number {
  if (words < SCENE_MIN_WORDS) {
    return SCENE_MIN_WORDS - words;
  }

  if (words > SCENE_MAX_WORDS) {
    return words - SCENE_MAX_WORDS;
  }

  return 0;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
}

export const AgentManagerView: React.FC = () => {
  const { workspace, updateAgentSlot, clearAgentSlot } = useStudioStore();

  const [editingSlot, setEditingSlot] = useState<AgentSlot | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [targetModelCategory, setTargetModelCategory] = useState(
    'Текст и сценарии'
  );
  const [notes, setNotes] = useState('');

  const [idea, setIdea] = useState('');
  const [generatedStory, setGeneratedStory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationStage, setGenerationStage] = useState('');
  const [generationReport, setGenerationReport] =
    useState<GenerationReport | null>(null);

  const [qualityReview, setQualityReview] = useState('');
  const [isQualityChecking, setIsQualityChecking] = useState(false);
  const [qualityCheckError, setQualityCheckError] = useState('');

  // Автоматическое исправление объёма отдельной сцены.
  const adjustSceneLength = async (
    scene: string,
    sceneNumber: number,
    outline: string,
    previousScenes: string[]
  ): Promise<string> => {
    const originalWords = countDialogueWords(scene);

    if (
      originalWords >= SCENE_MIN_WORDS &&
      originalWords <= SCENE_MAX_WORDS
    ) {
      return scene;
    }

    const adjustmentDirection =
      originalWords < SCENE_MIN_WORDS
        ? `Увеличь количество произносимых слов. Сейчас их ${originalWords}, необходимо от ${SCENE_MIN_WORDS} до ${SCENE_MAX_WORDS}. Добавь естественные реплики, которые раскрывают характеры, конфликт или новую информацию.`
        : `Сократи количество произносимых слов. Сейчас их ${originalWords}, необходимо от ${SCENE_MIN_WORDS} до ${SCENE_MAX_WORDS}. Убери лишние реплики и повторы, сохранив важную информацию.`;

    const corrected = await askQwen(
      [
        {
          role: 'system',
          content: SCRIPTWRITER_SYSTEM,
        },
        {
          role: 'user',
          content: `
Ты редактор одной сцены короткого мини-сериала.

ИСХОДНАЯ ИДЕЯ:
${idea.trim()}

ПЛАН ЭПИЗОДА:
${outline}

ПРЕДЫДУЩИЕ СЦЕНЫ:
${previousScenes.length > 0
  ? previousScenes.join('\n\n')
  : 'Предыдущих сцен нет.'}

СЦЕНА ДЛЯ РЕДАКТИРОВАНИЯ:
${scene}

ЗАДАЧА:
${adjustmentDirection}

СТРОГИЕ ПРАВИЛА:
1. Верни всю сцену целиком.
2. Сохрани её номер, место, время и основные события.
3. Не меняй имена, характеры и отношения персонажей.
4. Не добавляй новые сюжетные события.
5. Не меняй смысл и причинно-следственную связь.
6. Изменяй только необходимую часть диалогов и кратких действий.
7. Считай только произносимые персонажами слова.
8. Не пытайся увеличить объём описаниями действий.
9. Диалоги должны быть естественными.
10. Пиши только на русском языке.
11. Не добавляй другие сцены и редакторские комментарии.

Выведи только исправленную сцену ${sceneNumber}.
`,
        },
      ],
      1100,
      0.4
    );

    const normalized = normalizeSceneHeading(corrected, sceneNumber);
    const correctedWords = countDialogueWords(normalized);

    // Не принимаем исправление, если оно стало ещё дальше от нормы.
    if (
      correctedWords > 0 &&
      distanceFromTarget(correctedWords) <=
        distanceFromTarget(originalWords)
    ) {
      return normalized;
    }

    return scene;
  };

  const handleGenerateStory = async () => {
    if (!idea.trim()) {
      setGenerationError('Сначала напишите идею истории.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGenerationStage('Составляю сюжет и план пяти сцен...');
    setGeneratedStory('');
    setGenerationReport(null);
    setQualityReview('');
    setQualityCheckError('');

    try {
      // ЭТАП 1. Планирование истории.
      const outline = await askQwen(
        [
          {
            role: 'system',
            content: SCRIPTWRITER_SYSTEM,
          },
          {
            role: 'user',
            content: `
На основе идеи пользователя подготовь подробный план одного эпизода мини-сериала.

ИДЕЯ ПОЛЬЗОВАТЕЛЯ:
${idea.trim()}

ТРЕБОВАНИЯ:
1. Эпизод продолжительностью от 2 до 3 минут.
2. Ровно 5 сцен.
3. Сохрани тему, жанр и всех персонажей пользователя.
4. Не меняй имена и отношения персонажей.
5. У каждого главного персонажа должна быть понятная мотивация.
6. Каждая сцена должна иметь отдельную функцию.
7. События должны логически вытекать друг из друга.
8. Подготовь сильный поворот для пятой сцены.
9. Не раскрывай все тайны сериала.
10. Не пиши готовые диалоги.
11. План должен быть кратким и последовательным.

СТРОГИЙ ФОРМАТ:

НАЗВАНИЕ:
ЖАНР:
ПЕРСОНАЖИ:

--- ПЛАН СЦЕН ---

СЦЕНА 1: цель, событие и результат.
СЦЕНА 2: цель, событие и результат.
СЦЕНА 3: цель, событие и результат.
СЦЕНА 4: цель, событие и результат.
СЦЕНА 5: кульминация и клиффхэнгер.

Выведи только план.
`,
          },
        ],
        1600,
        0.45
      );

      const planMarker = outline.search(/---\s*ПЛАН\s+СЦЕН\s*---/i);

      const seriesInfo =
        planMarker >= 0
          ? outline.slice(0, planMarker).trim()
          : outline.trim();

      const scenes: string[] = [];

      setGeneratedStory(seriesInfo);

      // ЭТАП 2. Последовательное создание пяти сцен.
      for (let sceneNumber = 1; sceneNumber <= SCENE_COUNT; sceneNumber++) {
        setGenerationStage(
          `Создаю сцену ${sceneNumber} из ${SCENE_COUNT}...`
        );

        const previousScenes =
          scenes.length > 0
            ? scenes.join('\n\n')
            : 'Предыдущих сцен пока нет.';

        const currentScene = await askQwen(
          [
            {
              role: 'system',
              content: SCRIPTWRITER_SYSTEM,
            },
            {
              role: 'user',
              content: `
Создай только одну сцену короткого мини-сериала.

ИДЕЯ ПОЛЬЗОВАТЕЛЯ:
${idea.trim()}

ПЛАН ВСЕГО ЭПИЗОДА:
${outline}

УЖЕ НАПИСАННЫЕ СЦЕНЫ:
${previousScenes}

ТЕПЕРЬ НАПИШИ:
${SCENE_PURPOSES[sceneNumber - 1]}

ТРЕБОВАНИЯ:
1. Напиши только сцену номер ${sceneNumber}.
2. Диалоги должны содержать от ${SCENE_MIN_WORDS} до ${SCENE_MAX_WORDS} произносимых слов.
3. Не менее ${SCENE_MIN_WORDS} и не более ${SCENE_MAX_WORDS} слов должны произноситься персонажами вслух.
4. Ориентируйся на короткие, естественные реплики.
5. Не растягивай текст описаниями ради объёма.
6. Используй имена и факты строго как в плане.
7. Не меняй уже установленные события и отношения.
8. Не повторяй информацию из предыдущих сцен.
9. Продвигай историю новым событием или конфликтом.
10. Реплики пиши отдельными строками в формате: ИМЯ: текст.
11. Перед диалогами кратко укажи место, время и действие.
12. Не описывай камеру, монтаж и ракурсы.
13. Не добавляй новых персонажей без необходимости.
14. Только грамотный русский язык.
15. Не добавляй другие сцены.
16. Не объясняй свои действия.
17. Для пятой сцены обязательно создай сильный клиффхэнгер.

Верни только сцену ${sceneNumber}.
`,
            },
          ],
          1500,
          0.7
        );

        let normalizedScene = normalizeSceneHeading(
          currentScene,
          sceneNumber
        );

        // ЭТАП 3. Проверка и корректировка объёма каждой сцены.
        const initialSceneWords =
          countDialogueWords(normalizedScene);

        if (
          initialSceneWords < SCENE_MIN_WORDS ||
          initialSceneWords > SCENE_MAX_WORDS
        ) {
          setGenerationStage(
            `Корректирую объём сцены ${sceneNumber}: ${initialSceneWords} слов...`
          );

          normalizedScene = await adjustSceneLength(
            normalizedScene,
            sceneNumber,
            outline,
            scenes
          );
        }

        scenes.push(normalizedScene);

        const currentStory = [
          seriesInfo,
          ...scenes,
        ]
          .filter(Boolean)
          .join('\n\n');

        setGeneratedStory(currentStory);
      }

      // ЭТАП 4. Итоговая техническая проверка.
      setGenerationStage('Проверяю структуру и хронометраж...');

      const finalStory = [seriesInfo, ...scenes]
        .filter(Boolean)
        .join('\n\n');

      const sceneTotal = countScenes(finalStory);

      const sceneWordCounts = scenes.map((scene) =>
        countDialogueWords(scene)
      );

      const spokenWords = sceneWordCounts.reduce(
        (total, words) => total + words,
        0
      );

      const estimatedSeconds =
        Math.round((spokenWords / 140) * 60) + 8;

      const warnings: string[] = [];

      if (sceneTotal !== SCENE_COUNT) {
        warnings.push(
          `Обнаружено сцен: ${sceneTotal}. Требуется ровно ${SCENE_COUNT}.`
        );
      }

      sceneWordCounts.forEach((words, index) => {
        if (
          words < SCENE_MIN_WORDS ||
          words > SCENE_MAX_WORDS
        ) {
          warnings.push(
            `Сцена ${index + 1}: ${words} произносимых слов. Цель — ${SCENE_MIN_WORDS}–${SCENE_MAX_WORDS}.`
          );
        }
      });

      if (spokenWords < 280) {
        warnings.push(
          `Слишком мало реплик: ${spokenWords} слов. Цель — 280–350 слов.`
        );
      }

      if (spokenWords > 350) {
        warnings.push(
          `Слишком много реплик: ${spokenWords} слов. Цель — 280–350 слов.`
        );
      }

      if (spokenWords === 0) {
        warnings.push(
          'Не удалось распознать реплики. Проверь формат диалогов.'
        );
      }

      if (/[A-Za-z]{2,}/.test(finalStory)) {
        warnings.push(
          'Обнаружены английские фрагменты. Требуется проверка русского языка.'
        );
      }

      const repeatedLines = countRepeatedLines(finalStory);

      if (repeatedLines > 0) {
        warnings.push(
          `Найдены повторяющиеся строки: ${repeatedLines}.`
        );
      }

      if (estimatedSeconds < 120 || estimatedSeconds > 180) {
        warnings.push(
          'Расчётная продолжительность выходит за пределы 2–3 минут.'
        );
      }

      setGenerationReport({
        sceneCount: sceneTotal,
        spokenWords,
        sceneWordCounts,
        estimatedSeconds,
        warnings,
      });

      setGeneratedStory(finalStory);
      setGenerationStage('Генерация и проверка завершены.');
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : 'Не удалось создать сценарий.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ЭТАП 5. Семантическая проверка сценария.
  const handleQualityCheck = async () => {
    if (!generatedStory.trim()) {
      setQualityCheckError('Сначала создай сценарий.');
      return;
    }

    setIsQualityChecking(true);
    setQualityCheckError('');
    setQualityReview('');

    try {
      const review = await askQwen(
        [
          {
            role: 'system',
            content: `
Ты профессиональный редактор киносценариев и специалист по проверке драматургии.

Твоя задача — проверять готовые сценарии, а не переписывать их.
Пиши только на грамотном русском языке.
Будь строгим и объективным.
Не хвали сценарий без оснований.
Не придумывай события, которых нет в тексте.
Отличай подтверждённые ошибки от неясных моментов.
При обнаружении проблемы указывай конкретную сцену.
Не переписывай сценарий.
`,
          },
          {
            role: 'user',
            content: `
Проведи профессиональную проверку этого эпизода.

ИСХОДНАЯ ИДЕЯ:
${idea.trim()}

ГОТОВЫЙ СЦЕНАРИЙ:
${generatedStory}

ПРОВЕРЬ:

1. Соответствие исходной идее.
2. Логику и последовательность событий.
3. Постоянство имён, характеров и отношений персонажей.
4. Мотивацию каждого главного героя.
5. Естественность и качество диалогов.
6. Повторы и бессмысленные фразы.
7. Грамматику и чистоту русского языка.
8. Силу интриги в начале и концовки.
9. Наличие полноценного сюжетного развития в каждой сцене.

ФОРМАТ ОТЧЁТА:

ОБЩАЯ ОЦЕНКА: от 1 до 10.

СТАТУС:
ГОТОВ К ДАЛЬНЕЙШЕЙ РАБОТЕ / НУЖНА ДОРАБОТКА / НЕ ГОТОВ.

СИЛЬНЫЕ СТОРОНЫ:
Только реальные достоинства.

КРИТИЧЕСКИЕ ОШИБКИ:
Конкретные ошибки с указанием сцены.

ПРОВЕРКА ПЕРСОНАЖЕЙ:
Последовательность поведения каждого героя.

ПРОВЕРКА СЦЕН:
Отдельно оцени сцены 1, 2, 3, 4 и 5.

ПОВТОРЫ И ЯЗЫК:
Укажи найденные проблемы.

КОНЦОВКА:
Оцени интригу и желание смотреть следующую серию.

ЧТО ИСПРАВИТЬ:
Не более пяти конкретных рекомендаций.

Не переписывай сценарий.
Не добавляй придуманные факты.
Выведи только редакторский отчёт.
`,
          },
        ],
        2600,
        0.25
      );

      setQualityReview(review);
    } catch (error) {
      setQualityCheckError(
        error instanceof Error
          ? error.message
          : 'Не удалось проверить качество сценария.'
      );
    } finally {
      setIsQualityChecking(false);
    }
  };

  const reservedCount = workspace.agentSlots.filter(
    (s) => s.status === 'reserved'
  ).length;

  const openSlotEditor = (slot: AgentSlot) => {
    setEditingSlot(slot);
    setName(slot.name);
    setRole(slot.role);

    setTargetModelCategory(
      slot.targetModelCategory === 'Не выбрано'
        ? 'Текст и сценарии'
        : slot.targetModelCategory
    );

    setNotes(slot.notes);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingSlot) return;

    updateAgentSlot(editingSlot.slotNumber, {
      status: 'reserved',
      name:
        name.trim() ||
        `Агент #${String(editingSlot.slotNumber).padStart(2, '0')}`,
      role: role.trim() || 'Черновик роли (ИИ не подключён)',
      targetModelCategory,
      notes: notes.trim(),
    });

    setEditingSlot(null);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* AI Scriptwriter */}
      <div className="rounded-xl border border-[#7C3AED]/40 bg-[#0B1120] p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            AI Scriptwriter — Qwen 3.5 4B
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Планирование, генерация пяти сцен и автоматическая коррекция объёма.
          </p>

          <p className="mt-2 text-xs text-violet-300">
            Формат эпизода: 2–3 минуты · 5 сцен · 280–350 произносимых слов.
          </p>
        </div>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Опиши идею мини-сериала: герои, конфликт, тайна, предательство или другой сюжет..."
          rows={4}
          disabled={isGenerating}
          className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-3 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none disabled:opacity-60"
        />

        <button
          type="button"
          onClick={handleGenerateStory}
          disabled={isGenerating || isQualityChecking}
          className="rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {isGenerating
            ? 'Qwen создаёт эпизод...'
            : 'Создать эпизод 2–3 минуты'}
        </button>

        {generationStage && (
          <p className="text-xs text-violet-300">
            {generationStage}
          </p>
        )}

        {generationError && (
          <p className="text-sm text-rose-400">
            {generationError}
          </p>
        )}

        {generatedStory && (
          <div className="rounded-lg border border-[#1E293B] bg-[#060913] p-4 space-y-4">
            <div>
              <h3 className="mb-3 font-semibold text-white">
                Готовый сценарий
              </h3>

              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {generatedStory}
              </div>
            </div>

            <div className="border-t border-[#1E293B] pt-4 space-y-3">
              <button
                type="button"
                onClick={handleQualityCheck}
                disabled={isGenerating || isQualityChecking}
                className="inline-flex items-center gap-2 rounded-lg border border-[#7C3AED]/50 bg-[#18112B] px-4 py-2.5 text-sm font-semibold text-violet-200 hover:bg-[#261A42] disabled:opacity-50"
              >
                {isQualityChecking ? (
                  <Search className="h-4 w-4 animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}

                {isQualityChecking
                  ? 'Qwen проверяет сценарий...'
                  : 'Проверить качество сценария'}
              </button>

              {isQualityChecking && (
                <p className="text-xs text-violet-300">
                  Проверяю логику, персонажей, диалоги, повторы и концовку...
                </p>
              )}

              {qualityCheckError && (
                <p className="text-sm text-rose-400">
                  {qualityCheckError}
                </p>
              )}

              {qualityReview && (
                <div className="rounded-lg border border-[#7C3AED]/30 bg-[#0B1120] p-4">
                  <h3 className="mb-3 font-semibold text-white">
                    Отчёт AI Story Quality Control
                  </h3>

                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {qualityReview}
                  </div>

                  <p className="mt-4 border-t border-[#1E293B] pt-3 text-[11px] text-slate-500">
                    Это оценка нейросети. Она помогает находить проблемы,
                    но не гарантирует отсутствие всех ошибок.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generation Report */}
      {generationReport && (
        <div className="rounded-xl border border-[#1E293B] bg-[#0B1120] p-5 space-y-4">
          <h3 className="font-semibold text-white">
            Автоматическая проверка эпизода
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Количество сцен</p>
              <p className="text-lg font-semibold text-white">
                {generationReport.sceneCount} / 5
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Произносимые слова
              </p>
              <p className="text-lg font-semibold text-white">
                {generationReport.spokenWords}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Оценка длительности
              </p>
              <p className="text-lg font-semibold text-white">
                {formatDuration(generationReport.estimatedSeconds)}
              </p>
            </div>
          </div>

          <div className="border-t border-[#1E293B] pt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Объём диалогов по сценам
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {generationReport.sceneWordCounts.map((words, index) => {
                const inRange =
                  words >= SCENE_MIN_WORDS &&
                  words <= SCENE_MAX_WORDS;

                return (
                  <div
                    key={index}
                    className="rounded-lg border border-[#1E293B] bg-[#060913] p-2"
                  >
                    <p className="text-[11px] text-slate-500">
                      Сцена {index + 1}
                    </p>

                    <p
                      className={`text-sm font-semibold ${
                        inRange ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {words} слов
                    </p>

                    <p className="text-[10px] text-slate-500">
                      Цель: {SCENE_MIN_WORDS}–{SCENE_MAX_WORDS}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] leading-5 text-slate-500">
            Расчёт сделан по распознанным репликам при скорости 140 слов
            в минуту и небольших паузах между сценами. Фактическую
            длительность нужно будет проверить после озвучки.
          </p>

          {generationReport.warnings.length > 0 ? (
            <div className="border-t border-[#1E293B] pt-3 space-y-2">
              <p className="text-xs font-semibold text-amber-300">
                Нужно проверить:
              </p>

              {generationReport.warnings.map((warning, index) => (
                <p
                  key={index}
                  className="text-xs text-amber-200"
                >
                  • {warning}
                </p>
              ))}
            </div>
          ) : (
            <p className="border-t border-[#1E293B] pt-3 text-xs text-emerald-400">
              Структура, объём реплик и предварительный хронометраж
              соответствуют заданным ограничениям.
            </p>
          )}
        </div>
      )}

      {/* Agent Slots */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1E293B] bg-[#0B1120] p-5">
        <div>
          <h2 className="text-base font-semibold text-white">
            Реестр слотов агентов (10 слотов)
          </h2>

          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            На текущем этапе фундамента ИИ-агенты не создаются и не
            запускаются. Здесь подготовлены 10 изолированных слотов для
            планирования будущей архитектуры автоматизации.
          </p>
        </div>

        <div className="text-right font-mono-tabular">
          <div className="text-xs text-slate-400">
            Занято черновиками
          </div>
          <div className="text-xl font-bold text-white">
            {reservedCount} / 10
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {workspace.agentSlots.map((slot) => {
          const isEmpty = slot.status === 'empty';
          const slotIndex = String(slot.slotNumber).padStart(2, '0');

          return (
            <div
              key={slot.slotNumber}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                isEmpty
                  ? 'border-dashed border-[#1E293B] bg-[#0B1120]/60'
                  : 'border-[#7C3AED]/40 bg-[#0B1120]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-semibold text-slate-400">
                    Слот {slotIndex}
                  </span>

                  <span
                    className={`text-xs font-medium ${
                      isEmpty ? 'text-slate-500' : 'text-[#A78BFA]'
                    }`}
                  >
                    {isEmpty ? 'Пустой слот' : 'Черновик'}
                  </span>
                </div>

                {isEmpty ? (
                  <div className="my-6 flex flex-col items-center text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B] bg-[#060913] text-slate-500">
                      <Bot className="h-5 w-5" />
                    </div>

                    <div className="mt-3 text-xs font-medium text-slate-400">
                      Свободный слот
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500">
                      Готов к резервированию роли
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-semibold text-white truncate">
                      {slot.name}
                    </div>

                    <div className="text-xs text-slate-300 line-clamp-2">
                      {slot.role}
                    </div>

                    <div className="pt-1 text-[11px] text-slate-500">
                      Модуль: {slot.targetModelCategory}
                    </div>

                    {slot.notes && (
                      <p className="line-clamp-2 text-[11px] text-slate-400">
                        {slot.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[#1E293B] pt-3">
                <button
                  type="button"
                  onClick={() => openSlotEditor(slot)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#060913] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#7C3AED] hover:text-white whitespace-nowrap"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{isEmpty ? 'Резервировать' : 'Изменить'}</span>
                </button>

                {!isEmpty && (
                  <button
                    type="button"
                    onClick={() => clearAgentSlot(slot.slotNumber)}
                    title="Очистить слот"
                    aria-label={`Очистить слот ${slotIndex}`}
                    className="rounded-lg border border-[#1E293B] p-1.5 text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slot Reservation Modal */}
      {editingSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[#1E293B] bg-[#0B1120] p-6">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-semibold text-white">
                Настройка черновика — Слот{' '}
                {String(editingSlot.slotNumber).padStart(2, '0')}
              </h3>

              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="mt-4 space-y-4">
              <p className="text-xs text-slate-400">
                Это только резервная спецификация. Автоматическое
                выполнение и ИИ-вызовы не выполняются.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Название роли (планируемое)
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Сценарист тизеров"
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Зона ответственности
                </label>

                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Например: Подготовка структуры сцен"
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Целевой тип подключения API
                </label>

                <select
                  value={targetModelCategory}
                  onChange={(e) =>
                    setTargetModelCategory(e.target.value)
                  }
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none"
                >
                  <option value="Текст и сценарии">
                    Текст и сценарии
                  </option>
                  <option value="Изображения">Изображения</option>
                  <option value="Видео-генерация">Видео-генерация</option>
                  <option value="Аудио и голос">Аудио и голос</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Технические заметки
                </label>

                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ожидаемый формат входа/выхода..."
                  className="w-full rounded-lg border border-[#1E293B] bg-[#060913] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#1E293B] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="rounded-lg border border-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#111827]"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  Сохранить черновик
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
