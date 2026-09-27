import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Navigate,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { chatQueries } from "../chats/queries";
import { useChatDraft } from "../chats/useChatDraft";
import { ConfigPanel } from "../chats/components/ConfigPanel";
import { isValidAspectRatio } from "../chats/types";
import { useModelConfiguration } from "../settings/queries";
import {
  useGeneration,
  isGenerationActive,
} from "../generation/runtime/useGeneration";
import { useOnline } from "../generation/runtime/useOnline";
import { generationCoordinator } from "../generation/services/generationCoordinator";
import { ImageOverlay } from "../images/components/ImageOverlay";
import { WorkspaceView } from "./components/WorkspaceView";
import { useWorkspaceActions } from "./useWorkspaceActions";
import { useImageNavigation } from "./useImageNavigation";

export function WorkspaceRoute() {
  const { chatId } = useParams();
  return chatId ? (
    <WorkspacePage key={chatId} chatId={chatId} />
  ) : (
    <Navigate to="/" replace />
  );
}

function WorkspacePage({ chatId }: { chatId: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { configurationHost } = useOutletContext<{
    configurationHost: HTMLDivElement | null;
  }>();
  const models = useModelConfiguration();
  const draft = useChatDraft(chatId);
  const chats = useQuery(chatQueries.list);
  const messages = useQuery(chatQueries.messages(chatId));
  const images = useQuery(chatQueries.images(chatId));
  const requests = useQuery(chatQueries.requests(chatId));
  const job = useGeneration(chatId);
  const online = useOnline();
  const navigation = useImageNavigation(images.data ?? []);
  const actions = useWorkspaceActions(draft.store, models.imageModels);
  const persistedTitle = chats.data?.find((chat) => chat.id === chatId)?.title;
  useEffect(() => {
    if (persistedTitle) draft.store.syncGeneratedTitle(persistedTitle);
  }, [persistedTitle, draft.store, draft.ready]);
  useEffect(() => () => generationCoordinator.dismiss(chatId), [chatId]);

  if (models.ready && !models.usable) return <Navigate to="/options" replace />;
  if (chats.isSuccess && !chats.data.some((chat) => chat.id === chatId))
    return <Navigate to="/" replace />;
  const readError =
    models.error ??
    draft.error ??
    messages.error ??
    images.error ??
    requests.error;
  if (!draft.data || !models.ready)
    return <p role="status">{readError?.message ?? t("common.loading")}</p>;
  const value = draft.data;
  const activeModel =
    models.imageModels.find(
      (model) =>
        model.id === (value.activeImageModelId ?? models.defaultModel?.id),
    ) ?? models.imageModels[0];
  const activePinned =
    value.referenceMode === "restored" ? [] : navigation.pinned;
  const generating = isGenerationActive(job) || actions.generating;
  const panel = (
    <ConfigPanel
      open={location.pathname.endsWith("/config")}
      activeChatId={chatId}
      title={value.title}
      imageInstructions={value.imageInstructions}
      activeModel={activeModel}
      imageModels={models.imageModels}
      imageCount={value.imageCount}
      aspectRatio={value.aspectRatio}
      pinnedImages={activePinned}
      uploadedReferences={value.uploadedReferences}
      onClose={() => actions.configure(`/chats/${chatId}`)}
      onActiveModel={(activeImageModelId) =>
        draft.store.update({ activeImageModelId })
      }
      onImageCount={(imageCount) => draft.store.update({ imageCount })}
      onAspectRatio={(aspectRatio) => {
        if (isValidAspectRatio(aspectRatio))
          draft.store.update({ aspectRatio });
      }}
      onRenameChat={(title) => draft.store.update({ title })}
      onSaveImageInstructions={(imageInstructions) =>
        draft.store.update({ imageInstructions })
      }
      onUploadReferences={actions.upload}
      onRemoveUploadedReference={(id) =>
        draft.store.update({
          uploadedReferences: value.uploadedReferences.filter(
            (reference) => reference.id !== id,
          ),
        })
      }
      onRemovePinnedReference={(id) => {
        const image = navigation.pinned.find((entry) => entry.id === id);
        if (image) actions.pin(image, navigation.pinned.length);
      }}
    />
  );

  return (
    <>
      {configurationHost && createPortal(panel, configurationHost)}
      {navigation.overlay && (
        <ImageOverlay
          image={navigation.overlay}
          canNavigate={(images.data?.length ?? 0) > 1}
          onClose={() => navigation.setOverlayId(undefined)}
          onPrevious={() => navigation.adjacent(-1)}
          onNext={() => navigation.adjacent(1)}
        />
      )}
      <WorkspaceView
        sessionId={chatId}
        contentReady={messages.isSuccess && images.isSuccess}
        prompt={value.promptDraft}
        setPrompt={(promptDraft) => draft.store.update({ promptDraft })}
        canGenerate={
          online &&
          Boolean(activeModel) &&
          Boolean(value.promptDraft.trim()) &&
          !readError
        }
        isGenerating={generating}
        generationJob={job}
        error={readError?.message ?? actions.error?.message ?? job?.error}
        onDismissError={() => {
          actions.dismiss();
          generationCoordinator.dismiss(chatId);
        }}
        connectivityNotice={online ? undefined : t("workspace.offline")}
        messages={messages.data ?? []}
        images={images.data ?? []}
        generationRequests={requests.data ?? []}
        overlayImageId={navigation.overlay?.id}
        focusedImageId={navigation.focusedId}
        pinnedImageCount={navigation.pinned.length}
        scrollToEndRequest={navigation.endRequest}
        onGenerate={() => {
          if (activeModel && !generating)
            actions.submit(activeModel, activePinned);
        }}
        onCancel={actions.cancel}
        onOpenConfig={() => actions.configure(`/chats/${chatId}/config`)}
        onDeleteMessage={actions.removeMessage}
        onRepeatPrompt={actions.repeat}
        isCreatingChatFromImage={actions.deriving}
        onCreateChatFromImage={(image) =>
          actions.derive(image, requests.data ?? [], messages.data ?? [])
        }
        onTogglePinned={(image) => actions.pin(image, navigation.pinned.length)}
        onOverlay={navigation.setOverlayId}
        onShowNextPinnedImage={navigation.nextPinned}
      />
    </>
  );
}
