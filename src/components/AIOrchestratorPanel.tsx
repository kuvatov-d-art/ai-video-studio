
import React, { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  RotateCcw,
  Send,
  AlertCircle,
} from 'lucide-react';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const QWEN_MODEL = 'qwen3:8b';

type AgentStatus = 'waiting' | 'running' | 'done' | 'error';

type AgentDefinition = {
  id: string;
  name: string;
  role: string;
  system: string;
  task: string;
  maxTokens: number;
};

type AgentState = {
  status: AgentStatus;
  result: string;
  error: string;
};

type Props = {
  initialStory: string;
  onApplyFinalStory: (story: string) => void;
};

const AGENTS: AgentDefinition[] = [
  {
    id: 'architect',
    name: 'Story Architect',
    role: 'Архитектор сюжета',
    system:
      'Ты опытный архитектор драматических историй. Анализируй структуру, причинно-следственные связи и завершённость сюжета. Не переписывай сценарий.',
    task: `
Проанализируй архитектуру истории.

Проверь:
1. Есть ли понятное начало, развитие, кульминация и финал.
2. Понятен ли главный конфликт.
3. Связаны ли события причинно-следственными отношениями.
4. Не возникает ли сюжетных скачков.
5. Завершена ли история.

Верни краткий отчёт:
СТРУКТУРА:
СИЛЬНЫЕ СТОРОНЫ:
ПРОБЛЕМЫ:
РЕКОМЕНДАЦИИ:

Не переписывай сценарий.`,
    maxTokens: 850,
  },
  {
    id: 'characters',
    name: 'Character Agent',
    role: 'Агент персонажей',
    system:
      'Ты специалист по разработке персонажей и непрерывности сценария. Проверяй только факты, содержащиеся в тексте. Не придумывай биографию без оснований.',
    task: `
Проверь персонажей и их непрерывность.

Проверь:
1. Имена, пол, роли и отношения.
2. Мотивы и цели каждого важного персонажа.
3. Не меняются ли характеры без причины.
4. Не знают ли герои информацию, которую не могли получить.
5. Не противоречат ли поступки ранее установленным фактам.

Верни:
ПЕРСОНАЖИ:
НАЙДЕННЫЕ ПРОТИВОРЕЧИЯ:
НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:

Если ошибок нет, прямо укажи это. Не переписывай сценарий.`,
    maxTokens: 850,
  },
  {
    id: 'plot',
    name: 'Plot Agent',
    role: 'Агент интриги и поворотов',
    system:
      'Ты сценарный аналитик, специализирующийся на интриге, драматическом напряжении и сюжетных поворотах.',
    task: `
Проверь интригу и развитие конфликта.

Оцени:
1. Заинтересовывает ли начало.
2. Есть ли напряжение между сценами.
3. Достаточно ли убедительны секреты и улики.
4. Подготовлен ли неожиданный поворот заранее.
5. Не выглядит ли финал случайным или искусственным.
6. Есть ли эмоциональный эффект в развязке.

Верни:
ИНТРИГА:
НАПРЯЖЕНИЕ:
СЮЖЕТНЫЙ ПОВОРОТ:
СЛАБЫЕ МЕСТА:
КОНКРЕТНЫЕ РЕКОМЕНДАЦИИ:

Не переписывай сценарий.`,
    maxTokens: 900,
  },
  {
    id: 'screenwriter',
    name: 'Screenwriter',
    role: 'Сценарист сцен и диалогов',
    system:
      'Ты профессиональный сценарист. Твоя задача — находить конкретные недостатки сцен и диалогов, не изменяя историю целиком.',
    task: `
Проведи редакторский анализ сцен и диалогов.

Проверь:
1. Естественность диалогов.
2. Эмоциональность и убедительность реплик.
3. Темп каждой сцены.
4. Повторяющуюся информацию.
5. Слабые или лишние реплики.
6. Достаточность действий между диалогами.

Для каждой проблемы укажи номер сцены и конкретное предложение по улучшению.

ФОРМАТ:
СЦЕНА 1:
СЦЕНА 2:
СЦЕНА 3:
СЦЕНА 4:
СЦЕНА 5:

Если сцена не требует изменений, напиши: Без замечаний.

Не создавай новый сценарий. Не переписывай все сцены.`,
    maxTokens: 1100,
  },
  {
    id: 'editor',
    name: 'Editor Agent',
    role: 'Редактор сценария',
    system:
      'Ты профессиональный редактор сценариев. Исправляй только подтверждённые недостатки. Сохраняй исходную историю, персонажей, события и авторский замысел.',
    task: `
Подготовь отредактированную версию сценария.

Используй отчёты предыдущих агентов как рекомендации, а не как безусловные факты.

ПРАВИЛА:
1. Сохрани исходный сюжет и главную идею.
2. Не меняй имена, пол, роли и отношения персонажей.
3. Не добавляй новых персонажей и сюжетных линий.
4. Исправляй только обоснованные ошибки.
5. Сохрани ровно пять сцен.
6. Сохрани полноценную развязку.
7. Улучши слабые диалоги, если это действительно необходимо.
8. Не добавляй пояснения, отчёты и комментарии.
9. Не сокращай историю без необходимости.
10. Если замечания противоречат исходному тексту, сохрани исходный факт.

ВЫВЕДИ:
Только полный исправленный сценарий, начиная с названия и заканчивая финалом.
Не добавляй вступление или заключение.`,
    maxTokens: 2400,
  },
  {
    id: 'quality',
    name: 'Quality Agent',
    role: 'Контроль качества',
    system:
      'Ты строгий независимый контролёр качества сценариев. Не хвали текст без оснований. Проверяй факты и конкретные ошибки.',
    task: `
Проведи финальную проверку отредактированного сценария.

ПРОВЕРЬ:
1. Ровно ли пять сцен.
2. Сохранились ли имена и отношения персонажей.
3. Нет ли противоречий между сценами.
4. Логичны ли причины и последствия.
5. Нет ли повторов и бессмысленных диалогов.
6. Подготовлен ли сюжетный поворот.
7. Есть ли полноценная развязка.
8. Завершена ли история.

ФОРМАТ:
СТАТУС: ПРОЙДЕН / НУЖНА ДОРАБОТКА

СТРУКТУРА:
ПЕРСОНАЖИ:
ЛОГИКА:
ДИАЛОГИ:
РАЗВЯЗКА:

КРИТИЧЕСКИЕ ОШИБКИ:
Укажи конкретные сцены и проблемы.

ВАЖНО:
Не переписывай сценарий.
Не выдумывай ошибки.
Если критических проблем нет, укажи: Критических ошибок не обнаружено.`,
    maxTokens: 1000,
  },
];

const createInitialStates = (): Record<string, AgentState> =>
  Object.fromEntries(
    AGENTS.map((agent) => [
      agent.id,
      { status: 'waiting', result: '', error: '' },
    ])
  );

async function askQwen(
  system: string,
  user: string,
  maxTokens: number
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
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        think: false,
        stream: false,
        options: {
          temperature: 0.25,
          top_p: 0.9,
          repeat_penalty: 1.08,
          num_predict: maxTokens,
        },
      }),
    });
  } catch {
    throw new Error(
      'Нет соединения с Ollama. Проверь, что Ollama запущена на этом компьютере.'
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка Ollama.');
  }

  if (data.done_reason === 'length') {
    throw new Error(
      `Qwen достигла лимита ${maxTokens} токенов и оборвала ответ.`
    );
  }

  const result = String(data.message?.content || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  if (!result) {
    throw new Error('Qwen вернула пустой ответ.');
  }

  return result;
}

const statusLabel: Record<AgentStatus, string> = {
  waiting: 'Ожидание',
  running: 'Работает',
  done: 'Завершён',
  error: 'Ошибка',
};

export const AIOrchestratorPanel: React.FC<Props> = ({
  initialStory,
  onApplyFinalStory,
}) => {
  const [states, setStates] = useState<Record<string, AgentState>>(
    createInitialStates
  );
  const [isRunning, setIsRunning] = useState(false);
  const [finalDraft, setFinalDraft] = useState('');
  const [pipelineError, setPipelineError] = useState('');

  const updateAgent = (id: string, patch: Partial<AgentState>) => {
    setStates((previous) => ({
      ...previous,
      [id]: { ...previous[id], ...patch },
    }));
  };

  const runOneAgent = async (
    agent: AgentDefinition,
    sourceScript: string,
    previousResults: Record<string, string>
  ) => {
    updateAgent(agent.id, {
      status: 'running',
      error: '',
    });

    const reports = AGENTS.filter(
      (item) => previousResults[item.id]
    )
      .map(
        (item) =>
          `ОТЧЁТ ${item.name}:\n${previousResults[item.id]}`
      )
      .join('\n\n');

    const prompt = `
ИСХОДНЫЙ СЦЕНАРИЙ:
${sourceScript.slice(0, 8500)}

ОТЧЁТЫ ПРЕДЫДУЩИХ АГЕНТОВ:
${reports.slice(0, 5000) || 'Предыдущих отчётов пока нет.'}

ЗАДАЧА:
${agent.task}

Работай только с предоставленным материалом.
`;

    try {
      const result = await askQwen(
        agent.system,
        prompt,
        agent.maxTokens
      );

      updateAgent(agent.id, {
        status: 'done',
        result,
        error: '',
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка.';

      updateAgent(agent.id, {
        status: 'error',
        error: message,
      });

      throw error;
    }
  };

  const runPipeline = async () => {
    if (!initialStory.trim()) {
      setPipelineError(
        'Сначала создай сценарий в AI Scriptwriter.'
      );
      return;
    }

    setIsRunning(true);
    setPipelineError('');
    setFinalDraft('');
    setStates(createInitialStates());

    const results: Record<string, string> = {};
    let currentScript = initialStory.trim();

    try {
      for (const agent of AGENTS) {
        const result = await runOneAgent(
          agent,
          currentScript,
          results
        );

        results[agent.id] = result;

        if (agent.id === 'editor') {
          currentScript = result;
          setFinalDraft(result);
        }
      }
    } catch (error) {
      setPipelineError(
        error instanceof Error
          ? error.message
          : 'Работа цепочки агентов остановлена.'
      );
    } finally {
      setIsRunning(false);
    }
  };

  const retryAgent = async (agent: AgentDefinition) => {
    if (isRunning || !initialStory.trim()) return;

    setIsRunning(true);
    setPipelineError('');

    const results: Record<string, string> = {};

    AGENTS.forEach((item) => {
      if (states[item.id].result) {
        results[item.id] = states[item.id].result;
      }
    });

    const sourceScript =
      agent.id === 'quality' && finalDraft
        ? finalDraft
        : initialStory;

    try {
      const result = await runOneAgent(
        agent,
        sourceScript,
        results
      );

      if (agent.id === 'editor') {
        setFinalDraft(result);
      }
    } catch (error) {
      setPipelineError(
        error instanceof Error
          ? error.message
          : 'Не удалось повторить запуск агента.'
      );
    } finally {
      setIsRunning(false);
    }
  };

  const completedCount = AGENTS.filter(
    (agent) => states[agent.id].status === 'done'
  ).length;

  return (
    <section className="rounded-xl border border-[#7C3AED]/40 bg-[#0B1120] p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-300" />
          <h2 className="text-lg font-semibold text-white">
            AI Orchestrator — Qwen 3 8B
          </h2>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          Шесть специализированных ролей работают последовательно
          на одной локальной модели Qwen 3 8B.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Завершено: {completedCount} / {AGENTS.length}
        </div>

        <button
          type="button"
          onClick={runPipeline}
          disabled={isRunning || !initialStory.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? 'Агенты работают...' : 'Запустить всех агентов'}
        </button>
      </div>

      {!initialStory.trim() && (
        <p className="text-xs text-amber-300">
          Сначала создай сценарий в AI Scriptwriter.
        </p>
      )}

      <div className="space-y-3">
        {AGENTS.map((agent, index) => {
          const state = states[agent.id];

          return (
            <div
              key={agent.id}
              className="rounded-lg border border-[#1E293B] bg-[#060913] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {state.status === 'running' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
                  ) : state.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : state.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600" />
                  )}

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {String(index + 1).padStart(2, '0')} · {agent.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {agent.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${
                      state.status === 'done'
                        ? 'text-emerald-400'
                        : state.status === 'error'
                          ? 'text-rose-400'
                          : state.status === 'running'
                            ? 'text-violet-300'
                            : 'text-slate-500'
                    }`}
                  >
                    {statusLabel[state.status]}
                  </span>

                  <button
                    type="button"
                    onClick={() => retryAgent(agent)}
                    disabled={isRunning || !initialStory.trim()}
                    title="Повторить запуск агента"
                    className="rounded-md border border-[#334155] p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {state.error && (
                <p className="text-xs leading-5 text-rose-400">
                  {state.error}
                </p>
              )}

              {state.result && (
                <details className="border-t border-[#1E293B] pt-3">
                  <summary className="cursor-pointer text-xs font-medium text-violet-300">
                    Посмотреть результат агента
                  </summary>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {state.result}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {pipelineError && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-3 text-sm text-rose-300">
          {pipelineError}
        </div>
      )}

      {finalDraft && (
        <div className="space-y-3 rounded-lg border border-emerald-900/50 bg-[#060913] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-white">
              Результат Editor Agent
            </h3>
          </div>

          <p className="text-xs leading-5 text-slate-400">
            Это отредактированный сценарий. Quality Agent проверяет
            его отдельно. Применяй результат после проверки.
          </p>

          <div className="max-h-[500px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {finalDraft}
          </div>

          <button
            type="button"
            onClick={() => onApplyFinalStory(finalDraft)}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Применить исправленный сценарий
          </button>
        </div>
      )}
    </section>
  );
};

export default AIOrchestratorPanel;
