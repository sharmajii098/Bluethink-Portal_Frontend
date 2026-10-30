import {lazy, Suspense} from "react";
import MyRequestsPage, { SelfServiceLayout } from "./pages/MyRequestsPage";
const CalendarConnectionsPage = lazy(() => import("./pages/CalendarConnectionsPage"));
const CalendarOAuthCallbackPage = lazy(() => import("./pages/CalendarOAuthCallbackPage"));
const PayrollReconciliationPage = lazy(() => import("./pages/PayrollReconciliationPage"));
const PayrollPoliciesPage = lazy(() => import("./pages/PayrollPoliciesPage"));
const HrLetterTemplatesPage = lazy(() => import("./pages/HrLetterTemplatesPage"));
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store";

import LoginPage from "./pages/auth/LoginPage";
const ActivateAccountPage = lazy(() => import("./pages/auth/ActivateAccountPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
import RoleDashboard from "./pages/RoleDashboard";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

const ResourcePage = lazy(() => import("./pages/ResourcePage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SalaryPage = lazy(() => import("./pages/SalaryPage"));
const PayslipSelfServicePage = lazy(() => import("./pages/PayslipSelfServicePage"));
const PayrollManagementPage = lazy(() => import("./pages/PayrollManagementPage"));
const TimesheetPage = lazy(() => import("./pages/TimesheetPage"));
const LeavePage = lazy(() => import("./pages/LeavePage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const MentorshipPage = lazy(() => import("./pages/MentorshipPage"));
const PerformancePage = lazy(() => import("./pages/PerformancePage"));
const WfhPage = lazy(() => import("./pages/WfhPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WorkingHoursPage = lazy(() => import("./pages/WorkingHoursPage"));
const MyProfilePage = lazy(() => import("./pages/MyProfilePage"));

const EmployeeManagementPage = lazy(() => import("./pages/EmployeeManagementPage"));
const DepartmentManagementPage = lazy(() => import("./pages/DepartmentManagementPage"));
const EmployeeHierarchyPage = lazy(() => import("./pages/EmployeeHierarchyPage"));
const LeaveConfigurationPage = lazy(() => import("./pages/LeaveConfigurationPage"));
const SecuritySessionsPage = lazy(() => import("./pages/SecuritySessionsPage"));

const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const DocumentManagementPage = lazy(() => import("./pages/DocumentManagementPage"));

const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const AnnouncementManagementPage = lazy(() => import("./pages/AnnouncementManagementPage"));

const PoliciesPage = lazy(() => import("./pages/PoliciesPage"));
const PolicyManagementPage = lazy(() => import("./pages/PolicyManagementPage"));

const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const TrainingManagementPage = lazy(() => import("./pages/TrainingManagementPage"));

const RecruitmentPage = lazy(() => import("./pages/RecruitmentPage"));
const ExpensePage = lazy(() => import("./pages/ExpensePage"));
const TravelPage = lazy(() => import("./pages/TravelPage"));
const AssetManagementPage = lazy(() => import("./pages/AssetManagementPage"));
const SupportTicketPage = lazy(() => import("./pages/SupportTicketPage"));
const BenefitsPage = lazy(() => import("./pages/BenefitsPage"));
const LoanAdvancePage = lazy(() => import("./pages/LoanAdvancePage"));
const WorkforceSchedulingPage = lazy(() => import("./pages/WorkforceSchedulingPage"));
const SeparationPage = lazy(() => import("./pages/SeparationPage"));
const GrievancePage = lazy(() => import("./pages/GrievancePage"));
const RecognitionPage = lazy(() => import("./pages/RecognitionPage"));
const SurveyPage = lazy(() => import("./pages/SurveyPage"));
const CareerMovementPage = lazy(() => import("./pages/CareerMovementPage"));
const ProbationReviewPage = lazy(() => import("./pages/ProbationReviewPage"));
const AttendanceRegularizationPage = lazy(() => import("./pages/AttendanceRegularizationPage"));
const LetterRequestPage = lazy(() => import("./pages/LetterRequestPage"));
const OvertimePage = lazy(() => import("./pages/OvertimePage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const DataChangeRequestPage = lazy(() => import("./pages/DataChangeRequestPage"));
const EmergencyContactsPage = lazy(() => import("./pages/EmergencyContactsPage"));
const ComplianceRecordsPage = lazy(() => import("./pages/ComplianceRecordsPage"));
const ProfileCompletionPage = lazy(() => import("./pages/ProfileCompletionPage"));
const PayrollChangeRequestPage = lazy(() => import("./pages/PayrollChangeRequestPage"));
const HolidayCalendarPage = lazy(() => import("./pages/HolidayCalendarPage"));
const TaxDeclarationPage = lazy(() => import("./pages/TaxDeclarationPage"));
const ShiftSwapPage = lazy(() => import("./pages/ShiftSwapPage"));
const EmployeeMilestonesPage = lazy(() => import("./pages/EmployeeMilestonesPage"));
const EmployeeSkillsPage = lazy(() => import("./pages/EmployeeSkillsPage"));
const EmployeeSuggestionsPage = lazy(() => import("./pages/EmployeeSuggestionsPage"));
const PolicyAcknowledgementPage = lazy(() => import("./pages/PolicyAcknowledgementPage"));
const HrServiceRequestPage = lazy(() => import("./pages/HrServiceRequestPage"));
const EmployeeAvailabilityPage = lazy(() => import("./pages/EmployeeAvailabilityPage"));
const ManagerOneOnOnePage = lazy(() => import("./pages/ManagerOneOnOnePage"));
const Employee360FeedbackPage = lazy(() => import("./pages/Employee360FeedbackPage"));
const PrivacyConsentPage = lazy(() => import("./pages/PrivacyConsentPage"));
const BeneficiaryPage = lazy(() => import("./pages/BeneficiaryPage"));
const EmploymentContractPage = lazy(() => import("./pages/EmploymentContractPage"));
const AccessCardRequestPage = lazy(() => import("./pages/AccessCardRequestPage"));
const EmployeeTransferPage = lazy(() => import("./pages/EmployeeTransferPage"));
const LeaveEncashmentPage = lazy(() => import("./pages/LeaveEncashmentPage"));
const EmployeeAssetRequestPage = lazy(() => import("./pages/EmployeeAssetRequestPage"));
const ShiftPreferencePage = lazy(() => import("./pages/ShiftPreferencePage"));
const TransportRequestPage = lazy(() => import("./pages/TransportRequestPage"));
const LeaveDonationPage = lazy(() => import("./pages/LeaveDonationPage"));
const InternalMobilityPage = lazy(() => import("./pages/InternalMobilityPage"));
const FlexibleWorkRequestPage = lazy(() => import("./pages/FlexibleWorkRequestPage"));
const TalentSuccessionPage = lazy(() => import("./pages/TalentSuccessionPage"));
const MySuccessionPlanPage = lazy(() => import("./pages/MySuccessionPlanPage"));
const WorkplaceIncidentPage = lazy(() => import("./pages/WorkplaceIncidentPage"));
const ApprovalInboxPage = lazy(() => import("./pages/ApprovalInboxPage"));
const HRCalendarPage = lazy(() => import("./pages/HRCalendarPage"));
const ActivityAuditPage = lazy(() => import("./pages/ActivityAuditPage"));
const ActivityLogsPage = lazy(() => import("./pages/ActivityLogsPage"));
const LoginLocationMonitorPage = lazy(() => import("./pages/LoginLocationMonitorPage"));
const BlueThinkChatPage = lazy(() => import("./pages/BlueThinkChatPage"));
const TeamChatPage = lazy(() => import("./pages/TeamChatPage"));
const DailyStandupPage = lazy(() => import("./pages/DailyStandupPage"));

const EmployeeLifecyclePage = lazy(() => import("./pages/EmployeeLifecyclePage"));
const WorkforceAnalyticsPage = lazy(() => import("./pages/WorkforceAnalyticsPage"));
const CompensationAnalyticsPage = lazy(() => import("./pages/CompensationAnalyticsPage"));
const DocumentExpiryDashboardPage = lazy(() => import("./pages/DocumentExpiryDashboardPage"));
const EmployeeDataQualityPage = lazy(() => import("./pages/EmployeeDataQualityPage"));
const TrainingCompliancePage = lazy(() => import("./pages/TrainingCompliancePage"));
const LearningEffectivenessPage = lazy(() => import("./pages/LearningEffectivenessPage"));
const HrCaseSlaDashboardPage = lazy(() => import("./pages/HrCaseSlaDashboardPage"));
const AttendanceLeaveRiskPage = lazy(() => import("./pages/AttendanceLeaveRiskPage"));
const EmployeeCostAnalyticsPage = lazy(() => import("./pages/EmployeeCostAnalyticsPage"));

/**
 * Supported application roles.
 */
const roles = [
  "ADMIN",
  "HR",
  "MANAGER",
  "EMPLOYEE",
] as const;

/**
 * Creates all routes for a specific role.
 */
function roleRoutes(role: string) {
  const b = `/${role.toLowerCase()}`;

  const admin = role === "ADMIN";
  const hr = role === "HR";
  const manager = role === "MANAGER";

  return (
    <Route
      key={role}
      element={<ProtectedRoute roles={[role as any]} />}
    >
      <Route element={<AppLayout />}>

        {!admin && <Route path={`${b}/my-requests`} element={<SelfServiceLayout />}>
          <Route index element={<MyRequestsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="wfh" element={<WfhPage />} />
          <Route path="attendance-regularization" element={<AttendanceRegularizationPage />} />
          <Route path="timesheets" element={<TimesheetPage />} />
          <Route path="overtime" element={<OvertimePage />} />
          <Route path="shift-swaps" element={<ShiftSwapPage />} />
          <Route path="shift-preferences" element={<ShiftPreferencePage />} />
          <Route path="flexible-work-requests" element={<FlexibleWorkRequestPage />} />
          <Route path="leave-encashments" element={<LeaveEncashmentPage />} />
          <Route path="leave-donations" element={<LeaveDonationPage />} />
          <Route path="expenses" element={<ExpensePage />} />
          <Route path="travel" element={<TravelPage />} />
          <Route path="loans" element={<LoanAdvancePage />} />
          <Route path="benefits" element={<BenefitsPage />} />
          <Route path="payroll-change-requests" element={<PayrollChangeRequestPage />} />
          <Route path="tax-declarations" element={<TaxDeclarationPage />} />
          <Route path="letters" element={<LetterRequestPage />} />
          <Route path="data-change-requests" element={<DataChangeRequestPage />} />
          <Route path="emergency-contacts" element={<EmergencyContactsPage />} />
          <Route path="beneficiaries" element={<BeneficiaryPage />} />
          <Route path="policy-acknowledgements" element={<PolicyAcknowledgementPage />} />
          <Route path="asset-requests" element={<EmployeeAssetRequestPage />} />
          <Route path="transport-requests" element={<TransportRequestPage />} />
          <Route path="access-card-requests" element={<AccessCardRequestPage />} />
          <Route path="hr-service-requests" element={<HrServiceRequestPage />} />
          <Route path="support" element={<SupportTicketPage />} />
          <Route path="grievances" element={<GrievancePage />} />
          <Route path="workplace-incidents" element={<WorkplaceIncidentPage />} />
          <Route path="career-movements" element={<CareerMovementPage />} />
          <Route path="internal-mobility" element={<InternalMobilityPage />} />
          <Route path="employee-transfers" element={<EmployeeTransferPage />} />
          <Route path="referrals" element={<ReferralPage />} />
          <Route path="employee-suggestions" element={<EmployeeSuggestionsPage />} />
          <Route path="separation" element={<SeparationPage />} />
        </Route>}
        {admin && <Route path={`${b}/staff-approvals`} element={<MyRequestsPage review />} />}

        <Route path={`${b}/calendar-connections`} element={<CalendarConnectionsPage />} />
        {(admin || hr) && <><Route path={`${b}/payroll-reconciliation`} element={<PayrollReconciliationPage />} /><Route path={`${b}/payroll-policies`} element={<PayrollPoliciesPage />} /><Route path={`${b}/letter-templates`} element={<HrLetterTemplatesPage />} /></>}

        {/* =====================================================
            COMMON DASHBOARD
        ====================================================== */}

        <Route
          path={`${b}/dashboard`}
          element={<RoleDashboard />}
        />

        <Route
          path={`${b}/employee-lifecycle`}
          element={<EmployeeLifecyclePage />}
        />

        {/* =====================================================
            ADMIN / HR
        ====================================================== */}

        {(admin || hr) && (
          <>
            <Route
              path={`${b}/employees`}
              element={<EmployeeManagementPage />}
            />

            <Route
              path={`${b}/departments`}
              element={<DepartmentManagementPage />}
            />
          </>
        )}

        {/* =====================================================
            ADMIN ONLY
        ====================================================== */}

        {admin && (
          <>
            <Route
              path={`${b}/employee-hierarchy`}
              element={<EmployeeHierarchyPage />}
            />

            <Route
              path={`${b}/leave/configuration`}
              element={<LeaveConfigurationPage />}
            />
          </>
        )}

        {/* =====================================================
            MANAGER
        ====================================================== */}

        {manager && (
          <Route
            path={`${b}/team`}
            element={
              <ResourcePage
                resource="team"
                title="My Team"
              />
            }
          />
        )}

        {/* =====================================================
            COMMON MODULES
        ====================================================== */}

        <Route
          path={`${b}/attendance`}
          element={<AttendancePage />}
        />

        <Route
          path={`${b}/leave`}
          element={<LeavePage />}
        />

        <Route
          path={`${b}/timesheets`}
          element={<TimesheetPage />}
        />

        <Route
          path={`${b}/timesheets/all`}
          element={<TimesheetPage adminAll />}
        />

        <Route
          path={`${b}/projects`}
          element={<ProjectPage />}
        />

        <Route
          path={`${b}/mentorships`}
          element={<MentorshipPage />}
        />

        <Route
          path={`${b}/performance`}
          element={<PerformancePage />}
        />

        <Route
          path={`${b}/salary`}
          element={<SalaryPage />}
        />

        <Route
          path={`${b}/payslips`}
          element={<PayslipSelfServicePage />}
        />

        {/* =====================================================
            TALENT / APPROVAL / AUDIT
        ====================================================== */}

        {(admin || hr || manager) && (
          <Route
            path={`${b}/talent-succession`}
            element={<TalentSuccessionPage />}
          />
        )}

        {role === "EMPLOYEE" && (
          <Route
            path={`${b}/my-succession-plan`}
            element={<MySuccessionPlanPage />}
          />
        )}

        {(admin || hr || manager) && (
          <Route
            path={`${b}/approval-inbox`}
            element={<ApprovalInboxPage />}
          />
        )}

        <Route
          path={`${b}/activity-audit`}
          element={<ActivityLogsPage />}
        />

        <Route
          path={`${b}/hr-calendar`}
          element={<HRCalendarPage />}
        />

        <Route
          path={`${b}/wfh`}
          element={<WfhPage />}
        />

        {/* =====================================================
            PROFILE / SYSTEM
        ====================================================== */}

        <Route
          path={`${b}/profile`}
          element={<MyProfilePage />}
        />

        <Route
          path={`${b}/notifications`}
          element={<NotificationsPage />}
        />

        <Route path={`${b}/team-chat`} element={<TeamChatPage />} />

        <Route path={`${b}/daily-standup`} element={<DailyStandupPage />} />

        <Route
          path={`${b}/settings`}
          element={<SettingsPage />}
        />

        <Route
          path={`${b}/working-hours`}
          element={<WorkingHoursPage />}
        />

        <Route
          path={`${b}/security`}
          element={<SecuritySessionsPage />}
        />

        <Route
          path={`${b}/login-locations`}
          element={<LoginLocationMonitorPage />}
        />

        {/* =====================================================
            DOCUMENTS
        ====================================================== */}

        <Route
          path={`${b}/documents`}
          element={
            admin || hr
              ? <DocumentManagementPage />
              : <DocumentsPage />
          }
        />

        {/* =====================================================
            ANNOUNCEMENTS
        ====================================================== */}

        <Route
          path={`${b}/announcements`}
          element={
            admin || hr
              ? <AnnouncementManagementPage />
              : <AnnouncementsPage />
          }
        />

        {/* =====================================================
            POLICIES
        ====================================================== */}

        <Route
          path={`${b}/policies`}
          element={
            admin || hr
              ? <PolicyManagementPage />
              : <PoliciesPage />
          }
        />

        {/* =====================================================
            TRAINING
        ====================================================== */}

        <Route
          path={`${b}/training`}
          element={
            admin || hr
              ? <TrainingManagementPage />
              : <TrainingPage />
          }
        />

        {/* =====================================================
            OTHER COMMON MODULES
        ====================================================== */}

        <Route
          path={`${b}/recruitment`}
          element={<RecruitmentPage />}
        />

        <Route
          path={`${b}/expenses`}
          element={<ExpensePage />}
        />

        <Route
          path={`${b}/travel`}
          element={<TravelPage />}
        />

        <Route
          path={`${b}/assets`}
          element={<AssetManagementPage />}
        />

        <Route
          path={`${b}/support`}
          element={<SupportTicketPage />}
        />

        <Route
          path={`${b}/benefits`}
          element={<BenefitsPage />}
        />

        <Route
          path={`${b}/loans`}
          element={<LoanAdvancePage />}
        />

        <Route
          path={`${b}/workforce`}
          element={<WorkforceSchedulingPage />}
        />

        <Route
          path={`${b}/separation`}
          element={<SeparationPage />}
        />

        <Route
          path={`${b}/grievances`}
          element={<GrievancePage />}
        />

        <Route
          path={`${b}/recognition`}
          element={<RecognitionPage />}
        />

        <Route
          path={`${b}/surveys`}
          element={<SurveyPage />}
        />

        <Route
          path={`${b}/career-movements`}
          element={<CareerMovementPage />}
        />

        <Route
          path={`${b}/probation`}
          element={<ProbationReviewPage />}
        />

        <Route
          path={`${b}/attendance-regularization`}
          element={<AttendanceRegularizationPage />}
        />

        <Route
          path={`${b}/letters`}
          element={<LetterRequestPage />}
        />

        <Route
          path={`${b}/overtime`}
          element={<OvertimePage />}
        />

        <Route
          path={`${b}/referrals`}
          element={<ReferralPage />}
        />

        <Route
          path={`${b}/data-change-requests`}
          element={<DataChangeRequestPage />}
        />

        <Route
          path={`${b}/emergency-contacts`}
          element={<EmergencyContactsPage />}
        />

        <Route
          path={`${b}/compliance-records`}
          element={<ComplianceRecordsPage />}
        />

        <Route
          path={`${b}/profile-completion`}
          element={<ProfileCompletionPage />}
        />

        <Route
          path={`${b}/payroll-change-requests`}
          element={<PayrollChangeRequestPage />}
        />

        <Route
          path={`${b}/holidays`}
          element={<HolidayCalendarPage />}
        />

        <Route
          path={`${b}/tax-declarations`}
          element={<TaxDeclarationPage />}
        />

        <Route
          path={`${b}/shift-swaps`}
          element={<ShiftSwapPage />}
        />

        <Route
          path={`${b}/employee-milestones`}
          element={<EmployeeMilestonesPage />}
        />

        <Route
          path={`${b}/employee-skills`}
          element={<EmployeeSkillsPage />}
        />

        <Route
          path={`${b}/employee-suggestions`}
          element={<EmployeeSuggestionsPage />}
        />

        <Route
          path={`${b}/policy-acknowledgements`}
          element={<PolicyAcknowledgementPage />}
        />

        <Route
          path={`${b}/hr-service-requests`}
          element={<HrServiceRequestPage />}
        />

        <Route
          path={`${b}/employee-availability`}
          element={<EmployeeAvailabilityPage />}
        />

        <Route
          path={`${b}/manager-one-on-ones`}
          element={<ManagerOneOnOnePage />}
        />

        <Route
          path={`${b}/employee-360-feedback`}
          element={<Employee360FeedbackPage />}
        />

        <Route
          path={`${b}/privacy-consents`}
          element={<PrivacyConsentPage />}
        />

        <Route
          path={`${b}/beneficiaries`}
          element={<BeneficiaryPage />}
        />

        <Route
          path={`${b}/employment-contracts`}
          element={<EmploymentContractPage />}
        />

        <Route
          path={`${b}/access-card-requests`}
          element={<AccessCardRequestPage />}
        />

        <Route
          path={`${b}/employee-transfers`}
          element={<EmployeeTransferPage />}
        />

        <Route
          path={`${b}/leave-encashments`}
          element={<LeaveEncashmentPage />}
        />

        <Route
          path={`${b}/asset-requests`}
          element={<EmployeeAssetRequestPage />}
        />

        <Route
          path={`${b}/shift-preferences`}
          element={<ShiftPreferencePage />}
        />

        <Route
          path={`${b}/transport-requests`}
          element={<TransportRequestPage />}
        />

        <Route
          path={`${b}/leave-donations`}
          element={<LeaveDonationPage />}
        />

        <Route
          path={`${b}/internal-mobility`}
          element={<InternalMobilityPage />}
        />

        <Route
          path={`${b}/flexible-work-requests`}
          element={<FlexibleWorkRequestPage />}
        />

        <Route
          path={`${b}/workplace-incidents`}
          element={<WorkplaceIncidentPage />}
        />

        {/* =====================================================
            ADMIN / HR ANALYTICS
        ====================================================== */}

        <Route
          path={`${b}/ai-assistant`}
          element={<BlueThinkChatPage />}
        />

        {(admin || hr) && (
          <>
            <Route
              path={`${b}/workforce-analytics`}
              element={<WorkforceAnalyticsPage />}
            />

            <Route
              path={`${b}/compensation-analytics`}
              element={<CompensationAnalyticsPage />}
            />

            <Route
              path={`${b}/document-expiry-dashboard`}
              element={<DocumentExpiryDashboardPage />}
            />

            <Route
              path={`${b}/employee-data-quality`}
              element={<EmployeeDataQualityPage />}
            />

            <Route
              path={`${b}/training-compliance`}
              element={<TrainingCompliancePage />}
            />

            <Route
              path={`${b}/learning-effectiveness`}
              element={<LearningEffectivenessPage />}
            />

            <Route
              path={`${b}/hr-case-sla`}
              element={<HrCaseSlaDashboardPage />}
            />

            <Route
              path={`${b}/attendance-leave-risk`}
              element={<AttendanceLeaveRiskPage />}
            />

            <Route
              path={`${b}/employee-cost-analytics`}
              element={<EmployeeCostAnalyticsPage />}
            />

            <Route
              path={`${b}/reports/:type`}
              element={<ReportsPage />}
            />

            {/* =================================================
                PAYROLL MANAGEMENT — HR ONLY
            ================================================== */}

            {hr && (
              <>
                <Route
                  path={`${b}/salary/structures`}
                  element={<PayrollManagementPage mode="structures" />}
                />

                <Route
                  path={`${b}/salary/generate`}
                  element={<PayrollManagementPage mode="generate" />}
                />
              </>
            )}
          </>
        )}

      </Route>
    </Route>
  );
}

/**
 * Main application component.
 */
export default function App() {
  const session = useSelector(
    (s: RootState) => s.auth.session
  );

  const defaultPath = session?.role
    ? `/${session.role.toLowerCase()}/dashboard`
    : "/login";

  return (
    <Suspense fallback={<div className="bt26-route-loading" role="status" aria-live="polite"><span className="bt26-loader" />Loading workspace…</div>}><Routes>
      <Route path="/calendar/oauth/callback/:provider" element={<CalendarOAuthCallbackPage />} />

      {/* =====================================================
          LOGIN
      ====================================================== */}

      <Route path="/activate-account" element={<ActivateAccountPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* =====================================================
          ROLE ROUTES
      ====================================================== */}

      {roles.map(roleRoutes)}

      {/* =====================================================
          ROOT REDIRECT
      ====================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to={defaultPath}
            replace
          />
        }
      />

      {/* =====================================================
          404 REDIRECT
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to={defaultPath}
            replace
          />
        }
      />

    </Routes></Suspense>
  );
}