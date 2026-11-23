
import React, { useState } from 'react';
import {
  Bot,
  Edit3,
  RotateCcw,
  X,
  CheckCircle2,
  Search,
  Clapperboard,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { AgentSlot } from '../types/studio';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const QWEN_MODEL = 'qwen3.5:4b';

const SCENE_COUNT = 5;
const TARGET_MIN_WORDS = 280;
const TARGET_MAX_WORDS = 350;
const SCENE_GUIDE_MIN = 45;
const SCENE_GUIDE_MAX = 80;

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
Ты профессиональный сценарист и редактор драматических мини-сериалов.

ГЛАВНЫЙ ПРИОРИТЕТ:
Создавай логичную, эмоциональную и законченную историю.
Качество сюжета и естественность диалогов важнее механического соблюдения количества слов.

ЯЗЫК:
1. Пиши исключительно на грамотном русском языке.
2. Используй естественные современные диалоги.
3. Не создавай бессмысленных и испорченных предложений.
4. Не повторяй предложения и информацию.
5. Не используй английские слова без необходимости.

ПЕРСОНАЖИ:
1. Не меняй имена, пол, отношения и роли.
2. Не заставляй персонажа знать то, чего он ещё не мог узнать.
3. Сохраняй характер и мотивацию героев.
4. Не добавляй персонажей без необходимости.
5. Не путай действия и реплики разных персонажей.

ЛОГИКА:
1. Каждое событие должно иметь понятную причину.
2. Каждая сцена должна продолжать предыдущую.
3. Не противоречь установленным фактам.
4. Не вводи случайные документы, улики и события без объяснения.
5. Разрешай главные сюжетные вопросы.

ФОРМАТ:
1. Разделяй описание действий и диалоги.
2. Реплики оформляй так: ИМЯ: текст.
3. Не описывай камеру и монтаж.
4. Не показывай рассуждения и черновики.
5. Выполняй только указанную задачу.
`;

const DIRECTOR_SYSTEM = `
Ты профессиональный кинорежиссёр, оператор-постановщик и специалист по визуальному повествованию.

Твоя задача — превратить одну сцену готового сценария в профессиональный план AI-видеопроизводства.

ПРАВИЛА:
1. Работай только с событиями исходного сценария.
2. Не переписывай сюжет и диалоги.
3. Не добавляй новых персонажей, событий и локаций.
4. Сохраняй внешность, возраст, одежду и особенности персонажей.
5. Соблюдай последовательность событий.
6. Каждый кадр должен передавать конкретный момент сценария.
7. Используй разнообразные планы: общий, средний, крупный и детальный.
8. Указывай движение камеры только там, где оно необходимо.
9. Указывай действия, эмоции, освещение и атмосферу.
10. Не добавляй случайные визуальные детали.
11. Пиши на русском языке.
12. Не показывай рассуждения и черновики.

ФОРМАТ:

СЦЕНА:
КРАТКОЕ СОДЕРЖАНИЕ:

КАДР 1:
ДЛИТЕЛЬНОСТЬ:
МЕСТО:
ПЕРСОНАЖИ:
ТИП ПЛАНА:
РАКУРС:
ДЕЙСТВИЕ:
ЭМОЦИИ:
ДВИЖЕНИЕ КАМЕРЫ:
ОСВЕЩЕНИЕ:
ВИЗУАЛЬНОЕ ОПИСАНИЕ:

Повтори структуру для каждого следующего кадра.

ТРЕБОВАНИЯ К КАДРАМ:
- Создай 3–5 кадров для одной сцены.
- Обычно используй 5–8 секунд на кадр.
- Выбирай длительность по реальному действию.
- Не растягивай простые действия.
- Не объединяй разные действия в один кадр.
- Каждый кадр должен быть пригоден для генерации изображения или видео.
- Не меняй внешность персонажей между кадрами.
- Сохраняй единый визуальный стиль эпизода.

Выведи только режиссёрский план текущей сцены.
`;

const SCENE_PURPOSES = [
  'ЗАВЯЗКА. Начни с сильного события, тревожного открытия или интригующей ситуации. Представь основной конфликт и заинтересуй зрителя.',
  'РАЗВИТИЕ. Покажи последствия первого события. Раскрой мотивы героев и добавь новую информацию.',
  'РАСКРЫТИЕ. Добавь важную улику, секрет или неожиданное обстоятельство, которое логически вытекает из известных фактов.',
  'КУЛЬМИНАЦИЯ. Усиль конфликт. Герои сталкиваются с последствиями своих решений. Подготовь логическую основу развязки.',
  'РАЗВЯЗКА. Раскрой главную тайну, покажи неожиданный поворот и последствия конфликта. Заверши основную историю полноценным финалом.',
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
      `Qwen достигла лимита ${numPredict} токенов и оборвала ответ. Уменьши объём задачи или увеличь лимит для этого этапа.`
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

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
}

function extractSceneBlocks(script: string): string[] {
  const headingPattern =
    /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*СЦЕНА\s*(?:№\s*)?\d+\b[^\n]*/gim;

  const matches = [...script.matchAll(headingPattern)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end =
      index < matches.length - 1
        ? matches[index + 1].index ?? script.length
        : script.length;

    return script.slice(start, end).trim();
  });
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

  const [continuityAudit, setContinuityAudit] = useState('');

  const [qualityReview, setQualityReview] = useState('');
  const [isQualityChecking, setIsQualityChecking] = useState(false);
  const [qualityCheckError, setQualityCheckError] = useState('');

  const [directorPlan, setDirectorPlan] = useState('');
  const [isDirecting, setIsDirecting] = useState(false);
  const [directorError, setDirectorError] = useState('');
  const [directorStage, setDirectorStage] = useState('');

  // Генерация сценария.
  const handleGenerateStory = async () => {
    if (!idea.trim()) {
      setGenerationError('Сначала напишите идею истории.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGenerationStage('Создаю сюжетную основу и фиксирую персонажей...');
    setGeneratedStory('');
    setGenerationReport(null);
    setContinuityAudit('');
    setQualityReview('');
    setQualityCheckError('');
    setDirectorPlan('');
    setDirectorError('');
    setDirectorStage('');

    try {
      // ЭТАП 1. Сюжетная основа.
      const outline = await askQwen(
        [
          {
            role: 'system',
            content: SCRIPTWRITER_SYSTEM,
          },
          {
            role: 'user',
            content: `
Создай сюжетную основу одного законченного эпизода мини-сериала.

ИДЕЯ:
${idea.trim()}

ОПРЕДЕЛИ:
1. Главного героя и его цель.
2. Главный конфликт.
3. Мотивацию важных персонажей.
4. Тайну, которую скрывают герои.
5. Что известно каждому герою.
6. Причину возникновения конфликта.
7. Развитие событий.
8. Реальную причину происходящего.
9. Разрешение конфликта в финале.

ТРЕБОВАНИЯ:
1. Эпизод на 2–3 минуты озвучки.
2. Ровно пять сцен.
3. Сохрани идею, жанр и персонажей пользователя.
4. Не меняй имена и отношения.
5. Каждая сцена логически продолжает предыдущую.
6. Не допускай противоречий.
7. Пятая сцена раскрывает главную тайну и завершает историю.
8. Не оставляй главную проблему нерешённой.
9. Можно оставить небольшую интригу для следующего эпизода.
10. Не пиши готовые диалоги.

ФОРМАТ:

НАЗВАНИЕ:
ЖАНР:

ПЕРСОНАЖИ:
Имя, роль, характер, цель и мотивация.

ОСНОВНЫЕ ФАКТЫ:
Важные факты, которые нельзя менять.

ГЛАВНАЯ ТАЙНА:
Что произошло на самом деле.

ПОСЛЕДОВАТЕЛЬНОСТЬ СОБЫТИЙ:
Как одно событие приводит к следующему.

ПЛАН ПЯТИ СЦЕН:
СЦЕНА 1: цель, событие, результат.
СЦЕНА 2: цель, событие, результат.
СЦЕНА 3: цель, событие, результат.
СЦЕНА 4: цель, событие, результат.
СЦЕНА 5: раскрытие тайны, разрешение конфликта и финал.

Выведи только сюжетную основу.
`,
          },
        ],
        2200,
        0.35
      );

      const planMarker = outline.search(
        /ПЛАН\s+(?:ПЯТИ\s+)?СЦЕН/i
      );

      const seriesInfo =
        planMarker >= 0
          ? outline.slice(0, planMarker).trim()
          : outline.trim();

      const scenes: string[] = [];

      setGeneratedStory(seriesInfo);

      // ЭТАП 2. Создание пяти сцен.
      for (
        let sceneNumber = 1;
        sceneNumber <= SCENE_COUNT;
        sceneNumber++
      ) {
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
Создай только одну сцену законченного мини-сериала.

ИДЕЯ:
${idea.trim()}

СЮЖЕТНАЯ ОСНОВА:
${outline}

УЖЕ НАПИСАННЫЕ СЦЕНЫ:
${previousScenes}

ТЕКУЩАЯ ЗАДАЧА:
${SCENE_PURPOSES[sceneNumber - 1]}

ОБЪЁМ:
- Весь эпизод должен содержать 280–350 произносимых слов.
- Ориентир для этой сцены — примерно 45–80 произносимых слов.
- Не пытайся искусственно довести каждую сцену до одинакового количества слов.
- Естественность диалогов и логика важнее точного количества слов.
- Не добавляй пустые реплики ради увеличения объёма.

ПРАВИЛА:
1. Напиши только сцену ${sceneNumber}.
2. Используй персонажей из сюжетной основы.
3. Не меняй имена, роли, характеры и отношения.
4. Не противоречь предыдущим сценам.
5. Не заставляй героев знать неизвестную им информацию.
6. Не вводи новые события без причины.
7. Не повторяй уже раскрытую информацию.
8. Каждая сцена должна продвигать сюжет.
9. Реплики оформляй отдельными строками: ИМЯ: текст.
10. Перед диалогами кратко укажи место, время и действие.
11. Не описывай камеру, монтаж и ракурсы.
12. Пиши естественные диалоги на русском языке.
13. Не добавляй другие сцены.
14. Не объясняй свои действия.

ДОПОЛНИТЕЛЬНО ДЛЯ СЦЕНЫ 5:
- Раскрой главную тайну.
- Объясни мотивы обмана или предательства, если они есть.
- Покажи последствия действий героев.
- Разреши основной конфликт.
- Дай понятный эмоциональный финал.
- Не заменяй развязку пустым клиффхэнгером.

Верни только сцену ${sceneNumber}.
`,
            },
          ],
          2500,
          0.45
        );

        const normalizedScene = normalizeSceneHeading(
          currentScene,
          sceneNumber
        );

        scenes.push(normalizedScene);

        const currentStory = [seriesInfo, ...scenes]
          .filter(Boolean)
          .join('\n\n');

        setGeneratedStory(currentStory);
      }

      // ЭТАП 3. Техническая проверка.
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

      if (spokenWords < TARGET_MIN_WORDS) {
        warnings.push(
          `Недостаточно произносимых слов: ${spokenWords}. Цель — ${TARGET_MIN_WORDS}–${TARGET_MAX_WORDS}.`
        );
      }

      if (spokenWords > TARGET_MAX_WORDS) {
        warnings.push(
          `Слишком много произносимых слов: ${spokenWords}. Цель — ${TARGET_MIN_WORDS}–${TARGET_MAX_WORDS}.`
        );
      }

      if (spokenWords === 0) {
        warnings.push(
          'Не удалось распознать реплики. Проверь формат диалогов.'
        );
      }

      if (/[A-Za-z]{2,}/.test(finalStory)) {
        warnings.push(
          'Обнаружены английские фрагменты. Проверь чистоту русского языка.'
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

      // Очень короткая или чрезмерно длинная сцена требует внимания.
      sceneWordCounts.forEach((words, index) => {
        if (words > 0 && (words < 35 || words > 90)) {
          warnings.push(
            `Сцена ${index + 1}: ${words} слов. Проверь, достаточно ли она развита и не перегружена.`
          );
        }
      });

      setGenerationReport({
        sceneCount: sceneTotal,
        spokenWords,
        sceneWordCounts,
        estimatedSeconds,
        warnings,
      });

      setGeneratedStory(finalStory);

      // ЭТАП 4. Проверка логики.
      setGenerationStage(
        'Проверяю логику, персонажей и завершённость истории...'
      );

      try {
        const audit = await askQwen(
          [
            {
              role: 'system',
              content: `
Ты строгий редактор сценариев.
Проверяй только факты, которые действительно присутствуют в тексте.
Не придумывай ошибки.
Не переписывай сценарий.
Отвечай кратко и по существу.
`,
            },
            {
              role: 'user',
              content: `
Проверь законченный сценарий по его сюжетной основе.

СЮЖЕТНАЯ ОСНОВА:
${outline}

СЦЕНАРИЙ:
${finalStory}

ПРОВЕРЬ:
1. Не изменились ли имена, роли и отношения персонажей?
2. Есть ли противоречия между сценами?
3. Понятны ли причины и последствия событий?
4. Не появляются ли необъяснимые улики и события?
5. Получает ли зритель ответы на главные вопросы?
6. Завершён ли основной конфликт в пятой сцене?
7. Нет ли бессмысленных или испорченных фраз?

ФОРМАТ:

СТАТУС: ПРОЙДЕН / НУЖНА ДОРАБОТКА / НЕ ПРОЙДЕН

ЛОГИКА:
ПЕРСОНАЖИ:
РАЗВЯЗКА:

ОШИБКИ:
Укажи только конкретные ошибки с номерами сцен.
Если ошибок нет, напиши: Критических ошибок не обнаружено.

Не переписывай сценарий.
`,
            },
          ],
          1200,
          0.15
        );

        setContinuityAudit(audit);

        if (
          /СТАТУС:\s*(?:НУЖНА ДОРАБОТКА|НЕ ПРОЙДЕН)/i.test(audit)
        ) {
          warnings.push(
            'Автоматическая проверка обнаружила возможные проблемы логики или развязки. Прочитай отчёт перед передачей сценария следующему агенту.'
          );
        }
      } catch (auditError) {
        setContinuityAudit(
          auditError instanceof Error
            ? `Автоматическая проверка не завершилась: ${auditError.message}`
            : 'Автоматическая проверка не завершилась.'
        );

        warnings.push(
          'Автоматическая проверка логики не завершилась. Проверь сценарий вручную.'
        );
      }

      setGenerationReport({
        sceneCount: sceneTotal,
        spokenWords,
        sceneWordCounts,
        estimatedSeconds,
        warnings,
      });

      setGenerationStage('Генерация и проверки завершены.');
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

  // AI Director: пять отдельных запросов вместо одного огромного ответа.
  const handleCreateDirectorPlan = async () => {
    if (!generatedStory.trim()) {
      setDirectorError('Сначала создай сценарий в AI Scriptwriter.');
      return;
    }

    setIsDirecting(true);
    setDirectorError('');
    setDirectorPlan('');
    setDirectorStage('Подготавливаю сцены для режиссёрского плана...');

    try {
      const sceneBlocks = extractSceneBlocks(generatedStory);

      if (sceneBlocks.length !== SCENE_COUNT) {
        throw new Error(
          `Не удалось выделить пять сцен из сценария. Найдено: ${sceneBlocks.length}. Сначала создай новый сценарий.`
        );
      }

      const directorSections: string[] = [];

      for (
        let sceneNumber = 1;
        sceneNumber <= SCENE_COUNT;
        sceneNumber++
      ) {
        setDirectorStage(
          `AI Director создаёт план сцены ${sceneNumber} из ${SCENE_COUNT}...`
        );

        const currentScene = sceneBlocks[sceneNumber - 1];

        const previousDirectorWork =
          directorSections.length > 0
            ? directorSections.join('\n\n')
            : 'Это первая сцена. Определи визуальные особенности персонажей и используй их как основу для постоянства внешности.';

        const scenePlan = await askQwen(
          [
            {
              role: 'system',
              content: DIRECTOR_SYSTEM,
            },
            {
              role: 'user',
              content: `
Создай режиссёрский план ТОЛЬКО для сцены ${sceneNumber} из пяти.

ИСХОДНЫЙ СЦЕНАРИЙ ВСЕГО ЭПИЗОДА:
${generatedStory}

ПРЕДЫДУЩИЕ РЕЖИССЁРСКИЕ РЕШЕНИЯ:
${previousDirectorWork}

ТЕКУЩАЯ СЦЕНА:
${currentScene}

ОБЩИЕ ТРЕБОВАНИЯ:
1. Сохрани события и диалоги исходного сценария.
2. Не добавляй новые события.
3. Используй 3–5 отдельных кадров.
4. Каждый кадр должен описывать один конкретный визуальный момент.
5. У каждого кадра укажи все поля из формата.
6. Сохраняй одинаковую внешность и одежду персонажей.
7. Сохраняй единый визуальный стиль всего эпизода.
8. Используй предыдущие режиссёрские решения для постоянства персонажей.
9. Не повторяй предыдущие кадры.
10. Не создавай кадры для других сцен.
11. Продолжительность кадров должна соответствовать действию.
12. Общая длительность пяти сцен ориентировочно 120–180 секунд.
13. Для текущей сцены ориентируйся примерно на 24–36 секунд.
14. Не растягивай простые действия ради хронометража.

ВЫВЕДИ ТОЛЬКО РЕЖИССЁРСКИЙ ПЛАН СЦЕНЫ ${sceneNumber}.
`,
            },
          ],
          2200,
          0.3
        );

        const section = `\n\n${scenePlan.trim()}`;

        directorSections.push(section);

        setDirectorPlan(directorSections.join('\n'));
      }

      setDirectorStage('Режиссёрский план всех пяти сцен готов.');
    } catch (error) {
      setDirectorError(
        error instanceof Error
          ? error.message
          : 'Не удалось создать режиссёрский план.'
      );
    } finally {
      setIsDirecting(false);
    }
  };

  // Подробная проверка качества.
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
Ты профессиональный редактор киносценариев и специалист по драматургии.

Твоя задача — строго проверять готовые сценарии, а не переписывать их.
Пиши на грамотном русском языке.
Не хвали сценарий без оснований.
Не придумывай события, которых нет в тексте.
Отличай реальные ошибки от неясных моментов.
При обнаружении проблемы указывай конкретную сцену.
Не переписывай сценарий.
`,
          },
          {
            role: 'user',
            content: `
Проведи профессиональную проверку эпизода.

ИСХОДНАЯ ИДЕЯ:
${idea.trim()}

ГОТОВЫЙ СЦЕНАРИЙ:
${generatedStory}

ПРОВЕРЬ:
1. Соответствие исходной идее.
2. Логику и последовательность событий.
3. Постоянство имён, характеров и отношений персонажей.
4. Мотивацию главных героев.
5. Естественность диалогов.
6. Повторы и бессмысленные фразы.
7. Грамматику и чистоту русского языка.
8. Интригу в начале.
9. Развитие сюжета в каждой сцене.
10. Полноценность финала.
11. Разрешение главного конфликта.
12. Отсутствие необъяснимых сюжетных событий.

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

РАЗВЯЗКА:
Оцени, завершён ли основной конфликт и понятны ли последствия.

ЧТО ИСПРАВИТЬ:
Не более пяти конкретных рекомендаций.

Не переписывай сценарий.
Не добавляй придуманные факты.
Выведи только редакторский отчёт.
`,
          },
        ],
        2200,
        0.2
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
            Сюжетная основа, пять связанных сцен, проверка логики и развязки.
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
          disabled={isGenerating || isQualityChecking || isDirecting}
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
                disabled={isGenerating || isQualityChecking || isDirecting}
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
                  Проверяю логику, персонажей, диалоги, повторы и развязку...
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

      {/* AI Director */}
      <div className="rounded-xl border border-[#0D9488]/40 bg-[#0B1120] p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-teal-300" />
            <h2 className="text-lg font-semibold text-white">
              AI Director — Qwen 3.5 4B
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Превращает готовый сценарий в режиссёрский план для последующей
            генерации изображений и видео.
          </p>

          <p className="mt-2 text-xs text-teal-300">
            Кадры · планы камеры · действия · эмоции · освещение · хронометраж.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateDirectorPlan}
          disabled={
            !generatedStory.trim() ||
            isGenerating ||
            isQualityChecking ||
            isDirecting
          }
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Clapperboard className="h-4 w-4" />
          {isDirecting
            ? 'Qwen создаёт режиссёрский план...'
            : 'Создать режиссёрский план'}
        </button>

        {!generatedStory.trim() && (
          <p className="text-xs text-slate-500">
            Сначала создай сценарий в AI Scriptwriter. После этого кнопка станет доступна.
          </p>
        )}

        {isDirecting && (
          <p className="text-xs text-teal-300">
            {directorStage || 'Создаю последовательность кадров...'}
            {' '}Генерация выполняется отдельно для каждой сцены.
          </p>
        )}

        {directorError && (
          <p className="text-sm text-rose-400">
            {directorError}
          </p>
        )}

        {directorPlan && (
          <div className="rounded-lg border border-[#134E4A] bg-[#060913] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-white">
                Режиссёрский план эпизода
              </h3>

              <span className="rounded-md border border-teal-800 bg-teal-950 px-2 py-1 text-[11px] text-teal-300">
                AI Director
              </span>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {directorPlan}
            </div>

            <p className="border-t border-[#1E293B] pt-3 text-[11px] text-slate-500">
              Режиссёрский план создаётся по одной сцене за запрос.
              Перед передачей следующему агенту проверь постоянство персонажей,
              последовательность кадров и общую продолжительность.
            </p>
          </div>
        )}
      </div>

      {/* Automatic Continuity Audit */}
      {continuityAudit && (
        <div className="rounded-xl border border-[#7C3AED]/30 bg-[#0B1120] p-5 space-y-3">
          <h3 className="font-semibold text-white">
            Автоматическая проверка логики
          </h3>

          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {continuityAudit}
          </div>

          <p className="text-[11px] text-slate-500">
            Проверка выполнена Qwen. Перед передачей сценария следующему
            агенту оцени результат самостоятельно.
          </p>
        </div>
      )}

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
                const unusuallyShortOrLong =
                  words > 0 &&
                  (words < 35 || words > 90);

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
                        unusuallyShortOrLong
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {words} слов
                    </p>

                    <p className="text-[10px] text-slate-500">
                      Ориентир: {SCENE_GUIDE_MIN}–{SCENE_GUIDE_MAX}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] leading-5 text-slate-500">
            Расчёт сделан по распознанным репликам при скорости 140 слов
            в минуту и небольших паузах между сценами. Длина отдельных сцен
            может отличаться. Фактическую длительность нужно проверить после озвучки.
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
              Структура, общий объём реплик и предварительный хронометраж
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
