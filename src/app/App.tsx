import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import type { ChatEntity, GenerationRequestEntity, JsonValue, ThemeMode } from "../db/entities";
import { createClientId } from "../db/id";
import { appOptionsRepository } from "../db/repositories/appOptionsRepository";
import { chatRepository } from "../db/repositories/chatRepository";
import { generationRepository } from "../db/repositories/generationRepository";
import { imageRepository } from "../db/repositories/imageRepository";
import { messageRepository } from "../db/repositories/messageRepository";
import { isModelUsable, modelConfigRepository, modelSupportsReferenceImages } from "../db/repositories/modelConfigRepository";
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
  const [prompt, setPrompt] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("promptDraft") ?? "";
  });
  const [imageCount, setImageCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("portrait");
  const [overlayImageId, setOverlayImageId] = useState<string>();
  const [uploadedReferences, setUploadedReferences] = useState<UploadedReference[]>([]);
  const [referenceMode, setReferenceMode] = useState<"default" | "restored">("default");
  const [activeImageModelId, setActiveImageModelId] = useState<string>();
  const [isCreatingInitialGeneration, setIsCreatingInitialGeneration] = useState(false);
  const [initialGenerationError, setInitialGenerationError] = useState<string>();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [leftDragging, setLeftDragging] = useState(false);
  const navSwipeStartRef = useRef<{ x: number; y: number; pointerId: number; dragging: boolean } | undefined>(undefined);
  const suppressNextClickRef = useRef(false);

  const chatsQuery = useQuery({ queryKey: ["chats"], queryFn: chatRepository.list });
  const modelsQuery = useQuery({ queryKey: ["models"], queryFn: modelConfigRepository.list });
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

  const usableImageModels = useMemo(() => modelsQuery.data?.filter((model) => isModelUsable(model, "image")) ?? [], [modelsQuery.data]);
  const selectedImageModelId = activeImageModelId ?? activeImageModelIdQuery.data;
  const activeModel = useMemo(() => usableImageModels.find((model) => model.id === selectedImageModelId) ?? usableImageModels[0], [selectedImageModelId, usableImageModels]);
  const activeTextModel = useMemo(() => modelsQuery.data?.find((model) => isModelUsable(model, "chat")), [modelsQuery.data]);
  const hasMinimumModelConfig = Boolean(activeModel && activeTextModel);
  const overlayImage = useMemo(() => imagesQuery.data?.find((image) => image.id === overlayImageId), [imagesQuery.data, overlayImageId]);
  const pinnedImages = useMemo(() => (imagesQuery.data ?? []).filter((image) => image.pinned), [imagesQuery.data]);
  const activePinnedImages = referenceMode === "restored" ? [] : pinnedImages;
  const imageInstructions = readImageInstructions(activeChat);

  useEffect(() => {
    if (activeImageModelIdQuery.data) setActiveImageModelId(activeImageModelIdQuery.data);
  }, [activeImageModelIdQuery.data]);

  useEffect(() => {
    if (!activeImageModelId || usableImageModels.some((model) => model.id === activeImageModelId)) return;
    setActiveImageModelId(undefined);
  }, [activeImageModelId, usableImageModels]);

  useEffect(() => {
    window.sessionStorage.setItem("promptDraft", prompt);
  }, [prompt]);

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
    if (!activeChatId && !showOptions && chatsQuery.data?.[0]) navigate(`/chats/${chatsQuery.data[0].id}`, { replace: true });
  }, [activeChatId, chatsQuery.data, navigate, showOptions]);

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
    if (!modelsQuery.isSuccess || hasMinimumModelConfig || showOptions) return;
    setLeftOpen(false);
    navigate("/options", { replace: true });
  }, [hasMinimumModelConfig, modelsQuery.isSuccess, navigate, showOptions]);

  const createChatMutation = useMutation({
    mutationFn: () => chatRepository.create(),
    onMutate: () => {
      clearReferenceSelection();
    },
    onSuccess: async (chat) => {
      navigate(`/chats/${chat.id}`);
      setLeftOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (submittedPrompt: string) => {
      const referencesEnabled = modelSupportsReferenceImages(activeModel);
      const referenceSnapshots = referencesEnabled ? await createReferenceSnapshots(activePinnedImages, uploadedReferences) : undefined;
      const references = referenceSnapshots?.map((reference) => reference.dataUrl);
      return generateImages(activeChatId!, activeModel!.id, { prompt: submittedPrompt, instructions: imageInstructions, imageCount, aspectRatio, references, referenceSnapshots });
    },
    onSuccess: () => refreshChatData(queryClient, activeChatId),
    onError: () => refreshChatData(queryClient, activeChatId)
  });

  async function submitPrompt() {
    const submittedPrompt = prompt.trim();
    if (!submittedPrompt || !activeModel) return;
    setInitialGenerationError(undefined);

    if (!activeChatId) {
      clearReferenceSelection();
      const chat = await chatRepository.create();
      navigate(`/chats/${chat.id}`);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      triggerChatTitleGeneration(chat.id, submittedPrompt, true);
      setIsCreatingInitialGeneration(true);
      try {
        await generateImages(chat.id, activeModel.id, { prompt: submittedPrompt, instructions: "", imageCount, aspectRatio });
        await refreshChatData(queryClient, chat.id);
      } catch (error) {
        setInitialGenerationError(errorToMessage(error));
        await refreshChatData(queryClient, chat.id);
      } finally {
        setIsCreatingInitialGeneration(false);
      }
      return;
    }
    triggerChatTitleGeneration(activeChatId, submittedPrompt, (messagesQuery.data?.length ?? 0) === 0);
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
    const model = usableImageModels.find((entry) => entry.id === request.modelConfigId);
    if (model) {
      setActiveImageModelId(model.id);
      queryClient.setQueryData(["activeImageModelId"], model.id);
      void appOptionsRepository.set("activeImageModelId", model.id).then(() => queryClient.invalidateQueries({ queryKey: ["activeImageModelId"] }));
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
      setUploadedReferences(
        references.map((reference, index) => ({
          id: createClientId(),
          name: reference.type === "uploaded" ? reference.name : `Referenzbild ${index + 1}`,
          dataUrl: reference.dataUrl
        }))
      );
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

  function scrollToImage(imageId: string) {
    document.getElementById(`image-${imageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function showAdjacentOverlayImage(direction: -1 | 1) {
    const images = imagesQuery.data ?? [];
    if (!overlayImageId || images.length < 2) return;

    const currentIndex = images.findIndex((image) => image.id === overlayImageId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + images.length) % images.length;
    setOverlayImageId(images[nextIndex].id);
  }

  function handleShellPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    if (!event.isPrimary || overlayImageId || !window.matchMedia("(max-width: 859.98px)").matches) return;
    if (isTextInputSwipeTarget(event.target)) return;
    if (!leftOpen && event.clientX > navSwipeEdgeWidth) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    navSwipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, dragging: false };
  }

  function handleShellPointerMove(event: PointerEvent<HTMLDivElement>) {
    updateNavDrag(event);
  }

  function handleShellPointerUp(event: PointerEvent<HTMLDivElement>) {
    finishNavSwipe(event);
    resetNavDrag(event.currentTarget);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
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

  return (
    <div
      className="app-shell"
      onPointerDown={handleShellPointerDown}
      onPointerMove={handleShellPointerMove}
      onPointerUp={handleShellPointerUp}
      onPointerCancel={handleShellPointerCancel}
      onClickCapture={handleShellClickCapture}
    >
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
          <OptionsView models={modelsQuery.data ?? []} theme={themeQuery.data ?? "system"} />
        ) : (
          <WorkspaceView
            prompt={prompt}
            setPrompt={setPrompt}
            canGenerate={Boolean(isOnline && hasMinimumModelConfig && prompt.trim())}
            isGenerating={generateMutation.isPending || isCreatingInitialGeneration}
            error={generateMutation.error?.message ?? initialGenerationError}
            connectivityNotice={isOnline ? undefined : "Bildgenerierung benötigt eine Verbindung zum Anbieter."}
            messages={messagesQuery.data ?? []}
            images={imagesQuery.data ?? []}
            generationRequests={generationRequestsQuery.data ?? []}
            overlayImageId={overlayImageId}
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
          queryClient.setQueryData(["activeImageModelId"], modelId);
          await appOptionsRepository.set("activeImageModelId", modelId);
          await queryClient.invalidateQueries({ queryKey: ["activeImageModelId"] });
        }}
        onImageCount={setImageCount}
        onAspectRatio={setAspectRatio}
        pinnedImages={activePinnedImages}
        uploadedReferences={uploadedReferences}
        onScrollToImage={scrollToImage}
        onUploadReferences={async (files) => {
          const mapped = await Promise.all(
            files.map(async (file) => ({
              id: createClientId(),
              name: file.name,
              dataUrl: await fileToDataUrl(file)
            }))
          );
          setUploadedReferences((current) => [...current, ...mapped]);
        }}
        onRemoveUploadedReference={(id) => setUploadedReferences((current) => current.filter((entry) => entry.id !== id))}
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

function isTextInputSwipeTarget(target: EventTarget) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function readImageInstructions(chat?: ChatEntity): string {
  const value = chat?.metadata?.imageInstructions;
  return typeof value === "string" ? value : "";
}

function updateCachedChat(queryClient: QueryClient, chatId: string, updateChat: (chat: ChatEntity) => ChatEntity) {
  queryClient.setQueryData<ChatEntity[]>(["chats"], (chats) => {
    if (!chats) return chats;
    return chats.map((chat) => (chat.id === chatId ? updateChat(chat) : chat)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  });
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

function isValidAspectRatio(value: JsonValue | undefined): value is string {
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
