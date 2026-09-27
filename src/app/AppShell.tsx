import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChatNavigation } from "../features/chats/components/ChatNavigation";
import { InstallPromptBanner } from "./components/InstallPromptBanner";
import { useNavigationSwipe } from "./runtime/useNavigationSwipe";
import { chatQueries } from "../features/chats/queries";
import { useChatMutations } from "../features/chats/mutations";
import { useModelConfiguration } from "../features/settings/queries";
import { flushChatDrafts } from "../features/chats/draftStore";

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const chats = useQuery(chatQueries.list);
  const models = useModelConfiguration();
  const mutations = useChatMutations();
  const [error, setError] = useState<string>();
  const [configurationHost, setConfigurationHost] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(() => !matchMedia("(max-width: 859.98px)").matches && localStorage.getItem("chatNavOpen") !== "false");
  const configOpen = location.pathname.endsWith("/config");
  const swipe = useNavigationSwipe(open, changeOpen);
  useEffect(() => {
    // On desktop the navigation stays open across route changes; mobile hides
    // it after every navigation so it never blocks the workspace.
    if (matchMedia("(max-width: 859.98px)").matches) setOpen(false);
  }, [location.pathname]);
  useEffect(() => { localStorage.setItem("chatNavOpen", String(open)); }, [open]);

  async function perform(action: () => Promise<void>) {
    try { setError(undefined); await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : t("errors.unknown")); }
  }

  function go(path: string) {
    void perform(async () => { await flushChatDrafts(); navigate(path); setOpen(false); });
  }

  function changeOpen(next: boolean) {
    if (next && configOpen && chatId) go(`/chats/${chatId}`);
    setOpen(next);
  }

  return <div className="app-shell" {...swipe.handlers}>
    {!open && !swipe.dragging && <div className="nav-edge-swipe-target" aria-hidden="true" />}
    <ChatNavigation chats={chats.data ?? []} activeChatId={chatId} open={open} showCloseControl={swipe.dragging}
      onToggle={() => changeOpen(!open)} onSelect={(id) => go(`/chats/${id}`)} onOptions={() => go("/options")}
      onCreate={() => void perform(async () => {
        const chat = await mutations.create.mutateAsync({ title: t("navigation.newSession"), modelId: models.defaultModel?.id });
        navigate(`/chats/${chat.id}`);
        setOpen(false);
      })}
      onDelete={(id) => void perform(async () => {
        if (!window.confirm(t("dialogs.deleteChat"))) return;
        await mutations.remove.mutateAsync(id);
        if (id === chatId) navigate("/", { replace: true });
      })} />
    {(open || swipe.dragging || configOpen) && <button className="panel-backdrop" aria-label={t("common.close")} onClick={() => {
      setOpen(false); if (configOpen && chatId) go(`/chats/${chatId}`);
    }} />}
    <main className="workspace">
      <header className="topbar container-xxl p-2"><button className="btn btn-outline-secondary icon-button" aria-label={t("navigation.expand")} onClick={() => changeOpen(!open)}><Menu size={20} /></button></header>
      <InstallPromptBanner />
      {(error || chats.error) && <p className="alert alert-danger" role="alert">{error ?? chats.error?.message}</p>}
      <Outlet context={{ configurationHost }} />
    </main>
    <div ref={setConfigurationHost} style={{ display: "contents" }} />
  </div>;
}
