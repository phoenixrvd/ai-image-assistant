import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AppRuntime } from "./runtime/AppRuntime";
import { WorkspaceIndex } from "../features/workspace/WorkspaceIndex";
import { WorkspaceRoute } from "../features/workspace/WorkspacePage";
import { OptionsPage } from "../features/settings/OptionsPage";

export function App() {
  return <>
    <AppRuntime />
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<WorkspaceIndex />} />
        <Route path="/options" element={<OptionsPage />} />
        <Route path="/chats/:chatId" element={<WorkspaceRoute />} />
        <Route path="/chats/:chatId/config" element={<WorkspaceRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </>;
}
