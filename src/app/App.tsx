import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type TouchEvent } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import type { ChatEntity, GenerationRequestEntity, JsonValue, ThemeMode } from "../db/entities";
import { createClientId } from "../db/id";
import { appOptionsRepository } from "../db/repositories/appOptionsRepository";
import { chatRepository, getLastChangedAt, type ChatAspectRatio, type ChatUploadedReference } from "../db/repositories/chatRepository";
import { generationRepository } from "../db/repositories/generationRepository";
import { imageRepository } from "../db/repositories/imageRepository";
import { messageRepository } from "../db/repositories/messageRepository";
import { modelLoadEstimateRepository } from "../db/repositories/modelLoadEstimateRepository";
import { providerConfigRepository } from "../db/repositories/providerConfigRepository";
import { listUsableModels, modelSupportsReferenceImages } from "../features/generation/models/registry";
import { generateChatTitle } from "../features/generation/services/chatTitleService";
import { generateImages } from "../features/generation/services/generationService";
import { applyTheme, closePanels, createReferenceSnapshots, fileToDataUrl, readChatNavOpenState, refreshChatData, type StoredReference, type UploadedReference } from "./appHelpers";
import { ChatNavigation } from "./components/ChatNavigation";
import { ConfigPanel } from "./components/ConfigPanel";
import { ImageOverlay } from "./components/ImageOverlay";
import { InstallPromptBanner } from "./components/InstallPromptBanner";
import { OptionsView } from "./components/OptionsView";
import { WorkspaceView } from "./components/WorkspaceView";

const navSwipeEdgeWidth = 96;
const navSwipeDragStartThreshold = 10;
const navSwipeThreshold = 60;

const progressTickMs = 100;
const progressResetDelayMs = 300;
const maxAutoProgressPercent = 95;

export function App() {
  return (
    <Routes>
      <Route path="/" element={<WorkspaceRoute />} />
      <Route path="/options" element={<WorkspaceRoute mode="options" />} />
      <Route path="/chats/:chatId" element={<WorkspaceRoute />} />
      <Route path="/chats/:chatId/config" element={<WorkspaceRoute configOpen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function WorkspaceRoute(props: { mode?: "options"; configOpen?: boolean }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [leftOpen, setLeftOpen] = useState(() => {
    if (props.mode === "options" || props.configOpen) return false;
    return readChatNavOpenState();
  });
  const [prompt, setPrompt] = useState("");
  const [imageCount, setImageCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<ChatAspectRatio>("portrait");
  const [overlayImageId, setOverlayImageId] = useState<string>();
  const [pinnedNavigationImageId, setPinnedNavigationImageId] = useState<string>();
  const [pinnedNavigationEndRequest, setPinnedNavigationEndRequest] = useState(0);
  const [uploadedReferences, setUploadedReferences] = useState<UploadedReference[]>([]);
  const [referenceMode, setReferenceMode] = useState<"default" | "restored">("default");
  const [activeImageModelId, setActiveImageModelId] = useState<string>();
  const [isCreatingInitialGeneration, setIsCreatingInitialGeneration] = useState(false);
  const [initialGenerationError, setInitialGenerationError] = useState<string>();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [generationProgressPercent, setGenerationProgressPercent] = useState(0);
  const [leftDragging, setLeftDragging] = useState(false);
  const [settingsReadyChatId, setSettingsReadyChatId] = useState<string>();
  const navSwipeStartRef = useRef<{ x: number; y: number; pointerId: number; dragging: boolean } | undefined>(undefined);
  const touchSwipeStartRef = useRef<{ x: number; y: number; dragging: boolean } | undefined>(undefined);
  const suppressNextClickRef = useRef(false);
  const generationProgressTimerRef = useRef<number | undefined>(undefined);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const promptPersistTimerRef = useRef<number | undefined>(undefined);
  const isCreatingDefaultChatRef = useRef(false);

  const chatsQuery = useQuery({ queryKey: ["chats"], queryFn: chatRepository.list });
  const providerConfigsQuery = useQuery({ queryKey: ["providerConfigs"], queryFn: providerConfigRepository.list });
  const themeQuery = useQuery({ queryKey: ["theme"], queryFn: () => appOptionsRepository.getTheme() });
  const activeImageModelIdQuery = useQuery({ queryKey: ["activeImageModelId"], queryFn: async () => (await appOptionsRepository.get<string>("activeImageModelId")) ?? null });
  const activeChatId = chatId;
  const showOptions = props.mode === "options";
  const rightOpen = Boolean(props.configOpen);
  const activeChat = useMemo(() => chatsQuery.data?.find((chat) => chat.id === activeChatId), [activeChatId, chatsQuery.data]);
  const messagesQuery = useQuery({
    queryKey: ["messages", activeChatId],
    queryFn: () => messageRepository.listByChat(activeChatId!),
    enabled: Boolean(activeChatId)
  });
  const imagesQuery = useQuery({
    queryKey: ["images", activeChatId],
    queryFn: () => imageRepository.listByChat(activeChatId!),
    enabled: Boolean(activeChatId)
  });
  const generationRequestsQuery = useQuery({
    queryKey: ["generationRequests", activeChatId],
    queryFn: () => generationRepository.listRequestsByChat(activeChatId!),
    enabled: Boolean(activeChatId)
  });

  const usableImageModels = useMemo(() => listUsableModels(["image", "image-edit"], providerConfigsQuery.data ?? []), [providerConfigsQuery.data]);
  const selectedImageModelId = activeImageModelId ?? activeImageModelIdQuery.data;
  const activeModel = useMemo(() => usableImageModels.find((model) => model.id === selectedImageModelId) ?? usableImageModels[0], [selectedImageModelId, usableImageModels]);
  const activeTextModel = useMemo(() => listUsableModels(["text"], providerConfigsQuery.data ?? [])[0], [providerConfigsQuery.data]);
  const hasMinimumModelConfig = Boolean(activeModel && activeTextModel);
  const overlayImage = useMemo(() => imagesQuery.data?.find((image) => image.id === overlayImageId), [imagesQuery.data, overlayImageId]);
  const pinnedImages = useMemo(() => (imagesQuery.data ?? []).filter((image) => image.pinned), [imagesQuery.data]);
  const activePinnedImages = referenceMode === "restored" ? [] : pinnedImages;
  const imageInstructions = readImageInstructions(activeChat);

  const generateMutation = useMutation({
    onMutate: () => {
      void requestScreenWakeLock();
    },
    mutationFn: async (submittedPrompt: string) => {
      const referencesEnabled = modelSupportsReferenceImages(activeModel);
      const referenceSnapshots = referencesEnabled ? await createReferenceSnapshots(activePinnedImages, uploadedReferences) : undefined;
      const references = referenceSnapshots?.map((reference) => reference.dataUrl);
      const estimatedSeconds = await modelLoadEstimateRepository.getEstimatedSeconds(activeModel!.providerId, activeModel!.providerModelName);
      startGenerationProgress(estimatedSeconds);
      return generateImages(activeChatId!, activeModel!.id, { prompt: submittedPrompt, instructions: imageInstructions, imageCount, aspectRatio, references, referenceSnapshots });
    },
    onSuccess: (_, submittedPrompt) => {
      finishGenerationProgress();
      triggerChatTitleGeneration(activeChatId!, submittedPrompt, (messagesQuery.data?.length ?? 0) === 0);
      return refreshChatData(queryClient, activeChatId);
    },
    onError: () => {
      cancelGenerationProgress();
      return refreshChatData(queryClient, activeChatId);
    }
  });

  const createChatMutation = useMutation({
    mutationFn: () => chatRepository.create(),
    onMutate: () => {
      clearReferenceSelection();
      setInitialGenerationError(undefined);
      generateMutation.reset();
    },
    onSuccess: async (chat) => {
      navigate(`/chats/${chat.id}`);
      setLeftOpen(false);
      setPrompt("");
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    }
  });

  const isGenerating = generateMutation.isPending || isCreatingInitialGeneration;

  useEffect(() => {
    if (!activeImageModelId || usableImageModels.some((model) => model.id === activeImageModelId)) return;
    setActiveImageModelId(undefined);
  }, [activeImageModelId, usableImageModels]);

  useEffect(() => {
    const theme = (themeQuery.data ?? "system") as ThemeMode;
    applyTheme(theme);
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [themeQuery.data]);

  useEffect(() => {
    if (showOptions || activeChatId || !chatsQuery.isFetched) return;

    if ((chatsQuery.data?.length ?? 0) > 0) {
      isCreatingDefaultChatRef.current = false;
      navigate(`/chats/${chatsQuery.data![0].id}`, { replace: true });
      return;
    }

    if (isCreatingDefaultChatRef.current) return;
    isCreatingDefaultChatRef.current = true;
    void chatRepository.create().then((chat) => {
      navigate(`/chats/${chat.id}`, { replace: true });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    }).finally(() => {
      isCreatingDefaultChatRef.current = false;
    });
  }, [activeChatId, chatsQuery.data, chatsQuery.isFetched, navigate, queryClient, showOptions]);

  useEffect(() => {
    if (showOptions) setLeftOpen(false);
  }, [showOptions]);

  useEffect(() => {
    window.localStorage.setItem("chatNavOpen", String(leftOpen));
  }, [leftOpen]);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!providerConfigsQuery.isSuccess || hasMinimumModelConfig || showOptions) return;
    setLeftOpen(false);
    navigate("/options", { replace: true });
  }, [hasMinimumModelConfig, navigate, providerConfigsQuery.isSuccess, showOptions]);

  useEffect(() => () => stopGenerationProgress(), []);

  useEffect(() => {
    if (isGenerating) return;
    void releaseScreenWakeLock();
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void requestScreenWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isGenerating]);

  useEffect(
    () => () => {
      void releaseScreenWakeLock();
    },
    []
  );

  useEffect(() => {
    if (showOptions || !activeChatId) {
      setSettingsReadyChatId(undefined);
      setInitialGenerationError(undefined);
      generateMutation.reset();
      setPrompt("");
      setImageCount(1);
      setAspectRatio("portrait");
      setUploadedReferences([]);
      setReferenceMode("default");
      setActiveImageModelId(activeImageModelIdQuery.data ?? undefined);
      return;
    }

    let cancelled = false;
    setSettingsReadyChatId(undefined);
    setInitialGenerationError(undefined);
    generateMutation.reset();

    void chatRepository.readSettings(activeChatId).then((settings) => {
      if (cancelled) return;
      setPrompt(settings.promptDraft ?? "");
      setImageCount(settings.imageCount ?? 1);
      setAspectRatio(settings.aspectRatio ?? "portrait");
      setUploadedReferences(
        (settings.uploadedReferences ?? []).map((reference) => ({
          id: createClientId(),
          name: reference.name,
          dataUrl: reference.dataUrl
        }))
      );
      setReferenceMode("default");
      setActiveImageModelId(settings.activeImageModelId ?? activeImageModelIdQuery.data ?? undefined);
      setSettingsReadyChatId(activeChatId);
    });

    return () => {
      cancelled = true;
    };
  }, [activeChatId, activeImageModelIdQuery.data, showOptions]);

  useEffect(() => {
    if (!activeChatId || settingsReadyChatId !== activeChatId) return;
    if (promptPersistTimerRef.current !== undefined) window.clearTimeout(promptPersistTimerRef.current);

    promptPersistTimerRef.current = window.setTimeout(() => {
      promptPersistTimerRef.current = undefined;
      void chatRepository.updateSettings(activeChatId, { promptDraft: prompt });
    }, 300);
  }, [activeChatId, prompt, settingsReadyChatId]);

  useEffect(
    () => () => {
      if (promptPersistTimerRef.current !== undefined) window.clearTimeout(promptPersistTimerRef.current);
    },
    []
  );

  async function submitPrompt() {
    const submittedPrompt = prompt.trim();
    if (!submittedPrompt || !activeModel) return;
    setInitialGenerationError(undefined);
    void requestScreenWakeLock();

    if (!activeChatId) {
      clearReferenceSelection();
      const chat = await chatRepository.create();
      navigate(`/chats/${chat.id}`);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      setIsCreatingInitialGeneration(true);
      try {
        const estimatedSeconds = await modelLoadEstimateRepository.getEstimatedSeconds(activeModel.providerId, activeModel.providerModelName);
        startGenerationProgress(estimatedSeconds);
        await generateImages(chat.id, activeModel.id, { prompt: submittedPrompt, instructions: "", imageCount, aspectRatio });
        finishGenerationProgress();
        triggerChatTitleGeneration(chat.id, submittedPrompt, true);
        await refreshChatData(queryClient, chat.id);
      } catch (error) {
        cancelGenerationProgress();
        setInitialGenerationError(errorToMessage(error));
        await refreshChatData(queryClient, chat.id);
      } finally {
        setIsCreatingInitialGeneration(false);
      }
      return;
    }
    generateMutation.mutate(submittedPrompt);
  }

  function repeatHistoricalPrompt(request: GenerationRequestEntity) {
    const repeatedPrompt = request.prompt.trim();
    if (!repeatedPrompt) return;

    setPrompt(repeatedPrompt);
    applyHistoricalGenerationSettings(request);
  }

  async function deleteMessage(messageId: string) {
    const confirmed = window.confirm("Diese Nachricht mit allen zugehörigen Bildern löschen?");
    if (!confirmed) return;

    await messageRepository.deleteWithImages(messageId);
    if (overlayImageId && !imagesQuery.data?.some((image) => image.id === overlayImageId && image.messageId !== messageId)) {
      setOverlayImageId(undefined);
    }
    await refreshChatData(queryClient, activeChatId);
  }

  function applyHistoricalGenerationSettings(request: GenerationRequestEntity) {
    const model = usableImageModels.find((entry) => entry.id === request.modelId);
    if (model) {
      setActiveImageModelId(model.id);
    }

    const parameters = request.parameters ?? {};
    if (isValidImageCount(parameters.imageCount)) setImageCount(parameters.imageCount);
    if (isValidAspectRatio(parameters.aspectRatio)) setAspectRatio(parameters.aspectRatio);
    if (activeChatId && typeof parameters.imageInstructions === "string") {
      void chatRepository.updateImageInstructions(activeChatId, parameters.imageInstructions).then(() => queryClient.invalidateQueries({ queryKey: ["chats"] }));
    }

    const references = readStoredReferences(parameters.references);
    if (references) {
      setReferenceMode("restored");
      const nextReferences = references.map((reference, index) => ({
        id: createClientId(),
        name: reference.type === "uploaded" ? reference.name : `Referenzbild ${index + 1}`,
        dataUrl: reference.dataUrl
      }));
      setUploadedReferences(nextReferences);
      if (activeChatId) {
        void chatRepository.updateSettings(activeChatId, {
          activeImageModelId: model?.id,
          imageCount: isValidImageCount(parameters.imageCount) ? parameters.imageCount : undefined,
          aspectRatio: isValidAspectRatio(parameters.aspectRatio) ? parameters.aspectRatio : undefined,
          uploadedReferences: toChatUploadedReferences(nextReferences),
          imageInstructions: typeof parameters.imageInstructions === "string" ? parameters.imageInstructions : undefined
        });
      }
      return;
    }

    if (activeChatId) {
      void chatRepository.updateSettings(activeChatId, {
        activeImageModelId: model?.id,
        imageCount: isValidImageCount(parameters.imageCount) ? parameters.imageCount : undefined,
        aspectRatio: isValidAspectRatio(parameters.aspectRatio) ? parameters.aspectRatio : undefined
      });
    }
  }

  function triggerChatTitleGeneration(chatId: string, submittedPrompt: string, isFirstPrompt: boolean) {
    if (!isFirstPrompt || !activeTextModel) return;
    void generateChatTitle(chatId, activeTextModel.id, submittedPrompt)
      .catch(() => undefined)
      .finally(() => void queryClient.invalidateQueries({ queryKey: ["chats"] }));
  }

  function toggleLeftPanel() {
    if (leftOpen) {
      closeLeftPanel();
      return;
    }

    openLeftPanel();
  }

  function openLeftPanel() {
    if (rightOpen && activeChatId) navigate(`/chats/${activeChatId}`);
    setLeftOpen(true);
  }

  function closeLeftPanel() {
    setLeftOpen(false);
  }

  function clearReferenceSelection() {
    setReferenceMode("default");
    setUploadedReferences([]);
  }

  function openConfigPanel() {
    setLeftOpen(false);
    navigate(activeChatId ? `/chats/${activeChatId}/config` : "/options");
  }

  function showAdjacentOverlayImage(direction: -1 | 1) {
    const images = imagesQuery.data ?? [];
    if (!overlayImageId || images.length < 2) return;

    const currentIndex = images.findIndex((image) => image.id === overlayImageId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + images.length) % images.length;
    setOverlayImageId(images[nextIndex].id);
  }

  function showNextPinnedImage() {
    if (pinnedImages.length === 0) return;

    const currentImageId = overlayImageId ?? pinnedNavigationImageId;
    const currentIndex = pinnedImages.findIndex((image) => image.id === currentImageId);
    if (currentIndex === pinnedImages.length - 1) {
      setPinnedNavigationImageId(undefined);
      setPinnedNavigationEndRequest((request) => request + 1);
      return;
    }

    const nextIndex = (currentIndex + 1) % pinnedImages.length;
    setPinnedNavigationImageId(pinnedImages[nextIndex].id);
  }

  function handleShellPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!event.isPrimary || overlayImageId || !window.matchMedia("(max-width: 859.98px)").matches) return;
    if (isInteractiveSwipeTarget(event.target)) return;
    if (!leftOpen && event.clientX > navSwipeEdgeWidth) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    navSwipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, dragging: false };
  }

  function handleShellTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || overlayImageId || !window.matchMedia("(max-width: 859.98px)").matches) return;
    if (isInteractiveSwipeTarget(event.target)) return;

    const touch = event.touches[0];
    if (!leftOpen && touch.clientX > navSwipeEdgeWidth) return;
    touchSwipeStartRef.current = { x: touch.clientX, y: touch.clientY, dragging: false };
  }

  function handleShellPointerMove(event: PointerEvent<HTMLDivElement>) {
    updateNavDrag(event);
  }

  function handleShellTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchSwipeStartRef.current;
    if (!start || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (!start.dragging && Math.abs(deltaX) < navSwipeDragStartThreshold) return;
    if (!start.dragging && Math.abs(deltaX) < Math.abs(deltaY)) {
      touchSwipeStartRef.current = undefined;
      return;
    }

    if (event.cancelable) event.preventDefault();
    start.dragging = true;
    suppressNextClickRef.current = true;
    const maxOffset = Math.min(window.innerWidth * 0.86, 320) * 1.04;
    const offset = leftOpen ? Math.min(Math.max(deltaX, -maxOffset), 0) : Math.max(Math.min(deltaX, maxOffset), 0);
    const backdropProgress = leftOpen ? 1 - Math.abs(offset) / maxOffset : offset / maxOffset;
    setLeftDragging(true);
    event.currentTarget.classList.add("nav-dragging");
    event.currentTarget.style.setProperty("--chat-nav-drag-x", `${offset}px`);
    event.currentTarget.style.setProperty("--chat-nav-backdrop-progress", String(Math.max(0, Math.min(backdropProgress, 1))));
  }

  function handleShellPointerUp(event: PointerEvent<HTMLDivElement>) {
    finishNavSwipe(event);
    resetNavDrag(event.currentTarget);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (suppressNextClickRef.current) window.setTimeout(() => (suppressNextClickRef.current = false), 0);
  }

  function handleShellTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchSwipeStartRef.current;
    if (start && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (Math.abs(deltaX) >= navSwipeThreshold && Math.abs(deltaX) >= Math.abs(deltaY)) {
        if (deltaX > navSwipeThreshold) openLeftPanel();
        if (deltaX < -navSwipeThreshold && leftOpen) closeLeftPanel();
      }
    }

    touchSwipeStartRef.current = undefined;
    resetNavDrag(event.currentTarget);
    if (suppressNextClickRef.current) window.setTimeout(() => (suppressNextClickRef.current = false), 0);
  }

  function updateNavDrag(event: PointerEvent<HTMLDivElement>) {
    const start = navSwipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (!start.dragging && Math.abs(deltaX) < navSwipeDragStartThreshold) return;
    if (!start.dragging && Math.abs(deltaX) < Math.abs(deltaY)) {
      resetNavDrag(event.currentTarget);
      return;
    }

    if (event.cancelable) event.preventDefault();
    start.dragging = true;
    suppressNextClickRef.current = true;
    const maxOffset = Math.min(window.innerWidth * 0.86, 320) * 1.04;
    const offset = leftOpen ? Math.min(Math.max(deltaX, -maxOffset), 0) : Math.max(Math.min(deltaX, maxOffset), 0);
    const backdropProgress = leftOpen ? 1 - Math.abs(offset) / maxOffset : offset / maxOffset;
    setLeftDragging(true);
    event.currentTarget.classList.add("nav-dragging");
    event.currentTarget.style.setProperty("--chat-nav-drag-x", `${offset}px`);
    event.currentTarget.style.setProperty("--chat-nav-backdrop-progress", String(Math.max(0, Math.min(backdropProgress, 1))));
  }

  function finishNavSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = navSwipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < navSwipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX > navSwipeThreshold) openLeftPanel();
    if (deltaX < -navSwipeThreshold && leftOpen) closeLeftPanel();
  }

  function handleShellPointerCancel(event: PointerEvent<HTMLDivElement>) {
    resetNavDrag(event.currentTarget);
    suppressNextClickRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleShellTouchCancel(event: TouchEvent<HTMLDivElement>) {
    touchSwipeStartRef.current = undefined;
    resetNavDrag(event.currentTarget);
    suppressNextClickRef.current = false;
  }

  function resetNavDrag(shell: HTMLDivElement) {
    navSwipeStartRef.current = undefined;
    setLeftDragging(false);
    shell.classList.remove("nav-dragging");
    shell.style.removeProperty("--chat-nav-drag-x");
    shell.style.removeProperty("--chat-nav-backdrop-progress");
  }

  function handleShellClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressNextClickRef.current) return;

    suppressNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function startGenerationProgress(estimatedSeconds: number) {
    stopGenerationProgress();
    const estimatedMs = Math.max(estimatedSeconds, 1) * 1000;
    const startedAt = Date.now();
    setGenerationProgressPercent(0);
    generationProgressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextPercent = Math.min(maxAutoProgressPercent, (elapsed / estimatedMs) * 100);
      setGenerationProgressPercent(nextPercent);
    }, progressTickMs);
  }

  function finishGenerationProgress() {
    stopGenerationProgress();
    setGenerationProgressPercent(100);
    generationProgressTimerRef.current = window.setTimeout(() => {
      generationProgressTimerRef.current = undefined;
      setGenerationProgressPercent(0);
    }, progressResetDelayMs);
  }

  function cancelGenerationProgress() {
    stopGenerationProgress();
    setGenerationProgressPercent(0);
  }

  function stopGenerationProgress() {
    if (generationProgressTimerRef.current === undefined) return;
    window.clearInterval(generationProgressTimerRef.current);
    generationProgressTimerRef.current = undefined;
  }

  async function requestScreenWakeLock() {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (!window.isSecureContext || document.visibilityState !== "visible") return;
    if (wakeLockRef.current && !wakeLockRef.current.released) return;
    try {
      const wakeLock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wakeLock;
      wakeLock.addEventListener("release", () => {
        if (wakeLockRef.current === wakeLock) wakeLockRef.current = null;
      });
    } catch {
      wakeLockRef.current = null;
    }
  }

  async function releaseScreenWakeLock() {
    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!wakeLock || wakeLock.released) return;
    try {
      await wakeLock.release();
    } catch {
      return;
    }
  }

  return (
    <div
      className="app-shell"
      onPointerDown={handleShellPointerDown}
      onPointerMove={handleShellPointerMove}
      onPointerUp={handleShellPointerUp}
      onPointerCancel={handleShellPointerCancel}
      onTouchStart={handleShellTouchStart}
      onTouchMove={handleShellTouchMove}
      onTouchEnd={handleShellTouchEnd}
      onTouchCancel={handleShellTouchCancel}
      onClickCapture={handleShellClickCapture}
    >
      {!leftOpen && !leftDragging && <div className="nav-edge-swipe-target" aria-hidden="true" />}
      <ChatNavigation
        chats={chatsQuery.data ?? []}
        activeChatId={activeChatId}
        open={leftOpen}
        showCloseControl={leftDragging}
        onToggle={toggleLeftPanel}
        onSelect={(id) => {
          navigate(`/chats/${id}`);
          setLeftOpen(false);
        }}
        onCreate={() => createChatMutation.mutate()}
        onOptions={() => {
          navigate("/options");
          setLeftOpen(false);
        }}
      />
      {(leftOpen || leftDragging || rightOpen) && (
        <button
          className="panel-backdrop"
          aria-label="Overlay schließen"
          onClick={() => {
            closeLeftPanel();
            closePanels(navigate, activeChatId);
          }}
        />
      )}
      {overlayImage && (
        <ImageOverlay
          image={overlayImage}
          canNavigate={(imagesQuery.data?.length ?? 0) > 1}
          onClose={() => setOverlayImageId(undefined)}
          onPrevious={() => showAdjacentOverlayImage(-1)}
          onNext={() => showAdjacentOverlayImage(1)}
        />
      )}
      <main className="workspace">
        <header className="topbar container-xxl p-2">
          <button className="btn btn-outline-secondary icon-button" aria-label="Chats ein- oder ausblenden" onClick={toggleLeftPanel}>
            <Menu size={20} />
          </button>
        </header>
        <InstallPromptBanner />
        {showOptions ? (
          <OptionsView providerConfigs={providerConfigsQuery.data ?? []} theme={themeQuery.data ?? "system"} />
        ) : (
          <WorkspaceView
            sessionId={activeChatId}
            contentReady={!activeChatId || (messagesQuery.isFetched && imagesQuery.isFetched)}
            prompt={prompt}
            setPrompt={setPrompt}
            canGenerate={Boolean(isOnline && hasMinimumModelConfig && prompt.trim())}
            isGenerating={isGenerating}
            generationProgressPercent={generationProgressPercent}
            error={generateMutation.error?.message ?? initialGenerationError}
            onDismissError={() => {
              setInitialGenerationError(undefined);
              generateMutation.reset();
            }}
            connectivityNotice={isOnline ? undefined : "Bildgenerierung benötigt eine Verbindung zum Anbieter."}
            messages={messagesQuery.data ?? []}
            images={imagesQuery.data ?? []}
            generationRequests={generationRequestsQuery.data ?? []}
            overlayImageId={overlayImageId}
            focusedImageId={overlayImageId ?? pinnedNavigationImageId}
            pinnedImageCount={pinnedImages.length}
            scrollToEndRequest={pinnedNavigationEndRequest}
            onGenerate={submitPrompt}
            onOpenConfig={openConfigPanel}
            onDeleteMessage={deleteMessage}
            onRepeatPrompt={repeatHistoricalPrompt}
            onTogglePinned={async (image) => {
              setReferenceMode("default");
              if (!image.pinned && pinnedImages.length >= 3) {
                window.alert("Maximal 3 Bilder können angepinnt werden.");
                return;
              }
              await imageRepository.togglePinned(image.id, !image.pinned);
              await refreshChatData(queryClient, activeChatId);
            }}
            onOverlay={setOverlayImageId}
            onShowNextPinnedImage={showNextPinnedImage}
          />
        )}
      </main>
      <ConfigPanel
        open={rightOpen}
        activeChatId={activeChatId}
        activeChat={activeChat}
        activeModel={activeModel}
        imageModels={usableImageModels}
        imageCount={imageCount}
        aspectRatio={aspectRatio}
        onClose={() => navigate(activeChatId ? `/chats/${activeChatId}` : "/")}
        onActiveModel={async (modelId) => {
          setActiveImageModelId(modelId);
          if (!activeChatId) {
            queryClient.setQueryData(["activeImageModelId"], modelId);
            await appOptionsRepository.set("activeImageModelId", modelId);
            await queryClient.invalidateQueries({ queryKey: ["activeImageModelId"] });
            return;
          }
          await chatRepository.updateSettings(activeChatId, { activeImageModelId: modelId });
          await queryClient.invalidateQueries({ queryKey: ["chats"] });
        }}
        onImageCount={(value) => {
          setImageCount(value);
          if (!activeChatId || settingsReadyChatId !== activeChatId) return;
          void chatRepository.updateSettings(activeChatId, { imageCount: value });
        }}
        onAspectRatio={(value) => {
          if (!isValidAspectRatio(value)) return;
          setAspectRatio(value);
          if (!activeChatId || settingsReadyChatId !== activeChatId) return;
          void chatRepository.updateSettings(activeChatId, { aspectRatio: value });
        }}
        pinnedImages={activePinnedImages}
        uploadedReferences={uploadedReferences}
        onRemovePinnedReference={async (imageId) => {
          await imageRepository.togglePinned(imageId, false);
          await refreshChatData(queryClient, activeChatId);
        }}
        onUploadReferences={async (files) => {
          const mapped = await Promise.all(
            files.map(async (file) => ({
              id: createClientId(),
              name: file.name,
              dataUrl: await fileToDataUrl(file)
            }))
          );
          const nextReferences = [...uploadedReferences, ...mapped].slice(0, 3);
          setUploadedReferences(nextReferences);
          if (!activeChatId || settingsReadyChatId !== activeChatId) return;
          await chatRepository.updateSettings(activeChatId, { uploadedReferences: toChatUploadedReferences(nextReferences) });
        }}
        onRemoveUploadedReference={(id) => {
          const nextReferences = uploadedReferences.filter((entry) => entry.id !== id);
          setUploadedReferences(nextReferences);
          if (!activeChatId || settingsReadyChatId !== activeChatId) return;
          void chatRepository.updateSettings(activeChatId, { uploadedReferences: toChatUploadedReferences(nextReferences) });
        }}
        onRenameChat={async (title) => {
          if (!activeChatId) return;
          await chatRepository.updateTitle(activeChatId, title);
          updateCachedChat(queryClient, activeChatId, (chat) => ({ ...chat, title, titleEdited: true, updatedAt: new Date().toISOString() }));
        }}
        onSaveImageInstructions={async (instructions) => {
          if (!activeChatId) return;
          await chatRepository.updateImageInstructions(activeChatId, instructions);
          updateCachedImageInstructions(queryClient, activeChatId, instructions);
        }}
        onDeleteChat={async () => {
          if (!activeChatId) return;
          const confirmed = window.confirm("Diesen Chat mit Nachrichten und Bildern löschen?");
          if (!confirmed) return;
          await chatRepository.deleteWithChildren(activeChatId);
          await refreshChatData(queryClient, activeChatId);
          await queryClient.invalidateQueries({ queryKey: ["chats"] });
          navigate("/", { replace: true });
        }}
      />
    </div>
  );
}

function isInteractiveSwipeTarget(target: EventTarget) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('a, button, input, textarea, select, [contenteditable="true"]'));
}

function readImageInstructions(chat?: ChatEntity): string {
  const value = chat?.metadata?.imageInstructions;
  return typeof value === "string" ? value : "";
}

function updateCachedChat(queryClient: QueryClient, chatId: string, updateChat: (chat: ChatEntity) => ChatEntity) {
  queryClient.setQueryData<ChatEntity[]>(["chats"], (chats) => {
    if (!chats) return chats;
    return chats.map((chat) => (chat.id === chatId ? updateChat(chat) : chat)).sort((left, right) => getLastChangedAt(right).localeCompare(getLastChangedAt(left)));
  });
}

function toChatUploadedReferences(references: UploadedReference[]): ChatUploadedReference[] {
  return references.slice(0, 3).map((reference) => ({ name: reference.name, dataUrl: reference.dataUrl }));
}

function updateCachedImageInstructions(queryClient: QueryClient, chatId: string, imageInstructions: string) {
  updateCachedChat(queryClient, chatId, (chat) => {
    const nextMetadata = { ...(chat.metadata ?? {}) };
    if (imageInstructions.trim()) {
      nextMetadata.imageInstructions = imageInstructions;
    } else {
      delete nextMetadata.imageInstructions;
    }
    return { ...chat, metadata: nextMetadata, updatedAt: new Date().toISOString() };
  });
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Die Generierung ist fehlgeschlagen.";
}

function isValidImageCount(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;
}

function isValidAspectRatio(value: JsonValue | undefined): value is ChatAspectRatio {
  return value === "square" || value === "portrait" || value === "landscape";
}

function readStoredReferences(value: JsonValue | undefined): StoredReference[] | undefined {
  if (!Array.isArray(value)) {
    if (value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, JsonValue>).count === 0) return [];
    return undefined;
  }
  const references = value.filter(isStoredReference).slice(0, 3);
  return references.length > 0 ? references : [];
}

function isStoredReference(value: JsonValue): value is StoredReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const reference = value as Record<string, JsonValue>;
  if (reference.type === "pinned") return typeof reference.imageId === "string" && typeof reference.dataUrl === "string";
  if (reference.type === "uploaded") return typeof reference.name === "string" && typeof reference.dataUrl === "string";
  return false;
}
