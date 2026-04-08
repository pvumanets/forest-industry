import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { EntryOfflinePage } from "../pages/EntryOfflinePage";
import { EntryReputationPage } from "../pages/EntryReputationPage";
import { EntryWeekPage } from "../pages/EntryWeekPage";
import { LoginPage } from "../pages/LoginPage";
import { PlaceholderSectionPage } from "../pages/PlaceholderSectionPage";
import { ReportsListPage } from "../pages/ReportsListPage";
import {
  ReportMaps2gisPage,
  ReportMapsYandexPage,
  ReportOzonPage,
  ReportOutletsPage,
  ReportReturnsPage,
  ReportSitePage,
} from "../pages/reports";
import { HomeRedirect } from "./HomeRedirect";
import { ProtectedLayout } from "./ProtectedLayout";
import { RoleGuard } from "./RoleGuard";

const ownerMarketer = ["owner", "marketer"] as const;
const marketerOnly = ["marketer"] as const;
const siteManagerOnly = ["site_manager"] as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<HomeRedirect />} />
        <Route
          path="dashboard"
          element={
            <RoleGuard allow={ownerMarketer}>
              <DashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="entry/week"
          element={
            <RoleGuard allow={marketerOnly}>
              <EntryWeekPage />
            </RoleGuard>
          }
        />
        <Route
          path="entry/reputation"
          element={
            <RoleGuard allow={marketerOnly}>
              <EntryReputationPage />
            </RoleGuard>
          }
        />
        <Route
          path="entry/offline"
          element={
            <RoleGuard allow={siteManagerOnly}>
              <EntryOfflinePage />
            </RoleGuard>
          }
        />
        <Route
          path="entry/point-metrics"
          element={
            <RoleGuard allow={marketerOnly}>
              <PlaceholderSectionPage title="Показатели с точек" />
            </RoleGuard>
          }
        />
        <Route
          path="entry/defect"
          element={
            <RoleGuard allow={marketerOnly}>
              <PlaceholderSectionPage title="Я заметил брак" />
            </RoleGuard>
          }
        />
        <Route
          path="company/rules"
          element={
            <RoleGuard allow={ownerMarketer}>
              <PlaceholderSectionPage title="Правила и философия" />
            </RoleGuard>
          }
        />
        <Route
          path="company/documents"
          element={
            <RoleGuard allow={ownerMarketer}>
              <PlaceholderSectionPage title="Документы" />
            </RoleGuard>
          }
        />
        <Route
          path="reports"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportsListPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/site"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportSitePage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/outlets"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportOutletsPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/maps/2gis"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportMaps2gisPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/maps/yandex"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportMapsYandexPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/ozon"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportOzonPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports/returns"
          element={
            <RoleGuard allow={ownerMarketer}>
              <ReportReturnsPage />
            </RoleGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
