import { Route as rootRouteImport } from "./routes/__root";
import { Route as ResetPasswordRouteImport } from "./routes/reset-password";
import { Route as LoginRouteImport } from "./routes/login";
import { Route as ForgotPasswordRouteImport } from "./routes/forgot-password";
import { Route as AppRouteImport } from "./routes/_app";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as AppUsersRouteImport } from "./routes/_app.users";
import { Route as AppSettingsRouteImport } from "./routes/_app.settings";
import { Route as AppRolesRouteImport } from "./routes/_app.roles";
import { Route as AppReportsRouteImport } from "./routes/_app.reports";
import { Route as AppNotificationsRouteImport } from "./routes/_app.notifications";
import { Route as AppLogsRouteImport } from "./routes/_app.logs";
import { Route as AppReceptionRouteImport } from "./routes/_app.reception";
import { Route as AppDashboardRouteImport } from "./routes/_app.dashboard";
import { Route as AppClinicsRouteImport } from "./routes/_app.clinics";
import { Route as AppAdminsRouteImport } from "./routes/_app.admins";

const ResetPasswordRoute = ResetPasswordRouteImport.update({
  id: "/reset-password",
  path: "/reset-password",
  getParentRoute: () => rootRouteImport,
});

const LoginRoute = LoginRouteImport.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => rootRouteImport,
});

const ForgotPasswordRoute = ForgotPasswordRouteImport.update({
  id: "/forgot-password",
  path: "/forgot-password",
  getParentRoute: () => rootRouteImport,
});

const AppRoute = AppRouteImport.update({
  id: "/_app",
  getParentRoute: () => rootRouteImport,
});

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRouteImport,
});

const AppUsersRoute = AppUsersRouteImport.update({
  id: "/users",
  path: "/users",
  getParentRoute: () => AppRoute,
});

const AppSettingsRoute = AppSettingsRouteImport.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => AppRoute,
});

const AppRolesRoute = AppRolesRouteImport.update({
  id: "/roles",
  path: "/roles",
  getParentRoute: () => AppRoute,
});

const AppReportsRoute = AppReportsRouteImport.update({
  id: "/reports",
  path: "/reports",
  getParentRoute: () => AppRoute,
});

const AppNotificationsRoute = AppNotificationsRouteImport.update({
  id: "/notifications",
  path: "/notifications",
  getParentRoute: () => AppRoute,
});

const AppLogsRoute = AppLogsRouteImport.update({
  id: "/logs",
  path: "/logs",
  getParentRoute: () => AppRoute,
});

const AppReceptionRoute = AppReceptionRouteImport.update({
  id: "/reception",
  path: "/reception",
  getParentRoute: () => AppRoute,
});

const AppDashboardRoute = AppDashboardRouteImport.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => AppRoute,
});

const AppClinicsRoute = AppClinicsRouteImport.update({
  id: "/clinics",
  path: "/clinics",
  getParentRoute: () => AppRoute,
});

const AppAdminsRoute = AppAdminsRouteImport.update({
  id: "/admins",
  path: "/admins",
  getParentRoute: () => AppRoute,
});

const AppRouteChildren = {
  AppAdminsRoute,
  AppClinicsRoute,
  AppDashboardRoute,
  AppReceptionRoute,
  AppLogsRoute,
  AppNotificationsRoute,
  AppReportsRoute,
  AppRolesRoute,
  AppSettingsRoute,
  AppUsersRoute,
};

const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren);

const rootRouteChildren = {
  IndexRoute,
  AppRoute: AppRouteWithChildren,
  ForgotPasswordRoute,
  LoginRoute,
  ResetPasswordRoute,
};

export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren);
