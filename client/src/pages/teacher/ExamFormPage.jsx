import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileUp,
  ListChecks,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { classApi } from '../../api/classes';
import { examApi } from '../../api/exams';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { defaultExamWindow, toDateTimeLocalValue } from '../../utils/exam';
import { SHORT_ANSWER_PATTERNS, distributeShortAnswer } from '../../utils/shortAnswer';
import FormField from '../../components/FormField';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import LoadingState from '../../components/LoadingState';
import Badge from '../../components/Badge';
import ImportQuestionsModal from '../../components/teacher/ImportQuestionsModal';

const SECTIONS = ['I', 'II', 'III'];
const SECTION_ORDER = { I: 0, II: 1, III: 2 };
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const DEFAULT_TRUE_FALSE_SCORES = [0.1, 0.25, 0.5, 1];
const schema = z
  .object({
    title: z.string().trim().min(3, 'Tên đề thi phải có ít nhất 3 ký tự').max(200),
    subject: z.string().trim().min(1, 'Vui lòng nhập môn học').max(100),
    classIds: z.array(z.string()),
    description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').optional(),
    durationMinutes: z.coerce.number().int().min(1, 'Tối thiểu 1 phút').max(300, 'Tối đa 300 phút'),
    openAt: z.string().min(1, 'Chọn thời gian mở'),
    closeAt: z.string().min(1, 'Chọn thời gian đóng'),
    maxAttempts: z.coerce
      .number()
      .int()
      .min(0, 'Số lượt làm không được âm')
      .max(100, 'Tối đa 100 lượt'),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    showScore: z.boolean(),
  })
  .refine((data) => new Date(data.closeAt) > new Date(data.openAt), {
    message: 'Thời gian đóng phải sau thời gian mở',
    path: ['closeAt'],
  });

function makeClientId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankStatements() {
  return Array.from({ length: 4 }, () => ({ content: '', correct: false }));
}

function splitShortAnswer(value = '') {
  const chars = String(value || '').split('');
  return Array.from({ length: 4 }, (_, index) => chars[index] || '');
}

function isValidShortAnswer(value) {
  const answer = String(value || '').trim();
  if (answer.length < 1 || answer.length > 4) return false;
  if (!/^-?[0-9,]+$/.test(answer)) return false;
  if ((answer.match(/,/g) || []).length > 1) return false;
  if (answer.startsWith(',') || answer.endsWith(',')) return false;
  if (answer.startsWith('-') && !/^-?[0-9]/.test(answer)) return false;
  return /[0-9]/.test(answer);
}

function normalizeTrueFalseScores(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return [...DEFAULT_TRUE_FALSE_SCORES];
  }
  const scores = value.map((score) => Number(score));
  return scores.some((score) => !Number.isFinite(score) || score < 0)
    ? [...DEFAULT_TRUE_FALSE_SCORES]
    : scores;
}

function blankQuestion(section = 'I') {
  return {
    clientId: makeClientId(),
    section,
    content: '',
    options: section === 'I' ? ['', '', '', ''] : [],
    correctOption: 0,
    statements: section === 'II' ? blankStatements() : [],
    correctBoxes: section === 'III' ? ['', '', '', ''] : [],
    points: 1,
  };
}

function sortQuestionsBySection(questions) {
  return [...questions].sort(
    (first, second) => (SECTION_ORDER[first.section] ?? 0) - (SECTION_ORDER[second.section] ?? 0)
  );
}

function getSectionPoints(questions) {
  return SECTIONS.reduce((totals, section) => {
    totals[section] = questions
      .filter((question) => question.section === section)
      .reduce((sum, question) => sum + (Number(question.points) || 0), 0);
    return totals;
  }, {});
}

export default function ExamFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const initialWindow = useMemo(() => defaultExamWindow(), []);
  const [classes, setClasses] = useState([]);
  const [questions, setQuestions] = useState(() => [blankQuestion('I')]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [questionErrors, setQuestionErrors] = useState([]);
  const [sectionTitles, setSectionTitles] = useState({ I: '', II: '', III: '' });
  const [trueFalseScores, setTrueFalseScores] = useState(() =>
    DEFAULT_TRUE_FALSE_SCORES.map(String)
  );
  const [sectionScores, setSectionScores] = useState({ I: '1', II: '0', III: '0' });
  const [collapsedSections, setCollapsedSections] = useState({
    I: false,
    II: false,
    III: false,
  });
  const [activeTab, setActiveTab] = useState('questions');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      subject: '',
      classIds: [],
      description: '',
      durationMinutes: 45,
      openAt: initialWindow.openAt,
      closeAt: initialWindow.closeAt,
      maxAttempts: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      showScore: true,
    },
  });

  const selectedClassIds = watch('classIds') || [];
  const watchedTitle = watch('title');
  const watchedSubject = watch('subject');
  const watchedDuration = watch('durationMinutes');
  const watchedAttempts = watch('maxAttempts');
  const selectedClasses = classes.filter((classroom) =>
    selectedClassIds.includes(classroom.id)
  );
  const selectedClassLabel = selectedClasses.length
    ? selectedClasses.map((classroom) => classroom.name).join(', ')
    : 'Chưa gán lớp';
  const totalPoints = questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const setupComplete = Boolean(
    watchedTitle?.trim() && watchedSubject?.trim()
  );
  const existingQuestionCount = questions.filter(
    (question) => question.content.trim() || question.options.some((option) => option.trim())
  ).length;

  const groupedQuestions = useMemo(
    () =>
      SECTIONS.map((section) => {
        const items = questions
          .map((question, index) => ({ question, index }))
          .filter((item) => item.question.section === section);
        return {
          section,
          items,
          points: items.reduce(
            (sum, item) => sum + (Number(item.question.points) || 0),
            0
          ),
        };
      }),
    [questions]
  );

  useEffect(() => {
    if (!questions.length) return;
    if (!questions.some((question) => question.clientId === activeQuestionId)) {
      setActiveQuestionId(questions[0].clientId);
    }
  }, [questions, activeQuestionId]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    const requests = [classApi.list({ page: 1, limit: 100 })];
    if (isEdit) requests.push(examApi.get(id));

    Promise.all(requests)
      .then(([classResponse, examResponse]) => {
        if (!active) return;
        setClasses(classResponse.data.data || []);

        if (isEdit) {
          const exam = examResponse.data.data;
          reset({
            title: exam.title,
            subject: exam.subject,
            classIds:
              exam.classIds?.length > 0
                ? exam.classIds
                : [exam.classId].filter(Boolean),
            description: exam.description || '',
            durationMinutes: exam.durationMinutes,
            openAt: toDateTimeLocalValue(exam.openAt),
            closeAt: toDateTimeLocalValue(exam.closeAt),
            maxAttempts: exam.maxAttempts,
            shuffleQuestions: exam.shuffleQuestions,
            shuffleOptions: exam.shuffleOptions,
            showScore: exam.showScore,
          });
          const loadedScores = normalizeTrueFalseScores(exam.trueFalseScores);
          setTrueFalseScores(loadedScores.map(String));
          const loadedQuestions = sortQuestionsBySection(
            (exam.questions || []).map((question) => ({
              clientId: makeClientId(),
              remoteId: question.id,
              section: SECTIONS.includes(question.section) ? question.section : 'I',
              content: question.content,
              options:
                question.section === 'I'
                  ? [...(question.options || []), '', '', '', ''].slice(0, 4)
                  : [],
              correctOption: question.correctOption,
              statements:
                question.section === 'II' && Array.isArray(question.statements)
                  ? [...question.statements, ...blankStatements()].slice(0, 4)
                  : blankStatements(),
              correctBoxes:
                question.section === 'III'
                  ? splitShortAnswer(question.correctText)
                  : ['', '', '', ''],
              points: question.points,
            }))
          );
          setQuestions(loadedQuestions);
          const loadedTotals = getSectionPoints(loadedQuestions);
          setSectionScores({
            I: String(loadedTotals.I ?? 0),
            II: String(loadedTotals.II ?? 0),
            III: String(loadedTotals.III ?? 0),
          });
          setSectionTitles({
            I: exam.sectionTitles?.I || '',
            II: exam.sectionTitles?.II || '',
            III: exam.sectionTitles?.III || '',
          });
          setActiveQuestionId(loadedQuestions[0]?.clientId || null);
        }
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, 'Không tải được dữ liệu đề thi'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isEdit, reset]);

  const scrollToQuestion = (clientId) => {
    window.setTimeout(() => {
      document
        .getElementById(`question-${clientId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const jumpToQuestion = (clientId) => {
    const question = questions.find((item) => item.clientId === clientId);
    if (question) {
      setCollapsedSections((current) => ({ ...current, [question.section]: false }));
    }
    setActiveQuestionId(clientId);
    setMobileNavOpen(false);
    scrollToQuestion(clientId);
  };

  const addQuestion = (section) => {
    const question = {
      ...blankQuestion(section),
      points: section === 'II' ? Number(trueFalseScores[3]) || 0 : 1,
    };
    setQuestions((current) => sortQuestionsBySection([...current, question]));
    setCollapsedSections((current) => ({ ...current, [section]: false }));
    setQuestionErrors([]);
    setActiveQuestionId(question.clientId);
    scrollToQuestion(question.clientId);
  };

  const removeQuestion = (questionIndex) => {
    const removed = questions[questionIndex];
    setQuestions((current) => current.filter((_, index) => index !== questionIndex));
    setQuestionErrors([]);
    if (activeQuestionId === removed?.clientId) {
      setActiveQuestionId(null);
    }
  };

  const changeSection = (questionIndex, section) => {
    const question = questions[questionIndex];
    if (!question || question.section === section) return;
    const nextQuestion = {
      ...question,
      section,
      options: section === 'I' ? question.options?.length ? question.options : ['', '', '', ''] : [],
      correctOption: section === 'I' ? question.correctOption || 0 : 0,
      statements:
        section === 'II'
          ? question.statements?.length
            ? question.statements
            : blankStatements()
          : [],
      correctBoxes:
        section === 'III'
          ? question.correctBoxes?.length
            ? question.correctBoxes
            : ['', '', '', '']
          : [],
      points: section === 'II' ? Number(trueFalseScores[3]) || 0 : question.points,
    };
    setQuestions((current) =>
      sortQuestionsBySection(
        current.map((item, index) =>
          index === questionIndex ? nextQuestion : item
        )
      )
    );
    setCollapsedSections((current) => ({ ...current, [section]: false }));
    setQuestionErrors([]);
    setActiveQuestionId(question.clientId);
    scrollToQuestion(question.clientId);
  };

  const toggleClass = (classId) => {
    const next = selectedClassIds.includes(classId)
      ? selectedClassIds.filter((idItem) => idItem !== classId)
      : [...selectedClassIds, classId];
    setValue('classIds', next, { shouldValidate: true, shouldDirty: true });
  };

  const distributeSectionPoints = (section) => {
    if (section === 'II') {
      toast.info('Phần II dùng thang điểm Đúng/Sai trong phần cài đặt.');
      return;
    }
    const group = groupedQuestions.find((item) => item.section === section);
    const target = Number(sectionScores[section]);
    if (!group?.items.length) {
      toast.info('Hãy thêm ít nhất một câu hỏi vào phần này');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      toast.error('Điểm phần phải lớn hơn 0');
      return;
    }

    const totalCents = Math.round(target * 100);
    const baseCents = Math.floor(totalCents / group.items.length);
    const remainder = totalCents - baseCents * group.items.length;
    const pointMap = new Map(
      group.items.map((item, index) => [
        item.question.clientId,
        (baseCents + (index < remainder ? 1 : 0)) / 100,
      ])
    );

    setQuestions((current) =>
      current.map((question) =>
        pointMap.has(question.clientId)
          ? { ...question, points: pointMap.get(question.clientId) }
          : question
      )
    );
    setSectionScores((current) => ({ ...current, [section]: String(target) }));
    toast.success(
      `Đã chia ${target} điểm cho ${group.items.length} câu ở phần ${section}`
    );
  };

  const updateQuestion = (index, patch) => {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      })
    );
  };

  const updateStatement = (questionIndex, statementIndex, patch) => {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const statements = [...(question.statements || blankStatements())];
        statements[statementIndex] = {
          ...statements[statementIndex],
          ...patch,
        };
        return { ...question, statements };
      })
    );
  };

  const correctBoxRefs = useRef({});
  const focusCorrectBox = (questionIndex, boxIndex) => {
    correctBoxRefs.current[`${questionIndex}-${boxIndex}`]?.focus();
  };

  const updateCorrectBoxes = (questionIndex, boxes) => {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex ? { ...question, correctBoxes: boxes } : question
      )
    );
  };

  const updateCorrectBox = (questionIndex, boxIndex, value) => {
    const char = String(value || '').slice(-1);
    if (char && !SHORT_ANSWER_PATTERNS[boxIndex].test(char)) return;
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        const correctBoxes = [...(question.correctBoxes || ['', '', '', ''])];
        correctBoxes[boxIndex] = char;
        return { ...question, correctBoxes };
      })
    );
  };

  const updateTrueFalseScore = (index, value) => {
    const next = trueFalseScores.map((score, scoreIndex) =>
      scoreIndex === index ? value : score
    );
    setTrueFalseScores(next);
    if (index === 3) {
      setQuestions((current) =>
        current.map((question) =>
          question.section === 'II'
            ? { ...question, points: Number(value) || 0 }
            : question
        )
      );
    }
  };

  const handleImportedQuestions = (
    importedQuestions,
    { replace, sectionTitles: importedTitles }
  ) => {
    const normalized = importedQuestions.map((question) => ({
      clientId: makeClientId(),
      section: SECTIONS.includes(question.section) ? question.section : 'I',
      content: question.content,
      options: question.section === 'I' ? [...(question.options || [])] : [],
      correctOption: question.section === 'I' ? question.correctOption : 0,
      statements:
        question.section === 'II'
          ? [...(question.statements || blankStatements())].slice(0, 4)
          : [],
      correctBoxes:
        question.section === 'III'
          ? splitShortAnswer(question.correctText)
          : ['', '', '', ''],
      points: question.points,
    }));
    const baseQuestions = replace
      ? []
      : questions.filter(
        (question) =>
          question.content.trim() || question.options.some((option) => option.trim())
      );
    const merged = sortQuestionsBySection([...baseQuestions, ...normalized]);

    setQuestions(merged);
    const mergedTotals = getSectionPoints(merged);
    setSectionScores({
      I: String(mergedTotals.I ?? 0),
      II: String(mergedTotals.II ?? 0),
      III: String(mergedTotals.III ?? 0),
    });
    if (importedTitles) {
      setSectionTitles((current) => {
        const next = { ...current };
        SECTIONS.forEach((section) => {
          const title = String(importedTitles[section] || '').trim();
          if (title) next[section] = title;
        });
        return next;
      });
    }
    setQuestionErrors([]);
    setActiveQuestionId(normalized[0]?.clientId || merged[0]?.clientId || null);
    setImportOpen(false);
    setActiveTab('questions');
    toast.success(`Đã thêm ${normalized.length} câu hỏi từ văn bản`);
    if (normalized[0]) scrollToQuestion(normalized[0].clientId);
  };

  const validateQuestions = () => {
    const errorsByQuestion = questions.map((question) => {
      const questionError = {};
      if (!question.content.trim()) questionError.content = 'Vui lòng nhập nội dung câu hỏi';
      if (question.section === 'I') {
        const optionErrors = (question.options || []).map((option) =>
          option.trim() ? '' : 'Không được để trống'
        );
        if (optionErrors.some(Boolean)) questionError.options = optionErrors;
      }
      if (question.section === 'II') {
        const statements = question.statements || [];
        if (
          statements.length !== 4 ||
          statements.some((statement) => !statement.content.trim())
        ) {
          questionError.statements = 'Vui lòng nhập đủ nội dung 4 ý';
        }
      }
      if (
        question.section === 'III' &&
        !isValidShortAnswer((question.correctBoxes || []).join(''))
      ) {
        questionError.correctText = 'Đáp án ngắn không hợp lệ';
      }
      if (!(Number(question.points) > 0)) questionError.points = 'Điểm phải lớn hơn 0';
      return questionError;
    });
    setQuestionErrors(errorsByQuestion);
    const firstIndex = errorsByQuestion.findIndex((error) => Object.keys(error).length > 0);
    if (firstIndex !== -1) {
      const section = questions[firstIndex]?.section;
      if (section) {
        setCollapsedSections((current) => ({ ...current, [section]: false }));
      }
    }
    return { valid: firstIndex === -1, firstIndex: firstIndex === -1 ? 0 : firstIndex };
  };

  const onSubmit = async (values) => {
    setSubmitError('');
    const scoreValues = trueFalseScores.map((score) => Number(score));
    if (
      scoreValues.some((score) => !Number.isFinite(score) || score < 0) ||
      scoreValues[3] <= 0
    ) {
      setActiveTab('settings');
      setSubmitError('Điểm các mức Đúng/Sai không hợp lệ. Mức 4/4 phải lớn hơn 0.');
      return;
    }
    const validation = validateQuestions();
    if (!validation.valid) {
      setActiveTab('questions');
      setSubmitError('Vui lòng kiểm tra lại nội dung và đáp án của các câu hỏi.');
      const firstQuestion = questions[validation.firstIndex];
      setActiveQuestionId(firstQuestion?.clientId || null);
      if (firstQuestion) scrollToQuestion(firstQuestion.clientId);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        subject: values.subject,
        classIds: values.classIds,
        description: values.description || '',
        durationMinutes: Number(values.durationMinutes),
        openAt: new Date(values.openAt).toISOString(),
        closeAt: new Date(values.closeAt).toISOString(),
        maxAttempts: Number(values.maxAttempts),
        shuffleQuestions: Boolean(values.shuffleQuestions),
        shuffleOptions: Boolean(values.shuffleOptions),
        showScore: Boolean(values.showScore),
        trueFalseScores: scoreValues,
        sectionTitles,
        questions: questions.map((question) => {
          const base = {
            id: question.remoteId || undefined,
            section: question.section,
            content: question.content.trim(),
            points:
              question.section === 'II'
                ? scoreValues[3]
                : Number(question.points),
          };
          if (question.section === 'I') {
            return {
              ...base,
              options: (question.options || []).map((option) => option.trim()),
              correctOption: Number(question.correctOption),
            };
          }
          if (question.section === 'II') {
            return {
              ...base,
              statements: (question.statements || []).map((statement) => ({
                content: statement.content.trim(),
                correct: Boolean(statement.correct),
              })),
            };
          }
          return {
            ...base,
            correctText: (question.correctBoxes || []).join(''),
          };
        }),
      };

      const response = isEdit
        ? await examApi.update(id, payload)
        : await examApi.create(payload);

      toast.success(isEdit ? 'Đã cập nhật đề thi' : 'Đã tạo đề thi');
      navigate(`/teacher/exams/${response.data.data.id}`);
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể lưu đề thi');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onInvalid = () => {
    setActiveTab('settings');
    setSubmitError('Vui lòng hoàn tất thông tin và cài đặt đề thi trước khi lưu.');
  };

  if (loading) return <LoadingState label="Đang tải dữ liệu đề thi..." />;

  if (loadError) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <p className="font-semibold text-slate-900">Không thể mở biểu mẫu</p>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <Link
          to={isEdit ? `/teacher/exams/${id}` : '/teacher/exams'}
          className="mt-5 inline-flex text-sm font-semibold text-brand-600"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const navigator = (
    <div className="surface overflow-hidden">
      <div className="border-b border-slate-100 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Bảng câu hỏi</h3>
          <div className="flex items-center gap-2">
            <Badge variant="info">{questions.length}</Badge>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="focus-ring rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Đóng bảng câu hỏi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Nhấn số để di chuyển tới câu hỏi</p>
      </div>
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-3 lg:max-h-[calc(100vh-15rem)]">
        {groupedQuestions
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <div key={group.section} className="mb-3 last:mb-0">
              <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Phần {group.section}
                  {sectionTitles[group.section]
                    ? ` - ${sectionTitles[group.section]}`
                    : ''}
                </p>
                <span className="text-[10px] text-slate-400">{group.items.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {group.items.map(({ question, index }) => (
                  <button
                    key={question.clientId}
                    type="button"
                    onClick={() => jumpToQuestion(question.clientId)}
                    title={`Câu ${index + 1}`}
                    className={
                      activeQuestionId === question.clientId
                        ? 'flex h-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white'
                        : 'flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 transition hover:bg-slate-100'
                    }
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl pb-24 lg:pb-20">
      {classes.length === 0 ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Bạn chưa có lớp học nào. Có thể lưu đề trước và gán lớp sau.
          </div>
          <Link to="/teacher/classes/new" className="whitespace-nowrap font-semibold underline">
            Tạo lớp học
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        {submitError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <div className="mb-5 flex w-full rounded-xl border border-slate-200 bg-white p-1 sm:w-fit">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'questions'}
            onClick={() => setActiveTab('questions')}
            className={
              activeTab === 'questions'
                ? 'flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white sm:flex-none'
                : 'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-none'
            }
          >
            <ListChecks className="h-4 w-4" />
            Câu hỏi
            <span
              className={
                activeTab === 'questions'
                  ? 'rounded-full bg-white/15 px-1.5 text-xs'
                  : 'rounded-full bg-slate-100 px-1.5 text-xs text-slate-500'
              }
            >
              {questions.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            className={
              activeTab === 'settings'
                ? 'flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white sm:flex-none'
                : 'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-none'
            }
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Thông tin & cài đặt</span>
            <span className="sm:hidden">Thiết lập</span>
            {!setupComplete ? (
              <span
                className={
                  activeTab === 'settings'
                    ? 'h-1.5 w-1.5 rounded-full bg-amber-300'
                    : 'h-1.5 w-1.5 rounded-full bg-amber-500'
                }
                title="Chưa hoàn tất thông tin đề thi"
              />
            ) : null}
          </button>
        </div>

        {activeTab === 'questions' ? (
          <div>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-slate-500">
                    {questions.length} câu · {totalPoints} điểm
                  </p>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={ListChecks}
                      onClick={() => setMobileNavOpen(true)}
                      className="lg:hidden"
                    >
                      Bảng câu hỏi ({questions.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={FileUp}
                      onClick={() => setImportOpen(true)}
                    >
                      Nhập Word/Text
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {groupedQuestions.map((group) => (
                    <section
                      key={group.section}
                      id={`section-${group.section}`}
                      className="scroll-mt-6"
                    >
                      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Phần {group.section}
                            </p>
                            <input
                              type="text"
                              value={sectionTitles[group.section]}
                              maxLength={120}
                              onChange={(event) =>
                                setSectionTitles((current) => ({
                                  ...current,
                                  [group.section]: event.target.value,
                                }))
                              }
                              placeholder="Nhập tên phần (không bắt buộc)"
                              aria-label={`Tên phần ${group.section}`}
                              className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-0"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                          {group.section === 'II' ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('settings')}
                              className="rounded-lg border border-brand-100 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
                            >
                              Cấu hình
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                              <label
                                htmlFor={`section-score-${group.section}`}
                                className="text-[10px] font-medium text-slate-500"
                              >
                                Điểm
                              </label>
                              <input
                                id={`section-score-${group.section}`}
                                type="number"
                                min="0"
                                step="0.25"
                                value={sectionScores[group.section]}
                                onChange={(event) =>
                                  setSectionScores((current) => ({
                                    ...current,
                                    [group.section]: event.target.value,
                                  }))
                                }
                                className="h-6 w-14 rounded border-0 bg-transparent px-1 text-center text-xs font-semibold text-slate-800 focus:outline-none"
                                aria-label={`Điểm phần ${group.section}`}
                              />
                              <button
                                type="button"
                                onClick={() => distributeSectionPoints(group.section)}
                                disabled={group.items.length === 0}
                                className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-300"
                              >
                                Chia đều
                              </button>
                            </div>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            icon={Plus}
                            onClick={() => addQuestion(group.section)}
                          >
                            Thêm câu
                          </Button>
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedSections((current) => ({
                                ...current,
                                [group.section]: !current[group.section],
                              }))
                            }
                            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            title={
                              collapsedSections[group.section]
                                ? `Mở rộng phần ${group.section}`
                                : `Thu gọn phần ${group.section}`
                            }
                            aria-label={
                              collapsedSections[group.section]
                                ? `Mở rộng phần ${group.section}`
                                : `Thu gọn phần ${group.section}`
                            }
                            aria-expanded={!collapsedSections[group.section]}
                          >
                            <ChevronDown
                              className={
                                collapsedSections[group.section]
                                  ? 'h-4 w-4'
                                  : 'h-4 w-4 rotate-180'
                              }
                            />
                          </button>
                        </div>
                      </div>

                      {!collapsedSections[group.section] ? (
                        <div className="mt-2.5 space-y-3">
                          {group.items.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => addQuestion(group.section)}
                              className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-brand-300 hover:bg-brand-50/30"
                            >
                              <Plus className="h-5 w-5 text-slate-400" />
                              <span className="mt-1.5 text-sm font-semibold text-slate-600">
                                Thêm câu hỏi vào phần {group.section}
                              </span>
                              <span className="mt-0.5 text-[11px] text-slate-400">
                                Phần này chưa có câu hỏi
                              </span>
                            </button>
                          ) : (
                            group.items.map(({ question, index: questionIndex }) => {
                              const questionError = questionErrors[questionIndex] || {};
                              return (
                                <article
                                  key={question.clientId}
                                  id={`question-${question.clientId}`}
                                  className="scroll-mt-6 overflow-hidden rounded-lg border border-slate-200"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-sm font-semibold text-slate-800">
                                        Câu {questionIndex + 1}:
                                      </span>
                                      {question.section === 'II' ? (
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                          Tối đa {trueFalseScores[3]} điểm
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                          <Input
                                            id={`points-${question.clientId}`}
                                            type="number"
                                            min="0.1"
                                            step="0.05"
                                            value={question.points}
                                            invalid={Boolean(questionError.points)}
                                            aria-label={`Điểm câu ${questionIndex + 1}`}
                                            onChange={(event) =>
                                              updateQuestion(questionIndex, {
                                                points: event.target.value,
                                              })
                                            }
                                            className="h-7 w-14 rounded-md px-1 text-center text-xs font-semibold"
                                          />
                                          điểm
                                        </span>
                                      )}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                      <select
                                        value={question.section}
                                        onChange={(event) =>
                                          changeSection(questionIndex, event.target.value)
                                        }
                                        className="h-7 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-medium text-slate-600 focus:border-brand-400 focus:outline-none"
                                        aria-label={`Chuyển câu ${questionIndex + 1} sang phần`}
                                      >
                                        {SECTIONS.map((section) => (
                                          <option key={section} value={section}>
                                            Phần {section}
                                          </option>
                                        ))}
                                      </select>
                                      {questions.length > 1 ? (
                                        <button
                                          type="button"
                                          onClick={() => removeQuestion(questionIndex)}
                                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                          title="Xóa câu hỏi"
                                          aria-label={`Xóa câu hỏi ${questionIndex + 1}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="space-y-3 p-3 bg-white">
                                    {questionError.points ? (
                                      <p className="text-xs font-medium text-rose-600">
                                        {questionError.points}
                                      </p>
                                    ) : null}

                                    <div>
                                      <Textarea
                                        id={`content-${question.clientId}`}
                                        rows={2}
                                        value={question.content}
                                        placeholder={`Nội dung câu hỏi ${questionIndex + 1}...`}
                                        aria-label={`Nội dung câu hỏi ${questionIndex + 1}`}
                                        invalid={Boolean(questionError.content)}
                                        onChange={(event) =>
                                          updateQuestion(questionIndex, {
                                            content: event.target.value,
                                          })
                                        }
                                      />
                                      {questionError.content ? (
                                        <p className="mt-1 text-xs font-medium text-rose-600">
                                          {questionError.content}
                                        </p>
                                      ) : null}
                                    </div>

                                    {question.section === 'I' ? (
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {question.options.map((option, optionIndex) => {
                                          const isCorrect =
                                            Number(question.correctOption) === optionIndex;
                                          const hasError = Boolean(
                                            questionError.options?.[optionIndex]
                                          );
                                          return (
                                            <div
                                              key={optionIndex}
                                              className={
                                                isCorrect
                                                  ? 'rounded-lg border border-emerald-300 bg-emerald-50/50 px-2.5 py-1.5'
                                                  : hasError
                                                    ? 'rounded-lg border border-rose-300 bg-white px-2.5 py-1.5'
                                                    : 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 transition focus-within:border-brand-400'
                                              }
                                            >
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="radio"
                                                  name={`correct-${question.clientId}`}
                                                  checked={isCorrect}
                                                  onChange={() =>
                                                    updateQuestion(questionIndex, {
                                                      correctOption: optionIndex,
                                                    })
                                                  }
                                                  className="h-3.5 w-3.5 shrink-0 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                  aria-label={`Chọn đáp án ${OPTION_LETTERS[optionIndex]} là đáp án đúng`}
                                                />
                                                <span
                                                  className={
                                                    isCorrect
                                                      ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-600 text-[11px] font-bold text-white'
                                                      : 'flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-bold text-slate-500'
                                                  }
                                                >
                                                  {OPTION_LETTERS[optionIndex]}
                                                </span>
                                                <input
                                                  id={`option-${question.clientId}-${optionIndex}`}
                                                  type="text"
                                                  value={option}
                                                  maxLength={500}
                                                  autoComplete="off"
                                                  placeholder={`Đáp án ${OPTION_LETTERS[optionIndex]}`}
                                                  aria-label={`Đáp án ${OPTION_LETTERS[optionIndex]} của câu ${questionIndex + 1}`}
                                                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                                  onChange={(event) =>
                                                    updateOption(
                                                      questionIndex,
                                                      optionIndex,
                                                      event.target.value
                                                    )
                                                  }
                                                />
                                                {isCorrect ? (
                                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                                ) : null}
                                              </div>
                                              {hasError ? (
                                                <p className="mt-1 pl-9 text-[11px] text-rose-600">
                                                  {questionError.options[optionIndex]}
                                                </p>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : null}

                                    {question.section === 'II' ? (
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                          Bốn ý — chọn Đúng hoặc Sai
                                        </p>
                                        <div className="overflow-hidden rounded-lg border border-slate-200">
                                          <div className="hidden grid-cols-[2rem_minmax(0,1fr)_4rem_4rem] items-center gap-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
                                            <span className="text-center">Ý</span>
                                            <span>Nội dung</span>
                                            <span className="text-center">Đúng</span>
                                            <span className="text-center">Sai</span>
                                          </div>
                                          {(question.statements || blankStatements()).map(
                                            (statement, statementIndex) => (
                                              <div
                                                key={statementIndex}
                                                className="grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 border-b border-slate-100 px-2 py-1.5 last:border-b-0"
                                              >
                                                <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-[11px] font-bold text-slate-500">
                                                  {statementIndex + 1}
                                                </span>
                                                <input
                                                  type="text"
                                                  value={statement.content}
                                                  maxLength={1000}
                                                  autoComplete="off"
                                                  placeholder={`Nội dung ý ${statementIndex + 1}`}
                                                  aria-label={`Nội dung ý ${statementIndex + 1} của câu ${questionIndex + 1}`}
                                                  className="min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none"
                                                  onChange={(event) =>
                                                    updateStatement(
                                                      questionIndex,
                                                      statementIndex,
                                                      { content: event.target.value }
                                                    )
                                                  }
                                                />
                                                {[
                                                  [true, 'Đúng'],
                                                  [false, 'Sai'],
                                                ].map(([value, label]) => (
                                                  <button
                                                    key={label}
                                                    type="button"
                                                    aria-pressed={statement.correct === value}
                                                    aria-label={`Ý ${statementIndex + 1} ${label}`}
                                                    onClick={() =>
                                                      updateStatement(
                                                        questionIndex,
                                                        statementIndex,
                                                        { correct: value }
                                                      )
                                                    }
                                                    className={
                                                      statement.correct === value
                                                        ? 'h-7 rounded-md bg-emerald-600 px-1 text-[11px] font-semibold text-white'
                                                        : 'h-7 rounded-md border border-slate-200 bg-white px-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50'
                                                    }
                                                  >
                                                    {label}
                                                  </button>
                                                ))}
                                              </div>
                                            )
                                          )}
                                        </div>
                                        {questionError.statements ? (
                                          <p className="text-[11px] text-rose-600">
                                            {questionError.statements}
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    {question.section === 'III' ? (
                                      <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Đáp án đúng
                                          </p>
                                          <div className="flex gap-1.5">
                                            {Array.from({ length: 4 }, (_, boxIndex) => (
                                              <input
                                                key={boxIndex}
                                                ref={(node) => {
                                                  correctBoxRefs.current[`${questionIndex}-${boxIndex}`] = node;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={question.correctBoxes?.[boxIndex] || ''}
                                                aria-label={`Ô đáp án ${boxIndex + 1} của câu ${questionIndex + 1}`}
                                                onChange={(event) => {
                                                  const raw = String(event.target.value || '');
                                                  if (raw.length > 1) {
                                                    const { boxes, nextIndex } =
                                                      distributeShortAnswer(raw);
                                                    updateCorrectBoxes(questionIndex, boxes);
                                                    focusCorrectBox(questionIndex, nextIndex);
                                                    return;
                                                  }
                                                  updateCorrectBox(questionIndex, boxIndex, raw);
                                                  if (raw && boxIndex < 3) {
                                                    focusCorrectBox(questionIndex, boxIndex + 1);
                                                  }
                                                }}
                                                onPaste={(event) => {
                                                  const text =
                                                    event.clipboardData?.getData('text') || '';
                                                  if (!text) return;
                                                  event.preventDefault();
                                                  const { boxes, nextIndex } =
                                                    distributeShortAnswer(text);
                                                  updateCorrectBoxes(questionIndex, boxes);
                                                  focusCorrectBox(questionIndex, nextIndex);
                                                }}
                                                onKeyDown={(event) => {
                                                  const current =
                                                    question.correctBoxes?.[boxIndex] || '';
                                                  if (
                                                    event.key === 'Backspace' &&
                                                    !current &&
                                                    boxIndex > 0
                                                  ) {
                                                    event.preventDefault();
                                                    const boxes = [
                                                      ...(question.correctBoxes || ['', '', '', '']),
                                                    ];
                                                    boxes[boxIndex - 1] = '';
                                                    updateCorrectBoxes(questionIndex, boxes);
                                                    focusCorrectBox(questionIndex, boxIndex - 1);
                                                  } else if (
                                                    event.key === 'ArrowLeft' &&
                                                    boxIndex > 0
                                                  ) {
                                                    event.preventDefault();
                                                    focusCorrectBox(questionIndex, boxIndex - 1);
                                                  } else if (
                                                    event.key === 'ArrowRight' &&
                                                    boxIndex < 3
                                                  ) {
                                                    event.preventDefault();
                                                    focusCorrectBox(questionIndex, boxIndex + 1);
                                                  }
                                                }}
                                                className="h-10 w-10 rounded-lg border border-slate-300 bg-white text-center text-base font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                                              />
                                            ))}
                                          </div>
                                        </div>
                                        <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                                          Ô 1: -/0–9 · Ô 2–3: ,/0–9 · Ô 4: 0–9 · Ví dụ: 1,5 · -2,4 · 1254
                                        </p>
                                        {questionError.correctText ? (
                                          <p className="mt-1 text-[11px] text-rose-600">
                                            {questionError.correctText}
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}

                                  </div>
                                </article>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>
              </div>

              <aside className="hidden self-start lg:sticky lg:top-6 lg:z-50 lg:block">
                {navigator}
              </aside>
            </div>
          </div>
        ) : (
          <section className="surface overflow-hidden">
            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Tên đề thi"
                  htmlFor="title"
                  required
                  error={errors.title?.message}
                  className="sm:col-span-2"
                >
                  <Input
                    id="title"
                    placeholder="Ví dụ: Kiểm tra giữa kỳ môn Toán"
                    invalid={Boolean(errors.title)}
                    {...register('title')}
                  />
                </FormField>

                <FormField label="Môn học" htmlFor="subject" required error={errors.subject?.message}>
                  <Input
                    id="subject"
                    placeholder="Ví dụ: Toán"
                    invalid={Boolean(errors.subject)}
                    {...register('subject')}
                  />
                </FormField>

                <FormField
                  label="Lớp học"
                  error={errors.classIds?.message}
                  hint="Có thể để trống và gán lớp sau. Chọn nhiều lớp nếu dùng chung đề."
                  className="sm:col-span-2"
                >
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:flex-row sm:items-start">
                    <div className="flex min-h-10 flex-1 flex-wrap content-start gap-2">
                      {classes.length ? (
                        classes.map((classroom) => {
                          const checked = selectedClassIds.includes(classroom.id);
                          return (
                            <button
                              key={classroom.id}
                              type="button"
                              aria-pressed={checked}
                              title={`${classroom.name} · ${classroom.classCode}`}
                              onClick={() => toggleClass(classroom.id)}
                              className={
                                checked
                                  ? 'max-w-full truncate rounded-full border border-brand-500 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition'
                                  : 'max-w-full truncate rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50'
                              }
                            >
                              {classroom.name}
                            </button>
                          );
                        })
                      ) : (
                        <span className="self-center text-xs text-slate-400">
                          Chưa có lớp học — có thể gán sau.
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            'classIds',
                            classes.map((classroom) => classroom.id),
                            { shouldValidate: true, shouldDirty: true }
                          )
                        }
                        disabled={classes.length === 0}
                        className="rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Chọn hết
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setValue('classIds', [], {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        disabled={selectedClassIds.length === 0}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Huỷ chọn hết
                      </button>
                    </div>
                  </div>
                </FormField>

                <FormField
                  label="Thời gian mở"
                  htmlFor="openAt"
                  required
                  error={errors.openAt?.message}
                >
                  <Input
                    id="openAt"
                    type="datetime-local"
                    invalid={Boolean(errors.openAt)}
                    {...register('openAt')}
                  />
                </FormField>

                <FormField
                  label="Thời gian đóng"
                  htmlFor="closeAt"
                  required
                  error={errors.closeAt?.message}
                >
                  <Input
                    id="closeAt"
                    type="datetime-local"
                    invalid={Boolean(errors.closeAt)}
                    {...register('closeAt')}
                  />
                </FormField>

                <FormField
                  label="Thời lượng (phút)"
                  htmlFor="durationMinutes"
                  required
                  error={errors.durationMinutes?.message}
                >
                  <Input
                    id="durationMinutes"
                    type="number"
                    min={1}
                    max={300}
                    invalid={Boolean(errors.durationMinutes)}
                    {...register('durationMinutes')}
                  />
                </FormField>

                <FormField
                  label="Số lượt làm tối đa"
                  htmlFor="maxAttempts"
                  required
                  hint="Nhập 0 để không giới hạn lượt thi."
                  error={errors.maxAttempts?.message}
                >
                  <Input
                    id="maxAttempts"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    invalid={Boolean(errors.maxAttempts)}
                    {...register('maxAttempts')}
                  />
                </FormField>

                <FormField
                  label="Mô tả"
                  htmlFor="description"
                  error={errors.description?.message}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="description"
                    rows={2}
                    placeholder="Nội dung, phạm vi hoặc lưu ý cho học sinh (không bắt buộc)"
                    invalid={Boolean(errors.description)}
                    {...register('description')}
                  />
                </FormField>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Thang điểm Phần II — Đúng/Sai
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Mức 4/4 là điểm tối đa của mỗi câu
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {['1 ý', '2 ý', '3 ý', '4 ý'].map((label, index) => (
                    <label
                      key={label}
                      className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                    >
                      <span className="shrink-0 text-[10px] font-medium text-slate-500">
                        {label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        value={trueFalseScores[index]}
                        onChange={(event) =>
                          updateTrueFalseScore(index, event.target.value)
                        }
                        aria-label={`Điểm khi ${label} đúng ở Phần II`}
                        className="h-6 w-14 min-w-0 rounded border border-slate-200 bg-slate-50 px-1.5 text-right text-xs font-semibold text-slate-800 focus:border-brand-400 focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Tùy chọn ca thi
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['shuffleQuestions', 'Trộn câu hỏi'],
                    ['shuffleOptions', 'Trộn đáp án'],
                    ['showScore', 'Công bố điểm'],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        {...register(field)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">
                Mã ca thi 6 ký tự được tạo tự động sau khi lưu đề. Câu hỏi được giữ theo phần I,
                II, III; khi bật trộn câu, thứ tự chỉ đảo trong từng phần.
              </div>
            </div>
          </section>
        )}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {questions.length} câu · {totalPoints} điểm
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {selectedClassLabel === 'Chưa gán lớp'
                  ? 'Chưa thiết lập lớp học'
                  : selectedClassLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to={isEdit ? `/teacher/exams/${id}` : '/teacher/exams'}
                className="hidden h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                Hủy
              </Link>
              <Button
                type="submit"
                loading={submitting}
                icon={Save}
              >
                {isEdit ? 'Lưu thay đổi' : 'Lưu đề'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {createPortal(
        <div
          className={
            mobileNavOpen
              ? 'pointer-events-auto fixed inset-0 z-[80] lg:hidden'
              : 'pointer-events-none fixed inset-0 z-[80] lg:hidden'
          }
          aria-hidden={!mobileNavOpen}
          inert={mobileNavOpen ? undefined : ''}
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className={
              mobileNavOpen
                ? 'absolute inset-0 bg-slate-950/45 opacity-100 backdrop-blur-[1px] transition-opacity duration-300'
                : 'absolute inset-0 bg-slate-950/45 opacity-0 backdrop-blur-[1px] transition-opacity duration-300'
            }
            tabIndex={-1}
            aria-label="Đóng bảng câu hỏi"
          />
          <aside
            role="dialog"
            aria-modal={mobileNavOpen ? 'true' : undefined}
            aria-label="Bảng câu hỏi"
            className={
              mobileNavOpen
                ? 'absolute inset-y-0 right-0 w-[min(88vw,340px)] translate-x-0 overflow-y-auto bg-slate-50 p-3 shadow-2xl transition-transform duration-300 ease-out'
                : 'absolute inset-y-0 right-0 w-[min(88vw,340px)] translate-x-full overflow-y-auto bg-slate-50 p-3 shadow-2xl transition-transform duration-300 ease-out'
            }
          >
            {navigator}
          </aside>
        </div>,
        document.body
      )}

      <ImportQuestionsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportedQuestions}
        existingCount={existingQuestionCount}
      />
    </div>
  );
}
